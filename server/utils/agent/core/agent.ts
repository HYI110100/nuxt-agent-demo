import { ActNode } from "../nodes/act";
import { InputNode } from "../nodes/input";
import { ThinkNode } from "../nodes/think";
import { BaseTool, ToolRegistry } from "../nodes/tool";
import { Orchestrator } from "./orchestrator";
import { Context } from "../nodes/message";

type AgentConfig = { apiKey: string, model: string, platformType: SupportedPlatform, systemPrompt?: string };
export class Agent {
    config: AgentConfig;
    toolRegistry: ToolRegistry
    thinkNode: ThinkNode
    actNode: ActNode
    inputNode: InputNode
    orchestrator: Orchestrator
    context: Context
    constructor(config: AgentConfig) {
        if (!config.apiKey) {
            throw new Error('apiKey is required');
        }
        if (!hasPlatform(config.platformType)) {
            throw new Error('platformType is required');
        }
        if (!config.model) {
            throw new Error('model is required');
        }

        this.config = config
        const llmClient = new platformMap[this.config.platformType]({ apiKey: this.config.apiKey, model: this.config.model });
        this.toolRegistry = new ToolRegistry();
        this.thinkNode = new ThinkNode(llmClient);
        this.actNode = new ActNode(this.toolRegistry);
        this.inputNode = new InputNode();
        this.context = new Context(10);
        this.orchestrator = new Orchestrator({
            maxIterations: 5,
            actNode: this.actNode,
            thinkNode: this.thinkNode,
            inputNode: this.inputNode,
            toolRegistry: this.toolRegistry,
            context: this.context,
            systemPrompt: this.config.systemPrompt
        });
    }

    addTool(tool: BaseTool) {
        this.toolRegistry.register(tool);
    }

    setSystemPrompt(systemPrompt: string) {
        this.orchestrator.setSystemPrompt(systemPrompt);
    }

    async chat(input: string) {
        return await this.orchestrator.run(input)
    }
}