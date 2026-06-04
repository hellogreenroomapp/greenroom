<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-6">This Week</h2>
    <LiveThisWeek
      :products="thisWeekProducts"
      :loading="loading"
      @product-click="handleProductClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProducts } from '@/composables/useProducts'
import LiveThisWeek from '@/components/dashboard/LiveThisWeek.vue'

const route = useRoute()
const { products, loading, fetchProducts } = useProducts()

const brandId = route.params.brandId as string
const thisWeekProducts = computed(() => products.value)

onMounted(async () => {
  if (brandId) {
    await fetchProducts(brandId)
  }
})

function handleProductClick(productId: string) {
  // Navigate to product detail
  console.log('Product clicked:', productId)
}
</script>
