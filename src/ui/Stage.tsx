// The open-book view: the spread holding the selected page, scaled to fit.

import { useEffect, useRef, useState } from 'react'
import { bleedEdges } from '../imposition/edges'
import { MODES } from '../imposition/modes'
import { spreads } from '../model/spreads'
import { useEditor } from '../state/editorStore'
import styles from './Editor.module.css'
import { PageView } from './PageView'

/** Room for the caption under each page, in px. */
const CAPTION_PX = 28
const PADDING_PX = 32

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

export function Stage() {
  const project = useEditor((s) => s.project)!
  const selectedPageId = useEditor((s) => s.selectedPageId)
  const [ref, size] = useSize<HTMLDivElement>()
  const mode = MODES[project.mode]

  const selectedIndex = Math.max(0, project.pages.findIndex((p) => p.id === selectedPageId))
  const all = spreads(project.pages.length)
  const spreadIndex = all.findIndex((sp) => sp.includes(selectedIndex))
  const spread = all[spreadIndex]

  // Scale so that a two-page spread fits; single pages use the same scale so
  // the zoom level doesn't jump when moving between covers and spreads.
  const widest = Math.max(
    ...all.map((sp) =>
      sp.reduce((sum, i) => {
        const b = bleedEdges(project.mode, project.bleed, i + 1)
        return sum + mode.pageWidthMm + b.left + b.right
      }, 0),
    ),
  )
  const tallest = mode.pageHeightMm + mode.bleedMm * 2
  const pxPerMm = Math.max(
    0.5,
    Math.min((size.width - PADDING_PX * 2) / widest, (size.height - PADDING_PX * 2 - CAPTION_PX) / tallest),
  )

  const go = (delta: number) => {
    const target = all[spreadIndex + delta]
    if (target) useEditor.getState().selectPage(project.pages[target[0]].id)
  }

  return (
    <div className={styles.stage} ref={ref}>
      <button className={styles.navButton} onClick={() => go(-1)} disabled={spreadIndex === 0} aria-label="Previous spread">
        ‹
      </button>
      <div className={styles.spread}>
        {size.width > 0 &&
          spread.map((i) => (
            <PageView
              key={project.pages[i].id}
              page={project.pages[i]}
              index={i}
              mode={mode}
              bleedOn={project.bleed}
              pxPerMm={pxPerMm}
            />
          ))}
      </div>
      <button
        className={`${styles.navButton} ${styles.navNext}`}
        onClick={() => go(1)}
        disabled={spreadIndex === all.length - 1}
        aria-label="Next spread"
      >
        ›
      </button>
    </div>
  )
}
