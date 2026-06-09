<template>
  <Modal :is-open="!!beat" size="lg" :title="modalTitle" @close="$emit('close')">
    <template v-if="beat">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-semibold px-2 py-1 rounded-md" :class="channelBadgeClass(beat.channel)">
            {{ beat.channel === 'email' ? 'Email' : 'SMS' }}
          </span>
          <span
            v-if="beat.storyKind === 'best_sellers' || beat.storyKind === 'cadence_fill'"
            class="font-semibold px-2 py-1 rounded-md"
            :class="
              beat.storyKind === 'best_sellers'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-slate-100 text-slate-800'
            "
          >
            {{ beat.storyKind === 'best_sellers' ? 'Best sellers' : 'Plan fill' }}
          </span>
          <span
            v-else-if="beat.categoryLabel"
            class="font-semibold px-2 py-1 rounded-md text-white"
            :style="{ backgroundColor: categoryFamilyColor(beat.categoryFamily!) }"
          >
            {{ beat.categoryLabel }}
          </span>
          <span
            v-else-if="beat.storyKind === 'launch'"
            class="font-semibold px-2 py-1 rounded-md bg-emerald-100 text-emerald-900"
          >
            {{ launchTheme }}
          </span>
          <span v-if="isSaved" class="font-semibold px-2 py-1 rounded-md bg-indigo-100 text-indigo-900">
            Saved
          </span>
          <span class="text-muted">
            Send
            {{
              beat.sendDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            }}
            <template v-if="beat.launchWindowStart && beat.launchWindowEnd">
              · Go-live
              {{
                beat.launchWindowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }}
              –
              {{
                beat.launchWindowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }}
            </template>
          </span>
        </div>

        <div>
          <h4 class="text-base font-semibold text-text">{{ beat.title }}</h4>
          <p class="text-sm text-muted mt-2 leading-relaxed">{{ beat.storyAngle }}</p>
        </div>

        <ul v-if="beat.storyHooks.length" class="space-y-1.5">
          <li v-for="(hook, i) in beat.storyHooks" :key="i" class="text-sm text-text flex gap-2">
            <span class="text-emerald-600 shrink-0">→</span>
            <span>{{ hook }}</span>
          </li>
        </ul>

        <div v-if="beat.products.length" class="border border-border rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-bg text-xs text-muted uppercase">
              <tr>
                <th class="text-left px-3 py-2 font-semibold">Product</th>
                <th class="text-left px-3 py-2 font-semibold">Go-live</th>
                <th class="text-left px-3 py-2 font-semibold">Stage</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="p in beat.products" :key="p.id">
                <td class="px-3 py-2 text-text">
                  <div>{{ p.name }}</div>
                  <div class="text-[10px] text-muted font-mono">{{ p.sku }}</div>
                </td>
                <td class="px-3 py-2 text-xs whitespace-nowrap">
                  {{ p.goLiveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                  <span
                    v-if="p.pipelineGoLiveDate && goLiveShifted(p)"
                    class="block text-[10px] text-amber-700"
                  >
                    Pipeline
                    {{
                      p.pipelineGoLiveDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }}
                  </span>
                </td>
                <td class="px-3 py-2 text-xs text-muted">{{ p.stageLabel }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-3">
          <p class="text-xs font-semibold text-indigo-900 uppercase tracking-wide mb-1">Copy ideas</p>
          <p class="text-sm text-indigo-900/80">Coming soon — subject lines, SMS, and captions for this story.</p>
        </div>

        <div v-if="canEdit" class="border-t border-border pt-4 space-y-3">
          <label class="block text-xs font-semibold text-muted uppercase tracking-wide">
            Your notes
          </label>
          <textarea
            v-model="notesDraft"
            rows="3"
            class="w-full text-sm rounded-lg border border-border bg-card px-3 py-2 text-text"
            placeholder="Angles, segments, or reminders for this send…"
          />
          <p class="text-xs text-muted">
            Saving pins this story on the calendar. Changing your monthly send plan won’t remove or
            reshuffle saved stories.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              :disabled="saving"
              @click="emitSave"
            >
              {{ isSaved ? 'Update saved story' : 'Save story' }}
            </button>
            <button
              v-if="isSaved"
              type="button"
              class="text-sm font-medium px-4 py-2 rounded-lg border border-border text-text hover:bg-bg disabled:opacity-50"
              :disabled="saving"
              @click="emitUnsave"
            >
              Unsave
            </button>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/components/common/Modal.vue'
import {
  categoryFamilyColor,
  channelBadgeClass,
  type MarketingStoryBeat,
} from '@/utils/marketingStoryCalendar'

const props = defineProps<{
  beat: MarketingStoryBeat | null
  isSaved?: boolean
  savedNotes?: string
  canEdit?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [notes: string]
  unsave: []
}>()

const notesDraft = ref('')

watch(
  () => [props.beat?.id, props.savedNotes] as const,
  () => {
    notesDraft.value = props.savedNotes ?? ''
  },
  { immediate: true }
)

const launchTheme = computed(() => {
  if (!props.beat || props.beat.storyKind !== 'launch') return ''
  const label = props.beat.displayLabel
  const parts = label.split(' · ')
  return parts.length > 1 ? parts.slice(1).join(' · ') : label
})

const modalTitle = computed(() =>
  props.beat ? `Story · ${props.beat.displayLabel}` : 'Story concept'
)

function goLiveShifted(p: { goLiveDate: Date; pipelineGoLiveDate?: Date }): boolean {
  if (!p.pipelineGoLiveDate) return false
  return p.goLiveDate.toDateString() !== p.pipelineGoLiveDate.toDateString()
}

function emitSave() {
  emit('save', notesDraft.value)
}

function emitUnsave() {
  emit('unsave')
}
</script>
