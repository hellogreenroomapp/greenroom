import type { RewardCategory } from '@/types/rewards'

export const REWARD_CATEGORIES: Record<RewardCategory, { key: RewardCategory; emoji: string; label: string; description: string }> = {
  loader: { key: 'loader', emoji: '📦', label: 'Loader', description: 'Uploading products' },
  prepper: { key: 'prepper', emoji: '📋', label: 'Prepper', description: 'Queueing for photos' },
  shooter: { key: 'shooter', emoji: '📸', label: 'Shooter', description: 'Moving to shoot' },
  editor: { key: 'editor', emoji: '✂️', label: 'Editor', description: 'Sending to editing' },
  stager: { key: 'stager', emoji: '🎭', label: 'Stager', description: 'Staging products' },
  launcher: { key: 'launcher', emoji: '🚀', label: 'Launcher', description: 'Going live' },
  streak: { key: 'streak', emoji: '🔥', label: 'Streak', description: 'Daily logins' },
  allstar: { key: 'allstar', emoji: '⭐', label: 'All-Star', description: 'Bonus achievements' }
}

export const TIER_THRESHOLDS = [5, 15, 35, 75, 150]

export const BADGE_NAMES: Record<RewardCategory, string[]> = {
  loader: ['Box Opener', 'Stock Filler', 'Warehouse Warrior', 'Intake Boss', 'Loading Legend'],
  prepper: ['Queue Starter', 'Shot Lister', 'Lineup Pro', 'Queue Commander', 'Prep Legend'],
  shooter: ['First Snap', 'Shutter Clicker', 'Photo Pro', 'Studio Star', 'Shoot Legend'],
  editor: ['First Cut', 'Retoucher', 'Polish Pro', 'Edit Master', 'Edit Legend'],
  stager: ['Curtain Call', 'Backstage Pass', 'Dress Rehearsal', 'Stage Director', 'Stage Legend'],
  launcher: ['First Light', 'Go-Liver', 'Launch Pro', 'Ship Captain', 'Launch Legend'],
  streak: ['Regular', 'Consistent', 'Dedicated', 'Devoted', 'Streak Legend'],
  allstar: ['Rising Star', 'Standout', 'MVP', 'Superstar', 'All-Star Legend']
}

export const POINT_VALUES = {
  upload: 0.05,
  bulkUploadBonus: 0.3,
  moveToPhotoQueue: 0.025,
  moveToInShoot: 0.05,
  moveToEditing: 0.05,
  moveToStaged: 0.05,
  moveToLive: 0.1,
  dailyLogin: 0.01,
  streak7Day: 0.05,
  streak14Day: 0.1,
  streak30Day: 0.2,
  speedRun: 0.2,
  batchDrop: 0.15,
  zeroOverdueWeek: 0.1,
  bulkEdit: 0.05
}

/**
 * Get tier (0-5) for a given point value
 * 0 = no badge yet, 1-5 = tier levels
 */
export function getTierForPoints(points: number): number {
  if (TIER_THRESHOLDS[0] !== undefined && points < TIER_THRESHOLDS[0]) return 0
  if (TIER_THRESHOLDS[1] !== undefined && points < TIER_THRESHOLDS[1]) return 1
  if (TIER_THRESHOLDS[2] !== undefined && points < TIER_THRESHOLDS[2]) return 2
  if (TIER_THRESHOLDS[3] !== undefined && points < TIER_THRESHOLDS[3]) return 3
  if (TIER_THRESHOLDS[4] !== undefined && points < TIER_THRESHOLDS[4]) return 4
  return 5
}

/**
 * Get the next tier threshold for a given point value
 * Returns null if already at max tier (5)
 */
export function getNextTierThreshold(currentPoints: number): number | null {
  const currentTier = getTierForPoints(currentPoints)
  if (currentTier >= 5) return null
  return TIER_THRESHOLDS[currentTier] ?? null
}

/**
 * Get badge name for a category and tier
 */
export function getBadgeName(category: RewardCategory, tier: number): string {
  if (tier < 1 || tier > 5) return 'Locked'
  return BADGE_NAMES[category]?.[tier - 1] || 'Locked'
}

/**
 * Get progress to next tier
 */
export function getProgressToNextTier(points: number): { current: number; next: number; percentage: number } {
  const currentTier = getTierForPoints(points)
  
  if (currentTier === 0) {
    const next = TIER_THRESHOLDS[0]
    if (next === undefined) {
      return { current: points, next: 0, percentage: 0 }
    }
    return {
      current: points,
      next,
      percentage: Math.min((points / next) * 100, 100)
    }
  }
  
  if (currentTier >= 5) {
    // At max tier, show progress beyond max
    const max = TIER_THRESHOLDS[4]
    if (max === undefined) {
      return { current: points, next: 0, percentage: 100 }
    }
    return {
      current: points,
      next: max,
      percentage: 100
    }
  }
  
  const currentThreshold = TIER_THRESHOLDS[currentTier - 1]
  const nextThreshold = TIER_THRESHOLDS[currentTier]
  if (currentThreshold === undefined || nextThreshold === undefined) {
    return { current: points, next: 0, percentage: 0 }
  }
  const progressInTier = points - currentThreshold
  
  return {
    current: progressInTier,
    next: nextThreshold - currentThreshold,
    percentage: Math.min((progressInTier / (nextThreshold - currentThreshold)) * 100, 100)
  }
}
