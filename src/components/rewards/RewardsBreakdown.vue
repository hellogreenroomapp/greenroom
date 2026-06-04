<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-lg font-semibold text-text mb-1">Rewards & Badges</h3>
      <p class="text-sm text-muted">Track your progress across all reward categories</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1B7F56]"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="category in categories"
        :key="category.key"
        class="p-4 rounded-lg border transition-colors"
        :class="{
          'bg-card border-border': category.tier > 0,
          'bg-bg border-border opacity-60': category.tier === 0,
        }"
      >
        <div class="flex items-start gap-4">
          <!-- Badge Icon -->
          <div class="flex-shrink-0">
            <BadgeIcon
              :category="category.key"
              :tier="category.tier"
              :points="category.points"
              size="lg"
              :show-tooltip="true"
            />
          </div>

          <!-- Category Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="text-base font-semibold text-text">{{ category.label }}</h4>
              <span class="text-lg">{{ category.emoji }}</span>
            </div>
            <p class="text-xs text-muted mb-2">{{ category.description }}</p>
            
            <!-- Badge Name or Locked -->
            <div class="mb-2">
              <span
                class="text-sm font-medium"
                :class="category.tier > 0 ? 'text-text' : 'text-muted'"
              >
                {{ category.tier > 0 ? category.badgeName : 'Locked' }}
              </span>
              <span v-if="category.tier > 0" class="text-xs text-muted ml-2">
                (Level {{ category.tier }})
              </span>
            </div>

            <!-- Points -->
            <div class="mb-2">
              <span class="text-sm font-medium text-text">{{ category.points.toFixed(1) }} pts</span>
              <span v-if="category.progress.next > 0" class="text-xs text-muted ml-2">
                / {{ category.progress.next }} to next tier
              </span>
            </div>

            <!-- Progress Bar -->
            <ProgressBar
              :current="category.progress.current"
              :max="category.progress.next"
              :show-label="false"
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useRewards } from '@/composables/useRewards'
import { useBrandStore } from '@/stores/brand'
import { REWARD_CATEGORIES, getBadgeName, getProgressToNextTier, getTierForPoints } from '@/constants/badges'
import BadgeIcon from './BadgeIcon.vue'
import ProgressBar from './ProgressBar.vue'

const brandStore = useBrandStore()
const rewards = useRewards()

const loading = computed(() => rewards.loading.value)

const categories = computed(() => {
  if (!rewards.userRewards.value) {
    // Show all categories even if no rewards yet
    return Object.entries(REWARD_CATEGORIES).map(([key, info]) => ({
      key,
      label: info.label,
      emoji: info.emoji,
      description: info.description,
      tier: 0,
      points: 0,
      badgeName: 'Locked',
      progress: {
        current: 0,
        next: 5, // First tier threshold
      },
    }))
  }

  return Object.entries(REWARD_CATEGORIES).map(([key, info]) => {
    const points = rewards.userRewards.value!.points[key as keyof typeof rewards.userRewards.value.points]
    const tier = getTierForPoints(points)
    const progress = getProgressToNextTier(points)
    
    return {
      key,
      label: info.label,
      emoji: info.emoji,
      description: info.description,
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

// Fetch rewards when brand changes
watch(
  () => brandStore.currentBrand?.id,
  (brandId) => {
    if (brandId) {
      rewards.fetchRewards(brandId)
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (brandStore.currentBrand?.id) {
    rewards.fetchRewards(brandStore.currentBrand.id)
  }
})
</script>
