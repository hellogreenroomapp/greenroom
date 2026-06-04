<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-text mb-2">Settings</h2>
      <p class="text-sm text-muted">Manage your profile, brands and team members</p>
    </div>

    <!-- Profile Section -->
    <div class="bg-card border border-border rounded-lg p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-text">Your Profile</h3>
        <button
          v-if="!isEditingProfile"
          class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          @click="isEditingProfile = true"
        >
          Edit
        </button>
        <div v-else class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 text-sm border border-border rounded-md text-text hover:bg-bg transition-colors"
            @click="cancelEditProfile"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            @click="handleSaveProfile"
          >
            Save
          </button>
        </div>
      </div>

      <!-- Profile Display View -->
      <div v-if="!isEditingProfile" class="flex items-start space-x-6">
        <!-- Profile Image -->
        <div class="flex-shrink-0">
          <div class="h-24 w-24 rounded-full border-2 border-border overflow-hidden bg-bg flex items-center justify-center">
            <img
              v-if="userProfile?.avatarUrl"
              :src="userProfile.avatarUrl"
              :alt="userProfile?.displayName || 'Profile'"
              class="h-full w-full object-cover"
            />
            <div v-else class="h-full w-full bg-indigo-100 flex items-center justify-center">
              <span class="text-2xl font-semibold text-indigo-700">
                {{ userInitials }}
              </span>
            </div>
          </div>
        </div>

        <!-- Profile Info -->
        <div class="flex-1 min-w-0">
          <h4 class="text-xl font-semibold text-text mb-1">{{ userProfile?.displayName || 'No name set' }}</h4>
          <p class="text-sm text-muted mb-4">
            <span class="font-medium">Email:</span>
            <span class="ml-1">{{ authStore.user?.email }}</span>
          </p>
          <div v-if="userProfile?.avatarUrl" class="text-xs text-muted">
            <span class="font-medium">Avatar URL:</span>
            <a
              :href="userProfile.avatarUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-1 text-indigo-600 hover:text-indigo-700 underline break-all"
            >
              {{ userProfile.avatarUrl }}
            </a>
          </div>
        </div>
      </div>

      <!-- Edit Profile Form View -->
      <div v-else class="space-y-5">
        <div class="flex items-start space-x-6">
          <!-- Profile Image Preview -->
          <div class="flex-shrink-0">
            <div class="h-24 w-24 rounded-full border-2 border-border overflow-hidden bg-bg flex items-center justify-center">
              <img
                v-if="profileFormData.avatarUrl"
                :src="profileFormData.avatarUrl"
                :alt="profileFormData.displayName || 'Profile'"
                class="h-full w-full object-cover"
              />
              <div v-else class="h-full w-full bg-indigo-100 flex items-center justify-center">
                <span class="text-2xl font-semibold text-indigo-700">
                  {{ userInitials }}
                </span>
              </div>
            </div>
          </div>

          <!-- Form Fields -->
          <div class="flex-1 space-y-4">
            <div>
              <label class="block text-sm font-medium text-text mb-1.5">Display Name</label>
              <input
                v-model="profileFormData.displayName"
                type="text"
                required
                class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Your name"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text mb-1.5">Avatar URL</label>
              <input
                v-model="profileFormData.avatarUrl"
                type="url"
                class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="https://example.com/avatar.jpg"
              />
              <p class="mt-1 text-xs text-muted">Enter a URL to display a profile picture</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pending Invites Section -->
    <div v-if="pendingInvites.length > 0" class="bg-card border border-border rounded-lg p-6">
      <h3 class="text-lg font-semibold text-text mb-4">Pending Invitations</h3>
      <div class="space-y-3">
        <div
          v-for="invite in pendingInvites"
          :key="invite.id"
          class="p-4 bg-bg border border-border rounded-lg"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h4 class="text-sm font-semibold text-text">{{ inviteBrandNames[invite.brandId] || 'Loading...' }}</h4>
                <span
                  class="px-2 py-1 text-xs font-medium rounded capitalize"
                  :class="getRoleBadgeClass(invite.role)"
                >
                  {{ invite.role }}
                </span>
              </div>
              <p class="text-xs text-muted">
                Invited on {{ formatInviteDate(invite.createdAt) }}
              </p>
              <p class="text-xs text-muted mt-1">
                Expires {{ formatInviteDate(invite.expiresAt) }}
              </p>
            </div>
            <button
              class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
              :disabled="acceptingInvite === invite.id"
              @click="handleAcceptInvite(invite.id)"
            >
              <span v-if="acceptingInvite === invite.id">Accepting...</span>
              <span v-else>Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Brands Overview -->
    <div class="space-y-4">
      <!-- Owned Brands -->
      <div v-if="ownedBrands.length > 0" class="bg-card border border-border rounded-lg p-6">
        <h3 class="text-lg font-semibold text-text mb-4">Your Brands</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="brand in ownedBrands"
            :key="brand.id"
            class="border border-border rounded-lg p-4 hover:bg-bg transition-colors cursor-pointer"
            :class="{ 'ring-2 ring-indigo-500': currentBrand?.id === brand.id }"
            @click="selectBrand(brand.id)"
          >
            <div class="flex items-start space-x-3">
              <div v-if="brand.logoUrl" class="flex-shrink-0">
                <img :src="brand.logoUrl" :alt="brand.name" class="h-12 w-12 rounded" />
              </div>
              <div v-else class="flex-shrink-0 h-12 w-12 rounded bg-bg border border-border flex items-center justify-center">
                <svg class="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-semibold text-text truncate">{{ brand.name }}</h4>
                <p class="text-xs text-muted mt-0.5 font-mono">{{ brand.slug }}</p>
                <span v-if="currentBrand?.id === brand.id" class="inline-block mt-1 text-xs text-indigo-600 font-medium">Current</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invited Brands -->
      <div v-if="invitedBrands.length > 0" class="bg-card border border-border rounded-lg p-6">
        <h3 class="text-lg font-semibold text-text mb-4">Invited Brands</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="brand in invitedBrands"
            :key="brand.id"
            class="border border-border rounded-lg p-4 hover:bg-bg transition-colors cursor-pointer"
            :class="{ 'ring-2 ring-indigo-500': currentBrand?.id === brand.id }"
            @click="selectBrand(brand.id)"
          >
            <div class="flex items-start space-x-3">
              <div v-if="brand.logoUrl" class="flex-shrink-0">
                <img :src="brand.logoUrl" :alt="brand.name" class="h-12 w-12 rounded" />
              </div>
              <div v-else class="flex-shrink-0 h-12 w-12 rounded bg-bg border border-border flex items-center justify-center">
                <svg class="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-semibold text-text truncate">{{ brand.name }}</h4>
                <p class="text-xs text-muted mt-0.5 font-mono">{{ brand.slug }}</p>
                <span v-if="currentBrand?.id === brand.id" class="inline-block mt-1 text-xs text-indigo-600 font-medium">Current</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="ownedBrands.length === 0 && invitedBrands.length === 0" class="bg-card border border-border rounded-lg p-6">
        <EmptyState
          title="No brands yet"
          description="Create your first brand or wait for an invitation."
        />
      </div>
    </div>
    
    <div v-if="!currentBrand" class="bg-card border border-border rounded-lg p-6">
      <EmptyState
        title="No brand selected"
        description="Select a brand from above or use the brand selector in the header to get started."
      />
    </div>

    <div v-else class="bg-card border border-border rounded-lg p-6">
      <div class="space-y-6">
        <!-- Brand Details Section -->
        <div>
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-text">Brand Profile</h3>
            <button
              v-if="!isEditing"
              class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              @click="isEditing = true"
            >
              Edit
            </button>
            <div v-else class="flex items-center gap-2">
              <button
                class="px-3 py-1.5 text-sm border border-border rounded-md text-text hover:bg-bg transition-colors"
                @click="cancelEdit"
              >
                Cancel
              </button>
              <button
                class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                @click="handleSaveBrand"
              >
                Save
              </button>
            </div>
          </div>

          <!-- Profile Display View -->
          <div v-if="!isEditing" class="flex items-start space-x-6">
            <!-- Profile Image -->
            <div class="flex-shrink-0">
              <div class="h-24 w-24 rounded-full border-2 border-border overflow-hidden bg-bg flex items-center justify-center">
                <img
                  v-if="currentBrand.logoUrl"
                  :src="currentBrand.logoUrl"
                  :alt="currentBrand.name"
                  class="h-full w-full object-cover"
                />
                <svg
                  v-else
                  class="h-12 w-12 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            <!-- Profile Info -->
            <div class="flex-1 min-w-0">
              <h4 class="text-xl font-semibold text-text mb-1">{{ currentBrand.name }}</h4>
              <p class="text-sm text-muted mb-4">
                <span class="font-medium">Slug:</span>
                <span class="ml-1 font-mono">{{ currentBrand.slug }}</span>
              </p>
              <div v-if="currentBrand.logoUrl" class="text-xs text-muted">
                <span class="font-medium">Logo URL:</span>
                <a
                  :href="currentBrand.logoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ml-1 text-indigo-600 hover:text-indigo-700 underline break-all"
                >
                  {{ currentBrand.logoUrl }}
                </a>
              </div>
            </div>
          </div>

          <!-- Edit Form View -->
          <div v-else class="space-y-5">
            <div class="flex items-start space-x-6">
              <!-- Profile Image Preview -->
              <div class="flex-shrink-0">
                <div class="h-24 w-24 rounded-full border-2 border-border overflow-hidden bg-bg flex items-center justify-center">
                  <img
                    v-if="formData.logoUrl"
                    :src="formData.logoUrl"
                    :alt="formData.name || 'Brand logo'"
                    class="h-full w-full object-cover"
                  />
                  <svg
                    v-else
                    class="h-12 w-12 text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              <!-- Form Fields -->
              <div class="flex-1 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-text mb-1.5">Brand Name</label>
                  <input
                    v-model="formData.name"
                    type="text"
                    required
                    class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="My Brand"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-text mb-1.5">Slug</label>
                  <input
                    v-model="formData.slug"
                    type="text"
                    required
                    class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="my-brand"
                  />
                  <p class="mt-1 text-xs text-muted">URL-friendly identifier (lowercase, hyphens)</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text mb-1.5">Logo URL</label>
                  <input
                    v-model="formData.logoUrl"
                    type="url"
                    class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="https://example.com/logo.png"
                  />
                  <p class="mt-1 text-xs text-muted">Enter a URL to display a logo image</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Members Section -->
        <BrandSettings :brand="currentBrand" @delete="handleDeleteBrand" />
      </div>
    </div>

    <!-- Rewards Breakdown Section -->
    <div v-if="currentBrand" class="bg-card border border-border rounded-lg p-6">
      <RewardsBreakdown />
    </div>

    <!-- Rewards Settings Section -->
    <div class="bg-card border border-border rounded-lg p-6">
      <RewardsSettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useBrand } from '@/composables/useBrand'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { getPendingInvitesByEmail, acceptInvite, getDoc } from '@/firebase/firestore'
