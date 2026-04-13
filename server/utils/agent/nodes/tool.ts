import { v4 as uuidV4 } from 'uuid';

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  default?: any;
}
interface Tool {
    name: string;
    description: string;
    schema?: ToolParameter[];
    execute(args: any): Promise<string>;
}


export abstract class BaseTool implements Tool {
    abstract name: string;
    abstract description: string;
    abstract schema?: ToolParameter[];
    abstract execute(...args: any[]): Promise<string>;
}
type ToolData = BaseTool & { id: string };
export class ToolRegistry {
    private tools = new Map<string, ToolData>();
    register(config: BaseTool) {
        const tool: ToolData = {
            id: uuidV4(),
            name: config.name,
            description: config.description || `执行 ${config.name} 操作`,
            schema: config.schema,
            execute: config.execute
        };
        this.tools.set(config.name, tool);
    }

    get(toolName: string) { return this.tools.get(toolName); }
    has(toolName: string): boolean { return this.tools.has(toolName) }
    remove(toolName: string): boolean { return this.tools.delete(toolName) }
    list() { return Array.from(this.tools.values()); }
    listNames(): string[] { return Array.from(this.tools.keys()); }
    getToolsDescription(): Array<{
        name: string;
        description: string;
        parameters?: ToolParameter[];
    }> {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.schema
        }));
    }
}
