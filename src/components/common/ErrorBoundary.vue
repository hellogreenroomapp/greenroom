<template>
  <div v-if="hasError" class="min-h-screen flex items-center justify-center bg-bg p-4">
    <div class="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
      <svg
        class="mx-auto h-12 w-12 text-red-500 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h2 class="text-xl font-semibold text-text mb-2">Something went wrong</h2>
      <p class="text-sm text-muted mb-4">{{ errorMessage }}</p>
      <button
        class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        @click="handleReset"
      >
        Try Again
      </button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((err: Error) => {
  hasError.value = true
  errorMessage.value = err.message || 'An unexpected error occurred'
  console.error('Error caught by boundary:', err)
  return false
})

function handleReset() {
  hasError.value = false
  errorMessage.value = ''
  window.location.reload()
}
</script>
