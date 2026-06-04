<template>
  <div class="launch-report-layout space-y-6">
    <!-- Header with date range and export (hidden when printing) -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-semibold text-text mb-1">Launch Report</h2>
        <p class="text-sm text-muted">Product pipeline analytics for your selected date range</p>
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <label class="text-sm text-muted">From</label>
          <input
            v-model="dateFrom"
            type="date"
            class="rounded-md border border-border px-3 py-2 text-sm text-text bg-card focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-muted">To</label>
          <input
            v-model="dateTo"
            type="date"
            class="rounded-md border border-border px-3 py-2 text-sm text-text bg-card focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="button"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          @click="exportPDF"
        >
          Export PDF
        </button>
        </div>
        <p class="no-print text-xs text-muted">
          Tip: Uncheck "Headers and footers" in the print dialog for a cleaner PDF with more space.
        </p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-muted">Loading products...</div>

    <div v-else ref="reportContent" class="launch-report">
      <!-- Print-only title with date range -->
      <div class="print-only print-report-title">
        <h1 class="print-report-title-text">Launch Report</h1>
        <p class="print-report-title-dates">{{ reportDateRange }}</p>
      </div>
      <!-- Top row: KPI stats + Status Distribution + Gender Split all on one line -->
      <div class="top-row">
        <div class="kpi-section">
          <div class="kpi-row kpi-row-compact">
            <div class="kpi-tile">
              <div class="kpi-label">Total</div>
              <div class="kpi-value">{{ stats.total }}</div>
            </div>
            <div class="kpi-tile kpi-live">
              <div class="kpi-label">Live</div>
              <div class="kpi-value kpi-live-val">{{ stats.live }}</div>
            </div>
            <div class="kpi-tile kpi-editing">
              <div class="kpi-label">Editing</div>
              <div class="kpi-value kpi-editing-val">{{ stats.editing }}</div>
            </div>
            <div class="kpi-tile kpi-staged">
              <div class="kpi-label">Staged</div>
              <div class="kpi-value kpi-staged-val">{{ stats.ready }}</div>
            </div>
            <div class="kpi-tile kpi-pipeline">
              <div class="kpi-label">Pipeline</div>
              <div class="kpi-value kpi-pipeline-val">{{ stats.pipeline }}</div>
            </div>
            <div class="kpi-tile kpi-new">
              <div class="kpi-label">New</div>
              <div class="kpi-value kpi-new-val">{{ stats.newColors }}</div>
            </div>
          </div>
        </div>
        <div class="chart-card chart-card-donut">
          <div class="donut-left">
            <div class="chart-title">Status Distribution</div>
            <div class="donut-legend donut-legend-cols">
              <div
                v-for="stage in displayStages"
                :key="stage"
                class="donut-legend-item"
              >
                <div class="leg-dot" :style="{ backgroundColor: stageColors[stage] }" />
                {{ stageLabels[stage] }}
              </div>
            </div>
          </div>
          <div class="donut-right">
            <div class="chart-wrap chart-wrap-donut">
              <canvas ref="statusChart"></canvas>
            </div>
          </div>
        </div>
        <div class="chart-card chart-card-donut">
          <div class="donut-left">
            <div class="chart-title">Gender Split</div>
            <div class="donut-legend">
              <div
                v-for="item in genderLegendItems"
                :key="item.label"
                class="donut-legend-item"
              >
                <div class="leg-dot" :style="{ backgroundColor: item.color }" />
                {{ item.label }}
              </div>
            </div>
          </div>
          <div class="donut-right">
            <div class="chart-wrap chart-wrap-donut">
              <canvas ref="genderChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="section-label">Launch Analytics</div>
      <div class="charts-row charts-row-bar">
        <div class="chart-card">
          <div class="chart-title">Weekly Launch Volume by Status</div>
          <div class="chart-sub">PRODUCTS PER WEEK · ALL STATUSES</div>
          <div class="chart-wrap">
            <canvas ref="weeklyChart"></canvas>
          </div>
        </div>
      </div>

      <div class="charts-row charts-row-bottom">
        <div class="chart-card chart-card-compact">
          <div class="chart-title">Products by Category</div>
          <div class="chart-sub">PRODUCTS BY TYPE</div>
          <div class="chart-wrap chart-wrap-compact">
            <canvas ref="categoryChart"></canvas>
          </div>
        </div>
        <div class="chart-card chart-card-compact">
          <div class="chart-title">Status Pipeline Progress</div>
          <div class="chart-sub">% OF TOTAL LAUNCH CATALOG</div>
          <div class="progress-bars progress-bars-compact">
            <div
              v-for="stage in displayStages"
              :key="stage"
              class="progress-item"
            >
              <div class="progress-header">
                <span class="progress-label" :style="{ color: stageColors[stage] }">
                  {{ stageLabels[stage] }}
                </span>
                <span class="progress-value">
                  {{ getStageCount(stage) }} · {{ getStagePct(stage) }}%
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :style="{
                    width: `${getStagePct(stage)}%`,
                    backgroundColor: stageColors[stage],
                  }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend-row">
        <div
          v-for="stage in displayStages"
          :key="stage"
          class="leg-item"
        >
          <div class="leg-dot" :style="{ backgroundColor: stageColors[stage] }" />
          {{ stageLabels[stage] }}
        </div>
        <div class="leg-item">
          <div class="leg-dot leg-new" />
          New colorway
        </div>
      </div>

      <!-- Launch schedule (by go-live week) -->
      <div class="manifest-section">
        <div class="section-label section-label-manifest">Launch Schedule</div>
        <p class="manifest-intro">
          Products grouped by go-live week in your date range. Ex-factory date and
          <span class="attention-flag attention-flag-inline">Needs attention</span>
          appear when ex-factory has passed and the product is still in production.
        </p>
        <div class="table-section">
        <div
          v-for="week in weekGroups"
          :key="week.weekNum"
          class="week-block"
        >
          <div class="week-block-header">
            <span class="week-num">W{{ week.weekNum }}</span>
            <span class="week-name">{{ week.weekName }}</span>
            <span class="week-count-badge">{{ week.products.length }} products</span>
            <span
              v-if="week.attentionCount > 0"
              class="attention-flag"
            >
              {{ week.attentionCount }} need attention
            </span>
            <span class="week-dates-card">{{ week.dateRange }}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 70px">Launch</th>
                <th style="width: 82px">Ex-factory</th>
                <th style="width: 118px">Attention</th>
                <th>Product</th>
                <th style="width: 110px">SKU</th>
                <th style="width: 70px">Gender</th>
                <th style="width: 90px">Category</th>
                <th>Colorways</th>
                <th style="width: 110px">Status</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="product in week.products" :key="product.id">
                <tr
                  class="report-row-clickable"
                  :class="{ 'manifest-row-attention': needsFactoryAttention(product) }"
                  @click="openProduct(product)"
                >
                  <td class="td-date">
                    {{ product.goLiveDate ? formatDateShort(product.goLiveDate) : '' }}
                  </td>
                  <td class="td-date" :class="{ 'td-date-warn': needsFactoryAttention(product) }">
                    {{ formatExFactoryCell(product) }}
                  </td>
                  <td>
                    <span v-if="needsFactoryAttention(product)" class="attention-flag">Needs attention</span>
                    <span v-else class="text-muted text-xs">—</span>
                  </td>
                  <td class="td-name">{{ product.name }}</td>
                  <td class="td-sku">{{ product.sku }}</td>
                  <td class="td-gender" :class="product.gender || 'mens'">
                    {{ (product.gender || 'mens') === 'mens' ? "Men's" : product.gender === 'womens' ? "Women's" : 'Unisex' }}
                  </td>
                  <td class="td-type">{{ product.category }}</td>
                  <td>
                    <div class="td-colors">
                      <span
                        v-for="color in (product.colors || [])"
                        :key="color.name"
                        class="col-chip"
                        :class="{ 'col-chip-new': isNewColor(color) }"
                      >
                        {{ color.name }}{{ isNewColor(color) ? ' ✦' : '' }}
                      </span>
                      <span v-if="!product.colors?.length" class="text-muted">—</span>
                    </div>
                  </td>
                  <td>
                    <span
                      class="status-pill"
                      :class="`s-${product.stage}`"
                      :style="{ backgroundColor: stageBgColors[product.stage], color: stageColors[product.stage] }"
                    >
                      {{ stageLabels[product.stage] }}
                    </span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div
          v-if="productsWithoutLaunchDate.length > 0"
          class="no-launch-date-section"
        >
          <div class="section-label section-label-sub">No Launch Date</div>
          <div class="week-block week-block-no-date">
          <div class="week-block-header week-block-header-no-date">
            <span class="week-num week-num-muted">—</span>
            <span class="week-name">No launch date</span>
            <span class="week-count-badge week-count-badge-amber">
              {{ productsWithoutLaunchDate.length }}
              {{ productsWithoutLaunchDate.length === 1 ? 'product' : 'products' }}
            </span>
            <span class="week-dates-card week-dates-card-note">Not included in weekly launch charts above</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 70px">Launch</th>
                <th style="width: 82px">Ex-factory</th>
                <th style="width: 118px">Attention</th>
                <th>Product</th>
                <th style="width: 110px">SKU</th>
                <th style="width: 70px">Gender</th>
                <th style="width: 90px">Category</th>
                <th>Colorways</th>
                <th style="width: 110px">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="product in productsWithoutLaunchDate"
                :key="product.id"
                class="report-row-clickable"
                :class="{ 'manifest-row-attention': needsFactoryAttention(product) }"
                @click="openProduct(product)"
              >
                <td class="td-date td-date-missing">—</td>
                <td class="td-date" :class="{ 'td-date-warn': needsFactoryAttention(product) }">
                  {{ formatExFactoryCell(product) }}
                </td>
                <td>
                  <span v-if="needsFactoryAttention(product)" class="attention-flag">Needs attention</span>
                  <span v-else class="text-muted text-xs">—</span>
                </td>
                <td class="td-name">{{ product.name }}</td>
                <td class="td-sku">{{ product.sku }}</td>
                <td class="td-gender" :class="product.gender || 'mens'">
                  {{ (product.gender || 'mens') === 'mens' ? "Men's" : product.gender === 'womens' ? "Women's" : 'Unisex' }}
                </td>
                <td class="td-type">{{ product.category }}</td>
                <td>
                  <div class="td-colors">
                    <span
                      v-for="color in (product.colors || [])"
                      :key="color.name"
                      class="col-chip"
                      :class="{ 'col-chip-new': isNewColor(color) }"
                    >
                      {{ color.name }}{{ isNewColor(color) ? ' ✦' : '' }}
                    </span>
                    <span v-if="!product.colors?.length" class="text-muted">—</span>
                  </div>
                </td>
                <td>
                  <span
                    class="status-pill"
                    :class="`s-${product.stage}`"
                    :style="{ backgroundColor: stageBgColors[product.stage], color: stageColors[product.stage] }"
                  >
                    {{ stageLabels[product.stage] }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <span>GreenRoom · Product Pipeline</span>
      <span>{{ reportDateRange }} · Generated {{ generatedDate }}</span>
      <span>Internal Report</span>
    </div>

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

    <Modal
      :is-open="showEditProduct"
      title="Edit Product"
      size="3xl"
      @close="showEditProduct = false"
    >
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
          type="button"
          class="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          @click="editProductFormRef?.handleDelete()"
        >
          Delete
        </button>
        <div class="flex gap-2 ml-auto">
          <button
            type="button"
            class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
            @click="showEditProduct = false"
          >
            Cancel
          </button>
          <button
            type="button"
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
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useBrandStore } from '@/stores/brand'
import { useProducts } from '@/composables/useProducts'
import { useToast } from '@/composables/useToast'
import { deleteDoc } from '@/firebase/firestore'
import ProductDetail from '@/components/product/ProductDetail.vue'
import ProductForm from '@/components/product/ProductForm.vue'
import Modal from '@/components/common/Modal.vue'
import {
  formatDateShort,
  productHasGoLiveDate,
  productHasTentativeExFactoryDate,
  isPastExFactoryAwaitingShip,
} from '@/utils/dates'
import type { Product } from '@/types'
import { Timestamp } from 'firebase/firestore'

