<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Your Brands</h1>
        <button
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          @click="showCreateModal = true"
        >
          Create Brand
        </button>
      </div>

      <div v-if="brandStore.loading" class="text-center py-12">
        <p class="text-gray-500">Loading brands...</p>
      </div>

      <div v-else-if="brandStore.brands.length === 0" class="text-center py-12">
        <p class="text-gray-500 mb-4">No brands yet. Create your first brand to get started!</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="brand in brandStore.brands"
          :key="brand.id"
          class="bg-card rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
          @click="selectBrand(brand.id)"
        >
          <h2 class="text-xl font-semibold text-gray-900 mb-2">{{ brand.name }}</h2>
          <p class="text-sm text-gray-500">{{ brand.slug }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBrandStore } from '@/stores/brand'

const router = useRouter()
const authStore = useAuthStore()
const brandStore = useBrandStore()

const showCreateModal = ref(false)

onMounted(async () => {
  if (authStore.userId) {
    await brandStore.fetchBrands(authStore.userId)
  }
})

function selectBrand(brandId: string) {
  brandStore.selectBrand(brandId)
  router.push({ name: 'pipeline', params: { brandId } })
}
</script>
