<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-text">Bulk Upload Products</h2>
        <p class="text-sm text-muted mt-1">Upload multiple products from a CSV file</p>
      </div>
      <div class="flex items-center gap-3">
        <div v-if="projects.length > 0">
          <label class="block text-xs font-medium text-muted mb-1.5">Collection</label>
          <select
            v-model="selectedProjectId"
            class="px-3 py-2 text-sm bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        <button
          class="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-300 rounded-md hover:bg-indigo-50 transition-colors"
          @click="downloadTemplate"
        >
          Download Template
        </button>
      </div>
    </div>

    <div
      v-if="!parsedRows.length"
      class="border-2 border-dashed border-border rounded-lg p-12 text-center transition-colors"
      :class="{
        'border-indigo-400 bg-indigo-50': isDragging,
        'bg-bg': !isDragging,
      }"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <svg
        class="mx-auto h-12 w-12 text-muted mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <h3 class="text-lg font-medium text-text mb-2">Drop CSV file here</h3>
      <p class="text-sm text-muted mb-4">or</p>
      <label class="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md cursor-pointer hover:bg-indigo-700 transition-colors">
        Browse Files
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="handleFileSelect"
        />
      </label>
      <p class="text-xs text-muted mt-4">CSV files only (.csv)</p>
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-muted">
            {{ validRows.length }} of {{ parsedRows.length }} products ready to import
          </p>
          <p v-if="invalidRows.length > 0" class="text-sm text-red-600 mt-1">
            {{ invalidRows.length }} row{{ invalidRows.length !== 1 ? 's' : '' }} need attention
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-bg transition-colors"
            @click="reset"
          >
            Clear
          </button>
          <button
            class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="validRows.length === 0 || importing"
            @click="handleImport"
          >
            <span v-if="importing">Importing...</span>
            <span v-else>Import {{ validRows.length }} Product{{ validRows.length !== 1 ? 's' : '' }}</span>
          </button>
        </div>
      </div>

      <div class="bg-card border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-bg border-b border-border">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Row</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">SKU</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Category</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Priority</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Shot Type</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Go Live Date</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="(row, index) in parsedRows"
                :key="index"
                class="transition-colors"
                :class="{
                  'bg-red-50': !row.validation.valid,
                  'hover:bg-bg': row.validation.valid,
                }"
              >
                <td class="px-4 py-3 text-sm text-muted">{{ row.rowNumber }}</td>
                <td class="px-4 py-3">
                  <input
                    v-model="row.sku"
                    type="text"
                    class="w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{
                      'border-red-300 bg-red-100': !row.validation.valid && !row.sku,
                    }"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="row.name"
                    type="text"
                    class="w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{
                      'border-red-300 bg-red-100': !row.validation.valid && !row.name,
                    }"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="row.category"
                    type="text"
                    class="w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    @blur="validateRow(row)"
                  />
                </td>
                <td class="px-4 py-3">
                  <select
                    v-model="row.priority"
                    class="w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    @change="validateRow(row)"
                  >
                    <option value="">Select...</option>
                    <option value="hero">Hero</option>
                    <option value="collection">Collection</option>
                    <option value="basics">Basics</option>
                  </select>
                </td>
                <td class="px-4 py-3">
                  <select
                    v-model="row.shot_type"
                    class="w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    @change="validateRow(row)"
                  >
                    <option value="">Select...</option>
                    <option value="flat_lay">Flat Lay</option>
                    <option value="on_model">On Model</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="ghost_mannequin">Ghost Mannequin</option>
                  </select>
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="row.go_live_date"
                    type="date"
                    class="w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    :class="{
                      'border-red-300 bg-red-100': !row.validation.valid && !row.go_live_date,
                    }"
                    @change="validateRow(row)"
                  />
                </td>
                <td class="px-4 py-3">
                  <div v-if="row.validation.valid" class="flex items-center gap-2">
                    <span class="text-xs text-emerald-600 font-medium">✓ Valid</span>
                  </div>
                  <div v-else class="text-xs text-red-600">
                    <div v-for="(error, errorIndex) in row.validation.errors" :key="errorIndex">
                      {{ error }}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Modal
      :is-open="showSummary"
      title="Import Summary"
      @close="showSummary = false"
    >
      <div class="space-y-4">
        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p class="text-sm font-medium text-emerald-800">
            ✓ Successfully imported {{ importSummary.success }} product{{ importSummary.success !== 1 ? 's' : '' }}
          </p>
        </div>
        <div v-if="importSummary.failed > 0" class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm font-medium text-red-800 mb-2">
            ✗ Failed to import {{ importSummary.failed }} product{{ importSummary.failed !== 1 ? 's' : '' }}
          </p>
          <ul class="text-xs text-red-700 list-disc list-inside space-y-1">
            <li v-for="error in importSummary.errors" :key="error">{{ error }}</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <button
          class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
          @click="handleCloseSummary"
        >
          Done
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Product } from '@/types'
import { useBrandStore } from '@/stores/brand'
import { useProducts } from '@/composables/useProducts'
import { useProject } from '@/composables/useProject'
import {
  parseCSV,
  validateProductRow,
  mapRowToProduct,
  downloadCSVTemplate,
  type ParsedRow,
  type ValidationResult,
} from '@/utils/csv'
import Modal from '@/components/common/Modal.vue'

