import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

// Read the Excel file
const inputPath = '/Users/elizabethbrown/Downloads/List for Liz.xlsx'
const workbook = XLSX.readFile(inputPath)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet)

console.log(`Found ${data.length} rows`)
console.log('Columns:', Object.keys(data[0] || {}))

// Find column mappings (case-insensitive)
const findColumn = (data, patterns) => {
  const keys = Object.keys(data[0] || {})
  for (const pattern of patterns) {
    const found = keys.find(k => 
      k.toLowerCase().replace(/[^a-z0-9]/g, '') === pattern.toLowerCase().replace(/[^a-z0-9]/g, '')
    )
    if (found) return found
  }
  return null
}

// Map columns
const skuCol = findColumn(data, ['style', 'style#', 'sku', 'style number'])
const nameCol = findColumn(data, ['product name', 'name', 'product', 'product_name'])
const colorCol = findColumn(data, ['color', 'colour'])
// Try to find the go live date column - prioritize "IN OC WH" as it's the arrival date (Column K in screenshot shows June dates)
// Then try "Tentative ex fty" and "ETD" as fallbacks
const goLiveDateCol = findColumn(data, ['in oc wh', 'in oc warehouse', 'warehouse date', 'arrival date', 'tentative ex fty', 'tentative ex fty date', 'tentative', 'go_live_date', 'go live date', 'golivedate', 'launch date', 'launch_date', 'etd', 'estimated delivery', 'delivery date'])

console.log('\nColumn mappings:')
console.log('SKU:', skuCol)
console.log('Name:', nameCol)
console.log('Color:', colorCol)
console.log('Go Live Date:', goLiveDateCol)

if (!skuCol || !nameCol) {
  console.error('ERROR: Could not find required columns (SKU/style# and product name)')
  process.exit(1)
}

// Group products by SKU to combine colors
const productsBySku = new Map()

data.forEach((row, index) => {
  const sku = String(row[skuCol] || '').trim()
  const name = String(row[nameCol] || '').trim()
  const color = colorCol ? String(row[colorCol] || '').trim() : ''
  const goLiveDate = goLiveDateCol ? String(row[goLiveDateCol] || '').trim() : ''

  if (!sku || !name) {
    console.warn(`Skipping row ${index + 2}: missing SKU or name`)
    return
  }

  if (!productsBySku.has(sku)) {
    productsBySku.set(sku, {
      sku,
      name,
      colors: new Set(),
      goLiveDate: goLiveDate || null,
      originalRows: []
    })
  }

  const product = productsBySku.get(sku)
  if (color) {
    product.colors.add(color)
  }
  product.originalRows.push({ name, color, goLiveDate, rowIndex: index + 2 })
})

console.log(`\nGrouped into ${productsBySku.size} unique SKUs`)

// Function to get next Thursday from a date (or same day if already Thursday)
function getNextThursday(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday, 4 = Thursday
  let diff = 4 - day
  if (diff < 0) diff += 7 // If past Thursday, go to next week
  if (diff === 0) diff = 0 // Already Thursday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Function to parse date from various formats (including Excel serial numbers)
function parseDate(dateStr) {
  if (!dateStr) return null
  
  // Handle Excel date serial numbers (numbers > 1)
  const numValue = typeof dateStr === 'number' ? dateStr : parseFloat(dateStr)
  if (!isNaN(numValue) && numValue > 1 && numValue < 100000) {
    // Excel epoch is Jan 1, 1900, but Excel incorrectly treats 1900 as leap year
    // So we subtract 2 days
    const excelEpoch = new Date(1900, 0, 1)
    const date = new Date(excelEpoch)
    date.setDate(date.getDate() + Math.floor(numValue) - 2)
    return date
  }
  
  // Convert to string for pattern matching
  const str = String(dateStr).trim()
  
  // Try various date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // M/D/YY (e.g., 6/20/26)
  ]
  
  for (const format of formats) {
    const match = str.match(format)
    if (match) {
      if (format === formats[0]) {
        // YYYY-MM-DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
      } else if (format === formats[3]) {
        // M/D/YY - convert 2-digit year to 4-digit (assume 2000s)
        const year = 2000 + parseInt(match[3])
        return new Date(year, parseInt(match[1]) - 1, parseInt(match[2]))
      } else {
        // MM/DD/YYYY or M/D/YYYY
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]))
      }
    }
  }
  
  // Try native Date parsing
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
    return parsed
  }
  
  return null
}

