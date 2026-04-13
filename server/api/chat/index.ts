import { H3Event, readBody } from 'h3';
import { writeSSEError, endSSE } from '../../utils/sse';

export default defineEventHandler(async (event: H3Event) => {
  // 读取请求体
  const body = await readBody(event);
  const { model, messages, apiKey, history = [], platformType } = body;

  try {

    // 设置SSE响应头
    event.node.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*' // 如需跨域
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
