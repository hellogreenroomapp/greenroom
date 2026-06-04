<template>
  <ProductForm
    ref="productFormRef"
    :brand-id="brandId"
    :default-project-id="projectId"
    :enable-product-search="true"
    @save="handleCreateProduct"
    @cancel="$emit('close')"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProducts } from '@/composables/useProducts'
import { useToast } from '@/composables/useToast'
import ProductForm from './ProductForm.vue'
import type { Product } from '@/types'

const props = defineProps<{
  projectId: string
  brandId: string
}>()

const emit = defineEmits<{
  close: []
  'product-added': []
}>()

const { createProduct } = useProducts()
const toast = useToast()
const productFormRef = ref<InstanceType<typeof ProductForm> | null>(null)

async function handleCreateProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>) {
  try {
    // Ensure projectId is set
    const productDataWithProject = {
      ...productData,
      projectId: props.projectId,
      brandId: props.brandId,
    }
    await createProduct(productDataWithProject)
    emit('product-added')
    toast.success('Product created and added to collection')
  } catch (error: any) {
    toast.error(error.message || 'Failed to create product')
  }
}
</script>
