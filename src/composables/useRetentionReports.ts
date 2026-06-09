import { computed, ref } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useBrand } from '@/composables/useBrand'
import { useToastStore } from '@/stores/toast'
import {
  getRetentionReports,
  normalizeBrandKey,
  type RetentionReport,
} from '@/constants/retentionReports'
import {
  buildCandidateIds,
  fetchReportFile,
  parseReportFile,
  reportSortKey,
  type DetectedReportFile,
} from '@/utils/retentionReports'

export function useRetentionReports() {
  const brandStore = useBrandStore()
  const { updateBrand } = useBrand()
  const toast = useToastStore()

  const brandKey = computed(() =>
    normalizeBrandKey(brandStore.currentBrand?.name) ||
    normalizeBrandKey(brandStore.currentBrand?.slug)
  )

  const registryConfig = computed(() =>
    getRetentionReports(brandStore.currentBrand?.name, brandStore.currentBrand?.slug)
  )

  /** Registry (static seed) + reports added via the UI, newest first. */
  const reports = computed<RetentionReport[]>(() => {
    const merged = new Map<string, RetentionReport>()
    for (const report of registryConfig.value?.reports || []) merged.set(report.id, report)
    for (const report of brandStore.currentBrand?.retentionReports || []) {
      merged.set(report.id, report)
    }
    return [...merged.values()].sort((a, b) => reportSortKey(b) - reportSortKey(a))
  })

  const hasReports = computed(() => reports.value.length > 0)

  function findReport(reportId: string): RetentionReport | null {
    return reports.value.find((r) => r.id === reportId) || null
  }

  // --- Detection of new report files dropped into /public/reports/<brand>/ ---

  const detectedFiles = ref<DetectedReportFile[]>([])
  const scanning = ref(false)
  const addingId = ref<string | null>(null)

  async function scanForNewReports() {
    if (!brandKey.value) return
    scanning.value = true
    try {
      const existingIds = reports.value.map((r) => r.id)
      const candidates = buildCandidateIds(existingIds)
      const results = await Promise.all(
        candidates.map((id) => fetchReportFile(brandKey.value, id))
      )
      detectedFiles.value = results.filter((f): f is DetectedReportFile => f !== null)
    } finally {
      scanning.value = false
    }
  }

  async function addDetectedReport(file: DetectedReportFile) {
    const brand = brandStore.currentBrand
    if (!brand) return
    addingId.value = file.id
    try {
      const card = parseReportFile(file)
      const existing = (brand.retentionReports || []).filter((r) => r.id !== card.id)
      await updateBrand(brand.id, { retentionReports: [...existing, card] })
      detectedFiles.value = detectedFiles.value.filter((f) => f.id !== file.id)
      toast.success(`${card.title} added`)
    } catch (error) {
      console.error('Failed to add report card:', error)
      toast.error('Could not add the report card. Check that you have permission to edit this brand.')
    } finally {
      addingId.value = null
    }
  }

  return {
    registryConfig,
    reports,
    hasReports,
    findReport,
    detectedFiles,
    scanning,
    addingId,
    scanForNewReports,
    addDetectedReport,
  }
}
