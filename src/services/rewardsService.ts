import { Timestamp } from 'firebase/firestore'
import { collection, doc, setDoc, updateDoc, query, where, orderBy, limit, getDocs as getDocsFirestore, addDoc as addDocFirestore } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { UserRewards, PointTransaction, RewardCategory } from '@/types/rewards'
import { getTierForPoints } from '@/constants/badges'
import { getDoc as getDocHelper, getDocs as getDocsHelper } from '@/firebase/firestore'
import type { Product } from '@/types'

const USER_REWARDS_COLLECTION = 'userRewards'

/**
 * Get document ID for user rewards (userId_brandId)
 */
function getUserRewardsDocId(userId: string, brandId: string): string {
  return `${userId}_${brandId}`
}

/**
 * Initialize user rewards document
 */
export async function createUserRewards(userId: string, brandId: string): Promise<UserRewards> {
  const docId = getUserRewardsDocId(userId, brandId)
  const now = Timestamp.now()
  
  const initialRewards: Omit<UserRewards, 'id'> = {
    userId,
    brandId,
    points: {
      loader: 0,
      prepper: 0,
      shooter: 0,
      editor: 0,
      stager: 0,
      launcher: 0,
      streak: 0,
      allstar: 0,
    },
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastLoginDate: null,
    speedRuns: 0,
    batchDrops: 0,
    zeroOverdueWeeks: 0,
    createdAt: now,
    updatedAt: now,
  }

  const docRef = doc(db, USER_REWARDS_COLLECTION, docId)
  await setDoc(docRef, initialRewards)
  
  return { id: docId, ...initialRewards }
}

/**
 * Get user rewards document
 */
export async function getUserRewards(userId: string, brandId: string): Promise<UserRewards | null> {
  const docId = getUserRewardsDocId(userId, brandId)
  return await getDocHelper<UserRewards>(USER_REWARDS_COLLECTION, docId)
}

/**
 * Get or create user rewards document
 */
export async function getOrCreateUserRewards(userId: string, brandId: string): Promise<UserRewards> {
  const existing = await getUserRewards(userId, brandId)
  if (existing) return existing
  return await createUserRewards(userId, brandId)
}

/**
 * Add points to user rewards
 * Returns new tier if leveled up, null otherwise
 */
export async function addPoints(
  userId: string,
  brandId: string,
  category: RewardCategory,
  points: number,
  reason: string,
  productId?: string
): Promise<{ newTier: number | null }> {
  const rewards = await getOrCreateUserRewards(userId, brandId)
  
  // Get current tier before adding points
  const currentTier = getTierForPoints(rewards.points[category])
  
  // Calculate new points
  const newCategoryPoints = rewards.points[category] + points
  const newTotalPoints = rewards.totalPoints + points
  
  // Check if tier increased
  const newTier = getTierForPoints(newCategoryPoints)
  const tierIncreased = newTier > currentTier && newTier > 0
  
  // Update rewards document
  const docId = getUserRewardsDocId(userId, brandId)
  const docRef = doc(db, USER_REWARDS_COLLECTION, docId)
  
  await updateDoc(docRef, {
    [`points.${category}`]: newCategoryPoints,
    totalPoints: newTotalPoints,
    updatedAt: Timestamp.now(),
  })
  
  // Create transaction record
  // Remove undefined values - Firestore doesn't accept them
  const transactionData: Record<string, any> = {
    userId,
    brandId,
    category,
    points,
    reason,
    createdAt: Timestamp.now(),
  }
  
  // Only add productId if it's defined
  if (productId !== undefined) {
    transactionData.productId = productId
  }
  
  const transactionsRef = collection(db, USER_REWARDS_COLLECTION, docId, 'transactions')
  await addDocFirestore(transactionsRef, transactionData)
  
  return { newTier: tierIncreased ? newTier : null }
}

/**
 * Award points for product upload
 */
export async function awardUploadPoints(
  userId: string,
  brandId: string,
  productId: string,
  isBulk: boolean
): Promise<void> {
  const { POINT_VALUES } = await import('@/constants/badges')
  
  if (isBulk) {
    // Bulk upload bonus is handled separately in bulkCreateProducts
    // This function just awards the base upload points per product
    await addPoints(userId, brandId, 'loader', POINT_VALUES.upload, 'Uploaded product', productId)
  } else {
    await addPoints(userId, brandId, 'loader', POINT_VALUES.upload, 'Uploaded product', productId)
  }
}

