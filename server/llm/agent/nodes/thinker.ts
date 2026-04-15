import type { LLMClient, Decision, InternalMessage, ExternalMessage, notStreamEvent } from '../core/types';

/**
 * 思考节点
 * 负责调用 LLM 并解析决策
 */
export class Thinker {
    private llmClient: LLMClient;

    constructor(llmClient: LLMClient) {
        this.llmClient = llmClient;
    }

    /**
     * 非流式决策
     * @param messages 当前对话消息列表
     * @returns Decision 类型的决策结果
     */
    async decide(messages: InternalMessage[]): Promise<Decision> {
        // InternalMessage → ExternalMessage 转换
        const externalMessage = this.toInternalMessages(messages);

        // 调用 LLM
        const response = await this.llmClient.sendRequest(externalMessage);
        
        // 解析决策
        return this.parseDecision(response);
    }

    /**
     * 流式决策
     * @param messages 当前对话消息列表
     * @yields Decision 类型的决策结果
     */
    async *decideStream(messages: InternalMessage[]): AsyncGenerator<Decision> {
        // InternalMessage → ExternalMessage 转换
        const externalMessage = this.toInternalMessages(messages);
        await this.llmClient.sendStreamRequest(externalMessage,
            (textFragment) => {

            }
        );
    }

    /**
     * 将标准 Message 转换为内部格式
     */
    private toInternalMessages(messages: InternalMessage[]): ExternalMessage[] {
        return messages.map((msg) => ({
            role: msg.role === 'tool' ? 'assistant' : msg.role,
            content:
                typeof msg.content === 'string'
                    ? msg.content
                    : JSON.stringify(msg.content),
        }));
    }

    /**
     * 解析 LLM 返回的非流式内容为 Decision 对象
     */
    private parseDecision(rawContent: notStreamEvent): Decision {
        try {

            const parsed = rawContent;

            if (parsed.type === 'response') {
                return {
                    type: "response",
                    text: parsed.response,
                }
            }
            if (parsed.type === 'tool_call') {
                return {
                    type: "tool_call",
                    tool: parsed.response.tool,
                    params: parsed.response.params,
                }
            }
            if (parsed.type === 'error') {
                return {
                    type: 'error',
                    code: parsed.response.code || 'PARSE_FAILED',
                    message: parsed.response.message || '解析失败',
                };
            }
        } catch (error) {
            console.error('Failed to parse decision:', error, rawContent);
        }

        return {
            type: 'error',
            code: 'PARSE_FAILED',
            message: '无法解析 LLM 响应',
        };
    }
}
