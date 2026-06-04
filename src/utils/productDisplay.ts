import type { Product } from '@/types'

/** Product hero image, or the first colorway image when no hero is set */
export function getProductDisplayImageUrl(product: Product): string | undefined {
  const hero = product.imageUrl?.trim()
  if (hero) return hero
  const colorImage = product.colors?.find((c) => c.imageUrl?.trim())?.imageUrl?.trim()
  return colorImage || undefined
}

/** Short label for product list cards (matches ProductCard) */
export function formatProductColorsLabel(product: Product): string {
  const colors = product.colors?.filter((c) => c.name?.trim()) ?? []
  if (!colors.length) return ''
  if (colors.length <= 2) {
    return colors.map((c) => c.name).join(', ')
  }
  return `${colors.length}+ colors`
}
