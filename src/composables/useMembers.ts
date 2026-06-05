import { ref } from 'vue'
import { getBrandMembers, getDocs, setDoc, updateDoc, brandMemberDocId } from '@/firebase/firestore'
import { where } from 'firebase/firestore'
import type { BrandMember } from '@/types'

export function useMembers() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function getBrandMembersByBrand(brandId: string): Promise<BrandMember[]> {
    loading.value = true
    error.value = null
    try {
      return await getBrandMembers(brandId)
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getUserBrands(userId: string): Promise<BrandMember[]> {
    loading.value = true
    error.value = null
    try {
      return await getDocs<BrandMember>('brandMembers', [
        where('userId', '==', userId),
        where('status', '==', 'active'),
      ])
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function inviteMember(
    data: Omit<BrandMember, 'id' | 'invitedAt' | 'joinedAt' | 'status'>
  ): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const { Timestamp } = await import('firebase/firestore')
      const docId = brandMemberDocId(data.brandId, data.userId)
      await setDoc<BrandMember>(
        'brandMembers',
        docId,
        {
          ...data,
          status: 'pending',
          invitedAt: Timestamp.now(),
        } as unknown as Omit<BrandMember, 'id'>
      )
      return docId
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateMember(memberId: string, updates: Partial<BrandMember>): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await updateDoc<BrandMember>('brandMembers', memberId, updates)
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    getBrandMembers: getBrandMembersByBrand,
    getUserBrands,
    inviteMember,
    updateMember,
  }
}
