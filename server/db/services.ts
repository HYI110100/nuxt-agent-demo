import { v4 as uuidV4 } from 'uuid';
import type { Message, MessageUser, MessageSystem, MessageAssistant, PlanDB, ToolCallDB, ToolResultDB } from './chat';
import { messagesDB } from './chat';

// ============================================================
// 消息层级操作
// ============================================================

/** 添加用户消息 */
export function addUserMessage(conversationId: string, content: string): MessageUser {
    const message: MessageUser = {
        id: uuidV4(),
        conversationId,
        role: 'user',
        content,
        timestamp: Date.now(),
    };

    if (!messagesDB.has(conversationId)) {
        messagesDB.set(conversationId, []);
    }
    messagesDB.get(conversationId)!.push(message);

    return message;
}

/** 添加系统消息 */
export function addSystemMessage(conversationId: string, content: string): MessageSystem {
    const message: MessageSystem = {
        id: uuidV4(),
        conversationId,
        role: 'system',
        content,
        timestamp: Date.now(),
    };

    if (!messagesDB.has(conversationId)) {
        messagesDB.set(conversationId, []);
    }
    messagesDB.get(conversationId)!.unshift(message); // 系统消息放前面

    return message;
}

/** 根据 ID 获取消息 */
export function getMessageById(conversationId: string, messageId: string): Message | undefined {
    return messagesDB.get(conversationId)?.find(m => m.id === messageId);
}

/** 获取 assistant 消息（按索引，0 表示最新） */
export function getAssistantMessage(
    conversationId: string,
    index: number = -1
): MessageAssistant | undefined {
    const msgs = messagesDB.get(conversationId) || [];
    const assistantMsgs = msgs.filter(m => m.role === 'assistant') as MessageAssistant[];

    if (index < 0) {
        index = assistantMsgs.length + index; // -1 表示最后一个
    }

    return assistantMsgs[index];
}
export function updateContent(
    conversationId: string,
    assistantMessageId: string,
    content: string,
    reasoningContent?: string
): MessageAssistant {
    const assistantMsg = getMessageById(conversationId, assistantMessageId) as MessageAssistant;
    if (!assistantMsg) {
        throw new Error(`Assistant message not found: ${assistantMessageId}`);
    }

    assistantMsg.content = content;
    assistantMsg.reasoningContent = reasoningContent;

    return assistantMsg;
}

// ============================================================
// Assistant 消息初始化
// ============================================================

/** 创建空的 assistant 消息（用于最终填充结果） */
export function createAssistantMessage(conversationId: string): MessageAssistant {
    const message: MessageAssistant = {
        id: uuidV4(),
        conversationId,
        role: 'assistant',
        content: '',
        reasoningContent: '',
        timestamp: Date.now(),
        plans: [],
        toolCalls: [],
        toolResults: [],
        result: {
            content: '',
            reasoningContent: '',
        },
    };

    if (!messagesDB.has(conversationId)) {
        messagesDB.set(conversationId, []);
    }
    messagesDB.get(conversationId)!.push(message);

    return message;
}

// ============================================================
// Plan 操作（嵌套在 assistant 消息中）
// ============================================================

/** 向 assistant 消息追加 plan 记录 */
export function addPlanToAssistant(
    conversationId: string,
    assistantMessageId: string,
    planDescription: string,
    mode: 'parallel' | 'serial',
    step: number
): { planId: string; assistantMessage: MessageAssistant } {
    const assistantMsg = getMessageById(conversationId, assistantMessageId) as MessageAssistant;
    if (!assistantMsg) {
        throw new Error(`Assistant message not found: ${assistantMessageId}`);
    }

    const planId = uuidV4();
    const plan: PlanDB = {
        id: planId,
        description: planDescription,
        mode,
        status: 'running',
        toolCount: 0,
        createdAt: Date.now(),
        step,
    };

    if (!assistantMsg.plans) {
        assistantMsg.plans = [];
    }
    assistantMsg.plans.push(plan);

    return { planId, assistantMessage: assistantMsg };
}

