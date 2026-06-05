import type { Product } from '@/types'
import type { MarketingEventRecord } from '@/types/marketingEvents'
import type { MarketingEventKind } from '@/types/integrations'
import type { MarketingStoryBeat, StoryChannel } from '@/utils/marketingStoryCalendar'
import { storyBeatChipColor, storyBeatDayKey } from '@/utils/marketingStoryCalendar'
import { findProductForCampaignTitle } from '@/utils/klaviyoCampaignMatch'

const MS_DAY = 24 * 60 * 60 * 1000

export interface ProductStoryCampaignRef {
  displayLabel: string
  channel: 'email' | 'sms'
  sendDate: Date
}

/** Nearest upcoming story-calendar send that includes this product. */
export function buildProductStoryCampaignMap(
  beats: MarketingStoryBeat[]
): Map<string, ProductStoryCampaignRef> {
  const map = new Map<string, ProductStoryCampaignRef>()
  for (const beat of beats) {
    for (const p of beat.products) {
      const prev = map.get(p.id)
      if (!prev || beat.sendDate.getTime() < prev.sendDate.getTime()) {
        map.set(p.id, {
          displayLabel: beat.displayLabel,
          channel: beat.channel,
          sendDate: beat.sendDate,
        })
      }
    }
  }
  return map
}

export type ProductEmailFeatureSource = 'suggested' | 'klaviyo'

export interface ProductEmailFeatureRef {
  source: ProductEmailFeatureSource
  label: string
  sendDate?: Date
}

export interface ProductEmailFeatureStatus {
  featured: boolean
  refs: ProductEmailFeatureRef[]
}

/** Story email ideas + synced Klaviyo email campaigns that reference this product. */
export function buildProductEmailFeatureMap(
  beats: MarketingStoryBeat[],
  klaviyoEvents: MarketingEventRecord[],
  products: Product[]
): Map<string, ProductEmailFeatureStatus> {
  const map = new Map<string, ProductEmailFeatureStatus>()

  const ensure = (productId: string): ProductEmailFeatureStatus => {
    let entry = map.get(productId)
    if (!entry) {
      entry = { featured: false, refs: [] }
      map.set(productId, entry)
    }
    return entry
  }

  for (const beat of beats) {
    if (beat.channel !== 'email') continue
    for (const p of beat.products) {
      const entry = ensure(p.id)
      entry.featured = true
      entry.refs.push({
        source: 'suggested',
        label: beat.displayLabel,
        sendDate: beat.sendDate,
      })
    }
  }

  for (const ev of klaviyoEvents) {
    if (ev.source !== 'klaviyo' || ev.kind !== 'email_campaign') continue
    const product = findProductForCampaignTitle(ev.title, products)
    if (!product) continue
    const entry = ensure(product.id)
    entry.featured = true
    const sendDate = ev.scheduledAt?.toDate?.()
    entry.refs.push({
      source: 'klaviyo',
      label: ev.title,
      sendDate: sendDate && Number.isFinite(sendDate.getTime()) ? sendDate : undefined,
    })
  }

  return map
}

export type StoryCalendarItemSource = 'klaviyo' | 'suggested'

export interface StoryCalendarItem {
  id: string
  sendDate: Date
  channel: StoryChannel
  source: StoryCalendarItemSource
  displayLabel: string
  title: string
  subtitle?: string
  beat?: MarketingStoryBeat
  klaviyo?: {
    externalId?: string
    status?: string | null
    kind: Extract<MarketingEventKind, 'email_campaign' | 'sms_campaign'>
  }
}

const KLAVIYO_EMAIL_COLOR = '#5b21b6'
const KLAVIYO_SMS_COLOR = '#7c3aed'

export function storyCalendarItemColor(item: StoryCalendarItem): string {
  if (item.source === 'klaviyo') {
    return item.channel === 'email' ? KLAVIYO_EMAIL_COLOR : KLAVIYO_SMS_COLOR
  }
  if (item.beat) return storyBeatChipColor(item.beat)
  return item.channel === 'email' ? '#0e7f55' : '#7c3aed'
}

export function buildBeatsByDayIndexForItems(
  items: StoryCalendarItem[]
): Map<string, StoryCalendarItem[]> {
  const map = new Map<string, StoryCalendarItem[]>()
  for (const item of items) {
    const key = storyBeatDayKey(item.sendDate)
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }
  for (const list of map.values()) {
    list.sort((a, b) => sortStoryCalendarItems(a, b))
  }
  return map
}

function sortStoryCalendarItems(a: StoryCalendarItem, b: StoryCalendarItem): number {
  const sourceOrder = a.source === 'klaviyo' ? 0 : 1
  const sourceOrderB = b.source === 'klaviyo' ? 0 : 1
  if (sourceOrder !== sourceOrderB) return sourceOrder - sourceOrderB
  const kindOrder = (i: StoryCalendarItem) =>
    i.beat?.storyKind === 'launch' ? 0 : i.beat?.storyKind === 'best_sellers' ? 1 : 2
  return kindOrder(a) - kindOrder(b) || a.title.localeCompare(b.title)
}

