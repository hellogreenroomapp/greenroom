<template>
  <div class="bg-card border border-border rounded-lg p-4 flex flex-col h-full">
    <h3 class="text-lg font-semibold text-text mb-4">Pipeline Distribution</h3>
    <div class="space-y-3 flex-1">
      <div
        v-for="stage in PIPELINE_STAGES"
        :key="stage"
        class="flex items-center gap-3"
      >
        <div class="flex-shrink-0 w-24">
          <span class="text-xs font-medium text-text">{{ STAGE_LABELS[stage] }}</span>
        </div>
        <div class="flex-1 h-6 bg-bg rounded-full overflow-hidden relative">
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{ 
              width: `${getPercentage(stage)}%`,
              backgroundColor: STAGE_COLORS[stage] || '#6B7280'
            }"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-xs font-semibold text-text">{{ getCount(stage) }}</span>
          </div>
        </div>
        <div class="flex-shrink-0 w-12 text-right">
          <span class="text-xs text-muted">{{ getPercentage(stage).toFixed(0) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/types'
import { STAGE_COLORS } from '@/constants/stageColors'

const props = defineProps<{
  products: Product[]
}>()

const totalProducts = computed(() => props.products.length)

function getCount(stage: Product['stage']): number {
  return props.products.filter(p => p.stage === stage).length
}

function getPercentage(stage: Product['stage']): number {
  if (totalProducts.value === 0) return 0
  return (getCount(stage) / totalProducts.value) * 100
}
</script>
