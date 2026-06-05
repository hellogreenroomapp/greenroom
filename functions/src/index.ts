import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { isBrandOwnerOrAdmin, updateBrandMarketingKlaviyo } from './brandAuth'
import {
  deleteKlaviyoApiKey,
  getKlaviyoApiKey,
  saveKlaviyoApiKey,
  validateKlaviyoApiKey,
} from './klaviyoApiKey'
import { runFullKlaviyoSync } from './klaviyoSyncRun'

function klaviyoSyncOptions(klaviyo: Record<string, unknown>) {
  return {
    pullEmail: klaviyo.pullCampaigns !== false,
    pullSms: klaviyo.pullSmsCampaigns === true,
    pullLists: klaviyo.pullLists !== false,
    pullSegments: klaviyo.pullSegments !== false,
  }
}

admin.initializeApp()
setGlobalOptions({ region: process.env.FUNCTIONS_REGION || 'us-central1' })

const db = () => admin.firestore()

/**
 * Connect Klaviyo with a private API key (per brand). No OAuth app required.
 */
export const klaviyoConnect = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required')
  }

  const brandId = request.data?.brandId as string | undefined
  const apiKey = (request.data?.apiKey as string | undefined)?.trim()

  if (!brandId) {
    throw new HttpsError('invalid-argument', 'brandId is required')
  }
  if (!apiKey) {
    throw new HttpsError('invalid-argument', 'API key is required')
  }

  const allowed = await isBrandOwnerOrAdmin(brandId, request.auth.uid)
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Only brand owners or admins can connect Klaviyo')
  }

  let accountLabel: string
  try {
    accountLabel = await validateKlaviyoApiKey(apiKey)
  } catch (e) {
    throw new HttpsError(
      'invalid-argument',
      e instanceof Error ? e.message : 'Invalid Klaviyo API key'
    )
  }

  await saveKlaviyoApiKey(brandId, apiKey, accountLabel)
  await updateBrandMarketingKlaviyo(brandId, {
    status: 'connected',
    accountLabel,
    lastSyncError: null,
  })

  const brandSnap = await db().collection('brands').doc(brandId).get()
  const marketing = brandSnap.data()?.marketing?.klaviyo || {}

  let count = 0
  let audienceWarning: string | null = null
  try {
    const result = await runFullKlaviyoSync(brandId, klaviyoSyncOptions(marketing))
    count = result.campaignCount
    audienceWarning = audienceSyncWarning(result.audienceSync)
    await updateBrandMarketingKlaviyo(brandId, {
      lastSyncAt: admin.firestore.Timestamp.now(),
      lastSyncCount: count,
      lastSyncError: audienceWarning,
    })
  } catch (syncErr) {
    console.error('Initial Klaviyo sync failed:', syncErr)
    await updateBrandMarketingKlaviyo(brandId, {
      lastSyncError: 'Connected, but sync failed. Try Sync now.',
    })
  }

  return { accountLabel, count, audienceWarning }
})

function audienceSyncWarning(audienceSync: {
  listsCount: number
  segmentsCount: number
  listsError: string | null
  segmentsError: string | null
}): string | null {
  const parts: string[] = []
  if (audienceSync.listsError) parts.push(`Lists: ${audienceSync.listsError}`)
  if (audienceSync.segmentsError) parts.push(`Segments: ${audienceSync.segmentsError}`)
  if (parts.length === 0) return null
  return parts.join(' ')
}

/**
 * Sync Klaviyo campaigns into marketingEvents.
 */
export const klaviyoSync = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required')
  }

  const brandId = request.data?.brandId as string | undefined
  if (!brandId) {
    throw new HttpsError('invalid-argument', 'brandId is required')
  }

  const allowed = await isBrandOwnerOrAdmin(brandId, request.auth.uid)
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Only brand owners or admins can sync')
  }

  if (!(await getKlaviyoApiKey(brandId))) {
    throw new HttpsError('failed-precondition', 'Klaviyo is not connected')
  }

  const brandSnap = await db().collection('brands').doc(brandId).get()
  const klaviyo = brandSnap.data()?.marketing?.klaviyo || {}

  try {
    const { campaignCount, audienceSync } = await runFullKlaviyoSync(
      brandId,
      klaviyoSyncOptions(klaviyo)
    )
    const audienceWarning = audienceSyncWarning(audienceSync)
    await updateBrandMarketingKlaviyo(brandId, {
      lastSyncAt: admin.firestore.Timestamp.now(),
      lastSyncCount: campaignCount,
      lastSyncError: audienceWarning,
    })
    return {
      count: campaignCount,
      listsCount: audienceSync.listsCount,
      segmentsCount: audienceSync.segmentsCount,
      audienceWarning,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'
    await updateBrandMarketingKlaviyo(brandId, { lastSyncError: message })
    throw new HttpsError('internal', message)
  }
})

/**
 * Disconnect Klaviyo — remove stored API key and synced events.
 */
export const klaviyoDisconnect = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required')
  }

  const brandId = request.data?.brandId as string | undefined
  if (!brandId) {
    throw new HttpsError('invalid-argument', 'brandId is required')
  }

  const allowed = await isBrandOwnerOrAdmin(brandId, request.auth.uid)
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Only brand owners or admins can disconnect')
  }

  await deleteKlaviyoApiKey(brandId)
  await db().collection('marketingKlaviyoInsights').doc(brandId).delete().catch(() => {})

  const events = await db()
    .collection('marketingEvents')
    .where('brandId', '==', brandId)
    .where('source', '==', 'klaviyo')
    .get()

  const batch = db().batch()
  events.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()

  const brandSnap = await db().collection('brands').doc(brandId).get()
  const existingMarketing = brandSnap.data()?.marketing || {}
  const prevKlaviyo = existingMarketing.klaviyo || {}
  await db()
    .collection('brands')
    .doc(brandId)
    .update({
      marketing: {
        ...existingMarketing,
        klaviyo: {
          status: 'disconnected',
          pullCampaigns: prevKlaviyo.pullCampaigns !== false,
          pullSmsCampaigns: prevKlaviyo.pullSmsCampaigns === true,
          pullLists: prevKlaviyo.pullLists !== false,
          pullSegments: prevKlaviyo.pullSegments !== false,
        },
      },
    })

  return { ok: true }
})