Chart.register(...registerables)

const brandStore = useBrandStore()
const { products, loading, fetchProducts, updateProduct } = useProducts()
const toast = useToast()
const brandId = computed(() => brandStore.brandId || '')

const showProductDetail = ref(false)
const showEditProduct = ref(false)
const selectedProduct = ref<Product | null>(null)
const editProductFormRef = ref<InstanceType<typeof ProductForm> | null>(null)

function openProduct(product: Product) {
  selectedProduct.value = product
  showProductDetail.value = true
}

function handleProductClick(productId: string) {
  const product = products.value.find((p) => p.id === productId)
  if (product) openProduct(product)
}

function handleEditProduct() {
  showProductDetail.value = false
  showEditProduct.value = true
}

async function handleUpdateProduct(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>
) {
  try {
    if (!selectedProduct.value || !brandId.value) {
      toast.error('Product not selected')
      return
    }
    await updateProduct(selectedProduct.value.id, productData)
    await fetchProducts(brandId.value)
    const updated = products.value.find((p) => p.id === selectedProduct.value!.id)
    if (updated) selectedProduct.value = updated
    showEditProduct.value = false
    toast.success('Product updated successfully')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update product'
    console.error('Failed to update product:', error)
    toast.error(message)
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete product'
    console.error('Failed to delete product:', error)
    toast.error(message)
  }
}

