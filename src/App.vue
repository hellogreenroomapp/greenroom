<template>
  <ErrorBoundary>
    <div id="app" class="min-h-screen" :class="isAuthRoute ? 'bg-bg' : ''">
      <template v-if="isAuthRoute">
        <RouterView v-slot="{ Component, route }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </template>
      <template v-else>
        <div class="flex h-screen overflow-hidden">
          <AppSidebar />
          <div class="flex-1 flex flex-col overflow-hidden">
            <AppHeader />
            <main class="flex-1 overflow-y-auto bg-bg p-6">
              <RouterView v-slot="{ Component, route }">
                <Transition name="fade" mode="out-in">
                  <component :is="Component" :key="route.path" />
                </Transition>
              </RouterView>
            </main>
          </div>
        </div>
      </template>
      <Toast />
      <PointToastContainer v-if="authStore.isAuthenticated" />
      <LevelUpModal
        v-if="authStore.isAuthenticated"
        :visible="!!rewards.levelUpEvent.value"
        :category="rewards.levelUpEvent.value?.category || ''"
        :tier="rewards.levelUpEvent.value?.newTier || 0"
        :badge-name="rewards.levelUpEvent.value?.badgeName || ''"
        @close="rewards.clearLevelUpEvent()"
      />
      <OfflineIndicator />
      <FirebaseSetupCheck />
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBrandStore } from '@/stores/brand'
import { useAuthStore } from '@/stores/auth'
import { useRewards } from '@/composables/useRewards'
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import Toast from '@/components/common/Toast.vue'
import PointToastContainer from '@/components/rewards/PointToastContainer.vue'
import LevelUpModal from '@/components/rewards/LevelUpModal.vue'
import OfflineIndicator from '@/components/common/OfflineIndicator.vue'
import FirebaseSetupCheck from '@/components/common/FirebaseSetupCheck.vue'

const route = useRoute()
const router = useRouter()
const brandStore = useBrandStore()
const authStore = useAuthStore()
const rewards = useRewards()

const isAuthRoute = computed(() => {
  const routeName = route.name as string
  const path = route.path
  return ['home', 'login', 'signup', 'invite-accept'].includes(routeName) || 
         path === '/' ||
         path.startsWith('/login') || 
         path.startsWith('/signup') || 
         path.startsWith('/invite/')
})

// Fetch brands after auth is fully ready (token + profile loaded)
watch(
  () => [authStore.loading, authStore.isAuthenticated, authStore.userId] as const,
  async ([authLoading, isAuthenticated, userId]) => {
    if (authLoading || !isAuthenticated || !userId || brandStore.brands.length > 0) return
    try {
      await brandStore.fetchBrands(userId)
    } catch (error) {
      console.error('Failed to fetch brands on auth:', error)
    }
  },
  { immediate: true }
)

// Redirect authenticated users from home page to dashboard
watch(
  () => [authStore.loading, authStore.isAuthenticated, route.name],
  ([authLoading, isAuth, routeName]) => {
    if (
      !authLoading &&
      isAuth &&
      routeName === 'home'
    ) {
      // Redirect authenticated users from home to dashboard
      router.push('/dashboard')
    }
  },
  { immediate: true }
)

// Check daily login for rewards when authenticated and brand is selected
watch(
  () => [authStore.isAuthenticated, brandStore.currentBrand?.id],
  async ([isAuth, brandId]) => {
    if (isAuth && brandId && authStore.user) {
      // Check daily login (non-blocking)
      try {
        await rewards.checkDailyLogin(brandId as string)
      } catch (error) {
        console.error('Error checking daily login:', error)
        // Don't show error to user for login check failures
      }
    }
  },
  { immediate: true }
)
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
