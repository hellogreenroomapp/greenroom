<template>
  <div class="mt-4 space-y-4">
    <!-- Pending Invites Section (always visible) -->
    <div v-if="pendingInvites.length > 0" class="p-4 bg-bg border border-border rounded-md">
      <h5 class="text-xs font-semibold text-muted uppercase mb-3">Pending Invitations</h5>
      <div class="space-y-2">
        <div
          v-for="invite in pendingInvites"
          :key="invite.id"
          class="p-3 bg-card border border-border rounded-lg"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">{{ invite.email }}</p>
              <p class="text-xs text-muted mt-0.5">{{ getRoleLabel(invite.role) }}</p>
            </div>
            <span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Pending</span>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <input
              :ref="(el: HTMLInputElement | null) => setInviteLinkRef(el, invite.id)"
              :value="getInviteLink(invite.id)"
              readonly
              class="flex-1 px-2 py-1.5 text-xs bg-bg border border-border rounded text-text"
            />
            <button
              class="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50 transition-colors"
              @click="copyInviteLink(invite.id)"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Form -->
    <div v-if="showForm !== false" class="p-4 bg-bg border border-border rounded-md">
      <h4 class="text-sm font-semibold text-text mb-3">Invite New Member</h4>
      <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Email</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full px-3 py-2 bg-card border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="member@example.com"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Role</label>
        <select
          v-model="role"
          class="w-full px-3 py-2 bg-card border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="photographer">Photographer</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      <div v-if="error" class="p-2 bg-red-50 border border-red-200 rounded-md">
        <p class="text-xs text-red-600">{{ error }}</p>
      </div>

      <div class="flex justify-end space-x-2">
        <button
          type="button"
          class="px-3 py-1.5 text-sm border border-border rounded-md text-text hover:bg-card"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {{ loading ? 'Creating...' : 'Create Invite' }}
        </button>
      </div>
    </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { createInvite, getDocs } from '@/firebase/firestore'
import { where } from 'firebase/firestore'
import type { BrandInvite, BrandMember } from '@/types'

const props = defineProps<{
  brandId: string
  showForm?: boolean
}>()

const emit = defineEmits<{
  invite: [data: { email: string; role: BrandMember['role'] }]
  cancel: []
}>()

const authStore = useAuthStore()
const email = ref('')
const role = ref<BrandMember['role']>('viewer')
const loading = ref(false)
const error = ref('')
const pendingInvites = ref<BrandInvite[]>([])
const inviteLinkRefs = ref<Record<string, HTMLInputElement>>({})


const getRoleLabel = (role: BrandMember['role']): string => {
  const labels: Record<BrandMember['role'], string> = {
    owner: 'Owner',
    admin: 'Admin',
    manager: 'Manager',
    photographer: 'Photographer',
    viewer: 'Viewer',
  }
  return labels[role] || role
}

function getInviteLink(inviteId: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/invite/${inviteId}`
}

function setInviteLinkRef(el: HTMLInputElement | null, inviteId: string) {
  if (el) {
    inviteLinkRefs.value[inviteId] = el as HTMLInputElement
  }
}

function copyInviteLink(inviteId: string) {
  const input = inviteLinkRefs.value[inviteId]
  if (input) {
    input.select()
    input.setSelectionRange(0, 99999)
    document.execCommand('copy')
    
    const button = event?.target as HTMLElement
    if (button) {
      const originalText = button.textContent
      button.textContent = 'Copied!'
      setTimeout(() => {
        button.textContent = originalText
      }, 2000)
    }
  }
}

watch(
  () => props.brandId,
  async (brandId) => {
    if (brandId) {
      await loadPendingInvites()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (props.brandId) {
    await loadPendingInvites()
  }
})

async function loadPendingInvites() {
  if (!props.brandId) {
    console.log('No brandId provided, skipping loadPendingInvites')
    return
  }
  try {
    console.log('Loading pending invites for brandId:', props.brandId)
    const invites = await getDocs<BrandInvite>('brandInvites', [
      where('brandId', '==', props.brandId),
      where('status', '==', 'pending'),
    ])
    console.log('Loaded pending invites:', invites.length, invites)
    pendingInvites.value = invites
  } catch (err: any) {
    console.error('Failed to load pending invites:', err)
    pendingInvites.value = []
  }
}

async function handleSubmit() {
  if (!authStore.userId) {
    error.value = 'You must be logged in to invite members'
    return
  }

  loading.value = true
  error.value = ''

  try {
    console.log('Creating invite for brandId:', props.brandId, 'email:', email.value)
    const inviteId = await createInvite(props.brandId, email.value, role.value, authStore.userId)
    console.log('Invite created with ID:', inviteId)
    
    // Clear form
    const submittedEmail = email.value
    const submittedRole = role.value
    email.value = ''
    role.value = 'viewer'
    
    // Small delay to ensure Firestore has indexed the new document
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Reload pending invites to show the new one
    await loadPendingInvites()
    
    // Emit event after invite is created and list is refreshed
    emit('invite', { email: submittedEmail, role: submittedRole })
  } catch (err: any) {
    console.error('Error creating invite:', err)
    error.value = err.message || 'Failed to create invite'
  } finally {
    loading.value = false
  }
}
</script>
