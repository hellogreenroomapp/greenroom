<template>
  <form class="flex flex-col lg:flex-row gap-8" @submit.prevent="handleSubmit">
    <!-- Validation Error -->
    <div v-if="validationError" class="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <p class="text-sm text-red-600">{{ validationError }}</p>
    </div>
    
    <!-- Main Form Content (Two Columns) -->
    <div class="flex-1">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        <!-- Left Column -->
        <div class="space-y-5">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text mb-1.5">Product Name</label>
              <div v-if="isProductSearchEnabled" class="relative">
                <input
                  v-model="productNameInput"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Type to search or enter new product name..."
                  @input="handleProductNameInput"
                  @focus="handleProductNameFocus"
                  @blur="handleProductNameBlur"
                />
                <Transition name="dropdown">
                  <div
                    v-if="showProductDropdown && filteredProducts.length > 0"
                    class="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                  >
                    <div
                      v-for="product in filteredProducts"
                      :key="product.id"
                      class="px-3 py-2 text-sm cursor-pointer hover:bg-bg text-text border-b border-border last:border-b-0"
                      @mousedown="selectExistingProduct(product)"
                    >
                      <div class="flex items-center gap-2">
                        <img
                          v-if="product.imageUrl"
                          :src="product.imageUrl"
                          :alt="product.name"
                          class="h-8 w-8 object-cover rounded border border-border flex-shrink-0"
                        />
                        <div v-else class="h-8 w-8 bg-bg border border-border rounded flex items-center justify-center flex-shrink-0">
                          <svg class="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium truncate">{{ product.name }}</div>
                          <div class="text-xs text-muted">SKU: {{ product.sku }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
              <input
                v-else
                v-model="formData.name"
                type="text"
                required
                class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Product Name"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text mb-1.5">SKU</label>
              <div class="flex items-center gap-3">
                <input
                  v-model="formData.sku"
                  type="text"
                  required
                  class="flex-1 px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="SKU-001"
                />
                <label class="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <input
                    v-model="formData.sample"
                    type="checkbox"
                    class="w-4 h-4 text-indigo-600 border-border rounded focus:ring-indigo-500"
                  />
                  <span class="text-sm text-text whitespace-nowrap">Sample Only</span>
                </label>
              </div>
              <label class="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  v-model="formData.ecommAssetsComplete"
                  type="checkbox"
                  class="w-4 h-4 text-indigo-600 border-border rounded focus:ring-indigo-500"
                />
                <span class="text-sm text-text">Assets complete (ecomm)</span>
              </label>
            </div>
          </div>

    <div>
      <label class="block text-sm font-medium text-text mb-1.5">
        Collection
        <span class="text-xs italic text-muted font-normal ml-1">(optional)</span>
      </label>
      <select
        v-model="formData.projectId"
        class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      >
        <option value="">No collection</option>
        <option v-for="project in projects" :key="project.id" :value="project.id">
          {{ project.name }} ({{ project.season }} {{ project.year }})
        </option>
      </select>
      <p v-if="projects.length === 0" class="mt-1 text-xs text-amber-600">
        No collections found. Please create a collection first.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Gender</label>
        <select
          v-model="formData.gender"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="">Select gender...</option>
          <option value="mens">Mens</option>
          <option value="womens">Womens</option>
          <option value="unisex">Unisex</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Category</label>
        <div class="relative">
          <input
            v-model="categoryInput"
            type="text"
            required
            class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Type to search or select..."
            @input="handleCategoryInput"
            @focus="showCategoryDropdown = true"
            @blur="handleCategoryBlur"
          />
          <Transition name="dropdown">
            <div
              v-if="showCategoryDropdown && filteredCategories.length > 0"
              class="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              <div
                v-for="category in filteredCategories"
                :key="category"
                class="px-3 py-2 text-sm cursor-pointer hover:bg-bg text-text"
                @mousedown="selectCategory(category)"
              >
                {{ category }}
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Priority</label>
        <select
          v-model="formData.priority"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Status</label>
        <select
          v-model="formData.status"
          class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="on-time">On Time</option>
          <option value="delayed">Delayed</option>
          <option value="complete">Complete</option>
        </select>
      </div>
    </div>

          <div>
            <label class="block text-sm font-medium text-text mb-1.5">Shot Type</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="shotTypeOption in shotTypeOptions"
                :key="shotTypeOption.value"
                type="button"
                class="px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200"
                :class="formData.shotType.includes(shotTypeOption.value)
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md hover:bg-indigo-700'
                  : 'bg-bg text-text border-border hover:bg-card hover:border-indigo-300'"
                @click="toggleShotType(shotTypeOption.value)"
              >
                {{ shotTypeOption.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">
              Column / Stage
              <span class="text-xs italic text-muted font-normal ml-1">(0-6)</span>
            </label>
            <select
              v-model="columnNumber"
              class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option :value="0">0 - Samples</option>
              <option :value="1">1 - Warehouse</option>
              <option :value="2">2 - Photo Queue</option>
              <option :value="3">3 - In Shoot</option>
              <option :value="4">4 - Editing</option>
              <option :value="5">5 - Staged</option>
              <option :value="6">6 - Live</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text mb-0.5">
                Go Live Date
              </label>
              <span class="block text-xs italic text-muted font-normal mb-1">(optional — expected site launch)</span>
              <input
                v-model="formData.goLiveDate"
                type="date"
                class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text mb-0.5">
                Scheduled Shoot Date
              </label>
              <span class="block text-xs italic text-muted font-normal mb-1">(optional)</span>
              <input
                v-model="formData.scheduledShootDate"
                type="date"
                class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text mb-0.5">
                Tentative Ex-Factory Date
              </label>
              <span class="block text-xs italic text-muted font-normal mb-1">(optional)</span>
              <input
                v-model="formData.tentativeExFactoryDate"
                type="date"
                class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text mb-0.5">
                Factory Ship Date
              </label>
              <span class="block text-xs italic text-muted font-normal mb-1">(optional)</span>
              <input
                v-model="formData.factoryShipDate"
                type="date"
                class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text mb-1.5">Order ID</label>
            <span class="block text-xs italic text-muted font-normal mb-1">(optional)</span>
            <input
              v-model="formData.orderId"
              type="text"
              class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="e.g. PO-12345"
            />
          </div>

          <div v-if="formData.scheduledShootDate">
            <label class="block text-sm font-medium text-text mb-1.5">Shoot Status</label>
            <select
              v-model="formData.shootStatus"
              class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="">Select status...</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-text mb-1.5">Tags</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <span
                v-for="tag in formData.tags"
                :key="tag"
                class="inline-flex items-center px-2 py-1 bg-bg border border-border rounded text-xs text-text"
              >
                {{ tag }}
                <button
                  type="button"
                  class="ml-1 text-indigo-500 hover:text-indigo-700"
                  @click="removeTag(tag)"
                >
                  ×
                </button>
              </span>
            </div>
            <input
              v-model="tagInput"
              type="text"
              class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Enter tags separated by commas or semicolons (e.g., summer; new arrival; featured)"
              @blur="addTagsFromInput"
              @keydown.enter.prevent="addTagsFromInput"
            />
            <p class="mt-1 text-xs text-muted">Separate multiple tags with commas or semicolons</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-text mb-1.5">Notes</label>
            <textarea
              v-model="formData.notes"
              rows="4"
              class="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Enter any additional notes or comments about this product..."
            ></textarea>
            <p class="mt-1 text-xs text-muted">Single notes field for all product information</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Colors Sidebar (Right Column) -->
    <div class="lg:w-72 flex-shrink-0">
      <div class="bg-[#f5f4f2] border border-border rounded-lg p-5 lg:sticky lg:top-4">
        <label class="block text-sm font-semibold text-text mb-3">Colors</label>
        <div v-if="formData.colors.length > 0" class="space-y-2 mb-3">
          <div
            v-for="(color, index) in formData.colors"
            :key="index"
            class="bg-card border border-border rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all"
          >
            <div class="flex items-start gap-3">
              <!-- Checkbox -->
              <label class="cursor-pointer flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  :checked="color.complete"
                  class="sr-only"
                  @change="color.complete = !color.complete"
                />
                <div
                  class="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                  :class="color.complete
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-bg border-border hover:border-indigo-400'"
                >
                  <svg
                    v-if="color.complete"
                    class="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </label>
              
              <!-- Color image preview/icon (first) -->
              <button
                type="button"
                class="flex-shrink-0 w-12 h-12 rounded border-2 border-border hover:border-indigo-400 transition-colors overflow-hidden bg-bg flex items-center justify-center"
                :class="color.imageUrl ? 'border-indigo-300' : ''"
                @click="openColorImageModal(index)"
                aria-label="Edit color image"
              >
                <img
                  v-if="color.imageUrl"
                  :src="color.imageUrl"
                  :alt="`${color.name} color`"
                  class="w-full h-full object-cover"
                />
                <svg
                  v-else
                  class="w-6 h-6 text-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 7L6 4H9C9 4.39397 9.0776 4.78407 9.22836 5.14805C9.37913 5.51203 9.6001 5.84274 9.87868 6.12132C10.1573 6.3999 10.488 6.62087 10.8519 6.77164C11.2159 6.9224 11.606 7 12 7C12.394 7 12.7841 6.9224 13.1481 6.77164C13.512 6.62087 13.8427 6.3999 14.1213 6.12132C14.3999 5.84274 14.6209 5.51203 14.7716 5.14805C14.9224 4.78407 15 4.39397 15 4H18L21 7L20.5785 11.2152C20.542 11.5801 20.1382 11.7829 19.8237 11.5942L18 10.5V18C18 19.1046 17.1046 20 16 20H8C6.89543 20 6 19.1046 6 18V10.5L4.17629 11.5942C3.86184 11.7829 3.45801 11.5801 3.42152 11.2152L3 7Z" />
                </svg>
              </button>
              
              <!-- Product name and tag (middle section) -->
              <div class="flex-1 min-w-0">
                <input
                  v-model="color.name"
                  type="text"
                  class="w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 mb-0.5"
                  :class="color.complete ? 'line-through text-muted' : 'text-text font-medium'"
                  placeholder="Color name"
                  @blur="handleColorBlur(index)"
                />
                <!-- Color Tags -->
                <div class="relative">
                  <button
                    type="button"
                    class="text-[10px] text-left focus:outline-none"
                    :class="color.tags && color.tags.length > 0 
                      ? 'text-blue-700 font-medium' 
                      : 'text-muted italic'"
                    @click.stop="toggleColorTagDropdown(index)"
                  >
                    <span v-if="color.tags && color.tags.length > 0">
                      {{ color.tags[0] === 'restock' ? 'Restock' : 'New' }}
                    </span>
                    <span v-else>Add tag</span>
                  </button>
                  <!-- Dropdown Menu -->
                  <div
                    v-if="openColorTagDropdown === index"
                    class="absolute z-10 mt-1 w-24 bg-card border border-border rounded-md shadow-lg"
                    @click.stop
                  >
                    <button
                      type="button"
                      class="w-full text-left px-2 py-1.5 text-[10px] hover:bg-bg first:rounded-t-md last:rounded-b-md transition-colors"
                      :class="!color.tags || color.tags.length === 0 ? 'font-medium bg-indigo-50' : ''"
                      @click="setColorTag(index, '')"
                    >
                      No tag
                    </button>
                    <button
                      type="button"
                      class="w-full text-left px-2 py-1.5 text-[10px] hover:bg-bg first:rounded-t-md last:rounded-b-md transition-colors"
                      :class="color.tags && color.tags.includes('restock') ? 'font-medium bg-indigo-50' : ''"
                      @click="setColorTag(index, 'restock')"
                    >
                      Restock
                    </button>
                    <button
                      type="button"
                      class="w-full text-left px-2 py-1.5 text-[10px] hover:bg-bg first:rounded-t-md last:rounded-b-md transition-colors"
                      :class="color.tags && color.tags.includes('new') ? 'font-medium bg-indigo-50' : ''"
                      @click="setColorTag(index, 'new')"
                    >
                      New
                    </button>
                  </div>
                </div>
                <ColorVariantFields
                  :color="color"
                  :main-sku="formData.sku"
                  @change="(patch: Partial<ProductColor>) => applyColorVariantPatch(index, patch)"
                />
              </div>
              
              <button
                type="button"
                class="text-muted hover:text-red-600 text-lg leading-none transition-colors flex-shrink-0"
                @click="removeColor(index)"
                aria-label="Remove color"
              >
                ×
              </button>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <input
            v-model="colorInput"
            type="text"
            class="w-full px-3 py-2 bg-card border border-border rounded-md text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Add color..."
            @keydown.enter.prevent="addColor"
          />
          <button
            type="button"
            class="w-full px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            @click="addColor"
          >
            Add Color
          </button>
        </div>
        <p class="mt-2 text-xs text-muted">Check off when complete</p>
      </div>
    </div>

    <!-- Color Image Modal -->
    <ColorImageModal
      v-if="selectedColor"
      :is-open="colorImageModalOpen"
      :color-name="selectedColor.name"
      :storage-path="selectedColorStoragePath"
      :current-image-url="selectedColor.imageUrl"
      @update:is-open="colorImageModalOpen = $event"
      @image-updated="handleColorImageUpdated"
      @image-removed="handleColorImageRemoved"
    />
  </form>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Product, Project, ProductColor } from '@/types'
import { getColumnFromStage, getStageFromColumn } from '@/types'
import { getProjectsByBrand } from '@/firebase/firestore'
import { useProducts } from '@/composables/useProducts'
import { dateInputValueToTimestamp } from '@/utils/dates'
import ColorImageModal from '@/components/product/ColorImageModal.vue'
import ColorVariantFields from '@/components/product/ColorVariantFields.vue'

const props = withDefaults(
  defineProps<{
    product?: Product | null
    brandId: string
    defaultProjectId?: string
    enableProductSearch?: boolean
    excludeProjectId?: string
  }>(),
  {
    defaultProjectId: undefined,
    enableProductSearch: undefined, // Will default to true for new products, false for edits
    excludeProjectId: undefined,
  }
)

const emit = defineEmits<{
  save: [data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'>]
  cancel: []
  delete: []
}>()

// Enable product search by default for new products (when product prop is not provided)
const isProductSearchEnabled = computed(() => {
  if (props.enableProductSearch !== undefined) {
    return props.enableProductSearch
  }
  // Default to enabled for new products, disabled for edits
  return !props.product
})

const projects = ref<Project[]>([])
const { products: allProducts, fetchProducts } = useProducts()

const formData = ref({
  name: '',
  sku: '',
  projectId: props.defaultProjectId || '',
  gender: '' as Product['gender'] | '',
  category: '',
  stage: 'warehouse' as Product['stage'],
  priority: 'medium' as Product['priority'],
  status: 'on-time' as Product['status'],
  shotType: [] as Product['shotType'],
  goLiveDate: '',
  scheduledShootDate: '',
  tentativeExFactoryDate: '',
  factoryShipDate: '',
  orderId: '',
  shootStatus: '' as Product['shootStatus'] | '',
  imageUrl: '',
  tags: [] as string[],
  colors: [] as ProductColor[],
  notes: '',
  sample: false,
  ecommAssetsComplete: false,
})

const shotTypeOptions: Array<{ value: Product['shotType'][number]; label: string }> = [
  { value: 'flat_lay', label: 'Flat Lay' },
  { value: 'on_model', label: 'On Model' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'ghost_mannequin', label: 'Ghost Mannequin' },
]

const tagInput = ref('')
const colorInput = ref('')
const openColorTagDropdown = ref<number | null>(null)
const categoryInput = ref('')
const showCategoryDropdown = ref(false)
const columnNumber = ref(1)

// Color image modal state
const colorImageModalOpen = ref(false)
const selectedColorIndex = ref<number | null>(null)

function openColorImageModal(colorIndex: number) {
  selectedColorIndex.value = colorIndex
  colorImageModalOpen.value = true
}

function handleColorImageUpdated(url: string) {
  if (selectedColorIndex.value !== null) {
    const color = formData.value.colors[selectedColorIndex.value]
    if (color) {
      color.imageUrl = url
    }
  }
}

function handleColorImageRemoved() {
  if (selectedColorIndex.value !== null) {
    const color = formData.value.colors[selectedColorIndex.value]
    if (color) {
      color.imageUrl = undefined
    }
  }
}

const selectedColor = computed(() => {
  if (selectedColorIndex.value !== null && formData.value.colors[selectedColorIndex.value]) {
    return formData.value.colors[selectedColorIndex.value]
  }
  return null
})

// Get storage path for a specific color image
function getColorImageStoragePath(colorIndex: number): string {
  const color = formData.value.colors[colorIndex]
  const colorName = color?.name?.trim() || `color-${colorIndex}`
  // Sanitize color name for use in file path (remove special characters)
  const sanitizedColorName = colorName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  
  if (props.product?.id) {
    return `brands/${props.brandId}/products/${props.product.id}/colors/${sanitizedColorName}`
  }
  // For new products, generate a temporary ID
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return `brands/${props.brandId}/products/${tempId}/colors/${sanitizedColorName}`
}

const selectedColorStoragePath = computed(() => {
  if (selectedColorIndex.value !== null) {
    return getColorImageStoragePath(selectedColorIndex.value)
  }
  return ''
})

// Product search state
const productNameInput = ref('')
const showProductDropdown = ref(false)

const predefinedCategories = [
  'Short Sleeve Shirts',
  'Long Sleeve Shirts',
  'T-Shirts',
  'Tank Tops',
  'Hoodies',
  'Sweatshirts',
  'Pants',
  'Jeans',
  'Shorts',
  'Dresses',
  'Skirts',
  'Tops',
  'Blouses',
  'Jackets',
  'Coats',
  'Blazers',
  'Sweaters',
  'Cardigans',
  'Leggings',
  'Activewear',
  'Swimwear',
  'Underwear',
  'Socks',
  'Hats',
  'Accessories',
  'Bags',
  'Shoes',
  'Jewelry',
  'Belts',
  'Scarves',
]

const filteredCategories = computed(() => {
  const input = categoryInput.value.toLowerCase().trim()
  if (!input) return predefinedCategories
  
  return predefinedCategories.filter(cat => 
    cat.toLowerCase().includes(input)
  )
})

function handleCategoryInput() {
  formData.value.category = categoryInput.value
  showCategoryDropdown.value = true
}

function selectCategory(category: string) {
  categoryInput.value = category
  formData.value.category = category
  showCategoryDropdown.value = false
}

function handleCategoryBlur() {
  // Delay to allow click events to fire
  setTimeout(() => {
    showCategoryDropdown.value = false
  }, 200)
}

onMounted(async () => {
  if (props.brandId) {
    try {
      projects.value = await getProjectsByBrand(props.brandId)
      console.log('Loaded projects for brand:', props.brandId, projects.value.length)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
    
    // Fetch products if product search is enabled
    if (isProductSearchEnabled.value) {
      console.log('onMounted: Fetching products for search, brandId:', props.brandId, 'isProductSearchEnabled:', isProductSearchEnabled.value)
      try {
        await fetchProducts(props.brandId)
        console.log('onMounted: Products loaded:', allProducts.value.length)
        if (allProducts.value.length === 0) {
          console.warn('onMounted: No products found for brandId:', props.brandId)
        }
      } catch (error) {
        console.error('onMounted: Failed to fetch products:', error)
      }
    } else {
      console.log('onMounted: Product search not enabled')
    }
  } else {
    console.log('onMounted: No brandId provided')
  }
})

watch(() => props.brandId, async (newBrandId) => {
  if (newBrandId) {
    try {
      projects.value = await getProjectsByBrand(newBrandId)
      console.log('Loaded projects for brand:', newBrandId, projects.value.length)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
    
    // Fetch products if product search is enabled
    if (isProductSearchEnabled.value) {
      console.log('Fetching products for search (watch brandId), brandId:', newBrandId)
      await fetchProducts(newBrandId)
      console.log('Products loaded (watch brandId):', allProducts.value.length)
    }
  } else {
    projects.value = []
  }
})

// Watch product search enabled state to fetch products when it becomes true
watch(isProductSearchEnabled, async (enabled) => {
  if (enabled && props.brandId) {
    console.log('Product search enabled (watch), fetching products for brandId:', props.brandId)
    try {
      await fetchProducts(props.brandId)
      console.log('Products loaded (watch isProductSearchEnabled):', allProducts.value.length)
      if (allProducts.value.length === 0) {
        console.warn('No products found for brandId:', props.brandId)
      }
    } catch (error) {
      console.error('Failed to fetch products (watch isProductSearchEnabled):', error)
    }
  }
}, { immediate: true })

// Filter products for search dropdown
const filteredProducts = computed(() => {
  if (!isProductSearchEnabled.value || !productNameInput.value.trim()) {
    return []
  }
  
  // If products haven't been loaded yet, return empty
  if (!allProducts.value || allProducts.value.length === 0) {
    console.log('No products loaded yet, allProducts length:', allProducts.value?.length || 0)
    return []
  }
  
  console.log('Total products loaded:', allProducts.value.length)
  let filtered = [...allProducts.value]
  
  // Note: We show ALL products regardless of collection, since selecting an existing product
  // will create a new product document with the same SKU for the current collection
  
  const query = productNameInput.value.trim().toLowerCase()
  filtered = filtered.filter((p) => 
    p.name.toLowerCase().includes(query) || 
    p.sku.toLowerCase().includes(query)
  )
  
  console.log(`Filtered products: ${filtered.length} for query "${query}" (from ${allProducts.value.length} total products)`)
  if (filtered.length === 0 && allProducts.value.length > 0) {
    console.log('Sample product names:', allProducts.value.slice(0, 5).map(p => p.name))
  }
  return filtered.slice(0, 10) // Limit to 10 results
})

function handleProductNameFocus() {
  // Show dropdown when focusing if there's text and filtered products
  if (productNameInput.value.trim() && filteredProducts.value.length > 0) {
    showProductDropdown.value = true
  }
}

function handleProductNameInput() {
  formData.value.name = productNameInput.value
  // Show dropdown if there's text and filtered products are available
  const hasFiltered = filteredProducts.value.length > 0
  console.log('Input handler - query:', productNameInput.value.trim(), 'filtered:', hasFiltered, 'showDropdown:', showProductDropdown.value)
  if (productNameInput.value.trim() && hasFiltered) {
    showProductDropdown.value = true
  } else {
    showProductDropdown.value = false
  }
}

function handleProductNameBlur() {
  // Sync formData.name with productNameInput when blurring
  formData.value.name = productNameInput.value
  // Delay to allow click events to fire
  setTimeout(() => {
    showProductDropdown.value = false
  }, 200)
}

function selectExistingProduct(product: Product) {
  // Pre-fill form data from existing product
  formData.value.name = product.name
  formData.value.sku = product.sku // Keep same SKU for catalogue grouping
  formData.value.gender = product.gender || ''
  formData.value.category = product.category
  categoryInput.value = product.category
  formData.value.imageUrl = product.imageUrl || ''
  formData.value.tags = [...(product.tags || [])]
  // Populate all colors but with no checkmarks (complete: false) and add "restock" tag
  formData.value.colors = (product.colors || []).map(c => ({ 
    name: c.name, 
    complete: false,
    tags: ['restock'], // Add restock tag by default when selecting existing product
    imageUrl: c.imageUrl // Preserve image URLs
  }))
  formData.value.notes = product.notes || ''
  
  // Reset these fields to defaults as specified
  formData.value.goLiveDate = ''
  formData.value.scheduledShootDate = ''
  formData.value.tentativeExFactoryDate = ''
  formData.value.factoryShipDate = ''
  formData.value.orderId = ''
  formData.value.priority = 'medium'
  formData.value.status = 'on-time'
  formData.value.shotType = []
  formData.value.shootStatus = ''
  formData.value.stage = 'warehouse' // Reset to warehouse
  formData.value.sample = false // Reset sample flag
  columnNumber.value = 1 // Reset to warehouse (column 1)
  
  productNameInput.value = product.name
  showProductDropdown.value = false
}

watch(
  () => props.product,
  (product) => {
    if (product) {
      formData.value = {
        name: product.name,
        sku: product.sku,
        projectId: product.projectId || '',
        gender: product.gender || '',
        category: product.category,
        stage: product.stage,
        priority: product.priority,
        status: product.status,
        shotType: Array.isArray(product.shotType) ? product.shotType : product.shotType ? [product.shotType] : [],
        goLiveDate: product.goLiveDate?.toDate().toISOString().split('T')[0] || '',
        scheduledShootDate: product.scheduledShootDate ? product.scheduledShootDate.toDate().toISOString().split('T')[0] || '' : '',
        tentativeExFactoryDate: product.tentativeExFactoryDate
          ? product.tentativeExFactoryDate.toDate().toISOString().split('T')[0] || ''
          : '',
        factoryShipDate: product.factoryShipDate
          ? product.factoryShipDate.toDate().toISOString().split('T')[0] || ''
          : '',
        orderId: product.orderId || '',
        shootStatus: product.shootStatus || '',
        imageUrl: product.imageUrl || '',
        tags: product.tags,
        colors: product.colors || [],
        notes: product.notes || '',
        sample: product.sample || false,
        ecommAssetsComplete: product.ecommAssetsComplete || false,
      }
      categoryInput.value = product.category
      columnNumber.value = getColumnFromStage(product.stage)
      if (isProductSearchEnabled.value) {
        productNameInput.value = product.name
      }
    } else {
      formData.value = {
        name: '',
        sku: '',
        projectId: props.defaultProjectId || '',
        gender: '',
        category: '',
        stage: 'warehouse',
        priority: 'medium',
        status: 'on-time',
        shotType: [],
        goLiveDate: '',
        scheduledShootDate: '',
        tentativeExFactoryDate: '',
        factoryShipDate: '',
        orderId: '',
        shootStatus: '',
        imageUrl: '',
        tags: [],
        colors: [],
        notes: '',
        sample: false,
        ecommAssetsComplete: false,
      }
      categoryInput.value = ''
      colorInput.value = ''
      columnNumber.value = 1
      if (isProductSearchEnabled.value) {
        productNameInput.value = ''
      }
    }
  },
  { immediate: true }
)

// Sync productNameInput with formData.name when not searching (but don't interfere when user is typing)
watch(() => formData.value.name, (newName) => {
  // Only sync if product search is enabled, dropdown is closed, and the values don't match
  // This prevents interference when user is actively typing
  if (isProductSearchEnabled.value && !showProductDropdown.value && productNameInput.value !== newName) {
    productNameInput.value = newName
  }
})

// Sync column number changes to stage
watch(columnNumber, (col) => {
  formData.value.stage = getStageFromColumn(col)
})

function addTagsFromInput() {
  const input = tagInput.value.trim()
  if (input) {
    // Split by comma or semicolon and process each tag
    const newTags = input
      .split(/[;,]/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    
    // Add tags that don't already exist
    newTags.forEach((tag) => {
      if (!formData.value.tags.includes(tag)) {
        formData.value.tags.push(tag)
      }
    })
    tagInput.value = ''
  }
}


function removeTag(tag: string) {
  formData.value.tags = formData.value.tags.filter((t) => t !== tag)
}

function addColor() {
  const colorName = colorInput.value.trim()
  if (colorName && !formData.value.colors.some(c => c.name.toLowerCase() === colorName.toLowerCase())) {
    // When manually adding a color, give it "new" tag
    formData.value.colors.push({ 
      name: colorName, 
      complete: false,
      tags: ['new']
    })
    colorInput.value = ''
  }
}

function toggleColorTagDropdown(colorIndex: number) {
  if (openColorTagDropdown.value === colorIndex) {
    openColorTagDropdown.value = null
  } else {
    openColorTagDropdown.value = colorIndex
  }
}

function setColorTag(colorIndex: number, tag: string) {
  const color = formData.value.colors[colorIndex]
  if (!color) return
  
  if (tag === '') {
    color.tags = []
  } else {
    color.tags = [tag] // Only allow one tag: either "restock" or "new"
  }
  
  openColorTagDropdown.value = null // Close dropdown after selection
}

function removeColor(index: number) {
  formData.value.colors.splice(index, 1)
}

function handleColorBlur(index: number) {
  if (!formData.value.colors[index]?.name.trim()) {
    removeColor(index)
  }
}

function applyColorVariantPatch(index: number, patch: Partial<ProductColor>) {
  const color = formData.value.colors[index]
  if (!color) return
  if ('colorCode' in patch) color.colorCode = patch.colorCode
  if ('sku' in patch) color.sku = patch.sku
  if ('imageUrl' in patch) color.imageUrl = patch.imageUrl
}

function toggleShotType(value: Product['shotType'][number]) {
  const index = formData.value.shotType.indexOf(value)
  if (index > -1) {
    formData.value.shotType.splice(index, 1)
  } else {
    formData.value.shotType.push(value)
  }
}

const validationError = ref('')

function handleSubmit() {
  validationError.value = ''
  
  if (!formData.value.name.trim()) {
    validationError.value = 'Product name is required'
    return
  }
  if (!formData.value.sku.trim()) {
    validationError.value = 'SKU is required'
    return
  }
  if (!formData.value.category.trim() && !categoryInput.value.trim()) {
    validationError.value = 'Category is required'
    return
  }

  const scheduledShootDate = dateInputValueToTimestamp(formData.value.scheduledShootDate)
  const tentativeExFactoryDate = dateInputValueToTimestamp(formData.value.tentativeExFactoryDate)
  const factoryShipDate = dateInputValueToTimestamp(formData.value.factoryShipDate)

  // Prepare data, excluding empty gender and shootStatus
  const {
    gender,
    shootStatus,
    goLiveDate: goLiveDateInput,
    projectId: projectIdInput,
    scheduledShootDate: _scheduledShootInput,
    tentativeExFactoryDate: _tentativeExFactoryInput,
    factoryShipDate: _factoryShipInput,
    orderId: orderIdInput,
    ...formDataWithoutGender
  } = formData.value
  const genderStr = String(gender || '')
  const shootStatusStr = String(shootStatus || '')
  const genderValue: Product['gender'] | undefined = genderStr.trim() ? gender as Product['gender'] : undefined
  const shootStatusValue: Product['shootStatus'] | undefined = shootStatusStr.trim() ? shootStatus as Product['shootStatus'] : undefined
  
  const orderIdValue = orderIdInput.trim()

  const submitData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'> = {
    ...formDataWithoutGender,
    brandId: props.brandId,
    scheduledShootDate,
    tentativeExFactoryDate,
    factoryShipDate,
    orderId: orderIdValue || undefined,
    category: categoryInput.value.trim() || formData.value.category,
    ...(genderValue ? { gender: genderValue } : {}),
    ...(shootStatusValue ? { shootStatus: shootStatusValue } : {}),
  }
  if (!submitData.scheduledShootDate) {
    delete submitData.scheduledShootDate
  }
  if (!submitData.tentativeExFactoryDate) {
    delete submitData.tentativeExFactoryDate
  }
  if (!submitData.factoryShipDate) {
    delete submitData.factoryShipDate
  }
  if (!submitData.orderId) {
    delete submitData.orderId
  }
  if (!submitData.colors || submitData.colors.length === 0) {
    delete submitData.colors
  }
  if (!submitData.imageUrl || !submitData.imageUrl.trim()) {
    delete submitData.imageUrl
  }
  if (!submitData.notes || !submitData.notes.trim()) {
    delete submitData.notes
  }
  if (!submitData.sample) {
    delete submitData.sample
  }
  if (!submitData.ecommAssetsComplete) {
    delete submitData.ecommAssetsComplete
  }
  if (projectIdInput?.trim()) {
    submitData.projectId = projectIdInput.trim()
  }
  const goLiveTrimmed = goLiveDateInput?.trim()
  if (goLiveTrimmed) {
    const goLiveParts = goLiveTrimmed.split('-').map(Number)
    const goLiveYear = goLiveParts[0] ?? 0
    const goLiveMonth = (goLiveParts[1] ?? 1) - 1
    const goLiveDay = goLiveParts[2] ?? 1
    const goLiveDateUTC = new Date(Date.UTC(goLiveYear, goLiveMonth, goLiveDay))
    submitData.goLiveDate = Timestamp.fromDate(goLiveDateUTC)
  }

  // Clear any previous validation errors
  validationError.value = ''
  console.log('ProductForm: Emitting save event with data:', submitData)
  emit('save', submitData)
}

function handleDelete() {
  if (!props.product) return
  
  if (confirm('Are you sure you want to delete this product?')) {
    emit('delete')
  }
}

function submit() {
  handleSubmit()
}

// Expose methods for parent to call
defineExpose({
  submit,
  handleDelete,
})
</script>

<style scoped>
.dropdown-enter-active {
  transition: all 0.15s ease-out;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.dropdown-leave-active {
  transition: all 0.1s ease-in;
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
