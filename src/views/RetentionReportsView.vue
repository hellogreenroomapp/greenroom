<template>
  <RetentionPasswordGate>
  <div class="max-w-4xl space-y-6">
    <div>
      <h2 class="text-xl sm:text-2xl font-semibold text-text mb-1">
        {{ registryConfig?.heading || 'Retention Reports' }}
      </h2>
      <p class="text-sm text-muted max-w-2xl">
        {{
          registryConfig?.description ||
          'Monthly email & SMS performance reports for your brand.'
        }}
      </p>
    </div>

    <!-- New report files detected in the reports folder -->
    <div
      v-for="file in detectedFiles"
      :key="file.id"
      class="border border-dashed border-indigo-300 bg-indigo-50/50 rounded-xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap"
    >
      <div>
        <p class="text-sm font-medium text-text">
          New report file found: <span class="font-mono text-indigo-700">{{ file.fileName }}</span>
        </p>
        <p class="text-xs text-muted mt-0.5">
          {{ file.monthLabel }} {{ file.year }} — click to generate its stats card from the report.
        </p>
      </div>
      <button
        type="button"
        class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        :disabled="addingId === file.id"
        @click="addDetectedReport(file)"
      >
        {{ addingId === file.id ? 'Adding…' : '＋ Add report card' }}
      </button>
    </div>

    <template v-if="hasReports">
      <div
        v-for="group in reportsByYear"
        :key="group.year"
        class="space-y-4"
      >
        <p class="text-xs font-semibold tracking-widest uppercase text-muted">{{ group.year }}</p>

        <router-link
          v-for="report in group.reports"
          :key="report.id"
          :to="{ name: 'retention-report-detail', params: { reportId: report.id } }"
          class="block bg-card border border-border rounded-xl p-6 transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300"
        >
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p class="text-lg font-semibold text-text mb-0.5">{{ report.title }}</p>
              <p class="text-sm text-muted">{{ report.window }}</p>
            </div>
            <span class="text-sm font-semibold text-indigo-600 whitespace-nowrap">View report →</span>
          </div>

          <div class="flex flex-wrap gap-2 mt-4">
            <span
              v-for="chip in report.chips"
              :key="chip.label"
              class="text-xs px-3 py-1 rounded-full border"
              :class="
                chip.positive
                  ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                  : 'text-muted border-border bg-bg'
              "
            >{{ chip.label }}</span>
          </div>

          <div class="flex flex-wrap gap-x-8 gap-y-3 mt-4 pt-4 border-t border-border">
            <div v-for="stat in report.stats" :key="stat.label">
              <div
                class="text-lg font-semibold"
                :class="stat.positive ? 'text-emerald-700' : 'text-text'"
              >{{ stat.value }}</div>
              <div class="text-xs text-muted mt-0.5">{{ stat.label }}</div>
            </div>
          </div>

          <p v-if="report.highlights" class="text-xs text-muted mt-4">{{ report.highlights }}</p>
        </router-link>
      </div>

      <div
        v-if="!detectedFiles.length"
        class="border border-dashed border-border rounded-xl px-6 py-4 text-sm text-muted flex items-center gap-2"
      >
        <span v-if="scanning">Checking for new report files…</span>
        <template v-else>
          <span>＋</span>
          <span>
            Next monthly report coming soon...
          </span>
        </template>
      </div>

      <p v-if="registryConfig?.footnote" class="text-xs text-muted border-t border-border pt-4">
        {{ registryConfig.footnote }}
      </p>
    </template>

    <div
      v-else-if="!detectedFiles.length"
      class="bg-card border border-border rounded-xl p-12 text-center text-muted text-sm"
    >
      No retention reports are available for
      <span class="font-medium text-text">{{ brandStore.currentBrand?.name || 'this brand' }}</span> yet.
    </div>
  </div>
  </RetentionPasswordGate>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useRetentionReports } from '@/composables/useRetentionReports'
import RetentionPasswordGate from '@/components/retention/RetentionPasswordGate.vue'
import type { RetentionReport } from '@/constants/retentionReports'
import { parseReportId } from '@/utils/retentionReports'

const brandStore = useBrandStore()
const {
  registryConfig,
  reports,
  hasReports,
  detectedFiles,
  scanning,
  addingId,
  scanForNewReports,
  addDetectedReport,
} = useRetentionReports()

const reportsByYear = computed(() => {
  const groups: { year: string; reports: RetentionReport[] }[] = []
  for (const report of reports.value) {
    const year = String(parseReportId(report.id)?.year || report.title.match(/\b(20\d{2})\b/)?.[1] || 'Reports')
    let group = groups.find((g) => g.year === year)
    if (!group) {
      group = { year, reports: [] }
      groups.push(group)
    }
    group.reports.push(report)
  }
  return groups
})

onMounted(scanForNewReports)

// Rescan when switching brands
watch(
  () => brandStore.currentBrand?.id,
  () => {
    detectedFiles.value = []
    scanForNewReports()
  }
)
</script>
