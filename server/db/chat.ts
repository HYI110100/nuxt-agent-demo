export const chatsDB: Map<string, { id: string, title: string }> = new Map();

/** Agent 循环中抛出的事件内容 */

type ContentEvent = {
	type: 'content'
	content: string
	reasoning?: string
}
type ToolCallEvent = {
	type: 'tool_call'
	toolName: string
	content: string
	reasoning?: string
	taskId?: number
}
type ToolResultEvent = {
	type: 'tool_result'
	toolName: string
	content: string
	reasoning?: string
	taskId?: number
}

export type ChatMessage = {
	id: string;
	parentId?: string;
	role: 'system';
	event: ContentEvent;
	timestamp: number;
} | {
	id: string;
	parentId?: string;
	role: 'assistant';
	event: ContentEvent | ToolCallEvent | ToolResultEvent;
	timestamp: number;
} | {
	id: string;
	parentId?: string;
	role: 'user';
	event: ContentEvent;
	timestamp: number;
}
export const messagesDB: Map<string, ChatMessage[]> = new Map();
