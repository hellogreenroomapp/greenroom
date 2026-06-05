import type {
  LaunchClassification,
  StoryChannel,
  StoryKind,
} from '@/utils/marketingStoryCalendar'
import type { CategoryFamily, StoryGenderAudience } from '@/utils/marketingStoryCalendar'

export interface SerializedStoryCalendarProduct {
  id: string
  sku: string
  name: string
  category?: string
  categoryFamily: CategoryFamily
  categoryLabel: string
  genderAudience: StoryGenderAudience
  genderLabel: string
  goLiveDate: string
  pipelineGoLiveDate?: string
  stage: string
  stageLabel: string
  launchType: LaunchClassification
  launchTypeLabel: string
  projectName?: string
  gender?: string
}

export interface SerializedMarketingStoryBeat {
  id: string
  sendDate: string
  channel: StoryChannel
  storyKind: StoryKind
  categoryFamily?: CategoryFamily
  categoryLabel?: string
  displayLabel: string
  title: string
  storyAngle: string
  storyHooks: string[]
  products: SerializedStoryCalendarProduct[]
  launchWindowStart: string | null
  launchWindowEnd: string | null
  stageSummary: string
  launchMix: Record<LaunchClassification, number>
  commerceNote: string
}

export interface SavedMarketingStory {
  storyKey: string
  savedAt: string
  notes?: string
  beat: SerializedMarketingStoryBeat
}
