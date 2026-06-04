<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      <TransitionGroup name="point-toast-list">
        <PointToast
          v-for="toast in visibleToasts"
          :key="toast.id"
          :transaction="toast.transaction"
          :visible="true"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRewards } from '@/composables/useRewards'
import PointToast from './PointToast.vue'
import type { PointTransaction } from '@/types/rewards'

interface QueuedToast {
  id: string
  transaction: PointTransaction
  timer: ReturnType<typeof setTimeout>
}

const rewards = useRewards()
const toastQueue = ref<QueuedToast[]>([])

const visibleToasts = computed(() => toastQueue.value)

function addToast(transaction: PointTransaction) {
  const id = `toast-${Date.now()}-${Math.random()}`
  
  // Auto-dismiss after 3 seconds
  const timer = setTimeout(() => {
    removeToast(id)
  }, 3000)
  
  toastQueue.value.push({ id, transaction, timer })
  
  // Limit to 3 visible toasts
  if (toastQueue.value.length > 3) {
    const oldest = toastQueue.value.shift()
    if (oldest) {
      clearTimeout(oldest.timer)
    }
  }
}

function removeToast(id: string) {
  const index = toastQueue.value.findIndex((t) => t.id === id)
  if (index !== -1) {
    const toast = toastQueue.value[index]
    if (toast) {
      clearTimeout(toast.timer)
      toastQueue.value.splice(index, 1)
    }
  }
}

// Watch for new transactions
watch(
  () => rewards.recentTransaction.value,
  (transaction) => {
    if (transaction) {
      addToast(transaction)
      // Clear the transaction after a short delay to allow for new ones
      setTimeout(() => {
        rewards.clearRecentTransaction()
      }, 100)
    }
  }
)

onUnmounted(() => {
  // Clean up all timers
  toastQueue.value.forEach((toast) => {
    clearTimeout(toast.timer)
  })
  toastQueue.value = []
})
</script>

<style scoped>
.point-toast-list-enter-active {
  transition: all 0.3s ease-out;
}

.point-toast-list-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.point-toast-list-leave-active {
  transition: all 0.2s ease-in;
}

.point-toast-list-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.point-toast-list-move {
  transition: transform 0.3s ease;
}
</style>
