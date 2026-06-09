<template>
  <div>
    <!-- Single element root (no root-level comments either): the app's route
         <Transition mode="out-in"> can't animate fragment roots -->
    <slot v-if="isUnlocked" />

    <div v-else class="max-w-md mx-auto mt-16">
    <div class="bg-card border border-border rounded-xl p-8 text-center">
      <div
        class="mx-auto mb-4 h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center"
      >
        <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-text mb-1">Retention Reports are protected</h3>
      <p class="text-sm text-muted mb-6">
        Enter the password for {{ brandStore.currentBrand?.name || 'this brand' }} to view its
        reports.
      </p>

      <form class="space-y-3" @submit.prevent="handleUnlock">
        <input
          v-model="password"
          type="password"
          autocomplete="off"
          placeholder="Password"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          :class="{ 'border-red-400': error }"
          @input="error = ''"
        />
        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
        <button
          type="submit"
          class="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          :disabled="checking || !password"
        >
          {{ checking ? 'Checking…' : 'Unlock' }}
        </button>
      </form>

      <p class="text-xs text-muted mt-5">
        Don't have the password? Ask the brand owner — it's managed in Settings.
      </p>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useRetentionLock } from '@/composables/useRetentionLock'

const brandStore = useBrandStore()
const { isUnlocked, unlock } = useRetentionLock()

const password = ref('')
const error = ref('')
const checking = ref(false)

async function handleUnlock() {
  if (!password.value) return
  checking.value = true
  try {
    const ok = await unlock(password.value)
    if (!ok) {
      error.value = 'Incorrect password. Please try again.'
      password.value = ''
    }
  } finally {
    checking.value = false
  }
}
</script>
