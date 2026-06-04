<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl sm:text-2xl font-semibold text-text mb-2">Photo Queue</h2>
      <p class="text-sm text-muted">Manage today's photography schedule</p>
    </div>
    <PhotoQueue
      :products="products"
      :loading="loading"
      @product-click="handleProductClick"
      @mark-shooting="handleMarkShooting"
      @mark-done="handleMarkDone"
      @stage-change="handleStageChange"
      @reorder="handleReorder"
    />
    <ProductDetail
      :product="selectedProduct"
      :is-open="showProductDetail"
      :all-products="products"
      @close="showProductDetail = false"
      @edit="handleEditProduct"
      @delete="handleDeleteProduct"
      @stage-changed="handleStageChanged"
      @open-product="handleProductClick"
    />

    <Modal :is-open="showEditProduct" title="Edit Product" size="3xl" @close="showEditProduct = false">
      <ProductForm
        v-if="selectedProduct"
        ref="editProductFormRef"
        :product="selectedProduct"
        :brand-id="brandId"
        @save="handleUpdateProduct"
        @cancel="showEditProduct = false"
        @delete="handleDeleteProduct"
      />
      <template #footer>
        <button
          v-if="selectedProduct"
          class="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          @click="editProductFormRef?.handleDelete()"
        >
          Delete
        </button>
        <div class="flex gap-2 ml-auto">
          <button
            class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
            @click="showEditProduct = false"
          >
            Cancel
          </button>
          <button
            class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            @click="editProductFormRef?.submit()"
          >
            Save Changes
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useAuthStore } from '@/stores/auth'
import { useProducts } from '@/composables/useProducts'
import { useToast } from '@/composables/useToast'
import { deleteDoc } from '@/firebase/firestore'
import PhotoQueue from '@/components/dashboard/PhotoQueue.vue'
import ProductDetail from '@/components/product/ProductDetail.vue'
import ProductForm from '@/components/product/ProductForm.vue'
import Modal from '@/components/common/Modal.vue'
import type { Product } from '@/types'

const brandStore = useBrandStore()
const authStore = useAuthStore()
const { products, loading, fetchProducts, updateProduct, updateStage } = useProducts()
const toast = useToast()

const brandId = computed(() => brandStore.brandId || '')
const showProductDetail = ref(false)
const showEditProduct = ref(false)
const selectedProduct = ref<Product | null>(null)
const editProductFormRef = ref<InstanceType<typeof ProductForm> | null>(null)

watch(brandId, async (newBrandId) => {
  if (newBrandId) {
    await fetchProducts(newBrandId)
  }
}, { immediate: true })

onMounted(async () => {
  if (brandId.value) {
    await fetchProducts(brandId.value)
  }
})

function handleProductClick(productId: string) {
  const product = products.value.find((p) => p.id === productId)
  if (product) {
    selectedProduct.value = product
    showProductDetail.value = true
  }
}

async function handleMarkShooting(productId: string) {
  if (authStore.userId && brandId.value) {
    await updateStage(productId, 'in_shoot', authStore.userId)
    await fetchProducts(brandId.value)
  }
}

async function handleMarkDone(productId: string) {
  if (authStore.userId && brandId.value) {
    await updateStage(productId, 'editing', authStore.userId)
    await fetchProducts(brandId.value)
  }
}

async function handleStageChange(productId: string, newStage: Product['stage']) {
  if (authStore.userId && brandId.value) {
    await updateStage(productId, newStage, authStore.userId)
    await fetchProducts(brandId.value)
  }
}

function handleReorder(_productIds: string[]) {
  // TODO: Implement reorder persistence if needed
  // For now, this is handled locally in the component
}

function handleEditProduct() {
  showProductDetail.value = false
  showEditProduct.value = true
}

async function handleUpdateProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>) {
  try {
    if (!selectedProduct.value || !brandId.value) {
      toast.error('Product not selected')
      return
    }
    
    await updateProduct(selectedProduct.value.id, productData)
    await fetchProducts(brandId.value)
    
    showEditProduct.value = false
    toast.success('Product updated successfully')
  } catch (error: any) {
    console.error('Failed to update product:', error)
    toast.error(error.message || 'Failed to update product')
  }
}

async function handleDeleteProduct() {
  if (!selectedProduct.value) return
  
  try {
    await deleteDoc('products', selectedProduct.value.id)
    await fetchProducts(brandId.value)
    showEditProduct.value = false
    showProductDetail.value = false
    selectedProduct.value = null
    toast.success('Product deleted successfully')
  } catch (error: any) {
    console.error('Failed to delete product:', error)
    toast.error(error.message || 'Failed to delete product')
  }
}

async function handleStageChanged() {
  if (brandId.value) {
    await fetchProducts(brandId.value)
    if (selectedProduct.value) {
      const updated = products.value.find((p) => p.id === selectedProduct.value!.id)
      if (updated) {
        selectedProduct.value = updated
      }
    }
  }
}
</script>
