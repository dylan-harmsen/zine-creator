import { useEffect, useRef, useState } from 'react'
import { buildTestSheet } from '../export/testSheet'
import { MODES, MODE_IDS, type ModeId } from '../imposition/modes'
import { newProject } from '../model/types'
import { createProject, importZineFile } from '../state/session'
import { deleteProject, listProjects, type ProjectRecord } from '../storage/db'
import { downloadBytes } from './download'
import styles from './Home.module.css'

function Thumbnail({ blob }: { blob: Blob | null }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return <div className={styles.thumb}>{url && <img src={url} alt="" />}</div>
}

export function Home({ onOpen }: { onOpen: (id: string) => void }) {
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<ModeId>('a4-mini')
  const importInput = useRef<HTMLInputElement>(null)

  const refresh = () => listProjects().then(setProjects)
  useEffect(() => void refresh(), [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const project = newProject(mode, name.trim() || 'Untitled zine')
    await createProject(project)
    onOpen(project.id)
  }

  async function remove(record: ProjectRecord) {
    if (!confirm(`Delete "${record.project.name}"? This can't be undone.`)) return
    await deleteProject(record.id)
    await refresh()
  }

  return (
    <main className={styles.home}>
      <p className={styles.phoneNotice}>Zine Creator works best on a bigger screen.</p>
      <h1>Zine Creator</h1>

      <form className={styles.card} onSubmit={create}>
        <h2>New zine</h2>
        <div className={styles.modes} role="radiogroup" aria-label="Mode">
          {MODE_IDS.map((id) => (
            <label key={id} className={`${styles.mode} ${mode === id ? styles.modeSelected : ''}`}>
              <input type="radio" name="mode" value={id} checked={mode === id} onChange={() => setMode(id)} />
              <strong>{MODES[id].name}</strong>
              <span>
                {MODES[id].pageWidthMm} × {MODES[id].pageHeightMm} mm pages
              </span>
            </label>
          ))}
        </div>
        <div className={styles.createRow}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" />
          <button type="submit" className={styles.primary}>
            Create
          </button>
        </div>
      </form>

      <section>
        <div className={styles.listHeader}>
          <h2>Your zines</h2>
          <input
            ref={importInput}
            type="file"
            accept=".zine"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                onOpen(await importZineFile(file))
              } catch (err) {
                alert(err instanceof Error ? err.message : String(err))
              }
            }}
          />
          <button onClick={() => importInput.current?.click()}>Open .zine file</button>
        </div>
        {projects?.length === 0 && <p className={styles.muted}>Nothing yet. Make your first zine above.</p>}
        <ul className={styles.projects}>
          {projects?.map((r) => (
            <li key={r.id} className={styles.project}>
              <button className={styles.projectOpen} onClick={() => onOpen(r.id)}>
                <Thumbnail blob={r.thumbnail} />
                <strong>{r.project.name}</strong>
                <span className={styles.muted}>{MODES[r.project.mode].name}</span>
                <span className={styles.muted}>Edited {new Date(r.project.updatedAt).toLocaleString()}</span>
              </button>
              <button className={styles.delete} onClick={() => remove(r)} aria-label={`Delete ${r.project.name}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.testSheets}>
        <h2>Test sheets</h2>
        <p className={styles.muted}>Numbered blank sheets for practising the folds.</p>
        <div className={styles.testButtons}>
          {MODE_IDS.map((id) => (
            <button
              key={id}
              onClick={async () => downloadBytes(await buildTestSheet(MODES[id]), `${id}-test-sheet.pdf`, 'application/pdf')}
            >
              {MODES[id].name}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
