<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div
      v-for="category in categories"
      :key="category.key"
      class="p-4 rounded-lg border"
      :class="{
        'bg-card border-border': category.tier > 0,
        'bg-bg border-border opacity-50': category.tier === 0,
      }"
    >
      <div class="flex flex-col items-center text-center space-y-2">
        <BadgeIcon
          :category="category.key"
          :tier="category.tier"
          :points="category.points"
          size="lg"
          :show-tooltip="false"
        />
        <div class="text-sm font-medium text-text">{{ category.label }}</div>
        <div class="text-xs font-semibold" :class="category.tier > 0 ? 'text-text' : 'text-muted'">
          {{ category.tier > 0 ? category.badgeName : 'Locked' }}
        </div>
        <ProgressBar
          :current="category.progress.current"
          :max="category.progress.next"
          :show-label="true"
          size="sm"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UserRewards } from '@/types/rewards'
import { REWARD_CATEGORIES, getBadgeName, getProgressToNextTier, getTierForPoints } from '@/constants/badges'
import BadgeIcon from './BadgeIcon.vue'
import ProgressBar from './ProgressBar.vue'

const props = defineProps<{
  rewards: UserRewards
}>()

const categories = computed(() => {
  return Object.entries(REWARD_CATEGORIES).map(([key, info]) => {
    const points = props.rewards.points[key as keyof typeof props.rewards.points]
    const tier = getTierForPoints(points)
    const progress = getProgressToNextTier(points)
    
    return {
      key,
      label: info.label,
      emoji: info.emoji,
      tier,
      points,
      badgeName: tier > 0 ? getBadgeName(key as any, tier) : 'Locked',
      progress: {
        current: progress.current,
        next: progress.next,
      },
    }
  })
})
</script>
