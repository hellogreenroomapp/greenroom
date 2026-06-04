<template>
  <div v-if="badges.length > 0" class="inline-flex items-center gap-1">
    <BadgeIcon
      v-for="badge in badges"
      :key="badge.category"
      :category="badge.category"
      :tier="badge.tier"
      :points="badge.points"
      size="sm"
      :show-tooltip="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getUserRewards } from '@/services/rewardsService'
import { getTierForPoints, REWARD_CATEGORIES } from '@/constants/badges'
import BadgeIcon from './BadgeIcon.vue'

const props = withDefaults(
  defineProps<{
    userId: string
    brandId: string
    maxBadges?: number
  }>(),
  {
    maxBadges: 3,
  }
)

const rewards = ref<any>(null)

// Fetch rewards for this specific user
async function fetchRewards() {
  try {
    const userRewards = await getUserRewards(props.userId, props.brandId)
    rewards.value = userRewards
  } catch (error) {
    console.error('Error fetching rewards for inline badges:', error)
  }
}

const badges = computed(() => {
  if (!rewards.value) return []
  
  const allBadges = Object.entries(REWARD_CATEGORIES)
    .map(([key]) => {
      const points = rewards.value.points[key as keyof typeof rewards.value.points]
      const tier = getTierForPoints(points)
      return {
        category: key,
        tier,
        points,
      }
    })
    .filter((b) => b.tier > 0)
    .sort((a, b) => {
      // Sort by tier descending, then by points descending
      if (b.tier !== a.tier) return b.tier - a.tier
      return b.points - a.points
    })
    .slice(0, props.maxBadges)
  
  return allBadges
})

watch(
  () => [props.userId, props.brandId],
  () => {
    fetchRewards()
  },
  { immediate: true }
)

onMounted(() => {
  fetchRewards()
})
</script>
