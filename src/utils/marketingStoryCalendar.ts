import type { Product, Project, BrandMarketingSettings } from '@/types'
import type { MarketingEventRecord } from '@/types/marketingEvents'
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
  // Tops before bottoms — "short sleeve shirt" must not match a bare "short" bottoms rule
  if (/top|tee|t-?shirt|blouse|tank|shirt|camisole|bodysuit|polo|henley/.test(c)) return 'tops'
  if (/pant|trouser|jean|denim|bottom|legging|jogger|\bshorts\b/.test(c)) return 'bottoms'
  if (/skirt/.test(c)) return 'skirts'
  if (/jacket|coat|outer|blazer|vest|parka|puffer/.test(c)) return 'outerwear'
  if (/knit|sweater|cardigan|pullover|hoodie/.test(c)) return 'knits'
  if (/bag|shoe|access|hat|scarf|jewel|belt/.test(c)) return 'accessories'
  return 'other'
}

/** Prefer product name when category is generic or mis-tagged (e.g. "Short Sleeve" → bottoms). */
export function resolveCategoryFamily(category: string, name = ''): CategoryFamily {
  const fromCategory = normalizeCategoryFamily(category)
  const trimmedName = name.trim()
  if (!trimmedName) return fromCategory

  const fromName = normalizeCategoryFamily(trimmedName)
  if (fromCategory === fromName) return fromCategory
  if (fromName === 'other') return fromCategory

  const nameLower = trimmedName.toLowerCase()
  const nameHasGarmentSignal =
    /\b(shirt|tee|t-?shirt|blouse|tank|polo|henley|camisole|bodysuit)\b/.test(nameLower) ||
    /\b(pant|trouser|jean|legging|jogger)\b/.test(nameLower) ||
    /\bshorts\b/.test(nameLower) ||
    /\b(dress|skirt|jacket|coat|sweater|cardigan|hoodie|knit)\b/.test(nameLower)

  return nameHasGarmentSignal ? fromName : fromCategory
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

  // Multi-SKU launch stories default to email; SMS is a separate companion beat when the plan allows
  if (n >= 2 && !restockHeavy) return 'email'

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

export type MonthChannelOccupancy = Map<string, { email: number; sms: number }>

function channelFromKlaviyoRecord(r: MarketingEventRecord): StoryChannel | null {
  if (r.kind === 'sms_campaign' || r.channel === 'sms') return 'sms'
  if (r.kind === 'email_campaign' || r.channel === 'email') return 'email'
  return null
}

/** Scheduled Klaviyo sends per calendar month — subtract from the send plan before filling. */
export function klaviyoOccupancyByMonth(
  records: MarketingEventRecord[],
  rangeStart: Date,
  rangeEnd: Date
): MonthChannelOccupancy {
  const map: MonthChannelOccupancy = new Map()
  const start = rangeStart.getTime()
  const end = rangeEnd.getTime()

  for (const r of records) {
    if (r.source !== 'klaviyo' || !r.scheduledAt?.toDate) continue
    let sendDate: Date
    try {
      sendDate = startOfDay(r.scheduledAt.toDate())
      if (!Number.isFinite(sendDate.getTime())) continue
    } catch {
      continue
    }
    if (sendDate.getTime() < start || sendDate.getTime() > end) continue

    const channel = channelFromKlaviyoRecord(r)
    if (!channel) continue

    const mk = monthKeyUTC(sendDate)
    const slot = map.get(mk) ?? { email: 0, sms: 0 }
    if (channel === 'email') slot.email++
    else slot.sms++
    map.set(mk, slot)
  }

  return map
}

function monthOccupancy(
  occupancy: MonthChannelOccupancy,
  mk: string
): { email: number; sms: number } {
  return occupancy.get(mk) ?? { email: 0, sms: 0 }
}

function remainingMonthlyChannelTarget(
  targets: MarketingCadenceTargets,
  occupancy: MonthChannelOccupancy,
  mk: string,
  channel: StoryChannel
): number {
  const occ = monthOccupancy(occupancy, mk)
  if (channel === 'email') return Math.max(0, targets.emailsPerMonth - occ.email)
  return Math.max(0, targets.smsPerMonth - occ.sms)
}

function seedChannelCountMapsFromOccupancy(
  occupancy: MonthChannelOccupancy
): {
  emailByMonth: Map<string, number>
  smsByMonth: Map<string, number>
} {
  const emailByMonth = new Map<string, number>()
  const smsByMonth = new Map<string, number>()
  for (const [mk, counts] of occupancy) {
    if (counts.email > 0) emailByMonth.set(mk, counts.email)
    if (counts.sms > 0) smsByMonth.set(mk, counts.sms)
  }
  return { emailByMonth, smsByMonth }
}

function launchStoryFamily(beat: MarketingStoryBeat): CategoryFamily {
  if (beat.products.length > 0) return dominantCategoryFamily(beat.products)
  if (beat.categoryFamily) return beat.categoryFamily
  return 'other'
}

function launchStoryTheme(beat: MarketingStoryBeat): string {
  const n = beat.products.length
  if (n === 1 && beat.products[0]) return beat.products[0].name
  return categoryStoryHeadline(launchStoryFamily(beat), n)
}

/** Keep title, hooks, and chip label aligned when channel or send date changes. */
function finalizeLaunchBeat(beat: MarketingStoryBeat): MarketingStoryBeat {
  if (beat.storyKind !== 'launch' || beat.products.length === 0) return beat

  const family = launchStoryFamily(beat)
  const unanimousFamily = beat.products.every((p) => p.categoryFamily === family)
  const curated =
    unanimousFamily && beat.products.length >= MIN_FAMILY_SIZE_FOR_OWN_STORY
  const concept = craftCategoryLaunchStory(
    family,
    beat.products,
    beat.sendDate,
    beat.channel,
    curated
  )
  const n = beat.products.length
  const theme = launchStoryTheme(beat)
  const catLabel = FAMILY_LABELS[family]
  const channelPrefix = beat.channel === 'email' ? 'Email' : 'SMS'

  return {
    ...beat,
    categoryFamily: curated ? family : undefined,
    categoryLabel: curated ? catLabel : undefined,
    title: concept.title,
    storyAngle: concept.storyAngle,
    storyHooks: concept.storyHooks,
    displayLabel: curated
      ? `${channelPrefix} · ${catLabel} (${n})`
      : `${channelPrefix} · ${theme}`,
  }
}

function refreshBeatLabels(beat: MarketingStoryBeat): MarketingStoryBeat {
  if (beat.storyKind === 'launch') return finalizeLaunchBeat(beat)
  return beat
}

/** Fit launch beats into monthly email/SMS targets by nudging send dates forward */
function applyCadenceTargetsToBeats(
  beats: MarketingStoryBeat[],
  targets: MarketingCadenceTargets,
  horizonEnd: Date,
  klaviyoOccupancy: MonthChannelOccupancy = new Map()
): MarketingStoryBeat[] {
  const { emailByMonth, smsByMonth } = seedChannelCountMapsFromOccupancy(klaviyoOccupancy)
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
      const emailCap = remainingMonthlyChannelTarget(targets, klaviyoOccupancy, mk, 'email')
      const smsCap = remainingMonthlyChannelTarget(targets, klaviyoOccupancy, mk, 'sms')

      const preferSms = channel === 'sms'
      if (preferSms && smsUsed < smsCap) {
        smsByMonth.set(mk, smsUsed + 1)
        placed = true
        break
      }
      if (emailsUsed < emailCap) {
        channel = 'email'
        emailByMonth.set(mk, emailsUsed + 1)
        placed = true
        break
      }
      if (preferSms && emailsUsed < emailCap) {
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
      finalizeLaunchBeat({
        ...beat,
        sendDate: send,
        channel,
      })
    )
  }

  return [...adjusted, ...rest].sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime())
}