async function handleStageChanged() {
  await fetchProducts(brandId.value)
  if (selectedProduct.value) {
    const updated = products.value.find((p) => p.id === selectedProduct.value!.id)
    if (updated) selectedProduct.value = updated
  }
}

// Date range - default to current month
const now = new Date()
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
const dateFrom = ref(firstOfMonth.toISOString().split('T')[0])
const dateTo = ref(lastOfMonth.toISOString().split('T')[0])

const reportContent = ref<HTMLElement | null>(null)
const weeklyChart = ref<HTMLCanvasElement | null>(null)
const statusChart = ref<HTMLCanvasElement | null>(null)
const genderChart = ref<HTMLCanvasElement | null>(null)
const categoryChart = ref<HTMLCanvasElement | null>(null)
let chartInstances: Chart[] = []

function needsFactoryAttention(product: Product): boolean {
  return isPastExFactoryAwaitingShip(product)
}

function formatExFactoryCell(product: Product): string {
  if (!needsFactoryAttention(product) || !productHasTentativeExFactoryDate(product)) {
    return '—'
  }
  return formatDateShort(product.tentativeExFactoryDate!)
}

// Stage display mapping (greenRoom stages to report labels)
const stageLabels: Record<string, string> = {
  live: 'Live',
  editing: 'Editing',
  staged: 'Staged',
  warehouse: 'Warehouse',
  in_shoot: 'In Shoot',
  photo_queue: 'Photo Queue',
  samples: 'In Production',
}

// Colors for report (light theme, print-friendly)
const stageColors: Record<string, string> = {
  live: '#0e7f55',
  editing: '#6d4cb5',
  staged: '#1a6abf',
  warehouse: '#52637a',
  in_shoot: '#b85f10',
  photo_queue: '#a07a00',
  samples: '#b03780',
}

const stageBgColors: Record<string, string> = {
  live: '#e8faf3',
  editing: '#f1eeff',
  staged: '#e8f3ff',
  warehouse: '#f2f4f7',
  in_shoot: '#fef2e8',
  photo_queue: '#fffae0',
  samples: '#fde8f5',
}

const displayStages = ['live', 'editing', 'warehouse', 'staged', 'in_shoot', 'samples', 'photo_queue'] as const

// Parse YYYY-MM-DD as local date (avoids UTC parsing off-by-one in western timezones)
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = (parts[1] ?? 1) - 1
  const d = parts[2] ?? 1
  return new Date(y, m, d)
}

