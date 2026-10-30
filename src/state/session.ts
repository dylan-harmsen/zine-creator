// Opening, autosaving and closing projects.

import { pageFrame, placeImage } from '../model/pageLayout'
import { imageOwner } from '../model/spreads'
import type { Project } from '../model/types'
import { renderPage } from '../render/renderPage'
import { deleteUnusedAssets, getProject, getProjectAssets, putAsset, putProject } from '../storage/db'
import { importImage } from '../storage/images'
import { unpackZine, withFreshIds } from '../storage/zineFile'
import { useAssets } from './assets'
import { resetHistory, useEditor } from './editorStore'

const SAVE_DELAY_MS = 500
const THUMB_WIDTH_PX = 240

let saveTimer: ReturnType<typeof setTimeout> | undefined
let pending: Project | null = null
let unsubscribe: (() => void) | undefined

export async function openProject(id: string) {
  const project = await getProject(id)
  if (!project) throw new Error('That project no longer exists.')
  // Undo history starts empty, so assets no page uses can never come back.
  await deleteUnusedAssets(project)
  await useAssets.getState().load(await getProjectAssets(project.id))
  useEditor.getState().open(project)
  resetHistory()

  unsubscribe?.()
  unsubscribe = useEditor.subscribe((state, prev) => {
    if (state.project && state.project !== prev.project) scheduleSave(state.project)
  })
}

export async function closeProject() {
  unsubscribe?.()
  unsubscribe = undefined
  await flushSave()
  useEditor.getState().close()
  resetHistory()
  useAssets.getState().clear()
}

export async function createProject(project: Project) {
  await putProject(project, null)
}

function scheduleSave(project: Project) {
  pending = project
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void flushSave(), SAVE_DELAY_MS)
}

export async function flushSave() {
  clearTimeout(saveTimer)
  const project = pending
  pending = null
  if (!project) return
  await putProject(project, await renderThumbnail(project))
}

// Saving is asynchronous, so a tab close can only make a best effort.
window.addEventListener('pagehide', () => void flushSave())

async function renderThumbnail(project: Project): Promise<Blob | null> {
  const frame = pageFrame(project, 0, false)
  const pxPerMm = THUMB_WIDTH_PX / frame.width
  const canvas = document.createElement('canvas')
  canvas.width = THUMB_WIDTH_PX
  canvas.height = Math.round(frame.height * pxPerMm)
  renderPage(canvas.getContext('2d')!, project.pages[0], {
    pxPerMm,
    frame,
    image: placeImage(project, 0, false),
    images: useAssets.getState().images,
  })
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
}

/**
 * Imports an image file onto a page, replacing any image already there. On a
 * merged pair the image goes to the pair's first page and spans both.
 */
export async function addImageToPage(pageId: string, file: Blob) {
  const project = useEditor.getState().project
  if (!project) return
  const imported = await importImage(file)
  const record = { id: crypto.randomUUID(), projectId: project.id, ...imported }
  await putAsset(record)
  await useAssets.getState().add(record)
  // Look the page up again: the pages may have been merged or moved during the import.
  const pages = useEditor.getState().project?.pages ?? []
  const index = pages.findIndex((p) => p.id === pageId)
  if (index < 0) return
  useEditor.getState().updatePage(pages[imageOwner(pages, index)].id, {
    image: { assetId: record.id, width: record.width, height: record.height, fit: 'cover', zoom: 1, panX: 0, panY: 0 },
  })
}

/** Stores a .zine file as a new project and returns its id. */
export async function importZineFile(file: Blob): Promise<string> {
  const unpacked = unpackZine(new Uint8Array(await file.arrayBuffer()))
  const { project, assets } = withFreshIds(unpacked.project, unpacked.assets)
  for (const a of assets) {
    await putAsset({
      id: a.id,
      projectId: project.id,
      blob: new Blob([a.bytes as BlobPart], { type: a.type }),
      width: a.width,
      height: a.height,
    })
  }
  await putProject(project, null)
  return project.id
}
