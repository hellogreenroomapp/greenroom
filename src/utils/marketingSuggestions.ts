import type { Product } from '@/types'
import type { BrandMarketingSettings } from '@/types'
import { productHasGoLiveDate, isPastExFactoryAwaitingShip } from '@/utils/dates'

export type SuggestionPriority = 'high' | 'medium' | 'low'

export interface MarketingSuggestion {
  id: string
  priority: SuggestionPriority
  title: string
  detail: string
  /** Product SKUs this suggestion relates to */
  skus?: string[]
  relatedDate?: Date
}

const MS_DAY = 24 * 60 * 60 * 1000

function daysFromNow(date: Date, from = new Date()): number {
  return Math.round((date.getTime() - from.getTime()) / MS_DAY)
}

function productDate(product: Product, field: 'goLiveDate' | 'tentativeExFactoryDate' | 'factoryShipDate' | 'scheduledShootDate'): Date | null {
  const ts = product[field]
  if (!ts || typeof ts.toMillis !== 'function') return null
  try {
    const ms = ts.toMillis()
    return Number.isFinite(ms) && ms > 0 ? ts.toDate() : null
  } catch {
    return null
  }
}

function activeProducts(products: Product[]): Product[] {
  return products.filter((p) => !p.archived)
}

/** Rule-based suggestions from pipeline + connected data preferences. */
export function buildMarketingSuggestions(
  products: Product[],
  marketing: BrandMarketingSettings | undefined
): MarketingSuggestion[] {
  const list: MarketingSuggestion[] = []
  const active = activeProducts(products)
  const now = new Date()
  const klaviyoOn = marketing?.klaviyo?.status === 'connected'
  const shopifyOn = marketing?.shopify?.status === 'connected'

  const goLiveSoon = active.filter((p) => {
    if (!productHasGoLiveDate(p) || p.stage === 'live') return false
    const d = productDate(p, 'goLiveDate')
    if (!d) return false
    const days = daysFromNow(d, now)
    return days >= 0 && days <= 14
  })

  if (goLiveSoon.length > 0) {
    const withoutShoot = goLiveSoon.filter((p) => !productDate(p, 'scheduledShootDate'))
    if (withoutShoot.length > 0) {
      list.push({
        id: 'shoot-before-launch',
        priority: 'high',
        title: 'Schedule photo shoots before go-live',
        detail: `${withoutShoot.length} product(s) go live within 2 weeks but have no shoot date yet.`,
        skus: withoutShoot.map((p) => p.sku),
      })
    }

    if (klaviyoOn && marketing?.klaviyo?.pullCampaigns) {
      list.push({
        id: 'klaviyo-launch-email',
        priority: 'medium',
        title: 'Plan launch email around go-live dates',
        detail: `${goLiveSoon.length} product(s) launching soon — align a Klaviyo send 2–3 days before each go-live.`,
        skus: goLiveSoon.map((p) => p.sku),
      })
    } else if (!klaviyoOn && goLiveSoon.length > 0) {
      list.push({
        id: 'connect-klaviyo',
        priority: 'low',
        title: 'Connect Klaviyo to see campaign timing',
        detail: 'Link Klaviyo to compare scheduled sends with your pipeline go-live dates.',
      })
    }

    if (shopifyOn && marketing?.shopify?.pullPublishDates) {
      list.push({
        id: 'shopify-publish-align',
        priority: 'medium',
        title: 'Confirm Shopify publish dates match pipeline',
        detail: `Review ${goLiveSoon.length} upcoming launch(es) so store publish dates match GreenRoom go-live.`,
        skus: goLiveSoon.map((p) => p.sku),
      })
    }
  }

  const arrivingSoon = active.filter((p) => {
    const ship = productDate(p, 'factoryShipDate')
    const ex = productDate(p, 'tentativeExFactoryDate')
    const d = ship || ex
    if (!d) return false
    const days = daysFromNow(d, now)
    return days >= -3 && days <= 10 && p.stage !== 'live'
  })

  if (arrivingSoon.length > 0) {
    list.push({
      id: 'arrival-prep',
      priority: 'high',
      title: 'Prep marketing for incoming units',
      detail: `${arrivingSoon.length} product(s) arriving or shipping soon — queue creative and landing pages.`,
      skus: arrivingSoon.map((p) => p.sku),
    })

    if (klaviyoOn && marketing?.klaviyo?.pullCampaigns) {
      list.push({
        id: 'klaviyo-arrival-teaser',
        priority: 'medium',
        title: 'Consider a “coming soon” or restock email',
        detail: 'Units on the way — a teaser or VIP early-access send can warm the list before go-live.',
        skus: arrivingSoon.slice(0, 5).map((p) => p.sku),
      })
    }
  }

  const overdueExFactory = active.filter(isPastExFactoryAwaitingShip)
  if (overdueExFactory.length > 0) {
    list.push({
      id: 'overdue-ex-factory',
      priority: 'high',
      title: 'Update factory dates or mark as shipped',
      detail: `${overdueExFactory.length} product(s) are past ex-factory but not marked shipped — marketing dates may be off.`,
      skus: overdueExFactory.map((p) => p.sku),
    })
  }

  const stagedNoGoLive = active.filter(
    (p) => p.stage === 'staged' && !productHasGoLiveDate(p)
  )
  if (stagedNoGoLive.length > 0) {
    list.push({
      id: 'staged-set-golive',
      priority: 'medium',
      title: 'Set go-live dates for staged products',
      detail: `${stagedNoGoLive.length} staged product(s) need a go-live date to plan campaigns.`,
      skus: stagedNoGoLive.map((p) => p.sku),
    })
  }

  if (!klaviyoOn && !shopifyOn && list.length === 0) {
    list.push({
      id: 'add-dates',
      priority: 'low',
      title: 'Add pipeline dates to get suggestions',
      detail: 'Set ex-factory, factory ship, shoot, or go-live dates on products — or connect Klaviyo / Shopify for a fuller picture.',
    })
  }

  const priorityOrder: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 }
  return list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}
