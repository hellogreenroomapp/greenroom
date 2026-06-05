import * as admin from 'firebase-admin'
import { KLAVIYO_API_BASE, KLAVIYO_API_REVISION } from './config'

const db = () => admin.firestore()

export interface KlaviyoApiKeyDoc {
  brandId: string
  authType: 'private_api_key'
  apiKey: string
  accountLabel?: string
  updatedAt: admin.firestore.Timestamp
}

function secretsDocId(brandId: string): string {
  return `${brandId}_klaviyo`
}

export function klaviyoPrivateKeyHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    accept: 'application/json',
    revision: KLAVIYO_API_REVISION,
  }
}

export function klaviyoJsonApiHeaders(apiKey: string): Record<string, string> {
  return {
    ...klaviyoPrivateKeyHeaders(apiKey),
    'content-type': 'application/vnd.api+json',
    accept: 'application/vnd.api+json',
  }
}

async function probeKlaviyoScope(
  apiKey: string,
  path: string,
  scopeLabel: string
): Promise<void> {
  const res = await fetch(`${KLAVIYO_API_BASE}${path}`, {
    headers: {
      ...klaviyoPrivateKeyHeaders(apiKey),
      accept: 'application/vnd.api+json',
    },
  })
  if (res.ok) return
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `API key is missing ${scopeLabel} scope. Create a new read-only key with campaigns:read, lists:read, segments:read, and metrics:read.`
    )
  }
  const text = await res.text()
  throw new Error(`Could not verify ${scopeLabel} (${res.status}): ${text.slice(0, 200)}`)
}

/** Validate key and return a display label for the account. */
export async function validateKlaviyoApiKey(apiKey: string): Promise<string> {
  const accountsUrl = `${KLAVIYO_API_BASE}/accounts/`
  const res = await fetch(accountsUrl, { headers: klaviyoPrivateKeyHeaders(apiKey) })

  let accountLabel = 'Klaviyo account'
  if (res.ok) {
    const json = (await res.json()) as {
      data?: { attributes?: { contact_information?: { organization_name?: string } } }[]
    }
    const name = json.data?.[0]?.attributes?.contact_information?.organization_name
    if (name) accountLabel = name
  } else {
    const filter = encodeURIComponent("equals(messages.channel,'email')")
    const campaignsUrl = `${KLAVIYO_API_BASE}/campaigns/?filter=${filter}&page[size]=1`
    const campRes = await fetch(campaignsUrl, { headers: klaviyoPrivateKeyHeaders(apiKey) })
    if (!campRes.ok) {
      const text = await campRes.text()
      if (campRes.status === 401 || campRes.status === 403) {
        throw new Error(
          'Invalid API key or missing read access. Use a read-only key with campaigns, lists, and segments access.'
        )
      }
      throw new Error(`Could not verify Klaviyo API key (${campRes.status}): ${text}`)
    }
  }

  await probeKlaviyoScope(apiKey, '/lists/?page[size]=1', 'lists:read')
  await probeKlaviyoScope(apiKey, '/segments/?page[size]=1', 'segments:read')
  await probeKlaviyoScope(apiKey, '/metrics/?page[size]=1', 'metrics:read')

  return accountLabel
}

export async function saveKlaviyoApiKey(
  brandId: string,
  apiKey: string,
  accountLabel: string
): Promise<void> {
  await db().collection('brandIntegrationSecrets').doc(secretsDocId(brandId)).set({
    brandId,
    authType: 'private_api_key',
    apiKey,
    accountLabel,
    updatedAt: admin.firestore.Timestamp.now(),
  } satisfies KlaviyoApiKeyDoc)
}

export async function getKlaviyoApiKey(brandId: string): Promise<string | null> {
  const snap = await db()
    .collection('brandIntegrationSecrets')
    .doc(secretsDocId(brandId))
    .get()
  if (!snap.exists) return null
  const data = snap.data() as KlaviyoApiKeyDoc
  return data.apiKey || null
}

export async function deleteKlaviyoApiKey(brandId: string): Promise<void> {
  await db().collection('brandIntegrationSecrets').doc(secretsDocId(brandId)).delete()
}
