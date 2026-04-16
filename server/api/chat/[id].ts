import openai from 'openai';
import { H3Event, readBody } from 'h3';
import { messagesDB, chatsDB, toolCallsDB } from '../../db/chat';
import type { Message, ToolCall } from '../../db/chat';
import type { notStreamEvent } from '../../llm/agent/core/types';
import { Agent } from '../../llm/agent';
import { gaodeDistrictTool } from '~/server/llm/tools/gaodeDistrict';
import { gaodeWeatherTool } from '~/server/llm/tools/gaodeWeather';
import { messageToOpenaiMessage, buildSystemPrompt } from '~/server/utils';
import { v4 as uuidV4 } from 'uuid';
import { sendRequest, sendStreamRequest } from '~/server/llm/llmClient';

export default defineEventHandler(async (event: H3Event) => {
	const body = await readBody(event);
	const { input } = body;
	const chatId = getRouterParam(event, 'id') || '';
	try {
		if (!input || !chatId) {
			throw new Error('Missing required fields');
		}
		if (!chatsDB.has(chatId)) {
			throw new Error(`Chat ${chatId} not found`);
		}

		// 初始化新的消息表和工具调用表（如果不存在）
		if (!messagesDB.has(chatId)) {
			messagesDB.set(chatId, []);
		}
		if (!toolCallsDB.has(chatId)) {
			toolCallsDB.set(chatId, []);
		}

		const isStream = false;
		const messagesId = uuidV4();

		const agent = new Agent({
			llmClient: { sendRequest, sendStreamRequest },
			onLoopEvent: async (e) => {
				// 处理用户消息
				if (e.role === 'user') {
					const userMessage: Message = {
						id: e.id,
						messageId: messagesId,
						sessionId: chatId,
						role: 'user',
						content: e.content.type === 'question' ? e.content.text : `Error: ${e.content.message}`,
						toolCallIds: [],
						timestamp: Date.now(),
					};
					messagesDB.get(chatId)?.push(userMessage);
					return;
				}

				// 处理助手消息
				if (e.role === 'assistant') {
					if (e.content.type === 'response') {
						const assistantMessage: Message = {
							id: e.id,
							messageId: messagesId,
							sessionId: chatId,
							role: 'assistant',
							content: e.content.text || '',
							reasoning_content: e.content.reasoning || '',
							toolCallIds: [],
							timestamp: Date.now(),
						};
						messagesDB.get(chatId)?.push(assistantMessage);
					}
					return;
				}

				// 处理工具相关消息 - role === 'tool'
				if (e.role === 'tool') {
					if (e.content.type === 'tool_call') {
						// 添加工具调用记录
						const toolCall: ToolCall = {
							id: e.content.taskId,
							messageId: messagesId,
							sessionId: chatId,
							toolName: e.content.tool,
							params: e.content.params || {},
							status: 'pending',
							order: null,
							reasoning: e.content.reasoning,
							timestamp: Date.now(),
						};
						toolCallsDB.get(chatId)?.push(toolCall);

						// 更新父消息的 toolCallIds 引用
						const parentMsg = messagesDB.get(chatId)?.find(m => m.messageId === messagesId);
						if (parentMsg) {
							parentMsg.toolCallIds.push(toolCall.id);
						}
						return;
					}

					if (e.content.type === 'tool_result') {
						// 更新工具调用状态和结果
						const taskId = e.content.taskId
						const toolCall = toolCallsDB.get(chatId)?.find(tc => tc.id === taskId);
						if (toolCall) {
							toolCall.result = e.content.result;
							toolCall.status = 'completed';
						}
						return;
					}

					// if (e.content.type === 'error') {
					// 	const taskId = e.content.taskId
					// 	const toolCall = toolCallsDB.get(chatId)?.find(tc => tc.id === taskId);
					// 	if (toolCall) {
					// 		toolCall.status = 'error';
					// 	}
					// 	return;
					// }
				}
			},
			getMessages: () => messageToOpenaiMessage(messagesDB.get(chatId) || [], toolCallsDB.get(chatId)),

		})
		// 添加工具
		agent.addTool(gaodeDistrictTool);
		agent.addTool(gaodeWeatherTool);

		// 如果没有系统消息，添加系统提示词
		if (!(messagesDB.get(chatId)?.length)) {
			messagesDB.get(chatId)?.push({
				id: uuidV4(),
				messageId: uuidV4(),
				sessionId: chatId,
				role: 'system',
				content: buildSystemPrompt({ toolList: agent.getToolsDescription() }),
				reasoning_content: '',
				toolCallIds: [],
				timestamp: Date.now(),
			});
		}

		if (isStream) {
			// TODO: 实现流式请求逻辑
		} else {
			event.node.res.writeHead(200, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'Access-Control-Allow-Origin': '*'
			});
			const result = await agent.chat(input);
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