import type { BrandInvite, Brand } from '@/types'
import BrandSettings from '@/components/brand/BrandSettings.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import RewardsSettings from '@/components/rewards/RewardsSettings.vue'
import RewardsBreakdown from '@/components/rewards/RewardsBreakdown.vue'

const brandStore = useBrandStore()
const authStore = useAuthStore()
const { updateBrand, ownedBrands, invitedBrands, selectBrand } = useBrand()
const toast = useToast()

const currentBrand = computed(() => brandStore.currentBrand)
const userProfile = computed(() => authStore.userProfile)
const isEditing = ref(false)
const isEditingProfile = ref(false)
const pendingInvites = ref<BrandInvite[]>([])
const inviteBrandNames = ref<Record<string, string>>({})
const acceptingInvite = ref<string | null>(null)
const formData = ref({
  name: '',
  slug: '',
  logoUrl: '',
})
const profileFormData = ref({
  displayName: '',
  avatarUrl: '',
})

const userInitials = computed(() => {
  const name = userProfile.value?.displayName || authStore.user?.email || 'U'
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name[0]?.toUpperCase() || 'U'
})

// Watch currentBrand to update formData
watch(currentBrand, (brand) => {
  if (brand) {
    formData.value = {
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || '',
    }
  }
}, { immediate: true })

