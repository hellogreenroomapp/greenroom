<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h2 class="text-xl sm:text-2xl font-semibold text-text">Calendar</h2>
    </div>

    <!-- Stage Color Reference Bar with Filter -->
    <div class="bg-card border border-border rounded-lg px-4 py-2">
      <div class="flex items-center gap-4 sm:gap-6 flex-wrap">
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap flex-1">
          <span class="text-xs font-medium text-muted">Stages:</span>
          <div
            v-for="stage in PIPELINE_STAGES"
            :key="stage"
            class="flex items-center gap-1.5"
          >
            <div
              class="w-3 h-3 rounded-sm flex-shrink-0"
              :style="{ backgroundColor: getStageColor(stage) }"
            ></div>
            <span class="text-xs text-text">{{ STAGE_LABELS[stage] }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-muted whitespace-nowrap">Filter by Collection:</label>
          <select
            v-model="filterProjectId"
            class="px-3 py-1.5 bg-bg border border-border rounded-md text-text text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Collections</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="bg-card border border-border rounded-lg p-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div class="flex items-center justify-between sm:justify-start space-x-4">
          <button
            class="p-2 rounded-md hover:bg-bg transition-colors"
            @click="previousMonth"
          >
            <svg class="w-5 h-5 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 class="text-base sm:text-lg font-semibold text-text min-w-[160px] sm:min-w-[200px] text-center">
            {{ monthYearDisplay }}
          </h3>
          <button
            class="p-2 rounded-md hover:bg-bg transition-colors"
            @click="nextMonth"
          >
            <svg class="w-5 h-5 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 bg-bg border border-border rounded-md p-1">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
              :class="viewMode === 'calendar' ? 'bg-indigo-600 text-white' : 'text-muted hover:text-text'"
              @click="viewMode = 'calendar'"
            >
              Calendar
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
              :class="viewMode === 'week' ? 'bg-indigo-600 text-white' : 'text-muted hover:text-text'"
              @click="viewMode = 'week'"
            >
              Week View
            </button>
          </div>
          <button
            class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-text bg-bg border border-border rounded-md hover:bg-border transition-colors"
            @click="goToToday"
          >
            Today
          </button>
          <button
            class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
            @click="handleExportPDF"
          >
            Export PDF Report
          </button>
        </div>
      </div>

      <div v-if="loading" class="py-12">
        <LoadingSpinner />
      </div>

      <CalendarGrid
        v-else-if="viewMode === 'calendar'"
        :products="filteredProducts"
        :current-month="currentMonth"
        :current-year="currentYear"
        @product-click="handleProductClick"
        @day-click="handleDayClick"
        @date-change="handleDateChange"
      />
      
      <WeekView
        v-else
        :products="filteredProducts"
        :current-month="currentMonth"
        :current-year="currentYear"
        @product-click="handleProductClick"
      />
    </div>

    <Modal
      :is-open="showDayModal"
      :title="dayModalTitle"
      @close="showDayModal = false"
    >
      <div class="space-y-2">
        <ProductCard
          v-for="product in dayModalProducts"
          :key="product.id"
          :product="product"
          @click="handleProductClick(product.id)"
        />
      </div>
    </Modal>

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

    <Modal :is-open="showEditProduct" title="Edit Product" size="3xl" @close="showEditProduct = false">
      <ProductForm
        v-if="selectedProduct"
        ref="editProductFormRef"
        :product="selectedProduct"
        :brand-id="brandId"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useProducts } from '@/composables/useProducts'
import { useProject } from '@/composables/useProject'
import { useToast } from '@/composables/useToast'
import { deleteDoc } from '@/firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import CalendarGrid from '@/components/calendar/CalendarView.vue'
import WeekView from '@/components/calendar/WeekView.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import ProductDetail from '@/components/product/ProductDetail.vue'
import ProductForm from '@/components/product/ProductForm.vue'
import Modal from '@/components/common/Modal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import type { Product } from '@/types'
import { PIPELINE_STAGES, STAGE_LABELS } from '@/types'
import { getStageColor } from '@/constants/stageColors'
import { generateWeekViewPDF } from '@/utils/pdf'
import { productHasGoLiveDate } from '@/utils/dates'

const brandStore = useBrandStore()
const { products, loading, fetchProducts, updateProduct } = useProducts()
const { projects, fetchProjects } = useProject()
const toast = useToast()

const brandId = computed(() => brandStore.brandId || '')

const currentDate = new Date()
const currentMonth = ref(currentDate.getMonth())
const currentYear = ref(currentDate.getFullYear())
const filterProjectId = ref('')
const viewMode = ref<'calendar' | 'week'>('calendar')
const showDayModal = ref(false)
const showProductDetail = ref(false)
const showEditProduct = ref(false)
const dayModalProducts = ref<Product[]>([])
const selectedProduct = ref<Product | null>(null)
const editProductFormRef = ref<InstanceType<typeof ProductForm> | null>(null)

const monthYearDisplay = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const filteredProducts = computed(() => {
  if (!filterProjectId.value) {
    return products.value
  }
  return products.value.filter((p: Product) => p.projectId === filterProjectId.value)
})

watch(brandId, async (newBrandId) => {
  if (newBrandId) {
    await Promise.all([
      fetchProducts(newBrandId),
      fetchProjects(newBrandId),
    ])
  } else {
    products.value = []
    projects.value = []
  }
}, { immediate: true })

onMounted(async () => {
  if (brandId.value) {
    await Promise.all([
      fetchProducts(brandId.value),
      fetchProjects(brandId.value),
    ])
  }
})

function previousMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function goToToday() {
  const today = new Date()
  currentMonth.value = today.getMonth()
  currentYear.value = today.getFullYear()
}

