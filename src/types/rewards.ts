import { Timestamp } from 'firebase/firestore'

export type RewardCategory = 'loader' | 'prepper' | 'shooter' | 'editor' | 'stager' | 'launcher' | 'streak' | 'allstar'

// User's reward stats (per brand)
export interface UserRewards {
  id: string
  userId: string
  brandId: string
  
  // Points by category
  points: {
    loader: number
    prepper: number
    shooter: number
    editor: number
    stager: number
    launcher: number
    streak: number
    allstar: number
  }
  
  // Total points (computed, but cached)
  totalPoints: number
  
  // Streak tracking
  currentStreak: number
  longestStreak: number
  lastLoginDate: Timestamp | null
  
  // Bonus tracking
  speedRuns: number          // products warehouse→live < 48hrs
  batchDrops: number         // 5+ live same day
  zeroOverdueWeeks: number
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Individual point transaction (for history/audit)
export interface PointTransaction {
  id: string
  userId: string
  brandId: string
  category: RewardCategory
  points: number
  reason: string            // e.g., "Uploaded product", "Moved to Live", "7-day streak bonus"
  productId?: string        // optional reference
  createdAt: Timestamp
}

// Badge definition (static, can be in code or Firestore)
export interface BadgeDefinition {
  category: string
  tier: number
  name: string
  description: string
  pointsRequired: number
  emoji: string
}

// User's unlocked badges (derived from points, but can cache)
export interface UserBadge {
  userId: string
  category: string
  tier: number
  unlockedAt: Timestamp
}
