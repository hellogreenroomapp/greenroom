import type { Product, Project } from '@/types'
import type { KlaviyoCampaignPerformanceRow } from '@/types/klaviyoInsights'
import { storyGenderLabel, storyGenderAudience } from '@/utils/marketingStoryCalendar'

/** Klaviyo matches on product/collection names. SKU matching is reserved for Shopify. */
export type CampaignMatchType = 'product_name' | 'collection'

export interface CampaignProductMatch {
  campaignId: string
  campaignName: string
  matchType: CampaignMatchType
  matchedLabel: string
  productId?: string
  sku?: string
  projectId?: string
  openRate: number | null
  conversionValue: number | null
}

export interface LaunchSendRecommendation {
  productId: string
  sku: string
  productName: string
  goLiveDate: Date
  /** Past campaigns whose names matched this product */
  priorCampaigns: CampaignProductMatch[]
  recommendation: string
  tone: 'positive' | 'neutral' | 'attention'
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'for',
  'new',
  'launch',
  'email',
  'sale',
  'shop',
  'drop',
])

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function nameContains(haystack: string, needle: string, minLen = 4): boolean {
  if (needle.length < minLen) return false
  const h = normalize(haystack)
  const n = normalize(needle)
  if (!n || n.length < minLen) return false
  return h.includes(n)
}

function significantTokens(productName: string): string[] {
  return normalize(productName)
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t))
}

/**
 * Score how well a Klaviyo campaign name references a GreenRoom product name.
 * SKU is intentionally not used — Shopify will handle SKU-level commerce matching.
 */
export function productNameMatchScore(campaignName: string, productName: string): number {
  const haystack = normalize(campaignName)
  const full = normalize(productName)
  if (!full || full.length < 5) return 0

  if (haystack.includes(full)) return full.length + 20

  const tokens = significantTokens(productName)
  if (tokens.length === 0) return 0

  const longest = tokens.reduce((a, b) => (a.length >= b.length ? a : b), '')
  if (!haystack.includes(longest)) return 0

  let matched = 0
  for (const t of tokens) {
    if (haystack.includes(t)) matched++
  }
  const required = tokens.length === 1 ? 1 : Math.ceil(tokens.length * 0.5)
  if (matched < required) return 0

  return matched * 6 + longest.length
}

type ProductMatchIndex = {
  active: Product[]
  byToken: Map<string, Product[]>
}

function buildProductMatchIndex(products: Product[]): ProductMatchIndex {
  const active = products.filter((p) => !p.archived && p.name.length >= 3)
  const byToken = new Map<string, Product[]>()
  for (const p of active) {
    for (const token of significantTokens(p.name)) {
      const list = byToken.get(token)
      if (list) list.push(p)
      else byToken.set(token, [p])
    }
  }
  return { active, byToken }
}

const MAX_CANDIDATES_PER_CAMPAIGN = 60
const MAX_FALLBACK_CANDIDATES = 40

function candidateProductsForCampaign(campaignName: string, index: ProductMatchIndex): Product[] {
  const haystack = normalize(campaignName)
  const seen = new Set<string>()
  const candidates: Product[] = []

  for (const word of haystack.split(/\s+/)) {
    if (word.length < 4 || STOP_WORDS.has(word)) continue
    for (const p of index.byToken.get(word) ?? []) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        candidates.push(p)
        if (candidates.length >= MAX_CANDIDATES_PER_CAMPAIGN) {
          return candidates
        }
      }
    }
  }

  if (candidates.length > 0) return candidates

  return index.active.slice(0, MAX_FALLBACK_CANDIDATES)
}

/** Match a campaign or email title to a catalog product by name. */
export function findProductForCampaignTitle(
  campaignName: string,
  products: Product[]
): Product | null {
  const index = buildProductMatchIndex(products)
  return bestProductMatch(campaignName, index)?.product ?? null
}

function bestProductMatch(
  campaignName: string,
  index: ProductMatchIndex
): { product: Product; score: number } | null {
  let best: { product: Product; score: number } | null = null
  for (const p of candidateProductsForCampaign(campaignName, index)) {
    const score = productNameMatchScore(campaignName, p.name)
    if (score > 0 && (!best || score > best.score)) {
      best = { product: p, score }
    }
  }
  return best
}

