<template>
  <div class="relative">
    <button
      class="flex items-center space-x-2 px-3 py-2 text-sm bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:bg-card transition-colors"
      @click="showDropdown = !showDropdown"
    >
      <span v-if="selectedBrand?.logoUrl" class="flex-shrink-0">
        <img :src="selectedBrand.logoUrl" :alt="selectedBrand.name" class="h-5 w-5 rounded" />
      </span>
      <span class="font-medium">{{ selectedBrand?.name || 'Select a brand...' }}</span>
      <svg
        class="h-4 w-4 text-muted flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="showDropdown"
        v-click-outside="closeDropdown"
        class="absolute right-0 mt-2 w-64 bg-card border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50"
      >
        <div class="py-2">
          <!-- Owned Brands Section -->
          <div v-if="ownedBrands.length > 0" class="px-3 py-2">
            <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Your Brands</p>
            <div
              v-for="brand in ownedBrands"
              :key="brand.id"
              class="px-3 py-2 text-sm cursor-pointer rounded-md flex items-center space-x-2 transition-colors"
              :class="selectedBrandId === brand.id ? 'bg-indigo-50 text-indigo-700' : 'text-text hover:bg-bg'"
              @click="selectBrand(brand.id)"
            >
              <span v-if="brand.logoUrl" class="flex-shrink-0">
                <img :src="brand.logoUrl" :alt="brand.name" class="h-5 w-5 rounded" />
              </span>
              <span class="flex-1 truncate">{{ brand.name }}</span>
              <svg
                v-if="selectedBrandId === brand.id"
                class="h-4 w-4 text-indigo-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <!-- Invited Brands Section -->
          <div v-if="invitedBrands.length > 0" class="px-3 py-2">
            <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-2 mt-3">Invited Brands</p>
            <div
              v-for="brand in invitedBrands"
              :key="brand.id"
              class="px-3 py-2 text-sm cursor-pointer rounded-md flex items-center space-x-2 transition-colors"
              :class="selectedBrandId === brand.id ? 'bg-indigo-50 text-indigo-700' : 'text-text hover:bg-bg'"
              @click="selectBrand(brand.id)"
            >
              <span v-if="brand.logoUrl" class="flex-shrink-0">
                <img :src="brand.logoUrl" :alt="brand.name" class="h-5 w-5 rounded" />
              </span>
              <span class="flex-1 truncate">{{ brand.name }}</span>
              <svg
                v-if="selectedBrandId === brand.id"
                class="h-4 w-4 text-indigo-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <!-- Divider -->
          <div v-if="(ownedBrands.length > 0 || invitedBrands.length > 0)" class="border-t border-border my-2"></div>

          <!-- Create Brand Button -->
          <div class="px-3 py-2">
            <button
              class="w-full px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium text-center"
              @click="handleCreate"
            >
              Create Brand
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Modal
      :is-open="showCreateBrandModal"
      title="Create Brand"
      size="lg"
      @close="showCreateBrandModal = false"
    >
      <form @submit.prevent="handleBrandCreated" class="space-y-4 sm:space-y-5">
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Brand Name</label>
          <input
            v-model="brandFormData.name"
            type="text"
            required
            class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="My Brand"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Slug</label>
          <input
            v-model="brandFormData.slug"
            type="text"
            required
            class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="my-brand"
          />
          <p class="mt-1 text-xs text-muted">URL-friendly identifier (lowercase, hyphens)</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Logo URL (optional)</label>
          <input
            v-model="brandFormData.logoUrl"
            type="url"
            class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="https://example.com/logo.png"
          />
        </div>
      </form>
      <template #footer>
        <button
          class="w-full sm:w-auto px-4 py-2.5 border border-border rounded-md text-sm font-medium text-text hover:bg-bg transition-colors"
          @click="showCreateBrandModal = false"
        >
          Cancel
        </button>
        <button
          class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          @click="handleBrandCreated"
        >
          Create Brand
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useAuthStore } from '@/stores/auth'
import { useBrand } from '@/composables/useBrand'
import { useToast } from '@/composables/useToast'
import type { Brand } from '@/types'
import Modal from '@/components/common/Modal.vue'

const brandStore = useBrandStore()
const authStore = useAuthStore()
const { createBrand, ownedBrands, invitedBrands } = useBrand()
const toast = useToast()

const showDropdown = ref(false)
const showCreateBrandModal = ref(false)
const brandFormData = ref({
  name: '',
  slug: '',
  logoUrl: '',
})

const selectedBrandId = computed(() => brandStore.brandId)
const selectedBrand = computed(() => brandStore.currentBrand)

onMounted(async () => {
  if (authStore.userId && brandStore.brands.length === 0) {
    await brandStore.fetchBrands(authStore.userId)
  }
})

function selectBrand(brandId: string) {
  brandStore.selectBrand(brandId)
  closeDropdown()
}

function handleCreate() {
  showCreateBrandModal.value = true
  closeDropdown()
}

async function handleBrandCreated() {
  try {
    if (authStore.userId && brandFormData.value.name && brandFormData.value.slug) {
      const brandData: Omit<Brand, 'id' | 'createdAt'> = {
        name: brandFormData.value.name,
        slug: brandFormData.value.slug.toLowerCase().replace(/\s+/g, '-'),
        ownerId: authStore.userId,
      }
      
      // Only add logoUrl if it has a value
      if (brandFormData.value.logoUrl && brandFormData.value.logoUrl.trim()) {
        brandData.logoUrl = brandFormData.value.logoUrl.trim()
      }
      
      const brandId = await createBrand(brandData)
      await brandStore.fetchBrands(authStore.userId)
      await brandStore.selectBrand(brandId)
      toast.success('Brand created successfully')
      showCreateBrandModal.value = false
      brandFormData.value = { name: '', slug: '', logoUrl: '' }
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to create brand')
  }
}

function closeDropdown() {
  showDropdown.value = false
}

const vClickOutside = {
  mounted(el: any, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: any) {
    document.removeEventListener('click', el.clickOutsideEvent)
  },
}
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
