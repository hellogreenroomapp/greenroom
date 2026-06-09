<template>
  <RetentionPasswordGate>
  <div class="flex flex-col h-[calc(100vh-7.5rem)] -m-2">
    <div class="flex items-center justify-between gap-4 px-2 pb-3">
      <div class="flex items-center gap-3 min-w-0">
        <router-link
          :to="{ name: 'retention-reports' }"
          class="text-sm text-muted hover:text-text whitespace-nowrap"
        >← All reports</router-link>
        <h2 v-if="report" class="text-base font-semibold text-text truncate">{{ report.title }}</h2>
      </div>
      <div class="flex items-center gap-4">
        <a
          v-if="slidesUrl"
          :href="slidesUrl"
          target="_blank"
          rel="noopener"
          class="text-sm text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap"
        >View as slides ↗</a>
        <a
          v-if="report"
          :href="report.url"
          target="_blank"
          rel="noopener"
          class="text-sm text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap"
        >Open full screen ↗</a>
      </div>
    </div>

    <iframe
      v-if="report"
      :src="report.url"
      :title="report.title"
      class="flex-1 w-full bg-white border border-border rounded-xl"
    />

    <div
      v-else
      class="bg-card border border-border rounded-xl p-12 text-center text-muted text-sm"
    >
      Report not found for {{ brandStore.currentBrand?.name || 'this brand' }}.
      <router-link :to="{ name: 'retention-reports' }" class="text-indigo-600 font-medium">
        Back to all reports
      </router-link>
    </div>
  </div>
  </RetentionPasswordGate>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useBrandStore } from '@/stores/brand'
import { useRetentionReports } from '@/composables/useRetentionReports'
import RetentionPasswordGate from '@/components/retention/RetentionPasswordGate.vue'

const route = useRoute()
const brandStore = useBrandStore()
const { findReport } = useRetentionReports()

const report = computed(() => findReport(route.params.reportId as string))

/**
 * Show "View as slides" only when a companion <report>-slides.html file
 * exists. The hosting rewrite serves the SPA index.html for missing files,
 * so we validate the fetched document is actually a slide deck.
 */
const slidesUrl = ref<string | null>(null)
watch(
  report,
  async (current) => {
    slidesUrl.value = null
    if (!current) return
    const candidate = current.url.replace(/\.html$/, '-slides.html')
    try {
      const res = await fetch(candidate, { cache: 'no-store' })
      if (!res.ok) return
      const title = (await res.text()).match(/<title>([^<]*)<\/title>/i)?.[1] ?? ''
      if (/slides/i.test(title)) slidesUrl.value = candidate
    } catch {
      /* no slides version */
    }
  },
  { immediate: true }
)
</script>
