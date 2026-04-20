import OpenAI from "openai";
import type { ChatMessage, ChatOptions, ChatResponse, LLMClient, StreamCallback } from "./agent/core/types";

const model = process.env.MODEL_NAME || '';
const apiKey = process.env.OPENAI_API_KEY || '';
const baseURL = process.env.OPENAI_BASE_URL || '';

const client = new OpenAI({ apiKey, baseURL });

// 阿里云百炼特殊参数（修正空格）
const bailianExtraBody = [
    'top_k', 
    'repetition_penalty',  // 移除空格
    'vl_high_resolution_images', 
    'enable_thinking', 
    'preserve_thinking', 
    'thinking_budget', 
    'enable_code_interpreter'
];

function handleParams(input: string | ChatMessage[] | ChatOptions) {
    let messages: ChatMessage[];
    let params: Record<string, any> = {};

    if (typeof input === 'string') {
        messages = [{ role: 'user', content: input }];
    } else if (Array.isArray(input)) {
        messages = input;
    } else {
        messages = input.messages;
        params = { ...input.params };  // 浅拷贝避免修改原对象
        
        // 处理百炼额外参数
        const extra_body: Record<string, any> = {};
        bailianExtraBody.forEach(key => {
            if (key in params) {  // 用 in 代替 hasOwnProperty 更简洁
                extra_body[key] = params[key];
                delete params[key];
            }
        });
        
        if (Object.keys(extra_body).length > 0) {
            params.extra_body = extra_body;
        }
    }
    return { messages, params };
}

// 非流式版本
async function chatNonStream(input: string | ChatMessage[] | ChatOptions): Promise<ChatResponse> {
    try {
        const { messages, params } = handleParams(input);
        const requestOptions: any = {
            model,
            messages,
            ...params
        };
        
        const response = await client.chat.completions.create(requestOptions);
        return { 
            content: response.choices?.[0]?.message?.content || '', 
            reasoning_content: (response.choices?.[0]?.message as any)?.reasoning_content || '' 
        };
    } catch (error) {
        console.error('LLM调用失败:', error);
        throw error;
    }
}

// 流式版本
async function chatStream(input: string | ChatMessage[] | ChatOptions, onChunk?: StreamCallback): Promise<ChatResponse> {
    try {
        const { messages, params } = handleParams(input);
        
        const stream = await client.chat.completions.create({
            model,
            messages,
            ...params,
            stream: true,
        });
        
        let fullContent = '';
        let fullReasoning = '';
        
        for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content || '';
            const reasoning = (chunk.choices?.[0]?.delta as any)?.reasoning_content || '';
            
            if (content && onChunk) {
                onChunk(content);
            }
            fullContent += content;
            fullReasoning += reasoning;
        }
        
        return { content: fullContent, reasoning_content: fullReasoning };
    } catch (error) {
        console.error('流式LLM调用失败:', error);
        throw error;
    }
}

const llmClient: LLMClient = {
    chat: async (input: string | ChatMessage[] | ChatOptions, onChunk?: StreamCallback): Promise<ChatResponse> => {
        // 判断是否为流式
        const isStreamMode = typeof onChunk === 'function' || 
                            (typeof input !== 'string' && !Array.isArray(input) && input.stream === true);
        
        if (isStreamMode) {
            return chatStream(input, onChunk);
        } else {
            return chatNonStream(input);
        }
    }
};

export default llmClient;