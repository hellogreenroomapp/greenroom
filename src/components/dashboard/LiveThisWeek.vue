<template>
  <div class="bg-card border border-border rounded-lg">
    <div class="p-4 border-b border-border">
      <h3 class="text-lg font-semibold text-text">Going Live This Week</h3>
      <p v-if="groupedProducts.length > 0" class="text-sm text-muted mt-1">
        {{ totalProducts }} product{{ totalProducts !== 1 ? 's' : '' }} going live
      </p>
    </div>
    <div class="p-4">
      <div v-if="loading">
        <LoadingSpinner />
      </div>
      <div v-else-if="groupedProducts.length === 0">
        <EmptyState
          title="No products going live this week"
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
              v-for="product in group.products"
              :key="product.id"
              class="p-3 bg-bg border border-border rounded-lg hover:bg-card transition-colors cursor-pointer"
              @click="$emit('product-click', product.id)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <h5 class="text-sm font-semibold text-text truncate">{{ product.name }}</h5>
                  <p class="text-xs text-muted mt-0.5">SKU: {{ product.sku }}</p>
                  <p
                    class="text-xs mt-0.5 font-medium"
                    :class="getStatusTextClass(product)"
                  >
                    {{ getStatusLabel(product) }}
                  </p>
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
import { STAGE_LABELS } from '@/types'
import { isThisWeek, formatDateShort, productHasGoLiveDate } from '@/utils/dates'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{
  products: Product[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'product-click': [productId: string]
  'stage-change': [productId: string, newStage: Product['stage']]
}>()

const openStageDropdown = ref<string | null>(null)

const stageOptions: Array<{ value: Product['stage']; label: string }> = [
  { value: 'samples', label: 'Samples' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'photo_queue', label: 'Photo Queue' },
  { value: 'in_shoot', label: 'In Shoot' },
  { value: 'editing', label: 'Editing' },
  { value: 'staged', label: 'Staged' },
  { value: 'live', label: 'Live' },
]

const filteredProducts = computed(() => {
  return props.products.filter((product) => {
    return productHasGoLiveDate(product) && isThisWeek(product.goLiveDate!.toDate())
  })
})

const groupedProducts = computed(() => {
  const groups: Record<string, Product[]> = {}
  
  filteredProducts.value.forEach((product) => {
    const date = product.goLiveDate!.toDate()
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
      const dayProducts = groups[dateKey]?.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      
      const firstProduct = dayProducts?.[0]
      const dateLabel = firstProduct
        ? formatDateShort(firstProduct.goLiveDate!)
        : new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
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

function getStatusLabel(product: Product): string {
  // If product is due this week AND it's in editing, staged, or live → On Track
  // Otherwise → At Risk
  const safeStages: Product['stage'][] = ['editing', 'staged', 'live']
  if (safeStages.includes(product.stage)) {
    return 'On Track'
  }
  return 'At Risk'
}

function getStatusTextClass(product: Product): string {
  const safeStages: Product['stage'][] = ['editing', 'staged', 'live']
  if (safeStages.includes(product.stage)) {
    return 'text-emerald-700'
  }
  return 'text-yellow-700'
}

function toggleStageDropdown(productId: string) {
  openStageDropdown.value = openStageDropdown.value === productId ? null : productId
}

function handleStageSelect(productId: string, newStage: Product['stage']) {
  openStageDropdown.value = null
  emit('stage-change', productId, newStage)
}

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
</script>
