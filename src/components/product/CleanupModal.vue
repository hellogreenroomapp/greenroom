<template>
  <Modal :is-open="isOpen" title="Launch Day Cleanup" size="xl" @close="handleClose">
    <div class="space-y-4">
      <p class="text-sm text-muted">
        The following products have launch dates in the past but aren't marked as "Live" yet. Update their stage or launch date as needed.
      </p>
      
      <div v-if="products.length === 0" class="py-8 text-center">
        <p class="text-sm text-muted">All products with past launch dates are already live! 🎉</p>
      </div>
      
      <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
        <div
          v-for="product in products"
          :key="product.id"
          class="bg-bg border border-border rounded-lg p-3"
        >
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-text mb-1" :class="product.gender === 'womens' ? 'text-blue-600' : ''">
                {{ product.name }}
              </h4>
              <p class="text-xs text-muted mb-1">SKU: {{ product.sku }}</p>
              <div v-if="product.colors && product.colors.length > 0" class="text-xs text-muted mb-2">
                <span
                  v-for="(color, index) in product.colors"
                  :key="color.name"
                >
                  <span>{{ color.name }}</span><span
                    v-if="color.tags && color.tags.length > 0"
                    class="italic ml-0.5"
                    :class="color.tags[0] === 'restock' ? 'text-blue-600' : 'text-green-700'"
                  >
                    ({{ color.tags[0] === 'restock' ? 'restock' : 'new' }})
                  </span>
                  <span v-if="index < product.colors.length - 1">, </span>
                </span>
              </div>
              
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs font-medium text-text mb-1">Stage</label>
                  <select
                    :value="productUpdates[product.id]?.stage ?? product.stage"
                    class="w-full px-2 py-1.5 bg-card border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    @change="updateProductField(product.id, 'stage', ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="stage in PIPELINE_STAGES"
                      :key="stage"
                      :value="stage"
                    >
                      {{ STAGE_LABELS[stage] }}
                    </option>
                  </select>
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-text mb-1">Launch Date</label>
                  <input
                    :value="getDateInputValue(product.id)"
                    type="date"
                    class="w-full px-2 py-1.5 bg-card border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    @change="updateProductField(product.id, 'goLiveDate', ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <button
        class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
        @click="handleClose"
      >
        Dismiss
      </button>
      <button
        v-if="hasChanges"
        class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        @click="handleSave"
      >
        Save All Changes
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Product } from '@/types'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/types'
import Modal from '@/components/common/Modal.vue'

const props = defineProps<{
  isOpen: boolean
  products: Product[]
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'save': [updates: Record<string, Partial<Product>>]
}>()

const productUpdates = ref<Record<string, Partial<Product>>>({})

const hasChanges = computed(() => {
  return Object.keys(productUpdates.value).length > 0
})

function getDateInputValue(productId: string): string {
  const update = productUpdates.value[productId]
  const product = props.products.find(p => p.id === productId)
  
  if (update?.goLiveDate) {
    // If it's a Timestamp (from our update)
    if (update.goLiveDate instanceof Timestamp) {
      const date = update.goLiveDate.toDate()
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    // If it's a string from the input
    if (typeof update.goLiveDate === 'string') {
      return update.goLiveDate
    }
  }
  
  if (product?.goLiveDate) {
    const date = product.goLiveDate.toDate()
    // Format as YYYY-MM-DD for date input
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return ''
}

function updateProductField(productId: string, field: 'stage' | 'goLiveDate', value: string) {
  if (!productUpdates.value[productId]) {
    productUpdates.value[productId] = {}
  }
  
  if (field === 'stage') {
    productUpdates.value[productId].stage = value as Product['stage']
  } else if (field === 'goLiveDate') {
    // Parse YYYY-MM-DD directly to avoid timezone shifts (e.g. March 6 input becoming March 5)
    const parts = value.split('-').map(Number)
    const year = parts[0] ?? 0
    const month = (parts[1] ?? 1) - 1
    const day = parts[2] ?? 1
    const dateUTC = new Date(Date.UTC(year, month, day))
    productUpdates.value[productId].goLiveDate = Timestamp.fromDate(dateUTC)
  }
}

function handleClose() {
  productUpdates.value = {}
  emit('update:isOpen', false)
}

function handleSave() {
  if (!hasChanges.value) return
  
  emit('save', productUpdates.value)
  productUpdates.value = {}
  emit('update:isOpen', false)
}
</script>
