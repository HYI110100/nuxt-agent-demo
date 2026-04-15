import openai from 'openai';
import { H3Event, readBody } from 'h3';
import { messagesDB, chatsDB } from '../../db/chat';
import type { notStreamEvent } from '../../llm/agent/core/types';
import { Agent } from '../../llm/agent';
import { createGaodeDistrictTool } from '~/server/llm/tools/gaodeDistrict';
import { createGaodeWeatherTool } from '~/server/llm/tools/gaodeWeather';
import { messageToOpenaiMessage } from '~/server/utils';
import { v4 as uuidV4 } from 'uuid';

export default defineEventHandler(async (event: H3Event) => {
	const body = await readBody(event);
	const { input } = body;
	const chatId = getRouterParam(event, 'id') || '';
	try {
		if (!input || !chatId) {
			throw new Error('Missing required fields');
		}
		if (!chatsDB.has(chatId)) {
			chatsDB.set(chatId, { id: chatId, title: '测试对话' });
			messagesDB.set(chatId, []);
		}

		const isStream = false;
		const model = process.env.MODEL_NAME || '';
		const apiKey = process.env.OPENAI_API_KEY || '';
		const baseURL = process.env.OPENAI_BASE_URL || '';

		const client = new openai({
			apiKey,
			baseURL,
		});

		const agent = new Agent({
			llmClient: {
				sendRequest: (messages) => {
					return new Promise<notStreamEvent>((resolve, reject) => {
						client.chat.completions.create({
							model: model,
							messages,
							response_format: {
								type: 'json_object',
							},
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
				},
				sendStreamRequest: (_messages, onChunk) => {
					return new Promise<void>((resolve, reject) => {
						// TODO: 实现流式请求逻辑
					})
				}
			},
			onLoopEvent: async (event, contextId) => {
				if (!contextId) {
					console.error('ContextId is empty');
					return
				}
				if (event.role === 'user') {
					messagesDB.get(chatId)?.push({
						id: event.id,
						role: 'user',
						event: {
							type: 'content',
							content: event.content.type === 'question' ? event.content.text : `Error: message ${event.content.message}, code ${event.content.code}.`,
						},
						timestamp: Date.now(),
					})
				}
				if (event.role === 'assistant') {
					messagesDB.get(chatId)?.push({
						id: event.id,
						parentId: contextId,
						role: 'assistant',
						event: {
							type: 'content',
							content: event.content.type === 'response' ? event.content.text : `Error: message ${event.content.message}, code ${event.content.code}.`,
							reasoning: event.content.type === 'response' ? event.content.reasoning : '',
						},
						timestamp: Date.now(),
					})
				}
				if (event.role === 'tool') {
					let eventContent: any
					if (event.content.type === 'tool_call') {
						eventContent = {
							type: 'tool_call',
							toolName: event.content.tool,
							content: JSON.stringify(event.content.params || {}),
							reasoning: event.content.reasoning,
							taskId: event.content.taskId,
						}
					} else if (event.content.type === 'tool_result') {
						eventContent = {
							type: 'tool_result',
							toolName: event.content.tool,
							content: event.content.result,
							reasoning: event.content.reasoning,
							taskId: event.content.taskId,
						}
					} else if (event.content.type === 'error') {
						eventContent = {
							type: 'error',
							message: `Error: message ${event.content.message}, code ${event.content.code}.`,
						}
					}
					if (!eventContent) {
						return
					}
					messagesDB.get(chatId)?.push({
						id: event.id,
						parentId: contextId,
						role: 'assistant',
						event: eventContent,
						timestamp: Date.now(),
					})
				}
			},
			getMessages: () =>  messageToOpenaiMessage(messagesDB.get(chatId) || []),

		})
		agent.addTool(createGaodeDistrictTool(process.env.GAODE_API_KEY || ''));
		agent.addTool(createGaodeWeatherTool(process.env.GAODE_API_KEY || ''));

		if (!(messagesDB.get(chatId)?.length)) {
			messagesDB.set(chatId, [{
				id: uuidV4(),
				role: 'system',
				event: {
					type: 'content',
					content: buildSystemPrompt({ toolList: agent.getToolsDescription() }),
				},
				timestamp: Date.now(),
			}]);
		}

		if (isStream) {
			// TODO: 实现流式请求逻辑
		} else {
			const result = await agent.chat(input);
			event.node.res.writeHead(200, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'Access-Control-Allow-Origin': '*'
			});
			event.node.res.write(JSON.stringify(result));
			event.node.res.end();
			return;
		}
	} catch (error: any) {
		if (event.node.res.headersSent) {

		} else {
			throw error
		}
	}
});
