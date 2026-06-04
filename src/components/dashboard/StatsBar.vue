<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div
      v-for="stat in computedStats"
      :key="stat.label"
      class="bg-card border border-border rounded-lg p-3 relative overflow-hidden flex flex-col"
      :style="stat.hasGradient ? `background: linear-gradient(135deg, ${stat.gradientStart} 0%, ${stat.gradientEnd} 100%); border: none;` : ''"
    >
      <!-- Decorative wave pattern for gradient cards -->
      <div
        v-if="stat.hasGradient"
        class="absolute bottom-0 left-0 right-0 h-16 opacity-10 bg-white/10"
        style="clip-path: polygon(0 100%, 100% 80%, 100% 100%, 0% 100%);"
      ></div>

      <div class="flex items-center justify-between relative z-10 flex-1">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium" :class="stat.hasGradient ? 'text-white/90' : 'text-muted'">{{ stat.label }}</p>
          <p class="text-2xl font-bold mt-0.5" :class="stat.hasGradient ? 'text-white' : 'text-text'">{{ stat.value }}</p>
        </div>
        <div
          class="w-10 h-10 rounded-full shadow-md flex items-center justify-center flex-shrink-0"
          :class="stat.hasGradient ? 'bg-white/20' : stat.color"
          :style="stat.hasGradient ? '' : 'opacity: 0.85;'"
        >
          <span class="text-lg">{{ stat.icon }}</span>
        </div>
      </div>

      <!-- Reserved row keeps cards equal height when Cleanup is available (pipeline) -->
      <div
        class="mt-1.5 flex items-center relative z-10"
        :class="showOverdueCleanup ? 'min-h-[26px]' : ''"
      >
        <button
          v-if="stat.label === 'Overdue' && showOverdueCleanup"
          type="button"
          class="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
          @click.stop="props.onCleanupClick"
        >
          <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Cleanup ({{ props.cleanupCount }})</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types'
import { isThisWeek, productHasGoLiveDate } from '@/utils/dates'

const props = defineProps<{
  products: Product[]
  cleanupCount?: number
  onCleanupClick?: () => void
}>()

const showOverdueCleanup = computed(
  () => !!(props.cleanupCount && props.cleanupCount > 0 && props.onCleanupClick)
)

const computedStats = computed(() => {
  const inPipeline = props.products.filter((p) => p.stage !== 'live').length

  const needShots = props.products.filter(
    (p) => p.stage === 'photo_queue' || p.stage === 'in_shoot'
  ).length

  const liveThisWeek = props.products.filter((p) => {
    return productHasGoLiveDate(p) && isThisWeek(p.goLiveDate!.toDate())
  }).length

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = props.products.filter((p) => {
    if (p.stage === 'live' || !productHasGoLiveDate(p)) return false
    return p.goLiveDate!.toDate() < today
  }).length

  return [
    {
      label: 'In Pipeline',
      value: inPipeline,
      icon: '📦',
      color: 'bg-brand-pipeline',
      hasGradient: true as const,
      gradientStart: '#10B981',
      gradientEnd: '#059669',
    },
    {
      label: 'Need Shots',
      value: needShots,
      icon: '📸',
      color: 'bg-brand-needShots',
      hasGradient: false as const,
      gradientStart: undefined,
      gradientEnd: undefined,
    },
    {
      label: 'Live This Week',
      value: liveThisWeek,
      icon: '📅',
      color: 'bg-brand-live',
      hasGradient: false as const,
      gradientStart: undefined,
      gradientEnd: undefined,
    },
    {
      label: 'Overdue',
      value: overdue,
      icon: '⚠️',
      color: 'bg-brand-overdue',
      hasGradient: false as const,
      gradientStart: undefined,
      gradientEnd: undefined,
    },
  ]
})
</script>
