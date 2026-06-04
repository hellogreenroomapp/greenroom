<template>
  <div class="bg-card border border-border rounded-lg flex flex-col h-full">
    <div class="p-4 border-b border-border">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-text">Recent Activity</h3>
        <button
          v-if="activities.length > 3"
          class="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          @click="showAll = !showAll"
        >
          {{ showAll ? 'Show Less' : 'Show All' }}
        </button>
      </div>
    </div>
    <div class="p-4 flex flex-col flex-1">
      <div v-if="displayedActivities.length === 0" class="text-center py-8">
        <p class="text-sm text-muted">No recent activity</p>
      </div>
      <div v-else class="space-y-2 flex-1">
        <div
          v-for="activity in displayedActivities"
          :key="activity.id"
          class="flex items-start gap-3 p-3 bg-bg border border-border rounded-lg hover:bg-card transition-colors cursor-pointer"
          @click="$emit('product-click', activity.productId)"
        >
          <!-- Product Image -->
          <div class="flex-shrink-0 w-12 h-12 bg-bg border border-border rounded overflow-hidden">
            <img
              v-if="activity.imageUrl"
              :src="activity.imageUrl"
              :alt="activity.productName"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <!-- Activity Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <h5 class="text-sm font-semibold text-text truncate">{{ activity.productName }}</h5>
                <p class="text-xs text-muted mt-0.5">{{ activity.description }}</p>
                <p class="text-xs text-muted mt-1">{{ activity.timeAgo }}</p>
              </div>
              <div class="flex-shrink-0">
                <span
                  class="px-2 py-0.5 text-[10px] font-medium rounded text-white"
                  :style="{ backgroundColor: STAGE_COLORS[activity.stage] || '#6B7280' }"
                >
                  {{ STAGE_LABELS[activity.stage] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Product } from '@/types'
import { STAGE_LABELS } from '@/types'
import { STAGE_COLORS } from '@/constants/stageColors'
import { formatDateShort } from '@/utils/dates'

const props = defineProps<{
  products: Product[]
}>()

const emit = defineEmits<{
  'product-click': [productId: string]
}>()

const showAll = ref(false)

interface Activity {
  id: string
  productId: string
  productName: string
  description: string
  timeAgo: string
  stage: Product['stage']
  imageUrl?: string
}

const activities = computed((): Activity[] => {
  const activityList: Activity[] = []
  
  props.products.forEach((product) => {
    if (product.stageHistory && product.stageHistory.length > 0) {
      const latestChange = product.stageHistory[product.stageHistory.length - 1]
      if (latestChange) {
        const changeDate = latestChange.changedAt.toDate()
        const now = new Date()
        const diffMs = now.getTime() - changeDate.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)
        
        let timeAgo = ''
        if (diffHours < 1) {
          timeAgo = 'Just now'
        } else if (diffHours < 24) {
          timeAgo = `${diffHours}h ago`
        } else if (diffDays === 1) {
          timeAgo = 'Yesterday'
        } else if (diffDays < 7) {
          timeAgo = `${diffDays}d ago`
        } else {
          timeAgo = formatDateShort(product.updatedAt)
        }
        
        activityList.push({
          id: `${product.id}-${latestChange.changedAt.toMillis()}`,
          productId: product.id,
          productName: product.name,
          description: `Moved to ${STAGE_LABELS[latestChange.to as Product['stage']]}`,
          timeAgo,
          stage: product.stage,
          imageUrl: product.imageUrl || product.colors?.find(c => c.imageUrl)?.imageUrl,
        })
      }
    } else if (product.createdAt) {
      // New products
      const createdDate = product.createdAt.toDate()
      const now = new Date()
      const diffMs = now.getTime() - createdDate.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      
      let timeAgo = ''
      if (diffHours < 1) {
        timeAgo = 'Just now'
      } else if (diffHours < 24) {
        timeAgo = `${diffHours}h ago`
      } else if (diffDays === 1) {
        timeAgo = 'Yesterday'
      } else if (diffDays < 7) {
        timeAgo = `${diffDays}d ago`
      } else {
        timeAgo = formatDateShort(product.createdAt)
      }
      
      activityList.push({
        id: `${product.id}-created`,
        productId: product.id,
        productName: product.name,
        description: 'Product created',
        timeAgo,
        stage: product.stage,
        imageUrl: product.imageUrl || product.colors?.find(c => c.imageUrl)?.imageUrl,
      })
    }
  })
  
  // Sort by most recent
  return activityList.sort((a, b) => {
    const aProduct = props.products.find(p => p.id === a.productId)
    const bProduct = props.products.find(p => p.id === b.productId)
    if (!aProduct || !bProduct) return 0
    
    const aTime = aProduct.updatedAt?.toMillis() || aProduct.createdAt.toMillis()
    const bTime = bProduct.updatedAt?.toMillis() || bProduct.createdAt.toMillis()
    return bTime - aTime
  })
})

const displayedActivities = computed(() => {
  return showAll.value ? activities.value : activities.value.slice(0, 3)
})
</script>

<style scoped>
.stage-badge {
  background-color: var(--stage-color);
}
</style>
