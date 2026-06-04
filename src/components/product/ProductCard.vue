<template>
  <div
    class="product-card border border-border rounded-lg cursor-grab transition-all duration-200 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 relative group mb-2.5"
    :class="[
      condensed ? 'p-2' : 'p-3',
      { 'bg-red-50': condensed && product.priority === 'high' && hasGoLiveDate },
      { 'border-amber-300 bg-amber-50/60': !hasGoLiveDate },
      { 'border-orange-300 bg-orange-50/50': pastExFactoryAwaitingShip && hasGoLiveDate },
    ]"
    draggable="true"
    role="button"
    tabindex="0"
    :aria-label="`Product: ${product.name}`"
    @click="$emit('click')"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <span
      v-if="showShippedBadge"
      class="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded bg-sky-100 text-sky-900 border border-sky-200"
    >
      Shipped
    </span>
    <span
      v-else-if="pastExFactoryAwaitingShip"
      class="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide rounded bg-orange-100 text-orange-900 border border-orange-200"
    >
      Past ex-factory
    </span>
    <span
      v-else-if="!hasGoLiveDate"
      class="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded bg-amber-100 text-amber-800 border border-amber-200"
    >
      No live date
    </span>

    <!-- Condensed View: Only name, colors, SKU, and go live date -->
    <template v-if="condensed">
      <div
        :class="{
          'pt-[18px]': pastExFactoryAwaitingShip,
          'pt-4': showShippedBadge || (!hasGoLiveDate && !pastExFactoryAwaitingShip),
        }"
      >
        <h4 
          class="text-xs font-semibold line-clamp-2 mb-1"
          :class="product.gender === 'womens' ? 'text-blue-600' : 'text-text'"
        >
          {{ product.name }}<span v-if="colorDisplay" class="text-muted font-normal"> - {{ colorDisplay }}</span>
        </h4>
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] text-muted truncate">
            SKU: {{ product.sku }}<span v-if="product.orderId"> · {{ product.orderId }}</span>
          </p>
          <p
            class="text-[10px] font-medium whitespace-nowrap"
            :class="hasGoLiveDate ? 'text-orange-700' : 'text-amber-700'"
          >
            {{ goLiveDateLabel }}
          </p>
        </div>
        <p
          v-if="product.tentativeExFactoryDate || product.factoryShipDate"
          class="text-[10px] text-muted mt-0.5 truncate"
        >
          <span v-if="product.tentativeExFactoryDate">Ex-factory {{ formatDateShort(product.tentativeExFactoryDate) }}</span>
          <span v-if="product.tentativeExFactoryDate && product.factoryShipDate"> · </span>
          <span v-if="product.factoryShipDate">Ship {{ formatDateShort(product.factoryShipDate) }}</span>
        </p>
        <p
          v-if="product.ecommAssetsComplete"
          class="text-[10px] font-medium text-emerald-700 mt-0.5 mb-1"
        >
          Assets complete (ecomm)
        </p>
        <p
          v-else-if="showNeedsEcommAssetsHint"
          class="text-[10px] text-muted mt-0.5 mb-1 italic"
        >
          Needs ecomm assets on arrival
        </p>
      </div>
    </template>

    <!-- Full View: Simplified design -->
    <template v-else>
      <!-- Archive Button (only for live products, shows on hover) -->
      <button
        v-if="product.stage === 'live'"
        type="button"
        class="absolute top-2 right-2 p-1.5 bg-card sm:bg-white border border-border rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 hover:border-blue-300 z-20"
        @click.stop="$emit('archive', product.id)"
        :aria-label="product.archived ? 'Unarchive product' : 'Archive product'"
        title="Archive product"
      >
        <svg
          v-if="!product.archived"
          class="h-4 w-4 text-muted hover:text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <svg
          v-else
          class="h-4 w-4 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
        </svg>
      </button>

      <div
        class="space-y-2"
        :class="{
          'pt-[22px]': pastExFactoryAwaitingShip,
          'pt-5': showShippedBadge || (!hasGoLiveDate && !pastExFactoryAwaitingShip),
        }"
      >
        <!-- Product Name -->
        <div>
          <h4 
            class="text-sm font-semibold line-clamp-2"
            :class="product.gender === 'womens' ? 'text-blue-600' : 'text-text'"
          >
            {{ product.name }}
          </h4>
          <p v-if="colorDisplay" class="text-xs text-muted font-normal mt-0.5">
            {{ colorDisplay }}
          </p>
        </div>

        <!-- SKU, Collection, dates, order -->
        <div class="flex items-center gap-3 flex-wrap text-xs text-muted">
          <span>SKU: {{ product.sku }}</span>
          <span v-if="product.orderId" class="text-muted">•</span>
          <span v-if="product.orderId">Order: {{ product.orderId }}</span>
          <span v-if="collectionName" class="text-muted">•</span>
          <span v-if="collectionName">{{ collectionName }}</span>
          <span class="text-muted">•</span>
          <span
            class="font-medium"
            :class="hasGoLiveDate ? 'text-red-700' : 'text-amber-700'"
          >
            {{ goLiveDateLabel }}
          </span>
          <template v-if="product.tentativeExFactoryDate">
            <span class="text-muted">•</span>
            <span>Ex-factory {{ formatDateShort(product.tentativeExFactoryDate) }}</span>
          </template>
          <template v-if="product.factoryShipDate">
            <span class="text-muted">•</span>
            <span>Ship {{ formatDateShort(product.factoryShipDate) }}</span>
          </template>
        </div>

        <p
          v-if="product.ecommAssetsComplete"
          class="text-xs font-medium text-emerald-700 mb-1"
        >
          Assets complete (ecomm)
        </p>
        <p
          v-else-if="showNeedsEcommAssetsHint"
          class="text-xs text-muted mb-1 italic"
        >
          Needs ecomm assets on arrival
        </p>

        <!-- Tags -->
        <div v-if="product.tags && product.tags.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="tag in product.tags"
            :key="tag"
            class="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700 border border-indigo-200"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Product, Project } from '@/types'
