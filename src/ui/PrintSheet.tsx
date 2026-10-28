// Read-only preview of the imposed sheet, drawn by the same composer as the PDF.

import { useEffect, useRef, useState } from 'react'
import { MODES } from '../imposition/modes'
import { composeSheet } from '../render/composeSheet'
import { useAssets } from '../state/assets'
import { useEditor } from '../state/editorStore'
import styles from './Editor.module.css'

const PADDING_PX = 32

export function PrintSheet() {
  const project = useEditor((s) => s.project)!
  const images = useAssets((s) => s.images)
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const mode = MODES[project.mode]

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const observer = new ResizeObserver(([e]) => setBox({ width: e.contentRect.width, height: e.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const pxPerMm = Math.max(
    0.5,
    Math.min((box.width - PADDING_PX * 2) / mode.sheetWidthMm, (box.height - PADDING_PX * 2) / mode.sheetHeightMm),
  )

  useEffect(() => {
    const c = canvas.current
    if (!c || box.width === 0) return
    const dpr = window.devicePixelRatio || 1
    c.width = Math.round(mode.sheetWidthMm * pxPerMm * dpr)
    c.height = Math.round(mode.sheetHeightMm * pxPerMm * dpr)
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    composeSheet(ctx, project, pxPerMm, images, { foldLines: true, cutLines: true, note: true })
  }, [project, images, pxPerMm, mode, box.width])

  return (
    <div className={styles.stage} ref={wrap}>
      <canvas
        ref={canvas}
        className={styles.sheet}
        style={{ width: mode.sheetWidthMm * pxPerMm, height: mode.sheetHeightMm * pxPerMm }}
        aria-label="Imposed print sheet"
      />
    </div>
  )
}
