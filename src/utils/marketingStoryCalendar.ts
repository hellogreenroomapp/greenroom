import type { Product, Project, BrandMarketingSettings } from '@/types'
import type { MarketingKlaviyoInsights } from '@/types/klaviyoInsights'
import {
  getMarketingCadenceTargets,
  idealDaysBetweenEmails,
  idealDaysBetweenSms,
  type MarketingCadenceTargets,
} from '@/utils/marketingCadenceTargets'
import { STAGE_LABELS } from '@/types'
import { productHasGoLiveDate } from '@/utils/dates'

export type LaunchClassification = 'new' | 'restock' | 'new_color' | 'extension'
export type StoryGenderAudience = 'mens' | 'womens' | 'unisex' | 'mixed'
export type StoryChannel = 'email' | 'sms'
export type StoryKind = 'launch' | 'best_sellers' | 'cadence_fill'

export type CategoryFamily =
  | 'dresses'
  | 'bottoms'
  | 'tops'
  | 'skirts'
  | 'outerwear'
  | 'knits'
  | 'accessories'
  | 'other'

/** Days before go-live we aim to send; launches up to this many days after send stay in the story */
const SEND_DAYS_BEFORE_GO_LIVE = 3
const LAUNCH_WINDOW_DAYS_AFTER_SEND = 14
/** Merge send days this close when pooling products before category curation */
const MERGE_SEND_GAP_DAYS = 2
/** ~3 launches/month → one combined send; busier brands get category emails */
const LOW_VOLUME_LAUNCHES_PER_MONTH = 6
const MIN_PRODUCTS_IN_BUCKET_TO_CURATE = 4
const MAX_CURATED_STORIES_PER_WINDOW = 3
const MIN_FAMILY_SIZE_FOR_OWN_STORY = 2
const STORY_STAGGER_DAYS = 1
/** Max styles going live on the same calendar day (extras push to later dates) */
const MAX_GO_LIVES_PER_DAY = 2
const MAX_GO_LIVE_PUSH_DAYS = 28

export interface StoryCalendarProduct {
  id: string
  sku: string
  name: string
  category: string
  categoryFamily: CategoryFamily
  categoryLabel: string
  genderAudience: StoryGenderAudience
  genderLabel: string
  /** Planned go-live for calendar balancing (may be after pipeline date) */
  goLiveDate: Date
  /** Original pipeline go-live when the calendar shifted this style */
  pipelineGoLiveDate?: Date
  stage: Product['stage']
  stageLabel: string
  launchType: LaunchClassification
  launchTypeLabel: string
  projectName?: string
  gender?: Product['gender']
}

export interface MarketingStoryBeat {
  id: string
  /** Recommended send date shown on the calendar */
  sendDate: Date
  channel: StoryChannel
  storyKind: StoryKind
  /** Curated category theme when split from a busy launch window */
  categoryFamily?: CategoryFamily
  categoryLabel?: string
  displayLabel: string
  title: string
  storyAngle: string
  storyHooks: string[]
  products: StoryCalendarProduct[]
  launchWindowStart: Date | null
  launchWindowEnd: Date | null
  stageSummary: string
  launchMix: Record<LaunchClassification, number>
  commerceNote: string
}

const FAMILY_LABELS: Record<CategoryFamily, string> = {
  dresses: 'Dresses',
  bottoms: 'Bottoms',
  tops: 'Tops',
  skirts: 'Skirts',
  outerwear: 'Outerwear',
  knits: 'Knits',
  accessories: 'Accessories',
  other: 'Collection',
}

export const LAUNCH_LABELS: Record<LaunchClassification, string> = {
  new: 'New',
  restock: 'Restock',
  new_color: 'New color',
  extension: 'Extension',
}

const CHANNEL_COLORS: Record<StoryChannel, string> = {
  email: '#0e7f55',
  sms: '#7c3aed',
}

const KIND_COLORS: Record<StoryKind, string> = {
  launch: '#0e7f55',
  best_sellers: '#d97706',
  cadence_fill: '#64748b',
}

export function categoryFamilyColor(family: CategoryFamily): string {
  const map: Record<CategoryFamily, string> = {
    dresses: '#7c3aed',
    bottoms: '#0e7f55',
    tops: '#2563eb',
    skirts: '#db2777',
    outerwear: '#b45309',
    knits: '#0891b2',
    accessories: '#64748b',
    other: '#4f46e5',
  }
  return map[family]
}

export function storyBeatChipColor(
  beat: Pick<MarketingStoryBeat, 'channel' | 'storyKind' | 'categoryFamily'>
): string {
  if (beat.storyKind === 'best_sellers') return KIND_COLORS.best_sellers
  if (beat.storyKind === 'cadence_fill') return KIND_COLORS.cadence_fill
  if (beat.categoryFamily) return categoryFamilyColor(beat.categoryFamily)
  return CHANNEL_COLORS[beat.channel]
}