function shouldOfferCompanionSms(
  beat: MarketingStoryBeat,
  targets: MarketingCadenceTargets
): boolean {
  if (beat.storyKind !== 'launch' || beat.channel !== 'email' || targets.smsPerMonth <= 0) {
    return false
  }
  if (beat.products.length >= 2) return true
  const mix = launchMixCounts(beat.products)
  return mix.restock >= 1 || mix.new_color >= 1
}

function featuredProductIds(beats: MarketingStoryBeat[]): Set<string> {
  const ids = new Set<string>()
  for (const b of beats) {
    for (const p of b.products) ids.add(p.id)
  }
  return ids
}

/** Pick pipeline SKUs not in the parent email when other products need coverage. */
function pickAlternateProductsForCompanionSms(
  emailBeat: MarketingStoryBeat,
  pipeline: StoryCalendarProduct[],
  featuredInMonth: Set<string>,
  smsSendDate: Date
): StoryCalendarProduct[] | null {
  const exclude = new Set(emailBeat.products.map((p) => p.id))
  if (pipeline.length === 0) return null

  const windowStart = addDays(smsSendDate, -7)
  const windowEnd = addDays(smsSendDate, 21)

  let candidates = pipeline.filter(
    (p) => !exclude.has(p.id) && p.goLiveDate >= windowStart && p.goLiveDate <= windowEnd
  )
  if (candidates.length === 0) {
    candidates = pipeline.filter((p) => !exclude.has(p.id))
  }
  if (candidates.length === 0) return null

  const unfeatured = candidates.filter((p) => !featuredInMonth.has(p.id))
  if (unfeatured.length > 0) candidates = unfeatured

  const emailFamily = launchStoryFamily(emailBeat)
  const otherFamily = candidates.filter((p) => p.categoryFamily !== emailFamily)
  if (otherFamily.length > 0) candidates = otherFamily

  const byFamily = new Map<CategoryFamily, StoryCalendarProduct[]>()
  for (const p of candidates) {
    const list = byFamily.get(p.categoryFamily) ?? []
    list.push(p)
    byFamily.set(p.categoryFamily, list)
  }

  let bestGroup: StoryCalendarProduct[] = []
  for (const [, group] of byFamily) {
    const sorted = group.sort(
      (a, b) => a.goLiveDate.getTime() - b.goLiveDate.getTime() || a.sku.localeCompare(b.sku)
    )
    if (sorted.length > bestGroup.length) {
      bestGroup = sorted.slice(0, 4)
    }
  }

  if (bestGroup.length === 0) {
    bestGroup = candidates
      .sort((a, b) => a.goLiveDate.getTime() - b.goLiveDate.getTime())
      .slice(0, Math.min(3, candidates.length))
  }

  return bestGroup.length > 0 ? bestGroup : null
}

