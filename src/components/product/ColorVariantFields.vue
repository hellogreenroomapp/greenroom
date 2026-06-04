<template>
  <div class="mt-1.5 space-y-1">
    <div class="grid grid-cols-2 gap-1.5">
      <div>
        <label class="block text-[9px] text-muted mb-0.5">Color code</label>
        <input
          :value="color.colorCode || ''"
          type="text"
          class="w-full px-1.5 py-0.5 text-[10px] bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="e.g. BLK"
          @input="onColorCodeInput"
        />
      </div>
      <div>
        <label class="block text-[9px] text-muted mb-0.5">Color SKU</label>
        <input
          :value="color.sku || ''"
          type="text"
          class="w-full px-1.5 py-0.5 text-[10px] bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
          :placeholder="suggestedSku"
          @input="onColorSkuInput"
        />
      </div>
    </div>
    <div>
      <label class="block text-[9px] text-muted mb-0.5">Color image URL</label>
      <input
        :value="color.imageUrl || ''"
        type="url"
        class="w-full px-1.5 py-0.5 text-[10px] bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
        placeholder="https://…"
        @input="onImageUrlInput"
      />
    </div>
    <p v-if="suggestedSku && !color.sku" class="text-[9px] text-muted leading-snug">
      Default SKU: {{ suggestedSku }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProductColor } from '@/types'
import { buildColorSku } from '@/utils/productColors'

const props = defineProps<{
  color: ProductColor
  mainSku: string
}>()

const emit = defineEmits<{
  change: [patch: Partial<ProductColor>]
}>()

const suggestedSku = computed(() => buildColorSku(props.mainSku, props.color.colorCode) || '')

function onColorCodeInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('change', { colorCode: value.trim() || undefined })
}

function onColorSkuInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('change', { sku: value.trim() || undefined })
}

function onImageUrlInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('change', { imageUrl: value.trim() || undefined })
}
</script>
