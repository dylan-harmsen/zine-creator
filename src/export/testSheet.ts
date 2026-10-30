// A printable test sheet per mode: big page numbers in their imposed slots,
// with fold, cut and crop lines. Used to check the page maps on real paper.

import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { cropMarkSegments, foldSegments, placedPages, toSheet, type PlacedPage, type Segment } from '../imposition/geometry'
import type { ZineMode } from '../imposition/modes'
import { contentRotation, pageSize, type Orientation } from '../imposition/orientation'

const PT_PER_MM = 72 / 25.4

const FOLD_COLOUR = rgb(0.6, 0.6, 0.6)
const CUT_COLOUR = rgb(0.8, 0.1, 0.1)
const CROP_COLOUR = rgb(0, 0, 0)

export async function buildTestSheet(mode: ZineMode, orientation: Orientation = 'portrait'): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${mode.name}${orientation === 'landscape' ? ', landscape' : ''} — test sheet`)
  const page = doc.addPage([mode.sheetWidthMm * PT_PER_MM, mode.sheetHeightMm * PT_PER_MM])
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  for (const placed of placedPages(mode)) {
    drawPanel(page, mode, orientation, placed, bold, regular)
  }

  for (const fold of foldSegments(mode)) {
    drawSegment(page, mode, toSheet(mode, fold), { colour: FOLD_COLOUR, widthMm: 0.2, dashed: true })
  }
  for (const cut of mode.cuts) {
    drawSegment(page, mode, toSheet(mode, cut), { colour: CUT_COLOUR, widthMm: 0.8 })
  }
  if (mode.cropMarks) {
    for (const mark of cropMarkSegments(mode)) {
      drawSegment(page, mode, mark, { colour: CROP_COLOUR, widthMm: 0.15 })
    }
  }

  const name = orientation === 'landscape' ? `${mode.name}, landscape pages` : mode.name
  const note = `${name} test sheet - print at 100% / actual size - red = cut, dashed = fold`
  page.drawText(note, {
    x: 4 * PT_PER_MM,
    y: 2 * PT_PER_MM,
    size: 6,
    font: regular,
    color: rgb(0.4, 0.4, 0.4),
  })

  return doc.save()
}

function drawPanel(
  page: PDFPage,
  mode: ZineMode,
  orientation: Orientation,
  placed: PlacedPage,
  bold: PDFFont,
  regular: PDFFont,
) {
  const { rect } = placed
  const cx = (rect.x + rect.width / 2) * PT_PER_MM
  const cy = (mode.sheetHeightMm - rect.y - rect.height / 2) * PT_PER_MM
  const halfH = (pageSize(mode, orientation).height / 2) * PT_PER_MM

  const label = String(placed.page)
  const labelSize = halfH * 0.8
  const lines: { text: string; font: PDFFont; size: number; dy: number }[] = [
    // dy is the baseline offset from the panel centre, in the page's own upright frame.
    { text: 'TOP', font: regular, size: 7, dy: halfH - 6 * PT_PER_MM },
    { text: label, font: bold, size: labelSize, dy: -labelSize * 0.35 },
  ]
  if (placed.page === 1) lines.push({ text: 'FRONT COVER', font: regular, size: 7, dy: -halfH + 6 * PT_PER_MM })
  if (placed.page === mode.pageCount) lines.push({ text: 'BACK COVER', font: regular, size: 7, dy: -halfH + 6 * PT_PER_MM })

  // The page's upright frame turns with the page. pdf-lib turns drawings
  // anticlockwise about their origin, so origins are turned the same way.
  const angle = -contentRotation(placed.rotation, orientation)
  const cos = Math.cos((angle * Math.PI) / 180)
  const sin = Math.sin((angle * Math.PI) / 180)
  /** Sheet position of a point given in pt from the panel centre, in the page's upright frame (y up). */
  const at = (x: number, y: number) => ({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos })

  for (const line of lines) {
    const w = line.font.widthOfTextAtSize(line.text, line.size)
    page.drawText(line.text, { ...at(-w / 2, line.dy), size: line.size, font: line.font, rotate: degrees(angle) })
  }

  // Underline 6 and 9 so they can't be mistaken for each other upside down.
  if (label === '6' || label === '9') {
    const w = bold.widthOfTextAtSize(label, labelSize)
    const thickness = labelSize * 0.05
    const gap = labelSize * 0.08
    const baseline = -labelSize * 0.35
    page.drawRectangle({ ...at(-w / 2, baseline - gap - thickness), width: w, height: thickness, rotate: degrees(angle) })
  }
}

function drawSegment(
  page: PDFPage,
  mode: ZineMode,
  s: Segment,
  style: { colour: ReturnType<typeof rgb>; widthMm: number; dashed?: boolean },
) {
  page.drawLine({
    start: { x: s.x1 * PT_PER_MM, y: (mode.sheetHeightMm - s.y1) * PT_PER_MM },
    end: { x: s.x2 * PT_PER_MM, y: (mode.sheetHeightMm - s.y2) * PT_PER_MM },
    thickness: style.widthMm * PT_PER_MM,
    color: style.colour,
    dashArray: style.dashed ? [2 * PT_PER_MM, 1.5 * PT_PER_MM] : undefined,
  })
}
