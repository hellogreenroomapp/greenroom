import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getBrandsByUser, createBrand, getDoc } from '@/firebase/firestore'
import type { Brand } from '@/types'

const STORAGE_KEY = 'merch-pipeline-current-brand-id'

export const useBrandStore = defineStore('brand', () => {
  const currentBrand = ref<Brand | null>(null)
  const ownedBrands = ref<Brand[]>([])
  const invitedBrands = ref<Brand[]>([])
  const loading = ref(false)

  const brandId = computed(() => currentBrand.value?.id || null)
  const brandName = computed(() => currentBrand.value?.name || null)
  const brands = computed(() => [...ownedBrands.value, ...invitedBrands.value])

  function persistBrand(brandId: string | null) {
    if (brandId) {
      localStorage.setItem(STORAGE_KEY, brandId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  async function fetchBrands(userId: string) {
    try {
      loading.value = true
      const { owned, invited } = await getBrandsByUser(userId)
      ownedBrands.value = owned
      invitedBrands.value = invited
      
      const allBrands = [...owned, ...invited]
      
      // Restore persisted brand if it exists and is in the fetched brands list
      const persistedId = localStorage.getItem(STORAGE_KEY)
      if (persistedId) {
        const persistedBrand = allBrands.find((b) => b.id === persistedId)
        if (persistedBrand) {
          currentBrand.value = persistedBrand
        } else {
          // Persisted brand not found, clear it and select first brand if available
          localStorage.removeItem(STORAGE_KEY)
          if (allBrands.length > 0 && allBrands[0]) {
            currentBrand.value = allBrands[0]
            persistBrand(allBrands[0].id)
          } else {
            currentBrand.value = null
          }
        }
      } else if (allBrands.length > 0 && !currentBrand.value && allBrands[0]) {
        // No persisted brand, select first one
        currentBrand.value = allBrands[0]
        persistBrand(allBrands[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error)
    } finally {
      loading.value = false
    }
  }

  async function selectBrand(brandId: string) {
    const cached = brands.value.find((b) => b.id === brandId)
    if (cached) {
      currentBrand.value = cached
      persistBrand(brandId)
      return
    }

    try {
      loading.value = true
      const brand = await getDoc<Brand>('brands', brandId)
      if (brand) {
        currentBrand.value = brand
        persistBrand(brandId)
      } else {
        throw new Error('Brand not found')
      }
    } catch (error) {
      console.error('Failed to select brand:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createBrandAction(data: Omit<Brand, 'id' | 'createdAt'>) {
    try {
      loading.value = true
      const brandId = await createBrand(data)
      const newBrand = await getDoc<Brand>('brands', brandId)
      if (newBrand) {
        ownedBrands.value.push(newBrand)
        currentBrand.value = newBrand
        persistBrand(brandId)
      }
      return brandId
    } catch (error) {
      console.error('Failed to create brand:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    currentBrand,
    brands,
    ownedBrands,
    invitedBrands,
    loading,
    brandId,
    brandName,
    fetchBrands,
    selectBrand,
    createBrand: createBrandAction,
  }
})
