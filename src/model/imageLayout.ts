// Where a page's image lands, in mm relative to the trim box.
//
// Cover fits the image to the bleed box so the bleed is always filled;
// contain fits it to the trim box so nothing gets trimmed off.

import type { Edges } from '../imposition/edges'
import type { PageImage } from './types'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageLayout extends Box {
  /** The pan actually applied, after clamping. */
  panX: number
  panY: number
}

export const MAX_ZOOM = 4

export function fitBox(image: PageImage, pageWidth: number, pageHeight: number, bleed: Edges): Box {
  if (image.fit === 'contain') return { x: 0, y: 0, width: pageWidth, height: pageHeight }
  return {
    x: -bleed.left,
    y: -bleed.top,
    width: pageWidth + bleed.left + bleed.right,
    height: pageHeight + bleed.top + bleed.bottom,
  }
}

function clamp(v: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, v))
}

export function layoutImage(image: PageImage, pageWidth: number, pageHeight: number, bleed: Edges): ImageLayout {
  const box = fitBox(image, pageWidth, pageHeight, bleed)
  const sx = box.width / image.width
  const sy = box.height / image.height
  const base = image.fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy)
  const scale = base * image.zoom
  const width = image.width * scale
  const height = image.height * scale
  // A cover image may move until its edge reaches the box edge; a smaller
  // contained image may move until it reaches the box edge from inside.
  const panX = clamp(image.panX, Math.abs(width - box.width) / 2)
  const panY = clamp(image.panY, Math.abs(height - box.height) / 2)
  return {
    x: box.x + (box.width - width) / 2 + panX,
    y: box.y + (box.height - height) / 2 + panY,
    width,
    height,
    panX,
    panY,
  }
}

/** Effective print resolution of the image at its current size. */
export function effectiveDpi(image: PageImage, layout: ImageLayout): number {
  return (image.width / layout.width) * 25.4
}

export const LOW_DPI = 150
