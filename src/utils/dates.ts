import { Timestamp } from 'firebase/firestore'
import type { Product } from '@/types'

export function formatDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** True when the product is assigned to a collection. */
export function productHasCollection(product: Pick<Product, 'projectId'>): boolean {
  const id = product.projectId
  return typeof id === 'string' && id.trim().length > 0
}

/** True when the product has a usable tentative ex-factory timestamp. */
export function productHasTentativeExFactoryDate(
  product: Pick<Product, 'tentativeExFactoryDate'>
): boolean {
  const ts = product.tentativeExFactoryDate
  if (!ts || typeof ts.toMillis !== 'function') return false
  try {
    const ms = ts.toMillis()
    return Number.isFinite(ms) && ms > 0
  } catch {
    return false
  }
}

/** Default weeks from ex-factory to suggested go-live when rescheduling. */
export const DEFAULT_WEEKS_FROM_EX_FACTORY_TO_LAUNCH = 5

/** True when the product has an actual factory ship date recorded. */
export function productHasFactoryShipDate(product: Pick<Product, 'factoryShipDate'>): boolean {
  const ts = product.factoryShipDate
  if (!ts || typeof ts.toMillis !== 'function') return false
  try {
    const ms = ts.toMillis()
    return Number.isFinite(ms) && ms > 0
  } catch {
    return false
  }
}

export function isPreLiveStage(stage: Product['stage']): boolean {
  return stage !== 'live'
}

/** Still at the factory (In Production / samples) — not yet marked shipped. */
export function isFactoryProductionStage(stage: Product['stage']): boolean {
  return stage === 'samples'
}

/**
 * Tentative ex-factory date has passed while still in production and not marked shipped.
 * Use for pipeline triage and card badges.
 */
export function isPastExFactoryAwaitingShip(product: Product): boolean {
  if (product.archived || !productHasTentativeExFactoryDate(product)) return false
  if (!isFactoryProductionStage(product.stage)) return false
  if (productHasFactoryShipDate(product)) return false
  const exUtc = product.tentativeExFactoryDate!.toDate()
  const today = new Date()
  const exDay = Date.UTC(exUtc.getUTCFullYear(), exUtc.getUTCMonth(), exUtc.getUTCDate())
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return exDay < todayDay
}

/** Suggested go-live at `weeks` after ex-factory (UTC calendar days). */
export function suggestedGoLiveDateFromExFactory(
  exFactoryDate: Date,
  weeks: number = DEFAULT_WEEKS_FROM_EX_FACTORY_TO_LAUNCH
): Date {
  const base = Date.UTC(
    exFactoryDate.getUTCFullYear(),
    exFactoryDate.getUTCMonth(),
    exFactoryDate.getUTCDate()
  )
  return new Date(base + weeks * 7 * 86400000)
}

export function formatDateInputLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Calendar days from `from` to `to` (UTC midnight), negative if `to` is before `from`. */
export function daysBetweenUtcDates(from: Date, to: Date): number {
  const a = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const b = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/** True when the product has a usable go-live timestamp (missing/invalid counts as no date). */
export function productHasGoLiveDate(product: Pick<Product, 'goLiveDate'>): boolean {
  const ts = product.goLiveDate
  if (!ts || typeof ts.toMillis !== 'function') return false
  try {
    const ms = ts.toMillis()
    return Number.isFinite(ms) && ms > 0
  } catch {
    return false
  }
}

export function formatDateShort(timestamp: Timestamp): string {
  // Convert Firestore timestamp to Date
  const date = timestamp.toDate()
  
  // Use UTC date components to match how dates are stored (at midnight UTC)
  // This ensures we display the exact date that was saved, without timezone shifts
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  return `${monthNames[month]} ${day}`
}

export function formatDateTime(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function isToday(date: Date): boolean {
  // Compare using UTC components since calendar dates are stored in UTC
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  return dateUTC.getTime() === todayUTC.getTime()
}

export function isPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return compareDate.getTime() < today.getTime()
}

export function isThisWeek(date: Date): boolean {
  // Since dates are stored at midnight UTC, compare using UTC components
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  
  const weekFromNow = new Date(todayUTC)
  weekFromNow.setUTCDate(todayUTC.getUTCDate() + 7)
  
  const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  
  return dateUTC >= todayUTC && dateUTC <= weekFromNow
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getStartOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

export function getEndOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  dayOfMonth: number
}

export function getMonthDays(year: number, month: number): CalendarDay[] {
  const days: CalendarDay[] = []
  // Create dates in UTC to avoid timezone shifts
  const firstDay = new Date(Date.UTC(year, month, 1))
  const lastDay = new Date(Date.UTC(year, month + 1, 0))
  
  const startDate = new Date(firstDay)
  const startDayOfWeek = startDate.getUTCDay()
  startDate.setUTCDate(startDate.getUTCDate() - startDayOfWeek)
  
  const endDate = new Date(lastDay)
  endDate.setUTCDate(endDate.getUTCDate() + (6 - endDate.getUTCDay()))
  
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    days.push({
      date: new Date(currentDate),
      isCurrentMonth: currentDate.getUTCMonth() === month,
      dayOfMonth: currentDate.getUTCDate(),
    })
    // Increment by one day in UTC
    const nextDate = new Date(currentDate)
    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
    currentDate.setTime(nextDate.getTime())
  }
  
  return days
}

export function parseDate(dateString: string): Date {
  return new Date(dateString)
}

/** YYYY-MM-DD for date inputs from a Firestore timestamp (UTC calendar day). */
export function timestampToDateInputValue(timestamp?: Timestamp): string {
  if (!timestamp) return ''
  const date = timestamp.toDate()
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse YYYY-MM-DD from a date input to midnight UTC Timestamp. */
export function dateInputValueToTimestamp(dateValue: string): Timestamp | undefined {
  const trimmed = dateValue.trim()
  if (!trimmed) return undefined
  const parts = trimmed.split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (!year || !month || !day || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return undefined
  }
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  return Timestamp.fromMillis(utcDate.getTime())
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  
  const start = new Date(d.setDate(diff))
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}