type PlaceholderConcept = {
  title: string
  storyAngle: string
  storyHooks: string[]
  displayLabel: string
  storyKind: StoryKind
}

function pickProductsForCadenceFiller(
  concept: PlaceholderConcept,
  pipeline: StoryCalendarProduct[],
  featured: Set<string>,
  sendDate: Date,
  max = 4
): StoryCalendarProduct[] {
  if (pipeline.length === 0) return []

  let pool = pipeline.filter((p) => !featured.has(p.id))
  if (pool.length === 0) pool = [...pipeline]

  if (concept.storyKind === 'best_sellers' || concept.title.includes('Best sellers')) {
    const byFamily = new Map<CategoryFamily, StoryCalendarProduct[]>()
    for (const p of pool) {
      const list = byFamily.get(p.categoryFamily) ?? []
      list.push(p)
      byFamily.set(p.categoryFamily, list)
    }
    const picked: StoryCalendarProduct[] = []
    const families = [...byFamily.keys()].sort(
      (a, b) => (byFamily.get(b)?.length ?? 0) - (byFamily.get(a)?.length ?? 0)
    )
    for (const family of families) {
      if (picked.length >= max) break
      const group = byFamily.get(family)!
      const hero = group.sort((a, b) => a.sku.localeCompare(b.sku))[0]
      if (hero) picked.push(hero)
    }
    return picked
  }

  if (concept.title.includes('Brand digest')) {
    const windowEnd = addDays(sendDate, 21)
    const near = pool
      .filter((p) => p.goLiveDate >= sendDate && p.goLiveDate <= windowEnd)
      .sort((a, b) => a.goLiveDate.getTime() - b.goLiveDate.getTime())
    return near.length >= 2 ? near.slice(0, Math.min(6, max + 2)) : pool.slice(0, max)
  }

  if (concept.title.includes('Collection spotlight')) {
    const groups = curateStoryGroups(pool, pool.length >= MIN_PRODUCTS_IN_BUCKET_TO_CURATE)
    const best = [...groups].sort((a, b) => b.products.length - a.products.length)[0]
    return best ? best.products.slice(0, max) : pool.slice(0, max)
  }

  const near = pool
    .filter((p) => {
      const gap = daysBetween(sendDate, p.goLiveDate)
      return gap >= -7 && gap <= 14
    })
    .sort(
      (a, b) =>
        Math.abs(daysBetween(sendDate, a.goLiveDate)) -
        Math.abs(daysBetween(sendDate, b.goLiveDate))
    )
  return near.length > 0 ? near.slice(0, 1) : pool.slice(0, 1)
}

/** Separate SMS chip for launch stories when the monthly SMS plan has room. */
function addCompanionSmsBeats(
  beats: MarketingStoryBeat[],
  pipeline: StoryCalendarProduct[],
  targets: MarketingCadenceTargets,
  horizonEnd: Date,
  klaviyoOccupancy: MonthChannelOccupancy = new Map()
): MarketingStoryBeat[] {
  const smsByMonth = new Map<string, number>()
  for (const [mk, counts] of klaviyoOccupancy) {
    if (counts.sms > 0) smsByMonth.set(mk, counts.sms)
  }
  for (const b of beats) {
    if (b.channel === 'sms') {
      const mk = monthKeyUTC(b.sendDate)
      smsByMonth.set(mk, (smsByMonth.get(mk) ?? 0) + 1)
    }
  }

  const companions: MarketingStoryBeat[] = []

  const slots = seedChannelSlotsFromBeats(beats)
  const lastByChannel: Record<StoryChannel, Date | null> = { email: null, sms: null }
  for (const b of beats) {
    if (b.channel === 'email' || b.channel === 'sms') {
      lastByChannel[b.channel] = b.sendDate
    }
  }
  const placedDates: Date[] = beats.map((b) => b.sendDate)
  const featuredByMonth = new Map<string, Set<string>>()
  for (const b of beats) {
    const mk = monthKeyUTC(b.sendDate)
    const set = featuredByMonth.get(mk) ?? new Set<string>()
    for (const p of b.products) set.add(p.id)
    featuredByMonth.set(mk, set)
  }

  for (const beat of beats) {
    if (!shouldOfferCompanionSms(beat, targets)) continue

    const mk = monthKeyUTC(beat.sendDate)
    const smsCap = remainingMonthlyChannelTarget(targets, klaviyoOccupancy, mk, 'sms')
    if ((smsByMonth.get(mk) ?? 0) >= smsCap) continue

    const { start, end } = monthRangeBounds(beat.sendDate, beat.sendDate, horizonEnd)
    const smsIdx = (smsByMonth.get(mk) ?? 0) + 1
    const smsTotal = Math.max(smsCap, smsIdx)
    const ideal = evenlySpacedDayInRange(start, end, smsIdx, smsTotal)
    const preferred = daysBetween(ideal, beat.sendDate) >= 1 ? ideal : addDays(beat.sendDate, 2)

    const smsSend = findBestStoryChannelSendDay(
      preferred,
      'sms',
      slots,
      lastByChannel,
      addDays(beat.sendDate, 1),
      horizonEnd,
      smsIdx,
      smsTotal,
      MIN_SAME_CHANNEL_GAP_DAYS,
      placedDates,
      true
    )
    if (!smsSend || daysBetween(beat.sendDate, smsSend) < 1) continue

    const monthFeatured = featuredByMonth.get(mk) ?? new Set<string>()
    const smsProducts = pickAlternateProductsForCompanionSms(
      beat,
      pipeline,
      monthFeatured,
      smsSend
    )
    if (!smsProducts || smsProducts.length === 0) continue

    smsByMonth.set(mk, (smsByMonth.get(mk) ?? 0) + 1)
    occupyChannelSlot(slots, smsSend, 'sms')
    lastByChannel.sms = smsSend
    placedDates.push(smsSend)

    const family = dominantCategoryFamily(smsProducts)
    const curated = smsProducts.length >= MIN_FAMILY_SIZE_FOR_OWN_STORY
    const catLabel = FAMILY_LABELS[family]
    const mix = launchMixCounts(smsProducts)

    for (const p of smsProducts) monthFeatured.add(p.id)
    featuredByMonth.set(mk, monthFeatured)

    companions.push(
      finalizeLaunchBeat({
        ...beat,
        id: `${beat.id}-sms`,
        sendDate: smsSend,
        channel: 'sms',
        categoryFamily: curated ? family : undefined,
        categoryLabel: curated ? catLabel : undefined,
        products: smsProducts,
        launchWindowStart: smsProducts[0]?.goLiveDate ?? null,
        launchWindowEnd: smsProducts[smsProducts.length - 1]?.goLiveDate ?? null,
        stageSummary: stageSummary(smsProducts),
        launchMix: mix,
      })
    )
  }

  if (companions.length === 0) return beats
  return [...beats, ...companions].sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime())
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

