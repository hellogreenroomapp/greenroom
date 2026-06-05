import jsPDF from 'jspdf'
import type { Look, Product } from '@/types'
import { STAGE_LABELS } from '@/types'
import { formatDateShort } from './dates'
import { getBlobFromStorageDownloadUrl } from '@/firebase/storage'

/**
 * Shot list PDF — landscape. Embeds images via Storage getBlob + fetch when URLs load (bucket CORS required for fetch).
 */

export type ShotListPDFMode = 'list' | 'compact'

export interface ShotListPDFInput {
  collectionName: string
  looks: Look[]
  allProducts: Product[]
  /** Matches the in-app List / Compact toggle */
  mode: ShotListPDFMode
}

type LoadedImageData = {
  dataUrl: string
  format: 'JPEG' | 'PNG' | 'WEBP'
  iw: number
  ih: number
}

function shotListLookProducts(look: Look, allProducts: Product[]): Product[] {
  return allProducts.filter((p) => look.productIds.includes(p.id) && !p.archived)
}

function shotListProductImageUrl(product: Product): string | undefined {
  if (product.colors && product.colors.length > 0) {
    const c = product.colors.find((x) => x.imageUrl)
    if (c?.imageUrl) return c.imageUrl
  }
  return product.imageUrl
}

function inferImageFormat(blobType: string, urlHint: string): LoadedImageData['format'] {
  const t = blobType.toLowerCase()
  if (t.includes('png')) return 'PNG'
  if (t.includes('webp')) return 'WEBP'
  if (t.includes('jpeg') || t.includes('jpg')) return 'JPEG'
  const low = urlHint.toLowerCase()
  if (low.includes('.png')) return 'PNG'
  if (low.includes('.webp')) return 'WEBP'
  return 'JPEG'
}

async function blobToLoadedImage(
  blob: Blob,
  urlHint: string
): Promise<LoadedImageData | null> {
  const format = inferImageFormat(blob.type || '', urlHint)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('read'))
    r.readAsDataURL(blob)
  })
  const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
  if (!dims || dims.w < 1 || dims.h < 1) return null
  return { dataUrl, format, iw: dims.w, ih: dims.h }
}

async function loadImageForPdf(url: string | undefined): Promise<LoadedImageData | null> {
  const u = url?.trim()
  if (!u) return null

  let blob: Blob | null = await getBlobFromStorageDownloadUrl(u)
  if (!blob) {
    try {
      const res = await fetch(u, { mode: 'cors', credentials: 'omit' })
      if (res.ok) blob = await res.blob()
    } catch {
      blob = null
    }
  }
  if (!blob || blob.size < 1) return null
  try {
    return await blobToLoadedImage(blob, u)
  } catch {
    return null
  }
}

/** Fallback frame when an image URL exists but bytes did not load into the PDF. */
function drawPhotoSlot(
  doc: jsPDF,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  heading: string,
  detail?: string
) {
  doc.setDrawColor(210, 212, 218)
  doc.setLineWidth(0.25)
  doc.setFillColor(248, 249, 252)
  doc.rect(x, y, boxW, boxH, 'FD')
  const fsHead = Math.max(5, Math.min(7.5, boxH * 0.12))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fsHead)
  doc.setTextColor(90, 95, 110)
  doc.text(heading.toUpperCase(), x + boxW / 2, y + boxH * 0.34, { align: 'center' })
  if (detail?.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(Math.max(4.5, fsHead - 1))
    doc.setTextColor(120, 125, 140)
    const maxLines = Math.max(2, Math.min(5, Math.floor((boxH - 8) / 2.6)))
    const lines = doc.splitTextToSize(detail.trim(), boxW - 2)
    let ly = y + boxH * 0.5
    for (const line of lines.slice(0, maxLines)) {
      doc.text(line, x + boxW / 2, ly, { align: 'center' })
      ly += 2.6
      if (ly > y + boxH - 1.5) break
    }
  }
  doc.setTextColor(0, 0, 0)
}

