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

## 响应规则 - **所有响应都必须是 JSON 格式（不要包含 markdown 代码块标记）**
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