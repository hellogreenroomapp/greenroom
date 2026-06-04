<template>
  <div>
    <div v-if="loading" class="py-12">
      <LoadingSpinner />
    </div>
    <div v-else-if="projects.length === 0">
      <EmptyState
        title="No collections yet"
        description="Create your first collection to get started."
      >
        <template #action>
          <button
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            @click="$emit('create')"
          >
            Create Collection
          </button>
        </template>
      </EmptyState>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        @click="$emit('select', project.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Project } from '@/types'
import ProjectCard from './ProjectCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

defineProps<{
  projects: Project[]
  loading?: boolean
}>()

defineEmits<{
  create: []
  select: [projectId: string]
}>()
</script>
