export const chatsDB: Map<string, { id: string, title: string }> = new Map();

// ===== 新的双表结构类型定义 =====

export type Message = {
	id: string;                    // 主键 ID
	messageId: string;             // 消息 ID
	sessionId: string;             // 会话 ID
	role: 'system' | 'user' | 'assistant';
	content: string | null;        // 内容，工具调用时为 null
	reasoning_content?: string;    // 思考过程
	toolCallIds: string[];         // 关联的工具调用 ID 数组
	timestamp: number;
}

export type ToolCall = {
	id: string;                    // 工具调用 ID
	messageId: string;             // 关联的消息 ID
	sessionId: string;             // 会话 ID
	toolName: string;
	params: Record<string, any>;   // 工具参数
	result?: string;               // 工具结果
	status: 'pending' | 'completed' | 'error';
	order: number | null;          // 执行顺序 (暂时固定为 null)
	reasoning?: string;            // 思考过程
	timestamp: number;
}

// 新的数据库存储 - 双表结构
export const messagesDB: Map<string, Message[]> = new Map();
export const toolCallsDB: Map<string, ToolCall[]> = new Map();