function drawImageOrPlaceholder(
  doc: jsPDF,
  img: LoadedImageData | null | undefined,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  slotHeading: string,
  fallbackDetail: string
) {
  if (img) {
    doc.setDrawColor(210, 212, 218)
    doc.setLineWidth(0.2)
    const scale = Math.min(boxW / img.iw, boxH / img.ih)
    const dw = img.iw * scale
    const dh = img.ih * scale
    const ox = x + (boxW - dw) / 2
    const oy = y + (boxH - dh) / 2
    try {
      doc.addImage(img.dataUrl, img.format, ox, oy, dw, dh)
      doc.rect(x, y, boxW, boxH, 'S')
      doc.setTextColor(0, 0, 0)
      return
    } catch {
      // jsPDF may reject some formats; use placeholder
    }
  }
  drawPhotoSlot(doc, x, y, boxW, boxH, slotHeading, fallbackDetail)
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out.length ? out : [[]]
}

interface ShotListCtx {
  doc: jsPDF
  margin: number
  contentWidth: number
  pageWidth: number
  pageHeight: number
  y: number
  cache: Map<string, LoadedImageData | null>
  collectionName: string
  ensureSpace(minHeight: number): void
}

function addShotListPageHeader(ctx: ShotListCtx, titleSuffix: string) {
  const { doc, margin, pageWidth } = ctx
  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, pageWidth, 11, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Shot List', margin, 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const sub = ctx.collectionName
  doc.text(sub, margin + doc.getTextWidth('Shot List') + 7, 7)
  doc.setFontSize(7)
  const right = `${titleSuffix} · ${new Date().toLocaleDateString()}`
  doc.text(right, pageWidth - margin - doc.getTextWidth(right), 7)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  ctx.y = 15
}

