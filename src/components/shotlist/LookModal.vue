<template>
  <Modal :is-open="isOpen" :title="isEditing ? 'Edit Look' : 'Create Look'" size="3xl" @close="handleClose">
    <div class="space-y-6">
      <!-- Look Name -->
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Look Name</label>
        <input
          v-model="lookData.name"
          type="text"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="e.g., OUTFIT #11"
        />
      </div>

      <!-- Inspiration Image -->
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Inspiration Image</label>
        <ImageUpload
          v-model="lookData.inspirationImageUrl"
          label=""
          url-placeholder="https://example.com/inspiration.jpg"
          :storage-path="inspirationStoragePath"
          :show-remove="true"
          @upload-complete="handleImageUpload"
        />
        <p class="mt-1 text-xs text-muted">Add an inspiration image for this look (you can save a look with only a name and image—no products required).</p>
      </div>

      <!-- Note -->
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Note</label>
        <textarea
          v-model="lookData.note"
          rows="3"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-y min-h-[4.5rem]"
          placeholder="Styling notes, location, references…"
        />
      </div>

      <!-- Product Selection -->
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Products</label>
        <div class="mb-3">
          <input
            v-model="productSearch"
            type="text"
            class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Search products..."
            @input="handleProductSearch"
          />
        </div>

        <!-- Selected Products -->
        <div v-if="selectedProducts.length > 0" class="mb-4">
          <label class="block text-xs font-medium text-muted mb-2">Selected Products ({{ selectedProducts.length }})</label>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="product in selectedProducts"
              :key="product.id"
              class="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-md"
            >
              <span class="text-sm text-text">{{ product.name }}</span>
              <button
                type="button"
                class="text-indigo-600 hover:text-indigo-800"
                @click="removeProduct(product.id)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <!-- Available Products List -->
        <div class="border border-border rounded-md max-h-96 overflow-y-auto">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="flex items-center gap-3 p-3 border-b border-border hover:bg-bg transition-colors cursor-pointer"
            :class="{ 'bg-indigo-50': isProductSelected(product.id) }"
            @click="toggleProduct(product.id)"
          >
            <input
              type="checkbox"
              :checked="isProductSelected(product.id)"
              class="w-4 h-4 text-indigo-600 border-border rounded focus:ring-indigo-500"
              @click.stop="toggleProduct(product.id)"
            />
            <div class="flex-1 flex items-center gap-3">
              <div class="w-16 h-16 bg-bg border border-border rounded overflow-hidden flex-shrink-0">
                <img
                  v-if="getProductImage(product)"
                  :src="getProductImage(product)"
                  :alt="product.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <svg class="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-text truncate">{{ product.name }}</div>
                <div class="text-xs text-muted">SKU: {{ product.sku }}</div>
                <div v-if="product.category" class="text-xs text-muted">{{ product.category }}</div>
                <div v-if="product.goLiveDate" class="text-xs text-muted">Go Live: {{ formatDateShort(product.goLiveDate) }}</div>
              </div>
            </div>
          </div>
          <div v-if="filteredProducts.length === 0" class="p-4 text-sm text-muted text-center">
            No products found
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
        @click="handleClose"
      >
        Cancel
      </button>
      <button
        class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        @click="handleSave"
        :disabled="!canSaveLook"
      >
        {{ isEditing ? 'Save Changes' : 'Create Look' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Look, Product } from '@/types'
import { formatDateShort } from '@/utils/dates'
import Modal from '@/components/common/Modal.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    look?: Look | null
    allProducts: Product[]
    brandId: string
    projectId?: string
  }>(),
  {
    projectId: undefined,
  }
)

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  close: []
  save: [look: Look]
}>()

const isEditing = computed(() => !!props.look)

const lookData = ref<Omit<Look, 'id' | 'createdAt' | 'updatedAt'>>({
  name: '',
  productIds: [],
  inspirationImageUrl: undefined,
  note: '',
})

const canSaveLook = computed(() => {
  const nameOk = !!lookData.value.name.trim()
  const hasImage = !!lookData.value.inspirationImageUrl?.trim()
  const hasProducts = selectedProductIds.value.length > 0
  return nameOk && (hasImage || hasProducts)
})

const productSearch = ref('')
const selectedProductIds = ref<string[]>([])

const inspirationStoragePath = computed(() => {
  if (props.projectId) {
    return `brands/${props.brandId}/projects/${props.projectId}/shotlist/inspiration`
  }
  return `brands/${props.brandId}/shotlist/inspiration`
})

const selectedProducts = computed(() => {
  return props.allProducts.filter(p => selectedProductIds.value.includes(p.id))
})

const filteredProducts = computed(() => {
  // Filter out archived products
  let products = props.allProducts.filter(p => !p.archived)
  
  if (productSearch.value.trim()) {
    const search = productSearch.value.toLowerCase()
    products = products.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.sku.toLowerCase().includes(search) ||
      p.category?.toLowerCase().includes(search)
    )
  }
  
  return products
})

watch(() => props.look, (look) => {
  if (look) {
    lookData.value = {
      name: look.name,
      productIds: [...look.productIds],
      inspirationImageUrl: look.inspirationImageUrl,
      note: look.note ?? '',
    }
    selectedProductIds.value = [...look.productIds]
  } else {
    lookData.value = {
      name: '',
      productIds: [],
      inspirationImageUrl: undefined,
      note: '',
    }
    selectedProductIds.value = []
  }
}, { immediate: true })

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    productSearch.value = ''
  }
})

function handleClose() {
  emit('update:isOpen', false)
  emit('close')
}

function handleSave() {
  if (!canSaveLook.value) return

  const trimmedNote = lookData.value.note?.trim()
  const look: Look = {
    id: props.look?.id || `look-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: lookData.value.name.trim(),
    productIds: [...selectedProductIds.value],
    inspirationImageUrl: lookData.value.inspirationImageUrl,
    ...(trimmedNote ? { note: trimmedNote } : {}),
    createdAt: props.look?.createdAt || Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  emit('save', look)
}

function toggleProduct(productId: string) {
  const index = selectedProductIds.value.indexOf(productId)
  if (index >= 0) {
    selectedProductIds.value.splice(index, 1)
  } else {
    selectedProductIds.value.push(productId)
  }
}

function removeProduct(productId: string) {
  const index = selectedProductIds.value.indexOf(productId)
  if (index >= 0) {
    selectedProductIds.value.splice(index, 1)
  }
}

function isProductSelected(productId: string): boolean {
  return selectedProductIds.value.includes(productId)
}

function handleProductSearch() {
  // Search is handled by computed property
}

function handleImageUpload(url: string) {
  lookData.value.inspirationImageUrl = url
}

function getProductImage(product: Product): string | undefined {
  if (product.colors && product.colors.length > 0) {
    const colorWithImage = product.colors.find(c => c.imageUrl)
    if (colorWithImage?.imageUrl) {
      return colorWithImage.imageUrl
    }
  }
  return product.imageUrl
}
</script>
