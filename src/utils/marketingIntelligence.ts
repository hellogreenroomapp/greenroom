import type { Product, Project } from '@/types'
import type { BrandMarketingSettings } from '@/types'
import type { MarketingKlaviyoInsights } from '@/types/klaviyoInsights'
import type { MarketingCalendarEvent } from '@/types/integrations'
import type { MarketingSuggestion } from '@/utils/marketingSuggestions'
import {
  buildLaunchSendRecommendations,
  formatCurrency,
  formatRate,
  matchCampaignsToCatalog,
} from '@/utils/klaviyoCampaignMatch'
import { storyGenderLabel, storyGenderAudience } from '@/utils/marketingStoryCalendar'
import { getMarketingCadenceTargets } from '@/utils/marketingCadenceTargets'
import { upcomingPipelineProducts } from '@/utils/marketingProductScope'

const MS_DAY = 24 * 60 * 60 * 1000

export type IntelligenceTone = 'positive' | 'neutral' | 'attention' | 'critical'

export type IntelligenceCategory =
  | 'klaviyo'
  | 'pipeline'
  | 'audience'
  | 'performance'
  | 'integration'

export interface IntelligenceBullet {
  id: string
  tone: IntelligenceTone
  category: IntelligenceCategory
  label: string
  detail?: string
}

/** Metric or insight card in the green hero row (4–5 across). */
export interface IntelligenceHeroCard {
  id: string
  type: 'metric' | 'insight'
  /** Large value for metric cards */
  value?: string
  label: string
  detail?: string
  tone?: IntelligenceTone
  accent?: IntelligenceStatChip['accent']
}

export interface IntelligenceSection {
  id: IntelligenceCategory
  title: string
  bullets: IntelligenceBullet[]
}

const SECTION_META: { id: IntelligenceCategory; title: string }[] = [
  { id: 'klaviyo', title: 'Klaviyo & scheduling' },
  { id: 'pipeline', title: 'Pipeline & launches' },
  { id: 'audience', title: 'Audiences' },
  { id: 'performance', title: 'Campaign performance' },
  { id: 'integration', title: 'Setup' },
]

function groupBulletsIntoSections(bullets: IntelligenceBullet[]): IntelligenceSection[] {
  return SECTION_META.map((meta) => ({
    id: meta.id,
    title: meta.title,
    bullets: bullets.filter((b) => b.category === meta.id),
  })).filter((s) => s.bullets.length > 0)
}

export interface IntelligenceStatChip {
  id: string
  label: string
  value: string
  hint?: string
  accent: 'emerald' | 'violet' | 'amber' | 'sky' | 'neutral'
}

export interface IntelligenceHighlight {
  id: string
  title: string
  subtitle: string
  metric?: string
  tone: IntelligenceTone
}

export interface MarketingIntelligenceSummary {
  headline: string
  subhead: string
  /** Grouped takeaways (flat bullets kept for tests/tools) */
  sections: IntelligenceSection[]
  bullets: IntelligenceBullet[]
  /** Hero row: metrics + cadence insights side by side */
  heroCards: IntelligenceHeroCard[]
  highlights: IntelligenceHighlight[]
  performanceAvailable: boolean
  generatedAt: Date
}

export type SuggestedCalendarItemKind =
  | 'suggested_email'
  | 'suggested_sms'
  | 'suggested_teaser'
  | 'pipeline'
  | 'klaviyo'

export interface SuggestedCalendarItem {
  id: string
  date: Date
  kind: SuggestedCalendarItemKind
  title: string
  subtitle?: string
  sku?: string
  /** True when synced from Klaviyo or a firm pipeline date */
  confirmed: boolean
  reason?: string
}

function productDate(
  product: Product,
  field: 'goLiveDate' | 'tentativeExFactoryDate' | 'factoryShipDate' | 'scheduledShootDate'
): Date | null {
  const ts = product[field]
  if (!ts || typeof ts.toMillis !== 'function') return null
  try {
    const ms = ts.toMillis()
    return Number.isFinite(ms) && ms > 0 ? ts.toDate() : null
  } catch {
    return null
  }
}

function daysFromNow(date: Date, from = new Date()): number {
  return Math.round((date.getTime() - from.getTime()) / MS_DAY)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  d.setHours(12, 0, 0, 0)
  return d
}

function activeProducts(products: Product[]): Product[] {
  return products.filter((p) => !p.archived)
}