function getReportRangeBounds(): { from: Date; to: Date } {
  const fromStr = dateFrom.value || firstOfMonth.toISOString().split('T')[0] || ''
  const toStr = dateTo.value || lastOfMonth.toISOString().split('T')[0] || ''
  const from = parseLocalDate(fromStr)
  from.setHours(0, 0, 0, 0)
  const to = parseLocalDate(toStr)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

// Filter products by date range
const filteredProducts = computed(() => {
  const { from, to } = getReportRangeBounds()
  return products.value.filter((p) => {
    if (p.archived || !productHasGoLiveDate(p)) return false
    const d = p.goLiveDate!.toDate()
    return d >= from && d <= to
  })
})

function sortLaunchWeekProducts(list: Product[]): Product[] {
  return [...list].sort((a, b) => {
    const attentionDiff = Number(needsFactoryAttention(b)) - Number(needsFactoryAttention(a))
    if (attentionDiff !== 0) return attentionDiff
    const aMs = a.goLiveDate?.toMillis?.() ?? 0
    const bMs = b.goLiveDate?.toMillis?.() ?? 0
    return aMs - bMs
  })
}

/** Active products with no go-live date (not scoped to the report date range) */
const productsWithoutLaunchDate = computed(() => {
  return products.value
    .filter((p) => !p.archived && !productHasGoLiveDate(p))
    .sort((a, b) => {
      const attentionDiff = Number(needsFactoryAttention(b)) - Number(needsFactoryAttention(a))
      if (attentionDiff !== 0) return attentionDiff
      return a.name.localeCompare(b.name)
    })
})

// Group products by week (week of year)
function getWeekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7 // Monday = 1
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

const weekGroups = computed(() => {
  const groups: Map<
    number,
    {
      weekNum: number
      weekName: string
      dateRange: string
      products: Product[]
      attentionCount: number
    }
  > = new Map()

  filteredProducts.value.forEach((p) => {
    const d = p.goLiveDate?.toDate ? p.goLiveDate.toDate() : new Date()
    const weekNum = getWeekOfYear(d)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay() + 1)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const dateRange = `${formatDateShort(Timestamp.fromDate(weekStart))} – ${formatDateShort(Timestamp.fromDate(weekEnd))}`

    if (!groups.has(weekNum)) {
      groups.set(weekNum, {
        weekNum,
        weekName: `Week ${weekNum}`,
        dateRange,
        products: [],
        attentionCount: 0,
      })
    }
    groups.get(weekNum)!.products.push(p)
  })

  groups.forEach((g) => {
    g.products = sortLaunchWeekProducts(g.products)
    g.attentionCount = g.products.filter((p) => needsFactoryAttention(p)).length
  })

  return Array.from(groups.values()).sort((a, b) => a.weekNum - b.weekNum)
})

// Stats
const stats = computed(() => {
  const list = filteredProducts.value
  const live = list.filter((p) => p.stage === 'live').length
  const editing = list.filter((p) => p.stage === 'editing').length
  const ready = list.filter((p) => p.stage === 'staged' || p.stage === 'warehouse').length
  const pipeline = list.filter(
    (p) => p.stage === 'in_shoot' || p.stage === 'samples' || p.stage === 'photo_queue'
  ).length
  const newColors = list.reduce((acc, p) => {
    if (p.colors) {
      return acc + p.colors.filter((c) => c.tags?.includes('new color')).length
    }
    return acc
  }, 0)
  return {
    total: list.length,
    live,
    editing,
    ready,
    pipeline,
    newColors,
  }
})

const genderLegendItems = computed(() => {
  const list = filteredProducts.value
  const mens = list.filter((p) => (p.gender || 'mens') === 'mens').length
  const womens = list.filter((p) => p.gender === 'womens').length
  const unisex = list.filter((p) => p.gender === 'unisex').length
  const items = [
    { label: "Men's", count: mens, color: '#1a6abf' },
    { label: "Women's", count: womens, color: '#b03780' },
    { label: 'Unisex', count: unisex, color: '#52637a' },
  ]
  return items.filter((i) => i.count > 0)
})

function getStageCount(stage: string): number {
  return filteredProducts.value.filter((p) => p.stage === stage).length
}

function getStagePct(stage: string): string {
  const total = filteredProducts.value.length
  if (total === 0) return '0'
  return ((getStageCount(stage) / total) * 100).toFixed(1)
}

function isNewColor(color: { tags?: string[] }): boolean {
  return color.tags?.includes('new color') ?? false
}