/** 更新 plan 状态 */
export function updatePlanStatus(
    conversationId: string,
    assistantMessageId: string,
    planId: string,
    status: 'running' | 'completed' | 'failed'
): MessageAssistant {
    const assistantMsg = getMessageById(conversationId, assistantMessageId) as MessageAssistant;
    if (!assistantMsg || !assistantMsg.plans) {
        throw new Error(`Assistant message or plans not found: ${assistantMessageId}`);
    }

    const plan = assistantMsg.plans.find(p => p.id === planId);
    if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
    }

    plan.status = status;
    if (status === 'completed') {
        plan.completedAt = Date.now();
    }

    return assistantMsg;
}

/** 更新 plan 的工具数量 */
export function incrementPlanToolCount(
    conversationId: string,
    assistantMessageId: string,
    planId: string
): MessageAssistant {
    const assistantMsg = getMessageById(conversationId, assistantMessageId) as MessageAssistant;
    if (!assistantMsg || !assistantMsg.plans) {
        throw new Error(`Assistant message or plans not found: ${assistantMessageId}`);
    }

    const plan = assistantMsg.plans.find(p => p.id === planId);
    if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
    }

    plan.toolCount += 1;
    return assistantMsg;
}

// ============================================================
// ToolCall/ToolResult 操作
// ============================================================

/** 向 assistant 消息追加 toolCall 记录 */
export function addToolCallToAssistant(
    conversationId: string,
    assistantMessageId: string,
    planId: string,
    index: number,
    name: string,
    params?: Record<string, any>,
    status: 'running' | 'completed' | 'failed' = 'running'
): { toolCallId: string; assistantMessage: MessageAssistant } {
    const assistantMsg = getMessageById(conversationId, assistantMessageId) as MessageAssistant;
    if (!assistantMsg) {
        throw new Error(`Assistant message not found: ${assistantMessageId}`);
    }

    const toolCallId = uuidV4();
    const toolCall: ToolCallDB = {
        id: toolCallId,
        planId,
        step: index,
        index,
        name,
        params,
        status,
    };

    if (!assistantMsg.toolCalls) {
        assistantMsg.toolCalls = [];
    }
    assistantMsg.toolCalls.push(toolCall);

    return { toolCallId, assistantMessage: assistantMsg };
}

/** 向 assistant 消息追加 toolResult 记录 */
export function addToolResultToAssistant(
    conversationId: string,
    assistantMessageId: string,
    planId: string,
    toolCallId: string,
    result: any,
    status: 'success' | 'error'
): MessageAssistant {
    const assistantMsg = getMessageById(conversationId, assistantMessageId) as MessageAssistant;
    if (!assistantMsg) {
        throw new Error(`Assistant message not found: ${assistantMessageId}`);
    }

    const toolResult: ToolResultDB = {
        id: uuidV4(),
        toolId: toolCallId,
        planId,
        result,
    };

    if (!assistantMsg.toolResults) {
        assistantMsg.toolResults = [];
    }
    assistantMsg.toolResults.push(toolResult);

    return assistantMsg;
}

/** 更新单个 toolCall 状态 */
export function updateToolCallStatus(
    conversationId: string,
    assistantMessageId: string,
    toolCallId: string,
    status: 'running' | 'completed' | 'failed'
): MessageAssistant {
    const assistantMsg = getMessageById(conversationId, assistantMessageId) as MessageAssistant;
    if (!assistantMsg || !assistantMsg.toolCalls) {
        throw new Error(`Assistant message or toolCalls not found: ${assistantMessageId}`);
    }

    const toolCall = assistantMsg.toolCalls.find(t => t.id === toolCallId);
    if (!toolCall) {
        throw new Error(`Tool call not found: ${toolCallId}`);
    }

    toolCall.status = status;
    if (status === 'completed') {
        toolCall.executedAt = Date.now();
    }

    return assistantMsg;
}

// ============================================================
// Assistant 消息内容更新
// ============================================================

/** 设置 assistant 消息的最终执行结果（总结） */
export function setAssistantResult(
    conversationId: string,
    assistantMessageId: string,
    content: string,
    reasoningContent?: string
): MessageAssistant {
    const assistantMsg = getMessageById(conversationId, assistantMessageId) as MessageAssistant;
    if (!assistantMsg) {
        throw new Error(`Assistant message not found: ${assistantMessageId}`);
    }

    assistantMsg.result = {
        content,
        reasoningContent,
    };

    return assistantMsg;
}
