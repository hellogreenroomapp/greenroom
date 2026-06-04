<template>
  <Modal :is-open="isOpen" :title="`${colorName} Image`" @close="handleClose">
    <ImageUpload
      v-model="imageUrl"
      :label="`${colorName} Image`"
      url-placeholder="https://example.com/image.jpg"
      :storage-path="storagePath"
      :show-remove="true"
      @upload-complete="handleUploadComplete"
      @remove="handleRemove"
    />
    <template #footer>
      <button
        class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
        @click="handleClose"
      >
        Done
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/common/Modal.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'

const props = defineProps<{
  isOpen: boolean
  colorName: string
  storagePath: string
  currentImageUrl?: string
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'image-updated': [url: string]
  'image-removed': []
}>()

const imageUrl = ref<string>(props.currentImageUrl || '')

watch(() => props.currentImageUrl, (newUrl) => {
  imageUrl.value = newUrl || ''
}, { immediate: true })

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    imageUrl.value = props.currentImageUrl || ''
  }
})

function handleClose() {
  emit('update:isOpen', false)
}

function handleUploadComplete(url: string) {
  imageUrl.value = url
  emit('image-updated', url)
}

function handleRemove() {
  imageUrl.value = ''
  emit('image-removed')
}
</script>
