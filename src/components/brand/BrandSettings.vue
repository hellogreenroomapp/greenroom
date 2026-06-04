<template>
  <div class="space-y-8">
    <div>
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-text">Members</h3>
        <button
          class="px-3 py-1.5 text-sm bg-bg border border-border rounded-md text-text hover:bg-indigo-50"
          @click="showInviteForm = true"
        >
          Invite Member
        </button>
      </div>

      <div v-if="members.length === 0" class="text-sm text-muted py-4">
        No members yet. Invite someone to get started.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="member in members"
          :key="member.id"
          class="flex items-center justify-between p-3 bg-bg border border-border rounded-md"
        >
          <div>
            <p class="text-sm font-medium text-text">{{ member.displayName }}</p>
            <p class="text-xs text-muted">{{ member.email }}</p>
          </div>
          <div class="flex items-center space-x-3">
            <span
              class="px-2 py-1 text-xs font-medium rounded"
              :class="getRoleBadgeClass(member.role)"
            >
              {{ member.role }}
            </span>
            <span
              v-if="member.status === 'pending'"
              class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded"
            >
              Pending
            </span>
          </div>
        </div>
      </div>

      <!-- Member Invite Component (always visible for pending invites, form conditionally shown) -->
      <MemberInvite
        v-if="brand?.id"
        :brand-id="brand.id"
        :show-form="showInviteForm"
        @invite="handleInvite"
        @cancel="showInviteForm = false"
      />
    </div>

    <div v-if="isOwner" class="pt-6 border-t border-border">
      <h3 class="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
      <button
        class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
        @click="showDeleteConfirm = true"
      >
        Delete Brand
      </button>

      <Modal v-if="showDeleteConfirm" :is-open="showDeleteConfirm" @close="showDeleteConfirm = false">
        <template #default>
          <p class="text-sm text-text mb-4">
            Are you sure you want to delete this brand? This action cannot be undone.
          </p>
        </template>
        <template #footer>
          <button
            class="px-4 py-2 border border-border rounded-md text-sm font-medium text-text hover:bg-bg"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
            @click="handleDelete"
          >
            Delete Brand
          </button>
        </template>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Brand, BrandMember } from '@/types'
import { getBrandMembers, deleteDoc } from '@/firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import MemberInvite from './MemberInvite.vue'
import Modal from '@/components/common/Modal.vue'

const props = defineProps<{
  brand: Brand | null
}>()

const emit = defineEmits<{
  delete: []
}>()

const members = ref<BrandMember[]>([])
const showInviteForm = ref(false)
const showDeleteConfirm = ref(false)
const authStore = useAuthStore()

const isOwner = computed(() => {
  if (!props.brand || !authStore.userId) return false
  return props.brand.ownerId === authStore.userId
})

watch(
  () => props.brand,
  (brand) => {
    if (brand) {
      loadMembers()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (props.brand) {
    loadMembers()
  }
})

async function loadMembers() {
  if (props.brand) {
    members.value = await getBrandMembers(props.brand.id)
  }
}

async function handleInvite(_data: { email: string; role: BrandMember['role'] }) {
  // The invite is already created in MemberInvite component
  // Just refresh members and close the form
  if (props.brand) {
    await loadMembers()
    showInviteForm.value = false
  }
}

async function handleDelete() {
  if (props.brand) {
    await deleteDoc('brands', props.brand.id)
    emit('delete')
    showDeleteConfirm.value = false
  }
}

function getRoleBadgeClass(role: BrandMember['role']): string {
  const classes: Record<BrandMember['role'], string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    manager: 'bg-indigo-100 text-indigo-800',
    photographer: 'bg-green-100 text-green-800',
    viewer: 'bg-gray-100 text-gray-800',
  }
  return classes[role]
}
</script>
