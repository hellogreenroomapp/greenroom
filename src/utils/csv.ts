import { Timestamp } from 'firebase/firestore'
import type { Product, ProductColor, Project } from '@/types'
import { getStageFromColumn, getColumnFromStage } from '@/types'
import {
  buildProductColor,
  dedupeProductColors,
  splitCsvList,
} from '@/utils/productColors'

/**
 * Parse a date string in various formats and return a Date object
 * Supports: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, M/D/YYYY, D/M/YYYY, 
 * YYYY/MM/DD, MM-DD-YYYY, DD-MM-YYYY, Month DD YYYY, Month DD, YYYY, etc.
 */
function parseDateString(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null
  
  const trimmed = dateStr.trim()
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + 'T00:00:00')
    if (!isNaN(date.getTime())) {
      const [year, month, day] = trimmed.split('-').map(Number)
      if (date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day) {
        return date
      }
    }
  }
  
  // Try MM/DD/YYYY or M/D/YYYY (US format) or DD/MM/YYYY (European format)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/')
    const first = parseInt(parts[0] || '0', 10)
    const second = parseInt(parts[1] || '0', 10)
    const year = parseInt(parts[2] || '0', 10)
    
    // If first part > 12, it must be DD/MM/YYYY (European)
    if (first > 12 && second <= 12) {
      const day = first
      const month = second
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day) {
        return date
      }
    } else {
      // Assume MM/DD/YYYY (US format)
      const month = first
      const day = second
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day) {
        return date
      }
    }
  }
  
  // Try YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('/')
    const year = parseInt(parts[0] || '0', 10)
    const month = parseInt(parts[1] || '0', 10)
    const day = parseInt(parts[2] || '0', 10)
    const date = new Date(year, month - 1, day)
    if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day) {
      return date
    }
  }
  
  // Try MM-DD-YYYY or M-D-YYYY (US format) or DD-MM-YYYY (European format)
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('-')
    const first = parseInt(parts[0] || '0', 10)
    const second = parseInt(parts[1] || '0', 10)
    const year = parseInt(parts[2] || '0', 10)
    
    // If first part > 12, it must be DD-MM-YYYY (European)
    if (first > 12 && second <= 12) {
      const day = first
      const month = second
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day) {
        return date
      }
    } else {
      // Assume MM-DD-YYYY (US format)
      const month = first
      const day = second
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day) {
        return date
      }
    }
  }
  
  // Try natural language formats (e.g., "Feb 15, 2026", "February 15, 2026", "15 Feb 2026")
  const naturalDate = new Date(trimmed)
  if (!isNaN(naturalDate.getTime())) {
    // Verify it's a reasonable date (not epoch or far future/past)
    const year = naturalDate.getFullYear()
    if (year >= 2000 && year <= 2100) {
      return naturalDate
    }
  }
  
  return null
}

/** Minimal collection fields used to resolve CSV rows to a project id. */
export type ProjectCollectionRef = Pick<Project, 'id' | 'name' | 'season' | 'year'>

