/**
 * Static registry of retention & lifecycle (Klaviyo) reports, keyed by brand.
 *
 * Reports are currently generated offline via an API connection to Klaviyo and
 * dropped into /public/reports/<brand>/ as self-contained HTML files. This file
 * tells the app which reports exist for which brand. Longer term this can be
 * replaced with Firestore-backed report metadata.
 */

export interface RetentionReportStat {
  value: string
  label: string
  positive?: boolean
}

export interface RetentionReport {
  id: string
  title: string
  window: string
  /** Path to the static HTML file under /public */
  url: string
  chips: { label: string; positive?: boolean }[]
  stats: RetentionReportStat[]
  highlights?: string
}

export interface BrandRetentionReports {
  /** Heading shown on the landing page */
  heading: string
  description: string
  footnote?: string
  /** Reports grouped newest-first */
  reports: RetentionReport[]
}

/** Normalize a brand name/slug for matching, e.g. "7Diamonds" -> "7diamonds" */
export function normalizeBrandKey(value: string | null | undefined): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

const registry: Record<string, BrandRetentionReports> = {
  '7diamonds': {
    heading: 'Retention & Lifecycle Reports',
    description:
      'Monthly Klaviyo performance for email & SMS — campaigns, flows, subscribers, creative, and an overall health score. Select a report to dive in.',
    footnote:
      'Generated from Klaviyo (account TSt5zk). Campaign & flow figures use send-date attribution (Placed Order); subscriber counts use event-time aggregation. Open rates reflect Apple Mail Privacy inflation.',
    reports: [
      {
        id: 'may-2026',
        title: 'May 2026 — Klaviyo Performance Report',
        window: 'Reporting window May 1–31, 2026 · Email & SMS',
        url: '/reports/7diamonds/may-2026.html',
        chips: [
          { label: 'Performance Dashboard' },
          { label: 'Creative Report' },
          { label: 'Health Report' },
          { label: 'Health 78/100 · Good', positive: true },
        ],
        stats: [
          { value: '$337.7K', label: 'Attributed revenue' },
          { value: '▲ +14.0%', label: 'YoY revenue', positive: true },
          { value: '56%', label: 'From flows' },
          { value: '+1,399', label: 'Net list growth', positive: true },
          { value: '40', label: 'Campaigns sent' },
        ],
        highlights:
          "Highlights: men's product drops led campaigns · Welcome flows drove $102K · flows out-earned campaigns.",
      },
    ],
  },
}

/** Look up the retention reports for a brand by name or slug. */
export function getRetentionReports(
  brandName: string | null | undefined,
  brandSlug?: string | null
): BrandRetentionReports | null {
  return registry[normalizeBrandKey(brandName)] || registry[normalizeBrandKey(brandSlug)] || null
}
