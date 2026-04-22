import { H3Event, readBody } from 'h3';
import { chatsDB, messagesDB } from '../../db/chat';
import { Agent } from '../../llm/agent';
import { gaodeDistrictTool } from '~/server/llm/tools/gaodeDistrict';
import { gaodeWeatherTool } from '~/server/llm/tools/gaodeWeather';
import { messageToOpenaiMessage } from '~/server/utils';
import llmClient from '~/server/llm/llmClient';
import { addUserMessage, createAssistantMessage, addPlanToAssistant, updatePlanStatus, incrementPlanToolCount, addToolCallToAssistant, addToolResultToAssistant, updateToolCallStatus, setAssistantResult, updateContent, getMessageById, addSystemMessage } from '../../db/services';
import { webSearchTool } from '~/server/llm/tools/webSearch';

export default defineEventHandler(async (event: H3Event) => {
	try {
		const chatId = getRouterParam(event, 'id') || '';
		if (!chatId) {
			throw createError({
				statusCode: 400,
				statusMessage: '缺少对话 ID',
			});
		}

		if (!chatsDB.has(chatId)) {
			throw new Error(`对话 ${chatId} 不存在`);
		}

		const body = await readBody(event);
		const input = body?.input || '';
		if (!input) {
			throw createError({
				statusCode: 400,
				statusMessage: 'input 参数不能为空',
			});
		}

		const isStream = body?.isStream || false;
		const conversationId = chatId;

		if (!messagesDB.has(conversationId)) {
			messagesDB.set(conversationId, []);
		}
		// 1. 添加用户输入消息
		addUserMessage(conversationId, input);
		// 2. 创建空的 assistant 消息
		let assistantMessage = createAssistantMessage(conversationId);

		// 追踪当前 plan
		let currentPlanId: string | null = null;

		const agent = new Agent({
			systemPrompt: '你是一个乐于助人的助手。',
			tools: [gaodeDistrictTool, gaodeWeatherTool, webSearchTool],
			llmClient: llmClient,
			getHistoryMessages: async () => messageToOpenaiMessage(messagesDB.get(conversationId) || []),
			onLoopEvent: (e) => {
				if (e.type === 'input') {
					// 用户输入事件
				}
				if (!(messagesDB.get(chatId)?.find(msg => msg.role === 'assistant' && msg.id === assistantMessage.id))) {
					messagesDB.get(conversationId)!.push(assistantMessage);
				}
				if (e.type === 'response') {
					updateContent(conversationId, assistantMessage.id, e.content, e.reasoning_content);
				}
				// 计划开始事件
				if (e.type === 'plan_start') {
					const { planId } = addPlanToAssistant(
						conversationId,
						assistantMessage.id,
						e.planDescription,
						e.mode,
						e.step
					);
					currentPlanId = planId;

					// 将计划描述写入 content
					assistantMessage = updateContent(conversationId, assistantMessage.id, e.planDescription);
				}

				// 工具调用事件
				if (e.type === 'tool_result') {
					// 先添加 toolCall 记录
					const { toolCallId } = addToolCallToAssistant(
						conversationId,
						assistantMessage.id,
						currentPlanId || '',
						e.index,
						e.toolName,
						e.params,
						e.status === 'success' ? 'completed' : 'failed'
					);

					// 再添加 toolResult 记录
					addToolResultToAssistant(
						conversationId,
						assistantMessage.id,
						currentPlanId || '',
						toolCallId,
						e.result,
						e.status
					);

					// 更新 toolCall 状态
					updateToolCallStatus(
						conversationId,
						assistantMessage.id,
						toolCallId,
						e.status === 'success' ? 'completed' : 'failed'
					);
					if(currentPlanId) {
						// Plan 的工具计数 +1
						incrementPlanToolCount(conversationId, assistantMessage.id, currentPlanId);
					}
				}

				// 计划完成事件
				if (e.type === 'plan_complete' && currentPlanId) {
					updatePlanStatus(conversationId, assistantMessage.id, currentPlanId, 'completed');
					currentPlanId = null;
				}

				// 最终结果事件
				if (e.type === 'result') {
					setAssistantResult(
						conversationId,
						assistantMessage.id,
						e.content,
						e.reasoning_content
					);
				}
			},
		});

		if (!messagesDB.get(chatId)?.find(msg => msg.role === 'system')) {
			addSystemMessage(chatId, agent.getSystemPrompt());
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
			await agent.chat(input);
			event.node.res.write(JSON.stringify(getMessageById(conversationId, assistantMessage.id)));
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
