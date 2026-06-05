import type { BrandMarketingSettings } from '@/types'

export interface MarketingCadenceTargets {
  emailsPerMonth: number
  smsPerMonth: number
}

const DEFAULT_EMAILS_PER_MONTH = 8
const DEFAULT_SMS_PER_MONTH = 4

export function getMarketingCadenceTargets(
  marketing: BrandMarketingSettings | undefined
): MarketingCadenceTargets {
  const t = marketing?.cadenceTargets
  return {
    emailsPerMonth: clampTarget(t?.emailsPerMonth, DEFAULT_EMAILS_PER_MONTH),
    smsPerMonth: clampTarget(t?.smsPerMonth, DEFAULT_SMS_PER_MONTH),
  }
}

function clampTarget(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback
  return Math.min(60, Math.round(value))
}

/** Target spacing between launch emails from monthly email budget */
export function idealDaysBetweenEmails(targets: MarketingCadenceTargets): number {
  if (targets.emailsPerMonth <= 0) return 14
  const raw = 30 / targets.emailsPerMonth
  return Math.max(2, Math.min(14, Math.round(raw)))
}

export function idealDaysBetweenSms(targets: MarketingCadenceTargets): number {
  if (targets.smsPerMonth <= 0) return 30
  const raw = 30 / targets.smsPerMonth
  return Math.max(3, Math.min(21, Math.round(raw)))
}

export function bestSellersGapDays(targets: MarketingCadenceTargets): number {
  return Math.max(7, idealDaysBetweenEmails(targets))
}
