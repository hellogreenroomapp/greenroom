<template>
  <div class="space-y-6">
    <div>
      <div class="flex items-center gap-2 flex-wrap">
        <h2 class="text-xl sm:text-2xl font-semibold text-text">Marketing</h2>
        <span class="nav-badge">NEW</span>
      </div>
      <p class="text-sm text-muted mt-1 max-w-2xl">
        Green summary of pipeline + Klaviyo data; set your monthly send plan, then review the story
        calendar for upcoming launches.
      </p>
    </div>

    <div class="border-b border-border">
      <div class="flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-t-md transition-colors relative whitespace-nowrap"
          :class="activeTab === 'overview' ? 'text-text' : 'text-muted hover:text-text'"
          @click="activeTab = 'overview'"
        >
          Overview
          <span
            v-if="activeTab === 'overview'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
          />
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-t-md transition-colors relative whitespace-nowrap"
          :class="activeTab === 'settings' ? 'text-text' : 'text-muted hover:text-text'"
          @click="activeTab = 'settings'"
        >
          Settings
          <span
            v-if="marketing.klaviyo!.status !== 'connected'"
            class="ml-1.5 text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-bg border border-border text-muted"
          >
            Connect
          </span>
          <span
            v-if="activeTab === 'settings'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
          />
        </button>
      </div>
    </div>

    <div v-show="activeTab === 'overview'" class="space-y-5">
      <MarketingIntelligenceSummary
        :summary="intelligenceSummary"
        :loading="pageLoading || intelligenceLoading"
      />

      <MarketingDataInsights
        :summary="intelligenceSummary"
        :insights="klaviyoInsights"
        :marketing="marketing"
        :can-edit="canEdit"
        :connected="marketing.klaviyo!.status === 'connected'"
        :synced-label="klaviyoInsightsSyncedLabel"
        :saving-cadence="savingCadence"
        @open-settings="activeTab = 'settings'"
        @save-cadence-plan="onSaveCadencePlan"
      />

      <div>
        <h3 class="text-sm font-semibold text-text mb-1">Story calendar</h3>
        <p class="text-xs text-muted mb-3">
          Scheduled Klaviyo campaigns on their send dates, plus GreenRoom suggestions toward your
          send plan ({{ cadenceTargetsForStory.emailsPerMonth }} emails ·
          {{ cadenceTargetsForStory.smsPerMonth }} SMS / month). Shopify intelligence comes later.
        </p>
        <MarketingSuggestedCalendar
          :items="storyCalendarItems"
          :loading="pageLoading || storyCalendarLoading"
          :klaviyo-connected="hasKlaviyoEvents"
          :klaviyo-insights="klaviyoInsights"
          :saved-story-by-key="savedStoryByKey"
          :can-edit="canEdit"
          :story-saving="storySaving"
          @save-story="handleSaveStory"
          @unsave-story="handleUnsaveStory"
        />
      </div>
    </div>

    <div v-show="activeTab === 'settings'">
      <MarketingIntegrationsSettings
        :marketing="marketing"
        :can-edit="canEdit"
        :klaviyo-connecting="klaviyoConnecting"
        :klaviyo-syncing="klaviyoSyncing"
        :klaviyo-last-sync-label="klaviyoLastSyncLabel"
        @connect-klaviyo="openKlaviyoConnect = true"
        @disconnect-klaviyo="handleDisconnectKlaviyo"
        @sync-klaviyo="handleKlaviyoSync"
        @klaviyo-toggle="onKlaviyoToggle"
      />
    </div>

    <div ref="fullCalendarRef" class="bg-card border border-border rounded-lg p-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 class="text-sm font-semibold text-text">Product list</h3>
          <p class="text-xs text-muted mt-0.5">
            Pipeline milestones by date. Email callouts show suggested story sends and synced Klaviyo
            campaigns.
          </p>
        </div>
        <div class="flex items-center gap-4">
          <button type="button" class="p-2 rounded-md hover:bg-bg" @click="previousMonth">
            <svg class="w-5 h-5 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="text-sm font-medium text-text min-w-[140px] text-center">{{ monthYearDisplay }}</span>
          <button type="button" class="p-2 rounded-md hover:bg-bg" @click="nextMonth">
            <svg class="w-5 h-5 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            class="text-sm text-indigo-600 hover:text-indigo-700 font-medium ml-2"
            @click="goToToday"
          >
            Today
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-3 mb-4 pb-3 border-b border-border text-xs">
        <div v-for="kind in previewKinds" :key="kind" class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-sm" :style="{ backgroundColor: EVENT_KIND_COLORS[kind] }" />
          <span class="text-text">{{ EVENT_KIND_LABELS[kind] }}</span>
        </div>
        <template v-if="hasKlaviyoEvents">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-violet-500" />
            <span class="text-text">Klaviyo</span>
          </div>
        </template>
      </div>

      <div v-if="pageLoading" class="py-8 text-center text-muted text-sm">Loading…</div>
      <div v-else-if="monthEvents.length === 0" class="py-8 text-center text-muted text-sm">
        No events this month.
      </div>
      <div v-else class="space-y-3 max-h-[360px] overflow-y-auto">
        <div
          v-for="group in eventsByDay"
          :key="group.dayKey"
          class="border border-border rounded-md overflow-hidden"
        >
          <div class="px-3 py-1.5 bg-bg text-xs font-semibold text-text">{{ group.label }}</div>
          <ul class="divide-y divide-border">
            <li
              v-for="ev in group.events"
              :key="ev.id"
              class="px-3 py-2 flex items-center gap-2 text-sm"
              :class="emailFeatureForEvent(ev.productId)?.featured ? 'bg-indigo-50/40' : ''"
            >
              <span
                class="w-2 h-2 rounded-full shrink-0"
                :style="{ backgroundColor: EVENT_KIND_COLORS[ev.kind] }"
              />
              <div class="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="text-text font-medium truncate">{{ ev.title }}</span>
                <span
                  v-if="ev.stateLabel"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-bg text-muted border border-border shrink-0"
                >
                  {{ ev.stateLabel }}
                </span>
                <template v-if="ev.productId">
                  <span
                    v-for="(ref, idx) in emailFeatureForEvent(ev.productId)?.refs ?? []"
                    :key="`${ev.productId}-email-${idx}`"
                    class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    :class="emailFeaturePillClass(ref)"
                    :title="emailFeatureTitle(ref)"
                  >
                    <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {{ emailFeaturePillLabel(ref) }}
                  </span>
                  <span
                    v-if="!emailFeatureForEvent(ev.productId)?.featured && ev.kind === 'go_live'"
                    class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0"
                    title="No suggested or synced Klaviyo email references this product yet"
                  >
                    Not in email
                  </span>
                </template>
              </div>
              <span v-if="ev.sku" class="text-xs text-muted font-mono shrink-0">{{ ev.sku }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <Modal :is-open="openKlaviyoConnect" title="Connect Klaviyo" size="md" @close="openKlaviyoConnect = false">
      <p class="text-sm text-muted mb-3">
        In Klaviyo go to
        <strong class="text-text">Settings → API keys → Create Private API Key</strong>.
        Enable read access for <strong class="text-text">Campaigns</strong>,
        <strong class="text-text">Lists</strong>, and <strong class="text-text">Segments</strong>, then paste the key below.
      </p>
      <a
        href="https://www.klaviyo.com/account#api-keys-tab"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-indigo-600 hover:underline mb-4 inline-block"
      >
        Open Klaviyo API keys →
      </a>
      <label class="block text-sm font-medium text-text mb-1">Private API key</label>
      <input
        v-model="klaviyoApiKeyInput"
        type="password"
        autocomplete="off"
        placeholder="pk_…"
        class="w-full px-3 py-2 border border-border rounded-md text-sm bg-bg text-text focus:ring-2 focus:ring-indigo-500"
      />
      <p class="text-xs text-muted mt-2">
        Read-only scopes: {{ KLAVIYO_READ_SCOPES.join(', ') }}. Stored server-side per brand.
      </p>
      <template #footer>
        <button
          type="button"
          class="px-4 py-2 text-sm border border-border rounded-md hover:bg-bg"
          @click="openKlaviyoConnect = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          :disabled="klaviyoConnecting || !klaviyoApiKeyInput.trim()"
          @click="handleConnectKlaviyo"
        >
          {{ klaviyoConnecting ? 'Connecting…' : 'Connect' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, shallowRef } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useProducts } from '@/composables/useProducts'
import { useProject } from '@/composables/useProject'
import { useMarketingSettings } from '@/composables/useMarketingSettings'
import { useKlaviyoIntegration } from '@/composables/useKlaviyoIntegration'
import { useToast } from '@/composables/useToast'
import { getMarketingEventsByBrand, getKlaviyoInsights } from '@/firebase/firestore'
import type { MarketingKlaviyoInsights } from '@/types/klaviyoInsights'
import { KLAVIYO_READ_SCOPES } from '@/constants/integrations'
import Modal from '@/components/common/Modal.vue'
import MarketingIntelligenceSummary from '@/components/marketing/MarketingIntelligenceSummary.vue'
import MarketingDataInsights from '@/components/marketing/MarketingDataInsights.vue'
import MarketingSuggestedCalendar from '@/components/marketing/MarketingSuggestedCalendar.vue'
import MarketingIntegrationsSettings from '@/components/marketing/MarketingIntegrationsSettings.vue'
import type { MarketingEventRecord } from '@/types/marketingEvents'
import {
  buildGreenRoomMarketingEvents,
  externalRecordsToCalendarEvents,
  mergeMarketingCalendarEvents,
  filterEventsInMonth,
  EVENT_KIND_COLORS,
  EVENT_KIND_LABELS,
} from '@/utils/marketingCalendar'
import { buildMarketingSuggestions } from '@/utils/marketingSuggestions'
import {
  buildMarketingIntelligenceSummary,
  buildMinimalIntelligenceSummary,
} from '@/utils/marketingIntelligence'
import type { MarketingIntelligenceSummary as IntelligenceSummaryData } from '@/utils/marketingIntelligence'
import { buildMarketingStoryCalendar, type MarketingStoryBeat } from '@/utils/marketingStoryCalendar'
import {
  buildProductEmailFeatureMap,
  buildStoryCalendarView,
  type ProductEmailFeatureRef,
} from '@/utils/marketingStoryCalendarView'
import { getSavedMarketingStories, mergeSavedStoriesIntoCalendar } from '@/utils/marketingSavedStories'
import type { SavedMarketingStory } from '@/types/marketingSavedStories'
import { upcomingPipelineProducts } from '@/utils/marketingProductScope'
import { getMarketingCadenceTargets } from '@/utils/marketingCadenceTargets'
import type { MarketingEventKind } from '@/types/integrations'

const brandStore = useBrandStore()
const { products, loading: productsLoading, fetchProducts } = useProducts()
const { projects, fetchProjects } = useProject()
const {
  marketing,
  canEdit,
  updateKlaviyoSync,
  updateCadenceTargets,
  saveMarketingStory,
  removeSavedMarketingStory,
} = useMarketingSettings()
const {
  connect: connectKlaviyoWithKey,
  sync: syncKlaviyo,
  disconnect: disconnectKlaviyoOAuth,
  connecting: klaviyoConnecting,
  syncing: klaviyoSyncing,
} = useKlaviyoIntegration()
const toast = useToast()

const activeTab = ref<'overview' | 'settings'>('overview')
const openKlaviyoConnect = ref(false)
const klaviyoApiKeyInput = ref('')
const marketingEvents = ref<MarketingEventRecord[]>([])
const klaviyoInsights = ref<MarketingKlaviyoInsights | null>(null)
const dataLoading = ref(true)
const savingCadence = ref(false)
const storySaving = ref(false)

const savedStoryByKey = computed(() => {
  const map: Record<string, SavedMarketingStory> = {}
  for (const s of marketing.value.savedStories ?? []) map[s.storyKey] = s
  return map
})
let loadInFlight: Promise<void> | null = null

const previewKinds: MarketingEventKind[] = [
  'arrival_estimated',
  'factory_ship',
  'photo_shoot',
  'go_live',
]

const now = new Date()
const currentMonth = ref(now.getMonth())
const currentYear = ref(now.getFullYear())

const pageLoading = computed(() => dataLoading.value || productsLoading.value)

const scopedPipelineProducts = computed(() =>
  upcomingPipelineProducts(products.value, 120, 45)
)

const calendarScopeProducts = computed(() =>
  upcomingPipelineProducts(products.value, 180, 90)
)

const allEvents = computed(() => {
  if (pageLoading.value) return []
  return mergeMarketingCalendarEvents(
    buildGreenRoomMarketingEvents(calendarScopeProducts.value),
    externalRecordsToCalendarEvents(marketingEvents.value)
  )
})

const storyCalendarBeats = shallowRef<MarketingStoryBeat[]>([])
const storyCalendarItems = computed(() => {
  if (pageLoading.value) return []
  return buildStoryCalendarView(storyCalendarBeats.value, marketingEvents.value, 90)
})
const storyCalendarLoading = ref(false)
let storyBuildTimer: ReturnType<typeof setTimeout> | null = null

const cadenceTargetsForStory = computed(() => getMarketingCadenceTargets(marketing.value))

const cadencePlanKey = computed(() => {
  const t = cadenceTargetsForStory.value
  return `${t.emailsPerMonth}:${t.smsPerMonth}`
})

function scheduleStoryCalendarBuild() {
  if (storyBuildTimer) clearTimeout(storyBuildTimer)
  if (pageLoading.value) {
    storyCalendarBeats.value = []
    storyCalendarLoading.value = false
    return
  }
  storyCalendarLoading.value = true
  storyBuildTimer = setTimeout(() => {
    storyBuildTimer = null
    try {
      const today = new Date()
      const horizonEnd = new Date(today)
      horizonEnd.setDate(horizonEnd.getDate() + 90)
      const fresh = buildMarketingStoryCalendar(
        scopedPipelineProducts.value,
        projects.value,
        90,
        klaviyoInsights.value,
        marketing.value,
        cadenceTargetsForStory.value,
        marketingEvents.value
      )
      const saved = getSavedMarketingStories(brandStore.currentBrand?.marketing)
      storyCalendarBeats.value = mergeSavedStoriesIntoCalendar(
        fresh,
        saved,
        horizonEnd,
        today
      )
    } catch (e) {
      console.error('[marketing] story calendar failed', e)
      storyCalendarBeats.value = []
    } finally {
      storyCalendarLoading.value = false
    }
  }, 80)
}

watch(
  () => [
    pageLoading.value,
    cadencePlanKey.value,
    scopedPipelineProducts.value.length,
    projects.value.length,
    klaviyoInsights.value?.syncedAt?.toMillis?.() ?? '',
    marketing.value.savedStories?.length ?? 0,
    marketingEvents.value.length,
    marketingEvents.value[0]?.syncedAt?.toMillis?.() ?? '',
  ],
  scheduleStoryCalendarBuild,
  { immediate: true }
)

async function handleSaveStory(payload: { beat: MarketingStoryBeat; notes: string }) {
  storySaving.value = true
  try {
    await saveMarketingStory(payload.beat, payload.notes)
    scheduleStoryCalendarBuild()
    toast.success('Story saved — it will stay on the calendar when you change your send plan.')
  } catch (e) {
    console.error('[marketing] save story failed', e)
    toast.error('Could not save story')
  } finally {
    storySaving.value = false
  }
}

async function handleUnsaveStory(storyKey: string) {
  storySaving.value = true
  try {
    await removeSavedMarketingStory(storyKey)
    scheduleStoryCalendarBuild()
    toast.success('Story unpinned')
  } catch (e) {
    console.error('[marketing] unsave story failed', e)
    toast.error('Could not unsave story')
  } finally {
    storySaving.value = false
  }
}

const intelligenceSummaryBuilt = shallowRef<IntelligenceSummaryData | null>(null)
const intelligenceLoading = ref(false)
let intelligenceTimer: ReturnType<typeof setTimeout> | null = null

function scheduleIntelligenceBuild() {
  if (intelligenceTimer) clearTimeout(intelligenceTimer)
  if (pageLoading.value) {
    intelligenceSummaryBuilt.value = null
    intelligenceLoading.value = true
    return
  }
  intelligenceLoading.value = true
  intelligenceTimer = setTimeout(() => {
    intelligenceTimer = null
    const marketingSettings = brandStore.currentBrand?.marketing
    try {
      const suggestions = buildMarketingSuggestions(
        scopedPipelineProducts.value,
        marketingSettings
      )
      intelligenceSummaryBuilt.value = buildMarketingIntelligenceSummary(
        products.value,
        marketingSettings,
        klaviyoInsights.value,
        suggestions,
        projects.value
      )
    } catch (e) {
      console.error('[marketing] intelligence summary failed', e)
      intelligenceSummaryBuilt.value = buildMinimalIntelligenceSummary(marketingSettings)
    } finally {
      intelligenceLoading.value = false
    }
  }, 80)
}

watch(
  () => [
    pageLoading.value,
    cadencePlanKey.value,
    scopedPipelineProducts.value.length,
    projects.value.length,
    klaviyoInsights.value?.syncedAt?.toMillis?.() ?? '',
  ],
  scheduleIntelligenceBuild,
  { immediate: true }
)

const intelligenceSummary = computed(() => {
  if (pageLoading.value || intelligenceLoading.value) return null
  return intelligenceSummaryBuilt.value
})

async function onSaveCadencePlan(payload: { emailsPerMonth: number; smsPerMonth: number }) {
  savingCadence.value = true
  try {
    await updateCadenceTargets(payload)
    scheduleStoryCalendarBuild()
    scheduleIntelligenceBuild()
    toast.success('Send plan saved — story calendar updated')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not save send plan')
  } finally {
    savingCadence.value = false
  }
}

const hasKlaviyoEvents = computed(() =>
  marketingEvents.value.some((e) => e.source === 'klaviyo')
)

const klaviyoInsightsSyncedLabel = computed(() => {
  const t = klaviyoInsights.value?.syncedAt
  if (!t?.toDate) return ''
  return t.toDate().toLocaleString()
})

const klaviyoLastSyncLabel = computed(() => {
  const k = marketing.value.klaviyo
  if (!k?.lastSyncAt) return null
  const date = k.lastSyncAt.toDate?.()
  if (!date) return null
  const count = k.lastSyncCount != null ? ` · ${k.lastSyncCount} campaigns` : ''
  return `Last synced ${date.toLocaleString()}${count}`
})

const monthYearDisplay = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const monthEvents = computed(() =>
  filterEventsInMonth(allEvents.value, currentYear.value, currentMonth.value)
)

const productEmailFeatureById = computed(() =>
  buildProductEmailFeatureMap(
    storyCalendarBeats.value,
    marketingEvents.value,
    products.value
  )
)

function emailFeatureForEvent(productId?: string) {
  if (!productId) return null
  return productEmailFeatureById.value.get(productId) ?? null
}

function emailFeaturePillClass(ref: ProductEmailFeatureRef) {
  return ref.source === 'klaviyo'
    ? 'bg-violet-100 text-violet-900 border-violet-200/80'
    : 'bg-indigo-100 text-indigo-900 border-indigo-200/80'
}

function emailFeaturePillLabel(ref: ProductEmailFeatureRef) {
  const prefix = ref.source === 'klaviyo' ? 'Klaviyo email' : 'Suggested email'
  return `${prefix} · ${ref.label}`
}

function emailFeatureTitle(ref: ProductEmailFeatureRef) {
  if (!ref.sendDate) return emailFeaturePillLabel(ref)
  const d = ref.sendDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${emailFeaturePillLabel(ref)} · send ${d}`
}

const eventsByDay = computed(() => {
  const map = new Map<string, { dayKey: string; label: string; events: typeof monthEvents.value }>()
  for (const ev of monthEvents.value) {
    const dayKey = ev.date.toISOString().slice(0, 10)
    if (!map.has(dayKey)) {
      map.set(dayKey, {
        dayKey,
        label: ev.date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        events: [],
      })
    }
    map.get(dayKey)!.events.push(ev)
  }
  return [...map.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey))
})

async function onKlaviyoToggle(
  key: 'pullCampaigns' | 'pullSmsCampaigns' | 'pullLists' | 'pullSegments',
  value: boolean
) {
  try {
    await updateKlaviyoSync({ [key]: value })
    if (marketing.value.klaviyo?.status === 'connected') {
      await handleKlaviyoSync()
    }
  } catch {
    toast.error('Could not save Klaviyo settings')
  }
}

async function handleConnectKlaviyo() {
  try {
    const { accountLabel, count } = await connectKlaviyoWithKey(klaviyoApiKeyInput.value)
    openKlaviyoConnect.value = false
    klaviyoApiKeyInput.value = ''
    activeTab.value = 'overview'
    await loadData()
    toast.success(
      count > 0
        ? `Connected to ${accountLabel} — synced ${count} campaign(s)`
        : `Connected to ${accountLabel}`
    )
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Could not connect Klaviyo')
  }
}

async function handleKlaviyoSync() {
  try {
    const result = await syncKlaviyo()
    await loadData()
    const audience =
      result.listsCount != null && result.segmentsCount != null
        ? ` · ${result.listsCount} lists, ${result.segmentsCount} segments`
        : ''
    if (result.audienceWarning) {
      toast.success(`Synced ${result.count} campaign(s)${audience}. Audience issue: see cadence panel.`)
    } else {
      toast.success(`Synced ${result.count} campaign(s)${audience}`)
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Sync failed')
  }
}

async function handleDisconnectKlaviyo() {
  try {
    await disconnectKlaviyoOAuth()
    marketingEvents.value = marketingEvents.value.filter((e) => e.source !== 'klaviyo')
    klaviyoInsights.value = null
    toast.success('Klaviyo disconnected')
  } catch {
    toast.error('Could not disconnect Klaviyo')
  }
}

function previousMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value -= 1
  } else currentMonth.value -= 1
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value += 1
  } else currentMonth.value += 1
}

function goToToday() {
  const t = new Date()
  currentMonth.value = t.getMonth()
  currentYear.value = t.getFullYear()
}

async function loadMarketingEvents() {
  const brandId = brandStore.brandId
  if (!brandId) {
    marketingEvents.value = []
    return
  }
  marketingEvents.value = await getMarketingEventsByBrand(brandId)
}

async function loadKlaviyoInsights() {
  const brandId = brandStore.brandId
  if (!brandId || marketing.value.klaviyo?.status !== 'connected') {
    klaviyoInsights.value = null
    return
  }
  klaviyoInsights.value = await getKlaviyoInsights(brandId)
}

async function loadData() {
  if (loadInFlight) return loadInFlight

  loadInFlight = (async () => {
    const brandId = brandStore.brandId
    dataLoading.value = true
    try {
      if (!brandId) {
        marketingEvents.value = []
        klaviyoInsights.value = null
        return
      }
      await Promise.all([
        fetchProducts(brandId),
        fetchProjects(brandId),
        loadMarketingEvents(),
        loadKlaviyoInsights(),
      ])
    } finally {
      dataLoading.value = false
    }
  })()

  try {
    await loadInFlight
  } finally {
    loadInFlight = null
  }
}

watch(
  () => brandStore.brandId,
  (brandId) => {
    if (brandId) void loadData()
  },
  { immediate: true }
)
</script>

<style scoped>
.nav-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  background: linear-gradient(135deg, #0e7f55 0%, #1b7f56 100%);
  color: white;
}
</style>
