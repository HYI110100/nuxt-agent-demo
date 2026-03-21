import { H3Event, readBody } from 'h3';
import { buildMessages } from '../../utils/llm/message-builder';
import { writeSSE, writeSSEError, endSSE } from '../../utils/sse';
import type { ChatRequest, SupportedPlatform } from '../../types/llm';
import { hasPlatform, platformMap } from '../../utils/llm/platforms';

export default defineEventHandler(async (event: H3Event) => {
  // 读取请求体
  const body = await readBody<ChatRequest>(event);
  const { model, messages, apiKey, history = [], platformType } = body;

  try {

    // 参数验证
    if (!model || !messages || !apiKey) {
      throw createError({ statusCode: 400, statusMessage: '缺少必要参数' });
    }

    // 验证平台类型是否存在
    if (!platformType || !hasPlatform(platformType)) {
      throw createError({ statusCode: 400, statusMessage: '平台未配置' });
    }

    // 选择平台
    let platform = new platformMap[platformType]({ apiKey, model });

    // 构建完整的消息数组
    const fullMessages = buildMessages(history, messages);

    // 设置SSE响应头
    event.node.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*' // 如需跨域
    });


    // 处理流式响应
    await platform.streamResponse(fullMessages, (chunk) => {
      if (chunk.error) {
        writeSSEError(event.node.res, `Stream failed: ${chunk.error}`);
      } else {
        writeSSE(event.node.res, chunk);
      }
    });
    endSSE(event.node.res);
    
  } catch (error: any) {
    if (event.node.res.headersSent) {
      // 理论上不会进入这里，但作为兜底
      writeSSEError(event.node.res, `Request failed: ${error.message}`);
      endSSE(event.node.res);
    } else {
      throw error // 让 Nuxt 处理正常 HTTP 错误
    }
  }
});
