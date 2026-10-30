// Which edges of a page lie on the outside of the imposed grid, expressed in
// the page's own upright frame (a page rotated 180° on the sheet has its
// top edge at the sheet's bottom side).

import { MODES, type ModeId } from './modes'
import { orientEdges, type Orientation } from './orientation'

export interface Edges {
  top: number
  right: number
  bottom: number
  left: number
}

export interface EdgeFlags {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export const NO_EDGES: Edges = { top: 0, right: 0, bottom: 0, left: 0 }

/** `pageNumber` is 1-based, as in the imposition tables. */
export function outerEdges(modeId: ModeId, pageNumber: number, orientation: Orientation): EdgeFlags {
  const mode = MODES[modeId]
  const index = mode.slots.findIndex((s) => s.page === pageNumber)
  if (index < 0) throw new Error(`Page ${pageNumber} is not in ${modeId}`)
  const col = index % mode.columns
  const row = Math.floor(index / mode.columns)
  const sheet = {
    top: row === 0,
    bottom: row === mode.rows - 1,
    left: col === 0,
    right: col === mode.columns - 1,
  }
  const portrait =
    mode.slots[index].rotation === 0
      ? sheet
      : { top: sheet.bottom, bottom: sheet.top, left: sheet.right, right: sheet.left }
  return orientEdges(portrait, orientation)
}

/** Bleed in mm on each edge of a page; zero when bleed is off or unsupported. */
export function bleedEdges(modeId: ModeId, bleedOn: boolean, pageNumber: number, orientation: Orientation): Edges {
  const mm = MODES[modeId].bleedMm
  if (!bleedOn || mm === 0) return NO_EDGES
  const outer = outerEdges(modeId, pageNumber, orientation)
  return {
    top: outer.top ? mm : 0,
    right: outer.right ? mm : 0,
    bottom: outer.bottom ? mm : 0,
    left: outer.left ? mm : 0,
  }
}

/** True when the grid runs to the sheet edge, so outer edges hit the printer's unprintable margin. */
export function gridTouchesSheetEdge(modeId: ModeId): boolean {
  const m = MODES[modeId]
  return m.columns * m.pageWidthMm >= m.sheetWidthMm && m.rows * m.pageHeightMm >= m.sheetHeightMm
}
