<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
    @click="uiStore.toggleSidebar()"
  ></div>
  <aside
    class="w-64 bg-card border-r border-border flex flex-col h-screen fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out overflow-visible"
    :class="{ '-translate-x-full lg:translate-x-0': !isOpen }"
    aria-label="Main navigation"
  >
    <div class="p-4 border-b border-border relative z-50">
      <BrandSelector />
    </div>

    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      <router-link
        v-for="link in navLinks"
        :key="link.name"
        :to="link.to"
        class="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        :class="
          $route.name === link.name
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-muted hover:text-text hover:bg-bg'
        "
        :aria-current="$route.name === link.name ? 'page' : undefined"
      >
        <span>{{ link.label }}</span>
        <span
          v-if="link.badge"
          class="nav-badge"
        >{{ link.badge }}</span>
      </router-link>
    </nav>

    <!-- Brand Callout -->
    <div class="p-4 border-t border-border">
      <button
        class="flex items-center space-x-2 w-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md p-2 -ml-2"
        aria-label="Greenroom"
      >
        <img
          :src="greenroomIcon"
          alt="Greenroom Icon"
          class="h-6 w-6 flex-shrink-0"
        />
        <img
          :src="greenroomLogo"
          alt="Greenroom"
          class="h-4 flex-shrink-0 mt-0.5"
        />
      </button>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BrandSelector from '@/components/brand/BrandSelector.vue'
import { useUIStore } from '@/stores/ui'
import greenroomIcon from '@/assets/greenroom_icon.svg'
import greenroomLogo from '@/assets/greenroom.svg'

const uiStore = useUIStore()

const isOpen = computed(() => uiStore.sidebarOpen)

const navLinks = [
  { name: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { name: 'pipeline', label: 'Pipeline', to: '/pipeline' },
  { name: 'calendar', label: 'Calendar', to: '/calendar' },
  { name: 'marketing', label: 'Marketing', to: '/marketing', badge: 'NEW' },
  { name: 'photo-queue', label: 'Photo Queue', to: '/photo-queue' },
  { name: 'projects', label: 'Collections', to: '/projects' },
  { name: 'catalogue', label: 'Catalogue', to: '/catalogue' },
  { name: 'launch-report', label: 'Report', to: '/reports/launch', badge: 'NEW' },
  { name: 'settings', label: 'Settings', to: '/settings' },
]
</script>

<style scoped>
.nav-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  background: linear-gradient(135deg, #0e7f55 0%, #1B7F56 100%);
  color: white;
  box-shadow: 0 1px 2px rgba(14, 127, 85, 0.3);
}
</style>
