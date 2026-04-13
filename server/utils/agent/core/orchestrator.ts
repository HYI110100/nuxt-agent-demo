import { ActNode } from "../nodes/act";
import type { InputNode } from "../nodes/input";
import { Message, type Context } from "../nodes/message";
import type { ThinkNode } from "../nodes/think";
import type { ToolRegistry } from "../nodes/tool";

export class Orchestrator {
    protected think: ThinkNode;
    protected act: ActNode;
    protected input: InputNode;
    protected toolRegistry: ToolRegistry;
    protected context: Context;
    protected maxIterations: number;
    protected systemPrompt?: string;

    constructor(config: { maxIterations: number, systemPrompt?: string, actNode: ActNode, thinkNode: ThinkNode, inputNode: InputNode, toolRegistry: ToolRegistry, context: Context }) {
        this.think = config.thinkNode;
        this.act = config.actNode;
        this.input = config.inputNode;
        this.toolRegistry = config.toolRegistry;
        this.context = config.context;
        this.maxIterations = config.maxIterations;
        this.systemPrompt = config.systemPrompt;
    }

    async run(userInput: string) {
        let iterations = 0;

        this.context.addMessage(new Message({ role: 'user', content: { type: 'text', content: userInput } }));
        while (iterations < this.maxIterations) {
            iterations++;
            // 获取当前所有消息用于决策
            const messages = this.context.getMessages();
            const decision = await this.think.decide(messages);
            if (decision.type === 'respond') {
                const resMsg = new Message({
                    role: 'system',
                    content: decision.content,
                });
                this.context.addMessage(resMsg);
                return resMsg;
            }
            if (decision.type === 'error') {
                const errorMsg = new Message({
                    role: 'user',
                    content: {
                        type: 'error',
                        message: decision.message,
                        error: decision.error_code
                    }
                });
                this.context.addMessage(errorMsg);
                return errorMsg;
            }
            if (decision.type === 'call_tool') {
                const toolResult = await this.act.process(decision);
                if (toolResult.type === 'call_tool') {
                    const resMsg = new Message({
                        role: 'user',
                        content: {
                            type: 'call_tool',
                            result: toolResult.result,
                            params: toolResult.params
                        }
                    });
                    this.context.addMessage(resMsg);
                    // 继续循环，让 ThinkNode 根据工具结果再次决策
                } else if (toolResult.type === 'error') {
                    const errorMsg = new Message({
                        role: 'user',
                        content: {
                            type: 'error',
                            message: toolResult.message,
                            error: toolResult.error_code
                        }
                    });
                    this.context.addMessage(errorMsg);
                    return errorMsg;
                }
                continue;
            }
        }
        return new Message({
            role: 'user',
            content: {
                type: 'error',
                message: 'No response received after max iterations',
                error: 'max_iterations_exceeded'
            }
        });

    }
    setSystemPrompt(systemPrompt: string) {
        this.systemPrompt = systemPrompt;
    }
    protected buildPrompt(): string {
        return `${this.systemPrompt}`
    }
}