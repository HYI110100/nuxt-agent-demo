<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <!-- Reasoning Section -->
    <div v-if="message.reasoningContent" class="border-b border-gray-100">
      <button
        @click="showReasoning = !showReasoning"
        class="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
      >
        <span class="text-xl">💭</span>
        <span class="text-sm font-medium text-gray-700">推理思考</span>
        <span class="ml-auto text-gray-400 transform transition-transform" :class="{ 'rotate-180': showReasoning }">▼</span>
      </button>
      <div v-show="showReasoning" class="px-4 pb-3 pt-0 text-sm text-gray-600 whitespace-pre-wrap">
        {{ message.reasoningContent }}
      </div>
    </div>

    <!-- Plans Section -->
    <div v-if="message.plans && message.plans.length > 0" class="border-b border-gray-100">
      <button
        @click="showPlans = !showPlans"
        class="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
      >
        <span class="text-xl">📋</span>
        <span class="text-sm font-medium text-gray-700">执行计划</span>
        <span class="ml-auto text-gray-400 transform transition-transform" :class="{ 'rotate-180': showPlans }">▼</span>
      </button>
      <div v-show="showPlans" class="px-4 pb-4 pt-2 space-y-2">
        <PlanItem
          v-for="plan in message.plans"
          :key="plan.id"
          :plan="plan"
          :tool-calls="getToolCallsForPlan(plan.id)"
          :tool-results="getToolResultsForPlan(plan.id)"
        />
      </div>
    </div>

    <!-- Final Response -->
    <div class="px-4 py-3 bg-gray-50">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xl">✅</span>
        <span class="text-sm font-medium text-gray-700">回答</span>
      </div>
      <div class="text-gray-800 whitespace-pre-wrap">
        {{ getFinalResponse() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PlanItem from './PlanItem.vue'

const props = defineProps<{
  message: any
}>()

const showReasoning = ref(false)
const showPlans = ref(false)

// Get tool calls for a specific plan
const getToolCallsForPlan = (planId: string): any[] => {
  if (!props.message.toolCalls || props.message.toolCalls.length === 0) return []
  return props.message.toolCalls.filter((tc: any) => tc.planId === planId)
}

// Get tool results for a specific plan
const getToolResultsForPlan = (planId: string): any[] => {
  if (!props.message.toolResults || props.message.toolResults.length === 0) return []
  return props.message.toolResults.filter((tr: any) => tr.planId === planId)
}

// Get final response content
const getFinalResponse = (): string => {
  // Priority: result.content > content field
  return props.message.result?.content || props.message.content || '没有返回内容'
}
</script>

<style scoped>
/* Optional custom styles */
</style>
