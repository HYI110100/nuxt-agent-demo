import type { ServerResponse } from 'http';

/**
 * 写入标准SSE格式数据
 * @param res Node.js响应对象
 * @param data 要写入的数据
 */
export function writeSSE(res: ServerResponse, data: any): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * 写入错误格式的SSE数据
 * @param res Node.js响应对象
 * @param error 错误信息
 */
export function writeSSEError(res: ServerResponse, error: string): void {
  res.write(`data: ${JSON.stringify({ error })}\n\n`);
}

/**
 * 结束SSE连接
 * @param res Node.js响应对象
 */
export function endSSE(res: ServerResponse): void {
  res.end();
}
