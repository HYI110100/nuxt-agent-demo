import type { Message } from "../db/chat";
import type { ChatMessage } from "../llm/agent/core/types";

/**
 * 将数据库消息转换为 OpenAI 格式
 * 把 assistant 的完整执行过程（思考 - 计划 - 工具 - 结果）聚合成单条消息
 */
export function messageToOpenaiMessage(messages: Message[]): ChatMessage[] {
    const result: ChatMessage[] = [];

    for (const msg of messages) {
        if (msg.role === 'system') {
            result.push({ role: 'system', content: msg.content });
            continue;
        }

        if (msg.role === 'user') {
            result.push({ role: 'user', content: msg.content });
            continue;
        }

        if (msg.role === 'assistant') {
            // 组装完整的 assistant 消息内容
            let content = '';

            // 1. 初始思考/计划描述
            if (msg.content) {
                content += msg.content + '\n\n';
            }

            // 2. 如果有计划和工具调用，附加详细执行记录
            if (msg.plans && msg.plans.length > 0) {
                for (const plan of msg.plans) {
                    content += `【计划 ${plan.description} (${plan.mode})】\n`;
                }
            }

            if (msg.toolCalls && msg.toolResults) {
                for (let i = 0; i < msg.toolCalls.length; i++) {
                    const toolCall = msg.toolCalls[i];
                    const toolResult = msg.toolResults.find(r => r.toolId === toolCall.id);

                    content += `├─ 【${toolCall.name}】${toolCall.params ? JSON.stringify(toolCall.params) : ''}\n`;
                    if (toolResult) {
                        content += `│  └─ 结果：${JSON.stringify(toolResult.result)}\n`;
                    }
                }
            }

            // 3. 最终总结
            if (msg.result?.content) {
                content += `\n【总结】${msg.result.content}`;
            }

            result.push({
                role: 'assistant',
                content: content.trim(),
            });
        }
    }

    return result;
}