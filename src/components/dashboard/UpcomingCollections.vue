<template>
  <div class="bg-card border border-border rounded-lg flex flex-col h-full">
    <div class="p-4 border-b border-border">
      <h3 class="text-lg font-semibold text-text">Upcoming Collections</h3>
      <p v-if="displayedCollections.length > 0" class="text-sm text-muted mt-1">
        {{ displayedCollections.length }} collection{{ displayedCollections.length !== 1 ? 's' : '' }} launching soon
      </p>
    </div>
    <div class="p-4 flex flex-col flex-1">
      <div v-if="loading" class="text-center py-8">
        <LoadingSpinner />
      </div>
      <div v-else-if="displayedCollections.length === 0" class="text-center py-8">
        <p class="text-sm text-muted mb-3">No upcoming collections</p>
        <router-link
          to="/collections"
          class="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View all collections →
        </router-link>
      </div>
      <div v-else class="space-y-3 flex flex-col h-full">
        <div class="flex-1 space-y-3">
          <div
            v-for="collection in displayedCollections"
            :key="collection.id"
            class="p-3 bg-bg border border-border rounded-lg hover:bg-card transition-colors cursor-pointer"
            @click="handleCollectionClick(collection.id)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: collection.statusColor }"></div>
                <span class="text-sm font-semibold text-text">{{ collection.name }}</span>
              </div>
              <span class="text-xs text-muted">{{ collection.dateLabel }}</span>
            </div>
            <div class="text-xs text-muted">
              <span>{{ collection.season }} {{ collection.year }}</span>
            </div>
          </div>
        </div>
        <div class="pt-2 border-t border-border mt-auto">
          <router-link
            to="/collections"
            class="text-sm text-indigo-600 hover:text-indigo-700 font-medium block text-center"
          >
            View all collections →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Project } from '@/types'
import { formatDateShort } from '@/utils/dates'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const props = defineProps<{
  collections: Project[]
  loading?: boolean
  productCounts?: Record<string, number>
}>()

const router = useRouter()

interface CollectionDisplay {
  id: string
  name: string
  dateLabel: string
  statusColor: string
  season: string
  year: number
  productCount?: number
}

const upcomingCollections = computed((): CollectionDisplay[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return props.collections
    .filter(collection => {
      // Show collections that are active and have a start date in the future, or are currently live
      if (collection.status !== 'active') return false
      
      if (collection.startDate) {
        const startDate = collection.startDate.toDate()
        startDate.setHours(0, 0, 0, 0)
        
        // Show if starting today or in the future
        if (startDate >= today) return true
        
        // Show if currently live (started but not ended, or no end date)
        if (collection.endDate) {
          const endDate = collection.endDate.toDate()
          endDate.setHours(23, 59, 59, 999)
          return startDate <= today && endDate >= today
        }
        return startDate <= today // Started but no end date = ongoing
      }
      
      // If no start date, show if it's active (fallback)
      return true
    })
    .sort((a, b) => {
      // Sort by start date (upcoming first), then by name
      const aStart = a.startDate?.toDate() || new Date(0)
      const bStart = b.startDate?.toDate() || new Date(0)
      
      if (aStart.getTime() !== bStart.getTime()) {
        return aStart.getTime() - bStart.getTime()
      }
      return a.name.localeCompare(b.name)
    })
    .map(collection => {
      const startDate = collection.startDate?.toDate()
      const endDate = collection.endDate?.toDate()
      
      let dateLabel = ''
      let statusColor = '#10B981' // green for upcoming/live
      
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const isToday = start.getTime() === today.getTime()
        const isTomorrow = start.getTime() === today.getTime() + 86400000
        
        if (isToday) {
          dateLabel = 'Live Today'
        } else if (isTomorrow) {
          dateLabel = 'Starts Tomorrow'
        } else if (start > today) {
          dateLabel = `Starts ${formatDateShort(collection.startDate!)}`
        } else if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (end >= today) {
            dateLabel = `Live until ${formatDateShort(collection.endDate!)}`
          } else {
            dateLabel = 'Ended'
            statusColor = '#6B7280' // gray for ended
          }
        } else {
          dateLabel = 'Live Now'
        }
      } else {
        dateLabel = 'Active'
      }
      
      return {
        id: collection.id,
        name: collection.name,
        dateLabel,
        statusColor,
        season: collection.season.charAt(0).toUpperCase() + collection.season.slice(1),
        year: collection.year,
      }
    })
})

const displayedCollections = computed(() => {
  return upcomingCollections.value.slice(0, 2)
})

function handleCollectionClick(collectionId: string) {
  router.push(`/collections/${collectionId}`)
}
</script>
