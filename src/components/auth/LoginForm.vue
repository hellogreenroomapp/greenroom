<template>
  <div>
    <form class="space-y-5" @submit.prevent="handleSubmit">
    <div>
      <label for="email" class="block text-sm font-medium text-text mb-1.5">
        Email address
      </label>
      <input
        id="email"
        v-model="email"
        type="email"
        required
        autocomplete="email"
        class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        placeholder="you@example.com"
        :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': emailError }"
        @blur="validateEmail"
      />
      <p v-if="emailError" class="mt-1 text-xs text-red-600">{{ emailError }}</p>
    </div>

    <div>
      <label for="password" class="block text-sm font-medium text-text mb-1.5">
        Password
      </label>
      <div class="relative">
        <input
          id="password"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          required
          autocomplete="current-password"
          class="w-full px-3 py-2 pr-10 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="••••••••"
          :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': passwordError }"
          @blur="validatePassword"
        />
        <button
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
          @click="showPassword = !showPassword"
        >
          <svg
            v-if="showPassword"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
          <svg
            v-else
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
      </div>
      <div class="flex items-center justify-between mt-1">
        <p v-if="passwordError" class="text-xs text-red-600">{{ passwordError }}</p>
        <button
          type="button"
          @click="openForgotPassword"
          class="text-xs text-indigo-600 hover:text-indigo-700 font-medium ml-auto"
        >
          Forgot password?
        </button>
      </div>
    </div>

    <!-- Email/Password Sign In Button -->
    <button
      type="submit"
      :disabled="loading || googleLoading || !isValid"
      class="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span v-if="loading && !googleLoading" class="flex items-center justify-center">
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Signing in...
      </span>
      <span v-else>Sign in</span>
    </button>

    <!-- Error Message -->
    <div v-if="displayError" class="p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
      <div class="flex items-start">
        <svg class="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <p class="text-sm font-medium text-red-800">{{ displayError }}</p>
        </div>
      </div>
    </div>

    <!-- Divider and Google Sign In -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-border"></div>
      </div>
      <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-card text-muted">Or continue with Google</span>
      </div>
    </div>

    <button
      type="button"
      @click="handleGoogleSignIn"
      :disabled="loading || googleLoading"
        class="w-full py-2.5 px-4 bg-card border-2 border-border rounded-md text-sm font-medium text-text hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
    >
      <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span v-if="googleLoading" class="flex items-center">
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4 text-text"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Signing in...
      </span>
      <span v-else>Sign in with Google</span>
      </button>
    </form>

    <!-- Forgot Password Modal -->
    <Modal :is-open="showForgotPassword" title="Reset Password" size="sm" @close="showForgotPassword = false">
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <div>
          <label for="resetEmail" class="block text-sm font-medium text-text mb-1.5">
            Email address
          </label>
          <input
            id="resetEmail"
            v-model="resetEmail"
            type="email"
            required
            autocomplete="email"
            class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="you@example.com"
            :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': resetEmailError }"
            @blur="validateResetEmail"
          />
          <p v-if="resetEmailError" class="mt-1 text-xs text-red-600">{{ resetEmailError }}</p>
        </div>

        <div v-if="resetSuccess" class="p-3 bg-green-50 border border-green-200 rounded-md">
          <p class="text-sm text-green-800">
            Password reset email sent! Please check your inbox and follow the instructions.
          </p>
        </div>

        <div v-if="resetError" class="p-3 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-800">{{ resetError }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="showForgotPassword = false"
            class="px-4 py-2 text-sm font-medium text-text bg-bg border border-border rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleResetPassword"
            :disabled="resetLoading || !resetEmail || !!resetEmailError"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="resetLoading" class="flex items-center">
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Sending...
            </span>
            <span v-else>Send Reset Link</span>
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { validateEmail as validateEmailFormat } from '@/utils/validation'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/common/Modal.vue'

const emit = defineEmits<{
  submit: [email: string, password: string]
}>()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { loading, loginWithGoogle, resetPassword } = useAuth()

// Use computed to ensure error reactivity from store
const displayError = computed(() => {
  // Use store error directly - it's already reactive
  return authStore.error
})

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const emailError = ref('')
const passwordError = ref('')
const googleLoading = ref(false)

// Forgot password state
const showForgotPassword = ref(false)
const resetEmail = ref('')
const resetEmailError = ref('')
const resetLoading = ref(false)
const resetError = ref('')
const resetSuccess = ref(false)

const isValid = computed(() => {
  return email.value && password.value && !emailError.value && !passwordError.value
})

async function handleGoogleSignIn() {
  try {
    googleLoading.value = true
    await loginWithGoogle()
    
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
    
    router.replace(redirectPath)
  } catch (err) {
    // Error is handled by the store
  } finally {
    googleLoading.value = false
  }
}

function validateEmail() {
  if (!email.value) {
    emailError.value = 'Email is required'
    return false
  }
  if (!validateEmailFormat(email.value)) {
    emailError.value = 'Please enter a valid email address'
    return false
  }
  emailError.value = ''
  return true
}

function validatePassword() {
  if (!password.value) {
    passwordError.value = 'Password is required'
    return false
  }
  if (password.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
    return false
  }
  passwordError.value = ''
  return true
}

function handleSubmit() {
  if (validateEmail() && validatePassword()) {
    emit('submit', email.value, password.value)
  }
}

function openForgotPassword() {
  showForgotPassword.value = true
  resetEmail.value = email.value // Pre-fill with login email if available
  resetError.value = ''
  resetSuccess.value = false
  resetEmailError.value = ''
}

function validateResetEmail() {
  if (!resetEmail.value) {
    resetEmailError.value = 'Email is required'
    return false
  }
  if (!validateEmailFormat(resetEmail.value)) {
    resetEmailError.value = 'Please enter a valid email address'
    return false
  }
  resetEmailError.value = ''
  return true
}

async function handleResetPassword() {
  if (!validateResetEmail()) return

  try {
    resetLoading.value = true
    resetError.value = ''
    resetSuccess.value = false
    
    await resetPassword(resetEmail.value)
    
    resetSuccess.value = true
    // Close modal after 3 seconds
    setTimeout(() => {
      showForgotPassword.value = false
      resetEmail.value = ''
      resetSuccess.value = false
      resetError.value = ''
    }, 3000)
  } catch (err: any) {
    resetError.value = err.message || 'Failed to send password reset email'
  } finally {
    resetLoading.value = false
  }
}
</script>
