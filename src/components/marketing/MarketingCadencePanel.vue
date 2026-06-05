<template>
  <div :class="embedded ? '' : 'bg-card border border-border rounded-lg p-4 sm:p-5'">
    <div
      v-if="!embedded"
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4"
    >
      <div>
        <h3 class="text-sm font-semibold text-text">Send cadence</h3>
        <p class="text-xs text-muted mt-0.5">From synced Klaviyo campaigns (read-only)</p>
      </div>
      <p v-if="syncedLabel" class="text-xs text-muted">Synced {{ syncedLabel }}</p>
    </div>
    <p v-else-if="syncedLabel" class="text-xs text-muted mb-3">Synced {{ syncedLabel }}</p>

    <div v-if="!connected" class="text-sm text-muted py-4 text-center">
      Connect Klaviyo in
      <button type="button" class="text-indigo-600 hover:underline font-medium" @click="$emit('open-settings')">
        Settings
      </button>
      to see cadence.
    </div>

    <template v-else-if="insights">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="rounded-lg bg-bg border border-border p-3 text-center">
          <div class="text-2xl font-semibold text-text tabular-nums">
            {{ insights.cadence.sendsLast30Days }}
          </div>
          <div class="text-[10px] text-muted uppercase tracking-wide mt-1">Sends last 30d</div>
        </div>
        <div class="rounded-lg bg-bg border border-border p-3 text-center">
          <div
            class="text-2xl font-semibold tabular-nums"
            :class="insights.cadence.sendsNext30Days === 0 ? 'text-amber-700' : 'text-text'"
          >
            {{ insights.cadence.sendsNext30Days }}
          </div>
          <div class="text-[10px] text-muted uppercase tracking-wide mt-1">Scheduled next 30d</div>
        </div>
        <div class="rounded-lg bg-bg border border-border p-3 text-center">
          <div class="text-2xl font-semibold text-text tabular-nums">
            {{ insights.cadence.medianDaysBetweenSends ?? '—' }}
          </div>
          <div class="text-[10px] text-muted uppercase tracking-wide mt-1">Median days apart</div>
        </div>
        <div class="rounded-lg bg-bg border border-border p-3 text-center">
          <div class="text-2xl font-semibold text-text tabular-nums">
            {{ insights.cadence.emailCount }}
            <span class="text-muted text-lg font-normal">/</span>
            {{ insights.cadence.smsCount }}
          </div>
          <div class="text-[10px] text-muted uppercase tracking-wide mt-1">Email / SMS (recent)</div>
        </div>
      </div>

      <p class="text-xs text-muted mt-3">
        {{ cadenceInterpretation }}
      </p>

      <div
        v-if="audienceSummaryLine"
        class="mt-3 rounded-md bg-bg border border-border px-3 py-2 text-xs text-muted"
      >
        {{ audienceSummaryLine }}
      </div>

      <div class="mt-4 pt-4 border-t border-border">
        <h4 class="text-xs font-semibold text-text mb-2">Audiences</h4>

        <div
          v-if="audienceSync?.listsError || audienceSync?.segmentsError"
          class="mb-3 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 space-y-1"
        >
          <p v-if="audienceSync?.listsError">
            <strong>Lists:</strong> {{ audienceSync.listsError }}
          </p>
          <p v-if="audienceSync?.segmentsError">
            <strong>Segments:</strong> {{ audienceSync.segmentsError }}
          </p>
          <p class="text-amber-800/90">
            Create a new Klaviyo private key with
            <code class="text-[10px]">lists:read</code>,
            <code class="text-[10px]">segments:read</code>, and
            <code class="text-[10px]">metrics:read</code>, reconnect, then Sync now.
          </p>
        </div>

        <div
          v-if="audienceStats"
          class="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs"
        >
          <div class="rounded-md bg-bg border border-border p-2">
            <div class="font-semibold text-text tabular-nums">{{ insights.lists.length }}</div>
            <div class="text-[10px] text-muted uppercase">Lists</div>
          </div>
          <div class="rounded-md bg-bg border border-border p-2">
            <div class="font-semibold text-text tabular-nums">{{ insights.segments.length }}</div>
            <div class="text-[10px] text-muted uppercase">Segments</div>
          </div>
          <div class="rounded-md bg-bg border border-border p-2">
            <div class="font-semibold text-text tabular-nums">{{ audienceStats.listsSized }}</div>
            <div class="text-[10px] text-muted uppercase">Lists w/ size</div>
          </div>
          <div class="rounded-md bg-bg border border-border p-2">
            <div class="font-semibold text-text tabular-nums">{{ audienceStats.segmentsSized }}</div>
            <div class="text-[10px] text-muted uppercase">Segments w/ size</div>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <p class="text-[10px] uppercase text-muted mb-1">
              Lists ({{ insights.lists.length }})
            </p>
            <ul v-if="insights.lists.length" class="text-xs text-text space-y-0.5 max-h-40 overflow-y-auto">
              <li v-for="l in topLists" :key="l.id" class="truncate">
                {{ l.name }}
                <span v-if="l.profileCount != null" class="text-muted">
                  ({{ l.profileCount.toLocaleString() }})
                </span>
                <span v-else class="text-muted/70"> (size n/a)</span>
              </li>
              <li v-if="insights.lists.length > 12" class="text-muted">+{{ insights.lists.length - 12 }} more</li>
            </ul>
            <p v-else class="text-xs text-muted">No lists returned</p>
          </div>
          <div>
            <p class="text-[10px] uppercase text-muted mb-1">
              Segments ({{ insights.segments.length }})
            </p>
            <ul v-if="insights.segments.length" class="text-xs text-text space-y-0.5 max-h-40 overflow-y-auto">
              <li v-for="s in topSegments" :key="s.id" class="truncate">
                {{ s.name }}
                <span v-if="s.profileCount != null" class="text-muted">({{ s.profileCount.toLocaleString() }})</span>
                <span v-else class="text-muted/70"> (size n/a)</span>
              </li>
              <li v-if="insights.segments.length > 12" class="text-muted">
                +{{ insights.segments.length - 12 }} more
              </li>
            </ul>
            <p v-else class="text-xs text-muted">No segments returned</p>
          </div>
        </div>
      </div>
    </template>

    <p v-else class="text-sm text-muted py-4">Sync Klaviyo in Settings to refresh cadence.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MarketingKlaviyoInsights } from '@/types/klaviyoInsights'

