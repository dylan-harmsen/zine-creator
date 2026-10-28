// A printable test sheet per mode: big page numbers in their imposed slots,
// with fold, cut and crop lines. Used to check the page maps on real paper.

import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { cropMarkSegments, foldSegments, placedPages, toSheet, type PlacedPage, type Segment } from '../imposition/geometry'
import type { ZineMode } from '../imposition/modes'

const PT_PER_MM = 72 / 25.4

const FOLD_COLOUR = rgb(0.6, 0.6, 0.6)
const CUT_COLOUR = rgb(0.8, 0.1, 0.1)
const CROP_COLOUR = rgb(0, 0, 0)

export async function buildTestSheet(mode: ZineMode): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${mode.name} — test sheet`)
  const page = doc.addPage([mode.sheetWidthMm * PT_PER_MM, mode.sheetHeightMm * PT_PER_MM])
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  for (const placed of placedPages(mode)) {
    drawPanel(page, mode, placed, bold, regular)
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

  const note = `${mode.name} test sheet - print at 100% / actual size - red = cut, dashed = fold`
  page.drawText(note, {
    x: 4 * PT_PER_MM,
    y: 2 * PT_PER_MM,
    size: 6,
    font: regular,
    color: rgb(0.4, 0.4, 0.4),
  })

  return doc.save()
}

function drawPanel(page: PDFPage, mode: ZineMode, placed: PlacedPage, bold: PDFFont, regular: PDFFont) {
  const { rect, rotation } = placed
  const cx = (rect.x + rect.width / 2) * PT_PER_MM
  const cy = (mode.sheetHeightMm - rect.y - rect.height / 2) * PT_PER_MM
  const halfH = (rect.height / 2) * PT_PER_MM

  const label = String(placed.page)
  const labelSize = rect.height * PT_PER_MM * 0.4
  const lines: { text: string; font: PDFFont; size: number; dy: number }[] = [
    // dy is the baseline offset from the panel centre, in the page's own upright frame.
    { text: 'TOP', font: regular, size: 7, dy: halfH - 6 * PT_PER_MM },
    { text: label, font: bold, size: labelSize, dy: -labelSize * 0.35 },
  ]
  if (placed.page === 1) lines.push({ text: 'FRONT COVER', font: regular, size: 7, dy: -halfH + 6 * PT_PER_MM })
  if (placed.page === mode.pageCount) lines.push({ text: 'BACK COVER', font: regular, size: 7, dy: -halfH + 6 * PT_PER_MM })

  // Rotating 180° about the text origin flips it into the opposite quadrant,
  // so the origin moves to the mirrored point around the panel centre.
  const sign = rotation === 180 ? -1 : 1

  for (const line of lines) {
    const w = line.font.widthOfTextAtSize(line.text, line.size)
    page.drawText(line.text, {
      x: cx - sign * (w / 2),
      y: cy + sign * line.dy,
      size: line.size,
      font: line.font,
      rotate: degrees(rotation),
    })
  }

  // Underline 6 and 9 so they can't be mistaken for each other upside down.
  if (label === '6' || label === '9') {
    const w = bold.widthOfTextAtSize(label, labelSize)
    const thickness = labelSize * 0.05
    const gap = labelSize * 0.08
    const baseline = -labelSize * 0.35
    // Underline band in the upright frame, mirrored about the centre when rotated.
    const top = sign * (baseline - gap)
    const bottom = sign * (baseline - gap - thickness)
    page.drawRectangle({
      x: cx - w / 2,
      y: cy + Math.min(top, bottom),
      width: w,
      height: thickness,
    })
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
