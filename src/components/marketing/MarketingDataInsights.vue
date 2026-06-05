<template>
  <div class="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
    <details class="group py-3 px-4 sm:px-5" open>
      <summary
        class="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden"
      >
        <Chevron class="group-open:rotate-90" />
        Your send plan
      </summary>
      <div class="mt-3 space-y-3">
        <p class="text-xs text-muted">
          Set how many emails and SMS you want per month. The story calendar spaces launches and picks
          channel to stay near these targets.
        </p>
        <div class="grid sm:grid-cols-2 gap-3 max-w-md">
          <label class="block text-xs">
            <span class="font-medium text-text">Emails per month</span>
            <input
              v-model.number="emailDraft"
              type="number"
              min="0"
              max="60"
              class="mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm"
              :disabled="!canEdit || savingCadence"
            />
          </label>
          <label class="block text-xs">
            <span class="font-medium text-text">SMS per month</span>
            <input
              v-model.number="smsDraft"
              type="number"
              min="0"
              max="60"
              class="mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm"
              :disabled="!canEdit || savingCadence"
            />
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canEdit || !planDirty || savingCadence"
            @click="savePlan"
          >
            {{ savingCadence ? 'Saving…' : 'Save send plan' }}
          </button>
          <span v-if="planDirty && canEdit" class="text-xs text-muted">Unsaved changes</span>
        </div>
        <p v-if="planHint" class="text-xs text-muted">{{ planHint }}</p>
        <p class="text-xs text-emerald-800 bg-emerald-50/60 border border-emerald-200/60 rounded-md px-2.5 py-1.5">
          Save to apply your plan — the story calendar will refresh with new email and SMS spacing.
        </p>
      </div>
    </details>

    <details class="group py-3 px-4 sm:px-5">
      <summary
        class="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden"
      >
        <Chevron class="group-open:rotate-90" />
        Klaviyo send cadence
        <span v-if="connected" class="font-normal text-muted text-xs">(synced)</span>
      </summary>
      <div class="mt-3">
        <MarketingCadencePanel
          embedded
          :connected="connected"
          :insights="insights"
          :synced-label="syncedLabel"
          @open-settings="$emit('open-settings')"
        />
      </div>
    </details>

    <details v-if="performanceBlock" class="group py-3 px-4 sm:px-5">
      <summary
        class="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden"
      >
        <Chevron class="group-open:rotate-90" />
        Campaign performance (90d)
      </summary>
      <div class="mt-3 space-y-2 text-xs">
        <p v-if="performanceBlock.available" class="text-muted">
          Conversion metric:
          <span class="text-text font-medium">{{ performanceBlock.conversionMetricName }}</span>
        </p>
        <p v-else class="text-amber-800 bg-amber-50/80 border border-amber-200 rounded-md px-3 py-2">
          {{ performanceBlock.error }}
        </p>
        <div
          v-if="performanceBlock.available"
          class="grid grid-cols-2 sm:grid-cols-3 gap-2"
        >
          <div class="rounded-md bg-bg border border-border p-2 text-center">
            <div class="text-lg font-semibold tabular-nums">{{ formatRate(performanceBlock.avgOpenRate) }}</div>
            <div class="text-[10px] text-muted uppercase">Avg open</div>
          </div>
          <div class="rounded-md bg-bg border border-border p-2 text-center">
            <div class="text-lg font-semibold tabular-nums">{{ formatRate(performanceBlock.avgClickRate) }}</div>
            <div class="text-[10px] text-muted uppercase">Avg click</div>
          </div>
          <div class="rounded-md bg-bg border border-border p-2 text-center col-span-2 sm:col-span-1">
            <div class="text-lg font-semibold tabular-nums">{{ formatCurrency(performanceBlock.totalConversionValue) }}</div>
            <div class="text-[10px] text-muted uppercase">Revenue</div>
          </div>
        </div>
        <ul v-if="topCampaigns.length" class="space-y-1.5 mt-2">
          <li
            v-for="c in topCampaigns"
            :key="c.campaignId"
            class="flex justify-between gap-2 rounded-md border border-border px-2.5 py-1.5"
          >
            <span class="text-text truncate">{{ c.name }}</span>
            <span class="text-muted shrink-0 tabular-nums">
              {{ formatCurrency(c.conversionValue) }}
            </span>
          </li>
        </ul>
      </div>
    </details>

    <details v-if="summary?.sections.length" class="group py-3 px-4 sm:px-5">
      <summary
        class="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden"
      >
        <Chevron class="group-open:rotate-90" />
        Takeaways
        <span class="font-normal text-muted text-xs">({{ takeawayCount }})</span>
      </summary>
      <div class="mt-3 space-y-3">
        <details
          v-for="section in summary!.sections"
          :key="section.id"
          class="group rounded-md border border-border/80 bg-bg/30"
        >
          <summary
            class="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-xs font-semibold text-text [&::-webkit-details-marker]:hidden"
          >
            <Chevron class="group-open:rotate-90 shrink-0" />
            {{ section.title }}
            <span class="font-normal text-muted">({{ section.bullets.length }})</span>
          </summary>
          <ul class="px-2 pb-2 space-y-1">
            <li
              v-for="b in section.bullets"
              :key="b.id"
              class="flex gap-2 rounded px-1.5 py-1 text-xs"
              :class="bulletRowClass(b.tone)"
            >
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                :class="bulletIconClass(b.tone)"
              >
                {{ bulletIcon(b.tone) }}
              </span>
              <div class="min-w-0">
                <span class="font-medium text-text">{{ b.label }}</span>
                <p v-if="b.detail" class="text-muted mt-0.5 leading-snug">{{ b.detail }}</p>
              </div>
            </li>
          </ul>
        </details>
      </div>
    </details>

    <details v-if="topCampaignHighlights.length" class="group py-3 px-4 sm:px-5">
      <summary
        class="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden"
      >
        <Chevron class="group-open:rotate-90" />
        Top campaigns by revenue
      </summary>
      <ul class="mt-3 space-y-1.5">
        <li
          v-for="h in topCampaignHighlights"
          :key="h.id"
          class="rounded-md border border-border bg-bg/40 px-2.5 py-2 text-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium text-text leading-snug">{{ h.title }}</p>
            <span v-if="h.metric" class="text-[9px] tabular-nums shrink-0 text-muted">{{ h.metric }}</span>
          </div>
          <p class="text-muted mt-0.5">{{ h.subtitle }}</p>
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue'
import MarketingCadencePanel from '@/components/marketing/MarketingCadencePanel.vue'
import type { MarketingKlaviyoInsights } from '@/types/klaviyoInsights'
import type { BrandMarketingSettings } from '@/types'
import type {
  MarketingIntelligenceSummary,
  IntelligenceTone,
} from '@/utils/marketingIntelligence'
import { getMarketingCadenceTargets, idealDaysBetweenEmails } from '@/utils/marketingCadenceTargets'
import { formatCurrency, formatRate } from '@/utils/klaviyoCampaignMatch'

