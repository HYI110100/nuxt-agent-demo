import type { ErrorType } from "../core/types";
import type ToolManager from "./toolManager";
type ActingResult = {type: "success", result: any} | ErrorType;
class ActingNode {
    private toolManager: ToolManager;

    constructor(toolManager: ToolManager) {
        this.toolManager = toolManager;
    }

    async run({ name, params }: { name: string; params?: Record<string, any> }): Promise<ActingResult> {
       try {
        const result = await this.toolManager.run(name, params);
        return { type: "success", result };
       } catch (error: any) {
        return { type: "error", message: error, code: "acting_error" };
       }
    }
}

export default ActingNode;