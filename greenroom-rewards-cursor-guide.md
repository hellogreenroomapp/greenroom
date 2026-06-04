# GreenRoom Rewards System — Cursor Build Guide

A series of prompts to add a gamification/rewards system to GreenRoom.

**Prerequisite:** GreenRoom core app is already built (auth, brands, projects, products, pipeline)

---

## System Overview

### Points Categories

| Category | Key | Emoji | Action | Points |
|----------|-----|-------|--------|--------|
| Loader | `loader` | 📦 | Upload product | +0.5 |
| Prepper | `prepper` | 📋 | Move → Photo Queue | +0.25 |
| Shooter | `shooter` | 📸 | Move → In Shoot | +0.5 |
| Editor | `editor` | ✂️ | Move → Editing | +0.5 |
| Stager | `stager` | 🎭 | Move → Staged | +0.5 |
| Launcher | `launcher` | 🚀 | Move → Live | +1 |
| Streak | `streak` | 🔥 | Daily login | +0.25 |
| All-Star | `allstar` | ⭐ | Bonus achievements | varies |

### Tier Thresholds

| Tier | Points Required |
|------|-----------------|
| 1 | 5 |
| 2 | 15 |
| 3 | 35 |
| 4 | 75 |
| 5 (Legend) | 150 |

### Bonus Points

| Bonus | Points | Category |
|-------|--------|----------|
| Bulk upload (10+ products) | +3 | loader |
| Speed Run (warehouse → live < 48hrs) | +2 | launcher |
| Batch Drop (5+ live same day) | +1.5 | launcher |
| Zero Overdue week | +1 | allstar |
| 7-day login streak | +1 | streak |
| 14-day login streak | +2 | streak |
| 30-day login streak | +5 | streak |

---

## Data Models

```typescript
// User's reward stats (per brand)
interface UserRewards {
  id: string
  odiu: string
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
interface PointTransaction {
  id: string
  odiu: string
  brandId: string
  category: 'loader' | 'prepper' | 'shooter' | 'editor' | 'stager' | 'launcher' | 'streak' | 'allstar'
  points: number
  reason: string            // e.g., "Uploaded product", "Moved to Live", "7-day streak bonus"
  productId?: string        // optional reference
  createdAt: Timestamp
}

// Badge definition (static, can be in code or Firestore)
interface BadgeDefinition {
  category: string
  tier: number
  name: string
  description: string
  pointsRequired: number
  emoji: string
}

// User's unlocked badges (derived from points, but can cache)
interface UserBadge {
  odiu: string
  category: string
  tier: number
  unlockedAt: Timestamp
}
```

---

## Folder Structure (Additions)

```
src/
├── components/
│   └── rewards/
│       ├── PointToast.vue           # "+1 🚀 Product Live!"
│       ├── LevelUpModal.vue         # Celebration when tier unlocks
│       ├── BadgeIcon.vue            # Single badge display
│       ├── BadgeGrid.vue            # All badges grid
│       ├── ProfileRewardsCard.vue   # Expanded profile card
│       ├── InlineBadges.vue         # Badges next to name
│       ├── StreakIndicator.vue      # Fire + streak count
│       └── ProgressBar.vue          # Progress to next tier
├── composables/
│   └── useRewards.ts                # All rewards logic
├── services/
│   └── rewardsService.ts            # Firestore operations
├── constants/
│   └── badges.ts                    # Badge definitions
└── types/
    └── rewards.ts                   # TypeScript interfaces
```

---

## Prompts

---

### PROMPT 1: Types & Constants

