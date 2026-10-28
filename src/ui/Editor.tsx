import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { useAssets } from '../state/assets'
import { redo, undo, useEditor } from '../state/editorStore'
import { packZine, zineFilename, type ZineAsset } from '../storage/zineFile'
import { downloadBytes } from './download'
import styles from './Editor.module.css'
import { ExportDialog } from './ExportDialog'
import { Inspector } from './Inspector'
import { PageStrip } from './PageStrip'
import { PrintSheet } from './PrintSheet'
import { Stage } from './Stage'

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

async function saveZineFile() {
  const project = useEditor.getState().project
  if (!project) return
  const records = useAssets.getState().records
  const assets: ZineAsset[] = []
  for (const page of project.pages) {
    const r = page.image && records[page.image.assetId]
    if (!r || assets.some((a) => a.id === r.id)) continue
    assets.push({ id: r.id, type: r.blob.type, width: r.width, height: r.height, bytes: new Uint8Array(await r.blob.arrayBuffer()) })
  }
  downloadBytes(packZine(project, assets), zineFilename(project), 'application/zip')
}

export function Editor({ onBack }: { onBack: () => void }) {
  const project = useEditor((s) => s.project)
  const view = useEditor((s) => s.view)
  const canUndo = useStore(useEditor.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useEditor.temporal, (s) => s.futureStates.length > 0)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && key === 'y') {
        e.preventDefault()
        redo()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedPageId, selectedTextId, removeText } = useEditor.getState()
        if (selectedPageId && selectedTextId) {
          e.preventDefault()
          removeText(selectedPageId, selectedTextId)
        }
      } else if (e.key === 'Escape') {
        useEditor.getState().selectText(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!project) return null
  return (
    <div className={styles.editor}>
      <header className={styles.topbar}>
        <button className={styles.button} onClick={onBack}>
          ← Projects
        </button>
        <input
          className={styles.nameInput}
          value={project.name}
          onChange={(e) => useEditor.getState().rename(e.target.value)}
          aria-label="Project name"
        />
        <div className={styles.buttonRow}>
          <button className={styles.button} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            Undo
          </button>
          <button className={styles.button} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            Redo
          </button>
        </div>
        <div className={styles.segmented} role="radiogroup" aria-label="View">
          <button aria-pressed={view === 'pages'} onClick={() => useEditor.getState().setView('pages')}>
            Pages
          </button>
          <button aria-pressed={view === 'sheet'} onClick={() => useEditor.getState().setView('sheet')}>
            Print sheet
          </button>
        </div>
        <div className={styles.spacer} />
        <button className={styles.button} onClick={() => void saveZineFile()} title="Download a backup you can load later">
          Save .zine
        </button>
        <button className={`${styles.button} ${styles.primary}`} onClick={() => setExporting(true)}>
          Export PDF
        </button>
      </header>
      <PageStrip />
      {view === 'pages' ? <Stage /> : <PrintSheet />}
      <Inspector />
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </div>
  )
}
