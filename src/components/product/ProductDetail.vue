<template>
  <Transition name="slide-over">
    <div
      v-if="isOpen"
      class="fixed top-0 bottom-0 right-0 z-50 w-full sm:w-96 bg-card border-l border-border shadow-xl overflow-y-auto"
      @click.self="showPriorityDropdown = false; openColorTagDropdown = null"
    >
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-text">Product Details</h2>
          <button
            class="text-muted hover:text-text"
            @click="$emit('close')"
          >
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

        <div v-if="product" class="space-y-6">
          <div v-if="product.imageUrl" class="w-full h-48 bg-bg rounded border border-border overflow-hidden">
            <img
              :src="product.imageUrl"
              :alt="product.name"
              class="w-full h-full object-cover"
            />
          </div>

          <div>
            <h3 class="text-lg font-semibold text-text mb-1">{{ product.name }}</h3>
            <p class="text-sm text-muted">SKU: {{ product.sku }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Category</label>
              <p class="text-sm text-text">{{ product.category }}</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Priority</label>
              <div class="relative">
                <button
                  type="button"
                  class="inline-block px-2 py-1 text-xs font-medium rounded cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                  :class="priorityTagClass"
                  @click="showPriorityDropdown = !showPriorityDropdown"
                >
                  {{ priorityLabel }}
                  <svg class="inline-block w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  v-if="showPriorityDropdown"
                  class="absolute z-10 mt-1 w-32 bg-card border border-border rounded-md shadow-lg"
                >
                  <button
                    v-for="priorityOption in priorityOptions"
                    :key="priorityOption.value"
                    type="button"
                    class="w-full text-left px-3 py-2 text-xs hover:bg-bg first:rounded-t-md last:rounded-b-md transition-colors"
                    :class="product.priority === priorityOption.value ? 'font-medium bg-indigo-50' : ''"
                    @click="handlePrioritySelect(priorityOption.value)"
                  >
                    {{ priorityOption.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Shot Type</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="shotTypeOption in shotTypeOptions"
                :key="shotTypeOption.value"
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-md border transition-all duration-200"
                :class="localShotTypes.includes(shotTypeOption.value)
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md hover:bg-indigo-700'
                  : 'bg-bg text-text border-border hover:bg-card hover:border-indigo-300'"
                @click="toggleShotType(shotTypeOption.value)"
              >
                {{ shotTypeOption.label }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted mb-1">
              Collection
              <span class="font-normal text-muted"> (optional)</span>
            </label>
            <select
              :value="product.projectId || ''"
              class="w-full px-2 py-1 text-sm bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
              @change="handleCollectionChange"
            >
              <option value="">No collection</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }} ({{ project.season }} {{ project.year }})
              </option>
            </select>
            <p v-if="projects.length === 0" class="mt-1 text-[10px] text-amber-700">
              No collections found. Create one under Collections first.
            </p>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Stage</label>
            <select
              :value="product.stage"
              class="w-full px-2 py-1 text-sm bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
              @change="handleStageChange"
            >
              <option v-for="stage in stages" :key="stage" :value="stage">
                {{ stageLabels[stage] }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Tags</label>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="tag in localTags"
                :key="tag"
                class="inline-flex items-center px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700"
              >
                {{ tag }}
                <button
                  type="button"
                  class="ml-1 text-emerald-600 hover:text-emerald-800"
                  @click="removeTag(tag)"
                >
                  ×
                </button>
              </span>
            </div>
            <input
              v-model="tagInput"
              type="text"
              class="w-full px-2 py-1 text-xs bg-bg border border-border rounded text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Add tags (comma or semicolon separated)"
              @blur="addTagsFromInput"
              @keydown.enter.prevent="addTagsFromInput"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Order ID</label>
            <input
              :value="orderIdInput"
              type="text"
              class="w-full px-2 py-1 text-sm bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. PO-12345"
              @change="handleOrderIdChange"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Go Live Date</label>
              <input
                :value="goLiveDateInput"
                type="date"
                class="w-full px-2 py-1 text-sm bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @change="handleGoLiveDateChange"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Scheduled Shoot Date</label>
              <input
                :value="scheduledShootDateInput"
                type="date"
                class="w-full px-2 py-1 text-sm bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @change="handleScheduledShootDateChange"
              />
            </div>
            <div class="col-span-2">
              <div
                v-if="pastExFactoryAwaitingShip"
                class="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900"
              >
                Ex-factory date has passed and this product is not marked shipped yet. Update the date or mark shipped when it leaves the factory.
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Tentative ex-factory</label>
              <input
                :value="tentativeExFactoryDateInput"
                type="date"
                class="w-full px-2 py-1 text-sm bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @change="handleTentativeExFactoryDateChange"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Factory shipped</label>
              <input
                :value="factoryShipDateInput"
                type="date"
                class="w-full px-2 py-1 text-sm bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
                @change="handleFactoryShipDateChange"
              />
              <button
                v-if="!factoryShipDateInput"
                type="button"
                class="mt-1.5 w-full px-2 py-1.5 text-xs font-medium rounded border border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 transition-colors"
                @click="markFactoryShippedToday"
              >
                Mark shipped today
              </button>
            </div>
          </div>
          <label class="flex items-start gap-2.5 cursor-pointer rounded-md border border-border p-3 bg-bg">
            <input
              type="checkbox"
              class="mt-0.5 w-4 h-4 text-indigo-600 border-border rounded focus:ring-indigo-500"
              :checked="!!product.ecommAssetsComplete"
              @change="handleEcommAssetsCompleteChange"
            />
            <span>
              <span class="block text-sm font-medium text-text">Assets complete (ecomm)</span>
              <span class="block text-xs text-muted mt-0.5 leading-relaxed">
                Check when sample (or early) ecomm photography is done — bulk units arriving won't need new assets.
              </span>
            </span>
          </label>
          <div v-if="product.assignedTo">
            <label class="block text-xs font-medium text-muted mb-1">Assigned To</label>
            <p class="text-sm text-text">{{ product.assignedTo }}</p>
          </div>

          <div v-if="product.colors && product.colors.length > 0">
            <label class="block text-xs font-medium text-muted mb-2">Colors</label>
            <div class="space-y-1.5">
              <div
                v-for="(color, index) in localColors"
                :key="index"
                class="bg-bg border border-border rounded p-2.5 hover:bg-card transition-colors"
              >
                <div class="flex items-start gap-3">
                  <!-- Checkbox -->
                  <label class="cursor-pointer flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      :checked="color.complete"
                      class="sr-only"
                      @change="toggleColorComplete(index)"
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
                    <div
                      class="text-sm font-medium mb-0.5"
                      :class="color.complete ? 'line-through text-muted' : 'text-text'"
                    >
                      {{ color.name }}
                    </div>
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
                      :main-sku="product.sku"
                      @change="(patch: Partial<ProductColor>) => applyColorVariantPatch(index, patch)"
                    />
                  </div>
                  
                  <!-- Stage dropdown (shorter, on the right) -->
                  <select
                    v-if="localColors.length > 1"
                    :key="`color-${index}-${product.id}`"
                    :value="colorMovingToStage[index] || ''"
                    class="color-stage-select px-2 py-1 text-[10px] font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors border-0 cursor-pointer flex-shrink-0"
                    :disabled="!!colorMovingToStage[index]"
                    @change="(e: Event) => {
                      const targetStage = (e.target as HTMLSelectElement).value as Product['stage']
                      if (targetStage) {
                        moveColorToStage(index, targetStage)
                      }
                    }"
                    @click.stop
                  >
                    <option value="">Stage</option>
                    <option
                      v-for="stage in stages"
                      :key="stage"
                      :value="stage"
                      :disabled="stage === product.stage"
                    >
                      {{ stageLabels[stage] }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Other Products with Same SKU -->
          <div v-if="otherProductsWithSameSKU.length > 0">
            <label class="block text-xs font-medium text-muted mb-2">
              Other Tasks (Same SKU: {{ product.sku }})
            </label>
            <div class="space-y-2">
              <button
                v-for="otherProduct in otherProductsWithSameSKU"
                :key="otherProduct.id"
                type="button"
                class="w-full text-left p-3 bg-bg border border-border rounded hover:bg-card hover:border-indigo-300 transition-colors"
                @click="openProductDetail(otherProduct.id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-text mb-1 truncate">
                      {{ otherProduct.name }}
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span
                        class="px-2 py-0.5 text-[10px] font-medium rounded text-text"
                        :style="{ backgroundColor: getStageColor(otherProduct.stage) + 'CC' }"
                      >
                        {{ stageLabels[otherProduct.stage] }}
                      </span>
                      <span
                        v-if="otherProduct.colors && otherProduct.colors.length > 0"
                        class="text-xs text-muted"
                      >
                        {{ otherProduct.colors.length }} color{{ otherProduct.colors.length !== 1 ? 's' : '' }}:
                        {{ otherProduct.colors.map(c => c.name).join(', ') }}
                      </span>
                    </div>
                  </div>
                  <svg
                    class="w-4 h-4 text-muted flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <div v-if="product.notes">
            <label class="block text-xs font-medium text-muted mb-2">Notes</label>
            <p class="text-sm text-text whitespace-pre-wrap">{{ product.notes }}</p>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-2">Stage History</label>
            <div class="space-y-3">
              <div
                v-for="(change, index) in product.stageHistory"
                :key="index"
                class="flex items-start space-x-3 pb-3 border-b border-border last:border-0"
              >
                <div class="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5"></div>
                <div class="flex-1">
                  <p class="text-sm text-text">
                    Changed from <span class="font-medium">{{ stageLabels[change.from as Product['stage']] }}</span> to
                    <span class="font-medium">{{ stageLabels[change.to as Product['stage']] }}</span>
                  </p>
                  <p class="text-xs text-muted mt-1">
                    {{ formatDateTime(change.changedAt) }} by {{ getUserDisplayName(change.changedBy) }}
                  </p>
                </div>
              </div>
              <div v-if="product.stageHistory.length === 0" class="text-sm text-muted">
                No stage changes yet
              </div>
            </div>
          </div>

          <div class="flex space-x-3 pt-4 border-t border-border">
            <button
              class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              @click="$emit('edit')"
            >
              Edit
            </button>
            <button
              class="px-4 py-2 border border-border rounded-md text-sm font-medium text-text hover:bg-bg"
              @click="$emit('close')"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    </Transition>

  <Transition name="backdrop">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black bg-opacity-20 z-40"
      @click="$emit('close')"
    ></div>
  </Transition>

  <!-- Suggest go-live after ex-factory change -->
  <Transition name="backdrop">
    <div
      v-if="showGoLiveSuggestModal"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      @click.self="dismissGoLiveSuggest"
    >
      <div
        class="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl"
        role="dialog"
        aria-labelledby="go-live-suggest-title"
      >
        <h3 id="go-live-suggest-title" class="text-base font-semibold text-text mb-2">
          Update go-live date?
        </h3>
        <p class="text-sm text-muted mb-4">
          Set go-live to
          <strong class="text-text">{{ goLiveSuggestLabel }}</strong>
          ({{ DEFAULT_WEEKS_FROM_EX_FACTORY_TO_LAUNCH }} weeks after the new ex-factory date)?
        </p>
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            class="px-3 py-2 text-sm border border-border rounded-md text-text hover:bg-bg"
            @click="dismissGoLiveSuggest"
          >
            Not now
          </button>
          <button
            type="button"
            class="px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            @click="applySuggestedGoLiveDate"
          >
            Update go-live
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Color Image Modal -->
  <ColorImageModal
    v-if="selectedColor && product"
    :is-open="colorImageModalOpen"
    :color-name="selectedColor.name"
    :storage-path="selectedColorStoragePath"
    :current-image-url="selectedColor.imageUrl"
    @update:is-open="colorImageModalOpen = $event"
    @image-updated="handleColorImageUpdated"
    @image-removed="handleColorImageRemoved"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { Product, UserProfile, ProductColor } from '@/types'
import { PIPELINE_STAGES, STAGE_LABELS, PRIORITY_LABELS } from '@/types'
import {
  dateInputValueToTimestamp,
  formatDateTime,
  timestampToDateInputValue,
  isPastExFactoryAwaitingShip,
  suggestedGoLiveDateFromExFactory,
  formatDateInputLabel,
  DEFAULT_WEEKS_FROM_EX_FACTORY_TO_LAUNCH,
} from '@/utils/dates'
import { useAuthStore } from '@/stores/auth'
import { getDoc } from '@/firebase/firestore'
import { useProducts } from '@/composables/useProducts'
import { useProject } from '@/composables/useProject'
import { useBrandStore } from '@/stores/brand'
import { useToast } from '@/composables/useToast'
import { getStageColor } from '@/constants/stageColors'
import ColorImageModal from '@/components/product/ColorImageModal.vue'
import ColorVariantFields from '@/components/product/ColorVariantFields.vue'

const props = defineProps<{
  product: Product | null
  isOpen: boolean
  allProducts?: Product[]
}>()

const emit = defineEmits<{
  close: []
  edit: []
  delete: []
  'stage-changed': []
  'product-created': [productId: string]
  'open-product': [productId: string]
}>()

const authStore = useAuthStore()
const brandStore = useBrandStore()
const toast = useToast()
const { updateProduct, createProduct, updateStage, products: productsFromComposable, fetchProducts } = useProducts()
const { projects, fetchProjects } = useProject()

// Use products from props if provided, otherwise from composable
const allProducts = computed(() => props.allProducts || productsFromComposable.value)

const stages = PIPELINE_STAGES
const stageLabels = STAGE_LABELS
const priorityLabel = computed(() =>
  props.product ? PRIORITY_LABELS[props.product.priority] : ''
)

// Get other products with the same SKU
const otherProductsWithSameSKU = computed(() => {
  if (!props.product) return []
  return allProducts.value.filter(
    (p) => p.sku === props.product!.sku && p.id !== props.product!.id
  )
})

// Local reactive copies for editing
const localColors = ref<ProductColor[]>([])
const localShotTypes = ref<Product['shotType']>([])
const localTags = ref<string[]>([])
const tagInput = ref('')
const goLiveDateInput = ref('')
const scheduledShootDateInput = ref('')
const tentativeExFactoryDateInput = ref('')
const factoryShipDateInput = ref('')
const orderIdInput = ref('')
const showGoLiveSuggestModal = ref(false)
const pendingGoLiveSuggestInput = ref('')

const pastExFactoryAwaitingShip = computed(() =>
  props.product ? isPastExFactoryAwaitingShip(props.product) : false
)

const goLiveSuggestLabel = computed(() => {
  if (!pendingGoLiveSuggestInput.value) return ''
  const ts = dateInputValueToTimestamp(pendingGoLiveSuggestInput.value)
  if (!ts) return ''
  return formatDateInputLabel(ts.toDate())
})
const showPriorityDropdown = ref(false)
const openColorTagDropdown = ref<number | null>(null)
const colorMovingToStage = ref<Record<number, Product['stage'] | null>>({})

// Color image modal state
const colorImageModalOpen = ref(false)
const selectedColorIndex = ref<number | null>(null)

function openColorImageModal(colorIndex: number) {
  selectedColorIndex.value = colorIndex
  colorImageModalOpen.value = true
}

async function handleColorImageUpdated(url: string) {
  if (selectedColorIndex.value !== null && props.product) {
    const color = localColors.value[selectedColorIndex.value]
    if (color) {
      color.imageUrl = url
      await updateProduct(props.product.id, { colors: [...localColors.value] })
      toast.success('Color image updated')
    }
  }
}

async function handleColorImageRemoved() {
  if (selectedColorIndex.value !== null && props.product) {
    const color = localColors.value[selectedColorIndex.value]
    if (color) {
      color.imageUrl = undefined
      await updateProduct(props.product.id, { colors: [...localColors.value] })
      toast.success('Color image removed')
    }
  }
}

const selectedColor = computed(() => {
  if (selectedColorIndex.value !== null) {
    const color = localColors.value[selectedColorIndex.value]
    if (color) {
      return color
    }
  }
  return null
})

function getColorImageStoragePath(colorIndex: number): string {
  const color = localColors.value[colorIndex]
  if (!color) return ''
  
  const colorName = color.name?.trim() || `color-${colorIndex}`
  const sanitizedColorName = colorName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  const brandId = brandStore.brandId || ''
  
  if (props.product?.id) {
    return `brands/${brandId}/products/${props.product.id}/colors/${sanitizedColorName}`
  }
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return `brands/${brandId}/products/${tempId}/colors/${sanitizedColorName}`
}

const selectedColorStoragePath = computed(() => {
  if (selectedColorIndex.value !== null) {
    return getColorImageStoragePath(selectedColorIndex.value)
  }
  return ''
})

// Shot type options
const shotTypeOptions: Array<{ value: Product['shotType'][number]; label: string }> = [
  { value: 'flat_lay', label: 'Flat Lay' },
  { value: 'on_model', label: 'On Model' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'ghost_mannequin', label: 'Ghost Mannequin' },
]

// Priority options
const priorityOptions: Array<{ value: Product['priority']; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

// Initialize local state when product changes
watch(
  () => props.product,
  (product) => {
    if (product) {
      localColors.value = product.colors ? [...product.colors] : []
      localShotTypes.value = Array.isArray(product.shotType) && product.shotType.length > 0 
        ? [...product.shotType] 
        : []
      localTags.value = product.tags ? [...product.tags] : []
      localColors.value = product.colors ? product.colors.map(c => ({ ...c, tags: c.tags ? [...c.tags] : [] })) : []
      goLiveDateInput.value = timestampToDateInputValue(product.goLiveDate)
      scheduledShootDateInput.value = timestampToDateInputValue(product.scheduledShootDate)
      tentativeExFactoryDateInput.value = timestampToDateInputValue(product.tentativeExFactoryDate)
      factoryShipDateInput.value = timestampToDateInputValue(product.factoryShipDate)
      orderIdInput.value = product.orderId || ''
    } else {
      localColors.value = []
      localShotTypes.value = []
      localTags.value = []
      goLiveDateInput.value = ''
      scheduledShootDateInput.value = ''
      tentativeExFactoryDateInput.value = ''
      factoryShipDateInput.value = ''
      orderIdInput.value = ''
    }
    showPriorityDropdown.value = false
    colorMovingToStage.value = {} // Reset moving states
  },
  { immediate: true, deep: true }
)

function addTagsFromInput() {
  if (!tagInput.value.trim() || !props.product) return
  
  const input = tagInput.value.trim()
  const newTags = input
    .split(/[,;]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
  
  // Add tags that don't already exist
  const tagsToAdd: string[] = []
  newTags.forEach((tag) => {
    if (!localTags.value.includes(tag)) {
      tagsToAdd.push(tag)
    }
  })
  
  if (tagsToAdd.length > 0) {
    localTags.value = [...localTags.value, ...tagsToAdd]
    saveTags()
  }
  
  tagInput.value = ''
}

async function removeTag(tag: string) {
  if (!props.product) return
  
  localTags.value = localTags.value.filter((t) => t !== tag)
  await saveTags()
}

async function saveTags() {
  if (!props.product) return
  
  try {
    await updateProduct(props.product.id, { tags: [...localTags.value] })
    toast.success('Tags updated')
  } catch (error: any) {
    console.error('Failed to update tags:', error)
    toast.error(error.message || 'Failed to update tags')
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
  if (!props.product) return
  
  const color = localColors.value[colorIndex]
  if (!color) return
  
  if (tag === '') {
    color.tags = []
  } else {
    color.tags = [tag] // Only allow one tag: either "restock" or "new"
  }
  
  openColorTagDropdown.value = null // Close dropdown after selection
      saveColorTags()
}

async function applyColorVariantPatch(index: number, patch: Partial<ProductColor>) {
  if (!props.product) return
  const color = localColors.value[index]
  if (!color) return
  if ('colorCode' in patch) color.colorCode = patch.colorCode
  if ('sku' in patch) color.sku = patch.sku
  if ('imageUrl' in patch) color.imageUrl = patch.imageUrl
  try {
    await updateProduct(props.product.id, { colors: [...localColors.value] })
    toast.success('Color updated')
    emit('stage-changed')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update color'
    toast.error(message)
  }
}

async function saveColorTags() {
  if (!props.product) return
  
  try {
    await updateProduct(props.product.id, { colors: [...localColors.value] })
    toast.success('Color tag updated')
  } catch (error: any) {
    console.error('Failed to update color tag:', error)
    toast.error(error.message || 'Failed to update color tag')
  }
}

async function handleGoLiveDateChange(event: Event) {
  if (!props.product) return
  
  const target = event.target as HTMLInputElement
  const dateValue = target.value
  
  if (!dateValue) return
  
  try {
    // Parse the date string (YYYY-MM-DD) and create a date at midnight UTC
    // Use Timestamp.fromMillis to ensure we're storing exactly midnight UTC
    const parts = dateValue.split('-').map(Number)
    const year = parts[0]
    const month = parts[1]
    const day = parts[2]
    
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      toast.error('Invalid date format')
      return
    }
    
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    // Create timestamp directly from UTC milliseconds to avoid any timezone conversion
    const timestamp = Timestamp.fromMillis(utcDate.getTime())
    
    await updateProduct(props.product.id, { goLiveDate: timestamp })
    
    // Update the local input value immediately to reflect the saved date
    goLiveDateInput.value = dateValue
    
    toast.success('Go live date updated')
    // Emit event to parent to refresh product data
    emit('stage-changed')
  } catch (error: any) {
    console.error('Failed to update go live date:', error)
    toast.error(error.message || 'Failed to update go live date')
  }
}

async function handleScheduledShootDateChange(event: Event) {
  await handleOptionalProductDateChange(event, 'scheduledShootDate', scheduledShootDateInput, 'Scheduled shoot date')
}

async function handleTentativeExFactoryDateChange(event: Event) {
  if (!props.product) return

  const dateValue = (event.target as HTMLInputElement).value

  try {
    if (dateValue) {
      const timestamp = dateInputValueToTimestamp(dateValue)
      if (!timestamp) {
        toast.error('Invalid date format')
        return
      }
      await updateProduct(props.product.id, { tentativeExFactoryDate: timestamp })
      tentativeExFactoryDateInput.value = dateValue
      toast.success('Tentative ex-factory date updated')

      const suggested = suggestedGoLiveDateFromExFactory(timestamp.toDate())
      pendingGoLiveSuggestInput.value = timestampToDateInputValue(
        Timestamp.fromMillis(suggested.getTime())
      )
      showGoLiveSuggestModal.value = true
    } else {
      await updateProduct(props.product.id, { tentativeExFactoryDate: undefined })
      tentativeExFactoryDateInput.value = ''
      toast.success('Tentative ex-factory date removed')
    }
    emit('stage-changed')
  } catch (error: any) {
    console.error('Failed to update tentative ex-factory date:', error)
    toast.error(error.message || 'Failed to update tentative ex-factory date')
  }
}

function dismissGoLiveSuggest() {
  showGoLiveSuggestModal.value = false
  pendingGoLiveSuggestInput.value = ''
}

async function applySuggestedGoLiveDate() {
  if (!props.product || !pendingGoLiveSuggestInput.value) {
    dismissGoLiveSuggest()
    return
  }
  const timestamp = dateInputValueToTimestamp(pendingGoLiveSuggestInput.value)
  if (!timestamp) {
    toast.error('Invalid suggested date')
    dismissGoLiveSuggest()
    return
  }
  try {
    await updateProduct(props.product.id, { goLiveDate: timestamp })
    goLiveDateInput.value = pendingGoLiveSuggestInput.value
    toast.success('Go-live date updated')
    emit('stage-changed')
  } catch (error: any) {
    toast.error(error.message || 'Failed to update go-live date')
  } finally {
    dismissGoLiveSuggest()
  }
}

async function markFactoryShippedToday() {
  if (!props.product) return
  const now = new Date()
  const todayValue = timestampToDateInputValue(
    Timestamp.fromDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())))
  )
  const timestamp = dateInputValueToTimestamp(todayValue)
  if (!timestamp) return
  try {
    await updateProduct(props.product.id, { factoryShipDate: timestamp })
    factoryShipDateInput.value = todayValue
    toast.success('Marked as shipped from factory')
    emit('stage-changed')
  } catch (error: any) {
    toast.error(error.message || 'Failed to mark shipped')
  }
}

async function handleFactoryShipDateChange(event: Event) {
  await handleOptionalProductDateChange(event, 'factoryShipDate', factoryShipDateInput, 'Factory ship date')
}

async function handleEcommAssetsCompleteChange(event: Event) {
  if (!props.product) return
  const checked = (event.target as HTMLInputElement).checked
  try {
    await updateProduct(props.product.id, {
      ecommAssetsComplete: checked ? true : undefined,
    })
    toast.success(checked ? 'Marked ecomm assets complete' : 'Ecomm assets marked as needed')
    emit('stage-changed')
  } catch (error: any) {
    toast.error(error.message || 'Failed to update ecomm assets status')
  }
}

async function handleOptionalProductDateChange(
  event: Event,
  field: 'scheduledShootDate' | 'tentativeExFactoryDate' | 'factoryShipDate',
  inputRef: { value: string },
  label: string
) {
  if (!props.product) return

  const dateValue = (event.target as HTMLInputElement).value

  try {
    if (dateValue) {
      const timestamp = dateInputValueToTimestamp(dateValue)
      if (!timestamp) {
        toast.error('Invalid date format')
        return
      }
      await updateProduct(props.product.id, { [field]: timestamp })
      inputRef.value = dateValue
      toast.success(`${label} updated`)
    } else {
      await updateProduct(props.product.id, { [field]: undefined })
      inputRef.value = ''
      toast.success(`${label} removed`)
    }
    emit('stage-changed')
  } catch (error: any) {
    console.error(`Failed to update ${field}:`, error)
    toast.error(error.message || `Failed to update ${label.toLowerCase()}`)
  }
}

async function handleOrderIdChange(event: Event) {
  if (!props.product) return

  const value = (event.target as HTMLInputElement).value.trim()

  try {
    await updateProduct(props.product.id, { orderId: value || undefined })
    orderIdInput.value = value
    toast.success(value ? 'Order ID updated' : 'Order ID removed')
    emit('stage-changed')
  } catch (error: any) {
    console.error('Failed to update order ID:', error)
    toast.error(error.message || 'Failed to update order ID')
  }
}

// Close dropdown when panel closes
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      showPriorityDropdown.value = false
      dismissGoLiveSuggest()
    }
  }
)