```
Create the rewards system types and constants for GreenRoom.

Create src/types/rewards.ts with TypeScript interfaces:
- UserRewards: tracks points per category, streak data, bonus counts
- PointTransaction: individual point events for history
- BadgeDefinition: static badge info (category, tier, name, emoji, pointsRequired)
- UserBadge: user's unlocked badge record
- RewardCategory type: 'loader' | 'prepper' | 'shooter' | 'editor' | 'stager' | 'launcher' | 'streak' | 'allstar'

Create src/constants/badges.ts with:

1. REWARD_CATEGORIES object:
{
  loader: { key: 'loader', emoji: '📦', label: 'Loader', description: 'Uploading products' },
  prepper: { key: 'prepper', emoji: '📋', label: 'Prepper', description: 'Queueing for photos' },
  shooter: { key: 'shooter', emoji: '📸', label: 'Shooter', description: 'Moving to shoot' },
  editor: { key: 'editor', emoji: '✂️', label: 'Editor', description: 'Sending to editing' },
  stager: { key: 'stager', emoji: '🎭', label: 'Stager', description: 'Staging products' },
  launcher: { key: 'launcher', emoji: '🚀', label: 'Launcher', description: 'Going live' },
  streak: { key: 'streak', emoji: '🔥', label: 'Streak', description: 'Daily logins' },
  allstar: { key: 'allstar', emoji: '⭐', label: 'All-Star', description: 'Bonus achievements' }
}

2. TIER_THRESHOLDS array: [5, 15, 35, 75, 150]

3. BADGE_NAMES object with tier names per category:
- loader: ['Box Opener', 'Stock Filler', 'Warehouse Warrior', 'Intake Boss', 'Loading Legend']
- prepper: ['Queue Starter', 'Shot Lister', 'Lineup Pro', 'Queue Commander', 'Prep Legend']
- shooter: ['First Snap', 'Shutter Clicker', 'Photo Pro', 'Studio Star', 'Shoot Legend']
- editor: ['First Cut', 'Retoucher', 'Polish Pro', 'Edit Master', 'Edit Legend']
- stager: ['Curtain Call', 'Backstage Pass', 'Dress Rehearsal', 'Stage Director', 'Stage Legend']
- launcher: ['First Light', 'Go-Liver', 'Launch Pro', 'Ship Captain', 'Launch Legend']
- streak: ['Regular', 'Consistent', 'Dedicated', 'Devoted', 'Streak Legend']
- allstar: ['Rising Star', 'Standout', 'MVP', 'Superstar', 'All-Star Legend']

4. POINT_VALUES object:
{
  upload: 0.5,
  bulkUploadBonus: 3,
  moveToPhotoQueue: 0.25,
  moveToInShoot: 0.5,
  moveToEditing: 0.5,
  moveToStaged: 0.5,
  moveToLive: 1,
  dailyLogin: 0.25,
  streak7Day: 1,
  streak14Day: 2,
  streak30Day: 5,
  speedRun: 2,
  batchDrop: 1.5,
  zeroOverdueWeek: 1
}

5. Helper functions:
- getTierForPoints(points: number): number — returns 0-5 (0 = no badge yet)
- getNextTierThreshold(currentPoints: number): number | null
- getBadgeName(category: string, tier: number): string
- getProgressToNextTier(points: number): { current: number, next: number, percentage: number }

Keep code clean, typed, and well-organized.
```

---

### PROMPT 2: Rewards Service (Firestore)

