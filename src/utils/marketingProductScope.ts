import type { Product } from '@/types'
import { productHasGoLiveDate } from '@/utils/dates'

const MS_DAY = 24 * 60 * 60 * 1000

/** Pipeline products with go-live in [today - pastDays, today + horizonDays] */
export function upcomingPipelineProducts(
  products: Product[],
  horizonDays = 120,
  pastDays = 30,
  today = new Date()
): Product[] {
  const start = today.getTime() - pastDays * MS_DAY
  const end = today.getTime() + horizonDays * MS_DAY

  return products.filter((p) => {
    if (p.archived || p.stage === 'live') return false
    if (!productHasGoLiveDate(p)) return false
    try {
      const t = p.goLiveDate!.toMillis()
      return t >= start && t <= end
    } catch {
      return false
    }
  })
}
