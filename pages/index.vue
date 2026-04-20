<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-6">
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-3">AI 助手</h1>
        <p class="text-gray-600">开始提问吧～</p>
      </div>

      <!-- Chat Input -->
      <ChatInput v-model="inputContent" :disabled="isLoading" @send="handleNewChatSend" placeholder="输入你的问题..." />

      <!-- Loading state during creation -->
      <div v-if="isLoading && !chatId" class="flex justify-center mt-4 text-gray-500">
        <div class="animate-pulse">正在创建对话...</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { sharedState } from '../utils/state'

const router = useRouter()

const inputContent = ref('')
const isLoading = ref(false)
const chatId = ref<string>('')

// Send message to create a new chat and redirect to chat page
const handleNewChatSend = async (message: string) => {
  if (!message.trim() || isLoading.value) return

  const content = message.trim()
  inputContent.value = ''
  isLoading.value = true

  try {
    // Create new chat with first message
    const res = await fetch('/api/chat/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    chatId.value = data.chatId

    // Store initial message in shared state for the next page to consume
    sharedState.initialMessage = content

    // Navigate to the new chat page
    setTimeout(() => {
      router.push(`/chat/${data.chatId}`)
    }, 500)
  } catch (error) {
    console.error('Create new chat error:', error)
    alert('创建对话失败，请重试')
    isLoading.value = false
    inputContent.value = content // Restore the input on error
  }
}
</script>
