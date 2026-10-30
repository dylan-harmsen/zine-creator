// Draws a whole imposed sheet: every page in its slot (rotated as needed),
// then fold, cut and crop lines. Used by the Print sheet view and the PDF export.

import { cropMarkSegments, foldSegments, placedPages, toSheet, type Segment } from '../imposition/geometry'
import { MODES } from '../imposition/modes'
import { contentRotation } from '../imposition/orientation'
import { pageFrame, placeImage } from '../model/pageLayout'
import type { Project } from '../model/types'
import { renderPage, type ImageSource } from './renderPage'

export interface SheetOptions {
  foldLines: boolean
  cutLines: boolean
  note: boolean
}

export const PRINT_NOTE = 'Print at 100% / actual size'

export function composeSheet(
  ctx: CanvasRenderingContext2D,
  project: Project,
  pxPerMm: number,
  images: Record<string, ImageSource | undefined>,
  options: SheetOptions,
) {
  const mode = MODES[project.mode]
  const s = pxPerMm

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, mode.sheetWidthMm * s, mode.sheetHeightMm * s)

  for (const placed of placedPages(mode)) {
    const index = placed.page - 1
    const frame = pageFrame(project, index)
    const { rect } = placed
    ctx.save()
    // Turn the page about its slot's centre; a landscape page fills the slot sideways.
    ctx.translate((rect.x + rect.width / 2) * s, (rect.y + rect.height / 2) * s)
    ctx.rotate((contentRotation(placed.rotation, project.orientation) * Math.PI) / 180)
    ctx.translate((-frame.width / 2) * s, (-frame.height / 2) * s)
    renderPage(ctx, project.pages[index], { pxPerMm: s, frame, image: placeImage(project, index), images })
    ctx.restore()
  }

  const line = (seg: Segment, colour: string, widthMm: number, dash: number[] = []) => {
    ctx.save()
    ctx.strokeStyle = colour
    ctx.lineWidth = widthMm * s
    ctx.setLineDash(dash.map((d) => d * s))
    ctx.beginPath()
    ctx.moveTo(seg.x1 * s, seg.y1 * s)
    ctx.lineTo(seg.x2 * s, seg.y2 * s)
    ctx.stroke()
    ctx.restore()
  }

  if (options.foldLines) {
    for (const fold of foldSegments(mode)) line(toSheet(mode, fold), 'rgba(120,120,120,0.7)', 0.2, [2, 1.5])
  }
  if (options.cutLines) {
    for (const cut of mode.cuts) line(toSheet(mode, cut), '#cc1a1a', 0.4)
  }
  if (mode.cropMarks) {
    for (const mark of cropMarkSegments(mode)) line(mark, '#000000', 0.15)
  }

  if (options.note) {
    ctx.save()
    ctx.font = `${2 * s}px "Inter"`
    ctx.fillStyle = 'rgba(100,100,100,0.9)'
    ctx.textBaseline = 'bottom'
    ctx.fillText(PRINT_NOTE, 4 * s, (mode.sheetHeightMm - 1.5) * s)
    ctx.restore()
  }
}
