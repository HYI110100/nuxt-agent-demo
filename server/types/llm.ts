// 支持的平台类型
export type SupportedPlatform = 'aliyun'

// 消息接口
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  arguments?: string;
}

// 聊天请求接口
export interface ChatRequest {
  model: string;
  messages: Message[];
  apiKey: string;
  history?: Message[];
  platformType?: SupportedPlatform;
}

// 流式响应数据格式
export interface StreamChunk {
  content?: string;
  reasoningContent?: string;
  finishReason?: string | null;
  done?: boolean;
  error?: string;
}

// 平台配置接口
export interface PlatformConfig {
  apiKey: string;
  baseUrl?: string;
  path?: string;
  model: string;
  timeout?: number;
}