function craftSmsBestSellersPlaceholder(sendDate: Date): {
  title: string
  storyAngle: string
  storyHooks: string[]
  displayLabel: string
  storyKind: StoryKind
} {
  const sendStr = sendDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    displayLabel: 'SMS · Best sellers',
    storyKind: 'best_sellers',
    title: 'SMS: Best sellers',
    storyAngle: `Cadence fill on ${sendStr} — quick SMS hit for customer favorites or pipeline heroes.`,
    storyHooks: [
      'One hero SKU + shop link until Shopify sync surfaces revenue leaders',
      'Good between launch waves when email already ran this week',
    ],
  }
}

function makePlaceholderBeat(
  id: string,
  sendDate: Date,
  channel: StoryChannel,
  concept: ReturnType<typeof craftBestSellersPlaceholder>,
  products: StoryCalendarProduct[] = []
): MarketingStoryBeat {
  const channelPrefix = channel === 'email' ? 'Email' : 'SMS'
  let displayLabel = concept.displayLabel
  let storyHooks = [...concept.storyHooks]

  if (products.length > 0) {
    const heroNames = products
      .slice(0, 3)
      .map((p) => p.name)
      .join(', ')
    if (concept.storyKind === 'best_sellers') {
      displayLabel = `${channelPrefix} · Best sellers (${products.length})`
      storyHooks = [
        `Pipeline heroes for now: ${heroNames}${products.length > 3 ? ` +${products.length - 3} more` : ''}`,
        ...concept.storyHooks.slice(1),
      ]
    } else if (concept.title.includes('Collection spotlight')) {
      const family = dominantCategoryFamily(products)
      displayLabel = `${channelPrefix} · ${FAMILY_LABELS[family]} spotlight (${products.length})`
      storyHooks = [
        `Rotate ${FAMILY_LABELS[family].toLowerCase()}: ${heroNames}`,
        ...concept.storyHooks.slice(1),
      ]
    } else if (concept.title.includes('Brand digest')) {
      displayLabel = `${channelPrefix} · Brand digest (${products.length})`
      storyHooks = [`Featuring: ${heroNames}`, ...concept.storyHooks.slice(1)]
    } else if (concept.title.includes('Touchpoint')) {
      displayLabel = `${channelPrefix} · ${products[0]?.name ?? 'Touchpoint'}`
      storyHooks = [`Quick hook: ${products[0]?.name ?? 'pick one hero'}`, ...concept.storyHooks.slice(1)]
    }
  }

  const windowStart =
    products.length > 0
      ? new Date(Math.min(...products.map((p) => p.goLiveDate.getTime())))
      : null
  const windowEnd =
    products.length > 0
      ? new Date(Math.max(...products.map((p) => p.goLiveDate.getTime())))
      : null

  return {
    id,
    sendDate,
    channel,
    storyKind: concept.storyKind,
    displayLabel,
    title: concept.title,
    storyAngle: concept.storyAngle,
    storyHooks,
    products,
    launchWindowStart: windowStart,
    launchWindowEnd: windowEnd,
    stageSummary: products.length > 0 ? stageSummary(products) : '—',
    launchMix: products.length > 0 ? launchMixCounts(products) : { new: 0, restock: 0, new_color: 0, extension: 0 },
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
/** Max one email and one SMS per calendar day; gap between same-channel sends. */
const MAX_SENDS_PER_CHANNEL_PER_DAY = 1
const MIN_SAME_CHANNEL_GAP_DAYS = 2

type DayChannelSlots = { email: number; sms: number }

function emptyDayChannelSlots(): DayChannelSlots {
  return { email: 0, sms: 0 }
}

function channelSlotCount(slots: DayChannelSlots, channel: StoryChannel): number {
  return channel === 'email' ? slots.email : slots.sms
}

function occupyChannelSlot(
  map: Map<string, DayChannelSlots>,
  day: Date,
  channel: StoryChannel
): void {
  const key = dayKeyUTC(day)
  const slots = map.get(key) ?? emptyDayChannelSlots()
  if (channel === 'email') slots.email++
  else slots.sms++
  map.set(key, slots)
}

function seedChannelSlotsFromBeats(beats: MarketingStoryBeat[]): Map<string, DayChannelSlots> {
  const map = new Map<string, DayChannelSlots>()
  for (const b of beats) {
    occupyChannelSlot(map, b.sendDate, b.channel)
  }
  return map
}

function parseDayKeyUTC(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0, 0))
}

