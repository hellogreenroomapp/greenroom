import { ref } from 'vue'
import { Timestamp } from 'firebase/firestore'
import {
  getProductsByBrand,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  updateProductStage,
  stripUndefinedDeep,
} from '@/firebase/firestore'
import type { Product } from '@/types'
import { productHasCollection, productHasGoLiveDate } from '@/utils/dates'
import { awardUploadPoints, awardStageChangePoints } from '@/services/rewardsService'

export interface ProductFilters {
  projectId?: string
  /** Products with no collection assigned */
  unassignedOnly?: boolean
  stage?: Product['stage']
  dateFrom?: Date
  dateTo?: Date
}

export function useProducts() {
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProducts(brandId: string, filters?: ProductFilters): Promise<Product[]> {
    loading.value = true
    error.value = null
    try {
      let allProducts = await getProductsByBrand(brandId)

      if (filters) {
        if (filters.unassignedOnly) {
          allProducts = allProducts.filter(
            (p) => !p.archived && !productHasCollection(p)
          )
        } else if (filters.projectId) {
          allProducts = allProducts.filter((p) => p.projectId === filters.projectId)
        }
        if (filters.stage) {
          allProducts = allProducts.filter((p) => p.stage === filters.stage)
        }
        if (filters.dateFrom) {
          allProducts = allProducts.filter(
            (p) =>
              productHasGoLiveDate(p) && p.goLiveDate!.toDate() >= filters.dateFrom!
          )
        }
        if (filters.dateTo) {
          allProducts = allProducts.filter(
            (p) =>
              productHasGoLiveDate(p) && p.goLiveDate!.toDate() <= filters.dateTo!
          )
        }
      }

      products.value = allProducts
      return allProducts
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products'
      error.value = message
      products.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  async function createProduct(
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>
  ): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const cleanData = stripUndefinedDeep({
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        stageHistory: [],
      })

      console.log('Creating product with data:', cleanData)
      const productId = await addDoc<Product>('products', cleanData as unknown as Omit<Product, 'id'>)
      console.log('Product created with ID:', productId)
      
      // Award upload points (non-blocking)
      try {
        const { useAuthStore } = await import('@/stores/auth')
        const authStore = useAuthStore()
        if (authStore.user) {
          await awardUploadPoints(authStore.user.uid, data.brandId, productId, false)
        }
      } catch (error) {
        console.error('Error awarding upload points:', error)
        // Don't fail product creation if rewards fail
      }
      
      // Fetch products to refresh the list
      await fetchProducts(data.brandId)
      console.log('Products after fetch:', products.value.length)
      return productId
    } catch (err: any) {
      console.error('Error creating product:', err)
      error.value = err.message || 'Failed to create product'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProduct(
    productId: string,
    updates: Partial<Product>
  ): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const cleanUpdates = stripUndefinedDeep({
        ...updates,
        updatedAt: Timestamp.now(),
      })

      await updateDoc<Product>('products', productId, cleanUpdates as Partial<Product>)
      const product = await getDoc<Product>('products', productId)
      if (product) {
        const index = products.value.findIndex((p) => p.id === productId)
        if (index !== -1) {
          products.value[index] = product
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to update product'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteProduct(productId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await deleteDoc('products', productId)
      products.value = products.value.filter((p) => p.id !== productId)
    } catch (err: any) {
      error.value = err.message || 'Failed to delete product'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateStage(
    productId: string,
    newStage: Product['stage'],
    userId: string,
    fromStage?: Product['stage'] // Optional: pass original stage if already optimistically updated
  ): Promise<void> {
    error.value = null
    try {
      // If fromStage is provided, use it (for optimistic updates)
      // Otherwise, read from local state
      let originalStage: Product['stage']
      if (fromStage !== undefined) {
        originalStage = fromStage
      } else {
        const index = products.value.findIndex((p) => p.id === productId)
        if (index === -1) {
          throw new Error('Product not found')
        }
        const product = products.value[index]
        if (!product) {
          throw new Error('Product not found')
        }
        originalStage = product.stage
      }

      // Don't update if stage hasn't changed
      if (originalStage === newStage) return

      // Update in Firestore - this will update stageHistory
      await updateProductStage(productId, newStage, userId)
      
      // Award stage change points (non-blocking)
      try {
        const product = await getDoc<Product>('products', productId)
        if (product) {
          const { useBrandStore } = await import('@/stores/brand')
          const brandStore = useBrandStore()
          if (brandStore.currentBrand) {
            await awardStageChangePoints(userId, brandStore.currentBrand.id, productId, newStage)
          }
        }
      } catch (error) {
        console.error('Error awarding stage change points:', error)
        // Don't fail stage update if rewards fail
      }
      
      // Refetch the product to get updated stageHistory from Firestore
      const updatedProduct = await getDoc<Product>('products', productId)
      if (updatedProduct) {
        const index = products.value.findIndex((p) => p.id === productId)
        if (index !== -1) {
          // Update the product with fresh data from Firestore (includes updated stageHistory)
          products.value[index] = updatedProduct
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to update stage'
      throw err
    }
  }

  async function archiveProduct(productId: string): Promise<void> {
    await updateProduct(productId, { archived: true })
  }

  async function unarchiveProduct(productId: string): Promise<void> {
    await updateProduct(productId, { archived: false })
  }

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStage,
    archiveProduct,
    unarchiveProduct,
  }
}
