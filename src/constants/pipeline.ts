import type { Product } from '@/types'
import { STAGE_COLORS } from '@/constants/stageColors'
import { isFactoryProductionStage, productHasFactoryShipDate } from '@/utils/dates'

/** Virtual pipeline column — not a Firestore stage; uses `factoryShipDate`. */
export const FACTORY_SHIPPED_COLUMN = 'factory_shipped' as const

export type PipelineColumnId = Product['stage'] | typeof FACTORY_SHIPPED_COLUMN

/** Stages where the product is still at / before factory exit. */
export const FACTORY_PRODUCTION_STAGES: Product['stage'][] = ['samples']

export const PIPELINE_BOARD_COLUMNS: PipelineColumnId[] = [
  'samples',
  FACTORY_SHIPPED_COLUMN,
  'warehouse',
  'photo_queue',
  'in_shoot',
  'editing',
  'staged',
  'live',
]

export const PIPELINE_COLUMN_LABELS: Record<PipelineColumnId, string> = {
  samples: 'In Production',
  factory_shipped: 'Factory shipped',
  warehouse: 'Warehouse',
  photo_queue: 'Photo Queue',
  in_shoot: 'In Shoot',
  editing: 'Editing',
  staged: 'Staged',
  live: 'Live',
}

export const FACTORY_SHIPPED_COLUMN_COLOR = '#7eb8c9'

export function productBelongsInShippedColumn(product: Product): boolean {
  return (
    isFactoryProductionStage(product.stage) && productHasFactoryShipDate(product)
  )
}

export function productBelongsInStageColumn(product: Product, stage: Product['stage']): boolean {
  if (stage === 'samples') {
    return product.stage === 'samples' && !productHasFactoryShipDate(product)
  }
  return product.stage === stage
}

export function productBelongsInColumn(product: Product, columnId: PipelineColumnId): boolean {
  if (columnId === FACTORY_SHIPPED_COLUMN) {
    return productBelongsInShippedColumn(product)
  }
  return productBelongsInStageColumn(product, columnId)
}

export function columnColor(columnId: PipelineColumnId): string {
  if (columnId === FACTORY_SHIPPED_COLUMN) {
    return FACTORY_SHIPPED_COLUMN_COLOR
  }
  return STAGE_COLORS[columnId]
}