function canPlaceChannelOnDay(
  map: Map<string, DayChannelSlots>,
  day: Date,
  channel: StoryChannel,
  lastSameChannel: Date | null,
  minGap: number,
  separateEmailSmsOnDay = true
): boolean {
  const slots = map.get(dayKeyUTC(day)) ?? emptyDayChannelSlots()
  if (channelSlotCount(slots, channel) >= MAX_SENDS_PER_CHANNEL_PER_DAY) return false
  if (separateEmailSmsOnDay) {
    if (channel === 'email' && slots.sms > 0) return false
    if (channel === 'sms' && slots.email > 0) return false
  }
  const dayKey = dayKeyUTC(day)
  for (const [key, daySlots] of map) {
    if (channelSlotCount(daySlots, channel) <= 0) continue
    if (key === dayKey) continue
    if (Math.abs(daysBetween(parseDayKeyUTC(key), day)) < minGap) return false
  }
  if (
    lastSameChannel &&
    dayKeyUTC(lastSameChannel) !== dayKey &&
    daysBetween(lastSameChannel, day) < minGap
  ) {
    return false
  }
  return true
}

function adaptiveChannelGap(
  channelTotal: number,
  rangeStart: Date,
  rangeEnd: Date,
  floor = MIN_SAME_CHANNEL_GAP_DAYS
): number {
  if (channelTotal <= 1) return floor
  const span = daysBetween(rangeStart, rangeEnd)
  return Math.max(floor, Math.floor(span / channelTotal))
}

