<template>
  <form @submit.prevent="handleSend" class="flex gap-3">
    <input
      v-model="inputContent"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      class="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
      @keydown.enter.exact.prevent="handleSend"
    />
    <button
      type="submit"
      :disabled="!inputContent.trim() || disabled"
      class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
    >
      {{ isLoading ? '思考中...' : '发送' }}
    </button>
  </form>
  <p class="text-xs text-gray-400 mt-2">按 Enter 发送</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  disabled?: boolean
  placeholder?: string
}>()

const emits = defineEmits<{
  send: [message: string]
}>()

const inputContent = defineModel<string>({ required: false, default: '' })
const isLoading = ref(false)

const handleSend = () => {
  if (!inputContent.value.trim() || props.disabled) return
  isLoading.value = true
  emits('send', inputContent.value.trim())
}
</script>