/**
 * Award points for stage change
 */
export async function awardStageChangePoints(
  userId: string,
  brandId: string,
  productId: string,
  newStage: Product['stage']
): Promise<void> {
  const { POINT_VALUES } = await import('@/constants/badges')
  
  const stageToCategory: Record<string, RewardCategory> = {
    'photo_queue': 'prepper',
    'in_shoot': 'shooter',
    'editing': 'editor',
    'staged': 'stager',
    'live': 'launcher',
  }
  
  const category = stageToCategory[newStage]
  if (!category) return // No points for samples or warehouse
  
  const pointValueMap: Record<string, number> = {
    'photo_queue': POINT_VALUES.moveToPhotoQueue,
    'in_shoot': POINT_VALUES.moveToInShoot,
    'editing': POINT_VALUES.moveToEditing,
    'staged': POINT_VALUES.moveToStaged,
    'live': POINT_VALUES.moveToLive,
  }
  
  const points = pointValueMap[newStage]
  if (!points) return
  
  const reason = `Moved to ${newStage.replace('_', ' ')}`
  await addPoints(userId, brandId, category, points, reason, productId)
  
  // Check for speed run bonus if going live
  if (newStage === 'live') {
    const isSpeedRun = await checkSpeedRun(productId, userId, brandId)
    if (isSpeedRun) {
      await addPoints(userId, brandId, 'launcher', POINT_VALUES.speedRun, 'Speed run bonus (warehouse → live < 48hrs)', productId)
    }
    
    // Check for batch drop bonus
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isBatchDrop = await checkBatchDrop(userId, brandId, today)
    if (isBatchDrop) {
      await addPoints(userId, brandId, 'launcher', POINT_VALUES.batchDrop, 'Batch drop bonus (5+ live same day)', productId)
    }
  }
}

/**
 * Award points for bulk editing products
 */
export async function awardBulkEditPoints(
  userId: string,
  brandId: string,
  productCount: number
): Promise<void> {
  const { POINT_VALUES } = await import('@/constants/badges')
  
  // Award points per product edited (in allstar category)
  const totalPoints = POINT_VALUES.bulkEdit * productCount
  if (totalPoints > 0) {
    await addPoints(
      userId,
      brandId,
      'allstar',
      totalPoints,
      `Bulk edited ${productCount} product${productCount !== 1 ? 's' : ''}`,
      undefined
    )
  }
}

/**
 * Check if product qualifies for speed run bonus (warehouse → live < 48hrs)
 */
export async function checkSpeedRun(productId: string, _userId: string, _brandId: string): Promise<boolean> {
  try {
    const product = await getDocHelper<Product>('products', productId)
    if (!product || !product.stageHistory || product.stageHistory.length === 0) {
      return false
    }
    
    // Find first warehouse entry and last live entry
    let warehouseTime: Timestamp | null = null
    let liveTime: Timestamp | null = null
    
    for (const change of product.stageHistory) {
      if (change.from === 'warehouse' && !warehouseTime) {
        warehouseTime = change.changedAt
      }
      if (change.to === 'live') {
        liveTime = change.changedAt
      }
    }
    
    if (!warehouseTime || !liveTime) {
      return false
    }
    
    // Check if time difference is less than 48 hours
    const diffMs = liveTime.toMillis() - warehouseTime.toMillis()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    return diffHours < 48
  } catch (error) {
    console.error('Error checking speed run:', error)
    return false
  }
}

/**
 * Check if user qualifies for batch drop bonus (5+ products moved to live today)
 */
export async function checkBatchDrop(userId: string, brandId: string, date: Date): Promise<boolean> {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const startTimestamp = Timestamp.fromDate(startOfDay)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    const endTimestamp = Timestamp.fromDate(endOfDay)
    
    // Get all products for this brand
    const products = await getDocsHelper<Product>('products', [
      where('brandId', '==', brandId),
    ])
    
    // Count products moved to live today by this user
    let count = 0
    for (const product of products) {
      if (product.stageHistory && product.stageHistory.length > 0) {
        for (const change of product.stageHistory) {
          if (
            change.to === 'live' &&
            change.changedBy === userId &&
            change.changedAt >= startTimestamp &&
            change.changedAt <= endTimestamp
          ) {
            count++
            break // Count each product only once
          }
        }
      }
    }
    
    return count >= 5
  } catch (error) {
    console.error('Error checking batch drop:', error)
    return false
  }
}

