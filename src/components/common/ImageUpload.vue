<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-medium text-text mb-1.5">{{ label }}</label>
    
    <!-- Image Preview -->
    <div v-if="previewUrl || modelValue" class="mb-2">
      <div class="relative inline-block">
        <img
          :src="previewUrl || modelValue"
          alt="Preview"
          class="h-32 w-32 object-cover rounded border border-border"
          @error="handleImageError"
        />
        <button
          v-if="showRemove"
          type="button"
          class="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          @click="handleRemove"
          aria-label="Remove image"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Upload Options Tabs -->
    <div class="flex gap-2 mb-2 border-b border-border">
      <button
        type="button"
        class="px-3 py-1.5 text-xs font-medium transition-colors"
        :class="uploadMode === 'file' 
          ? 'text-indigo-600 border-b-2 border-indigo-600' 
          : 'text-muted hover:text-text'"
        @click="uploadMode = 'file'"
      >
        Upload File
      </button>
      <button
        type="button"
        class="px-3 py-1.5 text-xs font-medium transition-colors"
        :class="uploadMode === 'url' 
          ? 'text-indigo-600 border-b-2 border-indigo-600' 
          : 'text-muted hover:text-text'"
        @click="uploadMode = 'url'"
      >
        Use URL
      </button>
    </div>

    <!-- File Upload -->
    <div v-if="uploadMode === 'file'" class="space-y-2">
      <label
        class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-bg hover:bg-card hover:border-indigo-300 transition-colors"
        :class="{ 'border-indigo-500 bg-indigo-50': isDragging }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileSelect"
        />
        <div class="flex flex-col items-center justify-center pt-5 pb-6">
          <svg
            class="w-10 h-10 mb-3 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p class="mb-2 text-sm text-text">
            <span class="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p class="text-xs text-muted">PNG, JPG, GIF up to 10MB</p>
        </div>
      </label>
      <div v-if="uploading" class="flex items-center gap-2 text-sm text-muted">
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Uploading...
      </div>
    </div>

    <!-- URL Input -->
    <div v-else class="space-y-2">
      <input
        v-model="urlInput"
        type="url"
        :placeholder="urlPlaceholder || 'https://example.com/image.jpg'"
        class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        @input="handleUrlInput"
      />
      <button
        v-if="urlInput && urlInput !== modelValue"
        type="button"
        class="w-full px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        @click="handleUrlSubmit"
      >
        Use This URL
      </button>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { uploadImage } from '@/firebase/storage'
import { useToast } from '@/composables/useToast'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    urlPlaceholder?: string
    storagePath: string // e.g., 'brands/{brandId}/products/{productId}/image.jpg'
    showRemove?: boolean
  }>(),
  {
    showRemove: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [url: string]
  'upload-complete': [url: string]
  'remove': []
}>()

const toast = useToast()
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadMode = ref<'file' | 'url'>('file')
const previewUrl = ref<string>('')
const urlInput = ref<string>('')
const uploading = ref(false)
const error = ref<string>('')
const isDragging = ref(false)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    urlInput.value = newValue
    previewUrl.value = ''
  }
}, { immediate: true })

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    handleFileUpload(file)
  }
}

function handleDragOver(event: DragEvent) {
  isDragging.value = true
  event.preventDefault()
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  event.preventDefault()
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    handleFileUpload(file)
  } else {
    error.value = 'Please drop an image file'
  }
}

async function handleFileUpload(file: File) {
  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'File size must be less than 10MB'
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }

  uploading.value = true
  error.value = ''

  try {
    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `${timestamp}.${extension}`
    const fullPath = `${props.storagePath}/${filename}`

    // Upload to Firebase Storage
    const downloadURL = await uploadImage(file, fullPath)
    
    // Update preview
    previewUrl.value = ''
    
    // Emit the new URL
    emit('update:modelValue', downloadURL)
    emit('upload-complete', downloadURL)
    
    toast.success('Image uploaded successfully')
  } catch (err: any) {
    console.error('Error uploading image:', err)
    error.value = err.message || 'Failed to upload image'
    toast.error(error.value)
  } finally {
    uploading.value = false
    // Reset file input
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

function handleUrlInput() {
  error.value = ''
}

function handleUrlSubmit() {
  const url = urlInput.value.trim()
  if (!url) {
    error.value = 'Please enter a valid URL'
    return
  }

  try {
    // Basic URL validation
    new URL(url)
    emit('update:modelValue', url)
    previewUrl.value = ''
    toast.success('Image URL updated')
  } catch {
    error.value = 'Please enter a valid URL'
  }
}

function handleImageError() {
  error.value = 'Failed to load image'
}

function handleRemove() {
  emit('update:modelValue', '')
  emit('remove')
  urlInput.value = ''
  previewUrl.value = ''
  error.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}
</script>