function normalizeTitle(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function truncateTitle(title: string, max = 36): string {
  if (title.length <= max) return title
  return `${title.slice(0, max - 1)}…`
}

function channelFromKlaviyoRecord(r: MarketingEventRecord): StoryChannel | null {
  if (r.kind === 'sms_campaign' || r.channel === 'sms') return 'sms'
  if (r.kind === 'email_campaign' || r.channel === 'email') return 'email'
  return null
}

function klaviyoRecordToItem(r: MarketingEventRecord): StoryCalendarItem | null {
  const channel = channelFromKlaviyoRecord(r)
  if (!channel || !r.scheduledAt?.toDate) return null
  let sendDate: Date
  try {
    sendDate = r.scheduledAt.toDate()
    if (!Number.isFinite(sendDate.getTime())) return null
  } catch {
    return null
  }

  const status = r.status ? String(r.status) : undefined
  const shortTitle = truncateTitle(r.title)

  return {
    id: `klaviyo-${r.id}`,
    sendDate,
    channel,
    source: 'klaviyo',
    displayLabel: `Klaviyo ${channel === 'email' ? 'email' : 'SMS'} · ${shortTitle}`,
    title: r.title,
    subtitle: status,
    klaviyo: {
      externalId: r.externalId,
      status: r.status,
      kind: channel === 'sms' ? 'sms_campaign' : 'email_campaign',
    },
  }
}

function beatToItem(beat: MarketingStoryBeat): StoryCalendarItem {
  return {
    id: `suggested-${beat.id}`,
    sendDate: beat.sendDate,
    channel: beat.channel,
    source: 'suggested',
    displayLabel: beat.displayLabel,
    title: beat.title,
    subtitle:
      beat.storyKind === 'launch'
        ? 'Suggested from pipeline'
        : beat.storyKind === 'best_sellers'
          ? 'Plan fill · best sellers'
          : 'Plan fill',
    beat,
  }
}

/** Klaviyo campaign already covers a similar suggested send (same channel, nearby date). */
function isCoveredByKlaviyo(suggested: StoryCalendarItem, klaviyoItems: StoryCalendarItem[]): boolean {
  if (suggested.beat?.storyKind !== 'launch') return false

  const sTitle = normalizeTitle(suggested.title)
  for (const k of klaviyoItems) {
    if (k.channel !== suggested.channel) continue
    const dayDiff = Math.abs(k.sendDate.getTime() - suggested.sendDate.getTime()) / MS_DAY
    if (dayDiff > 3) continue

    const kTitle = normalizeTitle(k.title)
    if (kTitle === sTitle || kTitle.includes(sTitle) || sTitle.includes(kTitle)) return true

    for (const p of suggested.beat.products) {
      const pn = normalizeTitle(p.name)
      if (pn.length >= 4 && kTitle.includes(pn)) return true
    }
  }
  return false
}

export function klaviyoRecordsToStoryItems(
  records: MarketingEventRecord[],
  rangeStart: Date,
  rangeEnd: Date
): StoryCalendarItem[] {
  const start = rangeStart.getTime()
  const end = rangeEnd.getTime()

  return records
    .filter((r) => r.source === 'klaviyo')
    .map(klaviyoRecordToItem)
    .filter((item): item is StoryCalendarItem => {
      if (!item) return false
      const t = item.sendDate.getTime()
      return t >= start && t <= end
    })
    .sort((a, b) => a.sendDate.getTime() - b.sendDate.getTime())
}

export function beatsToStoryItems(beats: MarketingStoryBeat[]): StoryCalendarItem[] {
  return beats.map(beatToItem)
}

export function mergeStoryCalendarItems(
  klaviyoItems: StoryCalendarItem[],
  suggestedItems: StoryCalendarItem[]
): StoryCalendarItem[] {
  const filteredSuggested = suggestedItems.filter(
    (s) => !isCoveredByKlaviyo(s, klaviyoItems)
  )
  return [...klaviyoItems, ...filteredSuggested].sort(
    (a, b) => a.sendDate.getTime() - b.sendDate.getTime()
  )
}

/** Klaviyo synced sends + GreenRoom suggestions for the story calendar grid. */
export function buildStoryCalendarView(
  beats: MarketingStoryBeat[],
  klaviyoRecords: MarketingEventRecord[],
  horizonDays = 90,
  today = new Date()
): StoryCalendarItem[] {
  const start = new Date(today)
  start.setHours(12, 0, 0, 0)
  start.setDate(start.getDate() - 14)

  const end = new Date(start)
  end.setDate(end.getDate() + horizonDays + 14)

  const klaviyo = klaviyoRecordsToStoryItems(klaviyoRecords, start, end)
  const suggested = beatsToStoryItems(beats)
  return mergeStoryCalendarItems(klaviyo, suggested)
}
