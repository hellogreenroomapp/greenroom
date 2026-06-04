<template>
  <div class="bg-card border border-border rounded-lg">
    <div class="p-4 border-b border-border">
      <h3 class="text-lg font-semibold text-text">Upcoming Shoots</h3>
      <p v-if="upcomingShoots.length > 0" class="text-sm text-muted mt-1">
        {{ upcomingShoots.length }} shoot{{ upcomingShoots.length !== 1 ? 's' : '' }} scheduled
      </p>
    </div>
    <div class="p-4">
      <div v-if="upcomingShoots.length === 0" class="text-center py-8">
        <p class="text-sm text-muted">No upcoming shoots scheduled</p>
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="shoot in upcomingShoots"
          :key="shoot.date"
          class="p-3 bg-bg border border-border rounded-lg"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: shoot.statusColor }"></div>
              <span class="text-sm font-semibold text-text">{{ shoot.dateLabel }}</span>
            </div>
            <span class="text-xs text-muted">{{ shoot.productCount }} product{{ shoot.productCount !== 1 ? 's' : '' }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span
              v-for="product in shoot.products.slice(0, 3)"
              :key="product.id"
              class="text-xs px-2 py-1 bg-white border border-border rounded"
            >
              {{ product.name }}
            </span>
            <span
              v-if="shoot.products.length > 3"
              class="text-xs px-2 py-1 bg-white border border-border rounded text-muted"
            >
              +{{ shoot.products.length - 3 }} more
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types'
import { formatDateShort } from '@/utils/dates'

const props = defineProps<{
  products: Product[]
}>()

interface ShootGroup {
  date: string
  dateLabel: string
  products: Product[]
  productCount: number
  statusColor: string
}

const upcomingShoots = computed((): ShootGroup[] => {
  const shoots: Record<string, Product[]> = {}
  
  props.products.forEach((product) => {
    if (product.scheduledShootDate) {
      const date = product.scheduledShootDate.toDate()
      const dateKey = date.toISOString().split('T')[0] || ''
      if (!dateKey) return
      
      if (!shoots[dateKey]) {
        shoots[dateKey] = []
      }
      shoots[dateKey]!.push(product)
    }
  })
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return Object.keys(shoots)
    .filter(dateKey => {
      const shootDate = new Date(dateKey)
      shootDate.setHours(0, 0, 0, 0)
      return shootDate >= today
    })
    .sort()
    .slice(0, 5)
    .map(dateKey => {
      const products = shoots[dateKey] || []
      const date = new Date(dateKey)
      const isToday = date.toDateString() === today.toDateString()
      const isTomorrow = date.getTime() === today.getTime() + 86400000
      
      let dateLabel = products[0]?.scheduledShootDate ? formatDateShort(products[0].scheduledShootDate) : dateKey
      if (isToday) dateLabel = 'Today'
      else if (isTomorrow) dateLabel = 'Tomorrow'
      
      // Determine status color based on shoot status
      const hasConfirmed = products.some(p => p.shootStatus === 'confirmed')
      const hasCancelled = products.some(p => p.shootStatus === 'cancelled')
      const statusColor = hasCancelled ? '#EF4444' : hasConfirmed ? '#10B981' : '#F59E0B'
      
      return {
        date: dateKey,
        dateLabel,
        products,
        productCount: products.length,
        statusColor,
      }
    })
})
</script>
