export type Role = 'system' | 'user' | 'assistant' | 'tool';

export type MessageThought = {
    type: 'response'
    text: string;
}
export type MessageResponse = {
    type: 'response'
    text: string;
}
export type MessageQuestion = {
    type: 'question'
    text: string;
}
export type MessageToolResult = {
    type: 'tool_result';
    tool: string;
    result: any;
}
export type MessageToolCall = {
    type: 'tool_call';
    tool: string;
    params: Record<string, any>;
}
export type MessageError = {
    type: 'error';
    code?: string;
    message?: string;
}
export type Result = MessageResponse | MessageToolResult | MessageError
export type Decision = MessageResponse | MessageToolCall | MessageError

/**
 * Agent标准消息格式
 * 内容数据流转使用
 */
export type InternalMessage = {
    role: 'assistant';
    content: MessageThought | MessageResponse | MessageError
} | {
    role: 'user';
    content: MessageQuestion | MessageError
} | {
    role: 'tool';
    content: MessageToolCall | MessageToolResult | MessageError
}

/**
 * 外部消息格式 - 传给 LLM SDK 的原始格式
 * 与 OpenAI Chat API 兼容
 */
export type ExternalMessage = {
    role: Exclude<Role, 'tool'>;
    content: string;
}

/**
 * 流式事件类型
 * 只包含业务相关事件，不包含传输层事件
 */
export type StreamEvent =
    | { type: 'response'; text: string }           // AI 的思考过程
    | { type: 'tool_call'; tool: string; params?: Record<string, any> }   // 工具调用决策
    | { type: 'response'; text: string }          // 最终回答
    | { type: 'error'; code?: string; message?: string };     // 错误

/**
 * 非流式事件类型
 * 只包含业务相关事件，不包含传输层事件
 */
export type notStreamEvent =
    | { type: 'response'; reasoning?: string; response: string; }
    | { type: 'tool_call'; reasoning?: string; response: { tool: string; params: Record<string, any>; } }
    | { type: 'error'; reasoning?: string; response: { code?: string; message?: string; }; }

/**
 * 外部 LLM 客户端接口
 * Agent 通过这个接口与 LLM 交互，解耦具体实现
 */
export interface LLMClient {
    /** 非流式请求 - 返回 LLM 原始响应文本 */
    sendRequest(messages: ExternalMessage[]): Promise<notStreamEvent>;

    /** 流式请求 - onChunk 传递原始文本片段 */
    sendStreamRequest(messages: ExternalMessage[], onChunk: (textFragment: StreamEvent) => void): Promise<void>;
}

/** Agent 配置接口 */
export interface AgentConfig {
    llmClient: LLMClient;
    maxContext?: number;        // 最大上下文消息数，默认 10
    maxIterations?: number;     // 单次最大 loop 次数，默认 3
    systemPrompt?: string;      // 系统提示词
}

type ToolType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/** 工具参数定义 */
export interface ToolParameter {
    name: string;
    type: ToolType;
    description?: string;
    required?: boolean;
    enum?: string[];
    default?: any;
}

/**
 * BaseTool 基类
 * 所有自定义工具的基类
 */
export interface BaseTool {
    name: string;
    description?: string;
    schema?: ToolParameter[];
    execute(...args: any[]): Promise<any>;
}

/** 工具定义（用于 createTool 工厂） */
export interface ToolDefinition {
    name: string;
    description?: string;
    schema?: ToolParameter[];
    execute: (...args: any[]) => Promise<any>;
}

export type ToolDescription = {
    name: string;
    description?: string;
    parameters?: ToolParameter[];
}