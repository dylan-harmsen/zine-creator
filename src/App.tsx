import { useState } from 'react'
import styles from './App.module.css'
import { buildTestSheet } from './export/testSheet'
import { MODES, MODE_IDS, type ModeId } from './imposition/modes'

export function App() {
  const [busy, setBusy] = useState<ModeId | null>(null)

  async function download(id: ModeId) {
    setBusy(id)
    try {
      const bytes = await buildTestSheet(MODES[id])
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${id}-test-sheet.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className={styles.main}>
      <h1>Zine Creator</h1>
      <p className={styles.lede}>
        The editor isn't built yet. For now, print a test sheet for each mode at 100% / actual size, then fold and
        cut it to check that the pages come out in order.
      </p>
      <ul className={styles.modes}>
        {MODE_IDS.map((id) => (
          <li key={id} className={styles.mode}>
            <span>{MODES[id].name}</span>
            <button onClick={() => download(id)} disabled={busy !== null}>
              {busy === id ? 'Building…' : 'Download test sheet'}
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
