<template>
  <div>
    <h1>Hello World</h1>
    <p>当前时间: {{ currentTime }}</p>
    <button @click="updateTime">更新时间
    </button>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const currentTime = ref(new Date().toLocaleString())

onMounted(() => {
  updateTime()
})

const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}
</script>
