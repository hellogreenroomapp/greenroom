import { Timestamp } from 'firebase/firestore'

export interface KlaviyoAudienceRow {
  id: string
  name: string
  profileCount?: number | null
}

export interface KlaviyoCadenceSummary {
  scheduledCampaignCount: number
  emailCount: number
  smsCount: number
  sendsLast30Days: number
  sendsNext30Days: number
  /** Median gap in days between scheduled sends; null if fewer than 2 dates */
  medianDaysBetweenSends: number | null
}

export interface KlaviyoCampaignPerformanceRow {
  campaignId: string
  name: string
  channel: 'email' | 'sms'
  openRate: number | null
  clickRate: number | null
  conversionRate: number | null
  conversionValue: number | null
  recipients: number | null
  revenuePerRecipient: number | null
}

export interface KlaviyoPerformanceSummary {
  available: boolean
  timeframe: string
  conversionMetricName?: string
  error?: string
  campaignCount: number
  avgOpenRate: number | null
  avgClickRate: number | null
  totalConversionValue: number | null
  topByRevenue: KlaviyoCampaignPerformanceRow[]
}

export interface KlaviyoAudienceSyncMeta {
  listsCount: number
  segmentsCount: number
  listsError: string | null
  segmentsError: string | null
}

/** Rolled-up list/segment sizes from Klaviyo (not engagement rates). */
export interface KlaviyoAudienceSummary {
  listsWithCount: number
  segmentsWithCount: number
  totalListProfiles: number | null
  largestList: { name: string; profileCount: number } | null
  largestSegment: { name: string; profileCount: number } | null
}

export interface MarketingKlaviyoInsights {
  id: string
  brandId: string
  syncedAt: Timestamp
  cadence: KlaviyoCadenceSummary
  lists: KlaviyoAudienceRow[]
  segments: KlaviyoAudienceRow[]
  audienceSync?: KlaviyoAudienceSyncMeta | null
  audienceSummary?: KlaviyoAudienceSummary | null
  performance?: {
    summary: KlaviyoPerformanceSummary
    campaigns: KlaviyoCampaignPerformanceRow[]
  } | null
}