export function storyGenderAudience(gender?: Product['gender']): StoryGenderAudience {
  if (gender === 'mens' || gender === 'womens' || gender === 'unisex') return gender
  return 'mixed'
}

export function storyGenderLabel(audience: StoryGenderAudience): string {
  if (audience === 'mens') return "Men's"
  if (audience === 'womens') return "Women's"
  if (audience === 'unisex') return 'Unisex'
  return 'Mixed'
}

const MS_DAY = 24 * 60 * 60 * 1000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  return x
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return startOfDay(d)
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_DAY)
}

function dayKeyUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function goLiveDate(product: Product): Date | null {
  if (!productHasGoLiveDate(product)) return null
  try {
    const d = product.goLiveDate!.toDate()
    return Number.isFinite(d.getTime()) ? startOfDay(d) : null
  } catch {
    return null
  }
}

export function normalizeCategoryFamily(category: string): CategoryFamily {
  const c = category.toLowerCase().trim()
  if (!c) return 'other'
  if (/dress|gown|maxi|midi dress/.test(c)) return 'dresses'
  if (/pant|trouser|jean|denim|short|bottom|legging|jogger/.test(c)) return 'bottoms'
  if (/top|tee|t-?shirt|blouse|tank|shirt|camisole|bodysuit/.test(c)) return 'tops'
  if (/skirt/.test(c)) return 'skirts'
  if (/jacket|coat|outer|blazer|vest|parka|puffer/.test(c)) return 'outerwear'
  if (/knit|sweater|cardigan|pullover|hoodie/.test(c)) return 'knits'
  if (/bag|shoe|access|hat|scarf|jewel|belt/.test(c)) return 'accessories'
  return 'other'
}

export function inferLaunchType(product: Product): LaunchClassification {
  const tags = [
    ...(product.tags || []),
    ...(product.colors?.flatMap((col) => col.tags || []) || []),
  ].map((t) => t.toLowerCase())

  if (tags.some((t) => t.includes('restock') || t === 'core restock')) return 'restock'
  if (tags.some((t) => t.includes('new color') || t.includes('new-color') || t.includes('colorway')))
    return 'new_color'
  if (tags.some((t) => t.includes('extension') || t.includes('carryover'))) return 'extension'
  return 'new'
}

function stageSummary(products: StoryCalendarProduct[]): string {
  const counts = new Map<string, number>()
  for (const p of products) {
    counts.set(p.stageLabel, (counts.get(p.stageLabel) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, n]) => `${n} ${label}`)
    .join(' · ')
}

function launchMixCounts(products: StoryCalendarProduct[]): Record<LaunchClassification, number> {
  const mix: Record<LaunchClassification, number> = {
    new: 0,
    restock: 0,
    new_color: 0,
    extension: 0,
  }
  for (const p of products) mix[p.launchType]++
  return mix
}

/** Ideal send ~3 days before go-live; clamp so go-live still falls within 14 days after send */
function bestSendDateForProduct(goLive: Date, now: Date): Date {
  const today = startOfDay(now)
  let send = addDays(goLive, -SEND_DAYS_BEFORE_GO_LIVE)
  if (send < today) send = today

  let gap = daysBetween(send, goLive)
  if (gap > LAUNCH_WINDOW_DAYS_AFTER_SEND) {
    send = addDays(goLive, -LAUNCH_WINDOW_DAYS_AFTER_SEND)
  }
  if (gap < 1) {
    send = addDays(goLive, -1)
    if (send < today) send = today
  }
  return send
}

function pickChannel(
  products: StoryCalendarProduct[],
  insights: MarketingKlaviyoInsights | null | undefined,
  targets: MarketingCadenceTargets,
  smsRemainingThisMonth: number
): StoryChannel {
  if (targets.smsPerMonth <= 0 || smsRemainingThisMonth <= 0) return 'email'

  const n = products.length
  const mix = launchMixCounts(products)
  const restockHeavy = mix.restock >= n * 0.5
  const cadence = insights?.cadence
  const smsShare = targets.smsPerMonth / Math.max(1, targets.emailsPerMonth + targets.smsPerMonth)

  if (n <= 2 && (restockHeavy || mix.new_color >= 1) && smsShare >= 0.25) return 'sms'
  if (cadence && cadence.smsCount > cadence.emailCount * 0.6 && n <= 4 && smsShare >= 0.3) {
    return 'sms'
  }
  if (targets.smsPerMonth >= 8 && n <= 3 && restockHeavy) return 'sms'
  return 'email'
}

function monthKeyUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`
}

function refreshBeatLabels(beat: MarketingStoryBeat): MarketingStoryBeat {
  const catLabel = beat.categoryLabel
  const n = beat.products.length
  if (beat.storyKind === 'best_sellers') return beat
  if (catLabel) {
    return {
      ...beat,
      displayLabel: `${beat.channel === 'email' ? 'Email' : 'SMS'} · ${catLabel} (${n})`,
    }
  }
  const theme =
    n === 1 && beat.products[0]
      ? beat.products[0].name
      : `${n} launch${n > 1 ? 'es' : ''}`
  return {
    ...beat,
    displayLabel: `${beat.channel === 'email' ? 'Email' : 'SMS'} · ${theme}`,
  }
}

/** Fit launch beats into monthly email/SMS targets by nudging send dates forward */
function applyCadenceTargetsToBeats(
  beats: MarketingStoryBeat[],
  targets: MarketingCadenceTargets,
  horizonEnd: Date
): MarketingStoryBeat[] {
  const emailByMonth = new Map<string, number>()
  const smsByMonth = new Map<string, number>()
  const emailGap = idealDaysBetweenEmails(targets)
  const launch = beats
    .filter((b) => b.storyKind === 'launch')
    .sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime())
  const rest = beats.filter((b) => b.storyKind !== 'launch')
  const adjusted: MarketingStoryBeat[] = []

  for (const beat of launch) {
    let send = beat.sendDate
    let channel = beat.channel
    let placed = false

    for (let attempt = 0; attempt < 48; attempt++) {
      if (send > horizonEnd) break
      const mk = monthKeyUTC(send)
      const emailsUsed = emailByMonth.get(mk) ?? 0
      const smsUsed = smsByMonth.get(mk) ?? 0

      const preferSms = channel === 'sms'
      if (preferSms && smsUsed < targets.smsPerMonth) {
        smsByMonth.set(mk, smsUsed + 1)
        placed = true
        break
      }
      if (emailsUsed < targets.emailsPerMonth) {
        channel = 'email'
        emailByMonth.set(mk, emailsUsed + 1)
        placed = true
        break
      }
      if (preferSms && emailsUsed < targets.emailsPerMonth) {
        channel = 'email'
        emailByMonth.set(mk, emailsUsed + 1)
        placed = true
        break
      }

      send = addDays(send, emailGap)
    }

    if (!placed) {
      const mk = monthKeyUTC(send)
      emailByMonth.set(mk, (emailByMonth.get(mk) ?? 0) + 1)
      channel = 'email'
    }

    adjusted.push(
      refreshBeatLabels({
        ...beat,
        sendDate: send,
        channel,
      })
    )
  }

  return [...adjusted, ...rest].sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime())
}

interface StoryGroup {
  family: CategoryFamily
  products: StoryCalendarProduct[]
}

function dominantCategoryFamily(products: StoryCalendarProduct[]): CategoryFamily {
  const counts = new Map<CategoryFamily, number>()
  for (const p of products) {
    counts.set(p.categoryFamily, (counts.get(p.categoryFamily) || 0) + 1)
  }
  let best: CategoryFamily = 'other'
  let max = 0
  for (const [family, n] of counts) {
    if (n > max) {
      max = n
      best = family
    }
  }
  return best
}

/**
 * Spread crowded go-live days so at most MAX_GO_LIVES_PER_DAY per day.
 * Overflow moves to the next open day on or after the pipeline date (never earlier).
 */
function balanceLaunchGoLiveDates(
  rows: StoryCalendarProduct[],
  today: Date,
  horizonEnd: Date
): StoryCalendarProduct[] {
  if (rows.length === 0) return rows

  const sorted = [...rows].sort((a, b) => {
    const pa = a.pipelineGoLiveDate ?? a.goLiveDate
    const pb = b.pipelineGoLiveDate ?? b.goLiveDate
    return pa.getTime() - pb.getTime() || a.sku.localeCompare(b.sku)
  })

  const dayLoad = new Map<string, number>()
  const balanced: StoryCalendarProduct[] = []

  for (const row of sorted) {
    const pipeline = startOfDay(row.pipelineGoLiveDate ?? row.goLiveDate)
    let planned = pipeline
    let placed = false

    for (let offset = 0; offset <= MAX_GO_LIVE_PUSH_DAYS; offset++) {
      const candidate = addDays(pipeline, offset)
      if (candidate < today || candidate > horizonEnd) continue

      const ck = dayKeyUTC(candidate)
      const load = dayLoad.get(ck) ?? 0
      if (load < MAX_GO_LIVES_PER_DAY) {
        planned = candidate
        dayLoad.set(ck, load + 1)
        placed = true
        break
      }
    }

    if (!placed) {
      planned = pipeline
      const ck = dayKeyUTC(planned)
      dayLoad.set(ck, (dayLoad.get(ck) ?? 0) + 1)
    }

    balanced.push({
      ...row,
      pipelineGoLiveDate: pipeline,
      goLiveDate: planned,
    })
  }

  return balanced.sort(
    (a, b) => a.goLiveDate.getTime() - b.goLiveDate.getTime() || a.sku.localeCompare(b.sku)
  )
}

function countLaunchesInNext30Days(rows: StoryCalendarProduct[], today: Date): number {
  return rows.filter((p) => {
    const d = daysBetween(today, p.goLiveDate)
    return d >= 0 && d <= 30
  }).length
}

function shouldCurateByCategory(launchesPerMonth: number, bucketSize: number): boolean {
  return (
    launchesPerMonth > LOW_VOLUME_LAUNCHES_PER_MONTH && bucketSize >= MIN_PRODUCTS_IN_BUCKET_TO_CURATE
  )
}

/** Split a busy send window into up to 3 category-themed emails (dresses, knits, etc.). */
function curateStoryGroups(products: StoryCalendarProduct[], curate: boolean): StoryGroup[] {
  if (!curate) {
    return [{ family: dominantCategoryFamily(products), products }]
  }

  const byFamily = new Map<CategoryFamily, StoryCalendarProduct[]>()
  for (const p of products) {
    const list = byFamily.get(p.categoryFamily) ?? []
    list.push(p)
    byFamily.set(p.categoryFamily, list)
  }

  const ranked = [...byFamily.entries()].sort((a, b) => b[1].length - a[1].length)
  const groups: StoryGroup[] = []
  let pool: StoryCalendarProduct[] = []

  for (const [family, prods] of ranked) {
    if (prods.length >= MIN_FAMILY_SIZE_FOR_OWN_STORY && groups.length < MAX_CURATED_STORIES_PER_WINDOW) {
      groups.push({ family, products: prods })
    } else {
      pool.push(...prods)
    }
  }

  if (pool.length > 0) {
    if (groups.length < MAX_CURATED_STORIES_PER_WINDOW) {
      groups.push({
        family: pool.length >= MIN_FAMILY_SIZE_FOR_OWN_STORY ? dominantCategoryFamily(pool) : 'other',
        products: pool,
      })
    } else {
      const smallest = groups.reduce((a, b) => (a.products.length <= b.products.length ? a : b))
      smallest.products.push(...pool)
    }
  }

  if (groups.length === 0) {
    return [{ family: dominantCategoryFamily(products), products }]
  }

  return groups.map((g) => ({
    family: g.family,
    products: g.products.sort(
      (a, b) => a.goLiveDate.getTime() - b.goLiveDate.getTime() || a.sku.localeCompare(b.sku)
    ),
  }))
}

function categoryStoryHeadline(family: CategoryFamily, count: number): string {
  const label = FAMILY_LABELS[family]
  if (count === 1) return `New ${label.replace(/s$/, '').toLowerCase()}`
  if (family === 'other') return count <= 3 ? 'New arrivals' : 'New collection drop'
  return `New ${label.toLowerCase()}`
}

function craftCategoryLaunchStory(
  family: CategoryFamily,
  products: StoryCalendarProduct[],
  sendDate: Date,
  channel: StoryChannel,
  curated: boolean
): { title: string; storyAngle: string; storyHooks: string[] } {
  const n = products.length
  const windowStart = new Date(Math.min(...products.map((p) => p.goLiveDate.getTime())))
  const windowEnd = new Date(Math.max(...products.map((p) => p.goLiveDate.getTime())))
  const winStartStr = windowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const winEndStr = windowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const sendStr = sendDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const channelLabel = channel === 'email' ? 'Email' : 'SMS'
  const theme = categoryStoryHeadline(family, n)
  const hasMens = products.some((p) => p.genderAudience === 'mens')
  const hasWomens = products.some((p) => p.genderAudience === 'womens')
  const lone = products[0]

  const title =
    !curated && n === 1 && lone
      ? `${channelLabel}: ${lone.name}`
      : `${channelLabel}: ${theme}`

  const storyAngle = curated
    ? `Category story on ${sendStr} — ${n} ${FAMILY_LABELS[family].toLowerCase()} launching ${winStartStr}–${winEndStr}. Lead with the category in subject and hero (“${theme}”) instead of a generic new-arrivals send.`
    : `Launch send on ${sendStr} for ${n} style${n > 1 ? 's' : ''} going live ${winStartStr}–${winEndStr}.`

  const heroNames = products
    .slice(0, 3)
    .map((p) => p.name)
    .join(', ')

  const shifted = products.filter(
    (p) => p.pipelineGoLiveDate && dayKeyUTC(p.goLiveDate) !== dayKeyUTC(p.pipelineGoLiveDate)
  )

  const hooks = [
    shifted.length > 0
      ? `${shifted.length} style${shifted.length > 1 ? 's' : ''} shifted on the calendar to cap at ${MAX_GO_LIVES_PER_DAY} go-lives per day (pipeline dates unchanged)`
      : '',
    `Lead with: ${heroNames}${n > 3 ? ` +${n - 3} more` : ''}`,
    hasMens && hasWomens
      ? "Men's and women's — separate segments or a split send"
      : hasMens
        ? "Men's creative and segments"
        : hasWomens
          ? "Women's creative and segments"
          : '',
    channel === 'sms' ? 'One hook + shop link' : 'Category-first subject · 2–3 heroes above the fold',
  ].filter(Boolean)

  return { title, storyAngle, storyHooks: hooks }
}

function staggeredSendDate(
  baseSend: Date,
  index: number,
  products: StoryCalendarProduct[],
  staggerDays: number
): Date {
  let send = addDays(baseSend, index * staggerDays)
  const earliestGoLive = Math.min(...products.map((p) => p.goLiveDate.getTime()))
  const latestAllowed = addDays(new Date(earliestGoLive), -1)
  if (send > latestAllowed) send = baseSend
  return send
}

function craftBestSellersPlaceholder(sendDate: Date): {
  title: string
  storyAngle: string
  storyHooks: string[]
  displayLabel: string
  storyKind: StoryKind
} {
  const sendStr = sendDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    displayLabel: 'Email · Best sellers',
    storyKind: 'best_sellers',
    title: 'Email: Best sellers',
    storyAngle: `Cadence fill on ${sendStr} — best sellers or customer favorites to hit your monthly email plan.`,
    storyHooks: [
      'Placeholder until Shopify sync — then auto-surface top revenue SKUs',
      'Pair 3–5 hero products across categories',
      'Subject: “Bestsellers” / “Customer favorites”',
    ],
  }
}

function craftCollectionHighlightPlaceholder(sendDate: Date): {
  title: string
  storyAngle: string
  storyHooks: string[]
  displayLabel: string
  storyKind: StoryKind
} {
  const sendStr = sendDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    displayLabel: 'Email · Collection spotlight',
    storyKind: 'cadence_fill',
    title: 'Email: Collection spotlight',
    storyAngle: `Planned send on ${sendStr} — rotate a category or collection (dresses, knits, new arrivals) when there is no major launch that week.`,
    storyHooks: [
      'Pick one category family from pipeline or past heroes',
      '2–3 products above fold; link to collection page',
      'Keeps send rhythm between launch waves',
    ],
  }
}

function craftBrandDigestPlaceholder(sendDate: Date): {
  title: string
  storyAngle: string
  storyHooks: string[]
  displayLabel: string
  storyKind: StoryKind
} {
  const sendStr = sendDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    displayLabel: 'Email · Brand digest',
    storyKind: 'cadence_fill',
    title: 'Email: Brand digest',
    storyAngle: `Planned send on ${sendStr} — light editorial roundup: what’s new, what’s restocking, and what’s coming soon from pipeline dates.`,
    storyHooks: [
      'Pull 4–6 SKUs across categories with go-live in the next 2–3 weeks',
      'VIP segment optional for early peek',
      'Good when launch calendar is quiet this month',
    ],
  }
}

function craftSmsTouchpointPlaceholder(sendDate: Date): {
  title: string
  storyAngle: string
  storyHooks: string[]
  displayLabel: string
  storyKind: StoryKind
} {
  const sendStr = sendDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    displayLabel: 'SMS · Touchpoint',
    storyKind: 'cadence_fill',
    title: 'SMS: Quick touchpoint',
    storyAngle: `Planned SMS on ${sendStr} to stay within your monthly SMS target — one hook, one link.`,
    storyHooks: [
      'Restock, flash, or “new this week” — pick one angle',
      'Send to engaged segment; avoid same day as a heavy launch email',
    ],
  }
}

function makePlaceholderBeat(
  id: string,
  sendDate: Date,
  channel: StoryChannel,
  concept: ReturnType<typeof craftBestSellersPlaceholder>
): MarketingStoryBeat {
  return {
    id,
    sendDate,
    channel,
    storyKind: concept.storyKind,
    displayLabel: concept.displayLabel,
    title: concept.title,
    storyAngle: concept.storyAngle,
    storyHooks: concept.storyHooks,
    products: [],
    launchWindowStart: null,
    launchWindowEnd: null,
    stageSummary: '—',
    launchMix: { new: 0, restock: 0, new_color: 0, extension: 0 },
    commerceNote: 'Cadence fill — adjust in Klaviyo; Shopify will refine product picks later.',
  }
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0))
}

function monthAnchorUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1, 12, 0, 0, 0))
}

function nextMonthUTC(d: Date): Date {
  return monthAnchorUTC(d.getUTCFullYear(), d.getUTCMonth() + 1)
}

function endOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12, 0, 0, 0))
}

function markOccupiedWindow(keys: Set<string>, center: Date, window: number): void {
  for (let d = -window; d <= window; d++) {
    keys.add(dayKeyUTC(addDays(center, d)))
  }
}

/** UTC day key for calendar indexing (exported for UI). */
export function storyBeatDayKey(d: Date): string {
  return dayKeyUTC(d)
}

export function buildBeatsByDayIndex(
  beats: MarketingStoryBeat[]
): Map<string, MarketingStoryBeat[]> {
  const map = new Map<string, MarketingStoryBeat[]>()
  for (const b of beats) {
    const key = dayKeyUTC(b.sendDate)
    const list = map.get(key)
    if (list) list.push(b)
    else map.set(key, [b])
  }
  return map
}

/**
 * Add email/SMS story ideas each month until counts match the send plan (launch beats + fillers).
 */
const MAX_STORY_BEATS_TOTAL = 360
/** Days around a launch send that block plan-fill (keep narrow so monthly targets can be met). */
const LAUNCH_OCCUPIED_WINDOW_DAYS = 1

function seedOccupiedFromBeats(beats: MarketingStoryBeat[]): Set<string> {
  const keys = new Set<string>()
  for (const b of beats) {
    const window = b.storyKind === 'launch' ? LAUNCH_OCCUPIED_WINDOW_DAYS : 0
    markOccupiedWindow(keys, b.sendDate, window)
  }
  return keys
}

type PlaceholderCraft = (sendDate: Date) => {
  title: string
  storyAngle: string
  storyHooks: string[]
  displayLabel: string
  storyKind: StoryKind
}

/** Pick up to `needed` send days spread across free days in [rangeStart, rangeEnd]. */
function pickSpacedSendDays(
  rangeStart: Date,
  rangeEnd: Date,
  needed: number,
  occupied: Set<string>,
  minSpacing: number
): Date[] {
  const free: Date[] = []
  for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) {
    if (!occupied.has(dayKeyUTC(d))) free.push(d)
  }
  if (free.length === 0 || needed <= 0) return []

  const chosen: Date[] = []
  let lastPlaced = addDays(free[0]!, -minSpacing)

  for (const day of free) {
    if (chosen.length >= needed) break
    if (daysBetween(lastPlaced, day) >= minSpacing) {
      chosen.push(day)
      lastPlaced = day
    }
  }

  if (chosen.length < needed) {
    for (const day of free) {
      if (chosen.length >= needed) break
      if (!chosen.some((c) => dayKeyUTC(c) === dayKeyUTC(day))) {
        chosen.push(day)
      }
    }
  }

  return chosen.slice(0, needed)
}

/** Spread plan-fill sends across the month until monthly targets are met. */
function fillChannelForMonth(
  result: MarketingStoryBeat[],
  occupied: Set<string>,
  mk: string,
  rangeStart: Date,
  rangeEnd: Date,
  channel: StoryChannel,
  targetCount: number,
  startCount: number,
  idealGap: number,
  crafts: PlaceholderCraft[],
  idPrefix: string
): number {
  let count = startCount
  if (targetCount <= 0 || count >= targetCount) return count

  const needed = targetCount - count
  const minSpacing = Math.max(1, Math.min(idealGap, 3))
  const sendDays = pickSpacedSendDays(rangeStart, rangeEnd, needed, occupied, minSpacing)

  let fillRot = 0
  for (const sendDate of sendDays) {
    if (count >= targetCount || result.length >= MAX_STORY_BEATS_TOTAL) break
    const craft = crafts[fillRot % crafts.length]
    if (!craft) continue
    const concept = craft(sendDate)
    result.push(makePlaceholderBeat(`${idPrefix}-${mk}-${fillRot}`, sendDate, channel, concept))
    occupied.add(dayKeyUTC(sendDate))
    count++
    fillRot++
  }

  return count
}

function ensureMonthlyCadenceBeats(
  beats: MarketingStoryBeat[],
  targets: MarketingCadenceTargets,
  today: Date,
  horizonEnd: Date
): MarketingStoryBeat[] {
  const result = [...beats]
  const emailGap = Math.max(2, idealDaysBetweenEmails(targets))
  const smsGap = Math.max(3, idealDaysBetweenSms(targets))
  const emailFillers = [
    craftBestSellersPlaceholder,
    craftCollectionHighlightPlaceholder,
    craftBrandDigestPlaceholder,
  ]
  const occupiedNear = seedOccupiedFromBeats(result)

  const emailCountByMonth = new Map<string, number>()
  const smsCountByMonth = new Map<string, number>()
  for (const b of result) {
    const mk = monthKeyUTC(b.sendDate)
    if (b.channel === 'email') {
      emailCountByMonth.set(mk, (emailCountByMonth.get(mk) ?? 0) + 1)
    } else if (b.channel === 'sms') {
      smsCountByMonth.set(mk, (smsCountByMonth.get(mk) ?? 0) + 1)
    }
  }

  const todayUtc = startOfDayUTC(today)
  const horizonEndUtc = startOfDayUTC(horizonEnd)
  let monthStart = monthAnchorUTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth())
  let monthGuard = 0

  while (monthStart <= horizonEndUtc && monthGuard < 12) {
    monthGuard++
    const mk = monthKeyUTC(monthStart)
    const monthEnd = endOfMonthUTC(monthStart)
    const rangeEnd = monthEnd > horizonEndUtc ? horizonEndUtc : monthEnd
    const rangeStart = monthStart < todayUtc ? todayUtc : monthStart
    if (rangeStart > rangeEnd) {
      monthStart = nextMonthUTC(monthStart)
      continue
    }

    const emailsBefore = emailCountByMonth.get(mk) ?? 0
    const emailsAfter = fillChannelForMonth(
      result,
      occupiedNear,
      mk,
      rangeStart,
      rangeEnd,
      'email',
      targets.emailsPerMonth,
      emailsBefore,
      emailGap,
      emailFillers,
      'fill-email'
    )
    emailCountByMonth.set(mk, emailsAfter)

    const smsBefore = smsCountByMonth.get(mk) ?? 0
    const smsAfter = fillChannelForMonth(
      result,
      occupiedNear,
      mk,
      rangeStart,
      rangeEnd,
      'sms',
      targets.smsPerMonth,
      smsBefore,
      smsGap,
      [craftSmsTouchpointPlaceholder],
      'fill-sms'
    )
    smsCountByMonth.set(mk, smsAfter)

    monthStart = nextMonthUTC(monthStart)
  }

  const sorted = result.sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime())
  return sorted.length > MAX_STORY_BEATS_TOTAL
    ? sorted.slice(0, MAX_STORY_BEATS_TOTAL)
    : sorted
}

function mergeNearbySendBuckets(
  buckets: Map<string, { sendDate: Date; products: StoryCalendarProduct[] }>
): Map<string, { sendDate: Date; products: StoryCalendarProduct[] }> {
  const sorted = [...buckets.entries()].sort((a, b) => a[1].sendDate.getTime() - b[1].sendDate.getTime())
  if (sorted.length <= 1) return buckets

  const merged = new Map<string, { sendDate: Date; products: StoryCalendarProduct[] }>()
  const firstEntry = sorted[0]
  if (!firstEntry) return buckets
  let current = firstEntry[1]

  for (let i = 1; i < sorted.length; i++) {
    const nextEntry = sorted[i]
    if (!nextEntry) continue
    const next = nextEntry[1]
    const gap = daysBetween(current.sendDate, next.sendDate)
    if (gap <= MERGE_SEND_GAP_DAYS) {
      current.products.push(...next.products)
    } else {
      merged.set(dayKeyUTC(current.sendDate), current)
      current = next
    }
  }
  merged.set(dayKeyUTC(current.sendDate), current)
  return merged
}

/**
 * Curated launch stories: low-volume brands get one send per window; busier brands split
 * into 2–3 category emails (dresses, knits, tops, etc.) with staggered send dates.
 */
export function buildMarketingStoryCalendar(
  products: Product[],
  projects: Project[] = [],
  horizonDays = 90,
  klaviyoInsights: MarketingKlaviyoInsights | null = null,
  marketing?: BrandMarketingSettings,
  cadenceTargets?: MarketingCadenceTargets
): MarketingStoryBeat[] {
  const targets = cadenceTargets ?? getMarketingCadenceTargets(marketing)
  const storyStagger = Math.max(1, Math.min(STORY_STAGGER_DAYS, Math.floor(idealDaysBetweenEmails(targets) / 2)))
  const now = new Date()
  const today = startOfDay(now)
  const horizonEnd = addDays(today, horizonDays)
  const projectById = new Map(projects.map((p) => [p.id, p.name]))

  const buckets = new Map<string, { sendDate: Date; products: StoryCalendarProduct[] }>()
  const allUpcoming: StoryCalendarProduct[] = []

  for (const p of products) {
    if (p.archived || p.stage === 'live') continue
    const live = goLiveDate(p)
    if (!live || live < today || live > horizonEnd) continue

    const family = normalizeCategoryFamily(p.category)
    const genderAudience = storyGenderAudience(p.gender)
    const launchType = inferLaunchType(p)

    const row: StoryCalendarProduct = {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      categoryFamily: family,
      categoryLabel: FAMILY_LABELS[family],
      genderAudience,
      genderLabel: storyGenderLabel(genderAudience),
      goLiveDate: live,
      stage: p.stage,
      stageLabel: STAGE_LABELS[p.stage],
      launchType,
      launchTypeLabel: LAUNCH_LABELS[launchType],
      projectName: p.projectId ? projectById.get(p.projectId) : undefined,
      gender: p.gender,
    }

    row.pipelineGoLiveDate = live
    allUpcoming.push(row)
  }

  const balancedUpcoming = balanceLaunchGoLiveDates(allUpcoming, today, horizonEnd)

  for (const row of balancedUpcoming) {
    const send = bestSendDateForProduct(row.goLiveDate, now)
    const key = dayKeyUTC(send)
    if (!buckets.has(key)) {
      buckets.set(key, { sendDate: send, products: [] })
    }
    buckets.get(key)!.products.push(row)
  }

  const launchesPerMonth = countLaunchesInNext30Days(balancedUpcoming, today)
  const mergedBuckets = mergeNearbySendBuckets(buckets)
  const launchBeats: MarketingStoryBeat[] = []

  for (const [key, bucket] of mergedBuckets) {
    const prods = bucket.products.sort(
      (a, b) => a.goLiveDate.getTime() - b.goLiveDate.getTime() || a.sku.localeCompare(b.sku)
    )
    const curate = shouldCurateByCategory(launchesPerMonth, prods.length)
    const groups = curateStoryGroups(prods, curate)

    groups.forEach((group, index) => {
      const sendDate = staggeredSendDate(bucket.sendDate, index, group.products, storyStagger)
      const channel = pickChannel(group.products, klaviyoInsights, targets, targets.smsPerMonth)
      const concept = craftCategoryLaunchStory(
        group.family,
        group.products,
        sendDate,
        channel,
        curate && groups.length > 1
      )
      const mix = launchMixCounts(group.products)
      const catLabel = FAMILY_LABELS[group.family]
      const theme = categoryStoryHeadline(group.family, group.products.length)

      launchBeats.push({
        id: `send-${key}-${group.family}-${index}`,
        sendDate,
        channel,
        storyKind: 'launch',
        categoryFamily: curate ? group.family : undefined,
        categoryLabel: curate ? catLabel : undefined,
        displayLabel: curate
          ? `${channel === 'email' ? 'Email' : 'SMS'} · ${catLabel} (${group.products.length})`
          : `${channel === 'email' ? 'Email' : 'SMS'} · ${theme}`,
        title: concept.title,
        storyAngle: concept.storyAngle,
        storyHooks: concept.storyHooks,
        products: group.products,
        launchWindowStart: group.products[0]?.goLiveDate ?? null,
        launchWindowEnd: group.products[group.products.length - 1]?.goLiveDate ?? null,
        stageSummary: stageSummary(group.products),
        launchMix: mix,
        commerceNote:
          'Shopify connection coming — best sellers and revenue will refine hero picks and placeholders.',
      })
    })
  }

  const launchAdjusted = applyCadenceTargetsToBeats(launchBeats, targets, horizonEnd)
  return ensureMonthlyCadenceBeats(launchAdjusted, targets, today, horizonEnd)
}

export function beatsForCalendarDay(beats: MarketingStoryBeat[], day: Date): MarketingStoryBeat[] {
  return beats.filter((b) => {
    const s = b.sendDate
    return (
      s.getUTCDate() === day.getUTCDate() &&
      s.getUTCMonth() === day.getUTCMonth() &&
      s.getUTCFullYear() === day.getUTCFullYear()
    )
  })
}

export function launchTypeBadgeClass(type: LaunchClassification): string {
  if (type === 'new') return 'bg-emerald-100 text-emerald-800'
  if (type === 'restock') return 'bg-sky-100 text-sky-800'
  if (type === 'new_color') return 'bg-violet-100 text-violet-800'
  return 'bg-bg text-muted border border-border'
}

export function genderAudienceBadgeClass(audience: StoryGenderAudience): string {
  if (audience === 'mens') return 'bg-blue-100 text-blue-800'
  if (audience === 'womens') return 'bg-pink-100 text-pink-800'
  if (audience === 'unisex') return 'bg-violet-100 text-violet-800'
  return 'bg-bg text-muted border border-border'
}

export function channelBadgeClass(channel: StoryChannel): string {
  if (channel === 'sms') return 'bg-violet-100 text-violet-800'
  return 'bg-emerald-100 text-emerald-800'
}
