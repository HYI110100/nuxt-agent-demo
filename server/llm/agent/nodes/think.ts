import type { ChatMessage, ErrorType, ResponseType, LLMClient } from "../core/types";

interface ThinkToolCallType {
    type: "tool_call";
    tool: string;
    params: Record<string, any>;
}

type ThinkResult = ThinkToolCallType | ResponseType | ErrorType;
type FinalResult = ResponseType | ErrorType;

class ThinkNode {
    private llm: LLMClient;
    constructor(llm: LLMClient) {
        this.llm = llm;
    }

    async decideNextAction(historyMessages: ChatMessage[], extraSystemPrompt: string): Promise<ThinkResult> {
        try {
            historyMessages.unshift({
                role: 'system',
                content: `## 身份：决策助手
## 任务：
- 根据当前状态决定下一步。

## 输出格式：
- 禁止输出非 JSON对象 格式的文本。
- 如果需要调用工具：{"type": "tool_call", "tool": "工具名", "params": {参数对象}}
- 如果不需要调用工具，直接回复：{"type": "respond", "content": "最终执行结果"}

${extraSystemPrompt}
`,
            })
            const response = await this.llm.chat({ messages: historyMessages, response_format:{ type: "json_object" } });
            const parsed = JSON.parse(response.content);

            if (parsed.type === 'respond' && typeof parsed.content === 'string') {
                return {
                    type: "response",
                    content: parsed.content,
                    reasoning_content: response.reasoning_content,
                };
            }

            if (parsed.type === 'tool_call' && typeof parsed.tool === 'string') {
                return {
                    type: "tool_call",
                    tool: parsed.tool,
                    params: parsed.params || {},
                };
            }

            // 兜底：无法识别的格式返回原始内容
            return {
                type: "response",
                content: response.content,
                reasoning_content: response.reasoning_content,
            };

        } catch (error: any) {
            return {
                type: "error",
                message: error.message || String(error),
                code: "think_error",
            };
        }
    }
    async generateFinalResponse(historyMessages: ChatMessage[]): Promise<FinalResult> {
        try {
            historyMessages.unshift({
                role: 'system',
                content: `## 身份：任务执行助手

## 任务：
1. **综合分析**所有工具的执行结果
2. **生成连贯的自然语言总结**作为最终回复给用户

## 规范：
- 不要只说"已完成"或"执行成功"这种空洞的话
- 要基于工具返回的实际数据（天气、地理位置等）给出有意义的回答
- 如果多个工具返回了相关信息，要把它们整合成一个完整的答复
- 语气自然友好，像真人对话一样

## 输出格式：
- 禁止输出非 JSON对象 格式的文本。{"type": "respond", "content": "最终总结"}
`,
            })
            const response = await this.llm.chat({ messages: historyMessages, response_format:{ type: "json_object" } });
            const parsed = JSON.parse(response.content);

            if (parsed.type === 'respond' && typeof parsed.content === 'string') {
                return {
                    type: "response",
                    content: parsed.content,
                    reasoning_content: response.reasoning_content,
                };
            }

            // 兜底：无法识别的格式返回原始内容
            return {
                type: "response",
                content: response.content,
                reasoning_content: response.reasoning_content,
            };

        } catch (error: any) {
            return {
                type: "error",
                message: error.message || String(error),
                code: "think_error",
            };
        }
    }
}
export default ThinkNode;
