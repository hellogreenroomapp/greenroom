/**
 * Marketing integrations — pull-only. No writes to Klaviyo or Shopify.
 */

export const INTEGRATIONS_READ_ONLY = true as const

/** Klaviyo private API key scopes (read-only custom key). */
export const KLAVIYO_READ_SCOPES = [
  'campaigns:read',
  'lists:read',
  'segments:read',
  'metrics:read',
] as const

/** Klaviyo — synced today. */
export const KLAVIYO_PULL_ACTIVE = {
  campaigns: [
    'Campaign name',
    'Scheduled send date (calendar)',
    'Status (draft, scheduled, sent, etc.)',
    'Channel (email / SMS)',
    'Included & excluded audiences on each campaign',
  ],
  audiences: [
    'List names',
    'Segment names + profile counts (where available)',
  ],
  cadence: [
    'Computed from scheduled campaigns: sends in last/next 30 days',
    'Average days between scheduled sends',
    'Email vs SMS mix',
  ],
  performance: [
    'Open rate, click rate, and revenue (90d) via Klaviyo Reporting API',
    'Campaign names matched to GreenRoom product and collection names (SKU via Shopify later)',
    'Send suggestions for upcoming go-live based on past naming & performance',
  ],
} as const

/** Shopify — planned read-only pulls. */
export const SHOPIFY_PULL_PLANNED = {
  inventory: [
    'On-hand and incoming inventory by SKU / location',
    'Aligns with GreenRoom arrivals',
  ],
  sales: [
    'Order counts and revenue over time (for strategy)',
    'Product-level sales velocity',
    'Optional: compare to launch / campaign dates',
  ],
  catalog: [
    'Product publish dates',
    'Collection launch dates',
  ],
} as const
