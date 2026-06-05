<template>
  <div class="bg-card border border-border rounded-lg p-4">
    <div class="flex items-start gap-3 mb-3">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
        :class="iconClass"
      >
        {{ initials }}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-text">{{ title }}</div>
        <div class="text-xs text-muted">{{ description }}</div>
        <div v-if="connected && connectedLabel" class="text-xs text-emerald-700 mt-1 truncate">
          {{ connectedLabel }}
        </div>
      </div>
      <span
        class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded shrink-0"
        :class="
          connected
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-bg text-muted border border-border'
        "
      >
        {{ connected ? 'Connected' : 'Off' }}
      </span>
    </div>
    <div class="mb-3">
      <button
        v-if="connected"
        type="button"
        class="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
        :disabled="!canEdit"
        @click="$emit('disconnect')"
      >
        Disconnect
      </button>
      <button
        v-else
        type="button"
        class="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium disabled:opacity-50"
        :disabled="!canEdit || connecting"
        @click="$emit('connect')"
      >
        {{ connecting ? 'Connecting…' : 'Connect' }}
      </button>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  initials: string
  iconClass: string
  connected: boolean
  connectedLabel?: string
  canEdit?: boolean
  connecting?: boolean
}>()

defineEmits<{
  connect: []
  disconnect: []
}>()
</script>
