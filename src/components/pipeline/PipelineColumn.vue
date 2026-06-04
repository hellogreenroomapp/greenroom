<template>
  <div
    class="flex-shrink-0 w-full transition-colors"
    :class="[
      { 'bg-indigo-50': isDragOver },
      condensed ? 'sm:w-48' : 'sm:w-72'
    ]"
    @drop="handleDrop"
    @dragover.prevent="handleDragOver"
    @dragenter.prevent="handleDragEnter"
    @dragleave="handleDragLeave"
  >
    <div class="pb-3 mb-3 px-4 sm:px-0 sm:border-b sm:border-border">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: color }"
          ></div>
          <h3 class="text-sm font-semibold text-text">{{ columnLabel }}</h3>
        </div>
        <span class="px-2 py-1 text-xs font-medium bg-bg text-muted rounded">
          {{ products.length }}
        </span>
      </div>
      <p
        v-if="isShippedColumn"
        class="mt-1.5 text-[10px] text-muted leading-snug"
      >
        Drop here to record factory ship date (today)
      </p>
      <button
        v-if="canCombineSKUs"
        type="button"
        class="mt-2 w-full px-2 py-1 text-[10px] font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-200 transition-colors"
        @click="$emit('combine-skus', stageForCombine)"
      >
        Combine all SKUs
      </button>
    </div>

    <div
      class="min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide transition-colors px-2 sm:px-0"
      :class="{ 'bg-indigo-50': isDragOver }"
      role="region"
      :aria-label="`${columnLabel} column`"
    >
      <div v-if="products.length === 0" class="py-8 text-center">
        <p class="text-sm text-muted">No products</p>
      </div>
      <TransitionGroup name="product-move" tag="div">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :show-image="showImages"
          :condensed="condensed"
          @click="$emit('product-click', product.id)"
          @archive="$emit('archive', $event)"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Product } from '@/types'
import {
  FACTORY_SHIPPED_COLUMN,
  PIPELINE_COLUMN_LABELS,
  type PipelineColumnId,
} from '@/constants/pipeline'
import ProductCard from '@/components/product/ProductCard.vue'

const props = withDefaults(
  defineProps<{
    columnId: PipelineColumnId
    products: Product[]
    color: string
    showImages?: boolean
    condensed?: boolean
  }>(),
  {
    showImages: true,
    condensed: false,
  }
)

const emit = defineEmits<{
  drop: [productId: string, columnId: PipelineColumnId]
  'product-click': [productId: string]
  archive: [productId: string]
  'combine-skus': [stage: Product['stage']]
}>()

const isDragOver = ref(false)

const isShippedColumn = computed(() => props.columnId === FACTORY_SHIPPED_COLUMN)
const columnLabel = computed(() => PIPELINE_COLUMN_LABELS[props.columnId])
const stageForCombine = computed((): Product['stage'] =>
  props.columnId === FACTORY_SHIPPED_COLUMN ? 'samples' : props.columnId
)

const canCombineSKUs = computed(() => {
  if (isShippedColumn.value || props.products.length < 2) return false

  const skuGroups = new Map<string, Product[]>()
  props.products.forEach((product) => {
    const sku = product.sku
    if (!skuGroups.has(sku)) {
      skuGroups.set(sku, [])
    }
    skuGroups.get(sku)!.push(product)
  })

  return Array.from(skuGroups.values()).some((group) => group.length >= 2)
})

function handleDragEnter(event: DragEvent) {
  if (event.dataTransfer?.types.includes('text/plain')) {
    const productId = event.dataTransfer.getData('text/plain')
    if (productId && !props.products.some((p) => p.id === productId)) {
      isDragOver.value = true
    }
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragLeave(event: DragEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX
  const y = event.clientY

  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragOver.value = false
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false

  const productId = event.dataTransfer?.getData('text/plain')
  if (productId && !props.products.some((p) => p.id === productId)) {
    emit('drop', productId, props.columnId)
  }
}
</script>

<style scoped>
.product-move-enter-active {
  transition: all 0.3s ease;
}

.product-move-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.product-move-leave-active {
  transition: all 0.2s ease;
}

.product-move-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
