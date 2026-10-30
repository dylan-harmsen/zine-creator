// Properties of the selected page and text box, plus project settings.

import { useRef } from 'react'
import { FONTS } from '../fonts'
import { MODES } from '../imposition/modes'
import { LOW_DPI, MAX_ZOOM, effectiveDpi } from '../model/imageLayout'
import { placeImage } from '../model/pageLayout'
import { facingPair, imageOwner, isMerged } from '../model/spreads'
import { pageLabel, type Align } from '../model/types'
import { useEditor } from '../state/editorStore'
import { addImageToPage } from '../state/session'
import styles from './Editor.module.css'

const ALIGNS: { value: Align; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' },
]

export function Inspector() {
  const project = useEditor((s) => s.project)!
  const selectedPageId = useEditor((s) => s.selectedPageId)
  const selectedTextId = useEditor((s) => s.selectedTextId)
  const showGuides = useEditor((s) => s.showGuides)
  const fileInput = useRef<HTMLInputElement>(null)
  const actions = useEditor.getState()

  const index = Math.max(0, project.pages.findIndex((p) => p.id === selectedPageId))
  const page = project.pages[index]
  const mode = MODES[project.mode]
  const box = page.texts.find((t) => t.id === selectedTextId)
  // On a merged pair, the image belongs to the pair's first page.
  const owner = project.pages[imageOwner(project.pages, index)]
  const image = owner.image
  const placement = placeImage(project, index)
  const dpi = placement ? Math.round(effectiveDpi(placement.image, placement.layout)) : null
  const pair = facingPair(project.pages.length, index)
  const partner = pair && (pair[0] === index ? pair[1] : pair[0])
  const merged = isMerged(project.pages, index)

  return (
    <aside className={styles.inspector}>
      <section className={styles.section}>
        <h2>{pageLabel(index, project.pages.length)}</h2>
        <label className={styles.row}>
          Background
          <input type="color" value={page.background} onChange={(e) => actions.updatePage(page.id, { background: e.target.value })} />
        </label>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) addImageToPage(page.id, file).catch((err: Error) => alert(err.message))
          }}
        />
        {partner !== null && (
          <div className={styles.group}>
            {merged ? (
              <>
                <p className={styles.hint}>
                  Merged with {pageLabel(partner, project.pages.length).toLowerCase()}: one image runs across both pages.
                </p>
                <button className={styles.button} onClick={() => actions.setMerged(page.id, false)}>
                  Split pages
                </button>
              </>
            ) : (
              <button
                className={styles.button}
                onClick={() => actions.setMerged(page.id, true)}
                title="Run one image across both facing pages, for wide photos"
              >
                Merge with {pageLabel(partner, project.pages.length).toLowerCase()}
              </button>
            )}
          </div>
        )}

        {!image ? (
          <button className={styles.button} onClick={() => fileInput.current?.click()}>
            {merged ? 'Add image across both pages' : 'Add image'}
          </button>
        ) : (
          <div className={styles.group}>
            <div className={styles.segmented} role="radiogroup" aria-label="Image fit">
              <button aria-pressed={image.fit === 'cover'} onClick={() => actions.updateImage(owner.id, { fit: 'cover', panX: 0, panY: 0 })}>
                {merged ? 'Fill both pages' : 'Fill page'}
              </button>
              <button aria-pressed={image.fit === 'contain'} onClick={() => actions.updateImage(owner.id, { fit: 'contain', panX: 0, panY: 0 })}>
                Fit whole image
              </button>
            </div>
            <label className={styles.row}>
              Zoom
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={image.zoom}
                onChange={(e) => actions.updateImage(owner.id, { zoom: Number(e.target.value) })}
              />
            </label>
            <p className={dpi !== null && dpi < LOW_DPI ? styles.warning : styles.hint}>
              {dpi} DPI{dpi !== null && dpi < LOW_DPI ? ' – will look blurry in print' : ''}
            </p>
            <p className={styles.hint}>Drag the image on the page to reposition it.</p>
            <div className={styles.buttonRow}>
              <button className={styles.button} onClick={() => fileInput.current?.click()}>
                Replace
              </button>
              <button className={styles.button} onClick={() => actions.updateImage(owner.id, { zoom: 1, panX: 0, panY: 0 })}>
                Reset
              </button>
              <button className={styles.button} onClick={() => actions.updatePage(owner.id, { image: null })}>
                Remove
              </button>
            </div>
          </div>
        )}
        <button className={styles.button} onClick={() => actions.addText(page.id)}>
          Add text
        </button>
      </section>

      {box && (
        <section className={styles.section}>
          <h2>Text box</h2>
          <p className={styles.hint}>Double-click the text on the page to edit it.</p>
          <label className={styles.row}>
            Font
            <select value={box.font} onChange={(e) => actions.updateText(page.id, box.id, { font: e.target.value })}>
              {FONTS.map((f) => (
                <option key={f.family} value={f.family} style={{ fontFamily: `"${f.family}"` }}>
                  {f.family}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.row}>
            Size (pt)
            <input
              type="number"
              min={4}
              max={200}
              value={box.sizePt}
              onChange={(e) => {
                const size = Number(e.target.value)
                if (size >= 4 && size <= 200) actions.updateText(page.id, box.id, { sizePt: size })
              }}
            />
          </label>
          <label className={styles.row}>
            Colour
            <input type="color" value={box.color} onChange={(e) => actions.updateText(page.id, box.id, { color: e.target.value })} />
          </label>
          <div className={styles.segmented} role="radiogroup" aria-label="Alignment">
            {ALIGNS.map((a) => (
              <button key={a.value} aria-pressed={box.align === a.value} onClick={() => actions.updateText(page.id, box.id, { align: a.value })}>
                {a.label}
              </button>
            ))}
          </div>
          <label className={styles.row}>
            <span>
              <input
                type="checkbox"
                checked={box.background !== null}
                onChange={(e) => actions.updateText(page.id, box.id, { background: e.target.checked ? '#ffffff' : null })}
              />{' '}
              Background
            </span>
            {box.background !== null && (
              <input
                type="color"
                value={box.background}
                onChange={(e) => actions.updateText(page.id, box.id, { background: e.target.value })}
              />
            )}
          </label>
          <button className={`${styles.button} ${styles.danger}`} onClick={() => actions.removeText(page.id, box.id)}>
            Delete text box
          </button>
        </section>
      )}

      <section className={styles.section}>
        <h2>Project</h2>
        <p className={styles.hint}>
          {mode.name}, {project.orientation} pages
          {project.orientation === 'landscape' && ' – the booklet opens upward, like a calendar'}
        </p>
        {mode.bleedMm > 0 && (
          <label className={styles.check}>
            <input type="checkbox" checked={project.bleed} onChange={(e) => actions.setBleed(e.target.checked)} />
            {mode.bleedMm} mm bleed on outer edges
          </label>
        )}
        <label className={styles.check}>
          <input type="checkbox" checked={showGuides} onChange={(e) => actions.setShowGuides(e.target.checked)} />
          Show guides
        </label>
        {showGuides && (
          <ul className={styles.legend}>
            <li>
              <span className={styles.swatchSafe} /> Keep important things inside (folds and cuts drift)
            </li>
            {mode.bleedMm === 0 && (
              <li>
                <span className={styles.swatchPrinter} /> Most printers can't print here
              </li>
            )}
            {mode.bleedMm > 0 && project.bleed && (
              <li>
                <span className={styles.swatchBleed} /> Bleed, trimmed off
              </li>
            )}
          </ul>
        )}
      </section>
    </aside>
  )
}
