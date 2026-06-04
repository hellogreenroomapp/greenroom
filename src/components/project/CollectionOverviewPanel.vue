<template>
  <div class="bg-card border border-border rounded-b-lg p-4 sm:p-6 space-y-6">
    <!-- Metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div
        v-for="card in metricCards"
        :key="card.key"
        class="rounded-lg border border-border bg-bg px-4 py-3 sm:py-4"
      >
        <p class="text-xs font-medium text-muted uppercase tracking-wide">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-semibold text-text tabular-nums">{{ card.value }}</p>
        <p v-if="card.hint" class="mt-0.5 text-[11px] text-muted">{{ card.hint }}</p>
      </div>
    </div>

    <!-- Summary -->
    <div class="rounded-lg border border-border bg-bg p-4">
      <div class="flex items-center justify-between gap-2 mb-2">
        <label for="collection-dashboard-summary" class="text-sm font-medium text-text">
          Collection summary
        </label>
        <span v-if="summarySaving" class="text-xs text-muted">Saving…</span>
        <span v-else-if="summarySavedHint" class="text-xs text-emerald-600">Saved</span>
      </div>
      <textarea
        id="collection-dashboard-summary"
        :value="summary"
        rows="3"
        class="w-full px-3 py-2 text-sm bg-card border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[5rem]"
        placeholder="Direction, deadlines, or context for your team…"
        @input="onSummaryInput($event)"
        @blur="emit('save-summary')"
      />
      <p class="mt-1.5 text-xs text-muted">Autosaves a few seconds after you stop typing.</p>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
      <!-- Top products -->
      <div class="rounded-lg border border-border overflow-hidden flex flex-col min-h-[280px]">
        <div class="px-4 py-3 border-b border-border bg-bg flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-text">Top products</h3>
          <button
            type="button"
            class="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            @click="emit('go-tab', 'products')"
          >
            View all
          </button>
        </div>
        <div class="flex-1 p-3">
          <div v-if="topProducts.length === 0" class="h-full flex flex-col items-center justify-center text-center py-8 px-4">
            <svg class="h-10 w-10 text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-sm text-muted">No products yet. Add some to this collection.</p>
            <button
              type="button"
              class="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              @click="emit('go-tab', 'products')"
            >
              Product list
            </button>
          </div>
          <ul v-else class="space-y-2">
            <li
              v-for="p in topProducts"
              :key="p.id"
              class="flex items-center gap-3 p-2 rounded-md hover:bg-bg cursor-pointer transition-colors"
              @click="emit('product-click', p.id)"
            >
              <div class="h-11 w-11 rounded border border-border overflow-hidden bg-bg flex-shrink-0">
                <img
                  v-if="productThumb(p)"
                  :src="productThumb(p)"
                  :alt="p.name"
                  class="h-full w-full object-cover"
                />
                <div v-else class="h-full w-full flex items-center justify-center">
                  <svg class="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-text truncate">{{ p.name }}</p>
                <p class="text-xs text-muted truncate">{{ p.sku }} · {{ priorityLabel(p.priority) }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Moodboard mini -->
      <div class="rounded-lg border border-border overflow-hidden flex flex-col min-h-[280px]">
        <div class="px-4 py-3 border-b border-border bg-bg flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-text">Moodboard</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="moodboardTotal > 0"
              type="button"
              class="text-xs font-medium text-muted hover:text-text"
              title="Pick 3 different random images"
              @click="emit('shuffle-moodboard')"
            >
              Shuffle
            </button>
            <button
              type="button"
              class="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              @click="emit('go-tab', 'moodboard')"
            >
              Open
            </button>
          </div>
        </div>
        <div class="flex-1 p-3 flex flex-col">
          <div v-if="moodItems.length === 0" class="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
            <svg class="h-10 w-10 text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-sm text-muted">No moodboard images yet.</p>
          </div>
          <div v-else class="grid grid-cols-3 gap-2 flex-1">
            <button
              v-for="item in moodItems"
              :key="item.id"
              type="button"
              class="aspect-square rounded-lg border border-border overflow-hidden bg-bg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @click="emit('go-tab', 'moodboard')"
            >
              <img :src="item.imageUrl" alt="" class="w-full h-full object-cover" />
            </button>
          </div>
          <p v-if="moodboardTotal > 0" class="text-[11px] text-muted mt-2 text-center">
            {{ moodItems.length }} of {{ moodboardTotal }} shown · random preview
          </p>
        </div>
      </div>

      <!-- Shot list preview -->
      <div class="rounded-lg border border-border overflow-hidden flex flex-col min-h-[280px] xl:col-span-1">
        <div class="px-4 py-3 border-b border-border bg-bg flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-text">Shot list</h3>
          <button
            type="button"
            class="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            @click="emit('go-tab', 'shotlist')"
          >
            View all
          </button>
        </div>
        <div class="p-3 grid grid-cols-2 gap-2 flex-1">
          <button
            v-for="(slot, idx) in shotSlots"
            :key="idx"
            type="button"
            class="rounded-lg border border-border overflow-hidden bg-bg text-left min-h-[120px] flex flex-col focus:outline-none focus:ring-2 focus:ring-indigo-500"
            :class="slot ? 'hover:opacity-95' : 'border-dashed'"
            @click="emit('go-tab', 'shotlist')"
          >
            <template v-if="slot">
              <div
                class="relative w-full aspect-[4/5] flex-shrink-0 bg-white border-b border-border overflow-hidden"
              >
                <img
                  v-if="lookThumb(slot)"
                  :src="lookThumb(slot)"
                  :alt="slot.name"
                  class="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div
                  v-else
                  class="absolute inset-0 flex items-center justify-center bg-bg"
                >
                  <svg class="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div class="p-2 flex-1">
                <p class="text-xs font-medium text-text line-clamp-2">{{ slot.name }}</p>
                <p class="text-[10px] text-muted mt-0.5">{{ lookProductCount(slot) }} items</p>
              </div>
            </template>
            <div v-else class="flex flex-col flex-1 min-h-0 text-center">
              <div
                class="relative w-full aspect-[4/5] flex-shrink-0 border-b border-dashed border-border bg-bg/60"
              >
                <div class="absolute inset-0 flex flex-col items-center justify-center p-3">
                  <span class="text-xs text-muted">Empty slot</span>
                  <span class="text-[10px] text-muted mt-1">Add looks in shot list</span>
                </div>
              </div>
              <div class="p-2 flex-1 min-h-[2.75rem]" aria-hidden="true" />
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Look, MoodboardItem, Product } from '@/types'

