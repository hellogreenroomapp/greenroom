import { computed } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useBrand } from '@/composables/useBrand'
import {
  DEFAULT_BRAND_MARKETING_SETTINGS,
  type BrandMarketingSettings,
} from '@/types'
import { buildSavedMarketingStory } from '@/utils/marketingSavedStories'
import type { MarketingStoryBeat } from '@/utils/marketingStoryCalendar'

function mergeMarketingSettings(
  existing: BrandMarketingSettings | undefined
): BrandMarketingSettings {
  const base = DEFAULT_BRAND_MARKETING_SETTINGS
  return {
    cadenceTargets: { ...base.cadenceTargets, ...existing?.cadenceTargets },
    savedStories: existing?.savedStories ?? [],
    klaviyo: { ...base.klaviyo!, ...existing?.klaviyo },
    shopify: { ...base.shopify!, ...existing?.shopify },
  }
}

export function useMarketingSettings() {
  const brandStore = useBrandStore()
  const { updateBrand } = useBrand()

  const marketing = computed(() =>
    mergeMarketingSettings(brandStore.currentBrand?.marketing)
  )

  const canEdit = computed(() => !!brandStore.currentBrand?.id)

  async function saveMarketing(patch: Partial<BrandMarketingSettings>) {
    const brand = brandStore.currentBrand
    if (!brand) return
    const next = mergeMarketingSettings({ ...marketing.value, ...patch })
    await updateBrand(brand.id, { marketing: next })
  }

  async function setKlaviyoConnected(accountLabel?: string) {
    await saveMarketing({
      klaviyo: {
        ...marketing.value.klaviyo!,
        status: 'connected',
        accountLabel: accountLabel || 'Connected account',
      },
    })
  }

  async function disconnectKlaviyo() {
    await saveMarketing({
      klaviyo: {
        ...marketing.value.klaviyo!,
        status: 'disconnected',
        accountLabel: undefined,
      },
    })
  }

  async function setShopifyConnected(shopDomain: string) {
    const domain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
    await saveMarketing({
      shopify: {
        ...marketing.value.shopify!,
        status: 'connected',
        shopDomain: domain.includes('.') ? domain : `${domain}.myshopify.com`,
      },
    })
  }

  async function disconnectShopify() {
    await saveMarketing({
      shopify: {
        ...marketing.value.shopify!,
        status: 'disconnected',
        shopDomain: undefined,
      },
    })
  }

  async function updateKlaviyoSync(
    patch: Partial<
      Pick<
        NonNullable<BrandMarketingSettings['klaviyo']>,
        'pullCampaigns' | 'pullSmsCampaigns' | 'pullLists' | 'pullSegments'
      >
    >
  ) {
    await saveMarketing({
      klaviyo: { ...marketing.value.klaviyo!, ...patch },
    })
  }

  async function updateShopifySync(
    patch: Partial<NonNullable<BrandMarketingSettings['shopify']>>
  ) {
    await saveMarketing({
      shopify: { ...marketing.value.shopify!, ...patch },
    })
  }

  async function updateCadenceTargets(
    patch: Partial<NonNullable<BrandMarketingSettings['cadenceTargets']>>
  ) {
    await saveMarketing({
      cadenceTargets: { ...marketing.value.cadenceTargets, ...patch },
    })
  }

  async function saveMarketingStory(beat: MarketingStoryBeat, notes?: string) {
    const entry = buildSavedMarketingStory(beat, notes)
    const list = marketing.value.savedStories ?? []
    const next = [...list.filter((s) => s.storyKey !== entry.storyKey), entry]
    await saveMarketing({ savedStories: next })
  }

  async function removeSavedMarketingStory(storyKey: string) {
    const list = marketing.value.savedStories ?? []
    const next = list.filter((s) => s.storyKey !== storyKey)
    if (next.length === list.length) return
    await saveMarketing({ savedStories: next })
  }

  return {
    marketing,
    canEdit,
    setKlaviyoConnected,
    disconnectKlaviyo,
    setShopifyConnected,
    disconnectShopify,
    updateKlaviyoSync,
    updateShopifySync,
    updateCadenceTargets,
    saveMarketingStory,
    removeSavedMarketingStory,
  }
}
