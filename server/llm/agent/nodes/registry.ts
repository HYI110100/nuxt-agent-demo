import { v4 as uuidV4 } from 'uuid';
import type { BaseTool, ToolParameter, ToolDefinition, ToolDescription } from '../core/types';

type Tool = BaseTool & { id: string };
export class ToolRegistry {
    private tools = new Map<string, Tool>();

    /** 注册工具 */
    register(tool: BaseTool): Tool {
        const existing = this.tools.get(tool.name);
        if (existing) {
            console.warn(`Tool "${tool.name}" already registered, overriding`);
        }
        const t = { ...tool, id: uuidV4() };
        this.tools.set(tool.name, t);
        return t;
    }

    /** 获取工具 */
    get(toolName: string): Tool | undefined {
        return this.tools.get(toolName);
    }

    /** 检查工具是否存在 */
    has(toolName: string): boolean {
        return this.tools.has(toolName);
    }

    /** 移除工具 */
    remove(toolName: string): boolean {
        return this.tools.delete(toolName);
    }

    /** 列出所有工具 */
    list(): Tool[] {
        return Array.from(this.tools.values());
    }

    /** 列出所有工具名称 */
    listNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /** 获取工具描述列表（用于系统提示） */
    getToolsDescription(): ToolDescription[] {
        return Array.from(this.tools.values()).map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.schema,
        }));
    }
}

/**
 * 工具工厂函数
 * 简化工具的创建过程
 */
export function createTool(definition: ToolDefinition): Tool {
    return {
        name: definition.name,
        description: definition.description || '',
        schema: definition.schema || [],
        execute: definition.execute,
        id: uuidV4(),
    }
}
