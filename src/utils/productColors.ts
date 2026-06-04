import type { ProductColor } from '@/types'

/** Split semicolon- or comma-separated CSV list values */
export function splitCsvList(value?: string): string[] {
  if (!value?.trim()) return []
  return value
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Default color SKU: `{mainSku}-{colorCode}` unless an explicit color SKU is set */
export function buildColorSku(
  mainSku: string,
  colorCode?: string,
  explicitSku?: string
): string | undefined {
  const explicit = explicitSku?.trim()
  if (explicit) return explicit
  const code = colorCode?.trim()
  const main = mainSku.trim()
  if (!code || !main) return undefined
  return `${main}-${code}`
}

export function formatColorSkuLabel(mainSku: string, color: ProductColor): string {
  return color.sku || buildColorSku(mainSku, color.colorCode) || mainSku
}

export function buildProductColor(
  fields: {
    name: string
    colorCode?: string
    sku?: string
    imageUrl?: string
    complete?: boolean
    tags?: string[]
  },
  mainSku: string
): ProductColor {
  const name = fields.name.trim()
  const colorCode = fields.colorCode?.trim()
  const sku = buildColorSku(mainSku, colorCode, fields.sku)
  const imageUrl = fields.imageUrl?.trim()

  const color: ProductColor = {
    name,
    complete: fields.complete ?? false,
  }
  if (colorCode) color.colorCode = colorCode
  if (sku) color.sku = sku
  if (imageUrl) color.imageUrl = imageUrl
  if (fields.tags?.length) color.tags = [...fields.tags]

  return color
}

/** Firestore-safe copy — omits undefined optional fields */
export function cloneProductColor(color: ProductColor): ProductColor {
  const out: ProductColor = { name: color.name, complete: color.complete }
  if (color.colorCode) out.colorCode = color.colorCode
  if (color.sku) out.sku = color.sku
  if (color.imageUrl) out.imageUrl = color.imageUrl
  if (color.tags?.length) out.tags = [...color.tags]
  return out
}

/** Merge color rows by name (case-insensitive), keeping richest metadata */
export function dedupeProductColors(colors: ProductColor[]): ProductColor[] {
  const map = new Map<string, ProductColor>()

  for (const color of colors) {
    const key = color.name.toLowerCase().trim()
    const existing = map.get(key)
    if (!existing) {
      map.set(key, cloneProductColor(color))
      continue
    }
    existing.complete = existing.complete || color.complete
    if (color.colorCode) existing.colorCode = color.colorCode
    if (color.sku) existing.sku = color.sku
    if (color.imageUrl) existing.imageUrl = color.imageUrl
    if (color.tags?.length) {
      const merged = new Set([...(existing.tags || []), ...color.tags])
      existing.tags = Array.from(merged)
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}