export interface ParsedRow {
  rowNumber: number
  id?: string // Document ID for updates
  /** Collection name (matches an existing collection in your brand). */
  collection?: string
  project_id?: string
  collection_season?: string
  collection_year?: string
  sku: string
  name: string
  category: string
  priority: string
  status?: string
  shot_type: string
  go_live_date: string
  scheduled_shoot_date?: string
  tentative_ex_factory_date?: string
  factory_ship_date?: string
  order_id?: string
  shoot_status?: string
  gender?: string
  tags: string
  /** One color per row (rolls up with rows sharing the same main sku) */
  color?: string
  color_code?: string
  color_sku?: string
  color_image_url?: string
  colors?: string
  color_codes?: string
  color_skus?: string
  color_image_urls?: string
  column?: string
  sample?: string
  ecomm_assets_complete?: string
  image_url?: string
  notes: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

function parseCSVText(text: string): ParsedRow[] {
  const lines = text.split('\n').filter((line) => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }
  
  const headers = parseCSVLine(lines[0] || '').map((h) => h.trim().toLowerCase())
  const rows: ParsedRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const values = parseCSVLine(line)
          const row: ParsedRow = {
            rowNumber: i + 1,
            id: '',
            collection: '',
            project_id: '',
            collection_season: '',
            collection_year: '',
            sku: '',
            name: '',
            category: '',
            priority: '',
            status: '',
            shot_type: '',
            go_live_date: '',
            scheduled_shoot_date: '',
            tentative_ex_factory_date: '',
            factory_ship_date: '',
            order_id: '',
            shoot_status: '',
            gender: '',
            tags: '',
            color: '',
            color_code: '',
            color_sku: '',
            color_image_url: '',
            colors: '',
            color_codes: '',
            color_skus: '',
            color_image_urls: '',
            column: '',
            sample: '',
            ecomm_assets_complete: '',
            image_url: '',
            notes: '',
          }
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || ''
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
      
      if (normalizedHeader === 'id' || normalizedHeader === 'document_id' || normalizedHeader === 'product_id') {
        row.id = value
      } else if (
        normalizedHeader === 'collection' ||
        normalizedHeader === 'collection_name' ||
        normalizedHeader === 'project' ||
        normalizedHeader === 'project_name'
      ) {
        row.collection = value
      } else if (normalizedHeader === 'project_id' || normalizedHeader === 'collection_id') {
        row.project_id = value
      } else if (normalizedHeader === 'collection_season' || normalizedHeader === 'collectionseason') {
        row.collection_season = value.toLowerCase()
      } else if (normalizedHeader === 'season') {
        row.collection_season = value.toLowerCase()
      } else if (normalizedHeader === 'collection_year' || normalizedHeader === 'collectionyear') {
        row.collection_year = value
      } else if (normalizedHeader === 'year') {
        row.collection_year = value
      } else if (normalizedHeader === 'sku' || normalizedHeader === 'sk') {
        row.sku = value
      } else if (normalizedHeader === 'name' || normalizedHeader === 'product_name') {
        row.name = value
      } else if (normalizedHeader === 'category' || normalizedHeader === 'cat') {
        row.category = value
      } else if (normalizedHeader === 'priority' || normalizedHeader === 'pri') {
        row.priority = value.toLowerCase()
      } else if (normalizedHeader === 'shot_type' || normalizedHeader === 'shottype' || normalizedHeader === 'shot') {
        row.shot_type = value.toLowerCase().replace(/\s+/g, '_')
            } else if (normalizedHeader === 'go_live_date' || normalizedHeader === 'golivedate' || normalizedHeader === 'date') {
              row.go_live_date = value
            } else if (normalizedHeader === 'scheduled_shoot_date' || normalizedHeader === 'scheduledshootdate' || normalizedHeader === 'shoot_date') {
              row.scheduled_shoot_date = value
            } else if (
              normalizedHeader === 'tentative_ex_factory_date' ||
              normalizedHeader === 'tentativeexfactorydate' ||
              normalizedHeader === 'ex_factory_date'
            ) {
              row.tentative_ex_factory_date = value
            } else if (normalizedHeader === 'factory_ship_date' || normalizedHeader === 'factoryshipdate') {
              row.factory_ship_date = value
            } else if (normalizedHeader === 'order_id' || normalizedHeader === 'orderid') {
              row.order_id = value
            } else if (normalizedHeader === 'shoot_status' || normalizedHeader === 'shootstatus') {
              row.shoot_status = value.toLowerCase()
            } else if (normalizedHeader === 'gender' || normalizedHeader === 'gen') {
              row.gender = value.toLowerCase()
            } else if (normalizedHeader === 'status' || normalizedHeader === 'stat') {
              row.status = value.toLowerCase()
            } else if (normalizedHeader === 'tags' || normalizedHeader === 'tag') {
              row.tags = value
            } else if (
              normalizedHeader === 'color' ||
              normalizedHeader === 'color_name' ||
              normalizedHeader === 'colorway'
            ) {
              row.color = value
            } else if (
              normalizedHeader === 'color_code' ||
              normalizedHeader === 'colorcode' ||
              normalizedHeader === 'colour_code'
            ) {
              row.color_code = value
            } else if (
              normalizedHeader === 'color_sku' ||
              normalizedHeader === 'colorsku' ||
              normalizedHeader === 'variant_sku'
            ) {
              row.color_sku = value
            } else if (
              normalizedHeader === 'color_image_url' ||
              normalizedHeader === 'colorimageurl' ||
              normalizedHeader === 'color_image' ||
              normalizedHeader === 'color_url'
            ) {
              row.color_image_url = value
            } else if (normalizedHeader === 'colors' || normalizedHeader === 'colours') {
              row.colors = value
            } else if (
              normalizedHeader === 'color_codes' ||
              normalizedHeader === 'colorcodes'
            ) {
              row.color_codes = value
            } else if (normalizedHeader === 'color_skus' || normalizedHeader === 'colorskus') {
              row.color_skus = value
            } else if (
              normalizedHeader === 'color_image_urls' ||
              normalizedHeader === 'colorimageurls'
            ) {
              row.color_image_urls = value
            } else if (normalizedHeader === 'column' || normalizedHeader === 'col' || normalizedHeader === 'stage_column') {
              row.column = value
            } else if (normalizedHeader === 'sample' || normalizedHeader === 'sample_only') {
              row.sample = value
            } else if (
              normalizedHeader === 'ecomm_assets_complete' ||
              normalizedHeader === 'ecommassetscomplete' ||
              normalizedHeader === 'assets_complete'
            ) {
              row.ecomm_assets_complete = value
            } else if (
              normalizedHeader === 'image_url' ||
              normalizedHeader === 'imageurl' ||
              normalizedHeader === 'image' ||
              normalizedHeader === 'product_image' ||
              normalizedHeader === 'photo_url'
            ) {
              row.image_url = value
            } else if (normalizedHeader === 'notes' || normalizedHeader === 'note') {
              row.notes = value
            }
    })
    
    rows.push(row)
  }
  
  return rows
}

