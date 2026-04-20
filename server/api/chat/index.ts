import { H3Event } from 'h3';
import { chatsDB } from '../../db/chat';

export default defineEventHandler((event: H3Event) => {
	const allChats = Array.from(chatsDB.values());
	return allChats.sort((a, b) => b.id.localeCompare(a.id)); // 最新的在前面
});