```
Create the rewards service for Firestore operations.

Create src/services/rewardsService.ts with functions:

1. Initialize user rewards:
- createUserRewards(userId: string, brandId: string): Promise<UserRewards>
- getUserRewards(userId: string, brandId: string): Promise<UserRewards | null>
- getOrCreateUserRewards(userId: string, brandId: string): Promise<UserRewards>

2. Add points:
- addPoints(userId: string, brandId: string, category: RewardCategory, points: number, reason: string, productId?: string): Promise<void>
  - Updates UserRewards document (increment category points + totalPoints)
  - Creates PointTransaction document
  - Checks if tier unlocked, returns { newTier: number | null } if leveled up

3. Stage-specific point functions:
- awardUploadPoints(userId: string, brandId: string, productId: string, isBulk: boolean): Promise<void>
- awardStageChangePoints(userId: string, brandId: string, productId: string, newStage: string): Promise<void>
  - Maps stage to category: photo_queue→prepper, in_shoot→shooter, editing→editor, staged→stager, live→launcher
  - Checks for speed run bonus if going live

4. Streak management:
- recordLogin(userId: string, brandId: string): Promise<{ streakUpdated: boolean, newStreak: number, bonusAwarded: number }>
  - Check lastLoginDate
  - If same day: do nothing
  - If consecutive day: increment currentStreak, award 0.25 points, check streak bonuses (7/14/30 day)
  - If streak broken: reset to 1
  - Update lastLoginDate, longestStreak if needed

5. Bonus checks:
- checkSpeedRun(productId: string, userId: string, brandId: string): Promise<boolean>
  - Query product's stageHistory, check if warehouse→live < 48hrs
- checkBatchDrop(userId: string, brandId: string, date: Date): Promise<boolean>
  - Count products moved to live today by this user, if >= 5 award bonus

6. Query functions:
- getPointTransactions(userId: string, brandId: string, limit?: number): Promise<PointTransaction[]>
- getUserBadges(userId: string, brandId: string): Promise<{ category: string, tier: number, name: string, emoji: string }[]>
  - Derived from UserRewards.points — for each category, calculate tier
- getBrandLeaderboard(brandId: string, limit?: number): Promise<{ userId: string, displayName: string, totalPoints: number, topBadges: Badge[] }[]>

Firestore structure:
- userRewards/{odiu}_{brandId} — single doc per user per brand
- pointTransactions/{odiu}_{brandId}/transactions/{transactionId} — subcollection

Use batch writes where appropriate. Handle errors gracefully. All functions fully typed.
```

---

### PROMPT 3: Rewards Composable

```
Create the rewards composable for Vue components.

Create src/composables/useRewards.ts:

State (reactive):
- userRewards: UserRewards | null
- loading: boolean
- error: string | null
- recentTransaction: PointTransaction | null (for toast display)
- levelUpEvent: { category: string, newTier: number, badgeName: string } | null

Computed:
- totalPoints: number
- topBadges: top 3 badges by tier (for inline display)
- allBadges: all categories with current tier (0 if not unlocked)
- currentStreak: number
- streakActive: boolean (logged in today)

Actions:
- fetchRewards(brandId: string): Promise<void>
- recordActivity(category: RewardCategory, points: number, reason: string, productId?: string): Promise<void>
  - Calls rewardsService.addPoints
  - Updates local state optimistically
  - Sets recentTransaction for toast
  - Checks for level up, sets levelUpEvent if so
- checkDailyLogin(brandId: string): Promise<void>
  - Called on app mount
  - Calls rewardsService.recordLogin
  - Updates streak state
- clearLevelUpEvent(): void
- clearRecentTransaction(): void

Helper methods:
- getCategoryProgress(category: string): { points: number, tier: number, nextTier: number, percentage: number }
- hasBadge(category: string): boolean
- getBadgeForCategory(category: string): { emoji: string, name: string, tier: number } | null

The composable should:
- Auto-fetch rewards when brandId changes
- Integrate with auth store to get userId
- Provide everything components need to display rewards UI

Export as default function useRewards().
```

---

### PROMPT 4: Integrate Points into Existing Actions

```
Integrate the rewards system into existing product actions.

Modify src/composables/useProducts.ts:

1. Import useRewards composable

2. Update createProduct function:
- After successful product creation, call:
  rewards.recordActivity('loader', POINT_VALUES.upload, 'Uploaded product', productId)

3. Update bulkCreateProducts function:
- After successful bulk create, call:
  rewards.recordActivity('loader', POINT_VALUES.upload * count, 'Bulk uploaded products')
- If count >= 10, also award bulk bonus:
  rewards.recordActivity('loader', POINT_VALUES.bulkUploadBonus, 'Bulk upload bonus (10+)')

4. Update updateProductStage function:
- After successful stage change, map stage to category and award points:
  const stageToCategory = {
    'photo_queue': 'prepper',
    'in_shoot': 'shooter', 
    'editing': 'editor',
    'staged': 'stager',
    'live': 'launcher'
  }
  const category = stageToCategory[newStage]
  if (category) {
    rewards.recordActivity(category, POINT_VALUES[`moveTo${capitalize(newStage)}`], `Moved to ${newStage}`, productId)
  }
- If newStage is 'live', check for speed run bonus

Modify src/App.vue or main layout:
1. On app mount (after auth confirmed), call rewards.checkDailyLogin(brandId)
2. This handles streak tracking automatically

Keep existing functionality intact. Points are awarded as side effects, not blocking.
```

