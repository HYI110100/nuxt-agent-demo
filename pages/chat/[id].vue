<template>
  <div class="h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <aside :class="['w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 transform md:relative md:translate-x-0 transition-transform duration-300 z-30', sidebarOpen ? 'translate-x-0' : '-translate-x-full']">
      <div class="p-4 border-b border-gray-200">
        <button @click="createNewChat" :disabled="isLoading" class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors">
          <span>+</span> 新对话
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <div v-if="chatList.length === 0" class="text-gray-400 text-sm text-center py-8">暂无历史对话</div>
        <div v-for="chat in chatList" :key="chat.id" @click="selectChat(chat.id)" :class="['p-3 rounded-md cursor-pointer transition-colors mb-1', currentChatId === chat.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100']">
          <div class="text-sm truncate">{{ chat.title }}</div>
        </div>
      </div>
    </aside>

    <!-- Main Chat Area -->
    <main class="flex-1 flex flex-col min-w-0" @beforeunload="handleBeforeUnload">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button @click="toggleSidebar" class="md:hidden text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <h1 class="text-xl font-semibold text-gray-800">AI 助手</h1>
      </header>

      <!-- Messages Container -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 min-h-0">
        <div v-if="isLoading && messages.length === 0" class="flex items-center justify-center h-full text-gray-400">
          <div class="animate-pulse">加载中...</div>
        </div>
        <div v-else-if="messages.length === 0" class="flex items-center justify-center h-full text-gray-400">
          <div class="text-center"><p class="text-lg mb-2">开始与 AI 对话吧</p><p class="text-sm">输入问题，让我来帮你解答</p></div>
        </div>
        <div v-else class="space-y-6 max-w-4xl mx-auto">
          <template v-for="msg in messages" :key="msg.id">
            <div v-if="msg.role === 'user'" class="flex justify-end animate-slide-in">
              <div class="bg-indigo-600 text-white px-4 py-3 rounded-lg max-w-xl">{{ msg.content }}</div>
            </div>
            <div v-else-if="msg.role === 'assistant'" class="flex justify-start animate-slide-in">
              <AssistantMessageCard :message="msg" />
            </div>
          </template>
          <div v-if="isLoading" class="flex justify-start animate-slide-in">
            <div class="bg-gray-100 px-4 py-3 rounded-lg">
              <div class="flex gap-2"><span class="animate-pulse">●</span><span class="animate-pulse delay-100">●</span><span class="animate-pulse delay-200">●</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Bar -->
      <div class="border-t border-gray-200 bg-white p-4">
        <ChatInput v-model="inputContent" :disabled="isLoading || !currentChatId" @send="sendMessage" placeholder="输入你的问题..." />
      </div>
    </main>

    <!-- Overlay for mobile sidebar -->
    <div v-if="sidebarOpen" @click="sidebarOpen = false" class="fixed inset-0 bg-black/20 z-20 md:hidden"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sharedState } from '../../utils/state'

const route = useRoute()
const router = useRouter()
const messagesContainer = ref<HTMLDivElement | null>(null)

// State
const currentChatId = ref<string>('')
const chatList = ref<Array<{ id: string; title: string }>>([])
const messages = ref<any[]>([])
const inputContent = ref('')
const isLoading = ref(false)
const sidebarOpen = ref(false)

// Handle browser close/refresh when loading
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isLoading.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// Fetch chat list
const fetchChatList = async () => {
  try {
    const res = await fetch('/api/chat')
    if (res.ok) {
      chatList.value = await res.json()
    }
  } catch (error) {
    console.error('Failed to fetch chat list:', error)
  }
}

// Load messages for a specific chat
const loadMessages = async (chatId: string) => {
  try {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId }),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (error) {
    console.error('Failed to load messages:', error)
  }
  return []
}

// Create new chat via API and redirect
const createNewChat = async () => {
  try {
    const res = await fetch('/api/chat/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) throw new Error('创建失败')

    const data = await res.json()
    router.push(`/chat/${data.chatId}`)
  } catch (error) {
    console.error('Create new chat error:', error)
  }
}

// Select a chat from sidebar - navigates to new page
const selectChat = (chatId: string) => {
  router.push(`/chat/${chatId}`)
}

// Scroll to bottom when messages change
onMounted(() => {
  const observer = new MutationObserver(() => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  })

  if (messagesContainer.value) {
    observer.observe(messagesContainer.value, { childList: true, subtree: true })
  }
})

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

// Main initialization logic
onMounted(async () => {
  // Get chatId from route
  const { id } = route.params
  if (!id || typeof id !== 'string') {
    return
  }

  currentChatId.value = id

  // Always fetch chat list
  await fetchChatList()

  // Load historical messages for this chat
  const historicalMessages = await loadMessages(id)
  messages.value = [...historicalMessages]

  // Check if there's an initial message from shared state (from index page)
  if (sharedState.initialMessage) {
    // Append the user message first
    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: sharedState.initialMessage,
      timestamp: Date.now(),
    }
    messages.value.push(userMsg)

    // Clear shared state
    sharedState.initialMessage = ''

    // Auto-send the message
    isLoading.value = true
    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userMsg.content }),
      })

      if (res.ok) {
        const assistantMsg = await res.json()
        messages.value.push(assistantMsg)
      }
    } catch (error) {
      console.error('Auto-send error:', error)
    } finally {
      isLoading.value = false
    }
  }
})

// Send message to current chat
const sendMessage = async () => {
  if (!inputContent.value.trim() || isLoading.value || !currentChatId.value) return

  const content = inputContent.value.trim()
  inputContent.value = ''

  isLoading.value = true
  try {
    // Add user message locally
    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: content,
      timestamp: Date.now(),
    }
    messages.value.push(userMsg)

    // Send to API
    const res = await fetch(`/api/chat/${currentChatId.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: content }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // Append assistant response
    const data = await res.json()
    messages.value.push(data)
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({
      id: `err_${Date.now()}`,
      role: 'assistant',
      content: `发送失败：${error instanceof Error ? error.message : '未知错误'}`,
      timestamp: Date.now(),
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-in { animation: slideIn 0.3s ease-out; }
</style>
