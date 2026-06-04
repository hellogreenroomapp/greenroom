<template>
  <div
    v-if="showWarning"
    class="fixed bottom-4 right-4 max-w-md bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 z-50"
    role="alert"
  >
    <div class="flex items-start gap-3">
      <svg
        class="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
      <div class="flex-1">
        <h3 class="text-sm font-semibold text-yellow-800 mb-1">Firebase Not Configured</h3>
        <p class="text-xs text-yellow-700 mb-2">
          Please set up Firebase to use the app. See <code class="bg-yellow-100 px-1 rounded">FIREBASE_QUICK_START.md</code> for instructions.
        </p>
        <a
          href="https://console.firebase.google.com/"
          target="_blank"
          class="text-xs text-yellow-800 underline hover:text-yellow-900"
        >
          Open Firebase Console →
        </a>
      </div>
      <button
        class="text-yellow-600 hover:text-yellow-800"
        @click="dismiss"
        aria-label="Dismiss"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showWarning = ref(false)

onMounted(() => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  
  if (!apiKey || !projectId || apiKey.includes('your-') || projectId.includes('your-')) {
    const dismissed = sessionStorage.getItem('firebase-setup-dismissed')
    if (!dismissed) {
      showWarning.value = true
    }
  }
})

function dismiss() {
  showWarning.value = false
  sessionStorage.setItem('firebase-setup-dismissed', 'true')
}
</script>
