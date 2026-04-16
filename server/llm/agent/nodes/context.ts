import type { InternalMessage, OnLoopEvent } from '../core/types';
import { v4 as uuidV4 } from 'uuid';

/** 上下文状态 */
type ContextState = 'idle' | 'thinking' | 'acting';
export type ContextMessage = InternalMessage & { timestamp: number, id: string }
/**
 * 上下文管理类
 * 管理消息历史和状态
 */
export class Context {
    private messages: ContextMessage[] = [];
    private state: ContextState = 'idle';
    private currentDecision: any = null;
    // private readonly maxMessages: number;
    private onLoopEvent?: OnLoopEvent;

    constructor({ maxMessages = 10, onLoopEvent }: { maxMessages?: number; onLoopEvent?: OnLoopEvent }) {
        // this.maxMessages = maxMessages;
        this.onLoopEvent = onLoopEvent;
    }

    /** 添加消息 */
    addMessage(message: InternalMessage) {
        const newData = {
            id: uuidV4(),
            ...message,
            timestamp: Date.now(),
        }
        this.messages.push(newData);
        if (this.onLoopEvent) {
            this.onLoopEvent(newData);
        }
        return newData;
    }

    /** 获取所有消息（仅最近 maxMessages 条） */
    getMessages(): InternalMessage[] {
        return this.messages;
    }

    /** 设置上下文状态 */
    setState(state: ContextState) {
        this.state = state;
    }

    /** 获取当前状态 */
    getState(): ContextState {
        return this.state;
    }

    /** 设置当前决策 */
    setCurrentDecision(decision: any) {
        this.currentDecision = decision;
    }

    /** 获取当前决策 */
    getCurrentDecision(): any {
        return this.currentDecision;
    }

    /** 清空所有消息 */
    clear() {
        this.messages = [];
        this.state = 'idle';
        this.currentDecision = null;
    }
}