const props = defineProps<{
  summary: MarketingIntelligenceSummary | null
  insights: MarketingKlaviyoInsights | null
  marketing: BrandMarketingSettings
  canEdit: boolean
  connected: boolean
  syncedLabel?: string
  savingCadence?: boolean
}>()

const emit = defineEmits<{
  'open-settings': []
  'save-cadence-plan': [payload: { emailsPerMonth: number; smsPerMonth: number }]
}>()

const Chevron = defineComponent({
  name: 'Chevron',
  setup() {
    return () =>
      h('svg', { class: 'w-3.5 h-3.5 text-muted transition-transform duration-150', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 5l7 7-7 7' }),
      ])
  },
})

const targets = computed(() => getMarketingCadenceTargets(props.marketing))
const emailDraft = ref(targets.value.emailsPerMonth)
const smsDraft = ref(targets.value.smsPerMonth)

watch(targets, (t) => {
  emailDraft.value = t.emailsPerMonth
  smsDraft.value = t.smsPerMonth
})

const planDirty = computed(
  () =>
    emailDraft.value !== targets.value.emailsPerMonth ||
    smsDraft.value !== targets.value.smsPerMonth
)

function clampCadenceValue(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.min(60, Math.round(value))
}

function savePlan() {
  emit('save-cadence-plan', {
    emailsPerMonth: clampCadenceValue(emailDraft.value),
    smsPerMonth: clampCadenceValue(smsDraft.value),
  })
}

const planHint = computed(() => {
  const gap = idealDaysBetweenEmails(targets.value)
  return `Story calendar aims for roughly one email every ${gap} days, plus up to ${targets.value.smsPerMonth} SMS per month.`
})

const performanceBlock = computed(() => props.insights?.performance?.summary ?? null)

const topCampaigns = computed(
  () => props.insights?.performance?.summary?.topByRevenue?.slice(0, 6) ?? []
)

const topCampaignHighlights = computed(() =>
  (props.summary?.highlights ?? []).filter((h) => h.id.startsWith('top-'))
)

const takeawayCount = computed(() =>
  (props.summary?.sections ?? []).reduce((n, s) => n + s.bullets.length, 0)
)

function bulletIcon(tone: IntelligenceTone) {
  if (tone === 'critical') return '!'
  if (tone === 'attention') return '◆'
  if (tone === 'positive') return '✓'
  return '·'
}

function bulletIconClass(tone: IntelligenceTone) {
  if (tone === 'critical') return 'bg-red-100 text-red-700'
  if (tone === 'attention') return 'bg-amber-100 text-amber-800'
  if (tone === 'positive') return 'bg-emerald-100 text-emerald-800'
  return 'bg-bg text-muted border border-border'
}

function bulletRowClass(tone: IntelligenceTone) {
  if (tone === 'critical') return 'bg-red-50/50'
  if (tone === 'attention') return 'bg-amber-50/40'
  if (tone === 'positive') return 'bg-emerald-50/30'
  return ''
}
</script>
