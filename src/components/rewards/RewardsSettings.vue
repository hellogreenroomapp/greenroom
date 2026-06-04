<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold text-text mb-4">Rewards Preferences</h3>
      <p class="text-sm text-muted mb-6">
        Customize how rewards are displayed and celebrated in your workspace.
      </p>
    </div>

    <div class="space-y-4">
      <!-- Show Point Toasts -->
      <div class="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
        <div class="flex-1">
          <label class="text-sm font-medium text-text">Show Point Toasts</label>
          <p class="text-xs text-muted mt-1">
            Display notifications when you earn points for actions
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            v-model="settings.showPointToasts"
            type="checkbox"
            class="sr-only peer"
            @change="saveSettings"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1B7F56]"></div>
        </label>
      </div>

      <!-- Show Level Up Celebrations -->
      <div class="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
        <div class="flex-1">
          <label class="text-sm font-medium text-text">Show Level Up Celebrations</label>
          <p class="text-xs text-muted mt-1">
            Display celebration modal when you unlock a new badge tier
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            v-model="settings.showLevelUpCelebrations"
            type="checkbox"
            class="sr-only peer"
            @change="saveSettings"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1B7F56]"></div>
        </label>
      </div>

      <!-- Show Badges on Profile -->
      <div class="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
        <div class="flex-1">
          <label class="text-sm font-medium text-text">Show Badges on Profile</label>
          <p class="text-xs text-muted mt-1">
            Display your badges next to your name in comments and assignments
          </p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            v-model="settings.showBadgesOnProfile"
            type="checkbox"
            class="sr-only peer"
            @change="saveSettings"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1B7F56]"></div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface RewardsSettings {
  showPointToasts: boolean
  showLevelUpCelebrations: boolean
  showBadgesOnProfile: boolean
}

const authStore = useAuthStore()

const settings = ref<RewardsSettings>({
  showPointToasts: true,
  showLevelUpCelebrations: true,
  showBadgesOnProfile: true,
})

const STORAGE_KEY = 'rewardsSettings'

function loadSettings() {
  if (!authStore.user) return
  
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${authStore.user.uid}`)
    if (stored) {
      settings.value = { ...settings.value, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Error loading rewards settings:', error)
  }
}

function saveSettings() {
  if (!authStore.user) return
  
  try {
    localStorage.setItem(`${STORAGE_KEY}_${authStore.user.uid}`, JSON.stringify(settings.value))
    // Emit event for components to listen to
    window.dispatchEvent(new CustomEvent('rewardsSettingsChanged', { detail: settings.value }))
  } catch (error) {
    console.error('Error saving rewards settings:', error)
  }
}

onMounted(() => {
  loadSettings()
})
</script>
