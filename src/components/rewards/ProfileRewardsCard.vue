<template>
  <div class="bg-card border border-border rounded-lg p-6">
    <!-- Collapsed View -->
    <div v-if="!expanded" class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div v-if="userProfile?.avatarUrl" class="w-10 h-10 rounded-full overflow-hidden">
          <img :src="userProfile.avatarUrl" :alt="displayName" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-10 h-10 rounded-full bg-bg flex items-center justify-center text-text font-medium">
          {{ displayName.charAt(0).toUpperCase() }}
        </div>
        <div>
          <div class="font-medium text-text">{{ displayName }}</div>
          <div class="text-sm text-muted">Member</div>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <InlineBadges :user-id="userId" :brand-id="brandId" :max-badges="3" />
        <div class="text-sm font-medium text-text">{{ totalPoints }} pts</div>
        <StreakIndicator v-if="currentStreak > 0" :streak="currentStreak" :is-active="streakActive" />
        <button
          class="text-sm text-indigo-600 hover:text-indigo-700"
          @click="$emit('expand')"
        >
          View Details
        </button>
      </div>
    </div>

    <!-- Expanded View -->
    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div v-if="userProfile?.avatarUrl" class="w-12 h-12 rounded-full overflow-hidden">
            <img :src="userProfile.avatarUrl" :alt="displayName" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-12 h-12 rounded-full bg-bg flex items-center justify-center text-text font-medium text-lg">
            {{ displayName.charAt(0).toUpperCase() }}
          </div>
          <div>
            <div class="font-semibold text-lg text-text">{{ displayName }}</div>
            <div class="text-sm text-muted">Member</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-text">{{ totalPoints }} pts</div>
          <div class="text-xs text-muted">Total Points</div>
        </div>
      </div>

      <!-- Top Badges -->
      <div class="flex items-center gap-2">
        <BadgeIcon
          v-for="badge in topBadges"
          :key="badge.category"
          :category="badge.category"
          :tier="badge.tier"
          size="md"
        />
      </div>

      <!-- Streak -->
      <div v-if="currentStreak > 0" class="flex items-center justify-between p-3 bg-bg rounded-lg">
        <StreakIndicator :streak="currentStreak" :is-active="streakActive" />
        <span v-if="currentStreak === longestStreak" class="text-xs text-muted">🏆 Personal best!</span>
      </div>

      <!-- Divider -->
      <div class="border-t border-border"></div>

      <!-- Progress Section -->
      <div>
        <h4 class="text-sm font-semibold text-text mb-4">Progress</h4>
        <div class="space-y-3">
          <div
            v-for="category in topCategories"
            :key="category.key"
            class="space-y-1"
          >
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span>{{ category.emoji }}</span>
                <span class="font-medium text-text">{{ category.label }}</span>
              </div>
              <span class="text-muted">{{ category.progress.current }}/{{ category.progress.next }}</span>
            </div>
            <ProgressBar
              :current="category.progress.current"
              :max="category.progress.next"
              :show-label="false"
              size="sm"
            />
          </div>
        </div>
      </div>

      <!-- View All Badges Button -->
      <button
        class="w-full px-4 py-2 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
        @click="showBadgeGrid = true"
      >
        View All Badges
      </button>

      <!-- Collapse Button -->
      <button
        class="w-full px-4 py-2 text-sm text-muted hover:text-text transition-colors"
        @click="$emit('collapse')"
      >
        Collapse
      </button>
    </div>

    <!-- Badge Grid Modal -->
    <Modal v-if="showBadgeGrid" :is-open="showBadgeGrid" title="All Badges" @close="showBadgeGrid = false">
      <BadgeGrid v-if="userRewards" :rewards="userRewards" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getDoc } from '@/firebase/firestore'
import { getUserRewards } from '@/services/rewardsService'
import type { UserProfile } from '@/types'
import type { UserRewards } from '@/types/rewards'
import { REWARD_CATEGORIES, getProgressToNextTier, getTierForPoints, getBadgeName } from '@/constants/badges'
import BadgeIcon from './BadgeIcon.vue'
import InlineBadges from './InlineBadges.vue'
import StreakIndicator from './StreakIndicator.vue'
import ProgressBar from './ProgressBar.vue'
import BadgeGrid from './BadgeGrid.vue'
import Modal from '@/components/common/Modal.vue'

const props = withDefaults(
  defineProps<{
    userId: string
    brandId: string
    expanded?: boolean
  }>(),
  {
    expanded: false,
  }
)

const emit = defineEmits<{
  expand: []
  collapse: []
}>()

const userProfile = ref<UserProfile | null>(null)
const userRewards = ref<UserRewards | null>(null)
const showBadgeGrid = ref(false)
const loading = ref(false)

const displayName = computed(() => {
  return userProfile.value?.displayName || 'Unknown User'
})

const totalPoints = computed(() => userRewards.value?.totalPoints || 0)

const topBadges = computed(() => {
  if (!userRewards.value) return []
  
  return Object.entries(REWARD_CATEGORIES)
    .map(([key, info]) => {
      const points = userRewards.value!.points[key as keyof typeof userRewards.value.points]
      const tier = getTierForPoints(points)
      return {
        category: key,
        tier,
        name: tier > 0 ? getBadgeName(key as any, tier) : 'Locked',
        emoji: info.emoji,
      }
    })
    .filter((b) => b.tier > 0)
    .sort((a, b) => b.tier - a.tier)
    .slice(0, 3)
})

const currentStreak = computed(() => userRewards.value?.currentStreak || 0)

const streakActive = computed(() => {
  if (!userRewards.value?.lastLoginDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastLogin = userRewards.value.lastLoginDate.toDate()
  lastLogin.setHours(0, 0, 0, 0)
  return today.getTime() === lastLogin.getTime()
})

const longestStreak = computed(() => userRewards.value?.longestStreak || 0)

const topCategories = computed(() => {
  if (!userRewards.value) return []
  
  return Object.entries(REWARD_CATEGORIES)
    .map(([key, info]) => {
      const points = userRewards.value!.points[key as keyof typeof userRewards.value.points]
      const progress = getProgressToNextTier(points)
      return {
        key,
        label: info.label,
        emoji: info.emoji,
        points,
        progress: {
          current: progress.current,
          next: progress.next,
        },
      }
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 4)
})

// Fetch user profile
async function fetchUserProfile() {
  try {
    userProfile.value = await getDoc<UserProfile>('userProfiles', props.userId)
  } catch (error) {
    console.error('Error fetching user profile:', error)
  }
}

// Fetch user rewards
async function fetchUserRewards() {
  loading.value = true
  try {
    const rewards = await getUserRewards(props.userId, props.brandId)
    userRewards.value = rewards
  } catch (error) {
    console.error('Error fetching user rewards:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.userId, props.brandId],
  () => {
    fetchUserProfile()
    fetchUserRewards()
  },
  { immediate: true }
)

onMounted(() => {
  fetchUserProfile()
  fetchUserRewards()
})
</script>
