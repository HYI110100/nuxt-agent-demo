import { BasePlatform } from '../base-platform';
import type { Message, StreamChunk, PlatformConfig } from '../../../types/llm';
interface ChatCompletionChunk {
  choices: Array<{
    delta: {
      content: string | null;
      reasoning_content: string | null;
    };
    finish_reason: string | null;
    index: number;
    logprobs: null;
  }>;
  object: string;
  usage: null;
  created: number;
  system_fingerprint: string | null;
  model: string;
  id: string;
}

/**
 * 阿里云百炼平台实现
 */
export class AliyunPlatform extends BasePlatform<ChatCompletionChunk> {
  constructor(config: PlatformConfig) {
    super({
      ...config,
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      path: '/chat/completions',
      timeout:  60000
    });
  }
  
  protected buildRequestBody(messages: Message[]): Record<string, any> {
    return {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: true
    };
  }

  protected parseChunk(chunk: Buffer): ChatCompletionChunk[] {
    const chunkStr = chunk.toString();
    const events = chunkStr.split('\n\n');
    const results: ChatCompletionChunk[] = [];

    for (const eventStr of events) {
      if (eventStr.trim()) {
        const dataMatch = eventStr.match(/^data: (.*)$/m);
        if (dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1]) as ChatCompletionChunk;
            results.push(data);
          } catch (error) {
            throw new Error(`解析响应数据失败: ${error}`);
          }
        }
      }
    }

    return results;
  }

  protected override parseEventData(data: ChatCompletionChunk): StreamChunk {
    const content = data.choices[0]?.delta?.content || '';
    const reasoningContent = data.choices[0]?.delta?.reasoning_content || '';
    const finishReason = data.choices[0]?.finish_reason || null;
    if (finishReason === 'stop') {
      return { done: true }
    }
    
    return { content, reasoningContent, finishReason };
  }
}
