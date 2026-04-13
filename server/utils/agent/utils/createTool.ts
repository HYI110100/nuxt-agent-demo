import type { BaseTool } from "../nodes/tool";

export function createTool(name: string, description: string, func: (...args: any[]) => Promise<any>): BaseTool {
    return {
        name,
        description,
        execute: func
    }
}