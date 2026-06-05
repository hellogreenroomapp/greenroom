<template>
  <Modal :is-open="!!item" size="lg" :title="modalTitle" @close="$emit('close')">
    <template v-if="item">
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-semibold px-2 py-1 rounded-md bg-violet-100 text-violet-900">
            Synced from Klaviyo
          </span>
          <span class="font-semibold px-2 py-1 rounded-md" :class="channelBadgeClass(item.channel)">
            {{ item.channel === 'email' ? 'Email' : 'SMS' }}
          </span>
          <span v-if="item.subtitle" class="text-muted capitalize">{{ item.subtitle }}</span>
        </div>

        <div>
          <h4 class="text-base font-semibold text-text">{{ item.title }}</h4>
          <p class="text-sm text-muted mt-2">
            Scheduled
            {{
              item.sendDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            }}
          </p>
        </div>

        <div
          v-if="performance"
          class="rounded-lg border border-border bg-bg/60 px-4 py-3 text-sm"
        >
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">90d performance</p>
          <p class="text-text">
            Open {{ formatRate(performance.openRate) }}
            <span v-if="performance.conversionValue != null">
              · Revenue {{ formatCurrency(performance.conversionValue) }}
            </span>
          </p>
        </div>

        <p class="text-xs text-muted border-t border-border pt-3">
          GreenRoom suggestions on this calendar show pipeline launches and plan-fill ideas that are
          not already scheduled in Klaviyo. Shopify intelligence will layer in later.
        </p>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Modal from '@/components/common/Modal.vue'
import type { MarketingKlaviyoInsights } from '@/types/klaviyoInsights'
import type { StoryCalendarItem } from '@/utils/marketingStoryCalendarView'
import { formatCurrency, formatRate } from '@/utils/klaviyoCampaignMatch'

const props = defineProps<{
  item: StoryCalendarItem | null
  insights: MarketingKlaviyoInsights | null
}>()

defineEmits<{ close: [] }>()

const modalTitle = computed(() =>
  props.item ? `Klaviyo · ${props.item.title}` : 'Klaviyo campaign'
)

const performance = computed(() => {
  const id = props.item?.klaviyo?.externalId
  if (!id || !props.insights?.performance?.campaigns) return null
  return props.insights.performance.campaigns.find((c) => c.campaignId === id) ?? null
})

function channelBadgeClass(channel: 'email' | 'sms') {
  return channel === 'sms' ? 'bg-violet-100 text-violet-800' : 'bg-violet-50 text-violet-900'
}
</script>
