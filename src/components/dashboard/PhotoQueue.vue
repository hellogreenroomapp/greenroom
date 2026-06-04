<template>
  <div class="bg-card border border-border rounded-lg">
    <div class="p-4 border-b border-border">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-text">📸 This Week's Photo Queue</h3>
        <select
          v-if="photographers.length > 1"
          v-model="selectedPhotographer"
          class="px-3 py-1.5 text-sm bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Photographers</option>
          <option v-for="photographer in photographers" :key="photographer" :value="photographer">
            {{ photographer }}
          </option>
        </select>
      </div>
      <p v-if="groupedProducts.length > 0" class="text-sm text-muted">
        {{ totalProducts }} product{{ totalProducts !== 1 ? 's' : '' }} scheduled this week
      </p>
    </div>
    <div class="p-4">
      <div v-if="loading">
        <LoadingSpinner />
      </div>
      <div v-else-if="groupedProducts.length === 0">
        <EmptyState
          title="No products scheduled this week"
          description="All products are scheduled for later dates."
        />
      </div>
      <div v-else class="space-y-4">
        <div v-for="group in groupedProducts" :key="group.date">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold text-text">{{ group.dateLabel }}</h4>
            <span class="text-xs text-muted">{{ group.products.length }} product{{ group.products.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="space-y-2">
            <div
              v-for="(product, index) in group.products"
              :key="product.id"
              class="p-3 bg-bg border border-border rounded-lg hover:bg-card transition-colors cursor-move"
              draggable="true"
              @dragstart="handleDragStart($event, group.date, index)"
              @dragover.prevent="handleDragOver($event, group.date, index)"
              @drop="handleDrop($event, group.date, index)"
              @dragend="handleDragEnd"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span class="text-sm font-semibold text-indigo-700">{{ index + 1 }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h5 class="text-sm font-semibold text-text truncate">{{ product.name }}</h5>
                    <p class="text-xs text-muted mt-0.5">SKU: {{ product.sku }}</p>
                    <div class="flex items-center gap-2 mt-1.5">
                      <span class="text-xs text-muted">{{ shotTypeLabel(product.shotType) }}</span>
                    </div>
                    <div v-if="product.shootStatus" class="flex items-center gap-2 mt-1.5">
                      <span class="text-xs px-1.5 py-0.5 rounded" :class="getShootStatusClass(product.shootStatus)">
                        {{ getShootStatusLabel(product.shootStatus) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center ml-3">
                  <div class="relative stage-dropdown">
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                      :class="getStageBadgeClass(product.stage)"
                      @click.stop="toggleStageDropdown(product.id)"
                    >
                      {{ STAGE_LABELS[product.stage] }}
                      <svg class="inline-block w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      v-if="openStageDropdown === product.id"
                      class="absolute z-10 mt-1 right-0 w-40 bg-card border border-border rounded-md shadow-lg"
                    >
                      <button
                        v-for="stageOption in stageOptions"
                        :key="stageOption.value"
                        type="button"
                        class="w-full text-left px-3 py-2 text-xs hover:bg-bg first:rounded-t-md last:rounded-b-md transition-colors"
                        :class="product.stage === stageOption.value ? 'font-medium bg-indigo-50' : ''"
                        @click.stop="handleStageSelect(product.id, stageOption.value)"
                      >
                        {{ stageOption.label }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Product } from '@/types'
import { SHOT_TYPE_LABELS, STAGE_LABELS } from '@/types'
import { isThisWeek, formatDateShort, productHasGoLiveDate } from '@/utils/dates'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{
  products: Product[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'product-click': [productId: string]
  'mark-shooting': [productId: string]
  'mark-done': [productId: string]
  'stage-change': [productId: string, newStage: Product['stage']]
  'reorder': [productIds: string[]]
}>()

const selectedPhotographer = ref('')
const draggedGroup = ref<string | null>(null)
const draggedIndex = ref<number | null>(null)
const dragOverGroup = ref<string | null>(null)
const dragOverIndex = ref<number | null>(null)
const openStageDropdown = ref<string | null>(null)

const stageOptions: Array<{ value: Product['stage']; label: string }> = [
  { value: 'photo_queue', label: 'Photo Queue' },
  { value: 'in_shoot', label: 'In Shoot' },
  { value: 'editing', label: 'Editing' },
]

const filteredProducts = computed(() => {
  return props.products.filter((product) => {
    const isInQueue = product.stage === 'photo_queue' || product.stage === 'in_shoot'
    
    // Check if product has scheduledShootDate and it's within this week
    let isThisWeekDate = false
      if (product.scheduledShootDate) {
      const shootDate = product.scheduledShootDate && typeof product.scheduledShootDate.toDate === 'function' 
        ? product.scheduledShootDate.toDate() 
        : new Date(product.scheduledShootDate as unknown as string | number | Date)
      isThisWeekDate = isThisWeek(shootDate)
    }
    
    // Fallback to goLiveDate if no scheduledShootDate
    if (!product.scheduledShootDate && productHasGoLiveDate(product)) {
      isThisWeekDate = isThisWeek(product.goLiveDate!.toDate())
    }
    
    if (!isInQueue || !isThisWeekDate) return false
    
    if (selectedPhotographer.value && product.assignedTo) {
      return product.assignedTo === selectedPhotographer.value
    }
    
    if (selectedPhotographer.value && !product.assignedTo) {
      return false
    }
    
    return true
  })
})

const photographers = computed(() => {
  const unique = new Set<string>()
  filteredProducts.value.forEach((product) => {
    if (product.assignedTo) {
      unique.add(product.assignedTo)
    }
  })
  return Array.from(unique)
})

const groupedProducts = computed(() => {
  const groups: Record<string, Product[]> = {}
  
  filteredProducts.value.forEach((product) => {
    // Use scheduledShootDate if available, otherwise fallback to goLiveDate
    let date: Date
    if (product.scheduledShootDate) {
      date = product.scheduledShootDate && typeof product.scheduledShootDate.toDate === 'function'
        ? product.scheduledShootDate.toDate()
        : new Date(product.scheduledShootDate as unknown as string | number | Date)
    } else if (productHasGoLiveDate(product)) {
      date = product.goLiveDate!.toDate()
    } else {
      return
    }
    
    const dateKey: string = date.toISOString().split('T')[0] || ''
    if (!dateKey) return
    
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey]!.push(product)
  })
  
  return Object.keys(groups)
    .sort()
    .map((dateKey) => {
      const date = new Date(dateKey)
      const dayProducts = groups[dateKey]?.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        
        // If dragged, maintain order within group
        if (draggedGroup.value === dateKey && draggedIndex.value !== null && dragOverIndex.value !== null) {
          // This will be handled in the template
        }
        
        return 0
      })
      
      // Apply drag reordering if within same group
      if (draggedGroup.value === dateKey && dragOverGroup.value === dateKey && draggedIndex.value !== null && dragOverIndex.value !== null && dayProducts) {
        const reordered = [...dayProducts]
        const [dragged] = reordered.splice(draggedIndex.value, 1)
        if (dragged) {
          reordered.splice(dragOverIndex.value, 0, dragged)
          dayProducts.splice(0, dayProducts.length, ...reordered)
        }
      }
      
      const firstProduct = dayProducts?.[0]
      let dateLabel: string
      if (firstProduct?.scheduledShootDate) {
        const shootDate = firstProduct.scheduledShootDate && typeof firstProduct.scheduledShootDate.toDate === 'function'
          ? firstProduct.scheduledShootDate.toDate()
          : new Date(firstProduct.scheduledShootDate as unknown as string | number | Date)
        dateLabel = shootDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (firstProduct?.goLiveDate) {
        dateLabel = formatDateShort(firstProduct.goLiveDate)
      } else {
        dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      
      return {
        date: dateKey,
        dateLabel,
        products: dayProducts || [],
      }
    })
})

const totalProducts = computed(() => {
  return filteredProducts.value.length
})

function shotTypeLabel(shotType: Product['shotType']): string {
  if (Array.isArray(shotType)) {
    return shotType.map((st: Product['shotType'][number]) => SHOT_TYPE_LABELS[st] || st).join(', ') || 'None'
  }
  return SHOT_TYPE_LABELS[shotType as Product['shotType'][number]] || 'None'
}



function getShootStatusLabel(status: Product['shootStatus']): string {
  if (!status) return ''
  const labels: Record<NonNullable<Product['shootStatus']>, string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    rescheduled: 'Rescheduled',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

function getShootStatusClass(status: Product['shootStatus']): string {
  if (!status) return 'bg-gray-100 text-gray-700'
  const classes: Record<NonNullable<Product['shootStatus']>, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    rescheduled: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

function handleDragStart(event: DragEvent, groupDate: string, index: number) {
  draggedGroup.value = groupDate
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleDragOver(event: DragEvent, groupDate: string, index: number) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverGroup.value = groupDate
  dragOverIndex.value = index
}

function handleDrop(event: DragEvent, _groupDate: string, _index: number) {
  event.preventDefault()
  if (draggedGroup.value && draggedIndex.value !== null) {
    // Get all products from all groups in order
    const allProducts = groupedProducts.value.flatMap(group => group.products)
    emit('reorder', allProducts.map((p) => p.id))
  }
  handleDragEnd()
}

function handleDragEnd() {
  draggedGroup.value = null
  draggedIndex.value = null
  dragOverGroup.value = null
  dragOverIndex.value = null
}

function toggleStageDropdown(productId: string) {
  openStageDropdown.value = openStageDropdown.value === productId ? null : productId
}

function handleStageSelect(productId: string, newStage: Product['stage']) {
  openStageDropdown.value = null
  emit('stage-change', productId, newStage)
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (!(event.target as HTMLElement).closest('.stage-dropdown')) {
    openStageDropdown.value = null
  }
}

// Add click listener on mount
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function getStageBadgeClass(stage: Product['stage']): string {
  const classes: Record<Product['stage'], string> = {
    samples: 'bg-[#c8a8c8] text-white border-[#a888a8] shadow-sm font-semibold', // light lavender - darker
    warehouse: 'bg-[#7a9575] text-white border-[#5a7555] shadow-sm font-semibold', // lichen - much darker
    photo_queue: 'bg-[#b89a70] text-white border-[#987a50] shadow-sm font-semibold', // oat - much darker
    in_shoot: 'bg-[#b87a70] text-white border-[#985a50] shadow-sm font-semibold', // terracotta - much darker
    editing: 'bg-[#6f8094] text-white border-[#4f6074] shadow-sm font-semibold', // slate blue - much darker
    staged: 'bg-[#988494] text-white border-[#786474] shadow-sm font-semibold', // dusty mauve - much darker
    live: 'bg-[#5f9874] text-white border-[#3f7854] shadow-sm font-semibold', // faded sage - much darker
  }
  return classes[stage] || 'bg-bg text-text border-border'
}
</script>
