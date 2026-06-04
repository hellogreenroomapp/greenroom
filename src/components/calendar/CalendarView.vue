<template>
  <div class="bg-card border border-border rounded-lg overflow-hidden">
    <div class="grid grid-cols-7 border-b border-border">
      <div
        v-for="day in weekDays"
        :key="day"
        class="p-3 text-center text-xs font-semibold text-muted uppercase border-r border-border last:border-r-0"
      >
        {{ day }}
      </div>
    </div>

    <div class="grid grid-cols-7">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="border-r border-b border-border last:border-r-0 p-2 transition-colors"
        :class="{
          'bg-bg': !day.isCurrentMonth,
          'bg-card': day.isCurrentMonth,
          'bg-indigo-50 border-indigo-300': isToday(day.date) && day.isCurrentMonth,
          'opacity-50': isPast(day.date) && day.isCurrentMonth && !isToday(day.date),
          'bg-indigo-100 border-indigo-400': isDragOver === index,
          'min-h-[120px]': !isDayExpanded(day.date),
        }"
        @dragover.prevent="handleDragOver(index)"
        @dragenter.prevent="handleDragEnter(index)"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop(index, day.date)"
      >
        <div
          class="text-sm font-medium mb-1"
          :class="{
            'text-muted': !day.isCurrentMonth,
            'text-indigo-700 font-semibold': isToday(day.date) && day.isCurrentMonth,
            'text-text': day.isCurrentMonth && !isToday(day.date),
          }"
        >
          {{ day.dayOfMonth }}
        </div>

        <div class="space-y-1">
          <div
            v-for="product in (isDayExpanded(day.date) ? getProductsForDay(day.date) : getProductsForDay(day.date).slice(0, 3))"
            :key="product.id"
            class="text-xs px-1.5 py-1 rounded cursor-pointer truncate transition-colors font-medium hover:opacity-80"
            :class="product.gender === 'womens' ? 'text-blue-600' : 'text-text'"
            :style="{ backgroundColor: getStageColor(product.stage) + 'CC' }"
            :title="product.name"
            draggable="true"
            @dragstart="handleDragStart($event, product.id)"
            @click.stop="$emit('product-click', product.id)"
          >
            {{ product.name }}
          </div>

          <div
            v-if="getProductsForDay(day.date).length > 3"
            class="text-xs px-2 py-1 rounded bg-bg text-muted cursor-pointer text-center font-medium hover:bg-border"
            @click.stop="toggleDayExpansion(day.date)"
          >
            {{ isDayExpanded(day.date) ? `Show less` : `+${getProductsForDay(day.date).length - 3} more` }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Product } from '@/types'
import { isToday, isPast, getMonthDays, productHasGoLiveDate } from '@/utils/dates'
import { getStageColor } from '@/constants/stageColors'

const props = defineProps<{
  products: Product[]
  currentMonth: number
  currentYear: number
}>()

const emit = defineEmits<{
  'product-click': [productId: string]
  'day-click': [date: Date, products: Product[]]
  'date-change': [productId: string, newDate: Date]
}>()

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const calendarDays = computed(() => {
  return getMonthDays(props.currentYear, props.currentMonth)
})

// Track which days are expanded
const expandedDays = ref<Set<string>>(new Set())

function getDayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
}

function toggleDayExpansion(date: Date) {
  const key = getDayKey(date)
  if (expandedDays.value.has(key)) {
    expandedDays.value.delete(key)
  } else {
    expandedDays.value.add(key)
  }
}

function isDayExpanded(date: Date): boolean {
  return expandedDays.value.has(getDayKey(date))
}

function getProductsForDay(date: Date): Product[] {
  return props.products.filter((product) => {
    if (!productHasGoLiveDate(product)) return false
    const productDate = product.goLiveDate!.toDate()
    // Use UTC date methods for both product and calendar day
    // Dates are stored at midnight UTC, so compare using UTC components
    const productUTCDate = productDate.getUTCDate()
    const productUTCMonth = productDate.getUTCMonth()
    const productUTCYear = productDate.getUTCFullYear()
    
    // Calendar day is created in local time, convert to UTC for comparison
    const calendarUTCDate = date.getUTCDate()
    const calendarUTCMonth = date.getUTCMonth()
    const calendarUTCYear = date.getUTCFullYear()
    
    return (
      productUTCDate === calendarUTCDate &&
      productUTCMonth === calendarUTCMonth &&
      productUTCYear === calendarUTCYear
    )
  })
}


const draggedProductId = ref<string | null>(null)
const isDragOver = ref<number | null>(null)

function handleDragStart(event: DragEvent, productId: string) {
  draggedProductId.value = productId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', productId)
  }
}

function handleDragOver(dayIndex: number) {
  isDragOver.value = dayIndex
}

function handleDragEnter(dayIndex: number) {
  isDragOver.value = dayIndex
}

function handleDragLeave() {
  isDragOver.value = null
}

function handleDrop(_dayIndex: number, date: Date) {
  isDragOver.value = null
  if (draggedProductId.value) {
    emit('date-change', draggedProductId.value, date)
    draggedProductId.value = null
  }
}

</script>
