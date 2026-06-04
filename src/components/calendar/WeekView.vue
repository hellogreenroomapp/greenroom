<template>
  <div class="space-y-3">
    <div
      v-for="(weekProducts, weekIndex) in weeks"
      :key="weekIndex"
      class="bg-card border border-border rounded-lg overflow-hidden"
    >
      <button
        class="w-full px-4 py-2.5 bg-bg border-b border-border hover:bg-card transition-colors flex items-center justify-between text-left"
        @click="toggleWeek(weekIndex)"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-4 h-4 text-muted transition-transform flex-shrink-0"
            :class="{ 'rotate-90': expandedWeeks.has(weekIndex) }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <h3 class="text-sm font-semibold text-text">
            Week {{ weekIndex + 1 }}
            <span class="text-xs font-normal text-muted ml-2">
              {{ getWeekDateRange(weekIndex) }}
            </span>
          </h3>
        </div>
        <span class="text-xs font-medium text-muted">
          {{ weekProducts.length }} product{{ weekProducts.length !== 1 ? 's' : '' }}
        </span>
      </button>
      
      <div v-if="expandedWeeks.has(weekIndex)">
        <div v-if="weekProducts.length === 0" class="py-8 text-center text-sm text-muted">
          No products launching this week
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-bg border-b border-border">
              <tr>
                <th class="px-1.5 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wider">Product Name</th>
                <th class="px-1.5 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wider">SKU</th>
                <th class="px-1.5 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wider">Stage</th>
                <th class="px-1.5 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wider">Go Live Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="product in weekProducts"
                :key="product.id"
                class="hover:bg-bg transition-colors cursor-pointer"
                @click="$emit('product-click', product.id)"
              >
                <td class="px-1.5 py-2">
                  <div 
                    class="font-medium text-sm"
                    :class="product.gender === 'womens' ? 'text-blue-600' : 'text-text'"
                  >
                    {{ product.name }}
                  </div>
                  <div v-if="product.colors && product.colors.length > 0" class="text-xs text-muted mt-0.5">
                    <span
                      v-for="(color, index) in product.colors"
                      :key="color.name"
                    >
                      <span>{{ color.name }}</span><span
                        v-if="color.tags && color.tags.length > 0"
                        class="italic"
                        :class="color.tags[0] === 'restock' ? 'text-blue-600' : 'text-green-700'"
                      >
                        ({{ color.tags[0] === 'restock' ? 'restock' : 'new' }})
                      </span>
                      <span v-if="index < product.colors.length - 1">, </span>
                    </span>
                  </div>
                </td>
                <td class="px-1.5 py-2 text-muted text-xs">
                  {{ product.sku }}
                </td>
                <td class="px-1.5 py-2">
                  <span
                    class="inline-block px-1 py-0.5 text-xs font-medium rounded"
                    :style="{ backgroundColor: getStageColor(product.stage) + 'CC', color: '#000' }"
                  >
                    {{ stageLabels[product.stage] }}
                  </span>
                </td>
                <td class="px-1.5 py-2 text-muted text-xs">
                  {{ productHasGoLiveDate(product) ? formatDateShort(product.goLiveDate!) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Product } from '@/types'
import { STAGE_LABELS } from '@/types'
import { getStageColor } from '@/constants/stageColors'
import { formatDateShort, productHasGoLiveDate } from '@/utils/dates'

const props = defineProps<{
  products: Product[]
  currentMonth: number
  currentYear: number
}>()

const emit = defineEmits<{
  'product-click': [productId: string]
}>()

const stageLabels = STAGE_LABELS
const expandedWeeks = ref<Set<number>>(new Set())

function toggleWeek(weekIndex: number) {
  if (expandedWeeks.value.has(weekIndex)) {
    expandedWeeks.value.delete(weekIndex)
  } else {
    expandedWeeks.value.add(weekIndex)
  }
}

// Calculate which week of the month a date falls in (1-4)
function getWeekOfMonth(date: Date, month: number, year: number): number {
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = firstDay.getDay() // 0 = Sunday, 6 = Saturday
  
  const dayOfMonth = date.getDate()
  
  // Calculate which week: (dayOfMonth + firstDayOfWeek - 1) / 7, rounded down, then add 1
  const weekNumber = Math.floor((dayOfMonth + firstDayOfWeek - 1) / 7) + 1
  
  // Clamp to 1-4 (some months might have 5 weeks, but we'll show max 4)
  return Math.min(Math.max(weekNumber, 1), 4)
}

// Group products by week
const weeks = computed(() => {
  const weekGroups: Product[][] = [[], [], [], []] // Week 1, 2, 3, 4
  
  props.products.forEach((product) => {
    if (!product.goLiveDate) return
    
    const productDate = product.goLiveDate.toDate()
    // Use UTC date components to match how dates are stored
    const productMonth = productDate.getUTCMonth()
    const productYear = productDate.getUTCFullYear()
    const productDay = productDate.getUTCDate()
    
    // Only include products from the current month/year
    if (productMonth === props.currentMonth && productYear === props.currentYear) {
      // Create a date object for week calculation using UTC components
      const dateForWeekCalc = new Date(productYear, productMonth, productDay)
      const weekNumber = getWeekOfMonth(dateForWeekCalc, props.currentMonth, props.currentYear)
      const weekIndex = weekNumber - 1 // Convert to 0-indexed
      
      if (weekIndex >= 0 && weekIndex < 4 && weekGroups[weekIndex]) {
        weekGroups[weekIndex].push(product)
      }
    }
  })
  
  // Sort products within each week by go live date
  weekGroups.forEach((weekProducts) => {
    weekProducts.sort((a, b) => {
      if (!a.goLiveDate || !b.goLiveDate) return 0
      return a.goLiveDate.toMillis() - b.goLiveDate.toMillis()
    })
  })
  
  return weekGroups
})

// Get date range for a week
function getWeekDateRange(weekIndex: number): string {
  const firstDay = new Date(props.currentYear, props.currentMonth, 1)
  const firstDayOfWeek = firstDay.getDay() // 0 = Sunday
  
  // Calculate start day of the week (1-indexed)
  // Week 1 starts on the 1st, adjusted by the day of week
  const weekStartDay = weekIndex * 7 - firstDayOfWeek + 1
  const startDate = new Date(props.currentYear, props.currentMonth, Math.max(weekStartDay, 1))
  
  // Calculate end date (6 days after start)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  
  // Clamp to month boundaries
  const lastDayOfMonth = new Date(props.currentYear, props.currentMonth + 1, 0).getDate()
  if (endDate.getDate() > lastDayOfMonth) {
    endDate.setDate(lastDayOfMonth)
  }
  
  // Format dates
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
  const startDay = startDate.getDate()
  const endDay = endDate.getDate()
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
  }
}
</script>
