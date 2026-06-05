import * as admin from 'firebase-admin'
import { KLAVIYO_API_BASE } from './config'
import { klaviyoPrivateKeyHeaders } from './klaviyoApiKey'
import type {
  KlaviyoCampaignPerformanceRow,
  KlaviyoPerformanceSummary,
} from './klaviyoCampaignPerformance'

const db = () => admin.firestore()

export interface KlaviyoAudienceSyncMeta {
  listsCount: number
  segmentsCount: number
  listsError: string | null
  segmentsError: string | null
}

interface KlaviyoResource {
  id: string
  attributes?: Record<string, unknown>
}

interface PaginatedFetchResult {
  data: KlaviyoResource[]
  error: string | null
}

function klaviyoListHeaders(apiKey: string): Record<string, string> {
  return {
    ...klaviyoPrivateKeyHeaders(apiKey),
    accept: 'application/vnd.api+json',
  }
}

/** Follow Klaviyo cursor pagination (links.next). */
async function fetchKlaviyoCollectionPaginated(
  apiKey: string,
  initialPath: string
): Promise<PaginatedFetchResult> {
  const all: KlaviyoResource[] = []
  let url: string | null = initialPath.startsWith('http')
    ? initialPath
    : `${KLAVIYO_API_BASE}${initialPath.startsWith('/') ? initialPath : `/${initialPath}`}`

  let pages = 0
  const maxPages = 50

  while (url && pages < maxPages) {
    pages++
    const res = await fetch(url, { headers: klaviyoListHeaders(apiKey) })
    if (!res.ok) {
      const text = await res.text()
      const snippet = text.length > 280 ? `${text.slice(0, 280)}…` : text
      return {
        data: all,
        error: `HTTP ${res.status}: ${snippet}`,
      }
    }

    const json = (await res.json()) as {
      data?: KlaviyoResource[]
      links?: { next?: string | null }
    }
    if (Array.isArray(json.data)) {
      all.push(...json.data)
    }
    url = json.links?.next ?? null
  }

  return { data: all, error: null }
}

/** Klaviyo caps page[size] at 10 for lists/segments — paginate via links.next. */
const KLAVIYO_PAGE_SIZE = 10

export async function fetchKlaviyoLists(apiKey: string): Promise<PaginatedFetchResult> {
  const withCount = await fetchKlaviyoCollectionPaginated(
    apiKey,
    `/lists/?fields[list]=name,profile_count&additional-fields[list]=profile_count&page[size]=${KLAVIYO_PAGE_SIZE}`
  )
  if (!withCount.error) return withCount
  if (withCount.data.length > 0) return withCount

  return fetchKlaviyoCollectionPaginated(
    apiKey,
    `/lists/?fields[list]=name&page[size]=${KLAVIYO_PAGE_SIZE}`
  )
}

const LIST_PROFILE_COUNT_ENRICH_MAX = 25

/** Get Lists may omit profile_count — fetch per list (rate-limited) for a capped subset. */
export async function enrichListProfileCounts(
  apiKey: string,
  lists: { id: string; name: string; profileCount?: number | null }[]
): Promise<{ id: string; name: string; profileCount?: number | null }[]> {
  const needs = lists
    .filter((l) => l.profileCount == null)
    .slice(0, LIST_PROFILE_COUNT_ENRICH_MAX)
  if (needs.length === 0) return lists

  const countById = new Map<string, number>()
  const batchSize = 5
  for (let i = 0; i < needs.length; i += batchSize) {
    const batch = needs.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (list) => {
        const path = `/lists/${list.id}/?fields[list]=name,profile_count&additional-fields[list]=profile_count`
        const url = `${KLAVIYO_API_BASE}${path}`
        try {
          const res = await fetch(url, { headers: klaviyoListHeaders(apiKey) })
          if (!res.ok) return
          const json = (await res.json()) as {
            data?: { attributes?: { profile_count?: number } }
          }
          const n = json.data?.attributes?.profile_count
          if (typeof n === 'number' && Number.isFinite(n)) countById.set(list.id, n)
        } catch {
          /* skip */
        }
      })
    )
  }

  return lists.map((l) => ({
    ...l,
    profileCount: l.profileCount ?? countById.get(l.id) ?? null,
  }))
}

export interface KlaviyoAudienceSummary {
  listsWithCount: number
  segmentsWithCount: number
  totalListProfiles: number | null
  largestList: { name: string; profileCount: number } | null
  largestSegment: { name: string; profileCount: number } | null
}

