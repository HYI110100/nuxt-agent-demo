import { H3Event, readBody } from 'h3';
import { chatsDB, messagesDB } from '../../db/chat';
import { v4 as uuidV4 } from 'uuid';
import { addUserMessage } from '../../db/services';

export default defineEventHandler(async (event: H3Event) => {
	try {
		// 1. 生成新的 chatId
		const chatId = `chat_${Date.now()}_${uuidV4().substring(0, 8)}`;
		const title = `新对话 ${new Date().toLocaleString()}`;
		// 2. 创建 chat 记录
		chatsDB.set(chatId, { id: chatId, title });

		// 3. 初始化 messagesDB
		messagesDB.set(chatId, []);

		return {
			success: true,
			chatId,
			title,
		};
	} catch (error: any) {
		console.error('Create chat error:', error);
		throw createError({
			statusCode: 500,
			statusMessage: error.message || '创建对话失败',
		});
	}
});
