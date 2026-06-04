<template>
  <Transition name="modal">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="$emit('close')"></div>
      
      <!-- Modal -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
        <!-- Confetti Container -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <div
            v-for="i in 30"
            :key="i"
            class="confetti"
            :style="getConfettiStyle(i)"
          ></div>
        </div>
        
        <!-- Content -->
        <div class="relative z-10">
          <!-- Header -->
          <h2 class="text-3xl font-bold text-text mb-4">🎉 LEVEL UP! 🎉</h2>
          
          <!-- Badge Emoji -->
          <div class="mb-4">
            <div class="text-6xl animate-bounce">{{ emoji }}</div>
          </div>
          
          <!-- Badge Name -->
          <h3 class="text-2xl font-bold text-text mb-2">You're now a {{ badgeName }}!</h3>
          
          <!-- Tier Indicator -->
          <p class="text-lg text-muted mb-6">Level {{ tier }} {{ emoji }}</p>
          
          <!-- Progress Message -->
          <p v-if="nextTierThreshold" class="text-sm text-muted mb-6">
            Keep going! {{ nextTierThreshold }} more points to {{ nextTierName }}
          </p>
          
          <!-- Button -->
          <button
            class="px-6 py-3 bg-[#1B7F56] text-white rounded-md font-medium hover:bg-[#155d42] transition-colors"
            @click="$emit('close')"
          >
            Nice!
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { REWARD_CATEGORIES, getBadgeName } from '@/constants/badges'
import type { RewardCategory } from '@/types/rewards'

const props = defineProps<{
  visible: boolean
  category: string
  tier: number
  badgeName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const emoji = computed(() => {
  return REWARD_CATEGORIES[props.category as RewardCategory]?.emoji || '🎉'
})

const nextTierThreshold = computed(() => {
  // This would need the current points to calculate, but for now we'll show a generic message
  // In a real implementation, you'd pass current points as a prop
  return null
})

const nextTierName = computed(() => {
  if (props.tier >= 5) return 'Max Level'
  const nextTier = props.tier + 1
  return getBadgeName(props.category as RewardCategory, nextTier)
})

function getConfettiStyle(index: number) {
  const colors = ['#1B7F56', '#22c55e', '#86efac', '#fbbf24', '#f59e0b']
  const color = colors[index % colors.length]
  const delay = Math.random() * 0.5
  const duration = 2 + Math.random() * 1
  const left = Math.random() * 100
  const size = 8 + Math.random() * 8
  
  return {
    position: 'absolute',
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    borderRadius: '50%',
    animation: `confetti-fall ${duration}s ${delay}s linear forwards`,
  }
}

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      // Auto-close after 5 seconds
      autoCloseTimer = setTimeout(() => {
        emit('close')
      }, 5000)
    } else if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      autoCloseTimer = null
    }
  }
)

onUnmounted(() => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
  }
})
</script>

<style scoped>
.modal-enter-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from {
  opacity: 0;
}

.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-leave-to {
  opacity: 0;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.animate-bounce {
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
</style>
