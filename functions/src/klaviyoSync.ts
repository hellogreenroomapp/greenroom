/**
 * Klaviyo integration — READ ONLY.
 * Uses GET /api/campaigns and GET /api/accounts (validation). No POST/PATCH/DELETE to Klaviyo.
 */
import * as admin from 'firebase-admin'
import { KLAVIYO_API_BASE } from './config'
import { getKlaviyoApiKey, klaviyoPrivateKeyHeaders } from './klaviyoApiKey'

const db = () => admin.firestore()

interface KlaviyoCampaignAttributes {
  name?: string
  /** When the campaign will be / was sent (from Klaviyo send job). */
  send_time?: string | null
  status?: string
  audiences?: {
    included?: string[]
    excluded?: string[]
  }
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Calendar placement uses Klaviyo `send_time` only. */
export function resolveCampaignSendDate(attrs: KlaviyoCampaignAttributes | undefined): Date | null {
  return parseIsoDate(attrs?.send_time)
}

interface KlaviyoCampaignResource {
  id: string
  attributes?: KlaviyoCampaignAttributes
}

async function fetchCampaignsByChannel(
  apiKey: string,
  channel: 'email' | 'sms'
): Promise<KlaviyoCampaignResource[]> {
  const filter = encodeURIComponent(`equals(messages.channel,'${channel}')`)
  const url = `${KLAVIYO_API_BASE}/campaigns/?filter=${filter}&fields[campaign]=name,send_time,status,audiences`

  const res = await fetch(url, {
    headers: klaviyoPrivateKeyHeaders(apiKey),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Klaviyo campaigns fetch failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { data?: KlaviyoCampaignResource[] }
  return json.data || []
}

function campaignToEventKind(channel: 'email' | 'sms'): 'email_campaign' | 'sms_campaign' {
  return channel === 'sms' ? 'sms_campaign' : 'email_campaign'
}

export interface CampaignMeta {
  id: string
  name: string
  channel: 'email' | 'sms'
  scheduledAt: Date | null
  status: string | null
}

export interface KlaviyoSyncResult {
  campaignCount: number
  campaignDates: { date: Date; channel: 'email' | 'sms' }[]
  campaignMeta: CampaignMeta[]
}

export async function syncKlaviyoCampaignsForBrand(
  brandId: string,
  options: { pullEmail: boolean; pullSms: boolean }
): Promise<KlaviyoSyncResult> {
  const apiKey = await getKlaviyoApiKey(brandId)
  if (!apiKey) throw new Error('Klaviyo is not connected for this brand')
  const campaigns: { resource: KlaviyoCampaignResource; channel: 'email' | 'sms' }[] = []

  if (options.pullEmail) {
    const email = await fetchCampaignsByChannel(apiKey, 'email')
    campaigns.push(...email.map((r) => ({ resource: r, channel: 'email' as const })))
  }
  if (options.pullSms) {
    const sms = await fetchCampaignsByChannel(apiKey, 'sms')
    campaigns.push(...sms.map((r) => ({ resource: r, channel: 'sms' as const })))
  }

  const batch = db().batch()
  const prefix = `${brandId}_klaviyo_`
  const now = admin.firestore.Timestamp.now()

  // Remove previous Klaviyo events for this brand before writing fresh sync
  const existing = await db()
    .collection('marketingEvents')
    .where('brandId', '==', brandId)
    .where('source', '==', 'klaviyo')
    .get()

  for (const doc of existing.docs) {
    batch.delete(doc.ref)
  }

  const campaignDates: { date: Date; channel: 'email' | 'sms' }[] = []
  const campaignMeta: CampaignMeta[] = []
  let written = 0
  for (const { resource, channel } of campaigns) {
    const date = resolveCampaignSendDate(resource.attributes)
    if (date) {
      campaignDates.push({ date, channel })
    }

    campaignMeta.push({
      id: resource.id,
      name: resource.attributes?.name || 'Klaviyo campaign',
      channel,
      scheduledAt: date,
      status: resource.attributes?.status || null,
    })

    if (!date) continue

    const audiences = resource.attributes?.audiences
    const docId = `${prefix}${resource.id}`
    const ref = db().collection('marketingEvents').doc(docId)
    batch.set(ref, {
      brandId,
      source: 'klaviyo',
      kind: campaignToEventKind(channel),
      externalId: resource.id,
      title: resource.attributes?.name || 'Klaviyo campaign',
      scheduledAt: admin.firestore.Timestamp.fromDate(date),
      status: resource.attributes?.status || null,
      channel,
      audiencesIncluded: audiences?.included || [],
      audiencesExcluded: audiences?.excluded || [],
      syncedAt: now,
    })
    written++
  }

  await batch.commit()
  return { campaignCount: written, campaignDates, campaignMeta }
}
