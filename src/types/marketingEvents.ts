import { Timestamp } from 'firebase/firestore'
import type { MarketingEventKind, MarketingEventSource } from '@/types/integrations'

export interface MarketingEventRecord {
  id: string
  brandId: string
  source: MarketingEventSource
  kind: MarketingEventKind
  externalId?: string
  title: string
  scheduledAt: Timestamp
  status?: string | null
  channel?: string
  syncedAt?: Timestamp
}
