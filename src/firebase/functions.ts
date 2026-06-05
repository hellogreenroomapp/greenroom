import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import { app } from './config'

const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1'
const functions = getFunctions(app, region)

if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

export async function connectKlaviyoApi(
  brandId: string,
  apiKey: string
): Promise<{ accountLabel: string; count: number }> {
  const fn = httpsCallable<
    { brandId: string; apiKey: string },
    { accountLabel: string; count: number }
  >(functions, 'klaviyoConnect')
  const result = await fn({ brandId, apiKey })
  return result.data
}

export interface KlaviyoSyncResponse {
  count: number
  listsCount?: number
  segmentsCount?: number
  audienceWarning?: string | null
}

export async function syncKlaviyo(brandId: string): Promise<KlaviyoSyncResponse> {
  const fn = httpsCallable<{ brandId: string }, KlaviyoSyncResponse>(functions, 'klaviyoSync')
  const result = await fn({ brandId })
  return result.data
}

export async function disconnectKlaviyoApi(brandId: string): Promise<void> {
  const fn = httpsCallable<{ brandId: string }, { ok: boolean }>(
    functions,
    'klaviyoDisconnect'
  )
  await fn({ brandId })
}
