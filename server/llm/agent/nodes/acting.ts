import type { ErrorType } from "../core/types";
import { debug, warn } from "../utils/logger";
import type ToolManager from "./toolManager";
type ActingResult = {type: "success", result: any} | ErrorType;
class ActingNode {
    private toolManager: ToolManager;

    constructor(toolManager: ToolManager) {
        this.toolManager = toolManager;
    }

    async run({ name, params }: { name: string; params?: Record<string, any> }): Promise<ActingResult> {
        debug("ActingNode.run 准备执行工具:", { name, params: JSON.stringify(params).substring(0, 50) });
       try {
        const result = await this.toolManager.run(name, params);
        debug("ActingNode 工具执行成功:", name);
        return { type: "success", result };
       } catch (error: any) {
        warn("ActingNode 工具执行失败:", { tool: name, error: error.message || String(error) });
        return { type: "error", message: error, code: "acting_error" };
       }
    }
}

export default ActingNode;