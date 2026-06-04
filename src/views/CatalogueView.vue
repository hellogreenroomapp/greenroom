<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h2 class="text-xl sm:text-2xl font-semibold text-text">Catalogue</h2>
        <p class="text-sm text-muted mt-1">Products grouped by SKU</p>
      </div>
      <div v-if="!loading && catalogueProducts.length > 0" class="text-sm text-muted">
        {{ catalogueProducts.length }} product{{ catalogueProducts.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>

    <div v-else-if="catalogueProducts.length === 0" class="bg-card border border-border rounded-lg p-12">
      <EmptyState
        title="No products yet"
        description="Create products to see them grouped by SKU in the catalogue."
      />
    </div>

    <div v-else class="bg-card border border-border rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-bg border-b border-border">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                SKU
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Category
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Colors
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Variants
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="product in catalogueProducts"
              :key="product.sku"
              class="hover:bg-bg transition-colors cursor-pointer"
              @click="handleProductClick(product)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-text">{{ product.sku }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-text">{{ product.name }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-muted">{{ product.category }}</span>
              </td>
              <td class="px-6 py-4">
                <div v-if="product.colors.length > 0" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="color in product.colors"
                    :key="color.name"
                    class="inline-flex items-center px-2 py-1 text-xs rounded border"
                    :class="color.complete
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-bg text-muted border-border'"
                  >
                    <span v-if="color.complete" class="mr-1">✓</span>
                    {{ color.name }}
                  </span>
                </div>
                <span v-else class="text-sm text-muted">No colors</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-muted">
                  {{ product.totalVariants }} variant{{ product.totalVariants !== 1 ? 's' : '' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col gap-1">
                  <span
                    v-for="variant in product.variants"
                    :key="variant.id"
                    class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded"
                    :class="getStageColorClass(variant.stage)"
                  >
                    {{ STAGE_LABELS[variant.stage] }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useProducts } from '@/composables/useProducts'
import { useBrandStore } from '@/stores/brand'
import { groupProductsBySku, type CatalogueProduct } from '@/utils/catalogue'
import { STAGE_LABELS } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const brandStore = useBrandStore()
const { products, loading, fetchProducts } = useProducts()

const brandId = computed(() => brandStore.brandId)

const catalogueProducts = computed((): CatalogueProduct[] => {
  if (!products.value.length) return []
  
  const grouped = groupProductsBySku(products.value)
  return Array.from(grouped.values()).sort((a: CatalogueProduct, b: CatalogueProduct) => 
    a.sku.localeCompare(b.sku)
  )
})

function getStageColorClass(stage: string): string {
  const stageColors: Record<string, string> = {
    warehouse: 'bg-[#a8d5ba] text-[#156645]',
    photo_queue: 'bg-[#ffd9a0] text-[#8b5a00]',
    in_shoot: 'bg-[#f8b4b4] text-[#8b0000]',
    editing: 'bg-[#b4c7f8] text-[#1e3a8a]',
    staged: 'bg-[#d4b4f8] text-[#5b21b6]',
    live: 'bg-[#4ade80] text-[#14532d]',
  }
  return stageColors[stage] || 'bg-bg text-muted'
}

function handleProductClick(product: CatalogueProduct) {
  // TODO: Could open a modal showing all variants, or navigate to pipeline filtered by SKU
  console.log('Clicked product:', product)
}

watch(brandId, (newBrandId) => {
  if (newBrandId) {
    fetchProducts(newBrandId)
  }
}, { immediate: true })

onMounted(() => {
  if (brandId.value) {
    fetchProducts(brandId.value)
  }
})
</script>