---

### PROMPT 5: Point Toast Component

```
Create the point toast notification component.

Create src/components/rewards/PointToast.vue:

Props:
- transaction: PointTransaction (points, category, reason)
- visible: boolean

Display:
- Small toast in bottom-right corner
- Shows: emoji + "+X pts" + reason
- Example: "📦 +0.5 pts — Uploaded product"
- Example: "🚀 +1 pt — Product Live!"

Styling:
- Slide in from right, fade out after 3 seconds
- Background: white with subtle shadow
- Left border accent in brand green (#1B7F56)
- Emoji large, points in bold, reason in muted text

Animation:
- Enter: slide in from right + fade in (300ms)
- Exit: fade out (200ms)
- Auto-dismiss after 3 seconds

Create src/components/rewards/PointToastContainer.vue:
- Watches useRewards().recentTransaction
- When new transaction, show toast
- Queue multiple toasts if rapid actions
- Max 3 visible at once, stack vertically

Add PointToastContainer to App.vue layout (always mounted when authenticated).
```

---

### PROMPT 6: Level Up Modal

```
Create the level up celebration modal.

Create src/components/rewards/LevelUpModal.vue:

Props:
- visible: boolean
- category: string
- tier: number
- badgeName: string

Display:
- Centered modal with backdrop
- "🎉 LEVEL UP! 🎉" header
- Large category emoji
- Badge name prominent: "You're now a Photo Pro!"
- Tier indicator: "Level 3 📸"
- Progress message: "Keep going! 40 more points to Edit Master"
- "Nice!" button to close

Styling:
- White card, rounded corners
- Confetti animation on open (CSS only, simple falling dots in brand colors)
- Badge emoji scales up on enter
- Button in brand green

Animation:
- Modal: scale up + fade in
- Confetti: randomized falling particles
- Auto-close after 5 seconds OR on button click

Create watcher in App.vue:
- Watch useRewards().levelUpEvent
- When set, show LevelUpModal
- On close, call rewards.clearLevelUpEvent()
```

---

### PROMPT 7: Badge Components

```
Create badge display components.

Create src/components/rewards/BadgeIcon.vue:
Props:
- category: string
- tier: number (0 = locked)
- size: 'sm' | 'md' | 'lg' (default 'md')
- showTooltip: boolean (default true)

Display:
- Shows category emoji
- If tier > 0: full color
- If tier = 0: grayscale + opacity 50%
- Tooltip shows: badge name + "X/Y points to next level"

Sizes:
- sm: 20px (for inline text)
- md: 32px (for cards)
- lg: 48px (for profile)

Create src/components/rewards/InlineBadges.vue:
Props:
- userId: string
- brandId: string
- maxBadges: number (default 3)

Display:
- Horizontal row of BadgeIcons (sm size)
- Shows top badges by tier (highest tiers first)
- Only shows unlocked badges (tier > 0)
- If no badges: shows nothing

Usage: next to user's name in comments, assignments, etc.
Example: "Elizabeth [📸][🚀][📦] 42.5 pts"

Create src/components/rewards/BadgeGrid.vue:
Props:
- rewards: UserRewards

Display:
- Grid of all 8 categories (2x4 or responsive)
- Each cell shows:
  - BadgeIcon (lg)
  - Category label
  - Badge name (or "Locked")
  - Progress bar to next tier
- Locked badges are visually dimmed

Styling: Clean grid, subtle borders, matches GreenRoom aesthetic.
```

---

### PROMPT 8: Profile Rewards Card

