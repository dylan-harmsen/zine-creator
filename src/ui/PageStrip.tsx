// Thumbnails in reading order, grouped by spread. Drag a thumbnail to
// reorder pages, or drop an image file on it.

import { useState } from 'react'
import { bleedEdges } from '../imposition/edges'
import { MODES } from '../imposition/modes'
import { LOW_DPI, effectiveDpi, layoutImage } from '../model/imageLayout'
import { spreads } from '../model/spreads'
import { useEditor } from '../state/editorStore'
import { addImageToPage } from '../state/session'
import styles from './Editor.module.css'
import { PageCanvas } from './PageCanvas'

const THUMB_WIDTH_PX = 64
const NO_BLEED = { top: 0, right: 0, bottom: 0, left: 0 }

export function PageStrip() {
  const project = useEditor((s) => s.project)!
  const selectedPageId = useEditor((s) => s.selectedPageId)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const mode = MODES[project.mode]
  const pxPerMm = THUMB_WIDTH_PX / mode.pageWidthMm

  return (
    <nav className={styles.strip} aria-label="Pages">
      {spreads(project.pages.length).map((spread) => (
        <div key={spread[0]} className={styles.stripSpread}>
          {spread.map((i) => {
            const page = project.pages[i]
            const image = page.image
            const lowDpi =
              image &&
              effectiveDpi(image, layoutImage(image, mode.pageWidthMm, mode.pageHeightMm, bleedEdges(project.mode, project.bleed, i + 1))) <
                LOW_DPI
            return (
              <button
                key={page.id}
                className={[
                  styles.thumb,
                  page.id === selectedPageId ? styles.thumbSelected : '',
                  dropTarget === i && dragFrom !== i ? styles.thumbDrop : '',
                ].join(' ')}
                draggable
                onClick={() => useEditor.getState().selectPage(page.id)}
                onDragStart={(e) => {
                  setDragFrom(i)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setDragFrom(null)
                  setDropTarget(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDropTarget(i)
                }}
                onDragLeave={() => setDropTarget((t) => (t === i ? null : t))}
                onDrop={(e) => {
                  e.preventDefault()
                  setDropTarget(null)
                  const file = e.dataTransfer.files[0]
                  if (file) {
                    addImageToPage(page.id, file).catch((err: Error) => alert(err.message))
                  } else if (dragFrom !== null && dragFrom !== i) {
                    useEditor.getState().reorderPage(dragFrom, i)
                  }
                  setDragFrom(null)
                }}
                title={`Page ${i + 1} – drag to reorder`}
              >
                <PageCanvas page={page} mode={mode} bleed={NO_BLEED} pxPerMm={pxPerMm} />
                <span className={styles.thumbLabel}>
                  {i === 0 ? 'Front' : i === project.pages.length - 1 ? 'Back' : i + 1}
                  {lowDpi && <span className={styles.thumbWarn} title="Low resolution image"> !</span>}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
