<template>
  <div
    class="bg-card border border-border rounded-lg p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:outline-none"
    role="button"
    tabindex="0"
    :aria-label="`Collection: ${project.name}`"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="flex justify-between items-start mb-3">
      <h3 class="text-lg font-semibold text-text">{{ project.name }}</h3>
      <span
        class="px-2 py-1 text-xs font-medium rounded capitalize"
        :class="
          project.status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        "
      >
        {{ project.status }}
      </span>
    </div>

    <div class="flex items-center space-x-3 mb-3">
      <span class="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded capitalize">
        {{ seasonLabel }}
      </span>
      <span class="text-sm text-muted">{{ project.year }}</span>
    </div>

    <div v-if="productCount && productCount > 0" class="flex items-center text-sm text-muted">
      <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <span>{{ productCount }} {{ productCount === 1 ? 'product' : 'products' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '@/types'

const props = defineProps<{
  project: Project
  productCount?: number
}>()

defineEmits<{
  click: []
}>()

const seasonLabel = computed(() => {
  const labels: Record<Project['season'], string> = {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
    evergreen: 'Evergreen',
  }
  return labels[props.project.season] || props.project.season
})
</script>
