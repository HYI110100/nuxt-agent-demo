import type { InternalMessage, StreamEvent, ToolDescription } from '../core/types';
import { Context } from './context';
import type { Thinker } from '../nodes/thinker';
import type { Actor } from '../nodes/actor';
import type { ToolRegistry } from '../nodes/registry';

/**
 * 编排器
 * 协调 think-act 循环
 */
export class Orchestrator {
    private thinker: Thinker;
    private actor: Actor;
    private toolRegistry: ToolRegistry;
    private context: Context;
    private maxIterations: number;

    constructor(config: {
        maxIterations: number;
        thinker: Thinker;
        actor: Actor;
        toolRegistry: ToolRegistry;
        context: Context;
    }) {
        this.thinker = config.thinker;
        this.actor = config.actor;
        this.toolRegistry = config.toolRegistry;
        this.context = config.context;
        this.maxIterations = config.maxIterations;
    }

    /**
     * 非流式运行
     * @param userInput 用户输入
     * @returns 最终消息
     */
    async run(userInput: string): Promise<InternalMessage> {
        // 添加用户消息
        this.addUserMessage(userInput);

        let iterations = 0;

        while (iterations < this.maxIterations) {
            iterations++;

            try {
                // 获取当前消息
                const messages = this.context.getMessages();

                // 决策
                const decision = await this.thinker.decide(messages);

                // 处理决策
                const result = await this.actor.process(decision);

                if (result.type === 'response') {
                    return this.context.addMessage({
                        role: 'assistant',
                        content: {
                            type: 'response',
                            text: result.text,
                        },
                    });
                }

                if (result.type === 'tool_result') {
                    // 添加工具调用消息
                    this.context.addMessage({
                        role: 'tool',
                        content: {
                            type: 'tool_result',
                            tool: result.tool,
                            result: result.result,
                        },
                    });
                    continue;
                }

                if (result.type === 'error') {
                    return this.context.addMessage({
                        role: 'tool',
                        content: {
                            type: 'error',
                            message: result.message,
                            code: result.code,
                        },
                    });
                }
            } catch (error) {
                console.error('Error in run:', error);
                return {
                    role: 'assistant',
                    content: {
                        type: 'error',
                        message: '运行时错误',
                        code: 'RUNTIME_ERROR',
                    },
                }
            }
        }

        // 超过最大迭代次数
        return {
            role: 'assistant',
            content: {
                type: 'error',
                message: '达到最大迭代次数，未收到响应',
                code: 'MAX_ITERATIONS_EXCEEDED',
            },
        };
    }

    /**
     * 流式运行
     * @param userInput 用户输入
     * @yields StreamEvent 流式事件
     */
    async *runStream(userInput: string): AsyncGenerator<StreamEvent> {

    }

    /** 添加用户消息到上下文 */
    private addUserMessage(content: string) {
        this.context.addMessage({
            role: 'user',
            content: {
                type: 'question',
                text: content,
            },
        });
    }
}
