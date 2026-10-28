// The `.zine` file: a zip holding project.json and one file per image asset.

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { newId, type Project } from '../model/types'

export const ZINE_FORMAT = 'zine-creator'
export const ZINE_VERSION = 1

export interface ZineAsset {
  id: string
  type: string
  width: number
  height: number
  bytes: Uint8Array
}

interface Manifest {
  format: typeof ZINE_FORMAT
  version: number
  project: Project
  assets: Omit<ZineAsset, 'bytes'>[]
}

export function packZine(project: Project, assets: ZineAsset[]): Uint8Array {
  const manifest: Manifest = {
    format: ZINE_FORMAT,
    version: ZINE_VERSION,
    project,
    assets: assets.map(({ id, type, width, height }) => ({ id, type, width, height })),
  }
  const files: Record<string, Uint8Array> = { 'project.json': strToU8(JSON.stringify(manifest)) }
  for (const a of assets) files[`assets/${a.id}`] = a.bytes
  // Images are already compressed; zipping them again only costs time.
  return zipSync(files, { level: 0 })
}

export function unpackZine(data: Uint8Array): { project: Project; assets: ZineAsset[] } {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(data)
  } catch {
    throw new Error('This is not a .zine file.')
  }
  const raw = files['project.json']
  if (!raw) throw new Error('This .zine file has no project.json.')
  const manifest = JSON.parse(strFromU8(raw)) as Manifest
  if (manifest.format !== ZINE_FORMAT) throw new Error('This is not a .zine file.')
  if (manifest.version > ZINE_VERSION) throw new Error('This .zine file was made by a newer version of Zine Creator.')
  const assets = manifest.assets.map((a) => {
    const bytes = files[`assets/${a.id}`]
    if (!bytes) throw new Error(`This .zine file is missing an image (${a.id}).`)
    return { ...a, bytes }
  })
  return { project: manifest.project, assets }
}

/**
 * Gives an imported project fresh ids so importing the same file twice never
 * makes two projects share (and later delete) each other's assets.
 */
export function withFreshIds(project: Project, assets: ZineAsset[]): { project: Project; assets: ZineAsset[] } {
  const assetIds = new Map(assets.map((a) => [a.id, newId()]))
  const now = Date.now()
  return {
    project: {
      ...project,
      id: newId(),
      createdAt: now,
      updatedAt: now,
      pages: project.pages.map((p) => ({
        ...p,
        image: p.image ? { ...p.image, assetId: assetIds.get(p.image.assetId) ?? p.image.assetId } : null,
      })),
    },
    assets: assets.map((a) => ({ ...a, id: assetIds.get(a.id)! })),
  }
}

export function zineFilename(project: Project): string {
  const safe = project.name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'zine'
  return `${safe}.zine`
}
