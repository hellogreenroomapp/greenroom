import { getKlaviyoApiKey } from './klaviyoApiKey'
import {
  computeAudienceSummary,
  computeCadenceFromCampaignDates,
  enrichListProfileCounts,
  fetchKlaviyoLists,
  fetchKlaviyoSegments,
  saveKlaviyoInsights,
  type KlaviyoAudienceSyncMeta,
} from './klaviyoInsights'
import { fetchKlaviyoCampaignPerformance } from './klaviyoCampaignPerformance'
import { syncKlaviyoCampaignsForBrand } from './klaviyoSync'

export interface FullKlaviyoSyncOptions {
  pullEmail: boolean
  pullSms: boolean
  pullLists: boolean
  pullSegments: boolean
}

export interface FullKlaviyoSyncResult {
  campaignCount: number
  audienceSync: KlaviyoAudienceSyncMeta
}

export async function runFullKlaviyoSync(
  brandId: string,
  options: FullKlaviyoSyncOptions
): Promise<FullKlaviyoSyncResult> {
  const apiKey = await getKlaviyoApiKey(brandId)
  if (!apiKey) throw new Error('Klaviyo is not connected for this brand')

  const { campaignCount, campaignDates, campaignMeta } = await syncKlaviyoCampaignsForBrand(
    brandId,
    {
      pullEmail: options.pullEmail,
      pullSms: options.pullSms,
    }
  )

  const cadence = computeCadenceFromCampaignDates(campaignDates)

  let performance: Awaited<ReturnType<typeof fetchKlaviyoCampaignPerformance>> | undefined
  if (options.pullEmail && campaignMeta.length > 0) {
    try {
      performance = await fetchKlaviyoCampaignPerformance(apiKey, campaignMeta)
    } catch (e) {
      console.warn('Klaviyo campaign performance fetch failed:', e)
    }
  }

  let lists: { id: string; name: string; profileCount?: number | null }[] = []
  let segments: { id: string; name: string; profileCount?: number | null }[] = []
  const audienceSync: KlaviyoAudienceSyncMeta = {
    listsCount: 0,
    segmentsCount: 0,
    listsError: null,
    segmentsError: null,
  }

  if (options.pullLists) {
    const result = await fetchKlaviyoLists(apiKey)
    if (result.error) {
      audienceSync.listsError = result.error
      console.warn('Klaviyo lists fetch failed:', result.error)
    } else {
      lists = result.data.map((r) => ({
        id: r.id,
        name: (r.attributes?.name as string) || 'List',
        profileCount:
          typeof r.attributes?.profile_count === 'number' ? r.attributes.profile_count : null,
      }))
      audienceSync.listsCount = lists.length
      lists = await enrichListProfileCounts(apiKey, lists)
    }
  }

  if (options.pullSegments) {
    const result = await fetchKlaviyoSegments(apiKey)
    if (result.error) {
      audienceSync.segmentsError = result.error
      console.warn('Klaviyo segments fetch failed:', result.error)
    } else {
      segments = result.data.map((r) => ({
        id: r.id,
        name: (r.attributes?.name as string) || 'Segment',
        profileCount:
          typeof r.attributes?.profile_count === 'number' ? r.attributes.profile_count : null,
      }))
      audienceSync.segmentsCount = segments.length
    }
  }

  const audienceSummary =
    lists.length > 0 || segments.length > 0
      ? computeAudienceSummary(lists, segments)
      : null

  await saveKlaviyoInsights(brandId, {
    cadence,
    lists,
    segments,
    audienceSync,
    audienceSummary,
    performance: performance
      ? { summary: performance.summary, campaigns: performance.campaigns }
      : undefined,
  })

  return { campaignCount, audienceSync }
}
