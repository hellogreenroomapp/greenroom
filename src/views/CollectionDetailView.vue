<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-12">
      <LoadingSpinner />
    </div>

    <div v-else-if="!project && !isUnassigned" class="py-12">
      <EmptyState
        title="Collection not found"
        description="The collection you're looking for doesn't exist or you don't have access to it."
      >
        <template #action>
          <router-link
            to="/projects"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Collections
          </router-link>
        </template>
      </EmptyState>
    </div>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 sm:gap-3 mb-2">
            <button
              class="text-muted hover:text-text transition-colors flex-shrink-0"
              @click="$router.push('/projects')"
              aria-label="Back to collections"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <template v-if="isUnassigned">
              <h2 class="text-xl sm:text-2xl font-semibold text-text truncate">No collection</h2>
              <span class="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800 flex-shrink-0">
                Unassigned
              </span>
            </template>
            <template v-else-if="project">
              <h2 class="text-xl sm:text-2xl font-semibold text-text truncate">{{ project.name }}</h2>
              <span
                class="px-2 py-1 text-xs font-medium rounded capitalize flex-shrink-0"
                :class="
                  project.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                "
              >
                {{ project.status }}
              </span>
            </template>
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted">
            <template v-if="isUnassigned">
              <span>Products not assigned to a collection — open a product to add one</span>
              <span class="hidden sm:inline">•</span>
              <span>{{ products.length }} {{ products.length === 1 ? 'product' : 'products' }}</span>
            </template>
            <template v-else-if="project">
              <span class="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded capitalize">
                {{ seasonLabel }}
              </span>
              <span>{{ project.year }}</span>
              <span class="hidden sm:inline">•</span>
              <span>{{ products.length }} {{ products.length === 1 ? 'product' : 'products' }}</span>
            </template>
          </div>
        </div>
        <div
          v-if="!isUnassigned && project"
          class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-shrink-0"
        >
          <button
            class="w-full sm:w-auto px-4 py-2 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
            @click="showEditModal = true"
          >
            Edit Collection
          </button>
          <button
            class="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            @click="$router.push({ name: 'pipeline', query: { project: project.id } })"
          >
            View in Pipeline
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="space-y-0">
        <div class="flex items-center justify-between border-b border-border bg-card rounded-t-lg px-4 pt-4">
          <div class="flex items-center space-x-1 overflow-x-auto pb-0.5 -mb-0.5">
            <button
              v-if="!isUnassigned"
              class="px-4 py-2 text-sm font-medium rounded-t-md transition-colors relative whitespace-nowrap"
              :class="activeTab === 'overview'
                ? 'text-text'
                : 'text-muted hover:text-text'"
              @click="activeTab = 'overview'"
            >
              Overview
              <span
                v-if="activeTab === 'overview'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              ></span>
            </button>
            <button
              class="px-4 py-2 text-sm font-medium rounded-t-md transition-colors relative whitespace-nowrap"
              :class="activeTab === 'products' 
                ? 'text-text' 
                : 'text-muted hover:text-text'"
              @click="activeTab = 'products'"
            >
              Product List
              <span
                v-if="activeTab === 'products'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              ></span>
            </button>
            <button
              v-if="!isUnassigned"
              class="px-4 py-2 text-sm font-medium rounded-t-md transition-colors relative whitespace-nowrap"
              :class="activeTab === 'moodboard' 
                ? 'text-text' 
                : 'text-muted hover:text-text'"
              @click="activeTab = 'moodboard'"
            >
              Moodboard
              <span
                v-if="activeTab === 'moodboard'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              ></span>
            </button>
            <button
              v-if="!isUnassigned"
              class="px-4 py-2 text-sm font-medium rounded-t-md transition-colors relative inline-flex items-center gap-2 whitespace-nowrap"
              :class="activeTab === 'shotlist' 
                ? 'text-text' 
                : 'text-muted hover:text-text'"
              @click="activeTab = 'shotlist'"
            >
              <span>Shot List</span>
              <span
                v-if="shotListLookCount > 0"
                class="min-w-[1.25rem] px-1.5 py-0.5 text-xs font-semibold rounded-full bg-bg border border-border text-muted tabular-nums"
              >
                {{ shotListLookCount }}
              </span>
              <span
                v-if="activeTab === 'shotlist'"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              ></span>
            </button>
          </div>
          <button
            v-if="activeTab === 'products'"
            class="btn-subtle mb-2"
            @click="showAddProductModal = true"
          >
            Add Product to Collection
          </button>
        </div>

        <!-- Overview dashboard -->
        <div v-if="activeTab === 'overview' && project">
          <CollectionOverviewPanel
            :top-products="dashboardTopProducts"
            :mood-items="moodboardPreviewPick"
            :moodboard-total="moodboardItems.length"
            :shot-slots="shotPreviewSlots"
            :all-products="allBrandProducts"
            :summary="summaryDraft"
            :summary-saving="summarySaving"
            :summary-saved-hint="summarySavedHint"
            :metric-cards="overviewMetricCards"
            @update:summary="onSummaryDraftInput"
            @save-summary="flushDashboardSummary"
            @go-tab="goToCollectionTab"
            @product-click="handleProductClick"
            @shuffle-moodboard="shuffleMoodboardPreview"
          />
        </div>

        <!-- Products List Tab -->
        <div v-if="activeTab === 'products'">
          <div class="bg-card border border-border rounded-b-lg overflow-hidden">
            <div v-if="products.length === 0" class="p-12">
              <EmptyState
                title="No products in this collection"
                description="Add products to this collection to see them here."
              />
            </div>

            <div v-else>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-bg border-b border-border">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Product</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">SKU</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Stage</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Priority</th>
                <th 
                  class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-text transition-colors"
                  @click="toggleDateSort"
                >
                  <div class="flex items-center gap-1">
                    <span>Go Live Date</span>
                    <div class="flex flex-col">
                      <svg 
                        class="h-3 w-3" 
                        :class="sortByDate === 'asc' ? 'text-indigo-600' : 'text-muted opacity-30'"
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                      </svg>
                      <svg 
                        class="h-3 w-3 -mt-1" 
                        :class="sortByDate === 'desc' ? 'text-indigo-600' : 'text-muted opacity-30'"
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="product in sortedProducts"
                :key="product.id"
                class="hover:bg-bg transition-colors cursor-pointer"
                @click="handleProductClick(product.id)"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="getProductDisplayImageUrl(product)"
                      :src="getProductDisplayImageUrl(product)"
                      :alt="product.name"
                      class="h-12 w-12 object-cover rounded border border-border flex-shrink-0"
                    />
                    <div v-else class="h-12 w-12 bg-bg border border-border rounded flex items-center justify-center flex-shrink-0">
                      <svg class="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <div class="text-sm font-medium text-text">{{ product.name }}</div>
                      <div
                        v-if="formatProductColorsLabel(product)"
                        class="text-xs text-muted truncate"
                      >
                        {{ formatProductColorsLabel(product) }}
                      </div>
                      <div class="text-xs text-muted">{{ product.category }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-text">{{ product.sku }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2 py-1 text-xs font-medium rounded"
                    :class="getStageColorClass(product.stage)"
                  >
                    {{ STAGE_LABELS[product.stage] }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2 py-1 text-xs font-medium rounded capitalize"
                    :class="getPriorityColorClass(product.priority)"
                  >
                    {{ product.priority }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-text">
                    {{ productHasGoLiveDate(product) ? formatDate(product.goLiveDate!) : '—' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2 py-1 text-xs font-medium rounded"
                    :class="getStatusColorClass(product.status)"
                  >
                    {{ product.status === 'on-time' ? 'On Time' : product.status === 'delayed' ? 'Delayed' : 'Complete' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
            </div>
          </div>
        </div>

        <!-- Moodboard Tab -->
        <div v-if="activeTab === 'moodboard'" class="bg-card border border-border rounded-b-lg">
          <MoodboardView
            v-if="project"
            :items="moodboardItems"
            :project-id="project.id"
            :brand-id="project.brandId"
            @update-items="handleMoodboardUpdate"
          />
        </div>

        <!-- Shot List Tab -->
        <div v-if="activeTab === 'shotlist'" class="bg-card border border-border rounded-b-lg">
          <ShotListView
            v-if="project"
            :looks="shotListItems"
            :all-products="allBrandProducts"
            :brand-id="project.brandId"
            :project-id="project.id"
            :collection-name="project.name"
            @update-looks="handleShotListUpdate"
          />
        </div>
      </div>
    </div>

    <!-- Add Product Modal -->
    <Modal :is-open="showAddProductModal" title="Add Product" size="3xl" @close="showAddProductModal = false">
      <AddProductToCollection
        v-if="project"
        :project-id="project.id"
        :brand-id="project.brandId"
        @close="showAddProductModal = false"
        @product-added="handleProductAdded"
      />
    </Modal>

    <!-- Edit Modal -->
    <Modal :is-open="showEditModal" title="Edit Collection" size="lg" @close="showEditModal = false">
      <ProjectForm
        v-if="project"
        ref="projectFormRef"
        :project="project"
        :brand-id="project.brandId"
        @save="handleUpdateProject"
        @cancel="showEditModal = false"
      />
      <template #footer>
        <button
          class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
          @click="showEditModal = false"
        >
          Cancel
        </button>
        <button
          class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          @click="projectFormRef?.submit()"
        >
          Save Changes
        </button>
      </template>
    </Modal>

    <!-- Product Detail Modal -->
    <ProductDetail
      :product="selectedProduct"
      :is-open="showProductDetail"
      :all-products="products"
      @close="showProductDetail = false"
      @edit="handleEditProduct"
      @delete="handleDeleteProduct"
      @stage-changed="handleStageChanged"
      @open-product="handleProductClick"
    />

    <!-- Edit Product Modal -->
    <Modal :is-open="showEditProduct" title="Edit Product" size="3xl" @close="showEditProduct = false">
      <ProductForm
        v-if="selectedProduct && project"
        ref="editProductFormRef"
        :product="selectedProduct"
        :brand-id="project.brandId"
        @save="handleUpdateProduct"
        @cancel="showEditProduct = false"
        @delete="handleDeleteProduct"
      />
      <template #footer>
        <button
          v-if="selectedProduct"
          class="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          @click="editProductFormRef?.handleDelete()"
        >
          Delete
        </button>
        <div class="flex gap-2 ml-auto">
          <button
            class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
            @click="showEditProduct = false"
          >
            Cancel
          </button>
          <button
            class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            @click="editProductFormRef?.submit()"
          >
            Save Changes
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useBrandStore } from '@/stores/brand'
import { useAuthStore } from '@/stores/auth'
import { useProject } from '@/composables/useProject'
import { useProducts } from '@/composables/useProducts'
import { useToast } from '@/composables/useToast'
import { getDoc, getProductsByBrand } from '@/firebase/firestore'
import type { Project, Product, MoodboardItem, Look } from '@/types'
import { STAGE_LABELS } from '@/types'
import ProjectForm from '@/components/project/ProjectForm.vue'
import ProductForm from '@/components/product/ProductForm.vue'
import ProductDetail from '@/components/product/ProductDetail.vue'
import AddProductToCollection from '@/components/product/AddProductToCollection.vue'
import Modal from '@/components/common/Modal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import MoodboardView from '@/components/moodboard/MoodboardView.vue'
import ShotListView from '@/components/shotlist/ShotListView.vue'
import CollectionOverviewPanel from '@/components/project/CollectionOverviewPanel.vue'
import { UNASSIGNED_COLLECTION_ID } from '@/constants/collections'
import { formatDate, productHasGoLiveDate } from '@/utils/dates'
import { formatProductColorsLabel, getProductDisplayImageUrl } from '@/utils/productDisplay'

const route = useRoute()
const brandStore = useBrandStore()
const authStore = useAuthStore()
const { updateProject: updateProjectComposable } = useProject()
const { products, fetchProducts, deleteProduct, updateProduct } = useProducts()
const toast = useToast()

const collectionRouteId = computed(() => route.params.id as string)
const isUnassigned = computed(() => collectionRouteId.value === UNASSIGNED_COLLECTION_ID)
const project = ref<Project | null>(null)
const loading = ref(true)
const showEditModal = ref(false)
const showAddProductModal = ref(false)
const showProductDetail = ref(false)
const showEditProduct = ref(false)
const selectedProduct = ref<Product | null>(null)
const projectFormRef = ref<InstanceType<typeof ProjectForm> | null>(null)
const editProductFormRef = ref<InstanceType<typeof ProductForm> | null>(null)
const sortByDate = ref<'asc' | 'desc' | null>(null)
const activeTab = ref<'overview' | 'products' | 'moodboard' | 'shotlist'>('overview')

const moodboardItems = computed(() => {
  return project.value?.moodboard || []
})

const shotListItems = computed(() => {
  return project.value?.shotList || []
})

const shotListLookCount = computed(() => shotListItems.value.length)

const moodboardPreviewPick = ref<MoodboardItem[]>([])

function shuffleMoodboardPreview() {
  const items = project.value?.moodboard ?? []
  if (items.length === 0) {
    moodboardPreviewPick.value = []
    return
  }
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = shuffled[i]!
    const b = shuffled[j]!
    shuffled[i] = b
    shuffled[j] = a
  }
  moodboardPreviewPick.value = shuffled.slice(0, 3)
}

watch(
  () =>
    [
      project.value?.id,
      (project.value?.moodboard ?? [])
        .map((m) => m.id)
        .join(','),
    ] as const,
  () => shuffleMoodboardPreview(),
  { immediate: true }
)

const dashboardTopProducts = computed(() => {
  const order: Record<Product['priority'], number> = { high: 0, medium: 1, low: 2 }
  const list = [...products.value]
  list.sort((a, b) => {
    const pa = order[a.priority] ?? 9
    const pb = order[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    const dateA = productHasGoLiveDate(a) ? a.goLiveDate!.toMillis() : Number.MAX_SAFE_INTEGER
    const dateB = productHasGoLiveDate(b) ? b.goLiveDate!.toMillis() : Number.MAX_SAFE_INTEGER
    return dateA - dateB
  })
  return list.slice(0, 5)
})

const shotPreviewSlots = computed<(Look | null)[]>(() => {
  const looks = [...shotListItems.value].slice(0, 4)
  const slots: (Look | null)[] = [...looks]
  while (slots.length < 4) slots.push(null)
  return slots
})

const productsNotLiveCount = computed(
  () => products.value.filter((p) => p.stage !== 'live').length
)

const overviewMetricCards = computed(() => {
  const mb = moodboardItems.value.length
  const looks = shotListLookCount.value
  const total = products.value.length
  return [
    {
      key: 'products',
      label: 'Products',
      value: total,
      hint: total === 0 ? 'Add from Product list' : `${productsNotLiveCount.value} not live yet`,
    },
    { key: 'moodboard', label: 'Moodboard', value: mb, hint: mb === 1 ? '1 image' : `${mb} images` },
    { key: 'looks', label: 'Shot looks', value: looks, hint: looks === 1 ? '1 look' : `${looks} looks` },
    {
      key: 'live',
      label: 'Live',
      value: products.value.filter((p) => p.stage === 'live').length,
      hint: 'On site',
    },
  ]
})

const summaryDraft = ref('')
const summarySaving = ref(false)
const summarySavedHint = ref(false)
let summaryDebounce: ReturnType<typeof setTimeout> | null = null
let summarySavedHintTimer: ReturnType<typeof setTimeout> | null = null

function syncSummaryDraftFromProject() {
  summaryDraft.value = project.value?.dashboardSummary ?? ''
}

watch(
  () => project.value?.id,
  () => {
    syncSummaryDraftFromProject()
  },
  { immediate: true }
)

watch(
  () => project.value?.dashboardSummary,
  (v) => {
    const el = document.activeElement
    if (el instanceof HTMLTextAreaElement && el.id === 'collection-dashboard-summary') return
    summaryDraft.value = v ?? ''
  }
)

function onSummaryDraftInput(value: string) {
  summaryDraft.value = value
  if (summaryDebounce) clearTimeout(summaryDebounce)
  summaryDebounce = setTimeout(() => {
    summaryDebounce = null
    void persistDashboardSummary()
  }, 1200)
}

async function persistDashboardSummary() {
  if (!project.value) return
  const next = summaryDraft.value
  const prev = project.value.dashboardSummary ?? ''
  if (next === prev) return
  summarySaving.value = true
  try {
    await updateProjectComposable(project.value.id, { dashboardSummary: next })
    const updated = await getDoc<Project>('projects', project.value.id)
    if (updated) project.value = updated
    summarySavedHint.value = true
    if (summarySavedHintTimer) clearTimeout(summarySavedHintTimer)
    summarySavedHintTimer = setTimeout(() => {
      summarySavedHint.value = false
    }, 2000)
  } catch (error: any) {
    toast.error(error.message || 'Failed to save summary')
  } finally {
    summarySaving.value = false
  }
}

function flushDashboardSummary() {
  if (summaryDebounce) {
    clearTimeout(summaryDebounce)
    summaryDebounce = null
  }
  void persistDashboardSummary()
}

function goToCollectionTab(tab: 'products' | 'moodboard' | 'shotlist') {
  activeTab.value = tab
}

const allBrandProducts = ref<Product[]>([])

// Fetch all products for the brand (for shot list selection)
watch(() => project.value?.brandId, async (brandId) => {
  if (brandId) {
    try {
      allBrandProducts.value = await getProductsByBrand(brandId)
    } catch (error) {
      console.error('Error fetching brand products:', error)
      allBrandProducts.value = []
    }
  }
}, { immediate: true })

const seasonLabel = computed(() => {
  if (!project.value) return ''
  const labels: Record<Project['season'], string> = {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
    evergreen: 'Evergreen',
  }
  return labels[project.value.season] || project.value.season
})

const sortedProducts = computed(() => {
  const productList = [...products.value]

  if (sortByDate.value === 'asc') {
    return productList.sort((a, b) => {
      const dateA = productHasGoLiveDate(a) ? a.goLiveDate!.toMillis() : Number.MAX_SAFE_INTEGER
      const dateB = productHasGoLiveDate(b) ? b.goLiveDate!.toMillis() : Number.MAX_SAFE_INTEGER
      return dateA - dateB
    })
  }
  if (sortByDate.value === 'desc') {
    return productList.sort((a, b) => {
      const dateA = productHasGoLiveDate(a) ? a.goLiveDate!.toMillis() : Number.MIN_SAFE_INTEGER
      const dateB = productHasGoLiveDate(b) ? b.goLiveDate!.toMillis() : Number.MIN_SAFE_INTEGER
      return dateB - dateA
    })
  }

  return productList
})

function toggleDateSort() {
  if (sortByDate.value === null) {
    sortByDate.value = 'asc'
  } else if (sortByDate.value === 'asc') {
    sortByDate.value = 'desc'
  } else {
    sortByDate.value = null
  }
}

/** Wait for auth and brand workspace so `brandId` is not briefly null on hard refresh (which falsely failed the access check). */
async function ensureBrandContext(): Promise<void> {
  const deadline = Date.now() + 15_000
  while (authStore.loading && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 30))
  }
  if (!authStore.isAuthenticated || !authStore.userId) return

  if (brandStore.brands.length === 0 && !brandStore.loading) {
    try {
      await brandStore.fetchBrands(authStore.userId)
    } catch (e) {
      console.error('Failed to load brands for collection view:', e)
    }
  }
  while (brandStore.loading && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 30))
  }
}

function refreshBrandProductsIfVisible() {
  const bid = project.value?.brandId
  if (!bid || document.visibilityState !== 'visible') return
  getProductsByBrand(bid)
    .then((list) => {
      allBrandProducts.value = list
    })
    .catch((err) => console.error('Shot list product refresh:', err))
}

async function loadCollection() {
  loading.value = true
  try {
    await ensureBrandContext()

    const myBrandId = brandStore.brandId
    if (!myBrandId) {
      project.value = null
      return
    }

    if (isUnassigned.value) {
      project.value = null
      activeTab.value = 'products'
      await fetchProducts(myBrandId, { unassignedOnly: true })
      return
    }

    const collection = await getDoc<Project>('projects', collectionRouteId.value)
    if (!collection) {
      project.value = null
      return
    }

    if (collection.brandId !== myBrandId) {
      project.value = null
      toast.error('You do not have access to this collection')
      return
    }

    project.value = collection
    await fetchProducts(collection.brandId, { projectId: collection.id })
  } catch (error: any) {
    console.error('Failed to load collection:', error)
    toast.error(error.message || 'Failed to load collection')
    project.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, async (newId) => {
  if (newId) {
    await loadCollection()
  }
}, { immediate: true })

onMounted(async () => {
  document.addEventListener('visibilitychange', refreshBrandProductsIfVisible)
  await loadCollection()
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', refreshBrandProductsIfVisible)
  if (summaryDebounce) clearTimeout(summaryDebounce)
  if (summarySavedHintTimer) clearTimeout(summarySavedHintTimer)
})

function getStageColorClass(stage: Product['stage']): string {
  const classes: Record<Product['stage'], string> = {
    samples: 'bg-purple-100 text-purple-800',
    warehouse: 'bg-gray-100 text-gray-800',
    photo_queue: 'bg-yellow-100 text-yellow-800',
    in_shoot: 'bg-orange-100 text-orange-800',
    editing: 'bg-blue-100 text-blue-800',
    staged: 'bg-purple-100 text-purple-800',
    live: 'bg-green-100 text-green-800',
  }
  return classes[stage] || 'bg-gray-100 text-gray-800'
}

function getPriorityColorClass(priority: Product['priority']): string {
  const classes: Record<Product['priority'], string> = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
  }
  return classes[priority] || ''
}

function getStatusColorClass(status: Product['status']): string {
  const classes: Record<Product['status'], string> = {
    'on-time': 'bg-emerald-100 text-emerald-800',
    delayed: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-green-100 text-green-800',
  }
  return classes[status] || ''
}

function handleProductAdded() {
  if (project.value) {
    fetchProducts(project.value.brandId)
  }
  showAddProductModal.value = false
}

function handleProductClick(productId: string) {
  const product = products.value.find((p: Product) => p.id === productId)
  if (product) {
    selectedProduct.value = product
    showProductDetail.value = true
  }
}

async function handleUpdateProject(projectData: Omit<Project, 'id' | 'createdAt'>) {
  if (!project.value) return
  try {
    await updateProjectComposable(project.value.id, projectData)
    // Reload the project to get updated data
    const updatedProject = await getDoc<Project>('projects', project.value.id)
    if (updatedProject) {
      project.value = updatedProject
    }
    showEditModal.value = false
    toast.success('Collection updated successfully')
  } catch (error: any) {
    toast.error(error.message || 'Failed to update collection')
  }
}

function handleEditProduct() {
  showProductDetail.value = false
  showEditProduct.value = true
}

async function handleUpdateProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>) {
  try {
    if (!selectedProduct.value || !project.value) {
      toast.error('Product not selected')
      return
    }
    
    await updateProduct(selectedProduct.value.id, productData)
    await loadCollection()
    
    showEditProduct.value = false
    toast.success('Product updated successfully')
  } catch (error: any) {
    console.error('Failed to update product:', error)
    toast.error(error.message || 'Failed to update product')
  }
}

async function handleDeleteProduct() {
  if (!selectedProduct.value) return
  try {
    await deleteProduct(selectedProduct.value.id)
    await loadCollection()
    showProductDetail.value = false
    selectedProduct.value = null
    toast.success('Product deleted successfully')
  } catch (error: any) {
    toast.error(error.message || 'Failed to delete product')
  }
}

async function handleStageChanged() {
  await loadCollection()
  showProductDetail.value = false
}

async function handleMoodboardUpdate(items: MoodboardItem[]) {
  if (!project.value) return
  try {
    await updateProjectComposable(project.value.id, { moodboard: items })
    // Reload the project to get updated data
    const updatedProject = await getDoc<Project>('projects', project.value.id)
    if (updatedProject) {
      project.value = updatedProject
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to update moodboard')
  }
}

async function handleShotListUpdate(looks: Look[]) {
  if (!project.value) return
  try {
    await updateProjectComposable(project.value.id, { shotList: looks })
    // Reload the project to get updated data
    const updatedProject = await getDoc<Project>('projects', project.value.id)
    if (updatedProject) {
      project.value = updatedProject
    }
    toast.success('Shot list updated')
  } catch (error: any) {
    toast.error(error.message || 'Failed to update shot list')
  }
}
</script>