const props = defineProps<{
  topProducts: Product[]
  moodItems: MoodboardItem[]
  moodboardTotal: number
  shotSlots: (Look | null)[]
  allProducts: Product[]
  summary: string
  summarySaving: boolean
  summarySavedHint: boolean
  metricCards: { key: string; label: string; value: number; hint?: string }[]
}>()

const emit = defineEmits<{
  'update:summary': [value: string]
  'save-summary': []
  'go-tab': [tab: 'products' | 'moodboard' | 'shotlist']
  'product-click': [productId: string]
  'shuffle-moodboard': []
}>()

function onSummaryInput(e: Event) {
  const t = e.target as HTMLTextAreaElement
  emit('update:summary', t.value)
}

function priorityLabel(p: Product['priority']): string {
  return p === 'high' ? 'High priority' : p === 'medium' ? 'Medium' : 'Low'
}

function productThumb(product: Product): string | undefined {
  if (product.colors && product.colors.length > 0) {
    const c = product.colors.find((x) => x.imageUrl)
    if (c?.imageUrl) return c.imageUrl
  }
  return product.imageUrl
}

function lookProducts(look: Look): Product[] {
  return props.allProducts.filter((p) => look.productIds.includes(p.id) && !p.archived)
}

function getProductImage(product: Product): string | undefined {
  if (product.colors && product.colors.length > 0) {
    const c = product.colors.find((x) => x.imageUrl)
    if (c?.imageUrl) return c.imageUrl
  }
  return product.imageUrl
}

function lookThumb(look: Look): string | undefined {
  if (look.inspirationImageUrl) return look.inspirationImageUrl
  const first = lookProducts(look)[0]
  return first ? getProductImage(first) : undefined
}

function lookProductCount(look: Look): number {
  return lookProducts(look).length
}
</script>
