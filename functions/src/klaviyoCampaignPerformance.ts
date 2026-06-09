import { KLAVIYO_API_BASE } from './config'
import { klaviyoJsonApiHeaders, klaviyoPrivateKeyHeaders } from './klaviyoApiKey'

export interface CampaignMeta {
  id: string
  name: string
  channel: 'email' | 'sms'
  scheduledAt: Date | null
  status: string | null
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

const PLACED_ORDER_PATTERNS: { pattern: RegExp; score: number }[] = [
  { pattern: /^placed\s*order$/i, score: 100 },
  { pattern: /placed\s*order/i, score: 90 },
  { pattern: /^ordered\s*product$/i, score: 80 },
  { pattern: /ordered\s*product/i, score: 70 },
  { pattern: /^purchase$/i, score: 60 },
  { pattern: /fulfilled\s*order/i, score: 50 },
]

interface KlaviyoMetricRow {
  id: string
  name: string
  integrationName: string | null
}

type MetricLookupResult =
  | { ok: true; metric: KlaviyoMetricRow }
  | { ok: false; error: string }

async function fetchAllKlaviyoMetrics(apiKey: string): Promise<{
  metrics: KlaviyoMetricRow[]
  error: string | null
}> {
  const all: KlaviyoMetricRow[] = []
  let url: string | null = `${KLAVIYO_API_BASE}/metrics/?fields[metric]=name,integration`
  let pages = 0
  const maxPages = 100

  while (url && pages < maxPages) {
    pages++
    const res = await fetch(url, { headers: klaviyoPrivateKeyHeaders(apiKey) })
    if (!res.ok) {
      const text = await res.text()
      const snippet = text.length > 200 ? `${text.slice(0, 200)}…` : text
      if (res.status === 401 || res.status === 403) {
        return {
          metrics: all,
          error: `Metrics API denied (${res.status}). Add metrics:read to your Klaviyo private API key, reconnect, and sync again.`,
        }
      }
      return {
        metrics: all,
        error: `Metrics API error (${res.status}): ${snippet}`,
      }
    }

    const json = (await res.json()) as {
      data?: {
        id: string
        attributes?: {
          name?: string
          integration?: { name?: string; category?: string }
        }
      }[]
      links?: { next?: string | null }
    }

    for (const row of json.data || []) {
      all.push({
        id: row.id,
        name: row.attributes?.name?.trim() || 'Metric',
        integrationName: row.attributes?.integration?.name?.trim() || null,
      })
    }

    url = json.links?.next ?? null
  }

  return { metrics: all, error: null }
}

function scoreMetric(metric: KlaviyoMetricRow): number {
  let best = 0
  const name = metric.name
  for (const { pattern, score } of PLACED_ORDER_PATTERNS) {
    if (pattern.test(name)) best = Math.max(best, score)
  }
  if (/shopify/i.test(metric.integrationName || '')) best += 5
  return best
}

async function findPlacedOrderMetric(apiKey: string): Promise<MetricLookupResult> {
  const { metrics, error } = await fetchAllKlaviyoMetrics(apiKey)
  if (error) return { ok: false, error }
  if (metrics.length === 0) {
    return {
      ok: false,
      error: 'No metrics returned from Klaviyo. Check metrics:read on your API key.',
    }
  }

  const ranked = metrics
    .map((m) => ({ metric: m, score: scoreMetric(m) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]?.metric
  if (best) return { ok: true, metric: best }

  const sample = metrics
    .slice(0, 8)
    .map((m) => m.name)
    .join(', ')
  return {
    ok: false,
    error: `Could not find a Placed Order metric among ${metrics.length} Klaviyo metrics (e.g. Shopify "Placed Order"). Samples: ${sample}. Revenue stats need that metric; opens/clicks still require a valid conversion metric ID in Klaviyo Reporting.`,
  }
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function mergeStats(
  existing: KlaviyoCampaignPerformanceRow | undefined,
  stats: Record<string, unknown>,
  channel: 'email' | 'sms'
): KlaviyoCampaignPerformanceRow {
  const recipients = num(stats.recipients) ?? 0
  const prevRecipients = existing?.recipients ?? 0
  const totalRecipients = prevRecipients + recipients

  const weight = totalRecipients > 0 ? recipients / totalRecipients : 1
  const prevWeight = 1 - weight

  const blend = (a: number | null, b: number | null): number | null => {
    if (a == null && b == null) return null
    if (a == null) return b
    if (b == null) return a
    return a * prevWeight + b * weight
  }

  return {
    campaignId: existing?.campaignId || '',
    name: existing?.name || '',
    channel,
    openRate: blend(existing?.openRate ?? null, num(stats.open_rate)),
    clickRate: blend(existing?.clickRate ?? null, num(stats.click_rate)),
    conversionRate: blend(existing?.conversionRate ?? null, num(stats.conversion_rate)),
    conversionValue: (existing?.conversionValue ?? 0) + (num(stats.conversion_value) ?? 0),
    recipients: totalRecipients || null,
    revenuePerRecipient: blend(
      existing?.revenuePerRecipient ?? null,
      num(stats.revenue_per_recipient)
    ),
  }
}

export async function fetchKlaviyoCampaignPerformance(
  apiKey: string,
  campaignMeta: CampaignMeta[]
): Promise<{ campaigns: KlaviyoCampaignPerformanceRow[]; summary: KlaviyoPerformanceSummary }> {
  const nameById = new Map(campaignMeta.map((c) => [c.id, c.name]))
  const channelById = new Map(campaignMeta.map((c) => [c.id, c.channel]))

  const metricResult = await findPlacedOrderMetric(apiKey)
  if (!metricResult.ok) {
    return {
      campaigns: [],
      summary: {
        available: false,
        timeframe: 'last_90_days',
        error: metricResult.error,
        campaignCount: 0,
        avgOpenRate: null,
        avgClickRate: null,
        totalConversionValue: null,
        topByRevenue: [],
      },
    }
  }

  const metric = metricResult.metric

  const body = {
    data: {
      type: 'campaign-values-report',
      attributes: {
        timeframe: { key: 'last_90_days' },
        conversion_metric_id: metric.id,
        statistics: [
          'open_rate',
          'click_rate',
          'conversion_rate',
          'conversion_value',
          'recipients',
          'revenue_per_recipient',
        ],
        group_by: ['campaign_message_id', 'campaign_id', 'send_channel'],
      },
    },
  }

  const res = await fetch(`${KLAVIYO_API_BASE}/campaign-values-reports/`, {
    method: 'POST',
    headers: klaviyoJsonApiHeaders(apiKey),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text
    const unsupported = /does not support querying|conversion metric/i.test(text)
    return {
      campaigns: [],
      summary: {
        available: false,
        timeframe: 'last_90_days',
        conversionMetricName: metric.name,
        error: unsupported
          ? `Klaviyo rejected "${metric.name}" for campaign revenue reports. In Klaviyo → Analytics → Metrics, use the Placed Order metric from Shopify (or your store integration). (${snippet})`
          : `Campaign performance unavailable (${res.status}). ${snippet}`,
        campaignCount: 0,
        avgOpenRate: null,
        avgClickRate: null,
        totalConversionValue: null,
        topByRevenue: [],
      },
    }
  }

  const json = (await res.json()) as {
    data?: {
      attributes?: {
        results?: {
          groupings?: { campaign_id?: string; send_channel?: string }
          statistics?: Record<string, unknown>
        }[]
      }
    }
  }

  const byCampaign = new Map<string, KlaviyoCampaignPerformanceRow>()

  for (const row of json.data?.attributes?.results || []) {
    const campaignId = row.groupings?.campaign_id
    if (!campaignId) continue
    const channelRaw = row.groupings?.send_channel === 'sms' ? 'sms' : 'email'
    const existing = byCampaign.get(campaignId)
    const merged = mergeStats(
      existing
        ? { ...existing, campaignId, name: nameById.get(campaignId) || existing.name }
        : undefined,
      row.statistics || {},
      channelById.get(campaignId) || channelRaw
    )
    merged.campaignId = campaignId
    merged.name = nameById.get(campaignId) || merged.name || 'Campaign'
    byCampaign.set(campaignId, merged)
  }

  const campaigns = [...byCampaign.values()].filter((c) => c.recipients != null && c.recipients > 0)

  let openSum = 0
  let openWeight = 0
  let clickSum = 0
  let clickWeight = 0
  let totalConversionValue = 0

  for (const c of campaigns) {
    const w = c.recipients || 0
    if (c.openRate != null && w > 0) {
      openSum += c.openRate * w
      openWeight += w
    }
    if (c.clickRate != null && w > 0) {
      clickSum += c.clickRate * w
      clickWeight += w
    }
    totalConversionValue += c.conversionValue ?? 0
  }

  const topByRevenue = [...campaigns]
    .sort((a, b) => (b.conversionValue ?? 0) - (a.conversionValue ?? 0))
    .slice(0, 8)

  return {
    campaigns,
    summary: {
      available: true,
      timeframe: 'last_90_days',
      conversionMetricName: metric.name,
      campaignCount: campaigns.length,
      avgOpenRate: openWeight > 0 ? Math.round((openSum / openWeight) * 1000) / 1000 : null,
      avgClickRate: clickWeight > 0 ? Math.round((clickSum / clickWeight) * 1000) / 1000 : null,
      totalConversionValue: totalConversionValue > 0 ? totalConversionValue : null,
      topByRevenue,
    },
  }
}
