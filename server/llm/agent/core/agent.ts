import type { AgentConfig, InternalMessage, StreamEvent } from './types';
import { Thinker } from '../nodes/thinker';
import { Actor } from '../nodes/actor';
import { Context } from '../runtime/context';
import { Orchestrator } from '../runtime/orchestrator';
import { ToolRegistry } from '../nodes/registry';
import type { BaseTool } from './types';

/**
 * Agent 类 - 统一入口
 * 提供简洁的 chat() 和 chatStream() API
 * 同时保留对旧 API 的兼容性
 */
class Agent {
    private orchestrator: Orchestrator;
    private toolRegistry: ToolRegistry;
    private actor: Actor;
    private context: Context;
    private thinker: Thinker;

    constructor(config: AgentConfig) {
        this.thinker = new Thinker(config.llmClient);
        this.toolRegistry = new ToolRegistry();
        this.actor = new Actor(this.toolRegistry);
        this.context = new Context(config.maxContext ?? 10);

        this.orchestrator = new Orchestrator({
            maxIterations: config.maxIterations ?? 3,
            thinker: this.thinker,
            actor: this.actor,
            toolRegistry: this.toolRegistry,
            context: this.context,
        });
    }

    /**
     * 非流式对话
     * @param input 用户输入
     * @returns 最终消息
     */
    async chat(input: string): Promise<InternalMessage> {
        return await this.orchestrator.run(input);
    }

    /**
     * 流式对话
     * @param input 用户输入
     * @yields 流式事件
     */
    async *chatStream(input: string): AsyncGenerator<StreamEvent> {
        yield* this.orchestrator.runStream(input);
    }

    /**
     * 添加工具
     * @param tool 工具实例
     */
    addTool(tool: BaseTool) {
        return this.toolRegistry.register(tool);
    }

    /**
     * 移除工具
     * @param name 工具名称
     */
    removeTool(name: string) {
        return this.toolRegistry.remove(name);
    }

    /**
     * 获取所有工具
     */
    getTools() {
        return this.toolRegistry.list();
    }

    /**
     * 获取所有工具描述(用于系统提示)
     */
    getToolsDescription() {
        return this.toolRegistry.getToolsDescription();
    }

    /**
     * 获取上下文
     */
    getContext() {
        return this.context.getMessages();
    }
}

export default Agent;
