import type { StreamEvent } from './types';
import { Context, type ContextMessage } from '../nodes/context';
import type { Thinker } from '../nodes/thinker';
import type { Actor } from '../nodes/actor';
import { v4 as uuidV4 } from 'uuid';
// import type { ToolRegistry } from '../nodes/registry';

/**
 * 编排器
 * 协调 think-act 循环
 */
export class Orchestrator {
    private thinker: Thinker;
    private actor: Actor;
    // private toolRegistry: ToolRegistry;
    private context: Context;
    private maxIterations: number;
    private getMessages: () => any[];

    constructor(config: {
        maxIterations: number;
        thinker: Thinker;
        actor: Actor;
        // toolRegistry: ToolRegistry;
        context: Context;
        getMessages: () => any[];
    }) {
        this.thinker = config.thinker;
        this.actor = config.actor;
        // this.toolRegistry = config.toolRegistry;
        this.context = config.context;
        this.getMessages = config.getMessages;
        this.maxIterations = config.maxIterations;
    }

    /**
     * 非流式运行
     * @param userInput 用户输入
     * @returns 最终消息
     */
    async run(userInput: string): Promise<ContextMessage> {
        // 添加用户消息
        this.context.addMessage({
            role: 'user',
            content: {
                type: 'question',
                text: userInput,
            },
        });
        
        let iterations = 0;
        let taskId = '';

        while (iterations < this.maxIterations) {
            iterations++;
            // console.log(iterations, '=========================================');
            try {
                // 获取当前消息
                const messages = this.getMessages();
                // 决策
                const decision = await this.thinker.decide(messages);
                // console.log("decision",decision);
                // 处理决策
                const result = await this.actor.process(decision);
                // console.log("result",result);
                if (result.type === 'response') {
                    return this.context.addMessage({
                        role: 'assistant',
                        content: {
                            type: 'response',
                            text: result.text,
                        },
                    });
                }

                if(decision.type === 'tool_call') {
                    taskId = `t_${uuidV4()}`;
                    this.context.addMessage({
                        role: 'tool',
                        content: {
                            type: 'tool_call',
                            tool: decision.tool,
                            params: decision.params || {},
                            taskId: taskId,
                            reasoning: decision.reasoning,
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
                            taskId: taskId,
                        },
                    });
                    taskId = '';
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
                return this.context.addMessage({
                    role: 'assistant',
                    content: {
                        type: 'error',
                        message: '运行时错误',
                        code: 'RUNTIME_ERROR',
                    },
                });
            }
        }
        // 清理上下文消息
        this.context.clear();
        // 超过最大迭代次数
        return this.context.addMessage({
            role: 'assistant',
            content: {
                type: 'error',
                message: '达到最大迭代次数，未收到响应',
                code: 'MAX_ITERATIONS_EXCEEDED',
            },
        });
    }

    /**
     * 流式运行
     * @param userInput 用户输入
     * @yields StreamEvent 流式事件
     */
    async *runStream(userInput: string): AsyncGenerator<StreamEvent> {

    }
}
