<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-text">Retention Reports</h3>
      <span
        class="text-xs px-2.5 py-1 rounded-full border"
        :class="
          isProtected
            ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
            : 'text-muted border-border bg-bg'
        "
      >
        {{ isProtected ? 'Password protected' : 'No password set' }}
      </span>
    </div>
    <p class="text-sm text-muted mb-5">
      Protect the Retention Reports section with a password. Anyone on the brand will be asked for
      it once per session before they can view reports.
    </p>

    <form class="flex flex-col sm:flex-row gap-3 sm:items-start" @submit.prevent="handleSave">
      <div class="flex-1 max-w-sm">
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          :placeholder="isProtected ? 'New password' : 'Set a password'"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p v-if="password && password.length < 6" class="mt-1 text-xs text-muted">
          Use at least 6 characters.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="submit"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="saving || password.length < 6"
        >
          {{ saving ? 'Saving…' : isProtected ? 'Change password' : 'Set password' }}
        </button>
        <button
          v-if="isProtected"
          type="button"
          class="px-4 py-2 border border-border rounded-md text-sm text-muted hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-60"
          :disabled="saving"
          @click="handleRemove"
        >
          Remove
        </button>
      </div>
    </form>

    <p class="mt-4 text-xs text-muted">
      Changing or removing the password takes effect immediately — everyone currently viewing will
      need the new password next session.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRetentionLock } from '@/composables/useRetentionLock'
import { useToastStore } from '@/stores/toast'

const { isProtected, setPassword, removePassword } = useRetentionLock()
const toast = useToastStore()

const password = ref('')
const saving = ref(false)

async function handleSave() {
  if (password.value.length < 6) return
  saving.value = true
  try {
    await setPassword(password.value)
    password.value = ''
    toast.success('Retention Reports password saved')
  } catch (error) {
    console.error('Failed to save retention password:', error)
    toast.error('Could not save the password. Please try again.')
  } finally {
    saving.value = false
  }
}

async function handleRemove() {
  if (!confirm('Remove the password? Anyone on the brand will be able to view Retention Reports.')) {
    return
  }
  saving.value = true
  try {
    await removePassword()
    toast.success('Password removed — Retention Reports are open to the brand')
  } catch (error) {
    console.error('Failed to remove retention password:', error)
    toast.error('Could not remove the password. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>