const reportDateRange = computed(() => {
  const fromStr = dateFrom.value || firstOfMonth.toISOString().split('T')[0] || ''
  const toStr = dateTo.value || lastOfMonth.toISOString().split('T')[0] || ''
  const from = parseLocalDate(fromStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric', day: 'numeric' })
  const to = parseLocalDate(toStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric', day: 'numeric' })
  return `${from} – ${to}`
})

const generatedDate = computed(() =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
)

async function loadProducts() {
  if (brandId.value) {
    await fetchProducts(brandId.value)
  }
}

function destroyCharts() {
  chartInstances.forEach((c) => c.destroy())
  chartInstances = []
}

function buildCharts() {
  destroyCharts()
  nextTick(() => {
    const list = filteredProducts.value
    const gridColor = 'rgba(0,0,0,0.08)'
    const tickColor = '#555'

    // Weekly stacked bar
    if (weeklyChart.value && list.length > 0) {
      const weeks = [...new Set(list.map((p) => getWeekOfYear(p.goLiveDate!.toDate())))]
      weeks.sort((a, b) => a - b)
      const datasets = displayStages.map((stage) => ({
        label: stageLabels[stage],
        data: weeks.map((w) =>
          list.filter((p) => getWeekOfYear(p.goLiveDate!.toDate()) === w && p.stage === stage).length
        ),
        backgroundColor: stageColors[stage],
        borderWidth: 0,
        borderRadius: 2,
      }))
      const chart = new Chart(weeklyChart.value, {
        type: 'bar',
        data: {
          labels: weeks.map((w) => `Week ${w}`),
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { left: 6, right: 6, top: 6, bottom: 6 } },
          plugins: { 
            legend: { display: false },
            tooltip: { enabled: true }
          },
          scales: {
            x: { 
              stacked: true, 
              grid: { color: gridColor }, 
              ticks: { 
                color: tickColor, 
                maxRotation: 0, 
                minRotation: 0,
                font: { size: 10 },
                autoSkip: false,
                maxTicksLimit: undefined
              }
            },
            y: { 
              stacked: true, 
              grid: { color: gridColor }, 
              ticks: { 
                color: tickColor, 
                stepSize: 1, 
                font: { size: 10 } 
              } 
            },
          },
        },
      })
      chartInstances.push(chart)
    }

    // Status doughnut
    if (statusChart.value) {
      const counts = displayStages.map((s) => getStageCount(s))
      const chart = new Chart(statusChart.value, {
        type: 'doughnut',
        data: {
          labels: displayStages.map((s) => stageLabels[s]),
          datasets: [
            {
              data: counts,
              backgroundColor: displayStages.map((s) => stageColors[s]),
              borderWidth: 1,
              borderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 2 },
          plugins: {
            legend: { display: false },
          },
          cutout: '60%',
        },
      })
      chartInstances.push(chart)
    }

    // Gender doughnut
    if (genderChart.value) {
      const mens = list.filter((p) => (p.gender || 'mens') === 'mens').length
      const womens = list.filter((p) => p.gender === 'womens').length
      const unisex = list.filter((p) => p.gender === 'unisex').length
      const genderCounts = [mens, womens, unisex]
      const genderLabels = ["Men's", "Women's", 'Unisex']
      const chart = new Chart(genderChart.value, {
        type: 'doughnut',
        data: {
          labels: genderLabels.filter((_, i) => (genderCounts[i] ?? 0) > 0),
          datasets: [
            {
              data: genderCounts.filter((v) => v > 0),
              backgroundColor: ['#1a6abf', '#b03780', '#52637a'],
              borderWidth: 1,
              borderColor: '#fff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 2 },
          plugins: {
            legend: { display: false },
          },
          cutout: '60%',
        },
      })
      chartInstances.push(chart)
    }

    // Category bar
    if (categoryChart.value && list.length > 0) {
      const cats: Record<string, number> = {}
      list.forEach((p) => {
        cats[p.category || 'Other'] = (cats[p.category || 'Other'] || 0) + 1
      })
      const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1])
      const palette = ['#1B7F56', '#0e7f55', '#1a6abf', '#6d4cb5', '#b85f10', '#b03780', '#52637a', '#a07a00']
      const chart = new Chart(categoryChart.value, {
        type: 'bar',
        data: {
          labels: sorted.map((e) => e[0]),
          datasets: [
            {
              data: sorted.map((e) => e[1]),
              backgroundColor: palette.slice(0, sorted.length),
              borderWidth: 0,
              borderRadius: 3,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 6 },
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: tickColor, stepSize: 1, font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } },
          },
        },
      })
      chartInstances.push(chart)
    }

  })
}

watch([filteredProducts, dateFrom, dateTo], () => buildCharts(), { deep: true })
watch(brandId, (id) => {
  if (id) loadProducts()
}, { immediate: true })

onMounted(async () => {
  document.body.classList.add('report-print-active')
  window.addEventListener('beforeprint', handleBeforePrint)
  window.addEventListener('afterprint', handleAfterPrint)
  await loadProducts()
  buildCharts()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeprint', handleBeforePrint)
  window.removeEventListener('afterprint', handleAfterPrint)
  document.body.classList.remove('report-print-active')
})

function exportPDF() {
  window.print()
}

// Convert charts to images for reliable PDF export (canvas often doesn't print well)
const chartImages: { canvas: HTMLCanvasElement; img: HTMLImageElement }[] = []
const originalFontSizes: Map<Chart, Array<{ obj: { size?: number }; value: number }>> = new Map()
const originalDevicePixelRatio: Map<Chart, number> = new Map()

const PRINT_FONT_SIZE = 8

function scaleChartFontsForPrint(chart: Chart, scaleDown: boolean) {
  const sizes: Array<{ obj: { size?: number }; value: number }> = []
  const scales = chart.options.scales as Record<string, { ticks?: { font?: { size?: number } } }> | undefined
  if (!scales) return

  for (const scaleId of Object.keys(scales)) {
    const ticks = scales[scaleId]?.ticks
    const font = ticks?.font
    if (font && typeof font.size === 'number') {
      if (scaleDown) {
        sizes.push({ obj: font, value: font.size })
        font.size = PRINT_FONT_SIZE
      } else {
        const saved = originalFontSizes.get(chart)
        const match = saved?.find((s) => s.obj === font)
        if (match) font.size = match.value
      }
    }
  }
  if (scaleDown && sizes.length > 0) {
    originalFontSizes.set(chart, sizes)
  } else if (!scaleDown) {
    originalFontSizes.delete(chart)
  }
}

