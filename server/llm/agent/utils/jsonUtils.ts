/**
 * JSON 解析工具 - 处理 LLM 输出中的 Markdown 代码块包裹
 */

export function parseJSON(content: string): any {
    // Remove markdown code block wrappers
    const cleaned = content
        .replace(/^```json\s*/i, '')      // ```json at start
        .replace(/^```\s*/i, '')          // ``` at start
        .replace(/\s*```$/g, '');         // ``` at end

    return JSON.parse(cleaned);
}
