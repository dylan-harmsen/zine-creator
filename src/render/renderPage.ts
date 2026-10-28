// The one page renderer. The editor, thumbnails, the Print sheet view and the
// PDF export all draw pages through this function.

import type { Edges } from '../imposition/edges'
import { layoutImage } from '../model/imageLayout'
import type { Page } from '../model/types'
import { TEXT_PADDING, fontString, layoutTextBox } from './textLayout'

export type ImageSource = CanvasImageSource

export interface RenderOptions {
  pxPerMm: number
  pageWidth: number
  pageHeight: number
  bleed: Edges
  images: Record<string, ImageSource | undefined>
  /** Text box being edited in place; the editor draws it as a textarea instead. */
  hiddenTextId?: string
}

/**
 * Draws a page with the context's origin at the trim box's top-left corner.
 * Drawing is clipped to the bleed box, which extends past the origin.
 */
export function renderPage(ctx: CanvasRenderingContext2D, page: Page, o: RenderOptions) {
  const s = o.pxPerMm
  ctx.save()
  ctx.beginPath()
  ctx.rect(
    -o.bleed.left * s,
    -o.bleed.top * s,
    (o.pageWidth + o.bleed.left + o.bleed.right) * s,
    (o.pageHeight + o.bleed.top + o.bleed.bottom) * s,
  )
  ctx.clip()

  ctx.fillStyle = page.background
  ctx.fill()

  if (page.image) {
    const source = o.images[page.image.assetId]
    if (source) {
      const l = layoutImage(page.image, o.pageWidth, o.pageHeight, o.bleed)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(source, l.x * s, l.y * s, l.width * s, l.height * s)
    }
  }

  for (const box of page.texts) {
    if (box.id === o.hiddenTextId) continue
    const layout = layoutTextBox(box)
    if (box.background) {
      ctx.fillStyle = box.background
      ctx.fillRect(box.x * s, box.y * s, box.width * s, layout.height * s)
    }
    ctx.font = fontString(box, s)
    ctx.fillStyle = box.color
    ctx.textBaseline = 'middle'
    ctx.textAlign = box.align
    const left = box.x + TEXT_PADDING
    const inner = box.width - TEXT_PADDING * 2
    const x = box.align === 'left' ? left : box.align === 'center' ? left + inner / 2 : left + inner
    layout.lines.forEach((line, i) => {
      const y = box.y + TEXT_PADDING + layout.lineHeight * (i + 0.5)
      ctx.fillText(line, x * s, y * s)
    })
  }

  ctx.restore()
}