// Watch userProfile to update profileFormData
watch(userProfile, (profile) => {
  if (profile) {
    profileFormData.value = {
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl || '',
    }
  }
}, { immediate: true })

// Load pending invites when user is authenticated
watch(() => authStore.user?.email, async (email) => {
  if (email) {
    await loadPendingInvites()
  }
}, { immediate: true })

onMounted(async () => {
  if (authStore.user?.email) {
    await loadPendingInvites()
  }
})

async function loadPendingInvites() {
  if (!authStore.user?.email) return
  
  try {
    const invites = await getPendingInvitesByEmail(authStore.user.email)
    pendingInvites.value = invites
    
    // Load brand names for each invite
    for (const invite of invites) {
      if (!inviteBrandNames.value[invite.brandId]) {
        const brand = await getDoc<Brand>('brands', invite.brandId)
        if (brand) {
          inviteBrandNames.value[invite.brandId] = brand.name
        }
      }
    }
  } catch (error: any) {
    console.error('Failed to load pending invites:', error)
  }
}

async function handleAcceptInvite(inviteId: string) {
  if (!authStore.userId) {
    toast.error('You must be logged in to accept invitations')
    return
  }
  
  acceptingInvite.value = inviteId
  try {
    const invite = pendingInvites.value.find(inv => inv.id === inviteId)
    if (!invite) {
      throw new Error('Invite not found')
    }
    
    await acceptInvite(inviteId, authStore.userId)
    toast.success('Invitation accepted! You now have access to this brand.')
    
    // Refresh brands list to include the new brand
    await brandStore.fetchBrands(authStore.userId)
    
    // Select the newly accepted brand
    await brandStore.selectBrand(invite.brandId)
    
    // Remove accepted invite from list
    pendingInvites.value = pendingInvites.value.filter(inv => inv.id !== inviteId)
    delete inviteBrandNames.value[invite.brandId]
  } catch (error: any) {
    toast.error(error.message || 'Failed to accept invitation')
  } finally {
    acceptingInvite.value = null
  }
}

