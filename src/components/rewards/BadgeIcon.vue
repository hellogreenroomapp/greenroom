<template>
  <div
    class="relative inline-flex items-center justify-center"
    :class="sizeClasses"
    :title="tooltipText"
  >
    <span
      class="transition-opacity"
      :class="{
        'opacity-50 grayscale': tier === 0,
        'opacity-100': tier > 0,
      }"
    >
      {{ emoji }}
    </span>
    <div
      v-if="showTooltip && tooltipText"
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
    >
      {{ tooltipText }}
      <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { REWARD_CATEGORIES, getBadgeName, getProgressToNextTier } from '@/constants/badges'
import type { RewardCategory } from '@/types/rewards'

const props = withDefaults(
  defineProps<{
    category: string
    tier: number
    points?: number
    size?: 'sm' | 'md' | 'lg'
    showTooltip?: boolean
  }>(),
  {
    size: 'md',
    showTooltip: true,
  }
)

const emoji = computed(() => {
  return REWARD_CATEGORIES[props.category as RewardCategory]?.emoji || '🎉'
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-5 h-5 text-base',
    md: 'w-8 h-8 text-2xl',
    lg: 'w-12 h-12 text-4xl',
  }
  return sizes[props.size]
})

const tooltipText = computed(() => {
  if (props.tier === 0) {
    const progress = props.points !== undefined ? getProgressToNextTier(props.points) : null
    if (progress) {
      return `Locked - ${progress.current}/${progress.next} points to unlock`
    }
    return 'Locked'
  }
  
  const badgeName = getBadgeName(props.category as RewardCategory, props.tier)
  const progress = props.points !== undefined ? getProgressToNextTier(props.points) : null
  if (progress && progress.next > 0) {
    return `${badgeName} (Level ${props.tier}) - ${progress.current}/${progress.next} points to next level`
  }
  return `${badgeName} (Level ${props.tier})`
})
</script>