function hasKlaviyoNearDate(events: MarketingCalendarEvent[], date: Date, windowDays: number): boolean {
  const target = date.getTime()
  return events.some((e) => {
    if (e.source !== 'klaviyo') return false
    const diff = Math.abs(e.date.getTime() - target) / MS_DAY
    return diff <= windowDays
  })
}

/** Lightweight summary when full analysis fails or is still running. */
export function buildMinimalIntelligenceSummary(
  marketing?: BrandMarketingSettings
): MarketingIntelligenceSummary {
  const cadenceTargets = getMarketingCadenceTargets(marketing)
  return {
    headline: 'Marketing overview ready',
    subhead: 'Connect Klaviyo in Settings for cadence and performance insights.',
    sections: [],
    bullets: [],
    heroCards: [
      {
        id: 'cadence-plan',
        type: 'metric',
        value: `${cadenceTargets.emailsPerMonth}/${cadenceTargets.smsPerMonth}`,
        label: 'Plan (email/SMS mo)',
        detail: 'Story calendar targets',
      },
    ],
    highlights: [],
    performanceAvailable: false,
    generatedAt: new Date(),
  }
}

/** Narrative “GreenRoom Intelligence” from pipeline + Klaviyo cadence (no external AI). */
export function buildMarketingIntelligenceSummary(
  products: Product[],
  marketing: BrandMarketingSettings | undefined,
  insights: MarketingKlaviyoInsights | null,
  suggestions: MarketingSuggestion[],
  projects: Project[] = []
): MarketingIntelligenceSummary {
  const now = new Date()
  const klaviyoOn = marketing?.klaviyo?.status === 'connected'
  const highCount = suggestions.filter((s) => s.priority === 'high').length

  const goLiveNext30 = upcomingPipelineProducts(products, 30, 0, now)

  let arrivingNext14Count = 0
  const arrivalScanCap = Math.min(products.length, 2500)
  for (let i = 0; i < arrivalScanCap; i++) {
    const p = products[i]
    if (!p || p.archived || p.stage === 'live') continue
    const ship = productDate(p, 'factoryShipDate')
    const ex = productDate(p, 'tentativeExFactoryDate')
    const d = ship || ex
    if (!d) continue
    const days = daysFromNow(d, now)
    if (days >= -3 && days <= 14) arrivingNext14Count++
  }

  const bullets: IntelligenceBullet[] = []
  const heroCards: IntelligenceHeroCard[] = []
  const highlights: IntelligenceHighlight[] = []
  const perf = insights?.performance
  const perfSummary = perf?.summary
  const perfCampaigns = (perf?.campaigns ?? []).slice(0, 400)
  const matchProducts = upcomingPipelineProducts(products, 120, 60, now)
  const productById = new Map<string, Product>()
  for (const p of matchProducts) productById.set(p.id, p)
  for (const p of goLiveNext30) productById.set(p.id, p)
  const catalogMatches = matchCampaignsToCatalog(perfCampaigns, matchProducts, projects)
  const launchRecs = buildLaunchSendRecommendations(
    matchProducts,
    perfCampaigns,
    projects,
    45,
    catalogMatches
  )

  const cadenceTargets = getMarketingCadenceTargets(marketing)
  heroCards.push({
    id: 'cadence-plan',
    type: 'metric',
    value: `${cadenceTargets.emailsPerMonth}/${cadenceTargets.smsPerMonth}`,
    label: 'Plan (email/SMS mo)',
    detail: 'Story calendar targets',
  })

  if (klaviyoOn && insights) {
    const { cadence } = insights

    heroCards.push({
      id: 'sends-30',
      type: 'metric',
      value: String(cadence.sendsLast30Days),
      label: 'Sends (30d)',
      detail: 'Synced campaigns',
      accent: 'violet',
    })
    heroCards.push({
      id: 'scheduled-30',
      type: 'metric',
      value: String(cadence.sendsNext30Days),
      label: 'Scheduled ahead',
      accent: cadence.sendsNext30Days === 0 ? 'amber' : 'emerald',
    })
    if (perfSummary?.available && perfSummary.avgOpenRate != null) {
      heroCards.push({
        id: 'avg-open',
        type: 'metric',
        value: formatRate(perfSummary.avgOpenRate),
        label: 'Avg open (90d)',
        detail: `${perfSummary.campaignCount} campaigns`,
        accent: 'emerald',
      })
    }
    if (perfSummary?.available && perfSummary.totalConversionValue != null) {
      heroCards.push({
        id: 'revenue-90',
        type: 'metric',
        value: formatCurrency(perfSummary.totalConversionValue),
        label: 'Revenue (90d)',
        detail: perfSummary.conversionMetricName,
        accent: 'sky',
      })
    }

    if (cadence.medianDaysBetweenSends != null) {
      const med = cadence.medianDaysBetweenSends
      if (med <= 2) {
        heroCards.push({
          id: 'cadence-frequency',
          type: 'insight',
          tone: 'attention',
          label: `Aggressive cadence (~${med} day median between scheduled sends)`,
          detail: `Mix: ${cadence.emailCount} email / ${cadence.smsCount} SMS in recent schedule data.`,
        })
      } else if (med >= 7) {
        heroCards.push({
          id: 'cadence-sparse',
          type: 'insight',
          tone: 'positive',
          label: `Relaxed cadence (~${med} days between scheduled sends)`,
          detail: 'Room to add launch-specific emails without crowding the calendar.',
        })
      }
    }

    if (cadence.sendsNext30Days === 0 && goLiveNext30.length > 0) {
      heroCards.push({
        id: 'cadence-gap',
        type: 'insight',
        tone: 'attention',
        label: 'No Klaviyo sends scheduled in the next 30 days',
        detail: `${goLiveNext30.length} product(s) have go-live dates soon — consider scheduling launch or teaser campaigns.`,
      })
    } else if (cadence.sendsLast30Days >= 24) {
      bullets.push({
        id: 'cadence-heavy',
        category: 'klaviyo',
        tone: 'neutral',
        label: `Heavy send volume recently (${cadence.sendsLast30Days} in last 30 days)`,
        detail: 'Review whether upcoming launches need dedicated sends vs. general promos.',
      })
    }

    const audienceTotal = insights.lists.length + insights.segments.length
    const aud = insights.audienceSync
    if (audienceTotal === 0) {
      const errParts = [aud?.listsError, aud?.segmentsError].filter(Boolean)
      bullets.push({
        id: 'audience-missing',
        category: 'audience',
        tone: 'attention',
        label: 'Lists and segments did not sync',
        detail:
          errParts.length > 0
            ? errParts.join(' ')
            : 'Enable Lists + Segments in Settings, sync again, or create a new API key with lists:read, segments:read, and metrics:read.',
      })
    } else {
      const aud = insights.audienceSummary
      let detail: string | undefined
      if (aud?.largestSegment) {
        detail = `Largest segment: ${aud.largestSegment.name} (${aud.largestSegment.profileCount.toLocaleString()} profiles)`
        if (aud.largestList) {
          detail += ` · Largest list: ${aud.largestList.name} (${aud.largestList.profileCount.toLocaleString()})`
        }
      } else if (aud?.largestList) {
        detail = `Largest list: ${aud.largestList.name} (${aud.largestList.profileCount.toLocaleString()} profiles)`
      }
      bullets.push({
        id: 'audience-ok',
        category: 'audience',
        tone: 'positive',
        label: `${insights.lists.length} lists · ${insights.segments.length} segments synced`,
        detail,
      })
    }

    if (perfSummary?.available) {
      const matched = catalogMatches.length
      if (matched > 0) {
        bullets.push({
          id: 'campaign-names',
          category: 'performance',
          tone: 'positive',
          label: `${matched} campaign(s) matched to pipeline names`,
        })
      }

      for (const top of perfSummary.topByRevenue.slice(0, 3)) {
        const match = catalogMatches.find((m) => m.campaignId === top.campaignId)
        highlights.push({
          id: `top-${top.campaignId}`,
          title: top.name.length > 52 ? `${top.name.slice(0, 52)}…` : top.name,
          subtitle: match
            ? `Matched ${match.matchType === 'collection' ? 'collection' : 'product'}: ${match.matchedLabel}`
            : 'No product/collection match in name',
          metric: `${formatRate(top.openRate)} open · ${formatCurrency(top.conversionValue)}`,
          tone: 'positive',
        })
      }
    } else if (perfSummary && !perfSummary.available && perfSummary.error) {
      bullets.push({
        id: 'perf-unavailable',
        category: 'performance',
        tone: 'neutral',
        label: 'Campaign performance not loaded',
        detail: perfSummary.error,
      })
    }

    const unmatched = launchRecs.filter((r) => r.priorCampaigns.length === 0)
    const matched = launchRecs.filter((r) => r.priorCampaigns.length > 0)

    if (unmatched.length >= 2) {
      const sample = unmatched.slice(0, 3)
      const names = sample.map((r) => r.productName).join(', ')
      const more = unmatched.length > 3 ? ` +${unmatched.length - 3} more` : ''
      highlights.push({
        id: 'launch-batch-unmatched',
        title: `${unmatched.length} launches with no matching Klaviyo campaign`,
        subtitle: `Include product names in campaign titles; send 2–3 days before go-live. Next up: ${names}${more}.`,
        tone: 'attention',
      })
    } else {
      const seenNames = new Set<string>()
      for (const rec of unmatched) {
        const key = rec.productName.trim().toLowerCase()
        if (seenNames.has(key)) continue
        seenNames.add(key)
        const launchProduct = productById.get(rec.productId)
        const genderTag = launchProduct?.gender
          ? storyGenderLabel(storyGenderAudience(launchProduct.gender))
          : null
        highlights.push({
          id: `launch-${rec.productId}`,
          title: `${genderTag ? `${genderTag} · ` : ''}${rec.productName} · ${rec.goLiveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          subtitle: `No Klaviyo match — name the send “${rec.productName} launch”; send 2–3 days before go-live.`,
          tone: rec.tone,
        })
      }
    }

    const seenMatched = new Set<string>()
    for (const rec of matched) {
      if (highlights.length >= 4) break
      const key = rec.productId
      if (seenMatched.has(key)) continue
      seenMatched.add(key)
      highlights.push({
        id: `launch-prior-${rec.productId}`,
        title: `${rec.productName} · ${rec.goLiveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        subtitle: rec.recommendation.length > 140 ? `${rec.recommendation.slice(0, 137)}…` : rec.recommendation,
        tone: rec.tone,
      })
    }
  } else if (!klaviyoOn) {
    bullets.push({
      id: 'connect-klaviyo',
      category: 'integration',
      tone: 'neutral',
      label: 'Klaviyo not connected',
      detail: 'Connect in Settings to compare send cadence with pipeline go-live and arrival dates.',
    })
  }

  if (goLiveNext30.length > 0) {
    bullets.push({
      id: 'launches',
      category: 'pipeline',
      tone: goLiveNext30.length >= 8 ? 'attention' : 'neutral',
      label: `${goLiveNext30.length} go-live${goLiveNext30.length > 1 ? 's' : ''} in the next 30 days`,
      detail: 'Use the story calendar for send timing.',
    })
  }

  if (arrivingNext14Count > 0 && goLiveNext30.length === 0) {
    bullets.push({
      id: 'arrivals',
      category: 'pipeline',
      tone: 'neutral',
      label: `${arrivingNext14Count} inbound within ~2 weeks`,
    })
  }

  if (highCount > 0) {
    const tops = suggestions.filter((s) => s.priority === 'high').slice(0, 3)
    bullets.push({
      id: 'action-high',
      category: 'pipeline',
      tone: 'critical',
      label: `${highCount} high-priority pipeline task${highCount > 1 ? 's' : ''}`,
      detail: tops.map((t) => t.title).join(' · '),
    })
  }

  let headline: string
  let subhead: string

  if (highCount >= 3) {
    headline = 'Pipeline needs attention before campaigns scale'
    subhead = 'Factory dates, shoots, or go-live timing may be out of sync with your send calendar.'
  } else if (klaviyoOn && insights && insights.cadence.sendsNext30Days === 0 && goLiveNext30.length > 0) {
    headline = 'Launches ahead — schedule sends to match'
    subhead =
      perfSummary?.available && launchRecs.length > 0
        ? 'Use past campaign performance and product-name matching below to plan the next month of sends.'
        : 'GreenRoom sees upcoming go-live dates but nothing scheduled in Klaviyo for the next month.'
  } else if (goLiveNext30.length > 0 || arrivingNext14Count > 0) {
    headline = 'Active season — arrivals and launches in motion'
    subhead = 'Use cadence, performance by campaign name, and the suggested calendar to line up Klaviyo with inventory.'
  } else if (klaviyoOn && insights) {
    headline = 'Send rhythm looks steady'
    subhead = 'Few imminent pipeline launches — focus on audience strategy and maintaining cadence.'
  } else {
    headline = 'Add dates or connect Klaviyo for a fuller picture'
    subhead = 'Intelligence improves as products get ship, shoot, and go-live dates and Klaviyo syncs.'
  }

  if (heroCards.length === 0 && goLiveNext30.length > 0) {
    heroCards.push({
      id: 'launches',
      type: 'metric',
      value: String(goLiveNext30.length),
      label: 'Launches (30d)',
      accent: 'emerald',
    })
  }

  const trimmedBullets = bullets.slice(0, 12)

  return {
    headline,
    subhead,
    sections: groupBulletsIntoSections(trimmedBullets),
    bullets: trimmedBullets,
    heroCards,
    highlights: highlights.slice(0, 8),
    performanceAvailable: perfSummary?.available === true,
    generatedAt: now,
  }
}

/** Merge confirmed calendar rows with recommended send slots from pipeline timing. */
export function buildSuggestedMarketingCalendar(
  products: Product[],
  allEvents: MarketingCalendarEvent[],
  marketing: BrandMarketingSettings | undefined,
  horizonDays = 60,
  projects: Project[] = [],
  insights: MarketingKlaviyoInsights | null = null
): SuggestedCalendarItem[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = addDays(now, horizonDays)
  const klaviyoOn = marketing?.klaviyo?.status === 'connected'
  const pullEmail = marketing?.klaviyo?.pullCampaigns !== false
  const perfCampaigns = insights?.performance?.campaigns ?? []
  const launchRecByProduct = new Map(
    buildLaunchSendRecommendations(products, perfCampaigns, projects).map((r) => [r.productId, r])
  )
  const items: SuggestedCalendarItem[] = []

  for (const ev of allEvents) {
    if (ev.date < now || ev.date > end) continue
    const confirmed = ev.source === 'klaviyo' || ev.kind === 'go_live' || ev.kind === 'photo_shoot'

    items.push({
      id: `ev-${ev.id}`,
      date: ev.date,
      kind: ev.source === 'klaviyo' ? 'klaviyo' : 'pipeline',
      title: ev.title,
      sku: ev.sku,
      confirmed,
      subtitle: ev.source === 'klaviyo' ? 'Klaviyo (synced)' : undefined,
    })
  }

  const active = activeProducts(products)
  for (const p of active) {
    const goLive = productDate(p, 'goLiveDate')
    if (!goLive || p.stage === 'live') continue
    if (goLive < now || goLive > end) continue

    const launchEmailDate = addDays(goLive, -3)
    if (klaviyoOn && pullEmail && launchEmailDate >= now) {
      if (!hasKlaviyoNearDate(allEvents, launchEmailDate, 4)) {
        const rec = launchRecByProduct.get(p.id)
        items.push({
          id: `suggest-launch-${p.id}`,
          date: launchEmailDate,
          kind: 'suggested_email',
          title: `Suggested launch email — ${p.name}`,
          sku: p.sku,
          confirmed: false,
          reason:
            rec?.recommendation ??
            `Go-live ${goLive.toLocaleDateString()} — typical send 2–3 days before`,
        })
      }
    }

    const ship = productDate(p, 'factoryShipDate') || productDate(p, 'tentativeExFactoryDate')
    if (ship && ship >= now && ship <= end) {
      const teaserDate = addDays(goLive && goLive > ship ? goLive : ship, -7)
      if (teaserDate >= now && teaserDate <= end && klaviyoOn && pullEmail) {
        if (!hasKlaviyoNearDate(allEvents, teaserDate, 5)) {
          items.push({
            id: `suggest-teaser-${p.id}`,
            date: teaserDate,
            kind: 'suggested_teaser',
            title: `Suggested teaser / VIP — ${p.name}`,
            sku: p.sku,
            confirmed: false,
            reason: 'Units inbound — warm list before launch',
          })
        }
      }
    }

    const shoot = productDate(p, 'scheduledShootDate')
    if (!shoot && goLive >= now) {
      const shootBy = addDays(goLive, -14)
      if (shootBy >= now && shootBy <= end) {
        items.push({
          id: `suggest-shoot-${p.id}`,
          date: shootBy,
          kind: 'pipeline',
          title: `Shoot window — ${p.name}`,
          sku: p.sku,
          confirmed: false,
          reason: 'No shoot date set — aim ~2 weeks before go-live',
        })
      }
    }
  }

  const seen = new Set<string>()
  const deduped = items.filter((item) => {
    const key = `${item.date.toISOString().slice(0, 10)}-${item.kind}-${item.sku ?? item.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export const SUGGESTED_KIND_LABELS: Record<SuggestedCalendarItemKind, string> = {
  suggested_email: 'Suggested email',
  suggested_sms: 'Suggested SMS',
  suggested_teaser: 'Suggested teaser',
  pipeline: 'Pipeline',
  klaviyo: 'Klaviyo',
}

export const SUGGESTED_KIND_COLORS: Record<SuggestedCalendarItemKind, string> = {
  suggested_email: '#a78bfa',
  suggested_sms: '#c4b5fd',
  suggested_teaser: '#ddd6fe',
  pipeline: '#0e7f55',
  klaviyo: '#7c3aed',
}
