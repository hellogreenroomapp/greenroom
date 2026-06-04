import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const sidebarOpen = ref(true)
  const modalOpen = ref(false)
  const modalComponent = ref<string | null>(null)
  const modalProps = ref<Record<string, any>>({})

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function openModal(component: string, props?: Record<string, any>) {
    modalComponent.value = component
    modalProps.value = props || {}
    modalOpen.value = true
  }

  function closeModal() {
    modalOpen.value = false
    modalComponent.value = null
    modalProps.value = {}
  }

  return {
    sidebarOpen,
    modalOpen,
    modalComponent,
    modalProps,
    toggleSidebar,
    openModal,
    closeModal,
  }
})