const brandStore = useBrandStore()
const { products, fetchProducts, createProduct } = useProducts()
const { projects, fetchProjects } = useProject()

const brandId = computed(() => brandStore.brandId || '')
const selectedProjectId = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const parsedRows = ref<(ParsedRow & { validation: { valid: boolean; errors: string[] } })[]>([])
const importing = ref(false)
const showSummary = ref(false)
const importSummary = ref({
  success: 0,
  failed: 0,
  errors: [] as string[],
})

const validRows = computed(() => {
  return parsedRows.value.filter((row) => row.validation.valid)
})

const invalidRows = computed(() => {
  return parsedRows.value.filter((row) => !row.validation.valid)
})

onMounted(async () => {
  if (brandId.value) {
    await Promise.all([
      fetchProducts(brandId.value),
      fetchProjects(brandId.value),
    ])
    if (projects.value.length > 0 && projects.value[0]) {
      selectedProjectId.value = projects.value[0].id
    }
  }
})

function downloadTemplate() {
  downloadCSVTemplate()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  
  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

async function processFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    alert('Please upload a CSV file')
    return
  }
  
  try {
    const rows = await parseCSV(file)
    const existingSkus = new Set(products.value.map((p) => p.sku.toLowerCase()))
    
    parsedRows.value = rows.map((row) => {
      const validation = validateProductRow(row, existingSkus)
      return {
        ...row,
        validation,
      } as ParsedRow & { validation: { valid: boolean; errors: string[] } }
    })
  } catch (error: any) {
    alert(`Error parsing CSV: ${error.message}`)
  }
}

function validateRow(row: ParsedRow & { validation: { valid: boolean; errors: string[] } }) {
  const existingSkus = new Set(products.value.map((p) => p.sku.toLowerCase()))
  const currentSkus = new Set(
    parsedRows.value
      .filter((r) => r.rowNumber !== row.rowNumber && r.sku.trim())
      .map((r) => r.sku.trim().toLowerCase())
  )
  const allSkus = new Set([...existingSkus, ...currentSkus])
  
  const { validation: _, ...rowWithoutValidation } = row
  const rowToValidate: ParsedRow = {
    ...rowWithoutValidation,
    sku: row.sku.trim(),
  }
  
  ;(row as ParsedRow & { validation: ValidationResult }).validation = validateProductRow(rowToValidate, allSkus)
}

function reset() {
  parsedRows.value = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleImport() {
  if (!selectedProjectId.value) {
    alert('Please select a collection first')
    return
  }
  
  importing.value = true
  const summary = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  }
  
  for (const row of validRows.value) {
    try {
      const productData = mapRowToProduct(row, brandId.value, selectedProjectId.value)
      await createProduct(
        productData as Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>
      )
      summary.success++
    } catch (error: any) {
      summary.failed++
      summary.errors.push(`Row ${row.rowNumber} (${row.sku}): ${error.message}`)
    }
  }
  
  importing.value = false
  importSummary.value = summary
  showSummary.value = true
  
  if (summary.success > 0) {
    await fetchProducts(brandId.value)
  }
}

function handleCloseSummary() {
  showSummary.value = false
  if (importSummary.value.success > 0) {
    reset()
  }
}
</script>
