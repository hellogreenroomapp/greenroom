import { Timestamp } from 'firebase/firestore'
import type { Product } from '@/types'
import { STAGE_LABELS } from '@/types'
import type { MarketingCalendarEvent, MarketingEventKind } from '@/types/integrations'
import type { MarketingEventRecord } from '@/types/marketingEvents'

function timestampToDate(ts: Timestamp | undefined): Date | null {
  if (!ts || typeof ts.toMillis !== 'function') return null
  try {
    const ms = ts.toMillis()
    return Number.isFinite(ms) && ms > 0 ? ts.toDate() : null
  } catch {
    return null
  }
}

function pushEvent(
  events: MarketingCalendarEvent[],
  product: Product,
  kind: MarketingEventKind,
  date: Date
) {
  events.push({
    id: `${product.id}-${kind}-${date.toISOString().slice(0, 10)}`,
    source: 'greenroom',
    kind,
    title: product.name,
    date,
    productId: product.id,
    sku: product.sku,
    stateLabel: STAGE_LABELS[product.stage],
  })
}

/** Build marketing calendar rows from GreenRoom product dates (Phase 1 — no external APIs). */
export function buildGreenRoomMarketingEvents(products: Product[]): MarketingCalendarEvent[] {
  const events: MarketingCalendarEvent[] = []

  for (const product of products) {
    if (product.archived) continue

    const exFactory = timestampToDate(product.tentativeExFactoryDate)
    if (exFactory) {
      pushEvent(events, product, 'arrival_estimated', exFactory)
    }

    const factoryShip = timestampToDate(product.factoryShipDate)
    if (factoryShip) {
      pushEvent(events, product, 'factory_ship', factoryShip)
      if (!exFactory) {
        pushEvent(events, product, 'arrival_estimated', factoryShip)
      }
    }

    const shoot = timestampToDate(product.scheduledShootDate)
    if (shoot) {
      pushEvent(events, product, 'photo_shoot', shoot)
    }

    const goLive = timestampToDate(product.goLiveDate)
    if (goLive) {
      pushEvent(events, product, 'go_live', goLive)
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function externalRecordsToCalendarEvents(
  records: MarketingEventRecord[]
): MarketingCalendarEvent[] {
  return records.map((r) => ({
    id: r.id,
    source: r.source,
    kind: r.kind,
    title: r.title,
    date: r.scheduledAt.toDate(),
    externalId: r.externalId,
    stateLabel:
      r.source === 'klaviyo'
        ? EVENT_KIND_LABELS[r.kind] ?? 'Campaign'
        : undefined,
  }))
}

export function mergeMarketingCalendarEvents(
  ...groups: MarketingCalendarEvent[][]
): MarketingCalendarEvent[] {
  const merged = groups.flat()
  return merged.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function filterEventsInMonth(
  events: MarketingCalendarEvent[],
  year: number,
  month: number
): MarketingCalendarEvent[] {
  return events.filter((e) => e.date.getFullYear() === year && e.date.getMonth() === month)
}

export const EVENT_SOURCE_LABELS: Record<MarketingCalendarEvent['source'], string> = {
  greenroom: 'GreenRoom',
  klaviyo: 'Klaviyo',
  shopify: 'Shopify',
}

export const EVENT_KIND_LABELS: Record<MarketingEventKind, string> = {
  arrival_estimated: 'Arriving',
  factory_ship: 'Factory ship',
  photo_shoot: 'Photo shoot',
  go_live: 'Go live',
  email_campaign: 'Email',
  sms_campaign: 'SMS',
  shopify_publish: 'Shopify publish',
  shopify_collection_launch: 'Collection launch',
}

export const EVENT_KIND_COLORS: Record<MarketingEventKind, string> = {
  arrival_estimated: '#0e7f55',
  factory_ship: '#059669',
  photo_shoot: '#6366f1',
  go_live: '#dc2626',
  email_campaign: '#7c3aed',
  sms_campaign: '#9333ea',
  shopify_publish: '#2563eb',
  shopify_collection_launch: '#0284c7',
}