const props = defineProps<{
  connected: boolean
  insights: MarketingKlaviyoInsights | null
  syncedLabel?: string
  embedded?: boolean
}>()

defineEmits<{ 'open-settings': [] }>()

const audienceSync = computed(() => props.insights?.audienceSync ?? null)

const audienceSummary = computed(() => props.insights?.audienceSummary ?? null)

const audienceSummaryLine = computed(() => {
  const s = audienceSummary.value
  if (!s) return ''
  const parts: string[] = []
  if (s.largestSegment) {
    parts.push(
      `Largest segment: ${s.largestSegment.name} (${s.largestSegment.profileCount.toLocaleString()})`
    )
  }
  if (s.largestList) {
    parts.push(`Largest list: ${s.largestList.name} (${s.largestList.profileCount.toLocaleString()})`)
  }
  if (s.totalListProfiles != null && s.listsWithCount > 0) {
    parts.push(
      `${s.totalListProfiles.toLocaleString()} profiles across ${s.listsWithCount} sized list${s.listsWithCount > 1 ? 's' : ''}`
    )
  }
  if (s.segmentsWithCount > 0 && !s.largestSegment) {
    parts.push(`${s.segmentsWithCount} segment(s) with size data`)
  }
  return parts.join(' · ')
})

const audienceStats = computed(() => {
  const lists = props.insights?.lists ?? []
  const segments = props.insights?.segments ?? []
  return {
    listsSized: lists.filter((l) => l.profileCount != null).length,
    segmentsSized: segments.filter((s) => s.profileCount != null).length,
  }
})

const topLists = computed(() => {
  const rows = [...(props.insights?.lists ?? [])]
  rows.sort((a, b) => (b.profileCount ?? 0) - (a.profileCount ?? 0))
  return rows.slice(0, 12)
})

const topSegments = computed(() => {
  const segs = [...(props.insights?.segments ?? [])]
  segs.sort((a, b) => (b.profileCount ?? 0) - (a.profileCount ?? 0))
  return segs.slice(0, 12)
})

const cadenceInterpretation = computed(() => {
  const c = props.insights?.cadence
  if (!c) return ''
  if (c.sendsNext30Days === 0 && c.sendsLast30Days > 10) {
    return 'You sent frequently recently but nothing is scheduled ahead — plan the next month around pipeline go-live dates.'
  }
  if (c.medianDaysBetweenSends != null && c.medianDaysBetweenSends <= 2) {
    return 'Scheduled sends are very close together; pair promos with arrivals and avoid overlapping launch emails.'
  }
  if (c.sendsNext30Days > 0 && c.sendsLast30Days > 0) {
    return 'Compare scheduled Klaviyo sends with GreenRoom go-live and arrival dates in the story calendar below.'
  }
  return `${c.scheduledCampaignCount} campaigns in sync data.`
})
</script>
