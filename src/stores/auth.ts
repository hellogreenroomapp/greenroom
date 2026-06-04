import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from 'firebase/auth'
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser,
  sendPasswordReset,
  onAuthChange,
} from '@/firebase/auth'
import { getDoc, updateDoc } from '@/firebase/firestore'
import type { UserProfile } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const userProfile = ref<UserProfile | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const userId = computed(() => user.value?.uid || null)
  const userDisplayName = computed(() => userProfile.value?.displayName || user.value?.email || null)

  onAuthChange(async (firebaseUser) => {
    user.value = firebaseUser
    if (firebaseUser) {
      await fetchUserProfile()
    } else {
      userProfile.value = null
    }
    loading.value = false
  })

  async function login(email: string, password: string) {
    try {
      error.value = null
      loading.value = true
      await signInWithEmail(email, password)
      // Clear error on success
      error.value = null
    } catch (err: any) {
      // Set error message - this will be displayed in the UI
      error.value = err.message || 'Failed to sign in'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loginWithGoogle() {
    try {
      error.value = null
      loading.value = true
      await signInWithGoogle()
      await fetchUserProfile()
    } catch (err: any) {
      error.value = err.message || 'Failed to sign in with Google'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signup(email: string, password: string, displayName: string) {
    try {
      error.value = null
      loading.value = true
      await signUpWithEmail(email, password, displayName)
      await fetchUserProfile()
    } catch (err: any) {
      error.value = err.message || 'Failed to sign up'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      error.value = null
      await signOutUser()
      user.value = null
      userProfile.value = null
      // Redirect to login immediately after logout
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to sign out'
      throw err
    }
  }

  async function fetchUserProfile() {
    if (!user.value) return

    try {
      error.value = null
      userProfile.value = await getDoc<UserProfile>('userProfiles', user.value.uid)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user profile'
    }
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user.value) throw new Error('No user logged in')

    try {
      error.value = null
      await updateDoc<UserProfile>('userProfiles', user.value.uid, updates)
      await fetchUserProfile()
    } catch (err: any) {
      error.value = err.message || 'Failed to update profile'
      throw err
    }
  }

  async function resetPassword(email: string) {
    try {
      error.value = null
      await sendPasswordReset(email)
    } catch (err: any) {
      error.value = err.message || 'Failed to send password reset email'
      throw err
    }
  }

  return {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated,
    userId,
    userDisplayName,
    login,
    loginWithGoogle,
    signup,
    logout,
    resetPassword,
    fetchUserProfile,
    updateProfile,
  }
})
