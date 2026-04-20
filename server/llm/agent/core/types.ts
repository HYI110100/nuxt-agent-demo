/**=====================Chat===========================*/
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
type Options = { [key: string]: any }
export interface ChatOptions extends Options {
    messages: ChatMessage[];
}

export type StreamCallback = (chunk: string) => void;
export type ChatResponse = { content: string; reasoning_content?: string; };

export interface LLMClient {
    chat(input: string | ChatMessage[] | ChatOptions): Promise<ChatResponse>;
    chat(input: string | ChatMessage[] | ChatOptions, onChunk: StreamCallback): Promise<ChatResponse>;
}

/**=====================Agent===========================*/
export interface ErrorType {
    type: "error";
    message: string;
    code: string;
}

export interface ResponseType {
    type: "response";
    content: string;
    reasoning_content?: string;
}
export interface InputType {
    type: "input";
    content: string;
}
export interface PlanType {
    type: "plan";
    content: string;
}

/**=====================Agent Event===========================*/
export interface ResultType {
    type: "result";
    content: string;
    reasoning_content?: string;
}
export interface ResponseUpdateType {
    type: "response_update";
    content: string;
    reasoning_content?: string;
}
/** 计划开始事件 */
export interface PlanStartEvent {
    type: 'plan_start';
    step: number;
    planDescription: string;
    mode: "parallel" | "serial";
}

/** 工具调用结果事件 */
export interface ToolResultEvent {
    type: 'tool_result';
    step: number;
    index: number;              // 工具在同一 plan 中的索引
    toolName: string;
    params?: Record<string, any>;
    result: any;
    status: 'success' | 'error';
}

/** 计划完成事件 - 包含完整的计划信息 */
export interface PlanCompleteEvent {
    type: 'plan_complete';
    step: number;
    planDescription: string;
    mode: "parallel" | "serial";
    toolCount: number;
    toolResults: ToolExecutionResult[];
}

/**=====================Orchestrator===========================*/
export interface ToolExecutionResult {
    index: number;
    toolName: string;
    status: 'success' | 'error';
    result: any;
    params?: Record<string, any>;
}

export interface PlanExecutionResult {
    toolResults: ToolExecutionResult[];
}

/**=====================Agent Event===========================*/
/** Agent.onLoopEvent 所有可发送的事件类型 */
export type AgentEvent = InputType | ResponseType | ErrorType | PlanStartEvent | ToolResultEvent | PlanCompleteEvent | ResultType;