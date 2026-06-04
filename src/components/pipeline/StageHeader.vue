<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-2">
      <div
        class="w-3 h-3 rounded-full"
        :style="{ backgroundColor: color }"
      ></div>
      <h3 class="text-sm font-semibold text-text">{{ stageLabel }}</h3>
    </div>
    <span class="px-2 py-1 text-xs font-medium bg-bg text-muted rounded">
      {{ count }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types'
import { STAGE_LABELS } from '@/types'

const props = defineProps<{
  stage: Product['stage']
  count: number
  color?: string
}>()

const stageLabel = computed(() => STAGE_LABELS[props.stage])
</script>