function seedSlotsFromKlaviyoRecords(
  records: MarketingEventRecord[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, DayChannelSlots> {
  const slots = new Map<string, DayChannelSlots>()
  const start = rangeStart.getTime()
  const end = rangeEnd.getTime()

  for (const r of records) {
    if (r.source !== 'klaviyo' || !r.scheduledAt?.toDate) continue
    const channel = channelFromKlaviyoRecord(r)
    if (!channel) continue
    let sendDate: Date
    try {
      sendDate = startOfDay(r.scheduledAt.toDate())
      if (!Number.isFinite(sendDate.getTime())) continue
    } catch {
      continue
    }
    if (sendDate.getTime() < start || sendDate.getTime() > end) continue
    occupyChannelSlot(slots, sendDate, channel)
  }

  return slots
}

/** Snap to the nearest valid day around a monthly spread anchor (full-month balance). */
export function snapSendToMonthlySpreadDay(
  ideal: Date,
  channel: StoryChannel,
  slots: Map<string, DayChannelSlots>,
  rangeStart: Date,
  rangeEnd: Date,
  minGap: number,
  preferredFallback?: Date
): Date | null {
  const candidates: Date[] = [ideal]
  for (let delta = 1; delta <= 31; delta++) {
    const after = addDays(ideal, delta)
    const before = addDays(ideal, -delta)
    if (after <= rangeEnd) candidates.push(after)
    if (before >= rangeStart) candidates.push(before)
  }

  let best: Date | null = null
  let bestScore = -Infinity
  for (const d of candidates) {
    if (d < rangeStart || d > rangeEnd) continue
    if (!canPlaceChannelOnDay(slots, d, channel, null, minGap, true)) continue

    let score = -Math.abs(daysBetween(d, ideal)) * 10
    score += weekdayPlacementScore(d, null) * 0.15
    if (preferredFallback) {
      score -= Math.abs(daysBetween(d, preferredFallback)) * 0.1
    }

    if (score > bestScore) {
      bestScore = score
      best = d
    }
  }

  return best
}

function dayTotalSends(slots: Map<string, DayChannelSlots>, day: Date): number {
  const s = slots.get(dayKeyUTC(day)) ?? emptyDayChannelSlots()
  return s.email + s.sms
}

function dayOfWeekUTC(d: Date): number {
  return d.getUTCDay()
}

/** Weekends slightly favored; weekdays stay open for breathing room. */
function weekdayPlacementScore(d: Date, lastPlacedDow: number | null): number {
  const dow = dayOfWeekUTC(d)
  let score = 0
  if (dow === 6) score = 14
  else if (dow === 0) score = 12
  else if (dow === 5) score = 11
  else if (dow === 4) score = 4
  else if (dow === 3) score = 2
  else if (dow === 2) score = 1
  if (lastPlacedDow != null && dow === lastPlacedDow) score -= 4
  return score
}

function monthRangeBounds(
  anchor: Date,
  rangeStart: Date,
  rangeEnd: Date
): { start: Date; end: Date } {
  const monthStart = monthAnchorUTC(anchor.getUTCFullYear(), anchor.getUTCMonth())
  const monthEnd = endOfMonthUTC(monthStart)
  const start = monthStart > rangeStart ? monthStart : rangeStart
  const end = monthEnd < rangeEnd ? monthEnd : rangeEnd
  return { start, end }
}

function evenlySpacedDayInRange(
  rangeStart: Date,
  rangeEnd: Date,
  index: number,
  total: number
): Date {
  if (total <= 1) return rangeStart
  const span = daysBetween(rangeStart, rangeEnd)
  const offset = Math.round((index / (total - 1)) * span)
  return addDays(rangeStart, offset)
}

/** Ideal send day for even coverage within a calendar month. */
export function storyMonthSpreadIdealDay(
  anchor: Date,
  rangeStart: Date,
  rangeEnd: Date,
  index: number,
  total: number
): Date {
  const { spreadStart, monthEnd } = storyMonthSpreadBounds(anchor, rangeStart, rangeEnd)
  return evenlySpacedDayInRange(spreadStart, monthEnd, index, total)
}

export function storyMonthSpreadBounds(
  anchor: Date,
  rangeStart: Date,
  rangeEnd: Date
): { spreadStart: Date; monthEnd: Date } {
  const { start, end } = monthRangeBounds(anchor, rangeStart, rangeEnd)
  return { spreadStart: start < rangeStart ? rangeStart : start, monthEnd: end }
}

function weekChannelLoadInMonth(d: Date, sendDates: Date[]): number {
  const mk = monthKeyUTC(d)
  const week = Math.floor((d.getUTCDate() - 1) / 7)
  let n = 0
  for (const s of sendDates) {
    if (monthKeyUTC(s) !== mk) continue
    if (Math.floor((s.getUTCDate() - 1) / 7) !== week) continue
    n++
  }
  return n
}

export function findBestStoryChannelSendDay(
  preferred: Date,
  channel: StoryChannel,
  slots: Map<string, DayChannelSlots>,
  lastByChannel: Record<StoryChannel, Date | null>,
  rangeStart: Date,
  rangeEnd: Date,
  monthIndex: number,
  monthTotal: number,
  minGap: number,
  placedSendDates: Date[],
  separateEmailSmsOnDay = true
): Date | null {
  const { start, end } = monthRangeBounds(preferred, rangeStart, rangeEnd)
  if (start > end) return null

  const idealSpread = evenlySpacedDayInRange(start, end, monthIndex, monthTotal)
  const lastPlaced = placedSendDates[placedSendDates.length - 1]
  const lastPlacedDow = lastPlaced ? dayOfWeekUTC(lastPlaced) : null
  let best: Date | null = null
  let bestScore = -Infinity

  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (
      !canPlaceChannelOnDay(
        slots,
        d,
        channel,
        lastByChannel[channel],
        minGap,
        separateEmailSmsOnDay
      )
    ) {
      continue
    }

    let score = weekdayPlacementScore(d, lastPlacedDow)
    score -= Math.abs(daysBetween(d, idealSpread)) * 2.2
    score -= Math.abs(daysBetween(d, preferred)) * 0.25
    score -= weekChannelLoadInMonth(d, placedSendDates) * 6
    score -= dayTotalSends(slots, d) * 3

    if (score > bestScore) {
      bestScore = score
      best = d
    }
  }

  return best
}

function sortBeatsForChannelSpread(beats: MarketingStoryBeat[]): MarketingStoryBeat[] {
  return [...beats].sort(
    (a, b) =>
      beatSpreadPriority(a) - beatSpreadPriority(b) ||
      a.sendDate.getTime() - b.sendDate.getTime() ||
      a.id.localeCompare(b.id)
  )
}

function spreadChannelBeatsInMonth(
  beats: MarketingStoryBeat[],
  channel: StoryChannel,
  spreadStart: Date,
  monthEnd: Date,
  slots: Map<string, DayChannelSlots>
): MarketingStoryBeat[] {
  const channelBeats = sortBeatsForChannelSpread(beats.filter((b) => b.channel === channel))
  if (channelBeats.length === 0) return []

  const total = channelBeats.length
  const minGap = adaptiveChannelGap(total, spreadStart, monthEnd)
  const placed: MarketingStoryBeat[] = []

  for (let i = 0; i < channelBeats.length; i++) {
    const beat = channelBeats[i]!
    const ideal = evenlySpacedDayInRange(spreadStart, monthEnd, i, total)
    const sendDay =
      snapSendToMonthlySpreadDay(ideal, channel, slots, spreadStart, monthEnd, minGap, beat.sendDate) ??
      fallbackStorySendDay(ideal, beat, slots, { email: null, sms: null }, spreadStart, monthEnd, minGap)

    if (!sendDay) {
      placed.push(beat)
      continue
    }

    occupyChannelSlot(slots, sendDay, channel)
    placed.push(reseatStoryBeatOnDate(beat, sendDay))
  }

  return placed
}

type PlaceholderCraft = (sendDate: Date) => {
  title: string
  storyAngle: string
  storyHooks: string[]
  displayLabel: string
  storyKind: StoryKind
}

function beatSpreadPriority(beat: MarketingStoryBeat): number {
  if (beat.storyKind === 'launch') return 0
  if (beat.storyKind === 'best_sellers') return 1
  return 2
}

function pickPlaceholderCraftForBeat(beat: MarketingStoryBeat): PlaceholderCraft | null {
  if (beat.storyKind === 'best_sellers' || beat.title.includes('Best sellers')) {
    return beat.channel === 'sms' ? craftSmsBestSellersPlaceholder : craftBestSellersPlaceholder
  }
  if (beat.title.includes('Collection spotlight')) return craftCollectionHighlightPlaceholder
  if (beat.title.includes('Brand digest')) return craftBrandDigestPlaceholder
  if (beat.channel === 'sms') return craftSmsTouchpointPlaceholder
  return craftCollectionHighlightPlaceholder
}

/** Re-align beat copy and chip label after a send date move (exported for calendar view). */
export function reseatStoryBeatOnDate(beat: MarketingStoryBeat, sendDate: Date): MarketingStoryBeat {
  if (beat.storyKind === 'launch') {
    return finalizeLaunchBeat({ ...beat, sendDate })
  }
  const craft = pickPlaceholderCraftForBeat(beat)
  if (craft) {
    return makePlaceholderBeat(beat.id, sendDate, beat.channel, craft(sendDate), beat.products)
  }
  return refreshBeatLabels({ ...beat, sendDate })
}

/** Even full-month coverage per channel; Klaviyo days stay occupied. */
function spreadBeatsAcrossMonth(
  beats: MarketingStoryBeat[],
  horizonEnd: Date,
  today: Date,
  klaviyoRecords: MarketingEventRecord[] = []
): MarketingStoryBeat[] {
  const byMonth = new Map<string, MarketingStoryBeat[]>()
  for (const beat of beats) {
    const mk = monthKeyUTC(beat.sendDate)
    const list = byMonth.get(mk)
    if (list) list.push(beat)
    else byMonth.set(mk, [beat])
  }

  const slots = seedSlotsFromKlaviyoRecords(klaviyoRecords, today, horizonEnd)
  const placed: MarketingStoryBeat[] = []

  const monthKeys = [...byMonth.keys()].sort()
  for (const mk of monthKeys) {
    const monthBeats = byMonth.get(mk) ?? []
    if (monthBeats.length === 0) continue

    const anchor = monthBeats[0]!.sendDate
    const { start, end } = monthRangeBounds(anchor, today, horizonEnd)
    const spreadStart = start < today ? today : start

    placed.push(
      ...spreadChannelBeatsInMonth(monthBeats, 'email', spreadStart, end, slots),
      ...spreadChannelBeatsInMonth(monthBeats, 'sms', spreadStart, end, slots)
    )
  }

  return placed.sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime())
}

