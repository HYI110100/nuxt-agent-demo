import type ActingNode from "../nodes/acting";
import type { PlanType } from "../nodes/planning";
import type ThinkNode from "../nodes/think";
import type ToolManager from "../nodes/toolManager";
import type { ToolCallType } from "../nodes/toolManager";
import type { ChatMessage, ResponseType, PlanExecutionResult, ErrorType } from "./types";
import { debug, info, warn } from "../utils/logger";

class Orchestrator {
    private actingNode: ActingNode;
    private thinkNode: ThinkNode;
    private toolManager: ToolManager;

    constructor({ actingNode, thinkNode, toolManager }: { actingNode: ActingNode, thinkNode: ThinkNode, toolManager: ToolManager }) {
        this.actingNode = actingNode;
        this.thinkNode = thinkNode;
        this.toolManager = toolManager;
    }

    async run(plan: PlanType): Promise<PlanExecutionResult> {
        debug("Orchestrator.run 接收计划:", { mode: plan.mode, toolCount: plan.tools.length, description: plan.description });
        const toolResults: PlanExecutionResult['toolResults'] = [];

        if (plan.mode === "parallel") {
            debug("执行并行模式:", plan.tools.map(t => t.name).join(", "));
            const promises = plan.tools.map(async (tool, index) => {
                debug("启动并行工具执行:", { index, tool: tool.name });
                const result = await this.thinkActObserver(tool, `- 当前工具目标：${tool.intention || ''}\n - 当前计划目标：${plan.description || ''}`);
                return { index, result };
            });
            const outcomes = await Promise.all(promises);

            for (const { index, result } of outcomes) {
                const tool = plan.tools[index];
                if (result.type === 'error') {
                    warn("并行工具执行失败:", { tool: tool.name, error: result.message });
                    toolResults.push({
                        index: -1,
                        toolName: tool.name,
                        params: tool.params,
                        result: result.message,
                        status: 'error'
                    });
                } else {
                    toolResults.push({
                        index: -1,
                        toolName: tool.name,
                        params: tool.params,
                        result: result.content,
                        status: 'success'
                    });
                }
            }
        } else {
            // 串行执行
            debug("执行串行模式:", plan.tools.map(t => t.name).join(", "));
            for (const index in plan.tools) {
                const tool = plan.tools[index];
                debug(`准备执行串行工具 [${index}]:`, tool.name);
                const result = await this.thinkActObserver(tool, `- 当前工具目标：${tool.intention || ''}\n - 当前计划目标：${plan.description || ''}`);
                if (result.type === 'error') {
                    warn("串行工具执行失败:", { index, tool: tool.name, error: result.message });
                    toolResults.push({
                        index: Number(index),
                        toolName: tool.name,
                        params: tool.params,
                        result: result.message,
                        status: 'error'
                    });
                } else {
                    toolResults.push({
                        index: Number(index),
                        toolName: tool.name,
                        params: tool.params,
                        result: result.content,
                        status: 'success'
                    });
                }
            }
        }

        return { toolResults };
    }
    async thinkActObserver(tool: ToolCallType, context: string): Promise<ResponseType | ErrorType> {
        debug("thinkActObserver 启动:", { tool: tool.name, params: JSON.stringify(tool.params).substring(0, 100) });
        // 初始化历史消息
        const toolInfo = this.toolManager.get(tool.name);
        const historyMessages: ChatMessage[] = [{
            role: 'user',
            content: `${context}\n -当前工具：${tool.name}\n -当前工具参数：${JSON.stringify(tool.params || '{}')}`
        }];
        const extraSystemPrompt = `## 工具：
${toolInfo ? this.toolManager.getToolsPrompt([toolInfo]) : ''}`

        let maxIterations = 3;
        let iterations = 0;

        while (iterations < maxIterations) {
            debug(`Think-Act 循环迭代 [${iterations}/${maxIterations}]`);
            // 思考：根据历史决定下一步
            const thinkResult = await this.thinkNode.decideNextAction(historyMessages, extraSystemPrompt);
            debug("decideNextAction 结果:", { type: thinkResult.type });

            // 判断是否继续
            if (thinkResult.type === 'response') {
                info("决定回复，不进行工具调用:", thinkResult.content.substring(0, 50));
                return {
                    type: "response",
                    content: thinkResult.content,
                    reasoning_content: thinkResult.reasoning_content,
                };
            }

            let t: ToolCallType = tool
            if(thinkResult.type === 'tool_call'){
                debug("决定调用子工具:", { name: thinkResult.tool, params: JSON.stringify(thinkResult.params) });
                t = {
                    name: thinkResult.tool,
                    params: thinkResult.params,
                }
            }

            // 行动：执行决策
            debug("准备执行工具:", t.name);
            const result = await this.actingNode.run(t);
            debug("工具执行结果:", { type: result.type });

            if (result.type === 'error') {
                warn("工具执行失败:", { tool: t.name, error: result.message });
                // 错误时，把错误信息加入历史，让模型重新思考
                historyMessages.push({
                    role: 'assistant',
                    content: `执行失败：${result.message}`
                }, {
                    role: 'user',
                    content: '执行出错，如果你不能继续执行，请回复：{"type": "respond", "content": "错误原因"}'
                });
                iterations++;
                continue;
            }

            // 观察：把成功结果加入历史
            info("工具执行成功:", { tool: t.name, resultSummary: String(result).substring(0, 100) });
            historyMessages.push({
                role: 'assistant',
                content: `执行成功：${JSON.stringify(result)}`
            });

            iterations++;
        }

        return {
            type: "error",
            message: `超过最大循环次数 ${maxIterations},最后一次执行结果：${historyMessages.length > 0 ? historyMessages[historyMessages.length - 1].content : '无'}`,
            code: "max_iterations_exceeded",
        };
    }
}
export default Orchestrator;