export function parseCSV(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const rows = parseCSVText(text)
        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'))
    }
    
    reader.readAsText(file)
  })
}

export function parseCSVFromText(text: string): ParsedRow[] {
  return parseCSVText(text)
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote (double quote)
        current += '"'
        i++
      } else if (inQuotes && (line[i + 1] === ',' || i === line.length - 1 || line[i + 1] === '\n' || line[i + 1] === '\r')) {
        // Closing quote
        inQuotes = false
      } else {
        // Opening quote
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator (only when not in quotes)
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Push the last field
  values.push(current.trim())
  return values
}

function optionalCsvDateToTimestamp(value?: string): Timestamp | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  const parsed = parseDateString(trimmed)
  if (!parsed) return undefined
  const utcDate = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
  return Timestamp.fromDate(utcDate)
}

const COLLECTION_SEASONS: Project['season'][] = ['spring', 'summer', 'fall', 'winter', 'evergreen']

export type CollectionResolveStatus =
  | 'found'
  | 'will_create'
  | 'use_default'
  | 'unchanged'
  | 'none'

/** True when the import row explicitly sets collection (name or project_id). */
export function rowSpecifiesCollection(row: ParsedRow): boolean {
  return !!(row.collection?.trim() || row.project_id?.trim())
}

export interface CollectionCreatePayload {
  name: string
  season: Project['season']
  year: number
}

export interface CollectionResolveResult {
  projectId: string | null
  status: CollectionResolveStatus
  error?: string
  createPayload?: CollectionCreatePayload
  createKey?: string
  displayLabel?: string
}

export interface CollectionResolveOptions {
  /** Used when the row has no collection column value */
  defaultProjectId?: string
  /** When true, unknown collection names become "will create" instead of an error */
  allowCreate?: boolean
  /** When true, blank collection does not fall back to defaultProjectId (e.g. product updates) */
  skipDefault?: boolean
}

export function collectionCreateKey(
  name: string,
  season: Project['season'],
  year: number
): string {
  return `${name.toLowerCase().trim()}|${season}|${year}`
}

