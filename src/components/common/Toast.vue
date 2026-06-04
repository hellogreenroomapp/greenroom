<template>
  <Teleport to="body">
    <TransitionGroup
      name="toast"
      tag="div"
      class="fixed top-4 right-4 z-50 space-y-2 pointer-events-none"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto max-w-sm w-full bg-card border border-border rounded-lg shadow-lg p-4 flex items-start gap-3"
        :class="{
          'border-emerald-200 bg-emerald-50': toast.type === 'success',
          'border-red-200 bg-red-50': toast.type === 'error',
          'border-yellow-200 bg-yellow-50': toast.type === 'warning',
          'border-blue-200 bg-blue-50': toast.type === 'info',
        }"
        role="alert"
        :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
      >
        <div
          class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
          :class="{
            'bg-emerald-100 text-emerald-600': toast.type === 'success',
            'bg-red-100 text-red-600': toast.type === 'error',
            'bg-yellow-100 text-yellow-600': toast.type === 'warning',
            'bg-blue-100 text-blue-600': toast.type === 'info',
          }"
        >
          <svg
            v-if="toast.type === 'success'"
            class="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else-if="toast.type === 'error'"
            class="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg
            v-else
            class="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-medium"
            :class="{
              'text-emerald-800': toast.type === 'success',
              'text-red-800': toast.type === 'error',
              'text-yellow-800': toast.type === 'warning',
              'text-blue-800': toast.type === 'info',
            }"
          >
            {{ toast.message }}
          </p>
        </div>
        <button
          class="flex-shrink-0 text-muted hover:text-text transition-colors"
          @click="removeToast(toast.id)"
          aria-label="Close notification"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const toasts = computed(() => toastStore.toasts)

function removeToast(id: string) {
  toastStore.removeToast(id)
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
