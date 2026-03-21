<template>
  <div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
    <!-- 主体内容 - 左右布局 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧配置区域 -->
      <div class="w-72 border-r border-gray-200 bg-white p-6 overflow-y-auto">
        <h1 class="text-3xl font-semibold text-gray-800 mb-8">AI 对话演示</h1>
        <h2 class="text-xl font-semibold text-gray-800 mb-4">配置设置</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
            <input v-model="config.model" type="text"
              class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input v-model="config.apiKey" type="password"
              class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">平台</label>
            <select v-model="config.platform"
              class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择平台</option>
              <option v-for="platform in platforms" :key="platform.value" :value="platform.value">
                {{ platform.label }}
              </option>
            </select>
          </div>
          <button @click="saveConfig"
            class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
            保存配置
          </button>
        </div>
      </div>

      <!-- 右侧对话区域 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 对话内容 -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="space-y-4">
            <!-- 对话消息将在这里动态添加 -->
            <div v-for="(message, index) in messages" :key="index" class="flex flex-col"
              :class="message.role === 'user' ? 'items-end' : ''">

              <!-- 状态提示 -->
              <div v-if="message.status === 'error'" class="text-red-500 text-sm mb-1">
                × 发送错误：{{ message.error }}
              </div>
              <div
                v-else-if="message.status === 'loading' || message.status === 'reasoning' || message.status === 'content'"
                class="text-gray-400 text-sm mb-1">
                {{ message.status === 'loading' ? '加载中...' : '思考中...' }}
              </div>
              <!-- 消息内容 -->
              <div class="max-w-8/10">
                <div :class="message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'"
                  class="text-gray-800 rounded-lg px-4 py-2">
                  <ChatMarkdown :content="message.content" />
                </div>
              </div>
              <!-- 消息时间戳 -->
              <div v-if="message.timestamp" class="text-xs text-gray-400 mt-1">
                {{ message.timestamp }}
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="border-t border-gray-200 p-6 bg-white">
          <div class="flex flex-col gap-2">
            <textarea v-model="inputMessage" placeholder="请输入你的问题..."
              class="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              :disabled="isLoading"></textarea>
            <div class="flex justify-end gap-2">
              <button @click="sendMessage"
                class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                :disabled="isLoading">
                {{ isLoading ? '发送中...' : '发送' }}
              </button>
              <button v-if="isLoading" @click="abortRequest"
                class="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors">
                中断
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ChatMarkdown from '../components/ChatMarkdown.vue'

// 存储对话消息
interface Message {
  content?: string;
  reasoningContent?: string;
  role: 'user' | 'assistant';
  status?: 'loading' | 'error' | 'done' | 'interrupted' | 'reasoning' | 'content';
  error?: string;
  collapsed?: boolean;
  timestamp?: string;
}

const messages = ref<Message[]>([]);
// 存储用户输入
const inputMessage = ref('');
// 存储配置信息
const config = ref({
  model: '',
  apiKey: '',
  platform: ''
});
// 存储平台列表
const platforms = ref<{ value: string; label: string }[]>(
  []);
// 存储AI回复状态
const isLoading = ref(false);
// 存储AbortController实例，用于中断请求
const abortController = ref<AbortController | null>(null);

// 获取平台列表
const fetchPlatforms = async () => {
  try {
    const response = await fetch('/api/platforms');
    if (response.ok) {
      platforms.value = await response.json();
    }
  } catch (error) {
    console.error('获取平台列表失败:', error);
  }
};
function formatTimestamp() {

  // 获取当前时间戳（毫秒）
  const baseTimestamp = Date.now();

  // // 自定义间隔（毫秒），例如：5000 表示5秒后，60000 表示1分钟后
  // const intervalMs = 6000000000; // 修改这个数字来测试不同时间间隔

  // 计算新时间戳
  const newTimestamp = baseTimestamp

  // 格式化为中文日期时间字符串
  const formattedTime = new Date(newTimestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-');
  return formattedTime;
}
// 页面加载时从本地存储加载配置
onMounted(async () => {
  const savedConfig = localStorage.getItem('ai-chat-config');
  if (savedConfig) {
    config.value = JSON.parse(savedConfig);
  }
  // 加载平台列表
  await fetchPlatforms();
});

// 保存配置到本地存储
const saveConfig = () => {
  localStorage.setItem('ai-chat-config', JSON.stringify(config.value));
  alert('配置已保存！');
};

// 发送消息函数
const sendMessage = async () => {
  if (inputMessage.value.trim() === '') return;

  // 检查API Key是否设置
  if (!config.value.apiKey) {
    alert('请先设置API Key！');
    return;
  }

  // 添加用户消息
  messages.value.push({
    content: inputMessage.value,
    role: 'user',
    status: 'done',
    timestamp: formatTimestamp()
  });

  // 清空输入框
  const userMessage = inputMessage.value;
  inputMessage.value = '';

  // 标记为加载中
  isLoading.value = true;

  // 创建AbortController实例
  abortController.value = new AbortController();

  // 添加AI回复占位
  const aiMessageIndex = messages.value.length;
  messages.value.push({
    content: '',
    reasoningContent: '',
    role: 'assistant',
    status: 'loading',
    collapsed: true
  });

  try {
    // 构建历史对话
    const history = messages.value.slice(0, -1).map(msg => ({
      role: msg.role,
      content: `${msg.content || ''}
      <MessageMetadata  timestamp="${msg.timestamp || ''}" />
      `
    }));

    // 调用后端API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: abortController.value.signal,
      body: JSON.stringify({
        model: config.value.model,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ],
        apiKey: config.value.apiKey,
        history: history,
        platformType: config.value.platform
      })
    });

    if (!response.ok) {
      throw new Error('API调用失败');
    }

    // 处理SSE流
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.substring(6);
              const data = JSON.parse(dataStr);
              if (data.done) {
                // 流结束
                done = true;
                messages.value[aiMessageIndex].status = 'done';
                break;
              }
              if (data.error) {
                throw new Error(data.error);
              }
              if (!messages.value[aiMessageIndex].timestamp) {              // 更新消息时间戳
                messages.value[aiMessageIndex].timestamp = formatTimestamp()
              }

              if (data.content) {
                messages.value[aiMessageIndex].content += data.content;
                messages.value[aiMessageIndex].status = 'content';
              }
              if (data.reasoningContent) {
                messages.value[aiMessageIndex].reasoningContent += data.reasoningContent;
                messages.value[aiMessageIndex].status = 'reasoning';
              }
            } catch (error) {
              console.error('解析SSE数据失败:', error);
            }
          }
        }
      }
    }
  } catch (error: any) {
    // 检查是否是中断错误
    if (error.name === 'AbortError') {
      messages.value[aiMessageIndex].status = 'interrupted';
    } else {
      messages.value[aiMessageIndex].status = 'error';
      messages.value[aiMessageIndex].error = error.message || '未知错误';
    }
  } finally {
    // 标记加载完成
    isLoading.value = false;
    // 重置AbortController
    abortController.value = null;
  }
};

// 中断请求函数
const abortRequest = () => {
  if (abortController.value) {
    abortController.value.abort();
  }
};
</script>

<style scoped>
/* 可以在这里添加自定义样式 */
</style>