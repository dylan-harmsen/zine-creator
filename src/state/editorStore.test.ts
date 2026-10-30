import { beforeEach, describe, expect, it } from 'vitest'
import { newProject, type PageImage } from '../model/types'
import { resetHistory, useEditor } from './editorStore'

const image = (assetId: string): PageImage => ({ assetId, width: 100, height: 100, fit: 'cover', zoom: 2, panX: 5, panY: 5 })

const pages = () => useEditor.getState().project!.pages
const history = () => useEditor.temporal.getState().pastStates.length

beforeEach(() => {
  // An old timestamp, so any edit visibly changes the project.
  useEditor.getState().open({ ...newProject('a4-mini', 'Test'), updatedAt: 0 })
  resetHistory()
})

describe('setMerged', () => {
  it("merges a facing pair, keeping the first page's image, recentred", () => {
    useEditor.setState((s) => {
      s.project!.pages[1].image = image('left')
      s.project!.pages[2].image = image('right')
    })
    // Either page of the pair can ask.
    useEditor.getState().setMerged(pages()[2].id, true)
    expect(pages()[1]).toMatchObject({ mergedWithNext: true, image: { assetId: 'left', zoom: 1, panX: 0, panY: 0 } })
    expect(pages()[2]).toMatchObject({ mergedWithNext: false, image: null })
  })

  it("takes the second page's image when the first has none", () => {
    useEditor.setState((s) => void (s.project!.pages[4].image = image('right')))
    useEditor.getState().setMerged(pages()[3].id, true)
    expect(pages()[3].image?.assetId).toBe('right')
    expect(pages()[4].image).toBeNull()
  })

  it('splits a pair, leaving the image on the first page', () => {
    useEditor.setState((s) => void (s.project!.pages[1].image = image('left')))
    useEditor.getState().setMerged(pages()[1].id, true)
    useEditor.getState().setMerged(pages()[2].id, false)
    expect(pages()[1]).toMatchObject({ mergedWithNext: false, image: { assetId: 'left' } })
  })

  it('does nothing for the covers', () => {
    const before = useEditor.getState().project
    useEditor.getState().setMerged(pages()[0].id, true)
    useEditor.getState().setMerged(pages()[7].id, true)
    expect(useEditor.getState().project).toBe(before)
  })
})

describe('reorderPage', () => {
  it('moves a merged pair as a whole', () => {
    useEditor.getState().setMerged(pages()[1].id, true)
    const [b, c] = [pages()[1].id, pages()[2].id]
    useEditor.getState().reorderPage(2, 5)
    expect(pages()[5].id).toBe(b)
    expect(pages()[6].id).toBe(c)
    expect(pages()[5].mergedWithNext).toBe(true)
  })

  it('ignores moves that would break a merged pair, without an undo step', () => {
    useEditor.getState().setMerged(pages()[1].id, true)
    const before = useEditor.getState().project
    const steps = history()
    useEditor.getState().reorderPage(5, 2)
    expect(useEditor.getState().project).toBe(before)
    expect(history()).toBe(steps)
  })
})
