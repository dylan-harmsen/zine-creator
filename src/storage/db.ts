// IndexedDB persistence. Projects and image assets live in separate stores so
// project saves stay small; assets are keyed by id and indexed by project.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { normalizeProject, type Project, type StoredProject } from '../model/types'

export interface AssetRecord {
  id: string
  projectId: string
  blob: Blob
  width: number
  height: number
}

export interface ProjectRecord {
  id: string
  project: Project
  thumbnail: Blob | null
}

/** As read back: the project may predate fields added since. */
type StoredRecord = Omit<ProjectRecord, 'project'> & { project: StoredProject }

interface ZineDB extends DBSchema {
  projects: { key: string; value: StoredRecord }
  assets: { key: string; value: AssetRecord; indexes: { byProject: string } }
}

let dbPromise: Promise<IDBPDatabase<ZineDB>> | undefined

function db() {
  dbPromise ??= openDB<ZineDB>('zine-creator', 1, {
    upgrade(d) {
      d.createObjectStore('projects', { keyPath: 'id' })
      d.createObjectStore('assets', { keyPath: 'id' }).createIndex('byProject', 'projectId')
    },
  })
  return dbPromise
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const all = await (await db()).getAll('projects')
  return all
    .map((r) => ({ ...r, project: normalizeProject(r.project) }))
    .sort((a, b) => b.project.updatedAt - a.project.updatedAt)
}

export async function getProject(id: string): Promise<Project | undefined> {
  const record = await (await db()).get('projects', id)
  return record && normalizeProject(record.project)
}

export async function putProject(project: Project, thumbnail: Blob | null) {
  await (await db()).put('projects', { id: project.id, project, thumbnail })
}

export async function deleteProject(id: string) {
  const d = await db()
  const tx = d.transaction(['projects', 'assets'], 'readwrite')
  await tx.objectStore('projects').delete(id)
  const keys = await tx.objectStore('assets').index('byProject').getAllKeys(id)
  await Promise.all(keys.map((k) => tx.objectStore('assets').delete(k)))
  await tx.done
}

export async function putAsset(asset: AssetRecord) {
  await (await db()).put('assets', asset)
}

export async function getProjectAssets(projectId: string): Promise<AssetRecord[]> {
  return (await db()).getAllFromIndex('assets', 'byProject', projectId)
}

/** Removes assets no page refers to. Safe once undo history has been reset. */
export async function deleteUnusedAssets(project: Project) {
  const used = new Set(project.pages.flatMap((p) => (p.image ? [p.image.assetId] : [])))
  const d = await db()
  const keys = await d.getAllKeysFromIndex('assets', 'byProject', project.id)
  await Promise.all(keys.filter((k) => !used.has(k)).map((k) => d.delete('assets', k)))
}
