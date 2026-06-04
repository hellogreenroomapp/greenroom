<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="$emit('close')"
        @keydown.esc="$emit('close')"
      >
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <Transition name="fade">
            <div
              v-if="isOpen"
              class="fixed inset-0 transition-opacity bg-black bg-opacity-20"
            ></div>
          </Transition>

          <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

          <Transition name="modal-content">
            <div
              v-if="isOpen"
              ref="modalRef"
              class="inline-block w-full align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle border border-border"
              :class="sizeClasses"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="title ? 'modal-title' : undefined"
            >
              <div class="px-6 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6">
                <div class="flex items-start justify-between mb-4 sm:mb-5">
                  <h3 v-if="title" id="modal-title" class="text-lg font-semibold text-text pr-2">
                    {{ title }}
                  </h3>
                  <button
                    class="text-muted hover:text-text transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                    aria-label="Close modal"
                    @click="$emit('close')"
                  >
                    <span class="sr-only">Close</span>
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <slot />
              </div>
              <div v-if="$slots.footer" class="px-4 py-3 border-t border-border bg-bg sm:px-6 sm:py-4 flex flex-col-reverse gap-2 sm:flex-row-reverse sm:space-x-reverse sm:space-x-3">
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title?: string
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
  }>(),
  {
    size: 'md',
  }
)

defineEmits<{
  close: []
}>()

const modalRef = ref<HTMLElement | null>(null)

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-3xl',
    '2xl': 'sm:max-w-5xl',
    '3xl': 'sm:max-w-6xl',
    full: 'sm:max-w-[95vw]',
  }
  return sizes[props.size]
})

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      modalRef.value?.focus()
    }
  }
)
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-content-enter-active {
  transition: all 0.2s;
}

.modal-content-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

.modal-content-leave-active {
  transition: all 0.15s;
}

.modal-content-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
