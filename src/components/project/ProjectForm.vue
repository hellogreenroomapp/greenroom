<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div>
      <label class="block text-sm font-medium text-text mb-1.5">Collection Name</label>
      <input
        v-model="formData.name"
        type="text"
        required
        class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        placeholder="Spring 2026 Collection"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-text mb-1.5">Season</label>
      <select
        v-model="formData.season"
        class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      >
        <option value="spring">Spring</option>
        <option value="summer">Summer</option>
        <option value="fall">Fall</option>
        <option value="winter">Winter</option>
        <option value="evergreen">Evergreen</option>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-text mb-1.5">Year</label>
      <input
        v-model.number="formData.year"
        type="number"
        required
        :min="new Date().getFullYear() - 1"
        :max="new Date().getFullYear() + 1"
        class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Start Date</label>
        <span class="block text-xs italic text-muted font-normal mb-1">(optional)</span>
        <input
          v-model="formData.startDate"
          type="date"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">End Date</label>
        <span class="block text-xs italic text-muted font-normal mb-1">(optional)</span>
        <input
          v-model="formData.endDate"
          type="date"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
      </div>
    </div>

  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Project } from '@/types'

const props = defineProps<{
  project?: Project | null
  brandId: string
}>()

const emit = defineEmits<{
  save: [data: Omit<Project, 'id' | 'createdAt'>]
  cancel: []
}>()

const formData = ref({
  name: '',
  season: 'spring' as Project['season'],
  year: new Date().getFullYear(),
  status: 'active' as Project['status'],
  startDate: '',
  endDate: '',
})

watch(
  () => props.project,
  (project) => {
    if (project) {
      formData.value = {
        name: project.name,
        season: project.season,
        year: project.year,
        status: project.status,
        startDate: project.startDate ? project.startDate.toDate().toISOString().split('T')[0] || '' : '',
        endDate: project.endDate ? project.endDate.toDate().toISOString().split('T')[0] || '' : '',
      }
    } else {
      formData.value = {
        name: '',
        season: 'spring',
        year: new Date().getFullYear(),
        status: 'active',
        startDate: '',
        endDate: '',
      }
    }
  },
  { immediate: true }
)

function handleSubmit() {
  if (!formData.value.name.trim()) return
  
  const submitData: Omit<Project, 'id' | 'createdAt'> = {
    name: formData.value.name,
    season: formData.value.season,
    year: formData.value.year,
    status: formData.value.status,
    brandId: props.brandId,
  }
  
  // Convert dates to Timestamps if provided
  if (formData.value.startDate) {
    submitData.startDate = Timestamp.fromDate(new Date(formData.value.startDate))
  }
  if (formData.value.endDate) {
    submitData.endDate = Timestamp.fromDate(new Date(formData.value.endDate))
  }
  
  emit('save', submitData)
}

function submit() {
  handleSubmit()
}

defineExpose({
  submit,
})
</script>