```
Create the expanded profile rewards card.

Create src/components/rewards/ProfileRewardsCard.vue:

Props:
- userId: string
- brandId: string
- expanded: boolean (default false)

Collapsed view (inline):
- User avatar + name
- InlineBadges (top 3)
- Total points
- Streak indicator (🔥 7) if active

Expanded view (full card):
```
┌─────────────────────────────────────────┐
│  [Avatar]  Elizabeth           42.5 pts │
│            Product Coordinator          │
│                                         │
│  [📸 Photo Pro] [🚀 Go-Liver] [📦 Box Opener] │
│                                         │
│  🔥 7 day streak                        │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Progress                               │
│                                         │
│  📸 Shooter   ████████░░  35/75        │
│  🚀 Launcher  ████░░░░░░  18/35        │
│  ✂️ Editor    ██░░░░░░░░   7/15        │
│  📦 Loader    █░░░░░░░░░   3/5         │
│                                         │
│  [View All Badges]                      │
└─────────────────────────────────────────┘
```

Features:
- Shows top 4 categories by points (with progress bars)
- "View All Badges" opens BadgeGrid in modal
- Streak shows current streak + fire emoji
- If streak is longest ever, show "🏆 Personal best!"

Create src/components/rewards/StreakIndicator.vue:
Props:
- streak: number
- isActive: boolean (logged in today)

Display:
- 🔥 + number
- If active: full color
- If not active today: slightly dimmed with "Log in to continue!"
- Pulse animation if streak >= 7
```

---

### PROMPT 9: Progress Bar Component

```
Create a reusable progress bar for rewards.

Create src/components/rewards/ProgressBar.vue:

Props:
- current: number
- max: number
- color: string (default brand green #1B7F56)
- size: 'sm' | 'md' (default 'sm')
- showLabel: boolean (default true)

Display:
- Horizontal bar with fill
- Rounded ends
- If showLabel: "X/Y" text to the right

Sizes:
- sm: height 6px, label text-xs
- md: height 10px, label text-sm

Styling:
- Background: gray-200
- Fill: props.color
- Smooth width transition (300ms)
- If current >= max: add subtle glow/pulse

Computed:
- percentage: Math.min((current / max) * 100, 100)

Usage:
<ProgressBar :current="35" :max="75" />
<ProgressBar :current="points.loader" :max="nextTierThreshold" color="#1B7F56" />
```

---

### PROMPT 10: Settings & Leaderboard (Optional)

```
Create optional rewards features: notification settings and leaderboard.

Create src/components/rewards/RewardsSettings.vue:
- Toggle: Show point toasts (default on)
- Toggle: Show level up celebrations (default on)
- Toggle: Show badges on profile (default on)
- Store preferences in user profile or localStorage

Create src/components/rewards/Leaderboard.vue:
Props:
- brandId: string
- period: 'week' | 'month' | 'alltime' (default 'week')

Display:
- Top 10 users by points for selected period
- Each row: rank, avatar, name, top badge, points
- Highlight current user's row
- Period toggle tabs

```
┌─────────────────────────────────────────┐
│  Leaderboard          [Week] Month All  │
│                                         │
│  1. 🥇 Sarah M.      [🚀5] 127.5 pts   │
│  2. 🥈 Mike T.       [📸4]  98.0 pts   │
│  3. 🥉 Elizabeth     [📸3]  42.5 pts ← │
│  4.    Jordan K.     [📦2]  38.0 pts   │
│  5.    Alex R.       [🔥2]  31.5 pts   │
│                                         │
└─────────────────────────────────────────┘
```

Add to Dashboard or as separate view in sidebar.

Note: Leaderboard is optional/can be toggled per brand in settings. Some teams prefer collaborative over competitive.
```

---

### PROMPT 11: Firestore Security Rules (Rewards)

```
Add Firestore security rules for the rewards system.

Update firestore.rules to include:

1. userRewards collection:
- Document ID format: {odiu}_{brandId}
- Read: user can read their own rewards, OR brand admins can read any member's rewards
- Create: only system/cloud functions (or user creating their own on first action)
- Update: only system/cloud functions (points should not be client-editable for integrity)

For MVP without cloud functions, allow:
- Users can update their own rewards document
- But in production, move point-awarding to cloud functions for security

2. pointTransactions subcollection:
- Read: user can read their own transactions
- Create: user can create their own transactions (MVP)
- Update/Delete: never allowed (audit trail)

3. Consider adding:
- Validation that points values match expected amounts
- Rate limiting to prevent abuse

Example rules:
```
match /userRewards/{odid} {
  allow read: if request.auth != null && 
    (odid.split('_')[0] == request.auth.uid || 
     isBrandAdmin(odid.split('_')[1], request.auth.uid));
  allow create: if request.auth != null && 
    odid.split('_')[0] == request.auth.uid;
  allow update: if request.auth != null && 
    odid.split('_')[0] == request.auth.uid;
}

