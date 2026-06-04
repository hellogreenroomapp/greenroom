<template>
  <div class="overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6 sm:overflow-x-auto" role="region" aria-label="Pipeline board">
    <div class="flex space-x-4 min-w-max sm:min-w-max pipeline-columns">
      <PipelineColumn
        v-for="columnId in columns"
        :key="columnId"
        :column-id="columnId"
        :products="productsByColumn[columnId] || []"
        :color="columnColor(columnId)"
        :show-images="showImages"
        :condensed="condensed"
        @drop="handleDrop"
        @product-click="$emit('product-click', $event)"
        @archive="$emit('archive', $event)"
        @combine-skus="$emit('combine-skus', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types'
import { productHasGoLiveDate } from '@/utils/dates'
import {
  PIPELINE_BOARD_COLUMNS,
  columnColor,
  productBelongsInColumn,
  type PipelineColumnId,
} from '@/constants/pipeline'
import PipelineColumn from './PipelineColumn.vue'

const props = withDefaults(
  defineProps<{
    products: Product[]
    showImages?: boolean
    condensed?: boolean
  }>(),
  {
    showImages: true,
    condensed: false,
  }
)

const emit = defineEmits<{
  'column-drop': [productId: string, columnId: PipelineColumnId]
  'product-click': [productId: string]
  archive: [productId: string]
  'combine-skus': [stage: Product['stage']]
}>()

const columns = PIPELINE_BOARD_COLUMNS

const productsByColumn = computed(() => {
  const grouped = Object.fromEntries(
    columns.map((id) => [id, [] as Product[]])
  ) as Record<PipelineColumnId, Product[]>

  props.products.forEach((product) => {
    for (const columnId of columns) {
      if (productBelongsInColumn(product, columnId)) {
        grouped[columnId].push(product)
        break
      }
    }
  })

  columns.forEach((columnId) => {
    grouped[columnId].sort((a, b) => {
      const priorityOrder: Record<Product['priority'], number> = {
        high: 0,
        medium: 1,
        low: 2,
      }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff

      const noDateA = productHasGoLiveDate(a) ? 0 : 1
      const noDateB = productHasGoLiveDate(b) ? 0 : 1
      if (noDateA !== noDateB) return noDateA - noDateB

      const dateA = productHasGoLiveDate(a) ? a.goLiveDate!.toMillis() : Number.MAX_SAFE_INTEGER
      const dateB = productHasGoLiveDate(b) ? b.goLiveDate!.toMillis() : Number.MAX_SAFE_INTEGER
      return dateA - dateB
    })
  })

  return grouped
})

function handleDrop(productId: string, columnId: PipelineColumnId) {
  emit('column-drop', productId, columnId)
}
</script>