function handleBeforePrint() {
  setTimeout(() => {
    chartInstances.forEach((chart) => {
      try {
        chart.resize()
        scaleChartFontsForPrint(chart, true)
        // Render at 2x resolution for crisp print output
        const opts = chart.options as { devicePixelRatio?: number }
        originalDevicePixelRatio.set(chart, opts.devicePixelRatio ?? window.devicePixelRatio ?? 1)
        opts.devicePixelRatio = 2
        chart.update('none')
        const canvas = chart.canvas
        if (canvas && canvas.width > 0) {
          const dataUrl = canvas.toDataURL('image/png')
          const img = document.createElement('img')
          img.src = dataUrl
          img.style.width = '100%'
          img.style.height = '100%'
          img.style.objectFit = 'contain'
          img.style.display = 'block'
          canvas.parentElement?.appendChild(img)
          canvas.style.display = 'none'
          chartImages.push({ canvas, img })
        }
      } catch {
        // ignore
      }
    })
  }, 150)
}

function handleAfterPrint() {
  chartImages.forEach(({ canvas, img }) => {
    img.remove()
    canvas.style.display = ''
  })
  chartImages.length = 0
  chartInstances.forEach((chart) => {
    try {
      const opts = chart.options as { devicePixelRatio?: number }
      opts.devicePixelRatio = originalDevicePixelRatio.get(chart) ?? window.devicePixelRatio ?? 1
      originalDevicePixelRatio.delete(chart)
      scaleChartFontsForPrint(chart, false)
      chart.update('none')
      chart.resize()
    } catch {
      // ignore
    }
  })
}
</script>

<style scoped>
.launch-report-layout {
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}

.launch-report {
  padding: 0 0 32px;
}

/* Top row: KPI + Status Distribution + Gender Split on one line */
.top-row {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  align-items: stretch;
}