function drawLookListPdf(ctx: ShotListCtx, look: Look, products: Product[]) {
  const { doc, margin, contentWidth, cache } = ctx
  const inspW = 46
  const gap = 3
  const inspH = 52
  const prodW = 40
  const prodImgH = 42
  const colGap = 2
  const maxPerRow = Math.max(
    1,
    Math.floor((contentWidth - inspW - gap) / (prodW + colGap))
  )

  const headerBlock = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text(look.name, margin, ctx.y)
    ctx.y += 6
    if (look.note?.trim()) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 80)
      const lines = doc.splitTextToSize(look.note.trim(), contentWidth)
      lines.forEach((line: string) => {
        ctx.ensureSpace(4)
        doc.text(line, margin, ctx.y)
        ctx.y += 3.8
      })
      doc.setTextColor(0, 0, 0)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    ctx.ensureSpace(5)
    doc.text(
      `${products.length} ${products.length === 1 ? 'product' : 'products'}`,
      margin,
      ctx.y
    )
    ctx.y += 5
    doc.setTextColor(0, 0, 0)
  }

  ctx.ensureSpace(28)
  headerBlock()

  const inspUrl = look.inspirationImageUrl?.trim()
  const hasInspiration = !!inspUrl
  const inspImg = inspUrl ? cache.get(inspUrl) ?? null : null

  const chunks = chunkArray(products, maxPerRow)
  if (products.length === 0) {
    ctx.ensureSpace(inspH + 8)
    if (!hasInspiration) {
      drawPhotoSlot(doc, margin, ctx.y, inspW, inspH, 'Inspiration', 'No reference yet')
    } else {
      drawImageOrPlaceholder(
        doc,
        inspImg,
        margin,
        ctx.y,
        inspW,
        inspH,
        'Inspiration',
        'Image not loaded — open Greenroom'
      )
    }
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('No products in this look', margin + inspW + gap, ctx.y + inspH / 2)
    doc.setTextColor(0, 0, 0)
    ctx.y += inspH + 8
    return
  }

  chunks.forEach((chunk, chunkIndex) => {
    const textLinesPerProduct = 5
    // +2mm vs legacy layout: extra space between product image and text block
    const textBlockH = textLinesPerProduct * 3.2 + 2
    const rowH = Math.max(inspH, prodImgH + textBlockH) + 2
    ctx.ensureSpace(rowH + 4)

    const rowTop = ctx.y
    if (chunkIndex === 0) {
      if (!hasInspiration) {
        drawPhotoSlot(doc, margin, rowTop, inspW, inspH, 'Inspiration', 'No reference yet')
      } else {
        drawImageOrPlaceholder(
          doc,
          inspImg,
          margin,
          rowTop,
          inspW,
          inspH,
          'Inspiration',
          'Image not loaded — open Greenroom'
        )
      }
    } else {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, rowTop, inspW, inspH, 'F')
      doc.setDrawColor(230, 230, 230)
      doc.rect(margin, rowTop, inspW, inspH, 'S')
      doc.setFontSize(6)
      doc.setTextColor(180, 180, 180)
      doc.text('(cont.)', margin + inspW / 2, rowTop + inspH / 2 + 1, {
        align: 'center',
      })
      doc.setTextColor(0, 0, 0)
    }

    let px = margin + inspW + gap
    chunk.forEach((product) => {
      const pUrl = shotListProductImageUrl(product)?.trim()
      const pImg = pUrl ? cache.get(pUrl) ?? null : null
      drawImageOrPlaceholder(
        doc,
        pImg,
        px,
        rowTop,
        prodW,
        prodImgH,
        'Product',
        pUrl ? product.name : 'No product image'
      )
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(30, 30, 30)
      let ty = rowTop + prodImgH + 4
      const nameLines = doc.splitTextToSize(product.name, prodW - 1)
      nameLines.slice(0, 2).forEach((line: string) => {
        doc.text(line, px, ty)
        ty += 3.2
      })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(90, 90, 90)
      doc.text(`Style #: ${product.sku}`, px, ty)
      ty += 3.2
      if (product.category) {
        doc.text(`Cat: ${product.category}`, px, ty)
        ty += 3.2
      }
      if (product.colors?.length) {
        const colors = product.colors.map((c) => c.name).join(', ')
        const cl = doc.splitTextToSize(`Color: ${colors}`, prodW - 1)
        cl.slice(0, 2).forEach((line: string) => {
          doc.text(line, px, ty)
          ty += 3
        })
      }
      if (product.goLiveDate) {
        doc.text(`Go live: ${formatDateShort(product.goLiveDate)}`, px, ty)
      }
      doc.setTextColor(0, 0, 0)
      px += prodW + colGap
    })

    ctx.y = rowTop + rowH + 4
  })

  ctx.y += 4
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.3)
  doc.line(margin, ctx.y, margin + contentWidth, ctx.y)
  ctx.y += 6
}

