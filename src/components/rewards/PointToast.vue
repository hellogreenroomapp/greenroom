<template>
  <Transition name="point-toast">
    <div
      v-if="visible"
      class="pointer-events-auto max-w-sm w-full bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 border-l-4"
      :style="{ borderLeftColor: '#1B7F56' }"
      role="alert"
      aria-live="polite"
    >
      <div class="flex-shrink-0 text-2xl">{{ emoji }}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2">
          <span class="text-base font-bold text-text">{{ pointsText }}</span>
          <span class="text-sm text-muted">{{ reason }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PointTransaction } from '@/types/rewards'
import { REWARD_CATEGORIES } from '@/constants/badges'

const props = defineProps<{
  transaction: PointTransaction | null
  visible: boolean
}>()

const emoji = computed(() => {
  if (!props.transaction) return '🎉'
  return REWARD_CATEGORIES[props.transaction.category]?.emoji || '🎉'
})

const pointsText = computed(() => {
  if (!props.transaction) return '+0 pts'
  const points = props.transaction.points
  return `+${points} ${points === 1 ? 'pt' : 'pts'}`
})

const reason = computed(() => {
  return props.transaction?.reason || ''
})
</script>

<style scoped>
.point-toast-enter-active {
  transition: all 0.3s ease-out;
}

.point-toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.point-toast-leave-active {
  transition: all 0.2s ease-in;
}

.point-toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
