import { ref } from 'vue'
import { useBrandStore } from '@/stores/brand'
import {
  connectKlaviyoApi,
  syncKlaviyo,
  disconnectKlaviyoApi,
  type KlaviyoSyncResponse,
} from '@/firebase/functions'
import { getDoc } from '@/firebase/firestore'
import type { Brand } from '@/types'

export function useKlaviyoIntegration() {
  const brandStore = useBrandStore()
  const connecting = ref(false)
  const syncing = ref(false)

  async function connect(apiKey: string): Promise<{ accountLabel: string; count: number }> {
    const brandId = brandStore.brandId
    if (!brandId) throw new Error('Select a brand first')

    connecting.value = true
    try {
      const result = await connectKlaviyoApi(brandId, apiKey.trim())
      const brand = await getDoc<Brand>('brands', brandId)
      if (brand) brandStore.currentBrand = brand
      return result
    } finally {
      connecting.value = false
    }
  }

  async function sync(): Promise<KlaviyoSyncResponse> {
    const brandId = brandStore.brandId
    if (!brandId) throw new Error('Select a brand first')

    syncing.value = true
    try {
      const result = await syncKlaviyo(brandId)
      const brand = await getDoc<Brand>('brands', brandId)
      if (brand) brandStore.currentBrand = brand
      return result
    } finally {
      syncing.value = false
    }
  }

  async function disconnect(): Promise<void> {
    const brandId = brandStore.brandId
    if (!brandId) return

    await disconnectKlaviyoApi(brandId)
    const brand = await getDoc<Brand>('brands', brandId)
    if (brand) brandStore.currentBrand = brand
  }

  return { connect, sync, disconnect, connecting, syncing }
}
