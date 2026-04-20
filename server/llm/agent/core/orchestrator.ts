import type ActingNode from "../nodes/acting";
import type { PlanType } from "../nodes/planning";
import type ThinkNode from "../nodes/think";
import type ToolManager from "../nodes/toolManager";
import type { ToolCallType } from "../nodes/toolManager";
import type { ChatMessage, ResponseType, PlanExecutionResult, ErrorType } from "./types";

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
        const toolResults: PlanExecutionResult['toolResults'] = [];

        if (plan.mode === "parallel") {
            const promises = plan.tools.map(async (tool, index) => {
                const result = await this.thinkActObserver(tool, plan.description);
                return { index, result };
            });
            const outcomes = await Promise.all(promises);

            for (const { index, result } of outcomes) {
                const tool = plan.tools[index];
                if (result.type === 'error') {
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
            for (const index in plan.tools) {
                const tool = plan.tools[index];
                const result = await this.thinkActObserver(tool, plan.description);
                if (result.type === 'error') {
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
    private async thinkActObserver(tool: ToolCallType, context: string): Promise<ResponseType | ErrorType> {
        // 初始化历史消息
        const toolInfo = this.toolManager.get(tool.name);
        const historyMessages: ChatMessage[] = [{
            role: 'user',
            content: `当前任务：执行工具 ${tool.name}，参数：${JSON.stringify(tool.params)}。上下文：${context}`
        }];
        const extraSystemPrompt = `## 工具：
${toolInfo ? this.toolManager.getToolsPrompt([toolInfo]) : ''}`

        let maxIterations = 3;
        let iterations = 0;

        while (iterations < maxIterations) {
            // 思考：根据历史决定下一步
            const thinkResult = await this.thinkNode.decideNextAction(historyMessages, extraSystemPrompt);
            
            // 判断是否继续
            if (thinkResult.type === 'response') {
                return {
                    type: "response",
                    content: thinkResult.content,
                    reasoning_content: thinkResult.reasoning_content,
                };
            }

            let t: ToolCallType = tool
            if(thinkResult.type === 'tool_call'){
                t = {
                    name: thinkResult.tool,
                    params: thinkResult.params,
                }
            }

            // 行动：执行决策
            const result = await this.actingNode.run(t);

            if (result.type === 'error') {
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
