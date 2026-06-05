<template>
  <div
    class="intelligence-card overflow-hidden rounded-xl border border-border shadow-sm"
    :class="{ 'opacity-70': loading }"
  >
    <div class="intelligence-hero px-4 py-4 sm:px-5">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0 ring-1 ring-white/20"
            aria-hidden="true"
          >
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-100/90">
              GreenRoom Intelligence
            </p>
          </div>
        </div>
        <span
          v-if="summary?.performanceAvailable"
          class="text-[9px] font-semibold uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded bg-white/15 text-white"
        >
          90d perf
        </span>
      </div>

      <div v-if="loading" class="mt-3 text-xs text-white/80">Analyzing…</div>
      <template v-else-if="summary">
        <h3 class="mt-3 text-base font-semibold text-white leading-snug">
          {{ summary.headline }}
        </h3>
        <p class="mt-1 text-xs text-white/75 max-w-2xl line-clamp-2">{{ summary.subhead }}</p>

        <div
          v-if="launchHighlights.length"
          class="mt-3 pt-3 border-t border-white/15"
        >
          <p class="text-[9px] font-bold uppercase tracking-wider text-white/55 mb-1.5">
            Upcoming launch signals
          </p>
          <ul class="space-y-1">
            <li
              v-for="h in launchHighlights"
              :key="h.id"
              class="hero-frosted-card text-[10px] leading-snug"
            >
              <p class="font-medium text-white line-clamp-1">{{ h.title }}</p>
              <p class="text-white/70 line-clamp-1 mt-0.5">{{ h.subtitle }}</p>
            </li>
          </ul>
        </div>

        <div
          v-if="summary.heroCards.length"
          class="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5"
        >
          <div
            v-for="card in summary.heroCards"
            :key="card.id"
            class="hero-frosted-card"
            :class="heroCardClass(card)"
          >
            <template v-if="card.type === 'metric'">
              <div class="text-lg font-semibold text-white tabular-nums leading-none">{{ card.value }}</div>
              <div class="text-[9px] uppercase tracking-wide text-white/65 mt-1">{{ card.label }}</div>
            </template>
            <template v-else>
              <p class="text-[10px] font-medium text-white leading-snug line-clamp-2">{{ card.label }}</p>
            </template>
          </div>
        </div>
      </template>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  MarketingIntelligenceSummary,
  IntelligenceHeroCard,
} from '@/utils/marketingIntelligence'

const props = defineProps<{
  summary: MarketingIntelligenceSummary | null
  loading?: boolean
}>()

const launchHighlights = computed(() =>
  (props.summary?.highlights ?? []).filter((h) => h.id.startsWith('launch-'))
)

function heroCardClass(card: IntelligenceHeroCard) {
  const base = 'ring-1 '
  if (card.type === 'insight') {
    if (card.tone === 'attention') return `${base}bg-amber-400/20 ring-amber-200/40`
    if (card.tone === 'positive') return `${base}bg-white/15 ring-white/25`
    return `${base}bg-white/12 ring-white/20`
  }
  return `${base}bg-white/10 ring-white/15`
}

</script>

<style scoped>
.intelligence-hero {
  background: linear-gradient(135deg, #0c4a36 0%, #0e7f55 45%, #14a06f 100%);
}

.intelligence-card {
  background: var(--color-card, #fff);
}

.hero-frosted-card {
  border-radius: 0.375rem;
  padding: 0.5rem 0.625rem;
  backdrop-filter: blur(8px);
  background: rgb(255 255 255 / 0.1);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.15);
}

details > summary:hover {
  color: var(--color-text, inherit);
}
</style>