function fallbackStorySendDay(
  ideal: Date,
  beat: MarketingStoryBeat,
  slots: Map<string, DayChannelSlots>,
  lastByChannel: Record<StoryChannel, Date | null>,
  today: Date,
  horizonEnd: Date,
  minGap: number
): Date | null {
  const candidates = [ideal, beat.sendDate, today].filter((d) => d >= today && d <= horizonEnd)
  for (const start of candidates) {
    for (let offset = 0; offset < 31; offset++) {
      const day = addDays(start, offset)
      if (day > horizonEnd) break
      if (
        canPlaceChannelOnDay(slots, day, beat.channel, lastByChannel[beat.channel], minGap, true)
      ) {
        return day
      }
    }
  }
  return beat.sendDate >= today && beat.sendDate <= horizonEnd ? beat.sendDate : null
}

/** Spread plan-fill sends across the month until monthly targets are met. */
function fillChannelForMonth(
  result: MarketingStoryBeat[],
  channelSlots: Map<string, DayChannelSlots>,
  mk: string,
  rangeStart: Date,
  rangeEnd: Date,
  channel: StoryChannel,
  targetCount: number,
  startCount: number,
  idealGap: number,
  crafts: PlaceholderCraft[],
  idPrefix: string,
  pipeline: StoryCalendarProduct[],
  featured: Set<string>
): number {
  let count = startCount
  if (targetCount <= 0 || count >= targetCount) return count

  const needed = targetCount - count
  const minSpacing = adaptiveChannelGap(needed, rangeStart, rangeEnd, Math.max(2, Math.min(idealGap, 4)))
  const sendDays: Date[] = []

  for (let i = 0; i < needed; i++) {
    const ideal = evenlySpacedDayInRange(rangeStart, rangeEnd, i, needed)
    const day = snapSendToMonthlySpreadDay(ideal, channel, channelSlots, rangeStart, rangeEnd, minSpacing)
    if (!day) break
    sendDays.push(day)
    occupyChannelSlot(channelSlots, day, channel)
  }

  let fillRot = 0
  for (const sendDate of sendDays) {
    if (count >= targetCount || result.length >= MAX_STORY_BEATS_TOTAL) break
    const craft = crafts[fillRot % crafts.length]
    if (!craft) continue
    const concept = craft(sendDate)
    const products = pickProductsForCadenceFiller(concept, pipeline, featured, sendDate)
    for (const p of products) featured.add(p.id)
    result.push(
      makePlaceholderBeat(`${idPrefix}-${mk}-${fillRot}`, sendDate, channel, concept, products)
    )
    count++
    fillRot++
  }

  return count
}

