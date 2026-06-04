import type { Product, ProductColor } from '@/types'
import { dedupeProductColors } from '@/utils/productColors'

/**
 * Catalogue Product - represents a product grouped by SKU with merged data
 */
export interface CatalogueProduct {
  sku: string
  name: string
  colors: ProductColor[]
  variants: Product[] // All product variants with this SKU
  // Common fields from variants (can be extended)
  category: string
  brandId: string
  // Aggregated counts
  totalVariants: number
  completedColors: number
  totalColors: number
}

/**
 * Groups products by SKU and merges their colors
 * @param products Array of products to group
 * @returns Map of SKU to CatalogueProduct
 */
export function groupProductsBySku(products: Product[]): Map<string, CatalogueProduct> {
  const grouped = new Map<string, Product[]>()
  
  // Group products by SKU (case-insensitive)
  products.forEach(product => {
    const skuKey = product.sku.toLowerCase().trim()
    if (!grouped.has(skuKey)) {
      grouped.set(skuKey, [])
    }
    grouped.get(skuKey)!.push(product)
  })
  
  // Convert to CatalogueProduct map
  const catalogueMap = new Map<string, CatalogueProduct>()
  
  grouped.forEach((variants, skuKey) => {
    const firstVariant = variants[0]
    if (!firstVariant) return
    const colors = mergeColors(variants)
    
    catalogueMap.set(skuKey, {
      sku: firstVariant.sku, // Use original casing from first variant
      name: firstVariant.name,
      colors,
      variants,
      category: firstVariant.category,
      brandId: firstVariant.brandId,
      totalVariants: variants.length,
      completedColors: colors.filter(c => c.complete).length,
      totalColors: colors.length,
    })
  })
  
  return catalogueMap
}

/**
 * Merges colors from multiple products, deduplicating by name
 * If any variant has a color marked as complete, the merged color is complete
 * @param products Products to merge colors from
 * @returns Merged array of unique colors
 */
export function mergeColors(products: Product[]): ProductColor[] {
  const all: ProductColor[] = []
  products.forEach((product) => {
    product.colors?.forEach((color) => all.push(color))
  })
  return dedupeProductColors(all)
}

/**
 * Gets all unique SKUs from products
 * @param products Array of products
 * @returns Set of unique SKUs (case-insensitive)
 */
export function getUniqueSkus(products: Product[]): Set<string> {
  return new Set(products.map(p => p.sku.toLowerCase().trim()))
}

/**
 * Gets all products with a specific SKU
 * @param products Array of products to search
 * @param sku SKU to find (case-insensitive)
 * @returns Array of products with matching SKU
 */
export function getProductsBySku(products: Product[], sku: string): Product[] {
  const skuLower = sku.toLowerCase().trim()
  return products.filter(p => p.sku.toLowerCase().trim() === skuLower)
}
