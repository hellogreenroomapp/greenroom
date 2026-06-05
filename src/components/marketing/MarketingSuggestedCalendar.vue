<template>
  <div class="bg-card border border-border rounded-lg overflow-hidden">
    <div class="px-4 sm:px-5 py-4 border-b border-border">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-text">Story calendar</h3>
          <p class="text-xs text-muted mt-0.5">
            Klaviyo scheduled sends plus GreenRoom suggestions from pipeline launches and your send
            plan. Click for detail.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="p-1.5 rounded-md hover:bg-bg" aria-label="Previous month" @click="previousMonth">
            <svg class="w-5 h-5 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="text-sm font-medium text-text min-w-[130px] text-center">{{ monthYearDisplay }}</span>
          <button type="button" class="p-1.5 rounded-md hover:bg-bg" aria-label="Next month" @click="nextMonth">
            <svg class="w-5 h-5 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            class="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2"
            @click="goToToday"
          >
            Today
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[10px] text-muted">
        <span class="inline-flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-sm" style="background-color: #5b21b6" />
          Klaviyo · email
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-sm" style="background-color: #7c3aed" />
          Klaviyo · SMS
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-sm" style="background-color: #0e7f55" />
          Suggested · launch email
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-sm" style="background-color: #d97706" />
          Suggested · plan fill
        </span>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-muted">Loading story calendar…</div>
    <template v-else>
      <div class="grid grid-cols-7 border-b border-border bg-bg/50">
        <div
          v-for="day in weekDays"
          :key="day"
          class="py-2 text-center text-[10px] font-semibold text-muted uppercase"
        >
          {{ day }}
        </div>
      </div>

      <div class="grid grid-cols-7">
        <div
          v-for="(cell, index) in calendarDays"
          :key="index"
          class="min-h-[100px] sm:min-h-[116px] border-r border-b border-border p-1.5 sm:p-2 last:border-r-0"
          :class="{
            'bg-bg/40': !cell.isCurrentMonth,
            'bg-card': cell.isCurrentMonth,
            'ring-2 ring-inset ring-indigo-400/60 bg-indigo-50/30': cell.isCurrentMonth && isToday(cell.date),
          }"
        >
          <div
            class="text-xs font-medium mb-1"
            :class="cell.isCurrentMonth ? 'text-text' : 'text-muted/60'"
          >
            {{ cell.dayOfMonth }}
          </div>

          <div v-if="cell.isCurrentMonth" class="space-y-1">
            <button
              v-for="item in itemsForDay(cell.date)"
              :key="item.id"
              type="button"
              class="w-full text-left text-[10px] sm:text-xs leading-tight px-1.5 py-1 rounded truncate font-medium text-white hover:opacity-90 transition-opacity"
              :class="{ 'ring-1 ring-white/40': item.source === 'klaviyo' }"
              :style="{ backgroundColor: storyCalendarItemColor(item) }"
              :title="item.title"
              @click="onItemClick(item)"
            >
              {{ item.displayLabel }}
              <span
                v-if="item.source === 'suggested' && item.beat?.products.length"
                class="opacity-80 font-normal"
              >
                · {{ item.beat.products.length }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <p
        v-if="items.length === 0"
        class="text-sm text-muted text-center py-8 px-4 border-t border-border"
      >
        <template v-if="klaviyoConnected">
          No Klaviyo campaigns or pipeline suggestions in this window. Sync Klaviyo or add go-live
          dates on pipeline products.
        </template>
        <template v-else>
          Connect Klaviyo to show scheduled campaigns here, and add pipeline go-live dates for launch
          suggestions.
        </template>
      </p>
    </template>

    <MarketingStoryDetailModal
      :beat="selectedBeat"
      :is-saved="selectedBeatIsSaved"
      :saved-notes="selectedSavedNotes"
      :can-edit="canEdit"
      :saving="storySaving"
      @close="selectedBeat = null"
      @save="onSaveStory"
      @unsave="onUnsaveStory"
    />
    <MarketingKlaviyoCampaignModal
      :item="selectedKlaviyoItem"
      :insights="klaviyoInsights ?? null"
      @close="selectedKlaviyoItem = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MarketingStoryDetailModal from '@/components/marketing/MarketingStoryDetailModal.vue'
import MarketingKlaviyoCampaignModal from '@/components/marketing/MarketingKlaviyoCampaignModal.vue'
import { getMonthDays, isToday } from '@/utils/dates'
import { storyBeatDayKey } from '@/utils/marketingStoryCalendar'
import type { MarketingStoryBeat } from '@/utils/marketingStoryCalendar'
import type { MarketingKlaviyoInsights } from '@/types/klaviyoInsights'
import type { SavedMarketingStory } from '@/types/marketingSavedStories'
import { storyBeatStableKey } from '@/utils/marketingSavedStories'
import {
  buildBeatsByDayIndexForItems,
  storyCalendarItemColor,
  type StoryCalendarItem,
} from '@/utils/marketingStoryCalendarView'

const props = defineProps<{
  items: StoryCalendarItem[]
  loading?: boolean
  klaviyoConnected?: boolean
  klaviyoInsights?: MarketingKlaviyoInsights | null
  savedStoryByKey?: Record<string, SavedMarketingStory>
  canEdit?: boolean
  storySaving?: boolean
}>()

const emit = defineEmits<{
  'save-story': [payload: { beat: MarketingStoryBeat; notes: string }]
  'unsave-story': [storyKey: string]
}>()

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const now = new Date()
const currentMonth = ref(now.getMonth())
const currentYear = ref(now.getFullYear())
const selectedBeat = ref<MarketingStoryBeat | null>(null)
const selectedKlaviyoItem = ref<StoryCalendarItem | null>(null)

const selectedStoryKey = computed(() =>
  selectedBeat.value ? storyBeatStableKey(selectedBeat.value) : null
)

const selectedBeatIsSaved = computed(
  () => !!selectedStoryKey.value && !!props.savedStoryByKey?.[selectedStoryKey.value]
)

const selectedSavedNotes = computed(() => {
  const key = selectedStoryKey.value
  if (!key || !props.savedStoryByKey) return undefined
  return props.savedStoryByKey[key]?.notes
})

function onSaveStory(notes: string) {
  if (!selectedBeat.value) return
  emit('save-story', { beat: selectedBeat.value, notes })
}

function onUnsaveStory() {
  if (!selectedStoryKey.value) return
  emit('unsave-story', selectedStoryKey.value)
}

const monthYearDisplay = computed(() =>
  new Date(currentYear.value, currentMonth.value, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
)

const calendarDays = computed(() => getMonthDays(currentYear.value, currentMonth.value))

const itemsByDay = computed(() => buildBeatsByDayIndexForItems(props.items))

function itemsForDay(date: Date): StoryCalendarItem[] {
  return itemsByDay.value.get(storyBeatDayKey(date)) ?? []
}

function onItemClick(item: StoryCalendarItem) {
  if (item.source === 'klaviyo') {
    selectedKlaviyoItem.value = item
    selectedBeat.value = null
  } else {
    selectedBeat.value = item.beat ?? null
    selectedKlaviyoItem.value = null
  }
}

function previousMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value -= 1
  } else currentMonth.value -= 1
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value += 1
  } else currentMonth.value += 1
}

function goToToday() {
  const t = new Date()
  currentMonth.value = t.getMonth()
  currentYear.value = t.getFullYear()
}
</script>