function handleProductClick(productId: string) {
  const product = products.value.find((p: Product) => p.id === productId)
  if (product) {
    selectedProduct.value = product
    showProductDetail.value = true
    showDayModal.value = false
  }
}

async function handleDateChange(productId: string, newDate: Date) {
  try {
    const product = products.value.find((p: Product) => p.id === productId)
    if (!product) {
      toast.error('Product not found')
      return
    }
    
    // Store at midnight UTC to avoid timezone issues
    const dateAtMidnightUTC = new Date(Date.UTC(newDate.getFullYear(), newDate.getMonth(), newDate.getDate()))
    
    // Optimistically update local state immediately
    const productIndex = products.value.findIndex((p: Product) => p.id === productId)
    if (productIndex !== -1 && products.value[productIndex]) {
      products.value[productIndex] = {
        ...products.value[productIndex],
        goLiveDate: Timestamp.fromDate(dateAtMidnightUTC),
      }
    }
    
    // Update in Firestore (this will also update local state via useProducts)
    await updateProduct(productId, {
      goLiveDate: Timestamp.fromDate(dateAtMidnightUTC),
    })
    
    toast.success('Go live date updated successfully')
  } catch (error: any) {
    console.error('Failed to update go live date:', error)
    // Revert optimistic update on error
    await fetchProducts(brandId.value)
    toast.error(error.message || 'Failed to update go live date')
  }
}

function handleDayClick(_date: Date, dayProducts: Product[]) {
  // If only one product, open its detail view
  if (dayProducts.length === 1 && dayProducts[0]) {
    handleProductClick(dayProducts[0].id)
  }
  // Otherwise, expansion is handled inline in the calendar grid
}

function handleEditProduct() {
  showProductDetail.value = false
  showEditProduct.value = true
}

async function handleUpdateProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>) {
  try {
    if (!selectedProduct.value || !brandId.value) {
      toast.error('Product not selected')
      return
    }
    
    await updateProduct(selectedProduct.value.id, productData)
    await fetchProducts(brandId.value)
    
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
    await deleteDoc('products', selectedProduct.value.id)
    await fetchProducts(brandId.value)
    showEditProduct.value = false
    showProductDetail.value = false
    selectedProduct.value = null
    toast.success('Product deleted successfully')
  } catch (error: any) {
    console.error('Failed to delete product:', error)
    toast.error(error.message || 'Failed to delete product')
  }
}

async function handleStageChanged() {
  await fetchProducts(brandId.value)
  if (selectedProduct.value) {
    const updated = products.value.find((p: Product) => p.id === selectedProduct.value!.id)
    if (updated) {
      selectedProduct.value = updated
    }
  }
}

function handleExportPDF() {
  if (!filteredProducts.value.length) {
    toast.error('No products to export')
    return
  }

  // Get week data from WeekView component logic
  const weekGroups: Product[][] = [[], [], [], []] // Week 1, 2, 3, 4
  
  filteredProducts.value.forEach((product) => {
    if (!product.goLiveDate) return
    
    const productDate = product.goLiveDate.toDate()
    const productMonth = productDate.getUTCMonth()
    const productYear = productDate.getUTCFullYear()
    const productDay = productDate.getUTCDate()
    
    if (productMonth === currentMonth.value && productYear === currentYear.value) {
      const dateForWeekCalc = new Date(productYear, productMonth, productDay)
      const firstDay = new Date(currentYear.value, currentMonth.value, 1)
      const firstDayOfWeek = firstDay.getDay()
      const dayOfMonth = dateForWeekCalc.getDate()
      const weekNumber = Math.floor((dayOfMonth + firstDayOfWeek - 1) / 7) + 1
      const weekIndex = Math.min(Math.max(weekNumber, 1), 4) - 1
      
      if (weekIndex >= 0 && weekIndex < 4 && weekGroups[weekIndex]) {
        weekGroups[weekIndex].push(product)
      }
    }
  })

  // Sort products within each week by go live date
  weekGroups.forEach((weekProducts) => {
    weekProducts.sort((a, b) => {
      if (!a.goLiveDate || !b.goLiveDate) return 0
      return a.goLiveDate.toMillis() - b.goLiveDate.toMillis()
    })
  })

  // Get date ranges for each week
  function getWeekDateRange(weekIndex: number): string {
    const firstDay = new Date(currentYear.value, currentMonth.value, 1)
    const firstDayOfWeek = firstDay.getDay()
    const weekStartDay = weekIndex * 7 - firstDayOfWeek + 1
    const startDate = new Date(currentYear.value, currentMonth.value, Math.max(weekStartDay, 1))
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    const lastDayOfMonth = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
    if (endDate.getDate() > lastDayOfMonth) {
      endDate.setDate(lastDayOfMonth)
    }
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
    const startDay = startDate.getDate()
    const endDay = endDate.getDate()
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
    }
  }

  // Build week data array
  const weeksData = weekGroups.map((products, index) => ({
    weekNumber: index + 1,
    dateRange: getWeekDateRange(index),
    products: products.filter((p) => !p.archived), // Exclude archived products
  }))

  // Generate month/year string
  const date = new Date(currentYear.value, currentMonth.value, 1)
  const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Generate PDF
  generateWeekViewPDF(weeksData, monthYear)
  toast.success('PDF report generated successfully')
}

const dayModalTitle = computed(() => {
  if (dayModalProducts.value.length === 0 || !dayModalProducts.value[0]) return 'Products'
  const first = dayModalProducts.value[0]
  if (!productHasGoLiveDate(first)) return 'Products'
  const date = first.goLiveDate!.toDate()
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})
</script>
