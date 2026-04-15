<script setup lang="ts">
import { useLocalStorage } from '../composables/useLocalStorage'
import { ref } from 'vue'

const model = useLocalStorage('chat-model', '')
const apiKey = useLocalStorage('chat-apiKey', '')
const baseURL = useLocalStorage('chat-baseURL', '')
const inputMessage = useLocalStorage('chat-inputMessage', '')
const response = ref<any>(null)
const error = ref<string | null>(null)
const isLoading = ref(false)

const handleSubmit = async () => {
  error.value = null
  response.value = null

  if (!model.value || !apiKey.value || !baseURL.value || !inputMessage.value) {
    error.value = '请填写所有字段'
    return
  }

  isLoading.value = true

  try {
    const result = await fetch('/api/chat/1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.value,
        apiKey: apiKey.value,
        baseURL: baseURL.value,
        inputMessage: inputMessage.value,
      }),
    })
    response.value = await result.json()
  } catch (err: any) {
    error.value = err.message || '请求失败'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto p-4 max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">Chat API 测试</h1>

    <!-- 错误提示 -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
      {{ error }}
    </div>

    <!-- 请求表单 -->
    <div class="space-y-4 mb-6">
      <div>
        <label class="block text-sm font-medium mb-1">Model</label>
        <input
          v-model="model"
          type="text"
          placeholder="例如：gpt-4o-mini"
          class="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">API Key</label>
        <input
          v-model="apiKey"
          type="password"
          placeholder="输入你的 API Key"
          class="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Base URL</label>
        <input
          v-model="baseURL"
          type="text"
          placeholder="例如：https://api.openai.com/v1"
          class="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">消息内容</label>
        <textarea
          v-model="inputMessage"
          rows="4"
          placeholder="输入你要问的问题..."
          class="w-full px-3 py-2 border rounded"
        />
      </div>

      <button
        @click="handleSubmit"
        :disabled="isLoading"
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {{ isLoading ? '请求中...' : '发送' }}
      </button>
    </div>

    <!-- 响应展示 -->
    <div v-if="response" class="bg-gray-100 p-4 rounded overflow-auto max-h-96">
      <h2 class="font-semibold mb-2">响应结果：</h2>
      <pre class="whitespace-pre-wrap">{{ JSON.stringify(response, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.container {
  min-height: 100vh;
}
</style>
