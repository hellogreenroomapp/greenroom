<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div>
      <label for="displayName" class="block text-sm font-medium text-text mb-1.5">
        Display Name
      </label>
      <input
        id="displayName"
        v-model="displayName"
        type="text"
        required
        autocomplete="name"
        class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        placeholder="John Doe"
        :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': displayNameError }"
        @blur="validateDisplayName"
      />
      <p v-if="displayNameError" class="mt-1 text-xs text-red-600">{{ displayNameError }}</p>
    </div>

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
          autocomplete="new-password"
          class="w-full px-3 py-2 pr-10 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="••••••••"
          :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': passwordError }"
          @blur="validatePassword"
          @input="updatePasswordStrength"
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
      <div v-if="passwordStrength.show" class="mt-2">
        <div class="flex items-center space-x-2 mb-1">
          <div class="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-300"
              :class="passwordStrength.color"
              :style="{ width: passwordStrength.width }"
            ></div>
          </div>
          <span class="text-xs text-muted">{{ passwordStrength.label }}</span>
        </div>
      </div>
      <p v-if="passwordError" class="mt-1 text-xs text-red-600">{{ passwordError }}</p>
    </div>

    <div>
      <label for="confirmPassword" class="block text-sm font-medium text-text mb-1.5">
        Confirm Password
      </label>
      <div class="relative">
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          required
          autocomplete="new-password"
          class="w-full px-3 py-2 pr-10 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="••••••••"
          :class="{ 'border-red-300 focus:border-red-500 focus:ring-red-500': confirmPasswordError }"
          @blur="validateConfirmPassword"
        />
        <button
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
          @click="showConfirmPassword = !showConfirmPassword"
        >
          <svg
            v-if="showConfirmPassword"
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
      <p v-if="confirmPasswordError" class="mt-1 text-xs text-red-600">
        {{ confirmPasswordError }}
      </p>
    </div>

    <div v-if="error" class="p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
      <div class="flex items-start">
        <svg class="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <p class="text-sm font-medium text-red-800">{{ error }}</p>
        </div>
      </div>
    </div>

    <button
      type="submit"
      :disabled="loading || !isValid"
      class="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span v-if="loading" class="flex items-center justify-center">
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
        Creating account...
      </span>
      <span v-else>Sign up</span>
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { validateEmail as validateEmailFormat } from '@/utils/validation'

const emit = defineEmits<{
  submit: [email: string, password: string, displayName: string]
}>()

const { loading, error } = useAuth()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const displayNameError = ref('')
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')

const passwordStrength = ref({
  show: false,
  width: '0%',
  color: '',
  label: '',
})

const isValid = computed(() => {
  return (
    displayName.value &&
    email.value &&
    password.value &&
    confirmPassword.value &&
    !displayNameError.value &&
    !emailError.value &&
    !passwordError.value &&
    !confirmPasswordError.value
  )
})

function validateDisplayName() {
  if (!displayName.value.trim()) {
    displayNameError.value = 'Display name is required'
    return false
  }
  if (displayName.value.trim().length < 2) {
    displayNameError.value = 'Display name must be at least 2 characters'
    return false
  }
  displayNameError.value = ''
  return true
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

function validateConfirmPassword() {
  if (!confirmPassword.value) {
    confirmPasswordError.value = 'Please confirm your password'
    return false
  }
  if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = 'Passwords do not match'
    return false
  }
  confirmPasswordError.value = ''
  return true
}

function updatePasswordStrength() {
  if (!password.value) {
    passwordStrength.value.show = false
    return
  }

  passwordStrength.value.show = true
  const length = password.value.length
  const hasUpper = /[A-Z]/.test(password.value)
  const hasLower = /[a-z]/.test(password.value)
  const hasNumber = /\d/.test(password.value)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password.value)

  const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length

  if (length < 6) {
    passwordStrength.value = {
      show: true,
      width: '25%',
      color: 'bg-red-500',
      label: 'Weak',
    }
  } else if (length < 8 || strength < 2) {
    passwordStrength.value = {
      show: true,
      width: '50%',
      color: 'bg-yellow-500',
      label: 'Fair',
    }
  } else if (length < 12 || strength < 3) {
    passwordStrength.value = {
      show: true,
      width: '75%',
      color: 'bg-blue-500',
      label: 'Good',
    }
  } else {
    passwordStrength.value = {
      show: true,
      width: '100%',
      color: 'bg-green-500',
      label: 'Strong',
    }
  }
}

function handleSubmit() {
  if (
    validateDisplayName() &&
    validateEmail() &&
    validatePassword() &&
    validateConfirmPassword()
  ) {
    emit('submit', email.value, password.value, displayName.value)
  }
}
</script>
