import type { BasePlatform } from "../llm/base-platform";
import type { MessageNode } from "./message";
export type Decision =
    | { type: 'respond'; content: string }
    | { type: 'call_tool'; tool: string; params: Record<string, any> }
    | { type: 'error'; message: string, error_code: string };

export class ThinkNode {
    private llmClient: BasePlatform<any>;
    constructor(llmClient: BasePlatform<any>) {
        this.llmClient = llmClient;
    }

    async decide(messages: MessageNode[], params?: Record<string, any>): Promise<Decision> {
        //    MessageNode => ChatCompletionMessageParam
        const chatCompletionMessages = messages.map(message => ({
            role: message.role,
            content: message.content,
        }));
        const response = await this.llmClient.sendNonStreamRequest(chatCompletionMessages, params);

        return this.parseDecision(response);
    }
    async decideStream(messages: MessageNode[]) {

    }

    private parseDecision(response: any): Decision {
        if (!response || !response.choices || response.choices.length === 0) {
            return {
                type: 'error',
                message: 'LLM 响应格式异常',
                error_code: 'LLM_RESPONSE_FORMAT_ERROR'
            };
        }

        const content = response.choices[0].message?.content;

        if (!content) {
            return {
                type: 'error',
                message: 'LLM 返回内容为空',
                error_code: 'LLM_RESPONSE_CONTENT_EMPTY'
            };
        }

        try {
            const parsed = JSON.parse(content);

            // 处理 call_tool
            if (parsed.type === 'call_tool') {
                // 验证必要字段
                if (!parsed.tool) {
                    return {
                        type: 'error',
                        message: 'call_tool 决策缺少 tool 字段',
                        error_code: 'CALL_TOOL_MISSING'
                    };
                }
                return {
                    type: 'call_tool',
                    tool: parsed.tool,
                    params: parsed.params
                };
            }
            // 处理 respond（默认）
            return {
                type: 'respond',
                content: content
            };

        } catch (error) {
            // JSON 解析失败，当作普通文本回复
            return {
                type: 'respond',
                content: content
            };
        }
    }
}