export function resolveCollectionForRow(
  row: ParsedRow,
  projects: ProjectCollectionRef[],
  options: CollectionResolveOptions = {}
): CollectionResolveResult {
  const { defaultProjectId, allowCreate = true, skipDefault = false } = options

  const directId = row.project_id?.trim()
  if (directId) {
    const byId = projects.find((p) => p.id === directId)
    if (byId) {
      return {
        projectId: byId.id,
        status: 'found',
        displayLabel: formatCollectionLabel(byId),
      }
    }
    return { projectId: null, status: 'none', error: `No collection with id "${directId}"` }
  }

  const name = row.collection?.trim()
  const hasRowCollection = !!name

  if (!hasRowCollection) {
    if (defaultProjectId && !skipDefault) {
      const fallback = projects.find((p) => p.id === defaultProjectId)
      return {
        projectId: defaultProjectId,
        status: 'use_default',
        displayLabel: fallback ? formatCollectionLabel(fallback) : 'Default collection',
      }
    }
    if (skipDefault) {
      return { projectId: null, status: 'none' }
    }
    return { projectId: null, status: 'none' }
  }

  const byIdAsName = projects.find((p) => p.id === name)
  if (byIdAsName) {
    return {
      projectId: byIdAsName.id,
      status: 'found',
      displayLabel: formatCollectionLabel(byIdAsName),
    }
  }

  const seasonRaw = row.collection_season?.trim().toLowerCase()
  const yearStr = row.collection_year?.trim()
  const yearParsed = yearStr ? parseInt(yearStr, 10) : undefined

  if (seasonRaw && !COLLECTION_SEASONS.includes(seasonRaw as Project['season'])) {
    return {
      projectId: null,
      status: 'none',
      error: `Invalid collection_season "${seasonRaw}". Use: ${COLLECTION_SEASONS.join(', ')}`,
    }
  }

  let matches = projects.filter((p) => p.name.toLowerCase() === name!.toLowerCase())
  if (seasonRaw) {
    matches = matches.filter((p) => p.season === seasonRaw)
  }
  if (yearParsed !== undefined && !Number.isNaN(yearParsed)) {
    matches = matches.filter((p) => p.year === yearParsed)
  }

  if (matches.length === 1) {
    const match = matches[0]!
    return {
      projectId: match.id,
      status: 'found',
      displayLabel: formatCollectionLabel(match),
    }
  }
  if (matches.length > 1) {
    return {
      projectId: null,
      status: 'none',
      error: `Multiple collections named "${name}". Add collection_season and collection_year.`,
    }
  }

  if (allowCreate) {
    const season: Project['season'] = seasonRaw && COLLECTION_SEASONS.includes(seasonRaw as Project['season'])
      ? (seasonRaw as Project['season'])
      : 'evergreen'
    const year =
      yearParsed !== undefined && !Number.isNaN(yearParsed)
        ? yearParsed
        : new Date().getFullYear()
    const createPayload: CollectionCreatePayload = { name: name!, season, year }
    return {
      projectId: null,
      status: 'will_create',
      createPayload,
      createKey: collectionCreateKey(name!, season, year),
      displayLabel: `${name} (${season} ${year})`,
    }
  }

  return {
    projectId: null,
    status: 'none',
    error: `Collection not found: "${name}"`,
  }
}

/** @deprecated Use resolveCollectionForRow */
export function resolveProjectIdFromRow(
  row: ParsedRow,
  projects: ProjectCollectionRef[]
): { projectId: string | null; error?: string } {
  const result = resolveCollectionForRow(row, projects, { allowCreate: false })
  return { projectId: result.projectId, error: result.error }
}

export function formatCollectionLabel(project: ProjectCollectionRef): string {
  return `${project.name} (${project.season} ${project.year})`
}

function isValidImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateOptionalCsvDate(value: string | undefined, label: string, errors: string[]) {
  const trimmed = value?.trim()
  if (!trimmed) return
  if (!parseDateString(trimmed)) {
    errors.push(`${label} must be in a valid format (e.g., YYYY-MM-DD, MM/DD/YYYY, or Feb 15, 2026)`)
  }
}

