import { useEffect, useRef } from 'react'
import type { ImagePlacement, PageFrame } from '../model/pageLayout'
import type { Page } from '../model/types'
import { renderPage } from '../render/renderPage'
import { useAssets } from '../state/assets'

interface Props {
  page: Page
  frame: PageFrame
  image: ImagePlacement | null
  pxPerMm: number
  hiddenTextId?: string
  className?: string
}

/** A page drawn by renderPage, sized to its bleed box in CSS pixels. */
export function PageCanvas({ page, frame, image, pxPerMm, hiddenTextId, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const images = useAssets((s) => s.images)
  const { bleed } = frame
  const width = (frame.width + bleed.left + bleed.right) * pxPerMm
  const height = (frame.height + bleed.top + bleed.bottom) * pxPerMm
  const layout = image?.layout

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.translate(bleed.left * pxPerMm, bleed.top * pxPerMm)
    renderPage(ctx, page, { pxPerMm, frame, image, images, hiddenTextId })
    // `frame` and `image` are fresh objects on every render, so they are
    // compared by value: a page only redraws when what it shows changes.
  }, [
    page,
    pxPerMm,
    images,
    hiddenTextId,
    width,
    height,
    bleed.top,
    bleed.right,
    bleed.bottom,
    bleed.left,
    image?.image.assetId,
    layout?.x,
    layout?.y,
    layout?.width,
    layout?.height,
  ])

  return <canvas ref={ref} className={className} style={{ width, height, display: 'block' }} />
}