.kpi-section {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.kpi-section .kpi-row {
  flex: 1;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: #e0e0e0;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.kpi-row-compact {
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
}


.kpi-row-compact .kpi-tile {
  padding: 8px 10px;
}

.kpi-row-compact .kpi-tile::after {
  left: 10px;
  right: 10px;
}

.kpi-row-compact .kpi-label {
  font-size: 7px;
  margin-bottom: 2px;
}

.kpi-row-compact .kpi-value {
  font-size: 20px;
}

.kpi-tile {
  background: #f8faf9;
  padding: 14px 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.kpi-tile::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background: #e0e0e0;
}

.kpi-tile.kpi-live::after { background: #0e7f55; }
.kpi-tile.kpi-editing::after { background: #6d4cb5; }
.kpi-tile.kpi-staged::after { background: #1a6abf; }
.kpi-tile.kpi-pipeline::after { background: #b85f10; }
.kpi-tile.kpi-new::after { background: #1B7F56; }

.kpi-label {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: #1a1a1a;
  min-width: 0;
}

.kpi-value.kpi-live-val { color: #0e7f55; }
.kpi-value.kpi-editing-val { color: #6d4cb5; }
.kpi-value.kpi-staged-val { color: #1a6abf; }
.kpi-value.kpi-pipeline-val { color: #b85f10; }
.kpi-value.kpi-new-val { color: #1B7F56; }

.kpi-sub {
  font-size: 10px;
  color: #888;
  margin-top: 3px;
}

.chart-card-donut {
  padding: 6px 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.chart-card-donut .donut-left {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chart-card-donut .donut-right {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

.chart-card-donut .chart-title {
  font-size: 9px;
  margin-bottom: 6px;
}

.chart-card-donut .donut-legend {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chart-card-donut .donut-legend-cols {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px 10px;
}

.chart-card-donut .donut-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  color: #555;
  letter-spacing: 0.02em;
}

.chart-card-donut .donut-legend-item .leg-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
}

.chart-card-donut .chart-wrap-donut {
  height: 110px;
  width: 110px;
  flex: none;
  min-height: 0;
}

/* Section label */
.section-label {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #1B7F56;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #d0d0d0;
}

/* Charts */
.charts-row {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}

.charts-row-bar {
  grid-template-columns: 1fr;
  margin-bottom: 16px;
}

.charts-row-bottom {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  margin-bottom: 20px;
  gap: 16px;
}

.charts-row-bottom .chart-card {
  min-width: 0;
  overflow: hidden;
}

.chart-card {
  background: #f8faf9;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px 18px;
  overflow: hidden;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chart-card.chart-card-donut {
  flex-direction: row;
}

.chart-card-compact {
  padding: 14px 16px;
}

.chart-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.chart-sub {
  font-size: 9px;
  color: #888;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.chart-card-compact .chart-sub {
  margin-bottom: 10px;
}

.chart-wrap {
  position: relative;
  height: 190px;
  overflow: hidden;
  width: 100%;
  flex: 1;
  min-height: 0;
}


.chart-wrap-compact {
  height: 150px;
}

.charts-row-bottom .chart-card:last-child .chart-wrap {
  height: auto;
}

/* Progress bars */
.progress-bars {
  margin-top: 8px;
}

.progress-bars-compact .progress-item {
  margin-bottom: 6px;
}

.progress-bars-compact .progress-header {
  margin-bottom: 2px;
}

.progress-item {
  margin-bottom: 11px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.progress-label {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.progress-value {
  font-size: 9px;
  color: #888;
}

.progress-track {
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Legend */
.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 24px;
}

.leg-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #6b6b6b;
  letter-spacing: 0.04em;
}

.leg-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #888;
}

.leg-dot.leg-new {
  background: #1B7F56;
}

/* Table */
.week-block {
  margin-bottom: 32px;
}

.week-block-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 14px 0 12px;
  border-bottom: 1px solid #d0d0d0;
  margin-bottom: 0;
}

.week-num {
  font-size: 28px;
  font-weight: 700;
  color: #1B7F56;
  line-height: 1;
  letter-spacing: 0.05em;
}

.week-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.week-dates-card {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 0.02em;
  padding: 6px 14px;
  background: #f5f7fa;
  border: 1px solid #c8d0da;
  border-radius: 8px;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.manifest-intro {
  font-size: 12px;
  color: #6b6b6b;
  line-height: 1.5;
  margin: -8px 0 20px;
  max-width: 52rem;
}

.attention-flag {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 100px;
  white-space: nowrap;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.attention-flag-inline {
  vertical-align: baseline;
}

.td-date-warn {
  color: #991b1b !important;
  font-weight: 600;
}

.manifest-row-attention td {
  background-color: #fffbf7 !important;
}

.report-row-clickable.manifest-row-attention:hover td {
  background-color: #fff5ee !important;
}

.week-dates-card-note {
  font-size: 10px;
  font-weight: 500;
  color: #92400e;
  background: rgba(180, 83, 9, 0.08);
  border-color: rgba(180, 83, 9, 0.28);
}

.week-count-badge {
  font-size: 9px;
  letter-spacing: 0.08em;
  padding: 3px 10px;
  background: rgba(27, 127, 86, 0.1);
  border: 1px solid rgba(27, 127, 86, 0.25);
  color: #1B7F56;
  border-radius: 100px;
}

.no-launch-date-section {
  margin-top: 40px;
}

.section-label-sub {
  margin-bottom: 12px;
  color: #b45309;
}

.section-label-sub::after {
  background: linear-gradient(90deg, #b45309 0%, transparent 100%);
}

.week-block-no-date {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.week-block-header-no-date {
  border-bottom-color: #e0d4c0;
}

.week-num-muted {
  color: #b45309;
}

.week-count-badge-amber {
  background: rgba(180, 83, 9, 0.1);
  border-color: rgba(180, 83, 9, 0.3);
  color: #b45309;
}

.td-date-missing {
  color: #b45309;
  font-style: italic;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

thead tr {
  background: #f0f0f0;
}

th {
  font-size: 8.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #888;
  padding: 9px 12px;
  text-align: left;
  font-weight: 500;
  border-bottom: 1px solid #d0d0d0;
}

td {
  padding: 9px 12px;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

tbody td {
  background-color: #fff;
}

.report-row-clickable {
  cursor: pointer;
}

.report-row-clickable:hover td {
  background-color: #f5f7fa !important;
}

.td-date {
  font-size: 10px;
  color: #888;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.td-name {
  font-weight: 500;
  color: #1a1a1a;
}

.td-sku {
  font-size: 10px;
  color: #888;
  letter-spacing: 0.05em;
}

.td-gender {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.td-gender.mens {
  color: #1a6abf;
}

.td-gender.womens {
  color: #b03780;
}

.td-gender.unisex {
  color: #52637a;
}

.td-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.col-chip {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #f0f0f0;
  color: #6b6b6b;
  border: 1px solid #d0d0d0;
  white-space: nowrap;
}

.col-chip.col-chip-new {
  background: rgba(27, 127, 86, 0.12);
  border-color: rgba(27, 127, 86, 0.3);
  color: #1B7F56;
}

.status-pill {
  font-size: 8.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 100px;
  white-space: nowrap;
  font-weight: 500;
}

.td-type {
  font-size: 9px;
  color: #888;
  letter-spacing: 0.06em;
}

/* Print-only elements - hidden on screen */
.print-only {
  display: none;
}

/* Footer */
.report-footer {
  border-top: 1px solid #e0e0e0;
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  color: #888;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }
  .print-report-title {
    text-align: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #d0d0d0;
  }
  .print-report-title-text {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 4px;
    letter-spacing: 0.02em;
  }
  .print-report-title-dates {
    font-size: 11px;
    color: #666;
    margin: 0;
    letter-spacing: 0.04em;
  }

  /* Export layout: KPI cards only at top, Products by Category on own line */
  .top-row {
    grid-template-columns: 1fr !important;
  }
  .top-row .chart-card-donut {
    display: none !important;
  }

  /* Ensure charts and colors print correctly */
  .chart-wrap,
  .chart-wrap img {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  /* Constrain to A4 content width - tight layout for print */
  .launch-report {
    max-width: 186mm !important;
    width: 100% !important;
    padding: 6px 3mm 10px 3mm;
    box-sizing: border-box;
  }

  /* Full Product Manifest - own page, larger headline */
  .manifest-section {
    page-break-before: always;
    padding-top: 4mm;
  }
  .section-label-manifest {
    font-size: 14px !important;
    margin-bottom: 12px !important;
    letter-spacing: 0.2em !important;
  }

  /* Table - prevent date cutoff, repeating headers, page breaks */
  .table-section {
    overflow: visible;
    break-inside: auto;
    page-break-inside: auto;
  }
  .week-block {
    break-inside: auto;
    page-break-inside: auto;
    page-break-after: auto;
  }
  .week-block:last-child {
    margin-bottom: 0;
  }
  .week-block-no-date {
    margin-top: 16px;
    padding-top: 6px;
    page-break-before: auto;
  }

  .week-block-header {
    padding-right: 2mm;
  }

  /* Top row: KPI only (donuts hidden for export) */
  .top-row {
    gap: 8px;
    margin-bottom: 10px;
    break-inside: avoid;
  }
  .kpi-row-compact .kpi-tile {
    padding: 4px 6px;
  }
  .kpi-row-compact .kpi-tile::after {
    left: 6px;
    right: 6px;
  }
  .kpi-row-compact .kpi-label {
    font-size: 6px;
    margin-bottom: 1px;
  }
  .kpi-row-compact .kpi-value {
    font-size: 14px;
  }
  .chart-card-donut {
    padding: 6px 8px;
    gap: 8px;
  }
  .chart-card-donut .chart-title {
    font-size: 9px;
    margin-bottom: 4px;
  }
  .chart-card-donut .donut-legend-item {
    font-size: 8px;
  }
  .chart-card-donut .donut-legend-cols .donut-legend-item {
    font-size: 7px;
  }
  .chart-card-donut .donut-legend-item .leg-dot {
    width: 5px;
    height: 5px;
  }
  .chart-card-donut .donut-legend-cols .donut-legend-item .leg-dot {
    width: 4px;
    height: 4px;
  }
  .chart-card-donut .chart-wrap-donut {
    height: 75px !important;
    width: 75px !important;
  }
  .chart-card-donut {
    transform: scale(0.9);
    transform-origin: center center;
  }

  /* Compact section labels */
  .section-label {
    font-size: 8px;
    margin-bottom: 4px;
  }

  /* Charts - compact padding to fit on page */
  .chart-card {
    break-inside: avoid;
    padding: 6px 8px;
    min-width: 0;
  }
  .chart-title {
    font-size: 10px;
    margin-bottom: 2px;
  }
  .chart-sub {
    font-size: 8px;
    margin-bottom: 4px;
  }
  .charts-row {
    margin-bottom: 6px;
    break-inside: avoid;
  }
  /* Weekly bar chart - ensure all weeks are visible and use full width */
  .charts-row-bar {
    overflow: visible;
    min-width: 100%;
    width: 100%;
    page-break-inside: avoid;
  }
  .charts-row-bar .chart-card {
    overflow: visible;
    width: 100%;
    max-width: 100%;
    min-width: 100%;
    page-break-inside: avoid;
  }
  .charts-row-bar .chart-wrap {
    height: 90px !important;
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
    overflow: visible;
    transform: none !important;
    transform-origin: top left;
  }
  .charts-row-bar .chart-card {
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
  }
  .charts-row-bar .chart-wrap canvas {
    width: 100% !important;
    max-width: 100% !important;
    height: 90px !important;
  }
  .charts-row-bottom {
    grid-template-columns: 1fr;
    margin-bottom: 8px;
    gap: 8px;
  }
  .charts-row-bottom .chart-card:first-child {
    grid-column: 1;
  }
  .charts-row-bottom .chart-card {
    min-width: 0;
    overflow: hidden;
  }
  .charts-row-bottom .chart-card:first-child .chart-wrap-compact {
    transform: scale(0.9);
    transform-origin: center center;
  }
  .chart-wrap-compact {
    height: 75px !important;
  }
  .chart-card-compact {
    padding: 8px 12px;
  }
  .progress-bars-compact .progress-item {
    margin-bottom: 3px;
  }
  .progress-bars-compact .progress-header {
    margin-bottom: 1px;
  }
  .progress-label,
  .progress-value {
    font-size: 9px;
  }
  .progress-track {
    height: 3px;
  }

  /* Compact legend */
  .legend-row {
    margin-bottom: 10px;
    gap: 12px;
    break-inside: avoid;
  }
  .leg-item {
    font-size: 9px;
  }
  .leg-dot {
    width: 5px;
    height: 5px;
  }

  /* Compact table */
  .week-block {
    break-inside: auto;
    margin-bottom: 16px;
  }
  .week-block-header {
    padding: 8px 0 6px;
  }
  .week-num {
    font-size: 20px;
  }
  .week-name {
    font-size: 12px;
  }
  .week-count-badge {
    font-size: 8px;
  }
  .week-dates-card {
    font-size: 9px;
    padding: 4px 10px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .week-block table thead {
    display: table-header-group;
  }
  table {
    font-size: 9px;
    table-layout: fixed;
    width: 100%;
  }
  th, td {
    padding: 5px 8px;
  }
  th {
    font-size: 8px;
  }
  .td-date,
  .td-sku,
  .td-type {
    font-size: 9px;
  }
  .td-name {
    font-size: 10px;
  }
  .col-chip {
    font-size: 8px;
    padding: 1px 4px;
  }
  .status-pill {
    font-size: 7px;
    padding: 2px 6px;
  }

  .report-footer {
    margin-top: 16px;
    padding: 12px 0;
    font-size: 8px;
  }

  @page {
    margin: 12mm 10mm 10mm;
    size: A4 portrait;
  }
}
</style>
