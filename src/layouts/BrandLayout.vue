<template>
  <div class="min-h-screen bg-gray-50 flex">
    <AppSidebar />
    <div class="flex-1 flex flex-col">
      <AppHeader
        :title="brandStore.currentBrand?.name || 'Brand'"
        :show-logout="true"
        @logout="handleLogout"
      />
      <main class="flex-1 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBrandStore } from '@/stores/brand'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const brandStore = useBrandStore()
const authStore = useAuthStore()

const brandId = computed(() => route.params.brandId as string)

onMounted(async () => {
  await brandStore.selectBrand(brandId.value)
})

async function handleLogout() {
  await authStore.logout()
  // logout() in store will handle redirect via window.location.href
}
</script>
