import openai from "openai";
import type { notStreamEvent } from "./agent/core/types";

const model = process.env.MODEL_NAME || '';
const apiKey = process.env.OPENAI_API_KEY || '';
const baseURL = process.env.OPENAI_BASE_URL || '';
const client = new openai({
    apiKey,
    baseURL,
});

export function sendRequest(messages: any[]) {
    return new Promise<notStreamEvent>((resolve, reject) => {
        client.chat.completions.create({
            model: model,
            messages,
            response_format: {  type: 'json_object' },
        }).then((response: any) => {
            const reasoning = response.choices?.[0]?.message?.reasoning_content || ''
            try {
                const contentJSON = JSON.parse(response.choices?.[0]?.message?.content || '{}');
                if (contentJSON.type === 'tool_call') {
                    resolve({
                        type: 'tool_call',
                        reasoning,
                        response: {
                            tool: contentJSON.tool || '',
                            params: contentJSON.params || {},
                        },
                    })
                    return;
                }
                resolve({
                    type: 'response',
                    reasoning,
                    response: contentJSON?.text || '',
                })
            } catch (error) {
                reject({
                    type: 'error',
                    reasoning,
                    response: {
                        code: 'JSON_PARSE_ERROR',
                        message: 'Failed to parse JSON response',
                    },
                });
            }
        }).catch((err) => {
            reject({
                type: 'error',
                reasoning: '',
                response: {
                    code: 'OPENAI_ERROR',
                    message: err.message,
                },
            });
        });
    })
}
export function sendStreamRequest(messages: any[], onChunk: (chunk: any) => void) {
    return new Promise<void>((resolve, reject) => {
       
    })
}