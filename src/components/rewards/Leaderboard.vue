<template>
  <div class="space-y-2">
    <!-- Header with Period Tabs -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-text">Leaderboard</h3>
      <div class="flex gap-1.5">
        <button
          v-for="periodOption in periodOptions"
          :key="periodOption.value"
          class="px-2 py-0.5 text-xs font-medium rounded-md transition-colors"
          :class="
            period === periodOption.value
              ? 'bg-[#1B7F56] text-white'
              : 'bg-bg text-text border border-border hover:bg-card'
          "
          @click="period = periodOption.value"
        >
          {{ periodOption.label }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-6">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1B7F56]"></div>
    </div>

    <!-- Leaderboard Table -->
    <div v-else-if="leaderboard.length > 0" class="overflow-x-auto -mx-4 px-4">
      <div class="space-y-1 min-w-[600px]">
        <!-- Table Header -->
        <div class="grid grid-cols-12 gap-1 sm:gap-2 px-2 py-1.5 text-xs font-semibold text-muted border-b border-border">
          <div class="col-span-1 text-center">#</div>
          <div class="col-span-3">Name</div>
          <div class="col-span-1 text-center">📦</div>
          <div class="col-span-1 text-center">📋</div>
          <div class="col-span-1 text-center">📸</div>
          <div class="col-span-1 text-center">✂️</div>
          <div class="col-span-1 text-center">🎭</div>
          <div class="col-span-1 text-center">🚀</div>
          <div class="col-span-1 text-center">🔥</div>
          <div class="col-span-1 text-right font-semibold">Total</div>
        </div>

        <!-- Table Rows -->
        <div
          v-for="(entry, index) in displayedLeaderboard"
          :key="entry.userId"
          class="grid grid-cols-12 gap-1 sm:gap-2 px-2 py-1.5 rounded border transition-colors text-xs"
          :class="
            entry.userId === currentUserId
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-card border-border hover:bg-bg'
          "
        >
        <!-- Rank -->
        <div class="col-span-1 flex items-center justify-center">
          <span class="font-medium text-muted">{{ index + 1 }}</span>
        </div>

        <!-- Name with Avatar -->
        <div class="col-span-3 flex items-center gap-2 min-w-0">
          <div class="flex-shrink-0">
            <img
              v-if="entry.avatarUrl"
              :src="entry.avatarUrl"
              :alt="entry.displayName"
              class="w-6 h-6 rounded-full object-cover"
            />
            <div v-else class="w-6 h-6 rounded-full bg-bg flex items-center justify-center text-text font-medium text-xs">
              {{ entry.displayName.charAt(0).toUpperCase() }}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-text truncate">{{ entry.displayName }}</span>
              <span v-if="entry.userId === currentUserId" class="text-[10px] text-indigo-600 font-medium">You</span>
            </div>
          </div>
        </div>

        <!-- Category Points -->
        <div class="col-span-1 flex items-center justify-center text-muted">
          {{ entry.categoryPoints.loader.toFixed(1) }}
        </div>
        <div class="col-span-1 flex items-center justify-center text-muted">
          {{ entry.categoryPoints.prepper.toFixed(1) }}
        </div>
        <div class="col-span-1 flex items-center justify-center text-muted">
          {{ entry.categoryPoints.shooter.toFixed(1) }}
        </div>
        <div class="col-span-1 flex items-center justify-center text-muted">
          {{ entry.categoryPoints.editor.toFixed(1) }}
        </div>
        <div class="col-span-1 flex items-center justify-center text-muted">
          {{ entry.categoryPoints.stager.toFixed(1) }}
        </div>
        <div class="col-span-1 flex items-center justify-center text-muted">
          {{ entry.categoryPoints.launcher.toFixed(1) }}
        </div>
        <div class="col-span-1 flex items-center justify-center text-muted">
          {{ entry.categoryPoints.streak.toFixed(1) }}
        </div>

        <!-- Total Points -->
        <div class="col-span-1 flex items-center justify-end">
          <span class="font-semibold text-text">{{ entry.totalPoints.toFixed(1) }}</span>
        </div>
        </div>
      </div>

      <!-- Expand/Collapse Button -->
      <div v-if="leaderboard.length > 5" class="pt-1">
        <button
          class="w-full px-2 py-1 text-xs text-muted hover:text-text transition-colors border-t border-border"
          @click="isExpanded = !isExpanded"
        >
          {{ isExpanded ? 'Show Less' : `Show All (${leaderboard.length - 5} more)` }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-6">
      <p class="text-xs text-muted">No leaderboard data available yet.</p>
      <p class="text-xs text-muted mt-1">Start earning points to see rankings!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getBrandLeaderboard } from '@/services/rewardsService'

const props = withDefaults(
  defineProps<{
    brandId: string
    period?: 'week' | 'month' | 'alltime'
  }>(),
  {
    period: 'week',
  }
)

const authStore = useAuthStore()
const period = ref<'week' | 'month' | 'alltime'>(props.period)
const leaderboard = ref<Array<{
  userId: string
  displayName: string
  avatarUrl?: string
  totalPoints: number
  categoryPoints: {
    loader: number
    prepper: number
    shooter: number
    editor: number
    stager: number
    launcher: number
    streak: number
    allstar: number
  }
}>>([])
const loading = ref(false)
const isExpanded = ref(false)

const currentUserId = computed(() => authStore.user?.uid || null)

const displayedLeaderboard = computed(() => {
  if (isExpanded.value || leaderboard.value.length <= 5) {
    return leaderboard.value
  }
  return leaderboard.value.slice(0, 5)
})

const periodOptions = [
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
  { value: 'alltime' as const, label: 'All Time' },
]

async function fetchLeaderboard() {
  loading.value = true
  try {
    // Note: For MVP, we're using all-time leaderboard
    // In production, you'd filter transactions by period
    const data = await getBrandLeaderboard(props.brandId, 10)
    leaderboard.value = data
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    leaderboard.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.brandId, period.value],
  () => {
    fetchLeaderboard()
  },
  { immediate: true }
)

onMounted(() => {
  fetchLeaderboard()
})
</script>
