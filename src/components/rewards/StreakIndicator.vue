<template>
  <div class="flex items-center gap-1.5">
    <span
      class="text-lg"
      :class="{
        'opacity-100': isActive,
        'opacity-60': !isActive,
        'animate-pulse': streak >= 7,
      }"
    >
      🔥
    </span>
    <span
      class="text-sm font-medium"
      :class="{
        'text-text': isActive,
        'text-muted': !isActive,
      }"
    >
      {{ streak }} day{{ streak !== 1 ? 's' : '' }}
    </span>
    <span v-if="!isActive" class="text-xs text-muted">Log in to continue!</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  streak: number
  isActive: boolean
}>()
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
