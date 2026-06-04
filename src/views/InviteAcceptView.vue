<template>
  <div class="min-h-screen flex items-center justify-center bg-bg">
    <div class="max-w-md w-full space-y-6 p-8 bg-card border border-border rounded-lg shadow-sm">
      <div class="text-center">
        <h2 class="text-2xl font-semibold text-text">Accept Invitation</h2>
        <p class="mt-2 text-sm text-muted">You've been invited to join a brand</p>
      </div>

      <div v-if="loading" class="py-8">
        <LoadingSpinner />
      </div>

      <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-600">{{ error }}</p>
        <button
          class="mt-4 w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          @click="$router.push('/login')"
        >
          Go to Login
        </button>
      </div>

      <div v-else-if="invite" class="space-y-4">
        <div class="p-4 bg-bg border border-border rounded-lg">
          <div class="space-y-2">
            <div>
              <p class="text-xs font-medium text-muted uppercase">Brand</p>
              <p class="text-sm font-semibold text-text">{{ brandName }}</p>
            </div>
            <div>
              <p class="text-xs font-medium text-muted uppercase">Role</p>
              <p class="text-sm text-text">{{ roleLabel }}</p>
            </div>
            <div v-if="inviterName">
              <p class="text-xs font-medium text-muted uppercase">Invited By</p>
              <p class="text-sm text-text">{{ inviterName }}</p>
            </div>
          </div>
        </div>

        <div v-if="!isAuthenticated" class="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p class="text-sm text-indigo-800 mb-4">
            Please sign in or create an account to accept this invitation.
          </p>
          <div class="flex gap-2">
            <button
              class="flex-1 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              @click="handleLogin"
            >
              Sign In
            </button>
            <button
              class="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50 transition-colors"
              @click="handleSignup"
            >
              Sign Up
            </button>
          </div>
        </div>

        <div v-else class="space-y-3">
          <button
            class="w-full px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="accepting"
            @click="handleAccept"
          >
            <span v-if="accepting">Accepting...</span>
            <span v-else>Accept Invitation</span>
          </button>
          <button
            class="w-full px-4 py-2 text-sm text-muted border border-border rounded-md hover:bg-bg transition-colors"
            @click="$router.push('/dashboard')"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getInviteByToken, acceptInvite, getDoc } from '@/firebase/firestore'
import type { BrandInvite, Brand, UserProfile } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const invite = ref<BrandInvite | null>(null)
const brandName = ref('')
const inviterName = ref('')
const loading = ref(true)
const accepting = ref(false)
const error = ref('')

const isAuthenticated = computed(() => authStore.isAuthenticated)
const token = computed(() => route.params.token as string)

const roleLabel = computed(() => {
  if (!invite.value) return ''
  const roleLabels: Record<BrandInvite['role'], string> = {
    owner: 'Owner',
    admin: 'Admin',
    manager: 'Manager',
    photographer: 'Photographer',
    viewer: 'Viewer',
  }
  return roleLabels[invite.value.role] || invite.value.role
})

onMounted(async () => {
  await loadInvite()
})

async function loadInvite() {
  loading.value = true
  error.value = ''

  try {
    const inviteData = await getInviteByToken(token.value)
    
    if (!inviteData) {
      error.value = 'Invitation not found. It may have been deleted or the link is invalid.'
      loading.value = false
      return
    }

    if (inviteData.status === 'expired') {
      error.value = 'This invitation has expired. Please request a new invitation.'
      loading.value = false
      return
    }

    if (inviteData.status === 'accepted') {
      error.value = 'This invitation has already been accepted.'
      loading.value = false
      return
    }

    invite.value = inviteData

    const brand = await getDoc<Brand>('brands', inviteData.brandId)
    if (brand) {
      brandName.value = brand.name
    }

    const inviter = await getDoc<UserProfile>('userProfiles', inviteData.invitedBy)
    if (inviter) {
      inviterName.value = inviter.displayName || inviter.email
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load invitation'
  } finally {
    loading.value = false
  }
}

function handleLogin() {
  sessionStorage.setItem('redirectAfterLogin', route.fullPath)
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

function handleSignup() {
  sessionStorage.setItem('redirectAfterLogin', route.fullPath)
  router.push({ name: 'signup', query: { redirect: route.fullPath } })
}

async function handleAccept() {
  if (!authStore.userId || !invite.value) return

  accepting.value = true
  error.value = ''

  try {
    await acceptInvite(token.value, authStore.userId)
    router.push({ name: 'dashboard' })
  } catch (err: any) {
    error.value = err.message || 'Failed to accept invitation'
    accepting.value = false
  }
}
</script>
