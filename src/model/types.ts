// The project model. Positions and sizes are in millimetres relative to the
// page's trim box (top-left origin, y down) unless stated otherwise.

import { MODES, type ModeId } from '../imposition/modes'
import { pageSize, type Orientation } from '../imposition/orientation'
import { canMerge } from './spreads'

export type { Orientation }

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
  /**
   * This page and the next share one image laid out across both. Only ever
   * set on the first page of a facing pair; the image lives on this page.
   */
  mergedWithNext: boolean
}

export interface Project {
  id: string
  name: string
  mode: ModeId
  /** Chosen at creation, like the mode. */
  orientation: Orientation
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
  return { id: newId(), background: '#ffffff', image: null, texts: [], mergedWithNext: false }
}

export function newProject(mode: ModeId, name: string, orientation: Orientation = 'portrait'): Project {
  const now = Date.now()
  return {
    id: newId(),
    name,
    mode,
    orientation,
    bleed: MODES[mode].bleedMm > 0,
    pages: Array.from({ length: MODES[mode].pageCount }, newPage),
    createdAt: now,
    updatedAt: now,
  }
}

export function newTextBox(mode: ModeId, orientation: Orientation): TextBox {
  const { width, height } = pageSize(MODES[mode], orientation)
  return {
    id: newId(),
    x: width * 0.1,
    y: height * 0.1,
    width: width * 0.8,
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

/** A project as stored by an earlier version, before some fields existed. */
export type StoredProject = Omit<Project, 'orientation' | 'pages'> & {
  orientation?: Orientation
  pages: (Omit<Page, 'mergedWithNext'> & { mergedWithNext?: boolean })[]
}

/** Fills in fields added since a project was saved, and drops merges that aren't on a facing pair. */
export function normalizeProject(stored: StoredProject): Project {
  const count = stored.pages.length
  return {
    ...stored,
    orientation: stored.orientation ?? 'portrait',
    pages: stored.pages.map((p, i) => ({ ...p, mergedWithNext: (p.mergedWithNext ?? false) && canMerge(count, i) })),
  }
}
