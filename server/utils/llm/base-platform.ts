import axios from 'axios';
import type { Message, StreamChunk, PlatformConfig } from '../../types/llm';

/**
 * 基础平台抽象类
 * 提供SSE流式响应的完整处理流程
 */
export abstract class BasePlatform<T> {
  protected apiKey: string;
  protected baseUrl: string;
  protected path: string;
  protected model: string;
  protected timeout: number;
  protected abortController: AbortController | null = null;

  constructor(config: PlatformConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || '';
    this.path = config.path || '';
    this.model = config.model;
    this.timeout = config.timeout || 60000;
  }

  /**
   * 构建请求头
   */
  protected buildHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 构建请求URL
   */
  protected buildRequestUrl(): string {
    return this.baseUrl + (this.path || '');
  }

  
  /**
   * 构建请求体
   */
  protected abstract buildRequestBody(messages: Message[]): Record<string, any>;

  /**
   * 解析原始数据块
   */
  protected abstract parseChunk(chunk: Buffer): T[];

  /**
   * 解析单个事件数据
   * 子类必须实现
   */
  protected abstract parseEventData(data: T): StreamChunk;

  /**
   * 发送请求并返回响应流
   */
  protected async sendRequest(messages: Message[]): Promise<any> {
    try {
      // 创建新的AbortController实例
      this.abortController = new AbortController();

      const response = await axios.post(
        this.buildRequestUrl(),
        this.buildRequestBody(messages),
        {
          headers: this.buildHeaders(),
          responseType: 'stream',
          timeout: this.timeout,
          signal: this.abortController.signal
        }
      );

      return response;

    } catch (error: any) {
      // 如果是取消错误，不抛出异常
      if (error.name === 'CanceledError') {
        return null;
      }
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  /**
   * 取消请求
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
  cancelAbort(): void {
    this.abortController = null;
  }
  
  /**
   * 完整的流式处理流程
   */
  async streamResponse(messages: Message[], onChunk: (chunk: StreamChunk) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sendRequest(messages)
        .then(response => {
          response.data.on('data', (chunk: Buffer) => {
            const events = this.parseChunk(chunk);

            for (const event of events) {
              const parsedChunk = this.parseEventData(event);
              onChunk(parsedChunk);
              if (parsedChunk.done || parsedChunk.error) {
                this.cancelAbort();
                resolve();
                break;
              }
            }
          });

          response.data.on('end', () => {
            onChunk({ done: true });
            this.cancelAbort();
            resolve();
          });

          response.data.on('error', (error: any) => {
            onChunk({ error: error.message });
            this.cancelAbort();
            reject(error);
          });
        })
        .catch(error => {
          this.cancelAbort();
          reject(error);
        });
    });
  }

  /**
   * 发送非流式请求
   */
  // async sendNonStreamRequest(messages: Message[]): Promise<any> {
  //   try {
  //     // 创建新的AbortController实例
  //     this.abortController = new AbortController();

  //     const response = await axios.post(
  //       this.buildRequestUrl(),
  //       {
  //         ...this.buildRequestBody(messages),
  //         stream: false
  //       },
  //       {
  //         headers: this.buildHeaders(),
  //         timeout: this.timeout,
  //         signal: this.abortController.signal
  //       }
  //     );
  //     return response.data;
  //   } catch (error: any) {
  //     // 如果是取消错误，不抛出异常
  //     if (error.name === 'CanceledError') {
  //       return null;
  //     }
  //     throw new Error(`Request failed: ${error.message}`);
  //   }
  // }
}
