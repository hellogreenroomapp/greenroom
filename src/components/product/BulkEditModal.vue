<template>
  <Modal :is-open="isOpen" title="Bulk Edit Products" size="full" @close="$emit('close')">
    <div class="space-y-4">
      <!-- Selection Info -->
      <div class="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <div class="flex items-center gap-4">
          <span class="text-sm font-medium text-indigo-900">
            {{ selectedProducts.length }} product{{ selectedProducts.length !== 1 ? 's' : '' }} selected
            <span v-if="filteredProducts.length !== products.length" class="text-xs text-indigo-600">
              ({{ filteredProducts.length }} shown of {{ products.length }} total)
            </span>
          </span>
          <button
            v-if="selectedProducts.length > 0"
            class="text-xs text-indigo-600 hover:text-indigo-700 underline"
            @click="clearSelection"
          >
            Clear Selection
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs px-2 py-1 text-indigo-600 hover:text-indigo-700 border border-indigo-300 rounded"
            @click="selectAll"
          >
            Select All{{ filteredProducts.length !== products.length ? ` (${filteredProducts.length})` : '' }}
          </button>
          <button
            class="text-xs px-2 py-1 text-indigo-600 hover:text-indigo-700 border border-indigo-300 rounded"
            @click="selectNone"
          >
            Select None
          </button>
        </div>
      </div>

      <!-- Bulk Edit Form -->
      <div v-if="selectedProducts.length > 0" class="p-4 bg-bg border border-border rounded-lg space-y-4">
        <h3 class="text-sm font-semibold text-text">Edit Selected Products</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Stage -->
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Stage</label>
            <select
              v-model="bulkEditData.stage"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Keep Current —</option>
              <option v-for="stage in PIPELINE_STAGES" :key="stage" :value="stage">
                {{ STAGE_LABELS[stage] }}
              </option>
            </select>
          </div>

          <!-- Archive Status -->
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Archive Status</label>
            <select
              v-model="bulkEditData.archived"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Keep Current —</option>
              <option :value="true">Archive</option>
              <option :value="false">Unarchive</option>
            </select>
          </div>

          <!-- Go Live Date -->
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Go Live Date</label>
            <input
              v-model="bulkEditData.goLiveDate"
              type="date"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              v-if="bulkEditData.goLiveDate"
              class="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
              @click="bulkEditData.goLiveDate = ''"
            >
              Clear
            </button>
          </div>

          <!-- Scheduled Shoot Date -->
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Scheduled Shoot Date</label>
            <input
              v-model="bulkEditData.scheduledShootDate"
              type="date"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              v-if="bulkEditData.scheduledShootDate"
              class="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
              @click="bulkEditData.scheduledShootDate = ''"
            >
              Clear
            </button>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Tentative Ex-Factory Date</label>
            <input
              v-model="bulkEditData.tentativeExFactoryDate"
              type="date"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              v-if="bulkEditData.tentativeExFactoryDate"
              class="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
              @click="bulkEditData.tentativeExFactoryDate = ''"
            >
              Clear
            </button>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Factory Ship Date</label>
            <input
              v-model="bulkEditData.factoryShipDate"
              type="date"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              v-if="bulkEditData.factoryShipDate"
              class="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
              @click="bulkEditData.factoryShipDate = ''"
            >
              Clear
            </button>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Order ID</label>
            <input
              v-model="bulkEditData.orderId"
              type="text"
              class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Set for all selected…"
            />
            <button
              v-if="bulkEditData.orderId"
              class="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
              @click="bulkEditData.orderId = ''"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-bg border border-border rounded-lg">
        <div>
          <label class="block text-xs font-medium text-muted mb-1.5">Search Product Name</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by product name..."
              class="w-full px-3 py-2 pl-9 bg-card border border-border rounded-md text-text text-sm placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-muted mb-1.5">Filter by Stage</label>
          <select
            v-model="filterStage"
            class="w-full px-3 py-2 bg-card border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Stages</option>
            <option v-for="stage in PIPELINE_STAGES" :key="stage" :value="stage">
              {{ STAGE_LABELS[stage] }}
            </option>
          </select>
        </div>
      </div>

      <!-- Products Table -->
      <div class="border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-bg border-b border-border">
              <tr>
                <th class="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    :indeterminate="someSelected"
                    class="w-4 h-4 text-indigo-600 border-border rounded focus:ring-indigo-500"
                    @change="toggleSelectAll"
                  />
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Product</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">SKU</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Stage</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Go Live</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">Shoot Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="product in filteredProducts"
                :key="product.id"
                class="hover:bg-bg transition-colors"
                :class="{ 'bg-indigo-50': selectedProductIds.has(product.id) }"
              >
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    :checked="selectedProductIds.has(product.id)"
                    class="w-4 h-4 text-indigo-600 border-border rounded focus:ring-indigo-500"
                    @change="toggleProduct(product.id)"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="product.imageUrl"
                      :src="product.imageUrl"
                      :alt="product.name"
                      class="w-10 h-10 object-cover rounded border border-border"
                    />
                    <div v-else class="w-10 h-10 bg-bg border border-border rounded flex items-center justify-center">
                      <svg class="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span class="text-sm font-medium text-text">{{ product.name }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-muted font-mono">{{ product.sku }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 text-xs font-medium rounded text-text" :style="{ backgroundColor: getStageColor(product.stage) + 'CC' }">
                    {{ STAGE_LABELS[product.stage] }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-text">
                  {{ productHasGoLiveDate(product) ? formatDateUTC(product.goLiveDate!) : '—' }}
                </td>
                <td class="px-4 py-3 text-sm text-text">
                  {{ product.scheduledShootDate ? formatDateUTC(product.scheduledShootDate) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
        @click="$emit('close')"
      >
        Cancel
      </button>
      <button
        v-if="selectedProducts.length > 0"
        class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasChanges"
        @click="handleBulkEdit"
      >
        Save Changes ({{ selectedProducts.length }})
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Product } from '@/types'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/types'
// Format date using UTC to avoid timezone shifts
function formatDateUTC(timestamp: Timestamp): string {
  const date = timestamp.toDate()
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[month - 1]} ${day}, ${year}`
}
import { getStageColor } from '@/constants/stageColors'
import { productHasGoLiveDate } from '@/utils/dates'
import Modal from '@/components/common/Modal.vue'

const props = defineProps<{
  isOpen: boolean
  products: Product[]
}>()

const emit = defineEmits<{
  close: []
  save: [updates: Array<{ productId: string; updates: Partial<Product> }>]
}>()

const selectedProductIds = ref<Set<string>>(new Set())
const searchQuery = ref('')
const filterStage = ref<Product['stage'] | ''>('')
const bulkEditData = ref<{
  stage?: Product['stage'] | ''
  archived?: boolean | ''
  goLiveDate?: string
  scheduledShootDate?: string
  tentativeExFactoryDate?: string
  factoryShipDate?: string
  orderId?: string
}>({
  stage: '',
  archived: '',
  goLiveDate: '',
  scheduledShootDate: '',
  tentativeExFactoryDate: '',
  factoryShipDate: '',
  orderId: '',
})

const filteredProducts = computed(() => {
  let filtered = props.products

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(query))
  }

  // Filter by stage
  if (filterStage.value) {
    filtered = filtered.filter((p) => p.stage === filterStage.value)
  }

  return filtered
})

const selectedProducts = computed(() => {
  return filteredProducts.value.filter((p) => selectedProductIds.value.has(p.id))
})

const allSelected = computed(() => {
  return filteredProducts.value.length > 0 && selectedProductIds.value.size === filteredProducts.value.length
})

const someSelected = computed(() => {
  return selectedProductIds.value.size > 0 && selectedProductIds.value.size < filteredProducts.value.length
})

const hasChanges = computed(() => {
  return !!(
    bulkEditData.value.stage ||
    (bulkEditData.value.archived !== '' && bulkEditData.value.archived !== undefined) ||
    bulkEditData.value.goLiveDate ||
    bulkEditData.value.scheduledShootDate ||
    bulkEditData.value.tentativeExFactoryDate ||
    bulkEditData.value.factoryShipDate ||
    bulkEditData.value.orderId
  )
})

function toggleProduct(productId: string) {
  if (selectedProductIds.value.has(productId)) {
    selectedProductIds.value.delete(productId)
  } else {
    selectedProductIds.value.add(productId)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedProductIds.value.clear()
  } else {
    selectedProductIds.value = new Set(filteredProducts.value.map((p) => p.id))
  }
}

function selectAll() {
  selectedProductIds.value = new Set(filteredProducts.value.map((p) => p.id))
}

function selectNone() {
  selectedProductIds.value.clear()
}

function clearSelection() {
  selectedProductIds.value.clear()
}

function handleBulkEdit() {
  if (selectedProducts.value.length === 0 || !hasChanges.value) return

  const updates: Array<{ productId: string; updates: Partial<Product> }> = []

  for (const product of selectedProducts.value) {
    const productUpdates: Partial<Product> = {}

    if (bulkEditData.value.stage) {
      productUpdates.stage = bulkEditData.value.stage as Product['stage']
    }

    if (bulkEditData.value.goLiveDate) {
      // Parse YYYY-MM-DD directly to avoid timezone shifts (e.g. March 6 input becoming March 5)
      const parts = bulkEditData.value.goLiveDate.split('-').map(Number)
      const year = parts[0] ?? 0
      const month = (parts[1] ?? 1) - 1
      const day = parts[2] ?? 1
      const dateUTC = new Date(Date.UTC(year, month, day))
      productUpdates.goLiveDate = Timestamp.fromDate(dateUTC)
    }

    if (bulkEditData.value.scheduledShootDate) {
      const parts = bulkEditData.value.scheduledShootDate.split('-').map(Number)
      const year = parts[0] ?? 0
      const month = (parts[1] ?? 1) - 1
      const day = parts[2] ?? 1
      const dateUTC = new Date(Date.UTC(year, month, day))
      productUpdates.scheduledShootDate = Timestamp.fromDate(dateUTC)
    }

    if (bulkEditData.value.tentativeExFactoryDate) {
      const parts = bulkEditData.value.tentativeExFactoryDate.split('-').map(Number)
      const year = parts[0] ?? 0
      const month = (parts[1] ?? 1) - 1
      const day = parts[2] ?? 1
      productUpdates.tentativeExFactoryDate = Timestamp.fromDate(new Date(Date.UTC(year, month, day)))
    }

    if (bulkEditData.value.factoryShipDate) {
      const parts = bulkEditData.value.factoryShipDate.split('-').map(Number)
      const year = parts[0] ?? 0
      const month = (parts[1] ?? 1) - 1
      const day = parts[2] ?? 1
      productUpdates.factoryShipDate = Timestamp.fromDate(new Date(Date.UTC(year, month, day)))
    }

    if (bulkEditData.value.orderId?.trim()) {
      productUpdates.orderId = bulkEditData.value.orderId.trim()
    }

    if (bulkEditData.value.archived !== '' && bulkEditData.value.archived !== undefined) {
      productUpdates.archived = bulkEditData.value.archived as boolean
    }

    if (Object.keys(productUpdates).length > 0) {
      updates.push({ productId: product.id, updates: productUpdates })
    }
  }

  emit('save', updates)
  
  // Reset form
  selectedProductIds.value.clear()
  bulkEditData.value = {
    stage: '',
    archived: '',
    goLiveDate: '',
    scheduledShootDate: '',
    tentativeExFactoryDate: '',
    factoryShipDate: '',
    orderId: '',
  }
}

// Reset selection when modal closes
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      selectedProductIds.value.clear()
      searchQuery.value = ''
      filterStage.value = ''
      bulkEditData.value = {
        stage: '',
        archived: undefined,
        goLiveDate: '',
        scheduledShootDate: '',
        tentativeExFactoryDate: '',
        factoryShipDate: '',
        orderId: '',
      }
    }
  }
)
</script>