export type ValidateProductRowContext =
  | Set<string>
  | { projects: ProjectCollectionRef[]; defaultProjectId?: string }

export function validateProductRow(
  row: ParsedRow,
  context?: ValidateProductRowContext
): ValidationResult {
  const errors: string[] = []
  const projects =
    context && !(context instanceof Set) ? context.projects : undefined
  const defaultProjectId =
    context && !(context instanceof Set) ? context.defaultProjectId : undefined
  const isUpdate = !!(row.id && row.id.trim())
  
  const skuTrimmed = row.sku.trim()
  if (!skuTrimmed) {
    errors.push('SKU is required')
  }
  // Note: SKU uniqueness is NOT enforced - multiple products can share the same SKU
  // This allows variants to be grouped by SKU in the catalogue view
  
  if (!row.name || row.name.trim() === '') {
    errors.push('Name is required')
  }
  
  if (row.priority && !['high', 'medium', 'low'].includes(row.priority)) {
    errors.push('Priority must be: high, medium, or low')
  }
  
  if (row.shot_type) {
    const validShotTypes = ['flat_lay', 'on_model', 'lifestyle', 'ghost_mannequin']
    // Support both semicolons and commas for shot types
    const shotTypes = Array.isArray(row.shot_type) 
      ? row.shot_type 
      : row.shot_type.split(/[;,]/).map(s => s.trim())
    const invalidTypes = shotTypes.filter(st => !validShotTypes.includes(st))
    if (invalidTypes.length > 0) {
      errors.push(`Invalid shot types: ${invalidTypes.join(', ')}. Must be: ${validShotTypes.join(', ')}`)
    }
  }
  
  const goLiveTrimmed = row.go_live_date?.trim()
  if (goLiveTrimmed) {
    const parsedDate = parseDateString(goLiveTrimmed)
    if (!parsedDate) {
      errors.push('Go live date must be in a valid format (e.g., YYYY-MM-DD, MM/DD/YYYY, or Feb 15, 2026)')
    }
  }

  validateOptionalCsvDate(row.scheduled_shoot_date, 'Scheduled shoot date', errors)
  validateOptionalCsvDate(row.tentative_ex_factory_date, 'Tentative ex-factory date', errors)
  validateOptionalCsvDate(row.factory_ship_date, 'Factory ship date', errors)

  const imageUrlTrimmed = row.image_url?.trim()
  if (imageUrlTrimmed && !isValidImageUrl(imageUrlTrimmed)) {
    errors.push('Image URL must be a valid http or https link')
  }

  const colorImageTrimmed = row.color_image_url?.trim()
  if (colorImageTrimmed && !isValidImageUrl(colorImageTrimmed)) {
    errors.push('Color image URL must be a valid http or https link')
  }

  const colorImageUrlsWide = splitCsvList(row.color_image_urls)
  colorImageUrlsWide.forEach((url, i) => {
    if (url && !isValidImageUrl(url)) {
      errors.push(`Color image URL #${i + 1} must be a valid http or https link`)
    }
  })

  if (row.color_code?.trim() && !row.color?.trim() && !row.colors?.trim()) {
    errors.push('color_code requires a color name (use color or colors column)')
  }

  const specifiesCollection = rowSpecifiesCollection(row)
  const needsCollectionResolution = !isUpdate || specifiesCollection

  if (needsCollectionResolution && projects) {
    const { error } = resolveCollectionForRow(row, projects, {
      defaultProjectId,
      allowCreate: true,
    })
    if (error) errors.push(error)
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

export function parseColorsFromParsedRow(row: ParsedRow, mainSku: string): ProductColor[] {
  const main = mainSku.trim()
  const singleName = row.color?.trim()
  if (singleName) {
    return [
      buildProductColor(
        {
          name: singleName,
          colorCode: row.color_code,
          sku: row.color_sku,
          imageUrl: row.color_image_url,
        },
        main
      ),
    ]
  }

  const names = splitCsvList(row.colors)
  if (!names.length) return []

  const codes = splitCsvList(row.color_codes)
  const skus = splitCsvList(row.color_skus)
  const urls = splitCsvList(row.color_image_urls)

  return names.map((name, index) =>
    buildProductColor(
      {
        name,
        colorCode: codes[index],
        sku: skus[index],
        imageUrl: urls[index],
      },
      main
    )
  )
}

/** Group import rows: updates stay separate; new rows with the same main sku become one product */
export function groupRowsForProductImport<T extends ParsedRow>(
  rows: T[]
): Array<{ isUpdate: boolean; rows: T[]; key: string }> {
  const groups: Array<{ isUpdate: boolean; rows: T[]; key: string }> = []
  const createsBySku = new Map<string, T[]>()

  for (const row of rows) {
    if (row.id?.trim()) {
      groups.push({ isUpdate: true, rows: [row], key: row.id.trim() })
      continue
    }
    const skuKey = row.sku.trim().toLowerCase()
    if (!createsBySku.has(skuKey)) {
      createsBySku.set(skuKey, [])
    }
    createsBySku.get(skuKey)!.push(row)
  }

  for (const [skuKey, skuRows] of createsBySku) {
    groups.push({ isUpdate: false, rows: skuRows, key: skuKey })
  }

  return groups
}

export function mapRowsToProduct(
  rows: ParsedRow[],
  brandId: string,
  projectId?: string
): Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory' | 'projectId' | 'goLiveDate'> & {
  projectId?: string
  goLiveDate?: Product['goLiveDate']
} {
  const row = rows[0]
  if (!row) {
    throw new Error('At least one CSV row is required')
  }

  const tags = row.tags
    ? row.tags.split(/[;,]/).map((tag) => tag.trim()).filter((tag) => tag)
    : []

  const allColors: ProductColor[] = []
  for (const r of rows) {
    allColors.push(...parseColorsFromParsedRow(r, row.sku))
  }
  const colors = dedupeProductColors(allColors)
  
  const dateStr = row.go_live_date?.trim()
  const parsedGoLive = dateStr ? parseDateString(dateStr) : null
  
  // Parse shot types - support both semicolons and commas for flexibility
  const shotTypes: Product['shotType'] = row.shot_type
    ? Array.isArray(row.shot_type)
      ? row.shot_type.filter(st => ['flat_lay', 'on_model', 'lifestyle', 'ghost_mannequin'].includes(st))
      : row.shot_type.split(/[;,]/).map(s => s.trim()).filter(st => ['flat_lay', 'on_model', 'lifestyle', 'ghost_mannequin'].includes(st))
    : []

  const scheduledShootDate = optionalCsvDateToTimestamp(row.scheduled_shoot_date)
  const tentativeExFactoryDate = optionalCsvDateToTimestamp(row.tentative_ex_factory_date)
  const factoryShipDate = optionalCsvDateToTimestamp(row.factory_ship_date)

  // Determine stage from column number (0-6) if provided, otherwise default to samples
  let stage: Product['stage'] = 'samples'
  if (row.column) {
    const columnNum = parseInt(row.column.trim(), 10)
    if (columnNum >= 0 && columnNum <= 6) {
      stage = getStageFromColumn(columnNum)
    }
  }
  
  // Parse sample field (y/n -> boolean)
  const sample = row.sample 
    ? row.sample.trim().toLowerCase() === 'y' || row.sample.trim().toLowerCase() === 'yes'
    : false

  const result: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory' | 'projectId' | 'goLiveDate'> & {
    projectId?: string
    goLiveDate?: Product['goLiveDate']
  } = {
    brandId,
    sku: row.sku.trim(),
    name: row.name.trim(),
    category: row.category.trim() || 'Uncategorized',
    stage,
    priority: (row.priority as Product['priority']) || 'medium',
    status: (row.status as Product['status']) || 'on-time',
    shotType: shotTypes,
    tags,
  }

  if (parsedGoLive) {
    const utcDate = new Date(
      Date.UTC(parsedGoLive.getFullYear(), parsedGoLive.getMonth(), parsedGoLive.getDate())
    )
    result.goLiveDate = Timestamp.fromDate(utcDate)
  }

  if (projectId) {
    result.projectId = projectId
  }

  // Only add optional fields if they have values (Firestore doesn't accept undefined)
  if (colors.length > 0) {
    result.colors = colors
  }

  if (row.gender && ['mens', 'womens', 'unisex'].includes(row.gender)) {
    result.gender = row.gender as Product['gender']
  }

  if (scheduledShootDate) {
    result.scheduledShootDate = scheduledShootDate
  }

  if (tentativeExFactoryDate) {
    result.tentativeExFactoryDate = tentativeExFactoryDate
  }

  if (factoryShipDate) {
    result.factoryShipDate = factoryShipDate
  }

  const orderIdTrimmed = row.order_id?.trim()
  if (orderIdTrimmed) {
    result.orderId = orderIdTrimmed
  }

  if (row.shoot_status && ['scheduled', 'confirmed', 'rescheduled', 'cancelled'].includes(row.shoot_status)) {
    result.shootStatus = row.shoot_status as Product['shootStatus']
  }

  const notesTrimmed = row.notes?.trim()
  if (notesTrimmed) {
    result.notes = notesTrimmed
  }

  if (sample) {
    result.sample = true
  }

  const ecommAssetsComplete = row.ecomm_assets_complete
    ? row.ecomm_assets_complete.trim().toLowerCase() === 'y' ||
      row.ecomm_assets_complete.trim().toLowerCase() === 'yes'
    : false
  if (ecommAssetsComplete) {
    result.ecommAssetsComplete = true
  }

  const imageUrlTrimmed = row.image_url?.trim()
  if (imageUrlTrimmed && isValidImageUrl(imageUrlTrimmed)) {
    result.imageUrl = imageUrlTrimmed
  }

  return result
}

