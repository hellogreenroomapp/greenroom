<template>
  <div class="bg-card border border-border rounded-lg p-6">
    <!-- Header with Add Look Button -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-text">Shot List</h3>
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <!-- PDF export (matches current List / Compact view) -->
        <div v-if="looks.length > 0" class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-2 border border-border rounded-md text-xs sm:text-sm font-medium text-text hover:bg-bg transition-colors whitespace-nowrap disabled:opacity-50"
            :disabled="exportingPdf"
            title="Export PDF with photos (requires Storage CORS on your bucket)"
            @click="handleExportPdf"
          >
            {{ exportingPdf ? 'Exporting…' : 'Export PDF' }}
          </button>
        </div>
        <!-- View Toggle -->
        <div class="flex items-center gap-2 bg-bg border border-border rounded-md p-1">
          <button
            class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
            :class="viewMode === 'compact' 
              ? 'bg-indigo-600 text-white' 
              : 'text-muted hover:text-text'"
            @click="viewMode = 'compact'"
            title="Compact square thumbnails"
          >
            Compact
          </button>
          <button
            class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
            :class="viewMode === 'list' 
              ? 'bg-indigo-600 text-white' 
              : 'text-muted hover:text-text'"
            @click="viewMode = 'list'"
            title="List view with product details"
          >
            List
          </button>
        </div>
        <button
          class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          @click="handleCreateLook"
        >
          + Create Look
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="looks.length === 0" class="py-16 text-center border-2 border-dashed border-border rounded-lg">
      <svg class="mx-auto h-12 w-12 text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-sm text-muted mb-4">No looks yet. Create your first look to get started!</p>
      <button
        class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        @click="handleCreateLook"
      >
        Create Look
      </button>
    </div>

    <!-- Looks List -->
    <div v-else class="space-y-4">
      <div
        v-for="look in looks"
        :key="look.id"
        class="bg-white border border-border rounded-lg overflow-hidden"
      >
        <!-- Look Header -->
        <div class="px-4 py-3 border-b border-border bg-bg flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <h4
              class="font-bold text-text mb-0.5"
              :class="viewMode === 'compact' ? 'text-sm' : 'text-lg'"
            >
              {{ look.name }}
            </h4>
            <div class="text-xs text-muted">
              {{ lookProducts(look).length }} {{ lookProducts(look).length === 1 ? 'product' : 'products' }}
            </div>
            <p
              v-if="look.note?.trim()"
              class="text-text whitespace-pre-wrap break-words"
              :class="viewMode === 'compact' ? 'text-xs mt-1.5' : 'text-sm mt-2'"
            >
              {{ look.note.trim() }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-2.5 py-1 text-xs text-muted hover:text-text border border-border rounded-md hover:bg-white transition-colors"
              @click="handleEditLook(look)"
            >
              Edit
            </button>
            <button
              class="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              @click="handleDeleteLook(look.id)"
            >
              Delete
            </button>
          </div>
        </div>

        <!-- List view (row layout with product details) -->
        <div v-if="viewMode === 'list'" class="overflow-x-auto">
          <div class="flex items-stretch min-w-max">
            <!-- Inspiration Column -->
            <div class="flex-shrink-0 w-48 border-r border-border bg-bg">
              <div class="p-3 h-full flex flex-col">
                <label class="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">INSPIRATION</label>
                <div 
                  v-if="look.inspirationImageUrl"
                  class="flex-1 bg-white border border-border rounded overflow-hidden min-h-[180px] cursor-pointer hover:opacity-90 transition-opacity"
                  @click="openImageModal(look.inspirationImageUrl, look.name)"
                >
                  <img
                    :src="look.inspirationImageUrl"
                    :alt="`${look.name} inspiration`"
                    class="w-full h-full object-contain"
                  />
                </div>
                <div v-else class="flex-1 flex items-center justify-center bg-bg min-h-[180px]">
                  <svg class="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Products Row -->
            <div v-if="lookProducts(look).length > 0" class="flex items-stretch flex-1">
              <div
                v-for="product in lookProducts(look)"
                :key="product.id"
                class="flex-shrink-0 w-48 border-r border-border last:border-r-0 bg-white"
              >
                <div class="p-3 h-full flex flex-col">
                  <!-- Product Image -->
                  <div class="w-full h-44 bg-bg border border-border rounded mb-2 overflow-hidden flex-shrink-0">
                    <img
                      v-if="getProductImage(product)"
                      :src="getProductImage(product)"
                      :alt="product.name"
                      class="w-full h-full object-contain"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center">
                      <svg class="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Product Details -->
                  <div class="flex-1 space-y-1">
                    <h5 class="text-xs font-semibold text-text leading-tight line-clamp-2">{{ product.name }}</h5>
                    <div class="space-y-0.5 text-[10px] text-muted">
                      <div><span class="font-semibold text-text">Style #:</span> {{ product.sku }}</div>
                      <div v-if="product.category" class="truncate"><span class="font-semibold text-text">Cat:</span> {{ product.category }}</div>
                      <div v-if="product.colors && product.colors.length > 0" class="truncate">
                        <span class="font-semibold text-text">Color:</span> {{ product.colors.map(c => c.name).join(', ') }}
                      </div>
                      <div v-if="product.goLiveDate" class="truncate">
                        <span class="font-semibold text-text">Go Live:</span> {{ formatDateShort(product.goLiveDate) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="flex-1 p-6 flex items-center justify-center border-r border-border">
              <div class="text-center">
                <p class="text-xs text-muted mb-2">No products added</p>
                <button
                  class="px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
                  @click="handleEditLook(look)"
                >
                  Add Products
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Compact view: small square image grid (~half the list column width) -->
        <div v-else class="overflow-x-auto">
          <div class="flex items-stretch min-w-max">
            <div class="flex-shrink-0 w-24 border-r border-border bg-bg">
              <div class="p-2 h-full flex flex-col">
                <label class="text-[9px] font-semibold text-muted uppercase tracking-wide mb-1.5 block leading-tight">Inspiration</label>
                <div
                  v-if="look.inspirationImageUrl"
                  class="aspect-square w-full max-w-[5.5rem] rounded border border-border overflow-hidden bg-white cursor-pointer hover:opacity-90"
                  @click="openImageModal(look.inspirationImageUrl, look.name)"
                >
                  <img
                    :src="look.inspirationImageUrl"
                    :alt="`${look.name} inspiration`"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div v-else class="aspect-square w-full max-w-[5.5rem] rounded border border-border bg-bg flex items-center justify-center">
                  <svg class="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div v-if="lookProducts(look).length > 0" class="flex items-stretch flex-1">
              <div
                v-for="product in lookProducts(look)"
                :key="product.id"
                class="flex-shrink-0 w-[5.5rem] border-r border-border last:border-r-0 bg-white p-2 flex flex-col gap-1.5"
              >
                <div class="aspect-square w-full rounded border border-border overflow-hidden bg-bg flex-shrink-0">
                  <img
                    v-if="getProductImage(product)"
                    :src="getProductImage(product)"
                    :alt="product.name"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <svg class="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p class="text-[10px] font-medium text-text leading-tight line-clamp-3 break-words">
                  {{ product.name }}
                </p>
              </div>
            </div>
            <div v-else class="flex-1 min-w-[8rem] px-3 py-4 flex items-center justify-center border-r border-border">
              <button
                type="button"
                class="text-[10px] text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-50"
                @click="handleEditLook(look)"
              >
                Add products
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Look Modal -->
    <LookModal
      v-if="showLookModal"
      :is-open="showLookModal"
      :look="selectedLook"
      :all-products="allProducts"
      :brand-id="brandId"
      :project-id="projectId"
      @update:is-open="showLookModal = $event"
      @close="handleCloseModal"
      @save="handleSaveLook"
    />

    <!-- Image Enlarge Modal -->
    <Modal :is-open="showImageModal" :title="imageModalTitle" size="3xl" @close="closeImageModal">
      <div class="flex items-center justify-center p-4">
        <img
          v-if="enlargedImageUrl"
          :src="enlargedImageUrl"
          :alt="imageModalTitle"
          class="max-w-full max-h-[80vh] object-contain"
        />
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Look, Product } from '@/types'
import { formatDateShort } from '@/utils/dates'
import { generateShotListPDF } from '@/utils/pdf'
import { useToast } from '@/composables/useToast'
import LookModal from './LookModal.vue'
import Modal from '@/components/common/Modal.vue'

const props = withDefaults(
  defineProps<{
    looks: Look[]
    allProducts: Product[]
    brandId: string
    projectId?: string
    /** Used for PDF title and filename */
    collectionName?: string
  }>(),
  {
    collectionName: '',
    projectId: undefined,
  }
)

const emit = defineEmits<{
  'update-looks': [looks: Look[]]
}>()

const toast = useToast()
const exportingPdf = ref(false)

/** List = detailed columns (previous “compact” density). Compact = small square thumbnails. */
const viewMode = ref<'list' | 'compact'>('list')

async function handleExportPdf() {
  if (props.looks.length === 0) return
  exportingPdf.value = true
  try {
    await generateShotListPDF({
      collectionName: props.collectionName || 'Collection',
      looks: props.looks,
      allProducts: props.allProducts,
      mode: viewMode.value,
    })
    toast.success('PDF downloaded')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Could not create PDF'
    toast.error(msg)
  } finally {
    exportingPdf.value = false
  }
}

// Image enlarge modal state
const showImageModal = ref(false)
const enlargedImageUrl = ref<string>('')
const imageModalTitle = ref<string>('')

function openImageModal(imageUrl: string, lookName: string) {
  enlargedImageUrl.value = imageUrl
  imageModalTitle.value = `${lookName} - Inspiration`
  showImageModal.value = true
}

function closeImageModal() {
  showImageModal.value = false
  enlargedImageUrl.value = ''
  imageModalTitle.value = ''
}

const showLookModal = ref(false)
const showCreateModal = ref(false)
const selectedLook = ref<Look | null>(null)

function handleCreateLook() {
  selectedLook.value = null
  showCreateModal.value = true
  showLookModal.value = true
}

function handleEditLook(look: Look) {
  selectedLook.value = { ...look }
  showCreateModal.value = false
  showLookModal.value = true
}

function handleCloseModal() {
  showLookModal.value = false
  showCreateModal.value = false
  selectedLook.value = null
}

function handleSaveLook(look: Look) {
  const updatedLooks = [...props.looks]
  const existingIndex = updatedLooks.findIndex(l => l.id === look.id)
  
  if (existingIndex >= 0) {
    updatedLooks[existingIndex] = look
  } else {
    updatedLooks.push(look)
  }
  
  emit('update-looks', updatedLooks)
  handleCloseModal()
}

function handleDeleteLook(lookId: string) {
  if (confirm('Are you sure you want to delete this look?')) {
    const updatedLooks = props.looks.filter(l => l.id !== lookId)
    emit('update-looks', updatedLooks)
  }
}

function lookProducts(look: Look): Product[] {
  // Filter products that exist and are not archived
  return props.allProducts.filter(p => 
    look.productIds.includes(p.id) && !p.archived
  )
}

function getProductImage(product: Product): string | undefined {
  // Prioritize color-specific images
  if (product.colors && product.colors.length > 0) {
    const colorWithImage = product.colors.find(c => c.imageUrl)
    if (colorWithImage?.imageUrl) {
      return colorWithImage.imageUrl
    }
  }
  // Fall back to main product image
  return product.imageUrl
}
</script>
