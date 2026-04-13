import type { Decision } from "./think.ts";
import { ToolRegistry } from "./tool";
export type Result =
    | { type: 'respond'; content: string }
    | { type: 'call_tool'; tool: string; params: Record<string, any>, result: string }
    | { type: 'error'; message: string, error_code: string };

export class ActNode {
    private registry: ToolRegistry
    constructor(registry: ToolRegistry) {
        this.registry = registry;
    }

    async process(decision: Decision): Promise<Result> {
        if (decision.type === 'call_tool') {
            const tool = this.registry.get(decision.tool);
            if (!tool) {
                return {
                    type: 'error',
                    message: `工具${decision.tool}不存在`,
                    error_code: `TOOL_NOT_FOUND`
                };
            }

            try {
                const result = await tool.execute(Object.values(decision.params || {}));
                return {
                    type: 'call_tool',
                    tool: decision.tool,
                    params: decision.params,
                    result: result
                };
            } catch (error: any) {
                return {
                    type: 'error',
                    message: `工具${decision.tool} 执行错误`,
                    error_code: `TOOL_ERROR_ERROR`
                };
            }
        }

        if (decision.type === 'respond') {
            return {
                type: 'respond',
                content: decision.content
            };
        }

        // 理论上不会走到这里，但为了类型安全
        return {
            type: 'error',
            message: '未知的决策类型',
            error_code: 'UNKNOWN_DECISION_TYPE'
        };
    }
}