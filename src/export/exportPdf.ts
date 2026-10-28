// Builds the print PDF: the composed sheet as one 300 DPI image, plus an
// optional instructions page drawn as vector.

import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { foldSegments, placedPages, toSheet } from '../imposition/geometry'
import { MODES, type ModeId, type ZineMode } from '../imposition/modes'
import type { Project } from '../model/types'
import { composeSheet } from '../render/composeSheet'
import type { ImageSource } from '../render/renderPage'

export const EXPORT_DPI = 300
const PT_PER_MM = 72 / 25.4

export interface ExportOptions {
  foldLines: boolean
  cutLines: boolean
  instructions: boolean
}

export async function buildZinePdf(
  project: Project,
  images: Record<string, ImageSource | undefined>,
  options: ExportOptions,
): Promise<Uint8Array> {
  const mode = MODES[project.mode]
  const pxPerMm = EXPORT_DPI / 25.4
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(mode.sheetWidthMm * pxPerMm)
  canvas.height = Math.round(mode.sheetHeightMm * pxPerMm)
  composeSheet(canvas.getContext('2d')!, project, pxPerMm, images, { ...options, note: true })
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode sheet'))), 'image/jpeg', 0.95),
  )

  const doc = await PDFDocument.create()
  doc.setTitle(project.name)
  doc.setCreator('Zine Creator')
  const sheetSize: [number, number] = [mode.sheetWidthMm * PT_PER_MM, mode.sheetHeightMm * PT_PER_MM]
  const sheet = doc.addPage(sheetSize)
  const embedded = await doc.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))
  sheet.drawImage(embedded, { x: 0, y: 0, width: sheetSize[0], height: sheetSize[1] })

  if (options.instructions) await drawInstructions(doc, mode)
  return doc.save()
}

export function pdfFilename(project: Project): string {
  const safe = project.name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'zine'
  return `${safe}-${project.mode}.pdf`
}

const STEPS: Record<ModeId, string[]> = {
  'a4-mini': [
    'Print the sheet single-sided at 100% / actual size (no "fit to page").',
    'Crease every dashed fold line, folding both ways, then unfold.',
    'Fold the sheet in half along the short middle line. From the fold, cut along the red line through both layers.',
    'Unfold, then fold in half lengthwise again with the printed side out.',
    'Push the two ends towards each other so the slit opens into a diamond, then flatten into a booklet.',
    'Wrap the pages around so page 1 is the front cover and the pages read 1 to 8.',
  ],
  'micro-mini': [
    'Print the sheet single-sided at 100% / actual size (no "fit to page").',
    'Crease every dashed fold line, folding both ways, then unfold.',
    'Cut along every red line.',
    'Fold along the remaining lines so the pages run in order from 1 (front cover) to 16 (back cover).',
  ],
  'tcg-mini': [
    'Print the sheet single-sided at 100% / actual size (no "fit to page").',
    'Trim along the crop marks to cut away the margin (and bleed).',
    'Crease every fold line, folding both ways, then unfold.',
    'Fold in half along the short middle line. From the fold, cut along the red line through both layers.',
    'Unfold, then fold in half lengthwise again with the printed side out.',
    'Push the two ends towards each other so the slit opens into a diamond, then flatten into a booklet with page 1 on the front.',
  ],
}

async function drawInstructions(doc: PDFDocument, mode: ZineMode) {
  const page = doc.addPage([210 * PT_PER_MM, 297 * PT_PER_MM])
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const margin = 20 * PT_PER_MM
  const width = page.getWidth() - margin * 2
  let y = page.getHeight() - margin

  page.drawText(`How to fold: ${mode.name}`, { x: margin, y, size: 16, font: bold })
  y -= 28

  STEPS[mode.id].forEach((step, i) => {
    for (const [j, line] of wrapPdf(step, regular, 11, width - 18).entries()) {
      if (j === 0) page.drawText(`${i + 1}.`, { x: margin, y, size: 11, font: bold })
      page.drawText(line, { x: margin + 18, y, size: 11, font: regular })
      y -= 15
    }
    y -= 4
  })

  page.drawText('Red = cut, dashed = fold. Numbers show where each page lands.', {
    x: margin,
    y: y - 6,
    size: 9,
    font: regular,
    color: rgb(0.4, 0.4, 0.4),
  })

  // Sheet diagram, scaled to the page width and placed under the steps.
  const scale = Math.min(width / mode.sheetWidthMm, (y - margin - 20) / mode.sheetHeightMm)
  const top = y - 20
  drawDiagram(page, mode, margin, top, scale, bold)
}

function drawDiagram(page: PDFPage, mode: ZineMode, left: number, top: number, scale: number, font: PDFFont) {
  const X = (mm: number) => left + mm * scale
  const Y = (mm: number) => top - mm * scale
  page.drawRectangle({
    x: X(0),
    y: Y(mode.sheetHeightMm),
    width: mode.sheetWidthMm * scale,
    height: mode.sheetHeightMm * scale,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 0.75,
  })

  for (const placed of placedPages(mode)) {
    const r = placed.rect
    if (mode.cropMarks) {
      page.drawRectangle({ x: X(r.x), y: Y(r.y + r.height), width: r.width * scale, height: r.height * scale, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5 })
    }
    const label = String(placed.page) + (placed.page === 6 || placed.page === 9 ? '.' : '')
    const size = Math.min(r.width, r.height) * scale * 0.35
    const w = font.widthOfTextAtSize(label, size)
    const cx = X(r.x + r.width / 2)
    const cy = Y(r.y + r.height / 2)
    const sign = placed.rotation === 180 ? -1 : 1
    page.drawText(label, {
      x: cx - (sign * w) / 2,
      y: cy - (sign * size * 0.35),
      size,
      font,
      rotate: degrees(placed.rotation),
      color: rgb(0.2, 0.2, 0.2),
    })
  }

  for (const fold of foldSegments(mode)) {
    const s = toSheet(mode, fold)
    page.drawLine({ start: { x: X(s.x1), y: Y(s.y1) }, end: { x: X(s.x2), y: Y(s.y2) }, thickness: 0.6, color: rgb(0.5, 0.5, 0.5), dashArray: [3, 2] })
  }
  for (const cut of mode.cuts) {
    const s = toSheet(mode, cut)
    page.drawLine({ start: { x: X(s.x1), y: Y(s.y1) }, end: { x: X(s.x2), y: Y(s.y2) }, thickness: 1.8, color: rgb(0.8, 0.1, 0.1) })
  }
}

function wrapPdf(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}
