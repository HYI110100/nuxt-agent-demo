import ActingNode from "../nodes/acting";
import PlanningNode from "../nodes/planning";
import ToolManager from "../nodes/toolManager";
import Orchestrator from "./orchestrator";
import ThinkNode from "../nodes/think";
import type { BaseTool } from "../nodes/toolManager";
import type { ChatMessage, LLMClient, AgentEvent } from "./types";
import { debug, info } from "../utils/logger";

export type OnLoopEvent = (event: AgentEvent) => void;
export type GetHistoryMessages = () => Promise<ChatMessage[]>;
/** Agent 配置接口 */
export interface AgentConfig {
    llmClient: LLMClient;
    systemPrompt?: string;
    tools?: BaseTool[];
    getHistoryMessages?: GetHistoryMessages;  // 获取当前上下文消息的回调
    onLoopEvent?: OnLoopEvent;  // 每次循环步骤的回调
}

/**
 * Agent 类 - 统一入口
 * 提供简洁的 chat() 和 chatStream() API
 * 处理 think-act 循环
 */
class Agent {
    private config: AgentConfig;
    private toolManager: ToolManager;
    private planningNode: PlanningNode;
    private actingNode: ActingNode;
    private orchestrator: Orchestrator;
    private thinkNode: ThinkNode;

    constructor(config: AgentConfig) {
        this.config = config;
        this.toolManager = new ToolManager(config.tools);
        this.actingNode = new ActingNode(this.toolManager);
        this.thinkNode = new ThinkNode(config.llmClient);
        this.planningNode = new PlanningNode(config.llmClient);
        this.orchestrator = new Orchestrator({ actingNode: this.actingNode, thinkNode: this.thinkNode, toolManager: this.toolManager });
    }

