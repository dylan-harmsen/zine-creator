import { useState } from 'react'
import { buildZinePdf, pdfFilename } from '../export/exportPdf'
import { MODES } from '../imposition/modes'
import { useAssets } from '../state/assets'
import { useEditor } from '../state/editorStore'
import { downloadBytes } from './download'
import styles from './Editor.module.css'

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project)!
  const [foldLines, setFoldLines] = useState(true)
  const [cutLines, setCutLines] = useState(true)
  const [instructions, setInstructions] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mode = MODES[project.mode]

  async function exportPdf() {
    setBusy(true)
    setError(null)
    try {
      const bytes = await buildZinePdf(project, useAssets.getState().images, { foldLines, cutLines, instructions })
      downloadBytes(bytes, pdfFilename(project), 'application/pdf')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-labelledby="export-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="export-title">Export PDF</h2>
        <label className={styles.check}>
          <input type="checkbox" checked={foldLines} onChange={(e) => setFoldLines(e.target.checked)} />
          Fold lines
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={cutLines} onChange={(e) => setCutLines(e.target.checked)} />
          Cut lines
        </label>
        {mode.cropMarks && (
          <label className={styles.check}>
            <input type="checkbox" checked disabled />
            Crop marks (always on)
          </label>
        )}
        {mode.bleedMm > 0 && (
          <label className={styles.check}>
            <input type="checkbox" checked={project.bleed} onChange={(e) => useEditor.getState().setBleed(e.target.checked)} />
            {mode.bleedMm} mm bleed
          </label>
        )}
        <label className={styles.check}>
          <input type="checkbox" checked={instructions} onChange={(e) => setInstructions(e.target.checked)} />
          Add a folding instructions page
        </label>
        <p className={styles.hint}>Print single-sided at 100% / actual size.</p>
        {error && <p className={styles.warning}>Export failed: {error}</p>}
        <div className={styles.buttonRow}>
          <button className={styles.button} onClick={onClose}>
            Cancel
          </button>
          <button className={`${styles.button} ${styles.primary}`} onClick={exportPdf} disabled={busy}>
            {busy ? 'Building…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
