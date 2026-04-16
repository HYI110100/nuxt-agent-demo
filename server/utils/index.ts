import type { Message, ToolCall } from "../db/chat";
import type { ToolDescription } from "../llm/agent/core/types";

function buildToolParameters(tools: ToolDescription[]): string {
    if (!tools?.length) {
        return '暂无可用工具';
    }

    let md = '';
    tools.forEach((tool, i) => {
        md += `### ${tool.name}\n`;
        md += `${tool.description || '无描述'}\n\n`;

        if (tool.parameters && tool.parameters.length > 0) {
            md += '**参数**:\n';
            for (const param of tool.parameters) {
                const required = param.required ? '必填' : '可选';
                const desc = param.description || '-';
                md += `- \`${param.name}\` (${param.type}) [${required}]: ${desc}\n`;
            }
            md += '\n';
        }
        if (i <= tools.length - 2) {
            md += '---\n\n';
        }
    })
    return md;
}
export function buildSystemPrompt(options: { toolList: ToolDescription[] }) {
    return `你是一个智能助手。根据工具列表回答问题或调用工具。

# 可用工具

## 工具列表
${buildToolParameters(options.toolList)}

## 响应规则 - **所有响应都必须是 JSON 对象格式（不要包含 markdown 代码块标记）**
1. **不需要工具时**：返回 {"type": "response", "text": "文本回复"}
2. **需要工具时**：：
   {"type": "tool_call", "tool": "工具名", "params": {"参数": "值(必填/可选)"}}
3. **工具执行错误时**：返回 {"type": "error", "message": "错误描述"}

## 简短示例
- 用户："你好" → 你："你好！有什么可以帮你？"
- 用户："查询北京市行政区划" → 你：{"type": "tool_call", "tool": "gaode_district", "params": {"keywords": "北京"}}
- 用户："上海天气" → 你：{"type": "tool_call", "tool": "gaode_weather", "params": {"city": "上海"}}
`
}

export function messageToOpenaiMessage(
  messages: Message[],
  toolCalls?: ToolCall[]
): { role: 'user' | 'assistant' | 'system'; content: string }[] {
    const result: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];

    // 如果没有工具调用，直接转换消息
    if (!toolCalls || toolCalls.length === 0) {
        for (const msg of messages) {
            if (msg.content) {
                result.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }
        return result;
    }

    // 创建工具调用映射，方便快速查找
    const toolMap = new Map<string, ToolCall>();
    for (const tc of toolCalls) {
        toolMap.set(tc.id, tc);
    }

    // 合并消息和工具调用，按时间排序
    const allEvents: Array<{ timestamp: number; type: 'message' | 'tool_call'; data: Message | ToolCall }> = [];

    for (const msg of messages) {
        allEvents.push({ timestamp: msg.timestamp, type: 'message', data: msg });
    }

    for (const tc of toolCalls) {
        allEvents.push({ timestamp: tc.timestamp, type: 'tool_call', data: tc });
    }

    // 按时间戳排序
    allEvents.sort((a, b) => a.timestamp - b.timestamp);

    // 遍历生成 OpenAI 格式消息
    for (const event of allEvents) {
        if (event.type === 'message') {
            const msg = event.data as Message;
            if (msg.content) {
                result.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        } else {
            const tc = event.data as ToolCall;
            if (tc.status === 'completed' && tc.result) {
                // 工具执行完成，包含真实结果
                result.push({
                    role: 'assistant',
                    content: `[工具返回] ${tc.toolName}: ${tc.result}`
                });
            } else if (tc.status === 'pending') {
                // 工具调用中，显示参数
                const paramsStr = JSON.stringify(tc.params);
                result.push({
                    role: 'assistant',
                    content: `[工具调用] ${tc.toolName}: ${paramsStr}`
                });
            } else if (tc.status === 'error') {
                // 工具执行错误
                result.push({
                    role: 'assistant',
                    content: `[工具错误] ${tc.toolName}: 执行失败`
                });
            }
        }
    }

    return result;
}