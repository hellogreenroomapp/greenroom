import { computed } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { updateBrand as updateBrandFirestore, getDoc } from '@/firebase/firestore'
import type { Brand } from '@/types'

export function useBrand() {
  const brandStore = useBrandStore()

  async function updateBrand(brandId: string, updates: Partial<Brand>) {
    await updateBrandFirestore(brandId, updates)
    if (brandStore.currentBrand?.id === brandId) {
      const updatedBrand = await getDoc<Brand>('brands', brandId)
      if (updatedBrand) {
        brandStore.currentBrand = updatedBrand
        const index = brandStore.brands.findIndex((b) => b.id === brandId)
        if (index > -1) {
          brandStore.brands[index] = updatedBrand
        }
      }
    }
  }

  return {
    currentBrand: computed(() => brandStore.currentBrand),
    brands: computed(() => brandStore.brands),
    ownedBrands: computed(() => brandStore.ownedBrands),
    invitedBrands: computed(() => brandStore.invitedBrands),
    selectBrand: brandStore.selectBrand,
    createBrand: brandStore.createBrand,
    updateBrand,
  }
}
