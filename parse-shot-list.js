import fs from 'fs';
import path from 'path';

// Read the CSV file
const csvPath = '/Users/elizabethbrown/Downloads/7D E-COMMERCE PHOTO - M - S_S 2026.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Parse CSV (handling quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Map checkbox columns to stages
function getStageFromCheckboxes(row) {
  const samples = row[3]?.toUpperCase() === 'TRUE';
  const shot = row[4]?.toUpperCase() === 'TRUE';
  const edited = row[5]?.toUpperCase() === 'TRUE';
  const uploaded = row[6]?.toUpperCase() === 'TRUE';
  const online = row[7]?.toUpperCase() === 'TRUE';
  
  // Find the last checked checkbox from left to right
  if (uploaded) return '6'; // UPLOADED → column 6 (live)
  if (online) return '6'; // ONLINE / PRIORITY → column 6 (live)
  if (edited) return '4'; // EDITED → column 4 (editing)
  if (shot) return '3'; // SHOT → column 3 (in_shoot)
  if (samples) return '2'; // SAMPLES → column 2 (photo_queue)
  
  // No checks → warehouse (column 1)
  return '1';
}

// Parse the CSV
const headers = parseCSVLine(lines[0]);
const rows = lines.slice(1).map(line => parseCSVLine(line));

// Track current SKU and product name (for merged cells)
let currentSku = '';
let currentProductName = '';

// Group products by SKU+Name
const productMap = new Map();

rows.forEach((row, index) => {
  // Skip empty rows
  if (!row[0] && !row[1] && !row[2]) return;
  
  // Update SKU and product name if present
  if (row[0] && row[0].trim()) {
    currentSku = row[0].trim();
  }
  if (row[1] && row[1].trim()) {
    currentProductName = row[1].trim();
  }
  
  const color = row[2]?.trim();
  
  // Skip if no color
  if (!color) return;
  
  // Get stage from checkboxes
  const column = getStageFromCheckboxes(row);
  
  // Create key for grouping (SKU + Product Name)
  const key = `${currentSku}|||${currentProductName}`;
  
  if (!productMap.has(key)) {
    productMap.set(key, {
      sku: currentSku,
      name: currentProductName,
      colors: [],
      maxColumn: column,
    });
  }
  
  const product = productMap.get(key);
  product.colors.push(color);
  // Use the most advanced stage (highest column number)
  if (parseInt(column) > parseInt(product.maxColumn)) {
    product.maxColumn = column;
  }
});

// Generate output rows from grouped products
const outputRows = [];

productMap.forEach((product) => {
  // Format: sku,name,category,priority,shot_type,go_live_date,column,tags,colors,notes
  const outputRow = [
    product.sku,
    product.name,
    '', // category - will need to be filled manually or inferred
    'medium', // priority - default
    '', // shot_type - empty for now
    '', // go_live_date - empty for now
    product.maxColumn, // column/stage (most advanced)
    '', // tags - empty
    product.colors.join(';'), // colors - semicolon separated
    '', // notes - empty
  ];
  
  outputRows.push(outputRow);
});

// Generate CSV output
const outputHeaders = ['sku', 'name', 'category', 'priority', 'shot_type', 'go_live_date', 'column', 'tags', 'colors', 'notes'];
const outputLines = [
  outputHeaders.join(','),
  ...outputRows.map(row => 
    row.map(cell => {
      // Quote cells that contain commas or quotes
      const str = String(cell || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  )
];

const outputContent = outputLines.join('\n');

// Write output file
const outputPath = path.join(process.cwd(), 'bulk-upload-7d.csv');
fs.writeFileSync(outputPath, outputContent, 'utf-8');

console.log(`✅ Generated ${outputRows.length} products`);
console.log(`📁 Output saved to: ${outputPath}`);
console.log(`\nPreview of first 5 rows:`);
console.log(outputLines.slice(0, 6).join('\n'));