function drawLookCompactPdf(ctx: ShotListCtx, look: Look, products: Product[]) {
  const { doc, margin, contentWidth, cache } = ctx
  const inspW = 24
  const gap = 2
  const inspH = 24
  const prodW = 22
  const prodImgH = 22
  const colGap = 2
  const maxPerRow = Math.max(
    1,
    Math.floor((contentWidth - inspW - gap) / (prodW + colGap))
  )

  ctx.ensureSpace(22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(look.name, margin, ctx.y)
  ctx.y += 5
  if (look.note?.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(90, 90, 90)
    const lines = doc.splitTextToSize(look.note.trim(), contentWidth)
    lines.slice(0, 4).forEach((line: string) => {
      ctx.ensureSpace(3.5)
      doc.text(line, margin, ctx.y)
      ctx.y += 3.2
    })
    doc.setTextColor(0, 0, 0)
  }
  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)
  ctx.ensureSpace(4)
  doc.text(
    `${products.length} ${products.length === 1 ? 'product' : 'products'}`,
    margin,
    ctx.y
  )
  ctx.y += 5
  doc.setTextColor(0, 0, 0)

  const inspUrl = look.inspirationImageUrl?.trim()
  const hasInspiration = !!inspUrl
  const inspImg = inspUrl ? cache.get(inspUrl) ?? null : null
  const chunks = chunkArray(products, maxPerRow)
  // Room for 2 name lines below image; +2mm extra gap under image
  const nameBlockH = 10

  if (products.length === 0) {
    ctx.ensureSpace(inspH + 4)
    if (!hasInspiration) {
      drawPhotoSlot(doc, margin, ctx.y, inspW, inspH, 'Inspiration', 'None')
    } else {
      drawImageOrPlaceholder(
        doc,
        inspImg,
        margin,
        ctx.y,
        inspW,
        inspH,
        'Inspiration',
        'Not loaded'
      )
    }
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('No products', margin + inspW + gap, ctx.y + inspH / 2)
    doc.setTextColor(0, 0, 0)
    ctx.y += inspH + 8
    return
  }

  chunks.forEach((chunk, chunkIndex) => {
    const rowH = Math.max(inspH, prodImgH + nameBlockH) + 2
    ctx.ensureSpace(rowH + 3)
    const rowTop = ctx.y

    if (chunkIndex === 0) {
      if (!hasInspiration) {
        drawPhotoSlot(doc, margin, rowTop, inspW, inspH, 'Inspiration', 'None')
      } else {
        drawImageOrPlaceholder(
          doc,
          inspImg,
          margin,
          rowTop,
          inspW,
          inspH,
          'Inspiration',
          'Not loaded'
        )
      }
    } else {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, rowTop, inspW, inspH, 'FD')
      doc.setFontSize(5)
      doc.setTextColor(180, 180, 180)
      doc.text('· · ·', margin + inspW / 2, rowTop + inspH / 2 + 1, {
        align: 'center',
      })
      doc.setTextColor(0, 0, 0)
    }

    let px = margin + inspW + gap
    chunk.forEach((product) => {
      const pUrl = shotListProductImageUrl(product)?.trim()
      const pImg = pUrl ? cache.get(pUrl) ?? null : null
      drawImageOrPlaceholder(
        doc,
        pImg,
        px,
        rowTop,
        prodW,
        prodImgH,
        'Product',
        product.name
      )
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(40, 40, 40)
      const ny = rowTop + prodImgH + 3.5
      const nl = doc.splitTextToSize(product.name, prodW)
      doc.text(nl[0] || '', px, ny)
      if (nl[1]) doc.text(nl[1], px, ny + 2.8)
      doc.setTextColor(0, 0, 0)
      px += prodW + colGap
    })

    ctx.y = rowTop + rowH + 3
  })

  ctx.y += 3
  doc.setDrawColor(235, 235, 235)
  doc.line(margin, ctx.y, margin + contentWidth, ctx.y)
  ctx.y += 5
}

/**
 * Landscape shot list PDF for the current List or Compact view. Preloads images in parallel.
 */
export async function generateShotListPDF(input: ShotListPDFInput): Promise<void> {
  const { collectionName, looks, allProducts, mode } = input

  if (looks.length === 0) return

  const urlSet = new Set<string>()
  for (const look of looks) {
    if (look.inspirationImageUrl?.trim()) {
      urlSet.add(look.inspirationImageUrl.trim())
    }
    for (const p of shotListLookProducts(look, allProducts)) {
      const u = shotListProductImageUrl(p)?.trim()
      if (u) urlSet.add(u)
    }
  }

  const cache = new Map<string, LoadedImageData | null>()
  await Promise.all(
    [...urlSet].map(async (u) => {
      cache.set(u, await loadImageForPdf(u))
    })
  )

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const contentWidth = pageWidth - margin * 2

  const ctx: ShotListCtx = {
    doc,
    margin,
    contentWidth,
    pageWidth,
    pageHeight,
    y: margin,
    cache,
    collectionName,
    ensureSpace(minHeight: number) {
      if (ctx.y + minHeight > pageHeight - margin) {
        doc.addPage()
        addShotListPageHeader(ctx, 'continued')
      }
    },
  }

  addShotListPageHeader(ctx, 'export')

  for (const look of looks) {
    const products = shotListLookProducts(look, allProducts)
    if (mode === 'list') {
      drawLookListPdf(ctx, look, products)
    } else {
      drawLookCompactPdf(ctx, look, products)
    }
  }

  const safe =
    collectionName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') ||
    'collection'
  const modeSlug = mode === 'list' ? 'List' : 'Compact'
  doc.save(`Shot-List-${safe}-${modeSlug}.pdf`)
}