    /**
     * 非流式对话
     * @param input 用户输入
     * @returns 最终消息
     */
    async chat(input: string): Promise<void> {
        debug("用户输入:", input);
        this.config.onLoopEvent?.({ type: 'input', content: input });

        const planResult = await this.planningNode.run({ historyMessages: (await this.config.getHistoryMessages?.() || []) });
        debug("PlanningNode 结果:", planResult);
        if (planResult.type === 'response') {
            info("简单问题直接回复:", planResult.content);
            this.config.onLoopEvent?.({ type: 'response', content: planResult.content, reasoning_content: planResult.reasoning_content });
            return
        }
        if (planResult.type === 'tool_call') {
            info("单工具调用路径:", { name: planResult.name, params: planResult.params, intention: planResult.intention });
            this.config.onLoopEvent?.({ type: 'response', content: planResult.content, reasoning_content: planResult.reasoning_content });
            const thinkResult = await this.orchestrator.thinkActObserver({ name: planResult.name, params: planResult.params }, planResult.content);
            debug("单工具 thinkActObserver 结果:", { type: thinkResult.type, hasContent: !!thinkResult.content });
            if (thinkResult.type === 'error') {
                info("单工具执行失败:", thinkResult.message);
                throw new Error(thinkResult.message);
            }
            if (thinkResult.type === 'response') {
                const finalThinkResult = await this.thinkNode.generateFinalResponse([this.thinkNode.getFinalResponsePrompt(), { role: 'assistant', content: `-[意图]${planResult.intention}\n-[行动]${planResult.content}\n -[结果]${thinkResult.content}` }]);
                debug("生成最终回复结果:", { type: finalThinkResult.type });
                if (finalThinkResult.type === 'error') {
                    info("生成最终回复失败:", finalThinkResult.message);
                    throw new Error(finalThinkResult.message);
                }
                info("单工具任务完成:", finalThinkResult.content);
                this.config.onLoopEvent?.({ type: 'result', content: finalThinkResult.content, reasoning_content: finalThinkResult.reasoning_content });
            }
            return
        }

        if (planResult.type === 'plan') {
            info("多步骤计划路径:", { intention: planResult.intention, planCount: planResult.plans.length });
            this.config.onLoopEvent?.({ type: 'response', content: planResult.content, reasoning_content: planResult.reasoning_content });
            const plans = planResult.plans.sort((a, b) => a.step - b.step);
            // 使用本地历史消息，支持多 plan 之间的状态传递
            let localHistory: ChatMessage[] = [{
                role: 'assistant',
                content: `-[意图]${planResult.intention}\n-[行动]${planResult.content}\n -[结果]${plans.join('\n')}`,
            }];

            for (const plan of plans) {
                // 计划开始事件
                debug("计划开始执行:", { step: plan.step, mode: plan.mode || 'serial', description: plan.description });
                this.config.onLoopEvent?.({
                    type: 'plan_start',
                    step: plan.step,
                    planDescription: plan.description,
                    mode: plan.mode || 'serial',
                });
                const executionResult = await this.orchestrator.run(plan);

                // 每个工具执行结果事件
                for (const toolResult of executionResult.toolResults) {
                    debug("工具执行结果:", {
                        step: plan.step,
                        toolName: toolResult.toolName,
                        status: toolResult.status,
                        resultSummary: String(toolResult.result).substring(0, 200)
                    });
                    this.config.onLoopEvent?.({
                        type: 'tool_result',
                        step: plan.step,
                        index: toolResult.index,
                        toolName: toolResult.toolName,
                        params: toolResult.params,
                        result: toolResult.result,
                        status: toolResult.status
                    });

                    // 同时追加到本地历史供后续 plan 参考
                    localHistory.push({
                        role: 'assistant',
                        content: `【工具调用】${toolResult.toolName}(${JSON.stringify(toolResult.params)}) = ${JSON.stringify(toolResult.result)}`
                    });
                }

                // 计划完成事件
                debug("计划完成:", {
                    step: plan.step,
                    toolCount: executionResult.toolResults.length,
                    results: executionResult.toolResults.map(r => `${r.toolName}:${r.status}`)
                });
                this.config.onLoopEvent?.({
                    type: 'plan_complete',
                    step: plan.step,
                    planDescription: plan.description,
                    mode: plan.mode,
                    toolCount: executionResult.toolResults.length,
                    toolResults: executionResult.toolResults,
                });
            }
            debug("开始生成最终回复，历史消息数:", localHistory.length);
            const finalResponsePrompt = this.thinkNode.getFinalResponsePrompt();
            localHistory.unshift(finalResponsePrompt);
            const finalThinkResult = await this.thinkNode.generateFinalResponse(localHistory);
            if (finalThinkResult.type === 'error') {
                info("多步骤任务最终回复失败:", finalThinkResult.message);
                throw new Error(finalThinkResult.message);
            }
            if (finalThinkResult.type === 'response') {
                info("多步骤任务完成:", finalThinkResult.content.substring(0, 100));
                this.config.onLoopEvent?.({ type: 'result', content: finalThinkResult.content, reasoning_content: finalThinkResult.reasoning_content });
            }
            return

        }

        throw new Error('未知的 plan 结果类型');
    }

    /**
     * 流式对话
     * @param input 用户输入
     * @yields 流式事件
     */
    async * chatStream(input: string): AsyncGenerator<any> {
        this.config.onLoopEvent?.({ type: 'input', content: input });
    }

    /**
     * 添加工具
     * @param tool 工具实例
     */
    addTool(tool: BaseTool) {
        this.toolManager.add(tool);
    }

    /**
     * 移除工具
     * @param name 工具名称
     */
    removeTool(name: string) {
        this.toolManager.remove(name);
    }

    /**
     * 获取所有工具
     */
    getTools() {
        return this.toolManager.getTools();
    }

    /**
     * 获取系统提示词
     */
    getSystemPrompt() {
        return this.planningNode.buildPrompt({ toolsPrompt: this.toolManager.getToolsPrompt(this.getTools()), systemPrompt: this.config.systemPrompt });
    }
}

export default Agent;