export function computeAudienceSummary(
  lists: { name: string; profileCount?: number | null }[],
  segments: { name: string; profileCount?: number | null }[]
): KlaviyoAudienceSummary {
  const listCounts = lists
    .map((l) => l.profileCount)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  const segCounts = segments
    .map((s) => s.profileCount)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))

  const largestList = lists.reduce<{ name: string; profileCount: number } | null>((best, l) => {
    if (typeof l.profileCount !== 'number') return best
    if (!best || l.profileCount > best.profileCount) {
      return { name: l.name, profileCount: l.profileCount }
    }
    return best
  }, null)

  const largestSegment = segments.reduce<{ name: string; profileCount: number } | null>((best, s) => {
    if (typeof s.profileCount !== 'number') return best
    if (!best || s.profileCount > best.profileCount) {
      return { name: s.name, profileCount: s.profileCount }
    }
    return best
  }, null)

  return {
    listsWithCount: listCounts.length,
    segmentsWithCount: segCounts.length,
    totalListProfiles: listCounts.length > 0 ? listCounts.reduce((a, b) => a + b, 0) : null,
    largestList,
    largestSegment,
  }
}

export async function fetchKlaviyoSegments(apiKey: string): Promise<PaginatedFetchResult> {
  const withCount = await fetchKlaviyoCollectionPaginated(
    apiKey,
    `/segments/?fields[segment]=name,profile_count&additional-fields[segment]=profile_count&page[size]=${KLAVIYO_PAGE_SIZE}`
  )
  if (!withCount.error) return withCount
  if (withCount.data.length > 0) return withCount

  return fetchKlaviyoCollectionPaginated(
    apiKey,
    `/segments/?fields[segment]=name&page[size]=${KLAVIYO_PAGE_SIZE}`
  )
}

export function computeCadenceFromCampaignDates(
  dates: { date: Date; channel: 'email' | 'sms' }[]
): {
  scheduledCampaignCount: number
  emailCount: number
  smsCount: number
  sendsLast30Days: number
  sendsNext30Days: number
  medianDaysBetweenSends: number | null
} {
  const now = Date.now()
  const ms30 = 30 * 24 * 60 * 60 * 1000
  const sorted = [...dates].sort((a, b) => a.date.getTime() - b.date.getTime())

  let sendsLast30Days = 0
  let sendsNext30Days = 0
  for (const { date } of sorted) {
    const diff = date.getTime() - now
    if (diff >= -ms30 && diff <= 0) sendsLast30Days++
    if (diff > 0 && diff <= ms30) sendsNext30Days++
  }

  let medianDaysBetweenSends: number | null = null
  if (sorted.length >= 2) {
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const days = (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (24 * 60 * 60 * 1000)
      if (days > 0) gaps.push(days)
    }
    if (gaps.length > 0) {
      gaps.sort((a, b) => a - b)
      const mid = Math.floor(gaps.length / 2)
      medianDaysBetweenSends =
        gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid]
    }
  }

  return {
    scheduledCampaignCount: sorted.length,
    emailCount: sorted.filter((d) => d.channel === 'email').length,
    smsCount: sorted.filter((d) => d.channel === 'sms').length,
    sendsLast30Days,
    sendsNext30Days,
    medianDaysBetweenSends:
      medianDaysBetweenSends != null ? Math.round(medianDaysBetweenSends * 10) / 10 : null,
  }
}

export async function saveKlaviyoInsights(
  brandId: string,
  data: {
    cadence: ReturnType<typeof computeCadenceFromCampaignDates>
    lists: { id: string; name: string; profileCount?: number | null }[]
    segments: { id: string; name: string; profileCount?: number | null }[]
    audienceSync: KlaviyoAudienceSyncMeta
    audienceSummary?: KlaviyoAudienceSummary | null
    performance?: {
      summary: KlaviyoPerformanceSummary
      campaigns: KlaviyoCampaignPerformanceRow[]
    }
  }
): Promise<void> {
  await db()
    .collection('marketingKlaviyoInsights')
    .doc(brandId)
    .set({
      brandId,
      syncedAt: admin.firestore.Timestamp.now(),
      cadence: data.cadence,
      lists: data.lists,
      segments: data.segments,
      audienceSync: data.audienceSync,
      audienceSummary: data.audienceSummary ?? null,
      performance: data.performance ?? null,
    })
}