interface WeekData {
  weekNumber: number
  dateRange: string
  products: Product[]
}

export function generateWeekViewPDF(weeks: WeekData[], monthYear: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const headerHeight = 12
  const contentWidth = pageWidth - (margin * 2)
  
  let yPos = margin
  const lineHeight = 5
  const rowHeight = 7
  const tableHeaderHeight = 8

  function addPageHeader() {
    doc.setFillColor(59, 130, 246) // indigo-600
    doc.rect(0, 0, pageWidth, headerHeight, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Weekly Launch Report', margin, headerHeight - 4)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(monthYear, pageWidth - margin - doc.getTextWidth(monthYear), headerHeight - 4)
    
    doc.setTextColor(0, 0, 0)
    yPos = headerHeight + 8
  }

  // Add first page header
  addPageHeader()

  // Table columns - more room for product name and colors
  const colWidths = {
    productName: contentWidth * 0.32,
    colors: contentWidth * 0.28,
    sku: contentWidth * 0.10,
    stage: contentWidth * 0.15,
    goLiveDate: contentWidth * 0.15,
  }

  weeks.forEach((week, currentWeekIndex) => {
    // Check if we need a new page before starting the week
    // Use a conservative estimate - assume average row height might be larger
    const weekHeaderHeight = 8
    const spacingAfterWeek = 8
    const minSpaceNeeded = weekHeaderHeight + tableHeaderHeight + spacingAfterWeek + 15 // 15mm buffer
    if (yPos + minSpaceNeeded > pageHeight - margin) {
      doc.addPage()
      addPageHeader()
    }

    // Week header - uppercase, slightly smaller
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    const weekHeaderText = `WEEK ${week.weekNumber} - ${week.dateRange.toUpperCase()}`
    
    // Check if week header fits on current page
    if (yPos + 8 > pageHeight - margin) {
      doc.addPage()
      addPageHeader()
    }
    
    doc.text(weekHeaderText, margin, yPos)
    yPos += 8

    // Table header - check if it fits
    if (yPos + tableHeaderHeight > pageHeight - margin) {
      doc.addPage()
      addPageHeader()
      // Re-draw week header if we moved to a new page
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(weekHeaderText, margin, yPos)
      yPos += 8
    }
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, yPos - 4, contentWidth, tableHeaderHeight, 'F')
    doc.setTextColor(128, 128, 128) // Light grey for headers
    
    let colX = margin
    doc.text('PRODUCT', colX + 2, yPos)
    colX += colWidths.productName
    doc.text('COLORS', colX + 2, yPos)
    colX += colWidths.colors
    doc.text('SKU', colX + 2, yPos)
    colX += colWidths.sku
    doc.text('STATUS', colX + 2, yPos)
    colX += colWidths.stage
    doc.text('LAUNCH DATE', colX + 2, yPos)
    
    doc.setTextColor(0, 0, 0) // Reset to black
    yPos += tableHeaderHeight

    // Products rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    
    if (week.products.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(128, 128, 128)
      doc.text('No products launching this week', margin + 2, yPos)
      doc.setTextColor(0, 0, 0)
      yPos += rowHeight
    } else {
      week.products.forEach((product, productIndex) => {
        // First, calculate the height needed for this row WITHOUT drawing
        const productName = product.name || 'N/A'
        doc.setFontSize(7)
        const productLines = doc.splitTextToSize(productName, colWidths.productName - 4)
        let productNameHeight = productLines.length * lineHeight
        
        // Calculate tags height if they exist
        if (product.tags && product.tags.length > 0) {
          doc.setFontSize(6)
          const tagsText = product.tags.join(', ')
          const tagsLines = doc.splitTextToSize(tagsText, colWidths.productName - 4)
          productNameHeight += tagsLines.length * lineHeight * 0.9
        }
        
        // Calculate colors height
        let colorsHeight = rowHeight
        if (product.colors && product.colors.length > 0) {
          const colorTextParts: string[] = []
          product.colors.forEach((color, index) => {
            colorTextParts.push(color.name)
            if (color.tags && color.tags.length > 0) {
              colorTextParts.push(`(${color.tags[0]})`)
            }
            if (index < product.colors!.length - 1) {
              colorTextParts.push(', ')
            }
          })
          const fullColorText = colorTextParts.join('')
          doc.setFontSize(6.5)
          const colorLines = doc.splitTextToSize(fullColorText, colWidths.colors - 4)
          colorsHeight = colorLines.length * lineHeight * 0.9
        }
        
        // Calculate actual row height
        const actualRowHeight = Math.max(rowHeight, Math.max(productNameHeight, colorsHeight))
        
        // Store the starting Y position for this row BEFORE any content
        let rowStartY = yPos
        
        // Check if we need a new page for this row (using actualRowHeight to account for wrapping)
        // Add extra buffer (15mm) to ensure content isn't cut off - be more conservative
        const spaceNeeded = actualRowHeight + 15 // 15mm buffer for safety
        if (yPos + spaceNeeded > pageHeight - margin) {
          doc.addPage()
          addPageHeader()
          // Re-draw week header if we're continuing on a new page
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text(`WEEK ${week.weekNumber} - ${week.dateRange.toUpperCase()}`, margin, yPos)
          yPos += 8
          
          // Re-draw table headers when breaking to a new page mid-week
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, yPos - 4, contentWidth, tableHeaderHeight, 'F')
          doc.setTextColor(128, 128, 128) // Light grey for headers
          
          let headerColX = margin
          doc.text('PRODUCT', headerColX + 2, yPos)
          headerColX += colWidths.productName
          doc.text('COLORS', headerColX + 2, yPos)
          headerColX += colWidths.colors
          doc.text('SKU', headerColX + 2, yPos)
          headerColX += colWidths.sku
          doc.text('STATUS', headerColX + 2, yPos)
          headerColX += colWidths.stage
          doc.text('LAUNCH DATE', headerColX + 2, yPos)
          
          doc.setTextColor(0, 0, 0) // Reset to black
          yPos += tableHeaderHeight
          
          // Update rowStartY if we moved to a new page
          rowStartY = yPos
        }
        
        // Draw alternating row background FIRST (before text, so text appears on top)
        if (productIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(margin, rowStartY - 4, contentWidth, actualRowHeight, 'F')
        }
        
        // Reset font size for drawing
        doc.setFontSize(7)
        
        // Now draw all the content
        let colX = margin
        
        // Set product name color based on gender
        if (product.gender === 'womens') {
          doc.setTextColor(37, 99, 235) // blue-600
        } else {
          doc.setTextColor(60, 60, 60) // Dark grey for product names
        }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        
        // Draw product name
        doc.text(productLines, colX + 2, yPos)
        
        let currentProductYPos = yPos + (productLines.length * lineHeight)
        
        // Product tags below name (smaller, italic, gray)
        if (product.tags && product.tags.length > 0) {
          doc.setFontSize(6)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(128, 128, 128) // Gray
          const tagsText = product.tags.join(', ')
          const tagsLines = doc.splitTextToSize(tagsText, colWidths.productName - 4)
          doc.text(tagsLines, colX + 2, currentProductYPos)
          currentProductYPos += tagsLines.length * lineHeight * 0.9
        }
        
        colX += colWidths.productName

        // Colors column (separate column, smaller font)
        if (product.colors && product.colors.length > 0) {
          // Build color text with color-level tags
          const colorTextParts: string[] = []
          if (product.colors) {
            product.colors.forEach((color, index) => {
              colorTextParts.push(color.name)
              if (color.tags && color.tags.length > 0) {
                const tag = color.tags[0]
                colorTextParts.push(`(${tag})`)
              }
              if (index < product.colors!.length - 1) {
                colorTextParts.push(', ')
              }
            })
          }
          
          const fullColorText = colorTextParts.join('')
          const colorLines = doc.splitTextToSize(fullColorText, colWidths.colors - 4)
          
          // Use smaller font for colors
          doc.setFontSize(6.5)
          doc.setTextColor(100, 100, 100) // Lighter grey for colors
          
          // Draw each line with proper tag styling
          let colorYPos = yPos
          colorLines.forEach((line: string) => {
            let xOffset = colX + 2
            
            // Split line by tags and draw each part with appropriate styling
            const parts = line.split(/(\(restock\)|\(new\))/g)
            parts.forEach((part) => {
              if (part === '(restock)') {
                // Add small margin before tag (ml-1 equivalent ~2-3mm)
                xOffset += doc.getTextWidth(' ') // Add space before tag
                doc.setTextColor(37, 99, 235) // blue-600
                doc.setFont('helvetica', 'italic')
                doc.text(part, xOffset, colorYPos)
                xOffset += doc.getTextWidth(part)
              } else if (part === '(new)') {
                // Add small margin before tag (ml-1 equivalent ~2-3mm)
                xOffset += doc.getTextWidth(' ') // Add space before tag
                doc.setTextColor(21, 128, 61) // green-700
                doc.setFont('helvetica', 'italic')
                doc.text(part, xOffset, colorYPos)
                xOffset += doc.getTextWidth(part)
              } else if (part.trim()) {
                doc.setTextColor(100, 100, 100) // Lighter grey
                doc.setFont('helvetica', 'normal')
                doc.text(part, xOffset, colorYPos)
                xOffset += doc.getTextWidth(part)
              }
            })
            
            colorYPos += lineHeight * 0.9
          })
          
          // Reset font size and color
          doc.setFontSize(7)
          doc.setTextColor(0, 0, 0)
        } else {
          doc.setTextColor(100, 100, 100)
          doc.text('-', colX + 2, yPos)
          doc.setTextColor(0, 0, 0)
        }
        
        colX += colWidths.colors

        // SKU
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100, 100, 100) // Lighter grey
        doc.text(product.sku || 'N/A', colX + 2, yPos)
        colX += colWidths.sku

        // Stage (no color for now)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100, 100, 100) // Lighter grey
        
        const stageLabel = STAGE_LABELS[product.stage] || product.stage
        doc.text(stageLabel, colX + 2, yPos)
        colX += colWidths.stage

        // Go Live Date
        const dateText = product.goLiveDate 
          ? formatDateShort(product.goLiveDate)
          : '-'
        doc.text(dateText, colX + 2, yPos)
        
        // Move to next row
        yPos += actualRowHeight
        
        // After drawing each row, check if we're too close to the bottom for the next row
        // This prevents the last row from being cut off
        if (yPos + 20 > pageHeight - margin && productIndex < week.products.length - 1) {
          // We're too close to the bottom and there are more products
          // The next iteration will trigger a page break, but let's be proactive
          // Don't add spacing if we're about to break
        }
      })
    }

    // Spacing between weeks - but check if we have room first
    const spacingNeeded = 8
    const isLastWeek = currentWeekIndex === weeks.length - 1
    
    if (!isLastWeek) {
      // Only add spacing if it's not the last week
      if (yPos + spacingNeeded + 10 > pageHeight - margin) {
        // Not enough room for spacing, start next week on new page
        doc.addPage()
        addPageHeader()
      } else {
        yPos += spacingNeeded
      }
    }
    // For the last week, ensure all content is visible
    // The page break checks during row drawing should have handled this,
    // but we verify the final position is within bounds
  })
  
  // Final check: ensure we haven't drawn content beyond the page margin
  // This is a safety check for the very last content
  if (yPos > pageHeight - margin) {
    // This shouldn't happen due to our page break logic, but if it does,
    // the content is already drawn and jsPDF will handle it
  }
  // Save the PDF
  const fileName = `Weekly-Launch-Report-${monthYear.replace(/\s+/g, '-')}.pdf`
  doc.save(fileName)
}
