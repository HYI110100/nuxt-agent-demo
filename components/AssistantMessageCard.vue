<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <!-- Reasoning Section -->
    <div v-if="message.reasoningContent" class="border-b border-gray-100">
      <button
        @click="toggleDetailPanel"
        class="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        <span class="text-xl">💭</span>
        <span class="text-sm font-medium text-gray-700">推理思考（详情在右侧）</span>
        <span class="ml-auto text-gray-400 text-xs">(展开)</span>
      </button>
    </div>

    <!-- Plans Section -->
    <div v-if="message.plans && message.plans.length > 0" class="border-b border-gray-100">
      <button
        @click="toggleDetailPanel"
        class="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        <span class="text-xl">📋</span>
        <span class="text-sm font-medium text-gray-700">执行计划（{{ message.plans.length }}项）</span>
        <span class="ml-auto text-gray-400 text-xs">(详情在右侧)</span>
      </button>
    </div>

    <!-- Final Response -->
    <div class="px-4 py-3 bg-gray-50">
      <ChatMarkdown :content="getFinalResponse()" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatMarkdown from './ChatMarkdown.vue'

const props = defineProps<{
  message: any
}>()

// Toggle detail panel on parent page
const emit = defineEmits<{
  togglePanel: [show: boolean, msg: any]
}>()

// Get final response content
const getFinalResponse = (): string => {
  // Priority: result.content > content field
  return props.message.result?.content || props.message.content || '没有返回内容'
}

const toggleDetailPanel = () => {
  emit('togglePanel', true, props.message)
}
</script>

<style scoped>
/* Optional custom styles */
</style>
