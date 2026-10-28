// The project model. Positions and sizes are in millimetres relative to the
// page's trim box (top-left origin, y down) unless stated otherwise.

import { MODES, type ModeId } from '../imposition/modes'

export type Align = 'left' | 'center' | 'right'
export type ImageFit = 'cover' | 'contain'

export interface PageImage {
  assetId: string
  /** Pixel size of the stored (already downscaled) image. */
  width: number
  height: number
  fit: ImageFit
  /** 1 = fitted exactly; larger zooms in. */
  zoom: number
  /** Offset of the image centre from the fit box centre, in mm. */
  panX: number
  panY: number
}

export interface TextBox {
  id: string
  x: number
  y: number
  width: number
  text: string
  font: string
  sizePt: number
  color: string
  align: Align
  /** Solid background behind the text, or null for none. */
  background: string | null
}

export interface Page {
  id: string
  background: string
  image: PageImage | null
  texts: TextBox[]
}

export interface Project {
  id: string
  name: string
  mode: ModeId
  /** Only used by modes that support bleed. */
  bleed: boolean
  /** In reading order: pages[0] is page 1, the front cover. */
  pages: Page[]
  createdAt: number
  updatedAt: number
}

export const DEFAULT_FONT = 'Inter'

export function newId(): string {
  return crypto.randomUUID()
}

export function newPage(): Page {
  return { id: newId(), background: '#ffffff', image: null, texts: [] }
}

export function newProject(mode: ModeId, name: string): Project {
  const now = Date.now()
  return {
    id: newId(),
    name,
    mode,
    bleed: MODES[mode].bleedMm > 0,
    pages: Array.from({ length: MODES[mode].pageCount }, newPage),
    createdAt: now,
    updatedAt: now,
  }
}

export function newTextBox(mode: ModeId): TextBox {
  const { pageWidthMm, pageHeightMm } = MODES[mode]
  return {
    id: newId(),
    x: pageWidthMm * 0.1,
    y: pageHeightMm * 0.1,
    width: pageWidthMm * 0.8,
    text: 'Text',
    font: DEFAULT_FONT,
    sizePt: mode === 'micro-mini' ? 10 : 14,
    color: '#000000',
    align: 'left',
    background: null,
  }
}

export function pageLabel(index: number, pageCount: number): string {
  if (index === 0) return 'Front cover'
  if (index === pageCount - 1) return 'Back cover'
  return `Page ${index + 1}`
}
