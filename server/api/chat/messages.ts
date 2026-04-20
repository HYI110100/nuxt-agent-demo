import { H3Event, readBody } from 'h3';
import { chatsDB, messagesDB } from '../../db/chat';

export default defineEventHandler(async (event: H3Event) => {
	const body = await readBody(event);
	const chatId = body?.chatId || '';

	if (!chatId) {
		throw createError({
			statusCode: 400,
			statusMessage: '缺少对话 ID',
		});
	}

	if (!chatsDB.has(chatId)) {
		throw createError({
			statusCode: 404,
			statusMessage: `对话 ${chatId} 不存在`,
		});
	}

	const messages = messagesDB.get(chatId) || [];
	return messages.sort((a, b) => b.timestamp - a.timestamp);
});