match /userRewards/{odid}/transactions/{txId} {
  allow read: if request.auth != null && 
    odid.split('_')[0] == request.auth.uid;
  allow create: if request.auth != null && 
    odid.split('_')[0] == request.auth.uid;
  allow update, delete: if false;
}
```

Add comments explaining security model.
```

---

### PROMPT 12: Testing & Polish

```
Final polish for the rewards system.

1. Add loading states:
- Skeleton loaders for ProfileRewardsCard
- Spinner while fetching rewards
- Optimistic UI updates for point additions

2. Error handling:
- Graceful fallback if rewards fail to load
- Retry logic for point transactions
- Queue failed transactions for retry

3. Edge cases:
- New user with no rewards yet
- User switching brands (reload rewards)
- Offline handling (queue points, sync when online)

4. Animations polish:
- Smooth number counting animation for points
- Badge unlock "pop" animation
- Progress bar fill animation
- Confetti performance optimization

5. Accessibility:
- ARIA labels on badges ("Photo Pro badge, level 3")
- Screen reader announcements for point toasts
- Keyboard navigation for badge grid

6. Performance:
- Lazy load LeaderBoard component
- Cache rewards locally (refresh on focus)
- Debounce rapid point additions
- Batch Firestore writes where possible

7. Add unit tests for:
- getTierForPoints helper
- Streak calculation logic
- Point values mapping
- Badge unlock detection

Run through full flow:
- Upload product → see toast → check points
- Move through pipeline → see toasts for each stage
- Hit tier threshold → see level up modal
- Check profile → see badges and progress
- Verify leaderboard updates
```

---

## Quick Reference

### Firestore Collections

```
/userRewards
  /{odiu}_{brandId}
    - points: { loader, prepper, shooter, editor, stager, launcher, streak, allstar }
    - totalPoints: number
    - currentStreak: number
    - longestStreak: number
    - lastLoginDate: timestamp
    - speedRuns: number
    - batchDrops: number
    - zeroOverdueWeeks: number

  /{odiu}_{brandId}/transactions
    /{transactionId}
      - category: string
      - points: number
      - reason: string
      - productId?: string
      - createdAt: timestamp
```

### Component Tree

```
App.vue
├── PointToastContainer (always mounted)
├── LevelUpModal (shown on level up)
└── [Views]
    ├── DashboardView
    │   ├── ProfileRewardsCard (expanded)
    │   └── Leaderboard (optional)
    ├── PipelineView
    │   └── ProductCard → InlineBadges (on assignee)
    └── SettingsView
        └── RewardsSettings
```

### Stage → Category Mapping

```typescript
const STAGE_TO_CATEGORY: Record<string, RewardCategory> = {
  'photo_queue': 'prepper',
  'in_shoot': 'shooter',
  'editing': 'editor',
  'staged': 'stager',
  'live': 'launcher'
}
```

### Points Quick Reference

| Action | Points | Category |
|--------|--------|----------|
| Upload | +0.5 | loader |
| Bulk bonus (10+) | +3 | loader |
| → Photo Queue | +0.25 | prepper |
| → In Shoot | +0.5 | shooter |
| → Editing | +0.5 | editor |
| → Staged | +0.5 | stager |
| → Live | +1 | launcher |
| Daily login | +0.25 | streak |
| 7-day streak | +1 | streak |
| 14-day streak | +2 | streak |
| 30-day streak | +5 | streak |
| Speed run | +2 | launcher |
| Batch drop (5+) | +1.5 | launcher |
| Zero overdue week | +1 | allstar |
