// Editor state. Only `project` is tracked by undo; selection and view state
// are not. Rapid changes (a drag, a burst of typing) collapse into one undo step.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import { facingPair, movePages } from '../model/spreads'
import { newTextBox, type Page, type PageImage, type Project, type TextBox } from '../model/types'

export type View = 'pages' | 'sheet'

interface EditorState {
  project: Project | null
  selectedPageId: string | null
  selectedTextId: string | null
  editingTextId: string | null
  showGuides: boolean
  view: View

  open: (project: Project) => void
  close: () => void
  selectPage: (pageId: string) => void
  selectText: (textId: string | null) => void
  setEditingText: (textId: string | null) => void
  setShowGuides: (show: boolean) => void
  setView: (view: View) => void

  rename: (name: string) => void
  setBleed: (bleed: boolean) => void
  /** Moves a page, or a merged pair as a whole; does nothing if the move isn't allowed. */
  reorderPage: (from: number, to: number) => void
  /** Merges or splits the facing pair holding the page. */
  setMerged: (pageId: string, merged: boolean) => void
  updatePage: (pageId: string, change: Partial<Omit<Page, 'id' | 'texts'>>) => void
  updateImage: (pageId: string, change: Partial<PageImage>) => void
  addText: (pageId: string) => string
  updateText: (pageId: string, textId: string, change: Partial<Omit<TextBox, 'id'>>) => void
  removeText: (pageId: string, textId: string) => void
}

/** Milliseconds of quiet after which the next change starts a new undo step. */
const UNDO_GROUP_MS = 400
let groupTimer: ReturnType<typeof setTimeout> | undefined

function findPage(project: Project, pageId: string): Page | undefined {
  return project.pages.find((p) => p.id === pageId)
}

export const useEditor = create<EditorState>()(
  temporal(
    immer((set, get) => {
      /** Applies a change to the open project and stamps it. */
      const edit = (fn: (project: Project) => void) =>
        set((s) => {
          if (!s.project) return
          fn(s.project)
          s.project.updatedAt = Date.now()
        })

      return {
        project: null,
        selectedPageId: null,
        selectedTextId: null,
        editingTextId: null,
        showGuides: true,
        view: 'pages',

        open: (project) =>
          set((s) => {
            s.project = project
            s.selectedPageId = project.pages[0].id
            s.selectedTextId = null
            s.editingTextId = null
            s.view = 'pages'
          }),
        close: () =>
          set((s) => {
            s.project = null
            s.selectedPageId = null
            s.selectedTextId = null
            s.editingTextId = null
          }),
        selectPage: (pageId) =>
          set((s) => {
            if (s.selectedPageId === pageId) return
            s.selectedPageId = pageId
            s.selectedTextId = null
            s.editingTextId = null
          }),
        selectText: (textId) =>
          set((s) => {
            s.selectedTextId = textId
            if (s.editingTextId !== textId) s.editingTextId = null
          }),
        setEditingText: (textId) =>
          set((s) => {
            s.editingTextId = textId
            if (textId) s.selectedTextId = textId
          }),
        setShowGuides: (show) => set({ showGuides: show }),
        setView: (view) => set({ view }),

        rename: (name) => edit((p) => void (p.name = name)),
        setBleed: (bleed) => edit((p) => void (p.bleed = bleed)),
        reorderPage: (from, to) => {
          const pages = get().project?.pages
          if (from === to || !pages || !movePages(pages, from, to)) return
          edit((p) => void (p.pages = movePages(p.pages, from, to)!))
        },
        setMerged: (pageId, merged) => {
          const pages = get().project?.pages ?? []
          const index = pages.findIndex((pg) => pg.id === pageId)
          const pair = index < 0 ? null : facingPair(pages.length, index)
          if (!pair || pages[pair[0]].mergedWithNext === merged) return
          edit((p) => {
            const [first, second] = [p.pages[pair[0]], p.pages[pair[1]]]
            first.mergedWithNext = merged
            // The pair keeps the first page's image, or else the second's.
            const image = first.image ?? (merged ? second.image : null)
            if (merged) second.image = null
            // The image's frame changes size, so start it centred again.
            first.image = image && { ...image, zoom: 1, panX: 0, panY: 0 }
          })
        },
        updatePage: (pageId, change) =>
          edit((p) => {
            const page = findPage(p, pageId)
            if (page) Object.assign(page, change)
          }),
        updateImage: (pageId, change) =>
          edit((p) => {
            const image = findPage(p, pageId)?.image
            if (image) Object.assign(image, change)
          }),
        addText: (pageId) => {
          let id = ''
          set((s) => {
            if (!s.project) return
            const page = findPage(s.project, pageId)
            if (!page) return
            const box = newTextBox(s.project.mode, s.project.orientation)
            id = box.id
            page.texts.push(box)
            s.project.updatedAt = Date.now()
            s.selectedTextId = id
            s.editingTextId = id
          })
          return id
        },
        updateText: (pageId, textId, change) =>
          edit((p) => {
            const box = findPage(p, pageId)?.texts.find((t) => t.id === textId)
            if (box) Object.assign(box, change)
          }),
        removeText: (pageId, textId) =>
          set((s) => {
            if (!s.project) return
            const page = findPage(s.project, pageId)
            if (!page) return
            page.texts = page.texts.filter((t) => t.id !== textId)
            s.project.updatedAt = Date.now()
            if (s.selectedTextId === textId) s.selectedTextId = null
            if (s.editingTextId === textId) s.editingTextId = null
          }),
      }
    }),
    {
      partialize: (s) => ({ project: s.project }),
      equality: (a, b) => a.project === b.project,
      // Record the state from before the first change of a burst, and ignore
      // the rest of the burst, so one gesture is one undo step.
      handleSet: (handleSet) => (pastState) => {
        if (groupTimer === undefined) handleSet(pastState)
        clearTimeout(groupTimer)
        groupTimer = setTimeout(() => (groupTimer = undefined), UNDO_GROUP_MS)
      },
    },
  ),
)

export function undo() {
  useEditor.temporal.getState().undo()
  clampSelection()
}

export function redo() {
  useEditor.temporal.getState().redo()
  clampSelection()
}

/** After undo/redo, drop selections that point at things that no longer exist. */
function clampSelection() {
  useEditor.setState((s) => {
    if (!s.project) return
    const page = s.project.pages.find((p) => p.id === s.selectedPageId) ?? s.project.pages[0]
    s.selectedPageId = page.id
    if (!page.texts.some((t) => t.id === s.selectedTextId)) {
      s.selectedTextId = null
      s.editingTextId = null
    }
  })
}

export function resetHistory() {
  // End any open group too, or the next edit would join a group whose entry was just cleared.
  clearTimeout(groupTimer)
  groupTimer = undefined
  useEditor.temporal.getState().clear()
}
