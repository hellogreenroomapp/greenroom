<template>
  <div class="animate-pulse">
    <div
      v-if="type === 'card'"
      class="bg-card border border-border rounded-lg p-4"
    >
      <div class="h-4 bg-bg rounded w-3/4 mb-3"></div>
      <div class="h-3 bg-bg rounded w-1/2"></div>
    </div>
    <div
      v-else-if="type === 'product-card'"
      class="bg-card border border-border rounded-lg p-3"
    >
      <div class="h-32 bg-bg rounded mb-2"></div>
      <div class="h-4 bg-bg rounded w-3/4 mb-2"></div>
      <div class="h-3 bg-bg rounded w-1/2"></div>
    </div>
    <div
      v-else-if="type === 'table-row'"
      class="flex items-center gap-4 py-3 border-b border-border"
    >
      <div class="h-4 bg-bg rounded w-1/4"></div>
      <div class="h-4 bg-bg rounded w-1/4"></div>
      <div class="h-4 bg-bg rounded w-1/4"></div>
      <div class="h-4 bg-bg rounded w-1/4"></div>
    </div>
    <div
      v-else
      class="h-4 bg-bg rounded"
      :class="widthClass"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type?: 'card' | 'product-card' | 'table-row' | 'text'
    width?: string
  }>(),
  {
    type: 'text',
    width: 'w-full',
  }
)

const widthClass = computed(() => {
  if (props.width) return props.width
  return 'w-full'
})
</script>