import {
  formatDateShort,
  productHasGoLiveDate,
  productHasFactoryShipDate,
  isPastExFactoryAwaitingShip,
  isFactoryProductionStage,
} from '@/utils/dates'
import { getDoc } from '@/firebase/firestore'

const props = defineProps<{
  product: Product
  showImage?: boolean
  condensed?: boolean
}>()

const condensed = computed(() => props.condensed === true)

const emit = defineEmits<{
  click: []
  'drag-start': [event: DragEvent]
  'drag-end': [event: DragEvent]
  archive: [productId: string]
}>()


const hasGoLiveDate = computed(() => productHasGoLiveDate(props.product))
const pastExFactoryAwaitingShip = computed(() => isPastExFactoryAwaitingShip(props.product))
const showShippedBadge = computed(
  () =>
    isFactoryProductionStage(props.product.stage) &&
    productHasFactoryShipDate(props.product)
)

/** Hint when inbound but ecomm assets not done yet (sample shoot or production). */
const showNeedsEcommAssetsHint = computed(() => {
  if (props.product.ecommAssetsComplete) return false
  if (props.product.stage === 'live') return false
  return (
    isFactoryProductionStage(props.product.stage) ||
    productHasFactoryShipDate(props.product) ||
    props.product.stage === 'warehouse'
  )
})

const goLiveDateLabel = computed(() => {
  if (!hasGoLiveDate.value) return 'No live date'
  return `Live ${formatDateShort(props.product.goLiveDate!)}`
})


const colorDisplay = computed(() => {
  if (!props.product.colors || props.product.colors.length === 0) {
    return ''
  }
  
  if (props.product.colors.length <= 2) {
    // Show color names for 1-2 colors
    const colorNames = props.product.colors.map(c => c.name).join(', ')
    return `[${colorNames}]`
  } else {
    // Show count for 3+ colors
    return `${props.product.colors.length}+ colors`
  }
})

const collectionName = ref<string | null>(null)

onMounted(async () => {
  if (props.product.projectId) {
    const project = await getDoc<Project>('projects', props.product.projectId)
    if (project) {
      collectionName.value = project.name
    }
  }
})


function handleDragStart(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.product.id)
  }
  emit('drag-start', event)
}

function handleDragEnd(event: DragEvent) {
  emit('drag-end', event)
}

</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