export function mapRowToProduct(
  row: ParsedRow,
  brandId: string,
  projectId?: string
): Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stageHistory' | 'projectId' | 'goLiveDate'> & {
  projectId?: string
  goLiveDate?: Product['goLiveDate']
} {
  return mapRowsToProduct([row], brandId, projectId)
}

export function generateCSVTemplate(): string {
  const headers = [
    'id', // Document ID (optional - include for updates, leave empty for new products)
    'collection', // Optional — existing name, new name (auto-created), or blank
    'collection_season', // Optional — spring, summer, fall, winter, evergreen
    'collection_year', // Optional — e.g. 2026
    'sku',
    'name',
    'category',
    'gender',
    'priority',
    'status',
    'shot_type',
    'go_live_date',
    'scheduled_shoot_date',
    'tentative_ex_factory_date',
    'factory_ship_date',
    'order_id',
    'shoot_status',
    'tags',
    'color',
    'color_code',
    'color_sku',
    'color_image_url',
    'colors',
    'color_codes',
    'color_skus',
    'color_image_urls',
    'column',
    'sample',
    'ecomm_assets_complete',
    'image_url',
    'notes',
  ]
  
  // Quote fields that contain commas to prevent parsing issues
  const quoteIfNeeded = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Escape quotes and wrap in quotes
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
  
  const exampleRow = [
    '', // ID - leave empty for new products, include document ID to update existing
    'Spring 2026 Collection',
    'spring',
    '2026',
    'SKU-001',
    'Example Product',
    'Dresses',
    'womens',
    'high',
    'on-time',
    'on_model;lifestyle', // Use semicolon for shot types
    '2026-02-15',
    '2026-01-20',
    '2026-01-10',
    '2026-01-25',
    'PO-12345',
    'scheduled',
    'summer;new arrival', // Use semicolon for tags
    'Black', // Single color per row OR use colors column below
    'BLK', // color_code — color SKU becomes SKU-001-BLK unless color_sku is set
    '', // color_sku (optional full variant SKU)
    'https://example.com/images/sku-001-black.jpg',
    'Black;Navy', // Wide format: multiple colors on one row (optional instead of color column)
    'BLK;NVY',
    'SKU-001-BLK;SKU-001-NVY',
    'https://example.com/black.jpg;https://example.com/navy.jpg',
    '0', // Column number (0-6): 0=In Production, 1=Warehouse, 2=Photo Queue, 3=In Shoot, 4=Editing, 5=Staged, 6=Live
    'n', // Sample (y/n): y=yes, n=no
    'n', // Ecomm assets complete (y/n)
    'https://example.com/images/sku-001.jpg',
    'Sample notes here',
  ]
  
  const exampleRow2 = [
    '',
    'Spring 2026 Collection',
    'spring',
    '2026',
    'SKU-001',
    'Example Product',
    'Dresses',
    'womens',
    'high',
    'on-time',
    'on_model',
    '2026-02-15',
    '',
    '',
    '',
    'PO-12345',
    'scheduled',
    '',
    'Navy',
    'NVY',
    '',
    'https://example.com/images/sku-001-navy.jpg',
    '',
    '',
    '',
    '',
    '0',
    'n',
    'n',
    '',
    '',
  ]

  return [
    headers.join(','),
    exampleRow.map(quoteIfNeeded).join(','),
    exampleRow2.map(quoteIfNeeded).join(','),
  ].join('\n')
}

