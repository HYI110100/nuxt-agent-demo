export type ToolCallType = { name: string; params?: Record<string, any>, intention?: string };

import { parseJSON } from "../utils/jsonUtils";
import { debug, warn, error } from "../utils/logger";

export type ToolSchemaType = "string" | "number" | "boolean" | "object" | "array";
/**
 * 工具参数接口
 * 定义了工具参数的结构，包括名称、描述、类型和默认值
*/
export interface ToolSchema {
    name: string;
    description: string;
    type: ToolSchemaType;
    default?: any;
    required?: boolean;
    optional?: { value: any; description: string }[];
}

/**
 * 基础工具接口
 * 定义了基础工具的结构，包括名称、描述、参数和执行函数
*/
export interface BaseTool {
    name: string;
    description: string;
    schema: ToolSchema[];
    execute: (...args: any[]) => Promise<any>;
}

class ToolManager {
    private tools = new Map<string, BaseTool>();
    constructor(tools?: BaseTool[]) {
        tools?.forEach(tool => this.add(tool));
    }
    
    /** 注册工具 */
    add(tool: BaseTool): BaseTool {
        debug("注册新工具:", tool.name);
        const existing = this.tools.get(tool.name);
        if (existing) {
            warn(`工具 "${tool.name}" 已存在，正在覆盖`);
        }
        // 创建新对象但保留 execute 方法的引用
        const newTool = Object.assign(Object.create(Object.getPrototypeOf(tool)), tool);
        this.tools.set(tool.name, newTool);
        return newTool;
    }

    /** 获取工具 */
    get(toolName: string): BaseTool | undefined {
        return this.tools.get(toolName);
    }

    /** 获取工具列表 */
    getTools(): BaseTool[] {
        return Array.from(this.tools.values());
    }

    /** 检查工具是否存在 */
    has(toolName: string): boolean {
        return this.tools.has(toolName);
    }

    /** 移除工具 */
    remove(toolName: string): boolean {
        return this.tools.delete(toolName);
    }

    /** 获取工具提示词 */
    getToolsPrompt(tools: BaseTool[]): string {
        let toolListDescription = '';
        tools.forEach((tool, i) => {
            toolListDescription += `### ${tool.name}\n`;
            toolListDescription += `${tool.description || '无描述'}\n\n`;

            if (tool.schema && tool.schema.length > 0) {
                toolListDescription += '**参数**:\n';
                for (const param of tool.schema) {
                    const required = param.required ? '必填' : '可选';
                    const desc = param.description || '-';
                    let paramLine = `- \`${param.name}\` (${param.type}) [${required}]: ${desc}`;
                    if (param.default !== undefined) {
                        paramLine += `，默认值: \`${JSON.stringify(param.default)}\``;
                    }
                    if (param.optional && param.optional.length > 0) {
                        const optionalValues = param.optional.map(opt => `\`${opt.value}\` (${opt.description})`).join(', ');
                        paramLine += `，可选值: ${optionalValues}`;
                    }
                    toolListDescription += paramLine + '\n';
                }
                toolListDescription += '\n';
            }
            if (i <= tools.length - 2) {
                toolListDescription += '---\n\n';
            }
        })

        return `# 工具

## 工具列表
${toolListDescription}

## 工具调用规则
- **不要编造工具**：只使用列表中列出的工具，任何未列出的工具都是不存在的
- **参数完整性**：调用工具时必须提供所有必填参数（标记为"必填"的参数）
- **类型正确性**：参数值必须符合 schema 定义的类型（string/number/boolean/array/object）
- **可选值限制**：如果参数有"可选值"列表，传入的值必须在列表中
- **默认值自动使用**：如果有默认值，可选参数若不提供时会自动使用默认值，建议显式传入以获得明确行为

## 输出格式
- { "tool": "工具名", "params": {"参数": "值(必填/可选)"}}
`
    }

    /** 运行工具 */
    async run(toolName: string, params?: Record<string, any>): Promise<any> {
        debug("ToolManager.run 请求执行工具:", { name: toolName, params: JSON.stringify(params).substring(0, 100) });
        const tool = this.tools.get(toolName);
        if (!tool) {
            error(`Tool "${toolName}" not found`);
            throw new Error(`Tool "${toolName}" not found`);
        }
        const result: Record<string, any> = {};
        const errors: string[] = [];

        // 处理每个 schema 定义
        for (const param of tool.schema) {
            const value = params?.[param.name];

            // 检查必填字段
            if (param.required && value === undefined && !('default' in param)) {
                warn(`参数验证失败：缺少必填参数 ${param.name}`);
                errors.push(`Missing required parameter: ${param.name}`);
                continue;
            }

            // 使用默认值（如果未提供且有默认值）
            if (value === undefined) {
                if ('default' in param) {
                    result[param.name] = param.default;
                    debug(`使用默认值：${param.name} = ${JSON.stringify(param.default)}`);
                }
                continue;
            }

            // 类型验证和转换
            const convertedValue = convertType(value, param.type);
            if (convertedValue === null) {
                warn(`参数验证失败：${param.name} 类型错误，期望 ${param.type}`);
                errors.push(`Invalid type for ${param.name}: expected ${param.type}`);
                continue;
            }

            // 检查可选值枚举
            if (param.optional && param.optional.length > 0) {
                const validValues = param.optional.map(o => o.value);
                if (!validValues.includes(convertedValue)) {
                    warn(`参数验证失败：${param.name} 值无效，必须是 [${validValues.join(', ')}] 之一`);
                    errors.push(
                        `${param.name} must be one of: ${validValues.join(', ')}`
                    );
                    continue;
                }
            }

            result[param.name] = convertedValue;
        }

        // 抛出所有验证错误
        if (errors.length > 0) {
            const errorMsg = `Parameter validation failed: ${errors.join('; ')}`;
            error(errorMsg);
            throw new Error(errorMsg);
        }
        debug("参数验证通过，执行工具:", toolName);
        const executeResult = await tool.execute(result);
        debug("工具执行完成:", { tool: toolName, resultSummary: String(executeResult).substring(0, 100) });
        return executeResult;
    }
}
export default ToolManager;

/**
 * 工具工厂函数
 * 简化工具的创建过程
 */
export function createTool(definition: BaseTool): BaseTool {
    return {
        name: definition.name,
        description: definition.description || '',
        schema: definition.schema || [],
        execute: definition.execute,
    }
}

/** 类型转换 */
function convertType(
    value: any,
    type: ToolSchemaType
): any {
    switch (type) {
        case 'string':
            if (typeof value === 'string') return value;
            if (typeof value === 'number') return value.toString();
            if (typeof value === 'boolean') return value.toString();
            return null;

        case 'number':
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                const num = parseFloat(value);
                return isNaN(num) ? null : num;
            }
            if (typeof value === 'boolean') return value ? 1 : 0;
            return null;

        case 'boolean':
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
                const lower = value.toLowerCase();
                if (lower === 'true' || lower === '1' || lower === 'yes') {
                    return true;
                }
                if (lower === 'false' || lower === '0' || lower === 'no') {
                    return false;
                }
            }
            if (typeof value === 'number') return value !== 0;
            return null;

        case 'array':
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                try {
                    return parseJSON(value);
                } catch {
                    return value.split(',').map(s => s.trim());
                }
            }
            return null;

        case 'object':
            if (typeof value === 'object' && value !== null) return value;
            if (typeof value === 'string') {
                try {
                    return parseJSON(value);
                } catch {
                    return null;
                }
            }
            return null;

        default:
            return value;
    }
}

