import { Timestamp } from 'firebase/firestore'

import type { SavedMarketingStory } from '@/types/marketingSavedStories'

/** Per-brand marketing integrations and sync preferences (tokens live server-side when wired). */
export interface BrandMarketingSettings {
  /** Planned email/SMS volume — story calendar and intelligence use these targets */
  cadenceTargets?: {
    emailsPerMonth?: number | null
    smsPerMonth?: number | null
  }
  /** User-pinned story calendar beats (preserved when cadence plan changes) */
  savedStories?: SavedMarketingStory[]
  klaviyo?: {
    status: 'disconnected' | 'connected'
    accountLabel?: string
    pullCampaigns: boolean
    pullSmsCampaigns: boolean
    pullLists: boolean
    pullSegments: boolean
    lastSyncAt?: Timestamp
    lastSyncCount?: number
    lastSyncError?: string
  }
  shopify?: {
    status: 'disconnected' | 'connected'
    shopDomain?: string
    pullPublishDates: boolean
    pullIncomingInventory: boolean
    pullCollectionLaunches: boolean
    /** Planned — not synced yet */
    pullSalesData?: boolean
  }
}

export const DEFAULT_BRAND_MARKETING_SETTINGS: BrandMarketingSettings = {
  cadenceTargets: {
    emailsPerMonth: 8,
    smsPerMonth: 4,
  },
  klaviyo: {
    status: 'disconnected',
    pullCampaigns: true,
    pullSmsCampaigns: false,
    pullLists: true,
    pullSegments: true,
  },
  shopify: {
    status: 'disconnected',
    pullPublishDates: true,
    pullIncomingInventory: true,
    pullCollectionLaunches: true,
    pullSalesData: true,
  },
}

export interface Brand {
  id: string
  name: string
  slug: string
  logoUrl?: string
  createdAt: Timestamp
  ownerId: string
  marketing?: BrandMarketingSettings
}

export interface MoodboardItem {
  id: string
  imageUrl: string
  x: number
  y: number
  width: number
  height: number
  createdAt: Timestamp
}

export interface Look {
  id: string
  name: string // e.g., "OUTFIT #11"
  productIds: string[] // Array of product IDs in this look
  inspirationImageUrl?: string // Optional inspiration image
  note?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Project {
  id: string
  brandId: string
  name: string
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'evergreen'
  year: number
  status: 'active' | 'archived'
  startDate?: Timestamp
  endDate?: Timestamp
  moodboard?: MoodboardItem[]
  shotList?: Look[]
  /** Short collection note shown on the collection overview dashboard */
  dashboardSummary?: string
  createdAt: Timestamp
}

export interface Product {
  id: string
  brandId: string
  projectId?: string
  sku: string
  name: string
  gender?: 'mens' | 'womens' | 'unisex'
  category: string
  stage: 'samples' | 'warehouse' | 'photo_queue' | 'in_shoot' | 'editing' | 'staged' | 'live'
  priority: 'high' | 'medium' | 'low'
  status: 'on-time' | 'delayed' | 'complete'
  shotType: ('flat_lay' | 'on_model' | 'lifestyle' | 'ghost_mannequin')[]
  goLiveDate?: Timestamp
  scheduledShootDate?: Timestamp
  tentativeExFactoryDate?: Timestamp
  factoryShipDate?: Timestamp
  orderId?: string
  shootStatus?: 'scheduled' | 'confirmed' | 'rescheduled' | 'cancelled'
  imageUrl?: string
  assignedTo?: string
  tags: string[]
  colors?: ProductColor[]
  notes?: string
  archived?: boolean
  sample?: boolean
  /** Sample / ecomm photography assets are done — product won't need new assets on arrival */
  ecommAssetsComplete?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  stageHistory: StageChange[]
}

export interface ProductColor {
  name: string
  complete: boolean
  /** Short code for this colorway (e.g. BLK) — used with main product SKU */
  colorCode?: string
  /** Variant SKU; defaults to `{product.sku}-{colorCode}` when code is set */
  sku?: string
  imageUrl?: string
  tags?: string[] // Color-level tags like "restock" or "new color"
}

export interface StageChange {
  from: string
  to: string
  changedAt: Timestamp
  changedBy: string
}

export interface BrandMember {
  id: string
  brandId: string
  userId: string
  email: string
  displayName: string
  role: 'owner' | 'admin' | 'manager' | 'photographer' | 'viewer'
  invitedAt: Timestamp
  joinedAt?: Timestamp
  status: 'pending' | 'active'
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  createdAt: Timestamp
}

export const PIPELINE_STAGES: Product['stage'][] = [
  'samples',
  'warehouse',
  'photo_queue',
  'in_shoot',
  'editing',
  'staged',
  'live',
]

// Map column numbers (0-6) to pipeline stages
export function getStageFromColumn(column: number): Product['stage'] {
  const stageMap: Record<number, Product['stage']> = {
    0: 'samples',
    1: 'warehouse',
    2: 'photo_queue',
    3: 'in_shoot',
    4: 'editing',
    5: 'staged',
    6: 'live',
  }
  return stageMap[column] || 'samples'
}

export function getColumnFromStage(stage: Product['stage']): number {
  const columnMap: Record<Product['stage'], number> = {
    samples: 0,
    warehouse: 1,
    photo_queue: 2,
    in_shoot: 3,
    editing: 4,
    staged: 5,
    live: 6,
  }
  return columnMap[stage] || 0
}

export const STAGE_LABELS: Record<Product['stage'], string> = {
  samples: 'In Production',
  warehouse: 'Warehouse',
  photo_queue: 'Photo Queue',
  in_shoot: 'In Shoot',
  editing: 'Editing',
  staged: 'Staged',
  live: 'Live',
}

export const PRIORITY_LABELS: Record<Product['priority'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const STATUS_LABELS: Record<Product['status'], string> = {
  'on-time': 'On Time',
  'delayed': 'Delayed',
  'complete': 'Complete',
}

export const SHOT_TYPE_LABELS: Record<Product['shotType'][number], string> = {
  flat_lay: 'Flat Lay',
  on_model: 'On Model',
  lifestyle: 'Lifestyle',
  ghost_mannequin: 'Ghost Mannequin',
}

export interface BrandInvite {
  id: string
  brandId: string
  email: string
  role: BrandMember['role']
  invitedBy: string
  createdAt: Timestamp
  expiresAt: Timestamp
  status: 'pending' | 'accepted' | 'expired'
}
