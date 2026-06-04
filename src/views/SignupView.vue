<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12" style="background-color: #1B7F56;">
    <div class="w-full max-w-md">
      <div class="bg-card rounded-lg shadow-lg p-8">
        <div class="text-center mb-8">
          <div class="flex justify-center mb-4">
            <img
              :src="greenroomIcon"
              alt="Greenroom Icon"
              class="h-12 w-12"
            />
          </div>
          <h1 class="text-2xl font-semibold text-text mb-2">Create account</h1>
          <p class="text-sm text-muted">Get started with GreenRoom</p>
        </div>

        <SignupForm @submit="handleSignup" />

        <div class="mt-6 text-center">
          <p class="text-sm text-muted">
            Already have an account?
            <router-link to="/login" class="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import SignupForm from '@/components/auth/SignupForm.vue'
import greenroomIcon from '@/assets/greenroom_icon.svg'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { signup } = useAuth()

async function handleSignup(email: string, password: string, displayName: string) {
  try {
    await signup(email, password, displayName)
    
    // Wait for auth state to be ready
    if (authStore.loading) {
      await new Promise<void>((resolve) => {
        const unwatch = authStore.$subscribe(() => {
          if (!authStore.loading) {
            unwatch()
            resolve()
          }
        })
      })
    }
    
    const redirectPath = 
      (route.query.redirect as string) ||
      sessionStorage.getItem('redirectAfterLogin') || 
      '/dashboard'
    sessionStorage.removeItem('redirectAfterLogin')
    
    // Use replace instead of push to avoid back button issues
    router.replace(redirectPath)
  } catch (err) {
    // Error is handled by the store
  }
}
</script>
