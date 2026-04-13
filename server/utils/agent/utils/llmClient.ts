import OpenAI from 'openai';
type ChatCompletionCreateParamsBase = OpenAI.ChatCompletionCreateParams;
type ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;
type DefaultParams = Partial<Omit<ChatCompletionCreateParamsBase, 'messages'>>

export class LLMClient {
    private baseURL: string;
    private apiKey: string;
    public defaultParams: DefaultParams = {
        model: 'gpt-3.5-turbo',
    };
    private client: OpenAI;

    constructor(config: { apiKey: string, baseURL: string, params?: DefaultParams }) {
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL;
        this.client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });
        this.defaultParams = config.params ? JSON.parse(JSON.stringify(config.params)) : this.defaultParams;
    }

    // 普通调用
    async chat(messages: ChatCompletionMessageParam[], params?: DefaultParams) {
        const response = await this.client.chat.completions.create({
            messages: messages,
            model: this.defaultParams.model!,
            ...this.defaultParams,
            ...(params || {}),
        });
        return response;
    }

    // 流式调用
    async chatStream(messages: ChatCompletionMessageParam[], options: { params?: DefaultParams, onChunk: (chunk: string) => void }) {
        const { onChunk, params } = options;
        const stream = await this.client.chat.completions.create({
            messages: messages,
            model: this.defaultParams.model!,
            ...this.defaultParams,
            ...(params || {}),
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) onChunk(content);
        }
    }
}