const priorityTagClass = computed(() => {
  if (!props.product) return ''
  const classes: Record<Product['priority'], string> = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
  }
  return classes[props.product.priority]
})

// User display names map
const userDisplayNames = ref<Record<string, string>>({})
const loadingUsers = ref<Set<string>>(new Set())

// Fetch user profiles for all unique userIds in stage history
async function loadUserDisplayNames() {
  if (!props.product || !props.product.stageHistory) return

  const userIds = new Set<string>()
  props.product.stageHistory.forEach((change) => {
    if (change.changedBy) {
      userIds.add(change.changedBy)
    }
  })

  // Fetch profiles for userIds we don't have yet
  const promises = Array.from(userIds)
    .filter((userId) => !userDisplayNames.value[userId] && !loadingUsers.value.has(userId))
    .map(async (userId) => {
      loadingUsers.value.add(userId)
      try {
        const profile = await getDoc<UserProfile>('userProfiles', userId)
        if (profile) {
          userDisplayNames.value[userId] = profile.displayName || profile.email || userId
        } else {
          userDisplayNames.value[userId] = userId // Fallback to userId if profile not found
        }
      } catch (error) {
        console.error(`Failed to fetch user profile for ${userId}:`, error)
        userDisplayNames.value[userId] = userId // Fallback to userId on error
      } finally {
        loadingUsers.value.delete(userId)
      }
    })

  await Promise.all(promises)
}

