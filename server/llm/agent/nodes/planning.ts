import type { LLMClient, ChatMessage, ErrorType, ResponseType } from "../core/types";
import { parseJSON } from "../utils/jsonUtils";
import { debug, warn } from "../utils/logger";
import type { ToolCallType } from "./toolManager";

export interface PlanType {
    mode: "parallel" | "serial";
    description: string;
    step: number;
    tools: ToolCallType[];
}

export interface PlanToolType {
    type: "plan";
    intention: string;
    content: string;
    reasoning_content: string;
    plans: PlanType[];
}
export interface OneToolType extends ToolCallType {
    type: "tool_call";
    intention: string;
    content: string;
    reasoning_content: string;
}
/**
 * 计划工具接口
 * 定义了计划工具的结构，包括执行模式、描述、步骤和工具列表
*/
export type PlanCall = ResponseType | OneToolType | PlanToolType | ErrorType;

class PlanningNode {
    private llm: LLMClient;
    constructor(llm: LLMClient) {
        this.llm = llm;
    }
    /**
 * 制定执行计划
 * @param {string} toolsPrompt - 可用工具列表提示
 * @param {string} systemPrompt - 系统提示
 * @param {ChatMessage[]} historyMessages - 历史消息消息数组
 * @returns {Promise<Object>} 计划对象
 */
    async run({ historyMessages }: { historyMessages: ChatMessage[] }): Promise<PlanCall> {
        debug("PlanningNode.run 接收消息数:", historyMessages.length);
        try {
            const response = await this.llm.chat({ messages: historyMessages, response_format:{ type: "json_object" } });
            debug("LLM planning 响应摘要:", response.content.substring(0, 100));
            const result = parseJSON(response.content);
            debug("PlanningNode 解析结果类型:", result.type);

            // 检查 plan 是否符合 ResponseType 类型
            if (result.type === "response" && typeof result.content === "string") {
                return { ...result, reasoning_content: response.reasoning_content } as ResponseType;
            }
            // 检查 plan 是否符合 OneToolType 类型
            if (result.type === "tool_call" && typeof result.content === "string") {
                return { ...result, reasoning_content: response.reasoning_content } as OneToolType;
            }

            // 检查 plan 是否符合 PlanToolType 类型
            if (result.type === "plan" && Array.isArray(result.plans)) {
                // 验证每个 plan 是否符合 PlanType 类型
                for (const p of result.plans) {
                    if (!isValidPlan(p)) {
                        warn("plan-计划格式无效:", p);
                        return { type: "error", message: "计划格式无效", code: "invalid_plan_format" };
                    }
                }
                debug("PlanningNode 生成多步骤计划:", { planCount: result.plans.length });
                return { ...result, reasoning_content: response.reasoning_content } as PlanToolType;
            }

            // 检查 plan 是否符合 PlanType 类型
            if (isValidPlan(result)) {
                debug("PlanningNode 生成单步计划");
                return { type: "plan", content: "我现在需要计划制定", reasoning_content: response.reasoning_content, plans: [result] } as PlanToolType;
            }
            // 其他类型直接回复,进行兜底处理
            return { type: "response", content: result.toString() || '', reasoning_content: response.reasoning_content };
        } catch (error: any) {
            warn("PlanningNode 执行失败:", error.message || String(error));
            return { type: "error", message: error, code: "planning_error" };
        }
    }

    buildPrompt({ toolsPrompt, systemPrompt }: { toolsPrompt: string, systemPrompt?: string }): string {
        return `=== SYSTEM CORE RULES - IMMUTABLE ===
# 计划

## 计划制定规范
- **是否需要计划**：判断用户问题是否需要多步工具调用，不需要则直接回复
- **步骤拆解**：将复杂任务拆解为原子步骤，每个步骤只做一件事,可以包含多个工具调用
- **依赖关系**：步骤间有依赖时用 serial 模式，无依赖时用 parallel 模式
- **参数预留**：params 中只填写已知参数，未知参数留空或填 null

## 输出格式
- 不需要计划制定：\`{ "type": "response", "content": "直接回复内容" }\`
- 需要计划制定：\`{ "type": "plan", "content": "用第一人称、自然口语化的方式，描述你打算做什么。","intention": "用户意图" , "plans": [{ "mode": "serial/parallel", "description": "简短描述当前计划的目标", "step": "当前计划执行顺序，数字类型，从1开始递增", "tools": [{ "name": "工具名", "params": { "参数名": "参数值" },"intention": "执行工具意图" }] }] }\`
- 不需要多工具调用：\`{ "type": "tool_call", , "content": "用第一人称、自然口语化的方式，描述你打算做什么。","intention": "用户意图" , "name": "工具名", "params": { "参数名": "参数值" } }\`
${toolsPrompt || ''}

# 规则
- 禁止输出非 JSON 格式的文本

=== USER CONTENT ===
${systemPrompt || ''}
`
    }

}
export default PlanningNode;


/**
 * 验证计划是否符合 PlanType 类型定义
 * @param {any} result - 要验证的计划对象
 * @returns {boolean} 是否有效
 */
function isValidPlan(result: any): result is PlanType {
    return (
        typeof result === "object" &&
        result !== null &&
        (result.mode === "parallel" || result.mode === "serial") &&
        typeof result.description === "string" &&
        typeof result.step === "number" &&
        Array.isArray(result.tools) &&
        result.tools.every((tool: any) =>
            typeof tool === "object" &&
            tool !== null &&
            typeof tool.name === "string" &&
            (tool.params === undefined || typeof tool.params === "object")
        )
    );
}