/**
 * Record daily login and update streak
 */
export async function recordLogin(
  userId: string,
  brandId: string
): Promise<{ streakUpdated: boolean; newStreak: number; bonusAwarded: number }> {
  const rewards = await getOrCreateUserRewards(userId, brandId)
  const now = Timestamp.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTimestamp = Timestamp.fromDate(today)
  
  let streakUpdated = false
  let newStreak = rewards.currentStreak
  let bonusAwarded = 0
  
  // Check if already logged in today
  if (rewards.lastLoginDate) {
    const lastLoginDate = rewards.lastLoginDate.toDate()
    lastLoginDate.setHours(0, 0, 0, 0)
    const lastLoginTimestamp = Timestamp.fromDate(lastLoginDate)
    
    if (lastLoginTimestamp.isEqual(todayTimestamp)) {
      // Already logged in today, do nothing
      return { streakUpdated: false, newStreak: rewards.currentStreak, bonusAwarded: 0 }
    }
    
    // Check if consecutive day
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayTimestamp = Timestamp.fromDate(yesterday)
    
    if (lastLoginTimestamp.isEqual(yesterdayTimestamp)) {
      // Consecutive day - increment streak
      newStreak = rewards.currentStreak + 1
      streakUpdated = true
      
      // Award daily login points
      const { POINT_VALUES } = await import('@/constants/badges')
      await addPoints(userId, brandId, 'streak', POINT_VALUES.dailyLogin, 'Daily login', undefined)
      bonusAwarded = POINT_VALUES.dailyLogin
      
      // Check for streak bonuses
      if (newStreak === 7) {
        await addPoints(userId, brandId, 'streak', POINT_VALUES.streak7Day, '7-day streak bonus', undefined)
        bonusAwarded += POINT_VALUES.streak7Day
      } else if (newStreak === 14) {
        await addPoints(userId, brandId, 'streak', POINT_VALUES.streak14Day, '14-day streak bonus', undefined)
        bonusAwarded += POINT_VALUES.streak14Day
      } else if (newStreak === 30) {
        await addPoints(userId, brandId, 'streak', POINT_VALUES.streak30Day, '30-day streak bonus', undefined)
        bonusAwarded += POINT_VALUES.streak30Day
      }
    } else {
      // Streak broken - reset to 1
      newStreak = 1
      streakUpdated = true
      
      // Award daily login points
      const { POINT_VALUES } = await import('@/constants/badges')
      await addPoints(userId, brandId, 'streak', POINT_VALUES.dailyLogin, 'Daily login', undefined)
      bonusAwarded = POINT_VALUES.dailyLogin
    }
  } else {
    // First login ever - start streak
    newStreak = 1
    streakUpdated = true
    
    // Award daily login points
    const { POINT_VALUES } = await import('@/constants/badges')
    await addPoints(userId, brandId, 'streak', POINT_VALUES.dailyLogin, 'Daily login', undefined)
    bonusAwarded = POINT_VALUES.dailyLogin
  }
  
  // Update rewards document
  const docId = getUserRewardsDocId(userId, brandId)
  const docRef = doc(db, USER_REWARDS_COLLECTION, docId)
  
  const updateData: Partial<UserRewards> = {
    currentStreak: newStreak,
    lastLoginDate: now,
    updatedAt: now,
  }
  
  if (newStreak > rewards.longestStreak) {
    updateData.longestStreak = newStreak
  }
  
  await updateDoc(docRef, updateData)
  
  return { streakUpdated, newStreak, bonusAwarded }
}

/**
 * Get point transactions for a user
 */
