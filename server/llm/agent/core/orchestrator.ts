import type ActingNode from "../nodes/acting";
import type { PlanType } from "../nodes/planning";
import type ThinkNode from "../nodes/think";
import type ToolManager from "../nodes/toolManager";
import type { BaseTool, ToolCallType } from "../nodes/toolManager";
import type { ChatMessage, ResponseType, PlanExecutionResult, ErrorType } from "./types";
import { debug, info, warn } from "../utils/logger";
import { webSearchTool } from "../../tools/webSearch";

class Orchestrator {
    private actingNode: ActingNode;
    private thinkNode: ThinkNode;
    private toolManager: ToolManager;

    constructor({ actingNode, thinkNode, toolManager }: { actingNode: ActingNode, thinkNode: ThinkNode, toolManager: ToolManager }) {
        this.actingNode = actingNode;
        this.thinkNode = thinkNode;
        this.toolManager = toolManager;
    }

    async run(plan: PlanType, context: string): Promise<PlanExecutionResult> {
        debug("Orchestrator.run 接收计划:", { mode: plan.mode, toolCount: plan.tools.length, description: plan.description });
        const toolResults: PlanExecutionResult['toolResults'] = [];

        if (plan.mode === "parallel") {
            debug("执行并行模式:", plan.tools.map(t => t.name).join(", "));
            const promises = plan.tools.map(async (tool, index) => {
                debug("启动并行工具执行:", { index, tool: tool.name });
                const result = await this.thinkActObserver(tool, `- 当前顺序：${index}/${plan.tools.length}\n- 当前任务：${tool.intention || ''}\n - 全局任务：${plan.description || ''}\n - 上一轮计划的结果：${context}\n\n -禁止做当前当前任务之外的事情，因为有其他工具正在执行\n -上一轮的结果如果有，需要考虑在当前任务中使用`);
                debug(`并行工具执行结果 [${index}]:`, result);
                return { index, result };
            });
            const outcomes = await Promise.all(promises);
            info("并行工具执行完成");
            for (const { index, result } of outcomes) {
                const tool = plan.tools[index];
                if (result.type === 'error') {
                    warn("并行工具执行失败:", { tool: tool.name, error: result.message });
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
        } else {
            // 串行执行
            debug("执行串行模式:", plan.tools.map(t => t.name).join(", "));
            for (const index in plan.tools) {
                const tool = plan.tools[index];
                debug(`准备执行串行工具 [${index}]:`, tool.name);
                const result = await this.thinkActObserver(tool, `- 当前顺序：${index}/${plan.tools.length}\n- 当前任务：${tool.intention || ''}\n - 全局任务：${plan.description || ''}\n - 上一轮计划的结果：${context}\n\n -禁止做当前当前任务之外的事情，因为有其他工具正在执行\n -上一轮的结果如果有，需要考虑在当前任务中使用`);
                debug(`串行工具执行结果 [${index}]:`, result);
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
        const tools:BaseTool[] = [toolInfo!]
        if(tool.name !== 'web_search'){
            tools.push(webSearchTool)
        }
        const extraSystemPrompt = `## 工具：
${toolInfo ? this.toolManager.getToolsPrompt(tools) : ''}
${tool.name !== 'web_search' ? `[注意]: web_search 工具只能用于搜索解决当前工具无法处理当前任务的问题，不能用于其他目的。` : ''}`

        let maxIterations = 6;
        let iterations = 0;
        let decisionPrompt = this.thinkNode.getDecisionPrompt(extraSystemPrompt);
        historyMessages.unshift(decisionPrompt);

        while (iterations < maxIterations) {
            iterations++;
            debug(`Think-Act 循环迭代 ${tool.name} [${iterations}/${maxIterations}]`);
            // 思考：根据历史决定下一步
            const thinkResult = await this.thinkNode.decideNextAction(historyMessages);
            debug("thinkActResult 结果:", { type: thinkResult.type });
            if (thinkResult.type === 'error') {
                historyMessages.push({
                    role: 'assistant',
                    content: `LLM 解析失败: , ${thinkResult.message}`
                }, {
                    role: 'user',
                    content: '执行出错，如果你不能继续执行，请回复：{"type": "respond", "content": "错误原因"}'
                });
            }
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
            if (thinkResult.type === 'tool_call') {
                debug("决定调用子工具:", { name: thinkResult.tool, params: JSON.stringify(thinkResult.params) });
                t = {
                    name: thinkResult.tool,
                    params: thinkResult.params,
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
                    continue;
                }

                // 观察：把成功结果加入历史
                info("工具执行成功:", { tool: t.name, resultSummary: String(result).substring(0, 100) });
                historyMessages.push({
                    role: 'assistant',
                    content: `执行成功：${JSON.stringify(result)}`
                });
            }
        }

        return {
            type: "error",
            message: `超过最大循环次数 ${maxIterations},最后一次执行结果：${historyMessages.length > 0 ? historyMessages[historyMessages.length - 1].content : '无'}`,
            code: "max_iterations_exceeded",
        };
    }
}
export default Orchestrator;
