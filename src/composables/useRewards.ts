import { ref, computed, watch } from 'vue'
import { Timestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import { useBrandStore } from '@/stores/brand'
import type { UserRewards, PointTransaction, RewardCategory } from '@/types/rewards'
import {
  getOrCreateUserRewards,
  addPoints,
  recordLogin,
} from '@/services/rewardsService'
import { getTierForPoints, getProgressToNextTier, getBadgeName, REWARD_CATEGORIES } from '@/constants/badges'

export function useRewards() {
  const authStore = useAuthStore()
  const brandStore = useBrandStore()
  
  // State
  const userRewards = ref<UserRewards | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const recentTransaction = ref<PointTransaction | null>(null)
  const levelUpEvent = ref<{ category: string; newTier: number; badgeName: string } | null>(null)

  // Computed
  const totalPoints = computed(() => userRewards.value?.totalPoints || 0)
  
  const topBadges = computed(() => {
    if (!userRewards.value) return []
    
    const badges: { category: string; tier: number; name: string; emoji: string }[] = []
    for (const [categoryKey, categoryInfo] of Object.entries(REWARD_CATEGORIES)) {
      const points = userRewards.value.points[categoryKey as RewardCategory]
      const tier = getTierForPoints(points)
      if (tier > 0) {
        badges.push({
          category: categoryKey,
          tier,
          name: getBadgeName(categoryKey as RewardCategory, tier),
          emoji: categoryInfo.emoji,
        })
      }
    }
    
    return badges.sort((a, b) => b.tier - a.tier).slice(0, 3)
  })
  
  const allBadges = computed(() => {
    if (!userRewards.value) return []
    
    return Object.keys(REWARD_CATEGORIES).map((categoryKey) => {
      const points = userRewards.value!.points[categoryKey as RewardCategory]
      const tier = getTierForPoints(points)
      return {
        category: categoryKey,
        tier,
        points,
      }
    })
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

  // Actions
  async function fetchRewards(brandId: string): Promise<void> {
    if (!authStore.user) {
      error.value = 'User not authenticated'
      return
    }
    
    loading.value = true
    error.value = null
    try {
      userRewards.value = await getOrCreateUserRewards(authStore.user.uid, brandId)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch rewards'
      console.error('Error fetching rewards:', err)
    } finally {
      loading.value = false
    }
  }

  async function recordActivity(
    category: RewardCategory,
    points: number,
    reason: string,
    productId?: string
  ): Promise<void> {
    if (!authStore.user || !brandStore.currentBrand) {
      console.warn('Cannot record activity: user or brand not set')
      return
    }
    
    try {
      // Optimistically update local state
      if (userRewards.value) {
        const oldTier = getTierForPoints(userRewards.value.points[category])
        userRewards.value.points[category] += points
        userRewards.value.totalPoints += points
        
        const newTier = getTierForPoints(userRewards.value.points[category])
        
        // Check for level up
        if (newTier > oldTier && newTier > 0) {
          const badgeName = getBadgeName(category, newTier)
          levelUpEvent.value = {
            category,
            newTier,
            badgeName,
          }
        }
      }
      
      // Add points via service
      const result = await addPoints(
        authStore.user.uid,
        brandStore.currentBrand.id,
        category,
        points,
        reason,
        productId
      )
      
      // Create transaction object for toast
      const transaction: PointTransaction = {
        id: 'temp',
        userId: authStore.user.uid,
        brandId: brandStore.currentBrand.id,
        category,
        points,
        reason,
        productId,
        createdAt: userRewards.value?.updatedAt || Timestamp.now(),
      }
      recentTransaction.value = transaction
      
      // Check for level up from service result
      if (result.newTier && result.newTier > 0) {
        const badgeName = getBadgeName(category, result.newTier)
        levelUpEvent.value = {
          category,
          newTier: result.newTier,
          badgeName,
        }
      }
      
      // Refetch to get accurate data
      await fetchRewards(brandStore.currentBrand.id)
    } catch (err: any) {
      error.value = err.message || 'Failed to record activity'
      console.error('Error recording activity:', err)
      // Revert optimistic update on error
      await fetchRewards(brandStore.currentBrand.id)
    }
  }

  async function checkDailyLogin(brandId: string): Promise<void> {
    if (!authStore.user) return
    
    try {
      const result = await recordLogin(authStore.user.uid, brandId)
      if (result.streakUpdated) {
        // Refetch rewards to update streak
        await fetchRewards(brandId)
        
        // Show transaction for daily login
        if (result.bonusAwarded > 0) {
          const transaction: PointTransaction = {
            id: 'temp',
            userId: authStore.user.uid,
            brandId,
            category: 'streak',
            points: result.bonusAwarded,
            reason: result.newStreak >= 7 ? `${result.newStreak}-day streak bonus` : 'Daily login',
            createdAt: Timestamp.now(),
          }
          recentTransaction.value = transaction
        }
      }
    } catch (err: any) {
      console.error('Error checking daily login:', err)
      // Don't show error to user for login check failures
    }
  }

  function clearLevelUpEvent(): void {
    levelUpEvent.value = null
  }

  function clearRecentTransaction(): void {
    recentTransaction.value = null
  }

  // Helper methods
  function getCategoryProgress(category: string): { points: number; tier: number; nextTier: number; percentage: number } {
    if (!userRewards.value) {
      return { points: 0, tier: 0, nextTier: 5, percentage: 0 }
    }
    
    const points = userRewards.value.points[category as RewardCategory]
    const progress = getProgressToNextTier(points)
    const tier = getTierForPoints(points)
    
    return {
      points,
      tier,
      nextTier: progress.next,
      percentage: progress.percentage,
    }
  }

  function hasBadge(category: string): boolean {
    if (!userRewards.value) return false
    const points = userRewards.value.points[category as RewardCategory]
    return getTierForPoints(points) > 0
  }

  function getBadgeForCategory(category: string): { emoji: string; name: string; tier: number } | null {
    if (!userRewards.value) return null
    
    const points = userRewards.value.points[category as RewardCategory]
    const tier = getTierForPoints(points)
    
    if (tier === 0) return null
    
    const categoryInfo = REWARD_CATEGORIES[category as RewardCategory]
    return {
      emoji: categoryInfo.emoji,
      name: getBadgeName(category as RewardCategory, tier),
      tier,
    }
  }

  // Watch for brand changes and auto-fetch rewards
  watch(
    () => brandStore.currentBrand?.id,
    (brandId) => {
      if (brandId && authStore.user) {
        fetchRewards(brandId)
      }
    },
    { immediate: true }
  )

  return {
    // State
    userRewards,
    loading,
    error,
    recentTransaction,
    levelUpEvent,
    
    // Computed
    totalPoints,
    topBadges,
    allBadges,
    currentStreak,
    streakActive,
    
    // Actions
    fetchRewards,
    recordActivity,
    checkDailyLogin,
    clearLevelUpEvent,
    clearRecentTransaction,
    
    // Helpers
    getCategoryProgress,
    hasBadge,
    getBadgeForCategory,
  }
}
