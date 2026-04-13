type RoleType = 'user' | 'system'
type ContentType = { type: 'text', content: string } | { type: 'call_tool', result: string, params: Record<string, any> } | { type: 'error', message: string, error: string }
type MessageType = ContentType['type']
// 标准消息格式
export class MessageNode {
    role: RoleType;
    content: string;
    type: MessageType;
    metadata?: Record<string, any>;
    timestamp: number;
    constructor(params: { role: 'user', content: ContentType, metadata?: Record<string, any> } | { role: 'system', content: string }) {
        this.role = params.role;
        if (params.role === 'user') {
            this.content = JSON.stringify(params.content);
            this.type = params.content.type;
            if (params.metadata)
                this.metadata = params.metadata;
        } else {
            this.content = params.content;
            this.type = "text";
        }
        this.timestamp = Date.now();
    }
}

type ContextState = 'idle' | 'thinking' | 'acting';
export class Context {
    protected messages: Message[] = [];
    protected state: ContextState = 'idle';
    protected currentDecision: any = null;
    protected maxMessages: number = 100;
    constructor(maxMessages: number = 100) {
        this.messages = [];      // 所有消息历史
        this.state = 'idle';           // 'idle' | 'thinking' | 'acting'
        this.currentDecision = null;
        this.maxMessages = maxMessages;
    }
    addMessage(message: Message) {
        this.messages.push(message);
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }
    setState(state: ContextState) {
        this.state = state;
    }
    setCurrentDecision(decision: any) {
        this.currentDecision = decision;
    }
    getMessagesAll(): Message[] {
        return JSON.parse(JSON.stringify(this.messages));
    }
    getMessages(): Message[] {
        return JSON.parse(JSON.stringify(this.messages)).slice(-this.maxMessages);
    }
}