import { Timestamp } from 'firebase/firestore'

/** Third-party platforms we plan to connect per brand */
export type IntegrationProvider = 'klaviyo' | 'shopify'

export type IntegrationStatus = 'disconnected' | 'pending' | 'connected' | 'error'

/**
 * Stored in Firestore at `brandIntegrations/{brandId}_{provider}`.
 * Access tokens must live server-side only (Cloud Functions + Secret Manager).
 */
export interface BrandIntegration {
  id: string
  brandId: string
  provider: IntegrationProvider
  status: IntegrationStatus
  /** Shopify myshopify.com hostname, e.g. "acme-brand" */
  shopDomain?: string
  /** Display label from OAuth account metadata */
  externalAccountName?: string
  scopes: string[]
  connectedAt?: Timestamp
  lastSyncAt?: Timestamp
  lastSyncError?: string
}

/** Unified calendar row — GreenRoom today; external sources in later phases */
export type MarketingEventSource = 'greenroom' | 'klaviyo' | 'shopify'

export type MarketingEventKind =
  | 'arrival_estimated'
  | 'factory_ship'
  | 'photo_shoot'
  | 'go_live'
  | 'email_campaign'
  | 'sms_campaign'
  | 'shopify_publish'
  | 'shopify_collection_launch'

export interface MarketingCalendarEvent {
  id: string
  source: MarketingEventSource
  kind: MarketingEventKind
  /** Product name or external campaign title */
  title: string
  date: Date
  productId?: string
  sku?: string
  /** Pipeline stage for GreenRoom rows; kind label for external sends */
  stateLabel?: string
  /** External id when synced from Klaviyo / Shopify */
  externalId?: string
  meta?: Record<string, string>
}
