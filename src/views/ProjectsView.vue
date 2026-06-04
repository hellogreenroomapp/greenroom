<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
      <h2 class="text-xl sm:text-2xl font-semibold text-text">Collections</h2>
      <button
        class="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        @click="showCreateModal = true"
      >
        New Collection
      </button>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <button
        v-for="statusOption in statusOptions"
        :key="statusOption.value"
        class="px-3 py-1.5 text-xs sm:text-sm border rounded-md transition-colors"
        :class="
          filterStatus === statusOption.value
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-card border-border text-text hover:bg-bg'
        "
        @click="filterStatus = statusOption.value"
      >
        {{ statusOption.label }}
      </button>
    </div>

    <div v-if="loading" class="py-12">
      <LoadingSpinner />
    </div>

    <div v-else-if="filteredProjects.length === 0" class="py-12">
      <EmptyState
        title="No collections found"
        description="Create your first collection to get started."
      >
        <template #action>
          <button
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            @click="showCreateModal = true"
          >
            Create Collection
          </button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="bg-card border border-border rounded-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-bg border-b border-border">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Collection Name</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Season</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Year</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Products</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            class="cursor-pointer transition-colors hover:bg-bg bg-amber-50/40"
            @click="handleUnassignedClick"
          >
            <td class="px-6 py-5">
              <div class="text-sm font-semibold text-text">No collection</div>
              <div class="text-xs text-muted mt-0.5">Assign a collection from the product editor</div>
            </td>
            <td class="px-6 py-5">
              <span class="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800">
                Unassigned
              </span>
            </td>
            <td class="px-6 py-5">
              <span class="text-sm text-muted">—</span>
            </td>
            <td class="px-6 py-5">
              <span class="text-sm text-muted">—</span>
            </td>
            <td class="px-6 py-5">
              <div class="flex items-center text-sm text-muted">
                <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>
                  {{ unassignedCount }}
                  {{ unassignedCount === 1 ? 'product' : 'products' }}
                </span>
              </div>
            </td>
          </tr>
          <tr
            v-for="project in filteredProjects"
            :key="project.id"
            class="cursor-pointer transition-colors hover:bg-bg"
            @click="handleProjectClick(project.id)"
          >
            <td class="px-6 py-5">
              <div class="text-sm font-semibold text-text">{{ project.name }}</div>
            </td>
            <td class="px-6 py-5">
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
            </td>
            <td class="px-6 py-5">
              <span class="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded capitalize">
                {{ getSeasonLabel(project.season) }}
              </span>
            </td>
            <td class="px-6 py-5">
              <span class="text-sm text-text">{{ project.year }}</span>
            </td>
            <td class="px-6 py-5">
              <div class="flex items-center text-sm text-muted">
                <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>{{ getProductCount(project.id) }} {{ getProductCount(project.id) === 1 ? 'product' : 'products' }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :is-open="showCreateModal" title="New Collection" size="lg" @close="handleCloseModal">
      <ProjectForm
        ref="projectFormRef"
        :brand-id="brandId"
        @save="handleCreateProject"
        @cancel="handleCloseModal"
      />
      <template #footer>
        <button
          class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
          @click="handleCloseModal"
        >
          Cancel
        </button>
        <button
          class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          @click="projectFormRef?.submit()"
        >
          Create Collection
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBrandStore } from '@/stores/brand'
import { useProject } from '@/composables/useProject'
import { useProducts } from '@/composables/useProducts'
import { useToast } from '@/composables/useToast'
import ProjectForm from '@/components/project/ProjectForm.vue'
import Modal from '@/components/common/Modal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Project } from '@/types'
import { UNASSIGNED_COLLECTION_ID } from '@/constants/collections'
import { productHasCollection } from '@/utils/dates'
import { getProductsByBrand } from '@/firebase/firestore'

const router = useRouter()

const brandStore = useBrandStore()
const { projects, loading, fetchProjects, createProject } = useProject()
useProducts()
const toast = useToast()

const brandId = computed(() => brandStore.brandId || '')
const showCreateModal = ref(false)
const filterStatus = ref<'all' | 'active' | 'archived'>('all')
const productCounts = ref<Record<string, number>>({})
const unassignedCount = ref(0)
const projectFormRef = ref<InstanceType<typeof ProjectForm> | null>(null)

const statusOptions: Array<{ value: 'all' | 'active' | 'archived'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

const filteredProjects = computed(() => {
  console.log('filteredProjects computed - projects:', projects.value.length, 'filter:', filterStatus.value)
  if (filterStatus.value === 'all') {
    const result = projects.value
    console.log('Returning all projects:', result.length)
    return result
  }
  const result = projects.value.filter((p: Project) => p.status === filterStatus.value)
  console.log('Filtered projects:', result.length)
  return result
})

async function loadProjects() {
  if (brandId.value) {
    try {
      await fetchProjects(brandId.value)
      await loadProductCounts()
    } catch (error: any) {
      toast.error(error.message || 'Failed to load projects')
    }
  }
}

watch(brandId, async (newBrandId) => {
  if (newBrandId) {
    await loadProjects()
  } else {
    projects.value = []
    productCounts.value = {}
  }
}, { immediate: true })

onMounted(async () => {
  if (brandId.value) {
    await loadProjects()
  }
})

async function loadProductCounts() {
  if (!brandId.value) return

  try {
    const allProducts = await getProductsByBrand(brandId.value)
    const active = allProducts.filter((p) => !p.archived)
    unassignedCount.value = active.filter((p) => !productHasCollection(p)).length
    const counts: Record<string, number> = {}
    for (const project of projects.value) {
      counts[project.id] = active.filter((p) => p.projectId === project.id).length
    }
    productCounts.value = counts
  } catch (error) {
    console.error('Failed to load product counts:', error)
    unassignedCount.value = 0
    productCounts.value = {}
  }
}

function getProductCount(projectId: string): number {
  return productCounts.value[projectId] || 0
}

function getSeasonLabel(season: Project['season']): string {
  const labels: Record<Project['season'], string> = {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
    evergreen: 'Evergreen',
  }
  return labels[season] || season
}

async function handleCreateProject(projectData: Omit<Project, 'id' | 'createdAt'>) {
  try {
    if (!brandId.value) {
      toast.error('Please select a brand first')
      return
    }
    // Ensure brandId is set in projectData
    const projectDataWithBrand = {
      ...projectData,
      brandId: brandId.value,
    }
    console.log('handleCreateProject called with:', projectDataWithBrand)
    console.log('Current projects before create:', projects.value.length)
    
    const projectId = await createProject(projectDataWithBrand)
    console.log('Project created, ID:', projectId)
    console.log('Current projects after create:', projects.value.length, projects.value)
    
    // createProject already calls fetchProjects internally, but reload counts
    await loadProductCounts()
    showCreateModal.value = false
    toast.success('Collection created successfully')
  } catch (error: any) {
    console.error('Failed to create project:', error)
    toast.error(error.message || 'Failed to create project')
  }
}

function handleCloseModal() {
  showCreateModal.value = false
  // Reset form by clearing the ref
  projectFormRef.value = null
}

function handleProjectClick(projectId: string) {
  router.push({ name: 'collection-detail', params: { id: projectId } })
}

function handleUnassignedClick() {
  router.push({ name: 'collection-detail', params: { id: UNASSIGNED_COLLECTION_ID } })
}
</script>
