import openai from 'openai';
import { H3Event, readBody } from 'h3';
import { messagesDB, chatsDB } from '../../db/chat';
import type { notStreamEvent } from '../../llm/agent/core/types';
import { Agent } from '../../llm/agent';
import { createGaodeDistrictTool } from '~/server/llm/tools/gaodeDistrict';
import { createGaodeWeatherTool } from '~/server/llm/tools/gaodeWeather';



export default defineEventHandler(async (event: H3Event) => {
	// 读取请求体
	const body = await readBody(event);
	const { inputMessage } = body;
	const chatId = getRouterParam(event, 'id') || '';
	try {
		if (!inputMessage || !chatId) {
			throw new Error('Missing required fields');
		}
		if (!chatsDB.has(chatId)) {
			//   throw new Error('Chat not found');
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
				sendRequest: (_agentMessage) => {
					return new Promise<notStreamEvent>((resolve, reject) => {
						const msg = (messagesDB.get(chatId) || []).map((msg) => ({
							role: msg.role,
							content: msg.content,
						}))
						client.chat.completions.create({
							model: model,
							messages: [...msg, ..._agentMessage],
							response_format: {
								type: 'json_object',
							},
						}).then((response: any) => {
							const reasoning = response.choices?.[0]?.message?.reasoning_content || ''
							try {
								const contentJSON = JSON.parse(response.choices?.[0]?.message?.content || '{}');
								// 要求大模型调用工具返回type设置为tool_call
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
				sendStreamRequest: (_agentMessage, onChunk) => {
					return new Promise<void>((resolve, reject) => {
						// TODO: 实现流式请求逻辑
					})
				}
			}
		})
		agent.addTool(createGaodeDistrictTool(process.env.GAODE_API_KEY || ''));
		agent.addTool(createGaodeWeatherTool(process.env.GAODE_API_KEY || ''));
		
		if (!(messagesDB.get(chatId)?.length)) {
			messagesDB.set(chatId, [{
				role: 'system',
				content: buildSystemPrompt({ toolList: agent.getToolsDescription() }),
				timestamp: Date.now(),
			}]);
		}
		messagesDB.set(chatId, [...messagesDB.get(chatId) || [], {
			role: 'user',
			content: inputMessage,
			timestamp: Date.now(),
		}]);
		if (isStream) {

		} else {
			const response = await agent.chat(inputMessage);
			// 设置SSE响应头
			event.node.res.writeHead(200, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'Access-Control-Allow-Origin': '*' // 如需跨域
			});
			event.node.res.write(JSON.stringify(response));
			event.node.res.end();
			return;
		}
	} catch (error: any) {
		if (event.node.res.headersSent) {

		} else {
			throw error // 让 Nuxt 处理正常 HTTP 错误
		}
	}
});
