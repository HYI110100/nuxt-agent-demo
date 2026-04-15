import type { Decision, Result } from '../core/types';
import type { ToolRegistry } from './registry';

/**
 * 执行节点
 * 负责执⾏工具调用决策
 */
export class Actor {
    private registry: ToolRegistry;

    constructor(registry: ToolRegistry) {
        this.registry = registry;
    }

    /**
     * 处理决策
     * @param decision 决策对象
     * @returns Result 类型的处理结果
     */
    async process(decision: Decision): Promise<Result> {
        if (decision.type === 'tool_call') {
            const tool = this.registry.get(decision.tool);
            if (!tool) {
                return {
                    type: 'error',
                    message: `工具 ${decision.tool} 不存在`,
                    code: 'TOOL_NOT_FOUND',
                };
            }

            try {
                const result = await tool.execute(Object.values(decision.params || {}));
                return {
                    type: 'tool_result',
                    tool: decision.tool,
                    result: result,
                };
            } catch (error: any) {
                console.error(`Tool execution error:`, error);
                return {
                    type: 'error',
                    message: `工具 ${decision.tool} 执行错误`,
                    code: 'TOOL_EXECUTION_ERROR',
                };
            }
        }

        if (decision.type === 'response') {
            return {
                type: 'response',
                text: decision.text,
            };
        }

        // 错误情况
        if (decision.type === 'error') {
            return {
                type: 'error',
                message: decision.message || '未知的错误',
                code: decision.code || 'UNKNOWN_ERROR',
            };
        }

        // 理论上不会走到这里
        return {
            type: 'error',
            message: '未知的决策类型',
            code: 'UNKNOWN_DECISION_TYPE',
        };
    }
}
