// One page in the spread: the rendered canvas, guides, and the interaction
// layer (image panning, text box selection, moving, resizing and editing).

import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { bleedEdges } from '../imposition/edges'
import type { ZineMode } from '../imposition/modes'
import { LOW_DPI, effectiveDpi, layoutImage } from '../model/imageLayout'
import { pageLabel, type Page, type TextBox } from '../model/types'
import { LINE_HEIGHT, MM_PER_PT, TEXT_PADDING, layoutTextBox } from '../render/textLayout'
import { useEditor } from '../state/editorStore'
import { addImageToPage } from '../state/session'
import styles from './Editor.module.css'
import { Guides } from './Guides'
import { PageCanvas } from './PageCanvas'

const MIN_TEXT_WIDTH_MM = 5

interface Props {
  page: Page
  index: number
  mode: ZineMode
  bleedOn: boolean
  pxPerMm: number
}

/** Pointer travel, in px, before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 3

/** Tracks a pointer drag, reporting the movement in mm since it started. */
function drag(e: ReactPointerEvent, pxPerMm: number, onMove: (dxMm: number, dyMm: number) => void) {
  const startX = e.clientX
  const startY = e.clientY
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  let dragging = false
  const move = (ev: PointerEvent) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    dragging ||= Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
    if (dragging) onMove(dx / pxPerMm, dy / pxPerMm)
  }
  const up = () => {
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', up)
    target.removeEventListener('pointercancel', up)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', up)
  target.addEventListener('pointercancel', up)
}

export function PageView({ page, index, mode, bleedOn, pxPerMm }: Props) {
  const s = pxPerMm
  const pageNumber = index + 1
  const bleed = bleedEdges(mode.id, bleedOn, pageNumber)
  const selected = useEditor((st) => st.selectedPageId === page.id)
  const selectedTextId = useEditor((st) => st.selectedTextId)
  const editingTextId = useEditor((st) => st.editingTextId)
  const showGuides = useEditor((st) => st.showGuides)
  const { selectPage, selectText, setEditingText, updateImage, updateText } = useEditor.getState()

  const imageLayout = page.image ? layoutImage(page.image, mode.pageWidthMm, mode.pageHeightMm, bleed) : null
  const lowDpi = page.image && imageLayout ? effectiveDpi(page.image, imageLayout) < LOW_DPI : false

  function onBackgroundDown(e: ReactPointerEvent) {
    if (e.button !== 0) return
    selectPage(page.id)
    selectText(null)
    if (!page.image || !imageLayout) return
    // Start from the clamped pan so dragging responds immediately after a zoom change.
    const { panX, panY } = imageLayout
    drag(e, s, (dx, dy) => updateImage(page.id, { panX: panX + dx, panY: panY + dy }))
  }

  function onTextDown(e: ReactPointerEvent, box: TextBox) {
    if (e.button !== 0 || editingTextId === box.id) return
    e.stopPropagation()
    selectPage(page.id)
    selectText(box.id)
    const { x, y } = box
    drag(e, s, (dx, dy) => updateText(page.id, box.id, { x: x + dx, y: y + dy }))
  }

  function onResizeDown(e: ReactPointerEvent, box: TextBox) {
    if (e.button !== 0) return
    e.stopPropagation()
    const { width } = box
    drag(e, s, (dx) => updateText(page.id, box.id, { width: Math.max(MIN_TEXT_WIDTH_MM, width + dx) }))
  }

  return (
    <figure className={styles.pageFigure}>
      <div
        className={`${styles.page} ${selected ? styles.pageSelected : ''}`}
        style={{
          width: (mode.pageWidthMm + bleed.left + bleed.right) * s,
          height: (mode.pageHeightMm + bleed.top + bleed.bottom) * s,
        }}
      >
        <PageCanvas page={page} mode={mode} bleed={bleed} pxPerMm={s} hiddenTextId={editingTextId ?? undefined} />
        {showGuides && <Guides mode={mode} pageNumber={pageNumber} bleed={bleed} />}
        <div
          className={styles.trim}
          style={{ left: bleed.left * s, top: bleed.top * s, width: mode.pageWidthMm * s, height: mode.pageHeightMm * s }}
          onPointerDown={onBackgroundDown}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) addImageToPage(page.id, file).catch((err: Error) => alert(err.message))
          }}
        >
          {page.texts.map((box) => {
            const height = layoutTextBox(box).height
            const isSelected = selectedTextId === box.id
            if (editingTextId === box.id) {
              return <TextEditor key={box.id} pageId={page.id} box={box} pxPerMm={s} height={height} />
            }
            return (
              <div
                key={box.id}
                className={`${styles.textBox} ${isSelected ? styles.textBoxSelected : ''}`}
                style={{ left: box.x * s, top: box.y * s, width: box.width * s, height: height * s }}
                onPointerDown={(e) => onTextDown(e, box)}
                onDoubleClick={() => setEditingText(box.id)}
                title="Drag to move, double-click to edit"
              >
                {isSelected && (
                  <div className={styles.resizeHandle} onPointerDown={(e) => onResizeDown(e, box)} title="Drag to resize" />
                )}
              </div>
            )
          })}
        </div>
        {lowDpi && <span className={styles.dpiBadge} title="This image will look blurry when printed. Use a larger image or zoom out.">Low resolution</span>}
      </div>
      <figcaption className={styles.pageCaption}>{pageLabel(index, mode.pageCount)}</figcaption>
    </figure>
  )
}

/** In-place text editing. Styled to match renderPage so the text doesn't jump. */
function TextEditor({ pageId, box, pxPerMm, height }: { pageId: string; box: TextBox; pxPerMm: number; height: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const s = pxPerMm
  const { updateText, setEditingText } = useEditor.getState()

  useLayoutEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  return (
    <textarea
      ref={ref}
      className={styles.textEditor}
      value={box.text}
      spellCheck={false}
      onChange={(e) => updateText(pageId, box.id, { text: e.target.value })}
      onBlur={() => setEditingText(null)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') ref.current?.blur()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        left: box.x * s,
        top: box.y * s,
        width: box.width * s,
        height: height * s,
        padding: TEXT_PADDING * s,
        font: `${box.sizePt * MM_PER_PT * s}px "${box.font}"`,
        lineHeight: LINE_HEIGHT,
        color: box.color,
        textAlign: box.align,
        background: box.background ?? 'transparent',
      }}
    />
  )
}
