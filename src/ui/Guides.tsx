// Editor-only guides. These are never drawn by renderPage, so they can't
// reach the PDF.

import { gridTouchesSheetEdge, outerEdges, type Edges } from '../imposition/edges'
import type { ZineMode } from '../imposition/modes'

/** Typical unprintable margin of a home printer. */
export const PRINTER_MARGIN_MM = 4
export const SAFE_ZONE_MM = 2

interface Props {
  mode: ZineMode
  pageNumber: number
  bleed: Edges
}

export function Guides({ mode, pageNumber, bleed }: Props) {
  const w = mode.pageWidthMm
  const h = mode.pageHeightMm
  const W = w + bleed.left + bleed.right
  const H = h + bleed.top + bleed.bottom
  const outer = outerEdges(mode.id, pageNumber)
  const pm = PRINTER_MARGIN_MM
  const printer = gridTouchesSheetEdge(mode.id)

  return (
    <svg
      viewBox={`${-bleed.left} ${-bleed.top} ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      aria-hidden
    >
      {/* Bleed: everything outside the trim box. */}
      <path
        d={`M${-bleed.left} ${-bleed.top}h${W}v${H}h${-W}z M0 0v${h}h${w}v${-h}z`}
        fill="rgba(0,0,0,0.35)"
        fillRule="evenodd"
      />
      {printer && (
        <g fill="rgba(220,40,40,0.14)">
          {outer.top && <rect x={0} y={0} width={w} height={pm} />}
          {outer.bottom && <rect x={0} y={h - pm} width={w} height={pm} />}
          {outer.left && <rect x={0} y={0} width={pm} height={h} />}
          {outer.right && <rect x={w - pm} y={0} width={pm} height={h} />}
        </g>
      )}
      <rect
        x={SAFE_ZONE_MM}
        y={SAFE_ZONE_MM}
        width={w - SAFE_ZONE_MM * 2}
        height={h - SAFE_ZONE_MM * 2}
        fill="none"
        stroke="rgba(0,110,255,0.7)"
        strokeWidth={1}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
