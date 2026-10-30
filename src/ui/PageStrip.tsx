// Thumbnails in reading order, grouped by spread. Drag a thumbnail to
// reorder pages, or drop an image file on it. A merged pair moves as one.

import { useState } from 'react'
import { LOW_DPI, effectiveDpi } from '../model/imageLayout'
import { pageFrame, placeImage } from '../model/pageLayout'
import { facingPair, isMerged, movePages, spreads } from '../model/spreads'
import { useEditor } from '../state/editorStore'
import { addImageToPage } from '../state/session'
import styles from './Editor.module.css'
import { PageCanvas } from './PageCanvas'

const THUMB_WIDTH_PX = 64
/** Landscape thumbnails stack in pairs, so they can be wider. */
const LANDSCAPE_THUMB_WIDTH_PX = 84

export function PageStrip() {
  const project = useEditor((s) => s.project)!
  const selectedPageId = useEditor((s) => s.selectedPageId)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const stacked = project.orientation === 'landscape'
  const pages = project.pages

  // A merged pair is dragged as a whole and lands on a whole facing pair.
  const draggingPair = dragFrom !== null && isMerged(pages, dragFrom)
  const dropPages = dropTarget === null ? [] : draggingPair ? (facingPair(pages.length, dropTarget) ?? []) : [dropTarget]
  const draggedPages = dragFrom === null ? [] : draggingPair ? (facingPair(pages.length, dragFrom) ?? []) : [dragFrom]

  return (
    <nav className={styles.strip} aria-label="Pages">
      {spreads(pages.length).map((spread) => (
        <div
          key={spread[0]}
          className={[
            styles.stripSpread,
            stacked ? styles.stripSpreadStacked : '',
            isMerged(pages, spread[0]) ? styles.stripSpreadMerged : '',
          ].join(' ')}
          title={isMerged(pages, spread[0]) ? 'Merged: these pages share one image' : undefined}
        >
          {spread.map((i) => {
            const page = pages[i]
            // Thumbnails leave out the bleed; the resolution check uses the printed size.
            const frame = pageFrame(project, i, false)
            const placement = placeImage(project, i, false)
            const printed = placeImage(project, i)
            const lowDpi = printed && effectiveDpi(printed.image, printed.layout) < LOW_DPI
            const pxPerMm = (stacked ? LANDSCAPE_THUMB_WIDTH_PX : THUMB_WIDTH_PX) / frame.width
            return (
              <button
                key={page.id}
                className={[
                  styles.thumb,
                  page.id === selectedPageId ? styles.thumbSelected : '',
                  dropPages.includes(i) && !draggedPages.includes(i) ? styles.thumbDrop : '',
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
                  // Image files can always be dropped; pages only where the move is allowed.
                  if (dragFrom !== null && dragFrom !== i && !movePages(pages, dragFrom, i)) return
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
                <PageCanvas page={page} frame={frame} image={placement} pxPerMm={pxPerMm} />
                <span className={styles.thumbLabel}>
                  {i === 0 ? 'Front' : i === pages.length - 1 ? 'Back' : i + 1}
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
