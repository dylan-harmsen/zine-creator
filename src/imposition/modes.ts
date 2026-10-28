// Imposition data for each zine mode. See docs/spec.md#modes.
//
// Grid coordinates are in cell units with the origin at the top-left of the
// grid and y pointing down, as seen on the printed side of the sheet.

export type ModeId = 'a4-mini' | 'micro-mini' | 'tcg-mini'

export type Rotation = 0 | 180

export interface Slot {
  page: number
  rotation: Rotation
}

export interface GridSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface ZineMode {
  id: ModeId
  name: string
  sheetWidthMm: number
  sheetHeightMm: number
  columns: number
  rows: number
  pageWidthMm: number
  pageHeightMm: number
  pageCount: number
  /** Row-major, top-left first. */
  slots: Slot[]
  cuts: GridSegment[]
  cropMarks: boolean
  /** Bleed on the outer edges of the grid when bleed is enabled. */
  bleedMm: number
}

const A4_SHORT = 210
const A4_LONG = 297

/** Shorthand: positive = upright, negative = rotated 180°. */
function slotsFrom(pages: number[][]): Slot[] {
  return pages.flat().map((p) => ({ page: Math.abs(p), rotation: p < 0 ? 180 : 0 }))
}

const EIGHT_PANEL_SLOTS = slotsFrom([
  [-7, -6, -5, -4],
  [8, 1, 2, 3],
])

const EIGHT_PANEL_CUTS: GridSegment[] = [{ x1: 1, y1: 1, x2: 3, y2: 1 }]

export const MODES: Record<ModeId, ZineMode> = {
  'a4-mini': {
    id: 'a4-mini',
    name: 'A4 mini zine (8 pages)',
    sheetWidthMm: A4_LONG,
    sheetHeightMm: A4_SHORT,
    columns: 4,
    rows: 2,
    pageWidthMm: A4_LONG / 4,
    pageHeightMm: A4_SHORT / 2,
    pageCount: 8,
    slots: EIGHT_PANEL_SLOTS,
    cuts: EIGHT_PANEL_CUTS,
    cropMarks: false,
    bleedMm: 0,
  },
  'micro-mini': {
    id: 'micro-mini',
    name: 'Micro mini zine (16 pages)',
    sheetWidthMm: A4_SHORT,
    sheetHeightMm: A4_LONG,
    columns: 4,
    rows: 4,
    pageWidthMm: A4_SHORT / 4,
    pageHeightMm: A4_LONG / 4,
    pageCount: 16,
    slots: slotsFrom([
      [-9, -8, -7, -6],
      [10, 11, 4, 5],
      [-13, -12, -3, -2],
      [14, 15, 16, 1],
    ]),
    cuts: [
      { x1: 1, y1: 1, x2: 3, y2: 1 },
      { x1: 1, y1: 3, x2: 3, y2: 3 },
      { x1: 2, y1: 1, x2: 2, y2: 3 },
      { x1: 0, y1: 2, x2: 1, y2: 2 },
      { x1: 3, y1: 2, x2: 4, y2: 2 },
    ],
    cropMarks: false,
    bleedMm: 0,
  },
  'tcg-mini': {
    id: 'tcg-mini',
    name: 'TCG card zine (8 pages)',
    sheetWidthMm: A4_LONG,
    sheetHeightMm: A4_SHORT,
    columns: 4,
    rows: 2,
    pageWidthMm: 63,
    pageHeightMm: 88,
    pageCount: 8,
    slots: EIGHT_PANEL_SLOTS,
    cuts: EIGHT_PANEL_CUTS,
    cropMarks: true,
    bleedMm: 3,
  },
}

export const MODE_IDS = Object.keys(MODES) as ModeId[]
