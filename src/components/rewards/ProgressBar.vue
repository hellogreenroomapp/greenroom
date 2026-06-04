<template>
  <div class="flex items-center gap-2">
    <div class="flex-1 bg-gray-200 rounded-full overflow-hidden" :style="{ height: height }">
      <div
        class="h-full rounded-full transition-all duration-300"
        :style="{
          width: `${percentage}%`,
          backgroundColor: color,
          ...(current >= max ? { boxShadow: `0 0 8px ${color}` } : {}),
        }"
      ></div>
    </div>
    <span v-if="showLabel" :class="labelClass">{{ current }}/{{ max }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    current: number
    max: number
    color?: string
    size?: 'sm' | 'md'
    showLabel?: boolean
  }>(),
  {
    color: '#1B7F56',
    size: 'sm',
    showLabel: true,
  }
)

const percentage = computed(() => {
  if (props.max === 0) return 0
  return Math.min((props.current / props.max) * 100, 100)
})

const height = computed(() => {
  return props.size === 'sm' ? '6px' : '10px'
})

const labelClass = computed(() => {
  return props.size === 'sm' ? 'text-xs text-muted' : 'text-sm text-muted'
})
</script>
