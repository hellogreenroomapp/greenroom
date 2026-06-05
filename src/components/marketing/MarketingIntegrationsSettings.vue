<template>
  <div class="space-y-4 max-w-lg">
    <p class="text-sm text-muted">
      Read-only connections. GreenRoom never sends emails or updates your store.
    </p>

    <IntegrationPanel
      title="Klaviyo"
      description="Read-only — campaigns, lists, segments"
      initials="K"
      icon-class="bg-violet-100 text-violet-800"
      :connected="marketing.klaviyo!.status === 'connected'"
      :connected-label="marketing.klaviyo!.accountLabel"
      :can-edit="canEdit"
      :connecting="klaviyoConnecting"
      @connect="$emit('connect-klaviyo')"
      @disconnect="$emit('disconnect-klaviyo')"
    >
      <div
        v-if="marketing.klaviyo!.status === 'connected'"
        class="mb-3 pb-3 border-b border-border space-y-1"
      >
        <button
          type="button"
          class="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-bg font-medium text-text disabled:opacity-50"
          :disabled="!canEdit || klaviyoSyncing"
          @click="$emit('sync-klaviyo')"
        >
          {{ klaviyoSyncing ? 'Syncing…' : 'Sync now' }}
        </button>
        <p v-if="klaviyoLastSyncLabel" class="text-xs text-muted">{{ klaviyoLastSyncLabel }}</p>
        <p v-if="marketing.klaviyo!.lastSyncError" class="text-xs text-red-600">
          {{ marketing.klaviyo!.lastSyncError }}
        </p>
      </div>
      <p class="text-xs text-muted mb-2">
        Sync pulls campaign schedule plus <strong class="text-text">90-day performance</strong> (open rate,
        revenue). Use product or collection names in campaign titles — SKU-level matching will come from Shopify.
      </p>
      <p class="text-xs font-medium text-muted mb-2">Pull into calendar</p>
      <label class="flex items-center gap-2 text-sm text-text cursor-pointer">
        <input
          type="checkbox"
          class="rounded border-border text-indigo-600 focus:ring-indigo-500"
          :checked="marketing.klaviyo!.pullCampaigns"
          :disabled="!canEdit"
          @change="$emit('klaviyo-toggle', 'pullCampaigns', ($event.target as HTMLInputElement).checked)"
        />
        Email campaigns
      </label>
      <label class="flex items-center gap-2 text-sm text-text cursor-pointer mt-2">
        <input
          type="checkbox"
          class="rounded border-border text-indigo-600 focus:ring-indigo-500"
          :checked="marketing.klaviyo!.pullSmsCampaigns"
          :disabled="!canEdit"
          @change="$emit('klaviyo-toggle', 'pullSmsCampaigns', ($event.target as HTMLInputElement).checked)"
        />
        SMS campaigns
      </label>
      <p class="text-xs font-medium text-muted mb-2 mt-3">Audiences & cadence</p>
      <label class="flex items-center gap-2 text-sm text-text cursor-pointer">
        <input
          type="checkbox"
          class="rounded border-border text-indigo-600 focus:ring-indigo-500"
          :checked="marketing.klaviyo!.pullLists !== false"
          :disabled="!canEdit"
          @change="$emit('klaviyo-toggle', 'pullLists', ($event.target as HTMLInputElement).checked)"
        />
        Lists
      </label>
      <label class="flex items-center gap-2 text-sm text-text cursor-pointer mt-2">
        <input
          type="checkbox"
          class="rounded border-border text-indigo-600 focus:ring-indigo-500"
          :checked="marketing.klaviyo!.pullSegments !== false"
          :disabled="!canEdit"
          @change="$emit('klaviyo-toggle', 'pullSegments', ($event.target as HTMLInputElement).checked)"
        />
        Segments (+ size)
      </label>
    </IntegrationPanel>

    <IntegrationPanel
      title="Shopify"
      description="Coming soon — read-only pull only"
      initials="S"
      icon-class="bg-sky-100 text-sky-800 opacity-75"
      :connected="false"
      :can-edit="false"
      @connect="() => {}"
      @disconnect="() => {}"
    >
      <p class="text-xs text-muted mb-2">When live, read-only pulls:</p>
      <ul class="text-xs text-muted list-disc list-inside space-y-0.5 mb-2">
        <li>Sales & revenue (orders) for strategy</li>
        <li>Inventory levels (on-hand + incoming)</li>
        <li>Product & collection publish dates</li>
      </ul>
      <p class="text-xs text-muted">Nothing is synced from Shopify yet.</p>
    </IntegrationPanel>

    <p class="text-xs text-muted">
      Pipeline arrivals and go-live dates are always included from GreenRoom.
    </p>
  </div>
</template>

<script setup lang="ts">
import IntegrationPanel from '@/components/marketing/IntegrationPanel.vue'
import type { BrandMarketingSettings } from '@/types'

defineProps<{
  marketing: BrandMarketingSettings
  canEdit: boolean
  klaviyoConnecting: boolean
  klaviyoSyncing: boolean
  klaviyoLastSyncLabel: string | null
}>()

defineEmits<{
  'connect-klaviyo': []
  'disconnect-klaviyo': []
  'sync-klaviyo': []
  'klaviyo-toggle': [
    key: 'pullCampaigns' | 'pullSmsCampaigns' | 'pullLists' | 'pullSegments',
    value: boolean,
  ]
}>()
</script>
