import type { Product } from '@/types'

/**
 * Stage colors used throughout the application
 * Update these colors in one place and they will automatically update everywhere
 */
export const STAGE_COLORS: Record<Product['stage'], string> = {
  samples: '#e8d8e8',  // light lavender
  warehouse: '#c9d5c4',  // lichen
  photo_queue: '#e8d4b8',      // oat
  in_shoot: '#e8c4b8',      // terracotta light
  editing: '#b8c4d4',       // slate blue
  staged: '#d4c8d8',     // dusty mauve
  live: '#a8cfb4',       // faded sage
}

/**
 * Get stage color for a given stage
 */
export function getStageColor(stage: Product['stage']): string {
  return STAGE_COLORS[stage] || '#9ca3af'
}