// Group products by launch week (bi-weekly launches on Thursdays)
const launchGroups = new Map()

productsBySku.forEach((product) => {
  let targetDate = null
  
  if (product.goLiveDate) {
    const parsedDate = parseDate(product.goLiveDate)
    if (parsedDate) {
      // Add 1-2 weeks (let's use 1.5 weeks = 10-11 days)
      targetDate = new Date(parsedDate)
      targetDate.setDate(targetDate.getDate() + 10) // Add ~1.5 weeks
    }
  }
  
  // If no date or couldn't parse, use today
  if (!targetDate) {
    targetDate = new Date()
  }
  
  // Round to bi-weekly launches (every other Thursday)
  // Use a reference Thursday (Jan 2, 2026 is a Thursday)
  const referenceDate = new Date('2026-01-02')
  referenceDate.setHours(0, 0, 0, 0)
  
  // First, get the Thursday of the week containing targetDate
  const thursdayOfWeek = getNextThursday(targetDate)
  thursdayOfWeek.setHours(0, 0, 0, 0)
  
  // Calculate days difference from reference (both should be Thursdays)
  const daysDiff = Math.floor((thursdayOfWeek.getTime() - referenceDate.getTime()) / (24 * 60 * 60 * 1000))
  
  // Calculate which bi-weekly period (every 14 days), round to nearest
  const biWeeklyPeriod = Math.round(daysDiff / 14)
  
  // Calculate the final launch date (always a Thursday since reference is Thursday and we add multiples of 14)
  const finalLaunchDate = new Date(referenceDate.getTime())
  finalLaunchDate.setDate(finalLaunchDate.getDate() + biWeeklyPeriod * 14)
  finalLaunchDate.setHours(0, 0, 0, 0)
  
  // Verify it's a Thursday (should be, but double-check)
  if (finalLaunchDate.getDay() !== 4) {
    console.warn(`Warning: Date ${finalLaunchDate.toISOString()} is not a Thursday, adjusting...`)
    const dayOfWeek = finalLaunchDate.getDay()
    const diff = (4 - dayOfWeek + 7) % 7
    finalLaunchDate.setDate(finalLaunchDate.getDate() + diff)
  }
  
  // Format date as YYYY-MM-DD
  const year = finalLaunchDate.getFullYear()
  const month = String(finalLaunchDate.getMonth() + 1).padStart(2, '0')
  const day = String(finalLaunchDate.getDate()).padStart(2, '0')
  const launchKey = `${year}-${month}-${day}`
  
  if (!launchGroups.has(launchKey)) {
    launchGroups.set(launchKey, [])
  }
  
  launchGroups.get(launchKey).push({
    ...product,
    goLiveDate: launchKey
  })
})

console.log(`\nGrouped into ${launchGroups.size} launch groups:`)
launchGroups.forEach((products, date) => {
  console.log(`  ${date}: ${products.length} products`)
})

// Generate CSV rows
const csvRows = []
const headers = [
  'sku',
  'name',
  'category',
  'gender',
  'priority',
  'status',
  'shot_type',
  'go_live_date',
  'scheduled_shoot_date',
  'shoot_status',
  'tags',
  'colors',
  'column',
  'sample',
  'notes',
]

csvRows.push(headers.join(','))

// Sort launch groups by date
const sortedLaunchGroups = Array.from(launchGroups.entries()).sort((a, b) => 
  a[0].localeCompare(b[0])
)

sortedLaunchGroups.forEach(([launchDate, products]) => {
  products.forEach((product) => {
    const colors = Array.from(product.colors).join(';')
    
    const row = [
      product.sku,
      product.name,
      '', // category
      '', // gender
      'medium', // priority
      'on-time', // status
      '', // shot_type
      product.goLiveDate,
      '', // scheduled_shoot_date
      '', // shoot_status
      '', // tags
      colors, // colors
      '0', // column (0 = Samples)
      'n', // sample
      '', // notes
    ]
    
    // Escape fields that contain commas or quotes
    const escapeCSV = (field) => {
      const str = String(field || '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    
    csvRows.push(row.map(escapeCSV).join(','))
  })
})

// Write CSV file
const outputPath = path.join(process.cwd(), 'bulk-upload-converted.csv')
fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8')

console.log(`\n✅ Converted CSV saved to: ${outputPath}`)
console.log(`Total rows: ${csvRows.length - 1} (excluding header)`)