export async function getPointTransactions(
  userId: string,
  brandId: string,
  limitCount?: number
): Promise<PointTransaction[]> {
  const docId = getUserRewardsDocId(userId, brandId)
  const transactionsRef = collection(db, USER_REWARDS_COLLECTION, docId, 'transactions')
  
  let q = query(transactionsRef, orderBy('createdAt', 'desc'))
  if (limitCount) {
    q = query(q, limit(limitCount))
  }
  
  const snapshot = await getDocsFirestore(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PointTransaction[]
}

/**
 * Get user badges (derived from points)
 */
export async function getUserBadges(
  userId: string,
  brandId: string
): Promise<{ category: string; tier: number; name: string; emoji: string }[]> {
  const rewards = await getUserRewards(userId, brandId)
  if (!rewards) return []
  
  const { REWARD_CATEGORIES, getBadgeName } = await import('@/constants/badges')
  const badges: { category: string; tier: number; name: string; emoji: string }[] = []
  
  for (const [categoryKey, categoryInfo] of Object.entries(REWARD_CATEGORIES)) {
    const points = rewards.points[categoryKey as RewardCategory]
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
  
  return badges.sort((a, b) => b.tier - a.tier) // Sort by tier descending
}

/**
 * Get brand leaderboard
 */
export async function getBrandLeaderboard(
  brandId: string,
  limitCount?: number
): Promise<{ userId: string; displayName: string; avatarUrl?: string; totalPoints: number; categoryPoints: { loader: number; prepper: number; shooter: number; editor: number; stager: number; launcher: number; streak: number; allstar: number } }[]> {
  try {
    // Get all user rewards for this brand
    const rewardsDocs = await getDocsHelper<UserRewards>(USER_REWARDS_COLLECTION, [
      where('brandId', '==', brandId),
      orderBy('totalPoints', 'desc'),
      ...(limitCount ? [limit(limitCount)] : []),
    ])
    
    // Get user profiles for display names and avatars
    const leaderboard: { userId: string; displayName: string; avatarUrl?: string; totalPoints: number; categoryPoints: { loader: number; prepper: number; shooter: number; editor: number; stager: number; launcher: number; streak: number; allstar: number } }[] = []
    
    for (const reward of rewardsDocs) {
      try {
        const userProfile = await getDocHelper<{ displayName: string; avatarUrl?: string }>('userProfiles', reward.userId)
        
        leaderboard.push({
          userId: reward.userId,
          displayName: userProfile?.displayName || 'Unknown User',
          avatarUrl: userProfile?.avatarUrl,
          totalPoints: reward.totalPoints,
          categoryPoints: reward.points,
        })
      } catch (error) {
        console.error(`Error fetching profile for user ${reward.userId}:`, error)
        leaderboard.push({
          userId: reward.userId,
          displayName: 'Unknown User',
          totalPoints: reward.totalPoints,
          categoryPoints: reward.points,
        })
      }
    }
    
    return leaderboard
  } catch (error: any) {
    // If orderBy fails (missing index), fall back to manual sorting
    if (error.message?.includes('index') || error.code === 'failed-precondition') {
      console.warn('Firestore index missing for leaderboard query, using fallback')
      const rewardsDocs = await getDocsHelper<UserRewards>(USER_REWARDS_COLLECTION, [
        where('brandId', '==', brandId),
      ])
      
      const sorted = rewardsDocs.sort((a, b) => b.totalPoints - a.totalPoints)
      const limited = limitCount ? sorted.slice(0, limitCount) : sorted
      
      const leaderboard: { userId: string; displayName: string; avatarUrl?: string; totalPoints: number; categoryPoints: { loader: number; prepper: number; shooter: number; editor: number; stager: number; launcher: number; streak: number; allstar: number } }[] = []
      
      for (const reward of limited) {
        try {
          const userProfile = await getDocHelper<{ displayName: string; avatarUrl?: string }>('userProfiles', reward.userId)
          
          leaderboard.push({
            userId: reward.userId,
            displayName: userProfile?.displayName || 'Unknown User',
            avatarUrl: userProfile?.avatarUrl,
            totalPoints: reward.totalPoints,
            categoryPoints: reward.points,
          })
        } catch (error) {
          console.error(`Error fetching profile for user ${reward.userId}:`, error)
          leaderboard.push({
            userId: reward.userId,
            displayName: 'Unknown User',
            totalPoints: reward.totalPoints,
            categoryPoints: reward.points,
          })
        }
      }
      
      return leaderboard
    }
    throw error
  }
}