function getUserDisplayName(userId: string): string {
  return userDisplayNames.value[userId] || userId
}

// Watch for product changes and load user display names
watch(
  () => [props.product, props.isOpen],
  () => {
    if (props.product && props.isOpen) {
      loadUserDisplayNames()
      const brandId = brandStore.brandId
      if (brandId) {
        fetchProjects(brandId)
      }
      // Fetch products if not provided as prop
      if (!props.allProducts && brandStore.currentBrand) {
        fetchProducts(brandStore.currentBrand.id)
      }
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (props.product && props.isOpen) {
    loadUserDisplayNames()
  }
})

async function handleCollectionChange(event: Event) {
  if (!props.product) return

  const value = (event.target as HTMLSelectElement).value

  try {
    await updateProduct(
      props.product.id,
      (value ? { projectId: value } : { projectId: null }) as Partial<Product>
    )
    toast.success(value ? 'Collection updated' : 'Removed from collection')
    emit('stage-changed')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update collection'
    console.error('Failed to update collection:', error)
    toast.error(message)
  }
}

async function handleStageChange(event: Event) {
  if (!props.product || !authStore.userId) return
  const newStage = (event.target as HTMLSelectElement).value as Product['stage']
  const originalStage = props.product.stage
  
  // Use the composable's updateStage which handles stageHistory properly
  await updateStage(props.product.id, newStage, authStore.userId, originalStage)
  emit('stage-changed')
}

async function handlePrioritySelect(newPriority: Product['priority']) {
  if (!props.product) return
  showPriorityDropdown.value = false
  await updateProduct(props.product.id, { priority: newPriority })
  emit('stage-changed')
}

async function toggleColorComplete(index: number) {
  if (!props.product || !localColors.value[index]) return
  localColors.value[index]!.complete = !localColors.value[index]!.complete
  await updateProduct(props.product.id, { colors: [...localColors.value] })
  emit('stage-changed')
}

async function toggleShotType(shotType: Product['shotType'][number]) {
  if (!props.product) return
  const currentIndex = localShotTypes.value.indexOf(shotType)
  if (currentIndex > -1) {
    localShotTypes.value.splice(currentIndex, 1)
  } else {
    localShotTypes.value.push(shotType)
  }
  await updateProduct(props.product.id, { shotType: [...localShotTypes.value] })
  emit('stage-changed')
}


function openProductDetail(productId: string) {
  emit('open-product', productId)
}

async function moveColorToStage(colorIndex: number, targetStage: Product['stage']) {
  if (!props.product || !targetStage || !authStore.userId || !brandStore.currentBrand) {
    return
  }

  // Don't allow moving to the same stage
  if (targetStage === props.product.stage) {
    return
  }

  const color = localColors.value[colorIndex]
  if (!color) return

  // Show selected stage immediately
  colorMovingToStage.value[colorIndex] = targetStage

  try {
    // Create new product with same details but only this color
    const newProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory'> = {
      brandId: props.product.brandId,
      projectId: props.product.projectId,
      sku: props.product.sku,
      name: props.product.name,
      gender: props.product.gender,
      category: props.product.category,
      stage: targetStage,
      priority: props.product.priority,
      status: props.product.status,
      shotType: props.product.shotType,
      goLiveDate: props.product.goLiveDate,
      scheduledShootDate: props.product.scheduledShootDate,
      tentativeExFactoryDate: props.product.tentativeExFactoryDate,
      factoryShipDate: props.product.factoryShipDate,
      orderId: props.product.orderId,
      shootStatus: props.product.shootStatus,
      imageUrl: props.product.imageUrl,
      assignedTo: props.product.assignedTo,
      tags: [...props.product.tags],
      colors: [{ name: color.name, complete: false }],
      notes: props.product.notes,
      archived: props.product.archived,
      sample: props.product.sample,
    }

    // Create the new product
    const newProductId = await createProduct(newProductData)
    
    // Move the new product to the target stage (this will create stage history)
    await updateStage(newProductId, targetStage, authStore.userId, props.product.stage)

    // Remove the color from the original product
    const updatedColors = localColors.value.filter((_, idx) => idx !== colorIndex)
    await updateProduct(props.product.id, { colors: updatedColors })

    toast.success(`Moved "${color.name}" to ${stageLabels[targetStage]}`)
    emit('stage-changed')
    emit('product-created', newProductId)
    
    // Reset the dropdown after successful move
    colorMovingToStage.value[colorIndex] = null
  } catch (error: any) {
    console.error('Error moving color to stage:', error)
    toast.error(error.message || 'Failed to move color to stage')
    // Reset on error too
    colorMovingToStage.value[colorIndex] = null
  }
}
</script>

<style scoped>
.slide-over-enter-active,
.slide-over-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slide-over-enter-from {
  transform: translateX(100%);
}

.slide-over-leave-to {
  transform: translateX(100%);
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.3s;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.color-stage-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 0.75rem 0.75rem;
  padding-right: 1.75rem;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}
</style>