export function matchCampaignsToCatalog(
  campaigns: KlaviyoCampaignPerformanceRow[],
  products: Product[],
  projects: Project[]
): CampaignProductMatch[] {
  const matches: CampaignProductMatch[] = []
  const index = buildProductMatchIndex(products)
  const activeProjects = projects.filter((p) => p.status !== 'archived')

  for (const campaign of campaigns) {
    const name = campaign.name
    let best: CampaignProductMatch | null = null

    const productHit = bestProductMatch(name, index)
    if (productHit) {
      const p = productHit.product
      best = {
        campaignId: campaign.campaignId,
        campaignName: name,
        matchType: 'product_name',
        matchedLabel: p.name,
        productId: p.id,
        sku: p.sku,
        openRate: campaign.openRate,
        conversionValue: campaign.conversionValue,
      }
    }

    if (!best) {
      for (const proj of activeProjects) {
        if (nameContains(name, proj.name, 4)) {
          best = {
            campaignId: campaign.campaignId,
            campaignName: name,
            matchType: 'collection',
            matchedLabel: proj.name,
            projectId: proj.id,
            openRate: campaign.openRate,
            conversionValue: campaign.conversionValue,
          }
          break
        }
      }
    }

    if (best) matches.push(best)
  }

  return matches
}

function avgOpenRate(rows: CampaignProductMatch[]): number | null {
  const rates = rows.map((r) => r.openRate).filter((r): r is number => r != null)
  if (rates.length === 0) return null
  return rates.reduce((a, b) => a + b, 0) / rates.length
}

function productDate(product: Product): Date | null {
  const ts = product.goLiveDate
  if (!ts?.toMillis) return null
  try {
    const d = ts.toDate()
    return Number.isFinite(d.getTime()) ? d : null
  } catch {
    return null
  }
}

/** Send timing hints from campaign names + past performance for upcoming launches. */
export function buildLaunchSendRecommendations(
  products: Product[],
  campaigns: KlaviyoCampaignPerformanceRow[],
  projects: Project[],
  horizonDays = 45,
  catalogMatches?: CampaignProductMatch[]
): LaunchSendRecommendation[] {
  const now = Date.now()
  const end = now + horizonDays * 24 * 60 * 60 * 1000
  const allMatches = catalogMatches ?? matchCampaignsToCatalog(campaigns, products, projects)
  const recs: LaunchSendRecommendation[] = []

  for (const p of products) {
    if (p.archived || p.stage === 'live') continue
    const goLive = productDate(p)
    if (!goLive) continue
    const t = goLive.getTime()
    if (t < now || t > end) continue

    const prior = allMatches.filter((m) => m.productId === p.id)

    let recommendation: string
    let tone: LaunchSendRecommendation['tone'] = 'neutral'

    const genderHint = p.gender
      ? `${storyGenderLabel(storyGenderAudience(p.gender))} — `
      : ''
    if (prior.length === 0) {
      recommendation = `No recent Klaviyo campaign matches “${p.name}” — use a ${genderHint || ''}product name in the campaign title (e.g. "${genderHint}${p.name} launch"). Send 2–3 days before go-live.`
      tone = 'attention'
    } else {
      const avg = avgOpenRate(prior)
      const best = [...prior].sort((a, b) => (b.openRate ?? 0) - (a.openRate ?? 0))[0]
      const openPct = avg != null ? `${Math.round(avg * 100)}%` : '—'
      if (avg != null && avg >= 0.35 && best) {
        recommendation = `Prior sends mentioning this product averaged ${openPct} open — mirror naming like “${best.campaignName.slice(0, 48)}${best.campaignName.length > 48 ? '…' : ''}”.`
        tone = 'positive'
      } else if (avg != null && avg < 0.2) {
        recommendation = `Past campaigns for “${p.name}” averaged ${openPct} open — try a shorter subject, VIP segment, or collection-level angle.`
        tone = 'attention'
      } else {
        recommendation = `${prior.length} related campaign(s) found (avg open ${openPct}) — schedule a ${genderHint || ''}send 2–3 days before go-live; keep men's and women's campaigns separate.`
      }
    }

    recs.push({
      productId: p.id,
      sku: p.sku,
      productName: p.name,
      goLiveDate: goLive,
      priorCampaigns: prior,
      recommendation,
      tone,
    })
  }

  return recs.sort((a, b) => a.goLiveDate.getTime() - b.goLiveDate.getTime())
}

export function formatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  return `${Math.round(rate * 1000) / 10}%`
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${Math.round(value)}`
}
