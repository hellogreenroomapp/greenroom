<template>
  <div class="flex items-center justify-center" :class="containerClass" role="status" aria-label="Loading">
    <div
      class="animate-spin rounded-full border-2 border-border border-t-indigo-600"
      :class="spinnerClass"
      aria-hidden="true"
    ></div>
    <span v-if="message" class="ml-3 text-sm text-muted">{{ message }}</span>
    <span class="sr-only">Loading...</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string
    size?: 'sm' | 'md' | 'lg'
    containerClass?: string
  }>(),
  {
    size: 'md',
    containerClass: 'py-12',
  }
)

const spinnerClass = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}
</script>