function formatInviteDate(timestamp: any): string {
  if (!timestamp) return ''
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function getRoleBadgeClass(role: BrandInvite['role']): string {
  const classes: Record<BrandInvite['role'], string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    manager: 'bg-indigo-100 text-indigo-800',
    photographer: 'bg-green-100 text-green-800',
    viewer: 'bg-gray-100 text-gray-800',
  }
  return classes[role] || 'bg-gray-100 text-gray-800'
}

function cancelEdit() {
  isEditing.value = false
  if (currentBrand.value) {
    formData.value = {
      name: currentBrand.value.name,
      slug: currentBrand.value.slug,
      logoUrl: currentBrand.value.logoUrl || '',
    }
  }
}

function cancelEditProfile() {
  isEditingProfile.value = false
  if (userProfile.value) {
    profileFormData.value = {
      displayName: userProfile.value.displayName,
      avatarUrl: userProfile.value.avatarUrl || '',
    }
  }
}

async function handleSaveBrand() {
  if (currentBrand.value) {
    try {
      await updateBrand(currentBrand.value.id, formData.value)
      toast.success('Brand updated successfully')
      isEditing.value = false
    } catch (error: any) {
      toast.error(error.message || 'Failed to update brand')
    }
  }
}

async function handleSaveProfile() {
  if (!userProfile.value) return
  try {
    await authStore.updateProfile({
      displayName: profileFormData.value.displayName,
      avatarUrl: profileFormData.value.avatarUrl || undefined,
    })
    toast.success('Profile updated successfully')
    isEditingProfile.value = false
  } catch (error: any) {
    toast.error(error.message || 'Failed to update profile')
  }
}

async function handleDeleteBrand() {
  if (currentBrand.value) {
    try {
      await brandStore.fetchBrands(authStore.userId!)
      if (brandStore.brands.length > 0 && brandStore.brands[0]) {
        await brandStore.selectBrand(brandStore.brands[0].id)
      } else {
        brandStore.currentBrand = null
      }
      toast.success('Brand deleted successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete brand')
    }
  }
}
</script>
