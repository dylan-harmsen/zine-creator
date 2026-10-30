// Page orientation. A landscape zine uses the same sheet, page map, folds and
// cuts as a portrait one, with every page turned a quarter turn anticlockwise
// in its slot. The finished booklet is the portrait booklet turned a quarter
// turn clockwise: the spine runs along the top of the front cover, pages flip
// upward like a calendar, and facing pages sit one above the other.

import type { Rotation, ZineMode } from './modes'

export type Orientation = 'portrait' | 'landscape'

export const ORIENTATIONS: Orientation[] = ['portrait', 'landscape']

/** Trim size of a page in its own upright frame, in mm. */
export function pageSize(mode: ZineMode, orientation: Orientation): { width: number; height: number } {
  return orientation === 'portrait'
    ? { width: mode.pageWidthMm, height: mode.pageHeightMm }
    : { width: mode.pageHeightMm, height: mode.pageWidthMm }
}

/** Clockwise turn, in degrees, of a page's content in its slot on the printed sheet. */
export function contentRotation(slotRotation: Rotation, orientation: Orientation): number {
  return orientation === 'portrait' ? slotRotation : (slotRotation + 270) % 360
}

/** Re-expresses per-edge values from the portrait page frame in the given orientation. */
export function orientEdges<T>(e: { top: T; right: T; bottom: T; left: T }, orientation: Orientation) {
  if (orientation === 'portrait') return e
  // Turning the booklet clockwise brings the portrait left edge to the top.
  return { top: e.left, right: e.top, bottom: e.right, left: e.bottom }
}