export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', 'product_upload_template.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export products to CSV with document IDs for updating
 */
export function exportProductsToCSV(
  products: Product[],
  projectById: Record<string, ProjectCollectionRef> = {}
): void {
  const headers = [
    'id',
    'collection',
    'collection_season',
    'collection_year',
    'sku',
    'name',
    'category',
    'gender',
    'priority',
    'status',
    'shot_type',
    'go_live_date',
    'scheduled_shoot_date',
    'tentative_ex_factory_date',
    'factory_ship_date',
    'order_id',
    'shoot_status',
    'tags',
    'color',
    'color_code',
    'color_sku',
    'color_image_url',
    'colors',
    'color_codes',
    'color_skus',
    'color_image_urls',
    'column',
    'sample',
    'ecomm_assets_complete',
    'image_url',
    'notes',
  ]
  
  // Quote fields that contain commas to prevent parsing issues
  const quoteIfNeeded = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Escape quotes and wrap in quotes
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
  
  const rows = products.map((product) => {
    const shotType = Array.isArray(product.shotType)
      ? product.shotType.join(';')
      : product.shotType || ''
    
    const tags = product.tags ? product.tags.join(';') : ''
    const colorList = product.colors || []
    const colors = colorList.map((c) => c.name).join(';')
    const colorCodes = colorList.map((c) => c.colorCode || '').join(';')
    const colorSkus = colorList.map((c) => c.sku || '').join(';')
    const colorImageUrls = colorList.map((c) => c.imageUrl || '').join(';')
    
    const goLiveDate: string = product.goLiveDate
      ? (product.goLiveDate.toDate().toISOString().split('T')[0] || '')
      : ''
    
    const scheduledShootDate: string = product.scheduledShootDate
      ? (product.scheduledShootDate.toDate().toISOString().split('T')[0] || '')
      : ''

    const tentativeExFactoryDate: string = product.tentativeExFactoryDate
      ? (product.tentativeExFactoryDate.toDate().toISOString().split('T')[0] || '')
      : ''

    const factoryShipDate: string = product.factoryShipDate
      ? (product.factoryShipDate.toDate().toISOString().split('T')[0] || '')
      : ''
    
    const column = getColumnFromStage(product.stage)
    const project = product.projectId ? projectById[product.projectId] : undefined

    const rowValues: string[] = [
      product.id || '', // Document ID
      project?.name || '',
      project?.season || '',
      project?.year != null ? String(project.year) : '',
      product.sku || '',
      product.name || '',
      product.category || '',
      product.gender || '',
      product.priority || '',
      product.status || 'on-time',
      shotType,
      goLiveDate,
      scheduledShootDate,
      tentativeExFactoryDate,
      factoryShipDate,
      product.orderId || '',
      product.shootStatus || '',
      tags,
      '',
      '',
      '',
      '',
      colors,
      colorCodes,
      colorSkus,
      colorImageUrls,
      String(column),
      product.sample ? 'y' : 'n',
      product.ecommAssetsComplete ? 'y' : 'n',
      product.imageUrl || '',
      product.notes || '',
    ]
    
    return rowValues.map(quoteIfNeeded)
  })
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
