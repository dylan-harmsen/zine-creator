// Decoded images for the open project, keyed by asset id. Kept out of the
// editor store: they are not part of undo and are not serialisable.

import { create } from 'zustand'
import type { AssetRecord } from '../storage/db'

interface AssetState {
  images: Record<string, ImageBitmap | undefined>
  /** Pixel sizes and blobs, needed for .zine export. */
  records: Record<string, AssetRecord | undefined>
  load: (records: AssetRecord[]) => Promise<void>
  add: (record: AssetRecord) => Promise<void>
  clear: () => void
}

export const useAssets = create<AssetState>()((set, get) => ({
  images: {},
  records: {},
  load: async (records) => {
    get().clear()
    const decoded = await Promise.all(records.map(async (r) => [r.id, await createImageBitmap(r.blob)] as const))
    set({
      images: Object.fromEntries(decoded),
      records: Object.fromEntries(records.map((r) => [r.id, r])),
    })
  },
  add: async (record) => {
    const bitmap = await createImageBitmap(record.blob)
    set((s) => ({
      images: { ...s.images, [record.id]: bitmap },
      records: { ...s.records, [record.id]: record },
    }))
  },
  clear: () => {
    for (const bitmap of Object.values(get().images)) bitmap?.close()
    set({ images: {}, records: {} })
  },
}))
