<template>
  <div class="border border-gray-200 rounded-md bg-white">
    <!-- Plan Header -->
    <button
      @click="showDetails = !showDetails"
      class="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
    >
      <!-- Step number -->
      <span class="text-xs font-medium text-gray-500 w-6">步骤 {{ plan.step }}</span>

      <!-- Description -->
      <span class="flex-1 text-sm text-gray-700 truncate">{{ plan.description }}</span>

      <!-- Mode badge -->
      <span
        class="text-xs px-2 py-0.5 rounded-full"
        :class="{
          'bg-blue-100 text-blue-700': plan.mode === 'parallel',
          'bg-purple-100 text-purple-700': plan.mode === 'serial',
          'bg-green-100 text-green-700': plan.mode === 'auto',
          'bg-gray-100 text-gray-700': plan.mode === 'manual',
        }"
      >
        {{ getModeLabel(plan.mode) }}
      </span>

      <!-- Status indicator -->
      <span
        class="text-xs px-2 py-0.5 rounded-full"
        :class="{
          'bg-green-100 text-green-700': plan.status === 'completed',
          'bg-yellow-100 text-yellow-700': plan.status === 'running',
          'bg-red-100 text-red-700': plan.status === 'failed',
        }"
      >
        {{ getStatusLabel(plan.status) }}
      </span>

      <!-- Tool count -->
      <span class="text-xs text-gray-400">
        {{ plan.toolCount }} tool{{ plan.toolCount !== 1 ? 's' : '' }}
      </span>

      <!-- Expand icon -->
      <span class="text-gray-400 transform transition-transform" :class="{ 'rotate-180': showDetails }">▶</span>
    </button>

    <!-- Tool Details (collapsed by default) -->
    <div v-if="showDetails && (toolCalls || toolResults)" class="px-3 pb-3 pt-0 pl-10 border-t border-gray-100">
      <div class="space-y-2 mt-2">
        <!-- Tool Call Cards -->
        <div
          v-for="tc in toolCalls"
          :key="tc.id"
          class="text-xs p-2 rounded bg-gray-50 border border-gray-100"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-gray-700">{{ tc.name }}</span>
            <span
              class="text-xs px-1.5 py-0.5 rounded"
              :class="{
                'bg-green-50 text-green-600': tc.status === 'completed',
                'bg-yellow-50 text-yellow-600': tc.status === 'running',
                'bg-red-50 text-red-600': tc.status === 'failed',
              }"
            >
              {{ tc.status === 'completed' ? '✓' : tc.status === 'running' ? '⋯' : '✗' }}
            </span>
          </div>
          <div v-if="tc.params" class="text-gray-500 font-mono whitespace-pre-wrap">
            {{ JSON.stringify(tc.params, null, 2) }}
          </div>
        </div>

        <!-- Tool Result Cards -->
        <div
          v-for="tr in toolResults"
          :key="tr.id"
          class="text-xs p-2 rounded bg-green-50 border border-green-100"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-green-700">Result</span>
            <span class="text-xs text-green-600">✓</span>
          </div>
          <div class="text-gray-600 font-mono whitespace-pre-wrap">
            {{ formatToolResult(tr.result) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{
  plan: any
  toolCalls?: any[]
  toolResults?: any[]
}>()

const showDetails = ref(false)

const getModeLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    parallel: '并行',
    serial: '串行',
    auto: '自动',
    manual: '手动',
  }
  return labels[mode] || mode
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    completed: '完成',
    running: '执行中',
    failed: '失败',
  }
  return labels[status] || status
}

const formatToolResult = (result: any): string => {
  if (typeof result === 'string') return result
  try {
    const str = JSON.stringify(result, null, 2)
    return str.length > 200 ? str.substring(0, 200) + '...' : str
  } catch {
    return String(result)
  }
}
</script>

<style scoped>
/* Optional custom styles */
</style>
