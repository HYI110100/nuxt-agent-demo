export const chatsDB: Map<string, { id: string, title: string }> = new Map();
export interface MessageBase {
    id: string;                    // 主键 ID
    conversationId: string;        // 所属会话 ID
    content: string;               // 文本内容
    reasoningContent?: string;     // 思考过程 (LLM reasoning)
    timestamp: number;
}
export interface MessageSystem extends MessageBase {
    role: 'system';
}
export interface MessageUser extends MessageBase {
    role: 'user';
}
export interface PlanDB {
    id: string;
    description: string;
    mode: 'parallel' | 'serial' | 'auto' | 'manual';
    status: 'running' | 'completed' | 'failed';
    toolCount: number;
    createdAt: number;
    completedAt?: number;
    step: number;
}

export interface ToolCallDB {
    id: string;
    planId?: string;
    step: number;
    index: number;
    name: string;
    params?: Record<string, any>;
    status: 'running' | 'completed' | 'failed';
    executedAt?: number;
}

export interface ToolResultDB {
    id: string;
    toolId: string;
    planId: string;
    result: any;
}

export interface AssistantResultDB {
    content: string;
    reasoningContent?: string;
}

export interface MessageAssistant extends MessageBase {
    role: 'assistant';
    plans?: PlanDB[]; // 计划记录
    toolCalls: ToolCallDB[]; // 工具记录
    toolResults?: ToolResultDB[]; // 工具执行结果
    result: AssistantResultDB; // 最终所有计划完成后的结果
}
export type Message = MessageSystem | MessageUser | MessageAssistant;
export const messagesDB: Map<string, Message[]> = new Map();
