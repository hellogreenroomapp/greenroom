import type { BrandMarketingSettings } from '@/types'
import type {
  SavedMarketingStory,
  SerializedMarketingStoryBeat,
  SerializedStoryCalendarProduct,
} from '@/types/marketingSavedStories'
import type {
  MarketingStoryBeat,
  StoryCalendarProduct,
} from '@/utils/marketingStoryCalendar'
import { storyBeatDayKey } from '@/utils/marketingStoryCalendar'

export type { SavedMarketingStory } from '@/types/marketingSavedStories'

const MS_DAY = 24 * 60 * 60 * 1000

/** Stable id so saved stories survive cadence rebuilds. */
export function storyBeatStableKey(beat: MarketingStoryBeat): string {
  if (beat.storyKind === 'launch' && beat.products.length > 0) {
    const ids = beat.products
      .map((p) => p.id)
      .sort()
      .join(',')
    const fam = beat.categoryFamily ?? 'mixed'
    return `launch:${beat.channel}:${fam}:${ids}`
  }
  return `fill:${beat.storyKind}:${beat.channel}:${storyBeatDayKey(beat.sendDate)}`
}

export function getSavedMarketingStories(
  marketing: BrandMarketingSettings | undefined
): SavedMarketingStory[] {
  return marketing?.savedStories ?? []
}

function toIso(d: Date): string {
  return d.toISOString()
}

function fromIso(s: string): Date {
  return new Date(s)
}

export function serializeStoryBeat(beat: MarketingStoryBeat): SerializedMarketingStoryBeat {
  return {
    id: beat.id,
    sendDate: toIso(beat.sendDate),
    channel: beat.channel,
    storyKind: beat.storyKind,
    categoryFamily: beat.categoryFamily,
    categoryLabel: beat.categoryLabel,
    displayLabel: beat.displayLabel,
    title: beat.title,
    storyAngle: beat.storyAngle,
    storyHooks: beat.storyHooks,
    products: beat.products.map((p) => ({
      ...p,
      goLiveDate: toIso(p.goLiveDate),
      pipelineGoLiveDate: p.pipelineGoLiveDate ? toIso(p.pipelineGoLiveDate) : undefined,
    })) as SerializedStoryCalendarProduct[],
    launchWindowStart: beat.launchWindowStart ? toIso(beat.launchWindowStart) : null,
    launchWindowEnd: beat.launchWindowEnd ? toIso(beat.launchWindowEnd) : null,
    stageSummary: beat.stageSummary,
    launchMix: beat.launchMix,
    commerceNote: beat.commerceNote,
  }
}

export function deserializeStoryBeat(raw: SerializedMarketingStoryBeat): MarketingStoryBeat {
  return {
    id: raw.id,
    sendDate: fromIso(raw.sendDate),
    channel: raw.channel,
    storyKind: raw.storyKind,
    categoryFamily: raw.categoryFamily,
    categoryLabel: raw.categoryLabel,
    displayLabel: raw.displayLabel,
    title: raw.title,
    storyAngle: raw.storyAngle,
    storyHooks: raw.storyHooks,
    products: raw.products.map((p) => ({
      ...p,
      goLiveDate: fromIso(p.goLiveDate),
      pipelineGoLiveDate: p.pipelineGoLiveDate ? fromIso(p.pipelineGoLiveDate) : undefined,
    })) as StoryCalendarProduct[],
    launchWindowStart: raw.launchWindowStart ? fromIso(raw.launchWindowStart) : null,
    launchWindowEnd: raw.launchWindowEnd ? fromIso(raw.launchWindowEnd) : null,
    stageSummary: raw.stageSummary,
    launchMix: raw.launchMix,
    commerceNote: raw.commerceNote,
  }
}

export function buildSavedMarketingStory(
  beat: MarketingStoryBeat,
  notes?: string
): SavedMarketingStory {
  return {
    storyKey: storyBeatStableKey(beat),
    savedAt: new Date().toISOString(),
    notes: notes?.trim() || undefined,
    beat: serializeStoryBeat(beat),
  }
}

/**
 * Pin user-saved stories: replace matching fresh beats and keep saved sends
 * when monthly cadence targets change.
 */
export function mergeSavedStoriesIntoCalendar(
  freshBeats: MarketingStoryBeat[],
  saved: SavedMarketingStory[],
  horizonEnd: Date,
  today = new Date()
): MarketingStoryBeat[] {
  if (!saved.length) return freshBeats

  const horizon = horizonEnd.getTime()
  const pastCutoff = today.getTime() - 14 * MS_DAY

  const byKey = new Map<string, SavedMarketingStory>()
  for (const entry of saved) {
    const existing = byKey.get(entry.storyKey)
    if (!existing || entry.savedAt > existing.savedAt) byKey.set(entry.storyKey, entry)
  }

  const restored: MarketingStoryBeat[] = []
  for (const entry of byKey.values()) {
    const beat = deserializeStoryBeat(entry.beat)
    const t = beat.sendDate.getTime()
    if (t < pastCutoff || t > horizon + MS_DAY) continue
    restored.push(beat)
  }

  const savedKeys = new Set(restored.map(storyBeatStableKey))
  const freshFiltered = freshBeats.filter((b) => !savedKeys.has(storyBeatStableKey(b)))

  return [...freshFiltered, ...restored].sort(
    (a, b) => a.sendDate.getTime() - b.sendDate.getTime()
  )
}
