<template>
  <header class="bg-card border-b border-border h-16 flex items-center px-4 lg:px-6">
    <div class="flex items-center justify-between w-full">
      <div class="flex items-center gap-3">
        <button
          class="lg:hidden p-2 text-muted hover:text-text hover:bg-bg rounded-md transition-colors"
          aria-label="Toggle sidebar"
          @click="toggleSidebar"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div v-if="currentBrand?.logoUrl" class="hidden sm:block mr-3">
          <img :src="currentBrand.logoUrl" :alt="currentBrand.name" class="h-8 w-8 rounded" />
        </div>
        <h1 class="text-lg font-semibold text-text truncate">
          {{ currentBrand?.name || 'GreenRoom' }}
        </h1>
      </div>

      <div class="flex items-center space-x-4">
        <div class="relative" v-click-outside="closeDropdown">
          <button
            class="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            :aria-expanded="showDropdown"
            aria-haspopup="true"
            aria-label="User menu"
            @click="showDropdown = !showDropdown"
          >
            <div class="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
              <img
                v-if="authStore.userProfile?.avatarUrl"
                :src="authStore.userProfile.avatarUrl"
                :alt="userDisplayName"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-sm font-medium text-indigo-700">
                {{ userInitials }}
              </span>
            </div>
            <svg
              class="h-4 w-4 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Transition name="dropdown">
            <div
              v-if="showDropdown"
              class="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg border border-border py-1 z-50"
            >
              <div class="px-4 py-2 border-b border-border">
                <p class="text-sm font-medium text-text">{{ userDisplayName }}</p>
                <p class="text-xs text-muted">{{ userEmail }}</p>
              </div>
              <router-link
                to="/settings"
                class="block px-4 py-2 text-sm text-text hover:bg-bg focus:outline-none focus:bg-bg"
                @click="closeDropdown"
              >
                Settings
              </router-link>
              <button
                class="block w-full text-left px-4 py-2 text-sm text-text hover:bg-bg focus:outline-none focus:bg-bg"
                @click="handleLogout"
              >
                Sign out
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBrandStore } from '@/stores/brand'
import { useUIStore } from '@/stores/ui'

const authStore = useAuthStore()
const brandStore = useBrandStore()
const uiStore = useUIStore()

const showDropdown = ref(false)

function toggleSidebar() {
  uiStore.toggleSidebar()
}

const currentBrand = computed(() => brandStore.currentBrand)
const userDisplayName = computed(() => authStore.userDisplayName || 'User')
const userEmail = computed(() => authStore.user?.email || '')

const userInitials = computed(() => {
  const name = userDisplayName.value
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name[0]?.toUpperCase() || 'U'
})

function closeDropdown() {
  showDropdown.value = false
}

function handleLogout() {
  closeDropdown()
  authStore.logout()
  // logout() in store will handle redirect via window.location.href
}

const vClickOutside = {
  mounted(el: any, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: any) {
    document.removeEventListener('click', el.clickOutsideEvent)
  },
}
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
