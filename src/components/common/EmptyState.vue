<template>
  <div class="text-center py-12 px-4">
    <div v-if="icon" class="mx-auto text-muted mb-4 animate-fade-in">
      <component :is="icon" class="h-12 w-12 mx-auto opacity-50" />
    </div>
    <h3 class="text-lg font-medium text-text mb-2">{{ title }}</h3>
    <p class="text-sm text-muted mb-6 max-w-md mx-auto">{{ description }}</p>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon?: any
}>()
</script>
