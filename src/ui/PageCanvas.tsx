import { useEffect, useRef } from 'react'
import type { Edges } from '../imposition/edges'
import type { ZineMode } from '../imposition/modes'
import type { Page } from '../model/types'
import { renderPage } from '../render/renderPage'
import { useAssets } from '../state/assets'

interface Props {
  page: Page
  mode: ZineMode
  bleed: Edges
  pxPerMm: number
  hiddenTextId?: string
  className?: string
}

/** A page drawn by renderPage, sized to its bleed box in CSS pixels. */
export function PageCanvas({ page, mode, bleed, pxPerMm, hiddenTextId, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const images = useAssets((s) => s.images)
  const width = (mode.pageWidthMm + bleed.left + bleed.right) * pxPerMm
  const height = (mode.pageHeightMm + bleed.top + bleed.bottom) * pxPerMm

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.translate(bleed.left * pxPerMm, bleed.top * pxPerMm)
    renderPage(ctx, page, {
      pxPerMm,
      pageWidth: mode.pageWidthMm,
      pageHeight: mode.pageHeightMm,
      bleed,
      images,
      hiddenTextId,
    })
    // `bleed` is compared by value so a fresh object with the same edges doesn't redraw.
  }, [page, mode, pxPerMm, images, hiddenTextId, width, height, bleed.top, bleed.right, bleed.bottom, bleed.left])

  return <canvas ref={ref} className={className} style={{ width, height, display: 'block' }} />
}
