<template>
  <div class="bg-card border border-border rounded-lg p-6">
    <!-- Add Image Section -->
    <div class="mb-6 pb-6 border-b border-border">
      <ImageUpload
        v-model="imageUrlInput"
        label="Add Image to Moodboard"
        url-placeholder="Paste image URL here..."
        :storage-path="moodboardStoragePath"
        :show-remove="false"
        @upload-complete="handleImageUploadComplete"
      />
      <p class="mt-2 text-xs text-muted">
        Upload an image file or paste a URL. Images will be automatically placed on the moodboard.
      </p>
    </div>

    <!-- Moodboard Grid -->
    <div
      v-if="items.length === 0"
      class="py-16 text-center border-2 border-dashed border-border rounded-lg"
    >
      <svg class="mx-auto h-12 w-12 text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-sm text-muted">No images yet. Add your first image above!</p>
    </div>

    <div
      v-else
      ref="moodboardRef"
      class="relative min-h-[600px] bg-bg rounded-lg border border-border overflow-hidden"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
    >
      <div
        v-for="item in items"
        :key="item.id"
        :draggable="true"
        class="absolute cursor-move group z-10"
        :style="{
          left: `${item.x}px`,
          top: `${item.y}px`,
          width: `${item.width}px`,
          height: `${item.height}px`,
        }"
        @dragstart="handleDragStart($event, item.id)"
        @dragend="handleDragEnd"
      >
        <div class="relative w-full h-full border-2 border-transparent hover:border-indigo-400 rounded-lg overflow-hidden transition-all group-hover:shadow-xl bg-white">
          <img
            :src="item.imageUrl"
            :alt="`Moodboard image ${item.id}`"
            class="w-full h-full object-cover"
            draggable="false"
            @error="handleImageError(item.id)"
          />
          
          <!-- Resize Handles -->
          <!-- Bottom-right corner -->
          <div
            class="absolute bottom-0 right-0 w-6 h-6 bg-indigo-600 opacity-0 group-hover:opacity-100 cursor-se-resize transition-opacity flex items-center justify-center rounded-tl-lg z-30"
            @mousedown.stop="startResize($event, item.id, 'se')"
          >
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
          <!-- Bottom edge -->
          <div
            class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-indigo-600 opacity-0 group-hover:opacity-100 cursor-s-resize transition-opacity z-30"
            @mousedown.stop="startResize($event, item.id, 's')"
          ></div>
          <!-- Right edge -->
          <div
            class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-12 bg-indigo-600 opacity-0 group-hover:opacity-100 cursor-e-resize transition-opacity z-30"
            @mousedown.stop="startResize($event, item.id, 'e')"
          ></div>

          <!-- Delete Button -->
          <button
            class="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-20"
            @click.stop="removeImage(item.id)"
            aria-label="Remove image"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { MoodboardItem } from '@/types'
import ImageUpload from '@/components/common/ImageUpload.vue'
import { useBrandStore } from '@/stores/brand'

const props = defineProps<{
  items: MoodboardItem[]
  projectId: string
  brandId?: string
}>()

const brandStore = useBrandStore()
const brandId = computed(() => props.brandId || brandStore.brandId || '')
const moodboardStoragePath = computed(() => `brands/${brandId.value}/moodboards/${props.projectId}`)

const emit = defineEmits<{
  'update-items': [items: MoodboardItem[]]
}>()

const imageUrlInput = ref('')
const moodboardRef = ref<HTMLElement | null>(null)
const draggedItemId = ref<string | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const resizingItemId = ref<string | null>(null)
const resizeDirection = ref<'se' | 's' | 'e' | null>(null)
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

const items = computed({
  get: () => props.items,
  set: (value) => emit('update-items', value)
})

function handleImageUploadComplete(url: string) {
  addImage(url)
  imageUrlInput.value = ''
}

function addImage(url?: string) {
  const imageUrl = url || imageUrlInput.value.trim()
  if (!imageUrl) return

  // Basic URL validation (skip for Firebase Storage URLs)
  if (!imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
    try {
      new URL(imageUrl)
    } catch {
      alert('Please enter a valid URL')
      return
    }
  }

  const newItem: MoodboardItem = {
    id: `moodboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    imageUrl,
    x: Math.random() * 200 + 50, // Random position
    y: Math.random() * 200 + 50,
    width: 300, // Wider default
    height: 250, // Taller default (not square)
    createdAt: Timestamp.now(),
  }

  items.value = [...items.value, newItem]
  imageUrlInput.value = ''
}

function removeImage(id: string) {
  items.value = items.value.filter(item => item.id !== id)
}

function handleImageError(id: string) {
  console.error('Failed to load image:', id)
  // Optionally remove the item or show an error
}

function handleDragStart(event: DragEvent, id: string) {
  if (!event.dataTransfer) return
  
  const item = items.value.find(i => i.id === id)
  if (!item || !moodboardRef.value) return

  draggedItemId.value = id
  const rect = moodboardRef.value.getBoundingClientRect()
  dragOffset.value = {
    x: event.clientX - rect.left - item.x,
    y: event.clientY - rect.top - item.y,
  }
  
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', id)
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (!draggedItemId.value || !moodboardRef.value) return

  const rect = moodboardRef.value.getBoundingClientRect()
  const newX = event.clientX - rect.left - dragOffset.value.x
  const newY = event.clientY - rect.top - dragOffset.value.y

  // Constrain to moodboard bounds
  const item = items.value.find(i => i.id === draggedItemId.value!)
  if (!item) return

  const constrainedX = Math.max(0, Math.min(newX, rect.width - item.width))
  const constrainedY = Math.max(0, Math.min(newY, rect.height - item.height))

  items.value = items.value.map(i =>
    i.id === draggedItemId.value
      ? { ...i, x: constrainedX, y: constrainedY }
      : i
  )
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  draggedItemId.value = null
}

function handleDragEnd() {
  draggedItemId.value = null
}

function startResize(event: MouseEvent, id: string, direction: 'se' | 's' | 'e') {
  event.preventDefault()
  event.stopPropagation()
  
  const item = items.value.find(i => i.id === id)
  if (!item) return

  resizingItemId.value = id
  resizeDirection.value = direction
  resizeStart.value = {
    x: event.clientX,
    y: event.clientY,
    width: item.width,
    height: item.height,
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

function handleResize(event: MouseEvent) {
  if (!resizingItemId.value || !resizeDirection.value || !moodboardRef.value) return

  const deltaX = event.clientX - resizeStart.value.x
  const deltaY = event.clientY - resizeStart.value.y
  
  let newWidth = resizeStart.value.width
  let newHeight = resizeStart.value.height

  // Resize based on direction
  if (resizeDirection.value === 'se') {
    // Bottom-right corner: resize both width and height
    newWidth = Math.max(150, Math.min(800, resizeStart.value.width + deltaX))
    newHeight = Math.max(150, Math.min(800, resizeStart.value.height + deltaY))
  } else if (resizeDirection.value === 's') {
    // Bottom edge: resize height only
    newHeight = Math.max(150, Math.min(800, resizeStart.value.height + deltaY))
  } else if (resizeDirection.value === 'e') {
    // Right edge: resize width only
    newWidth = Math.max(150, Math.min(800, resizeStart.value.width + deltaX))
  }

  items.value = items.value.map(i =>
    i.id === resizingItemId.value
      ? { ...i, width: newWidth, height: newHeight }
      : i
  )
}

function stopResize() {
  resizingItemId.value = null
  resizeDirection.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>