function ensureMonthlyCadenceBeats(
  beats: MarketingStoryBeat[],
  pipeline: StoryCalendarProduct[],
  targets: MarketingCadenceTargets,
  today: Date,
  horizonEnd: Date,
  klaviyoOccupancy: MonthChannelOccupancy = new Map()
): MarketingStoryBeat[] {
  const result = [...beats]
  const emailGap = Math.max(2, idealDaysBetweenEmails(targets))
  const smsGap = Math.max(3, idealDaysBetweenSms(targets))
  const emailFillers = [
    craftBestSellersPlaceholder,
    craftCollectionHighlightPlaceholder,
    craftBrandDigestPlaceholder,
  ]
  const channelSlots = seedChannelSlotsFromBeats(result)
  const featured = featuredProductIds(result)

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

    const emailTarget = remainingMonthlyChannelTarget(targets, klaviyoOccupancy, mk, 'email')
    const smsTarget = remainingMonthlyChannelTarget(targets, klaviyoOccupancy, mk, 'sms')
    const emailsBefore = emailCountByMonth.get(mk) ?? 0
    const emailsAfter = fillChannelForMonth(
      result,
      channelSlots,
      mk,
      rangeStart,
      rangeEnd,
      'email',
      emailTarget,
      emailsBefore,
      emailGap,
      emailFillers,
      'fill-email',
      pipeline,
      featured
    )
    emailCountByMonth.set(mk, emailsAfter)

    const smsBefore = smsCountByMonth.get(mk) ?? 0
    const smsAfter = fillChannelForMonth(
      result,
      channelSlots,
      mk,
      rangeStart,
      rangeEnd,
      'sms',
      smsTarget,
      smsBefore,
      smsGap,
      [craftSmsBestSellersPlaceholder, craftSmsTouchpointPlaceholder],
      'fill-sms',
      pipeline,
      featured
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
  cadenceTargets?: MarketingCadenceTargets,
  klaviyoRecords: MarketingEventRecord[] = []
): MarketingStoryBeat[] {
  const targets = cadenceTargets ?? getMarketingCadenceTargets(marketing)
  const storyStagger = Math.max(1, Math.min(STORY_STAGGER_DAYS, Math.floor(idealDaysBetweenEmails(targets) / 2)))
  const now = new Date()
  const today = startOfDay(now)
  const horizonEnd = addDays(today, horizonDays)
  const klaviyoOccupancy = klaviyoOccupancyByMonth(klaviyoRecords, today, horizonEnd)
  const projectById = new Map(projects.map((p) => [p.id, p.name]))

  const buckets = new Map<string, { sendDate: Date; products: StoryCalendarProduct[] }>()
  const allUpcoming: StoryCalendarProduct[] = []

  for (const p of products) {
    if (p.archived || p.stage === 'live') continue
    const live = goLiveDate(p)
    if (!live || live < today || live > horizonEnd) continue

    const family = resolveCategoryFamily(p.category, p.name)
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
      const mix = launchMixCounts(group.products)
      const catLabel = FAMILY_LABELS[group.family]

      launchBeats.push(
        finalizeLaunchBeat({
          id: `send-${key}-${group.family}-${index}`,
          sendDate,
          channel,
          storyKind: 'launch',
          categoryFamily: curate ? group.family : undefined,
          categoryLabel: curate ? catLabel : undefined,
          displayLabel: '',
          title: '',
          storyAngle: '',
          storyHooks: [],
          products: group.products,
          launchWindowStart: group.products[0]?.goLiveDate ?? null,
          launchWindowEnd: group.products[group.products.length - 1]?.goLiveDate ?? null,
          stageSummary: stageSummary(group.products),
          launchMix: mix,
          commerceNote:
            'Shopify connection coming — best sellers and revenue will refine hero picks and placeholders.',
        })
      )
    })
  }

  const launchAdjusted = applyCadenceTargetsToBeats(
    launchBeats,
    targets,
    horizonEnd,
    klaviyoOccupancy
  )
  const withSmsCompanions = addCompanionSmsBeats(
    launchAdjusted,
    balancedUpcoming,
    targets,
    horizonEnd,
    klaviyoOccupancy
  )
  const filled = ensureMonthlyCadenceBeats(
    withSmsCompanions,
    balancedUpcoming,
    targets,
    today,
    horizonEnd,
    klaviyoOccupancy
  )
  return spreadBeatsAcrossMonth(filled, horizonEnd, today, klaviyoRecords)
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

/** Men's / Women's tags for calendar chips when story products include those audiences. */
export function storyGenderTagsForBeat(
  beat: Pick<MarketingStoryBeat, 'products'> | null | undefined
): Array<'mens' | 'womens'> {
  if (!beat?.products.length) return []
  let hasMens = false
  let hasWomens = false
  for (const p of beat.products) {
    if (p.genderAudience === 'mens') hasMens = true
    if (p.genderAudience === 'womens') hasWomens = true
  }
  const tags: Array<'mens' | 'womens'> = []
  if (hasMens) tags.push('mens')
  if (hasWomens) tags.push('womens')
  return tags
}

export function channelBadgeClass(channel: StoryChannel): string {
  if (channel === 'sms') return 'bg-violet-100 text-violet-800'
  return 'bg-emerald-100 text-emerald-800'
}
