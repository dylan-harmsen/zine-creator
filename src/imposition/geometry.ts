// Converts a mode's grid data into sheet positions in millimetres.
// Sheet coordinates have the origin at the top-left of the sheet, y down.

import type { GridSegment, Rotation, ZineMode } from './modes'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PlacedPage {
  page: number
  rotation: Rotation
  rect: Rect
}

/** The trimmed grid, centred on the sheet. */
export function gridRect(mode: ZineMode): Rect {
  const width = mode.columns * mode.pageWidthMm
  const height = mode.rows * mode.pageHeightMm
  return {
    x: (mode.sheetWidthMm - width) / 2,
    y: (mode.sheetHeightMm - height) / 2,
    width,
    height,
  }
}

export function placedPages(mode: ZineMode): PlacedPage[] {
  const grid = gridRect(mode)
  return mode.slots.map((slot, i) => ({
    page: slot.page,
    rotation: slot.rotation,
    rect: {
      x: grid.x + (i % mode.columns) * mode.pageWidthMm,
      y: grid.y + Math.floor(i / mode.columns) * mode.pageHeightMm,
      width: mode.pageWidthMm,
      height: mode.pageHeightMm,
    },
  }))
}

export function toSheet(mode: ZineMode, s: GridSegment): Segment {
  const grid = gridRect(mode)
  return {
    x1: grid.x + s.x1 * mode.pageWidthMm,
    y1: grid.y + s.y1 * mode.pageHeightMm,
    x2: grid.x + s.x2 * mode.pageWidthMm,
    y2: grid.y + s.y2 * mode.pageHeightMm,
  }
}

function covers(cut: GridSegment, unit: GridSegment): boolean {
  const minX = Math.min(cut.x1, cut.x2)
  const maxX = Math.max(cut.x1, cut.x2)
  const minY = Math.min(cut.y1, cut.y2)
  const maxY = Math.max(cut.y1, cut.y2)
  return (
    unit.x1 >= minX && unit.x2 <= maxX && unit.y1 >= minY && unit.y2 <= maxY &&
    // Same orientation: a horizontal cut never covers a vertical unit and vice versa.
    (cut.y1 === cut.y2) === (unit.y1 === unit.y2)
  )
}

/** Every interior grid line that is not a cut, merged into maximal runs. */
export function foldSegments(mode: ZineMode): GridSegment[] {
  const folds: GridSegment[] = []
  const isCut = (unit: GridSegment) => mode.cuts.some((c) => covers(c, unit))

  for (let y = 1; y < mode.rows; y++) {
    let start: number | null = null
    for (let x = 0; x <= mode.columns; x++) {
      const fold = x < mode.columns && !isCut({ x1: x, y1: y, x2: x + 1, y2: y })
      if (fold && start === null) start = x
      if (!fold && start !== null) {
        folds.push({ x1: start, y1: y, x2: x, y2: y })
        start = null
      }
    }
  }

  for (let x = 1; x < mode.columns; x++) {
    let start: number | null = null
    for (let y = 0; y <= mode.rows; y++) {
      const fold = y < mode.rows && !isCut({ x1: x, y1: y, x2: x, y2: y + 1 })
      if (fold && start === null) start = y
      if (!fold && start !== null) {
        folds.push({ x1: x, y1: start, x2: x, y2: y })
        start = null
      }
    }
  }

  return folds
}

/**
 * Crop marks at the four corners of the trimmed grid. Each mark extends
 * outward from just beyond the bleed so it never prints over artwork.
 */
export function cropMarkSegments(mode: ZineMode, lengthMm = 5, gapMm = 1): Segment[] {
  const g = gridRect(mode)
  const offset = mode.bleedMm + gapMm
  const marks: Segment[] = []
  for (const x of [g.x, g.x + g.width]) {
    for (const y of [g.y, g.y + g.height]) {
      const dx = x === g.x ? -1 : 1
      const dy = y === g.y ? -1 : 1
      // Horizontal mark in line with the trim edge, vertical mark likewise.
      marks.push({ x1: x + dx * offset, y1: y, x2: x + dx * (offset + lengthMm), y2: y })
      marks.push({ x1: x, y1: y + dy * offset, x2: x, y2: y + dy * (offset + lengthMm) })
    }
  }
  return marks
}
