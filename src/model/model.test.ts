import { describe, expect, it } from 'vitest'
import { NO_EDGES } from '../imposition/edges'
import { effectiveDpi, layoutImage } from './imageLayout'
import { pageFrame, placeImage } from './pageLayout'
import { canMerge, facingPair, imageOwner, isMerged, movePage, movePages, spreadOf, spreads } from './spreads'
import { newProject, normalizeProject, type PageImage, type StoredProject } from './types'

const image = (change: Partial<PageImage> = {}): PageImage => ({
  assetId: 'a',
  width: 1000,
  height: 1000,
  fit: 'cover',
  zoom: 1,
  panX: 0,
  panY: 0,
  ...change,
})

describe('layoutImage', () => {
  it('covers the page, overflowing on the long axis', () => {
    expect(layoutImage(image(), 50, 100, NO_EDGES)).toEqual({ x: -25, y: 0, width: 100, height: 100, panX: 0, panY: 0 })
  })

  it('fits the whole image inside the page with contain', () => {
    expect(layoutImage(image({ fit: 'contain' }), 50, 100, NO_EDGES)).toEqual({ x: 0, y: 25, width: 50, height: 50, panX: 0, panY: 0 })
  })

  it('clamps panning so a cover image never uncovers the page', () => {
    const l = layoutImage(image({ panX: 100, panY: 5 }), 50, 100, NO_EDGES)
    expect(l.panX).toBe(25)
    expect(l.x).toBe(0)
    expect(l.panY).toBe(0)
  })

  it('covers the bleed box too', () => {
    const l = layoutImage(image(), 50, 100, { top: 0, right: 0, bottom: 3, left: 0 })
    expect(l.height).toBe(103)
    expect(l.y + l.height).toBe(103)
  })

  it('zooms around the centre', () => {
    expect(layoutImage(image({ zoom: 2 }), 100, 100, NO_EDGES)).toMatchObject({ x: -50, y: -50, width: 200, height: 200 })
  })
})

describe('effectiveDpi', () => {
  it('is pixels per printed inch', () => {
    const img = image({ width: 300, height: 300 })
    // 300 px across 25.4 mm = 300 DPI.
    expect(effectiveDpi(img, layoutImage(img, 25.4, 25.4, NO_EDGES))).toBeCloseTo(300)
  })
})

describe('spreads', () => {
  it('pairs pages between the covers', () => {
    expect(spreads(8)).toEqual([[0], [1, 2], [3, 4], [5, 6], [7]])
    expect(spreads(16)).toHaveLength(9)
  })

  it('finds the spread holding a page', () => {
    expect(spreadOf(8, 4)).toEqual([3, 4])
    expect(spreadOf(8, 7)).toEqual([7])
  })
})

describe('movePage', () => {
  it('moves forward and backward', () => {
    expect(movePage(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(movePage(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })
})

describe('merging', () => {
  it('only allows facing pairs, never the covers or across spreads', () => {
    // 8 pages: 1 | 2-3 | 4-5 | 6-7 | 8, as 0-based indices.
    expect([0, 1, 2, 3, 4, 5, 6, 7].filter((i) => canMerge(8, i))).toEqual([1, 3, 5])
    expect(facingPair(8, 2)).toEqual([1, 2])
    expect(facingPair(8, 3)).toEqual([3, 4])
    expect(facingPair(8, 0)).toBeNull()
    expect(facingPair(8, 7)).toBeNull()
    expect([...Array(16).keys()].filter((i) => canMerge(16, i))).toEqual([1, 3, 5, 7, 9, 11, 13])
  })

  it('finds the page holding the image of a merged pair', () => {
    const pages = [false, true, false, false].map((mergedWithNext) => ({ mergedWithNext }))
    expect([0, 1, 2, 3].map((i) => imageOwner(pages, i))).toEqual([0, 1, 1, 3])
    expect([0, 1, 2, 3].map((i) => isMerged(pages, i))).toEqual([false, true, true, false])
  })
})

describe('movePages', () => {
  // Letters are pages; upper case starts a merged pair.
  const book = (letters: string) => [...letters].map((id) => ({ id, mergedWithNext: id === id.toUpperCase() }))
  const ids = (pages: { id: string }[] | null) => pages && pages.map((p) => p.id).join('')

  it('moves single pages as before when nothing is merged', () => {
    expect(ids(movePages(book('abcdefgh'), 6, 1))).toBe('agbcdefh')
  })

  it('allows moves that leave merged pairs where they are', () => {
    // Pair B-c sits on pages 2-3; shuffling pages 4-8 doesn't touch it.
    expect(ids(movePages(book('aBcdefgh'), 7, 3))).toBe('aBchdefg')
  })

  it('refuses moves that would shift or split a merged pair', () => {
    // Shifting B-c to pages 3-4 would merge across two spreads.
    expect(movePages(book('aBcdefgh'), 5, 1)).toBeNull()
    // Dropping a page between B and c would split them.
    expect(movePages(book('aBcdefgh'), 5, 2)).toBeNull()
  })

  it('moves a merged pair as a whole onto another facing pair', () => {
    expect(ids(movePages(book('aBcdefgh'), 1, 5))).toBe('adefgBch')
    // Grabbing the pair by its second page works the same.
    expect(ids(movePages(book('aBcdefgh'), 2, 6))).toBe('adefgBch')
    expect(ids(movePages(book('abcdeFgh'), 5, 2))).toBe('aFgbcdeh')
  })

  it('never lets a merged pair land on a cover', () => {
    expect(movePages(book('aBcdefgh'), 1, 0)).toBeNull()
    expect(movePages(book('aBcdefgh'), 2, 7)).toBeNull()
  })

  it('keeps other merged pairs on their facing pairs when a pair moves', () => {
    expect(ids(movePages(book('aBcDeFgh'), 5, 1))).toBe('aFgBcDeh')
  })
})

describe('placeImage', () => {
  const wide = (change: Partial<PageImage> = {}) => image({ width: 2000, height: 1000, ...change })

  function merged(mode: 'a4-mini' | 'tcg-mini', orientation: 'portrait' | 'landscape') {
    const project = newProject(mode, 'Test', orientation)
    project.pages[1].mergedWithNext = true
    project.pages[1].image = wide()
    return project
  }

  it('lays out an unmerged page on its own', () => {
    const project = newProject('a4-mini', 'Test')
    project.pages[3].image = wide()
    expect(placeImage(project, 3)).toEqual({
      ownerIndex: 3,
      image: project.pages[3].image,
      spread: false,
      layout: layoutImage(wide(), 74.25, 105, NO_EDGES),
    })
    expect(placeImage(project, 4)).toBeNull()
  })

  it('runs one image across a merged pair, side by side', () => {
    const project = merged('a4-mini', 'portrait')
    // 2:1 image covering 148.5 × 105 mm: 210 mm wide, centred.
    expect(placeImage(project, 1)?.layout).toMatchObject({ x: -30.75, y: 0, width: 210, height: 105 })
    expect(placeImage(project, 2)).toMatchObject({ ownerIndex: 1, spread: true, layout: { x: -105, y: 0, width: 210 } })
  })

  it('stacks the pair for landscape pages', () => {
    const project = merged('a4-mini', 'landscape')
    // 2:1 image covering 105 × 148.5 mm: 297 mm wide, centred.
    expect(placeImage(project, 1)?.layout).toMatchObject({ x: -96, y: 0, width: 297, height: 148.5 })
    expect(placeImage(project, 2)?.layout).toMatchObject({ x: -96, y: -74.25 })
  })

  it("ignores the second page's own image while merged", () => {
    const project = newProject('a4-mini', 'Test')
    project.pages[1].mergedWithNext = true
    project.pages[2].image = wide()
    expect(placeImage(project, 2)).toBeNull()
  })

  it.each([
    ['portrait', 'portrait'],
    ['landscape', 'landscape'],
  ] as const)('covers the bleed of both pages (%s)', (_, orientation) => {
    const project = merged('tcg-mini', orientation)
    // Panned as far as it goes, the image must still reach every bleed edge.
    project.pages[1].image = wide({ panX: 1000, panY: 1000 })
    for (const i of [1, 2]) {
      const { width, height, bleed } = pageFrame(project, i)
      expect(bleed).not.toEqual(NO_EDGES)
      const l = placeImage(project, i)!.layout
      expect(l.x).toBeLessThanOrEqual(-bleed.left + 1e-9)
      expect(l.y).toBeLessThanOrEqual(-bleed.top + 1e-9)
      expect(l.x + l.width).toBeGreaterThanOrEqual(width + bleed.right - 1e-9)
      expect(l.y + l.height).toBeGreaterThanOrEqual(height + bleed.bottom - 1e-9)
    }
  })
})

describe('normalizeProject', () => {
  it('fills in fields that older projects lack', () => {
    const project = newProject('a4-mini', 'Old')
    const stored = JSON.parse(JSON.stringify(project)) as StoredProject
    delete stored.orientation
    for (const p of stored.pages) delete p.mergedWithNext
    expect(normalizeProject(stored)).toEqual(project)
  })

  it('drops merges that are not on a facing pair', () => {
    const project = newProject('a4-mini', 'Odd')
    for (const i of [0, 1, 2, 6]) project.pages[i].mergedWithNext = true
    expect(normalizeProject(project).pages.map((p) => p.mergedWithNext)).toEqual([
      false, true, false, false, false, false, false, false,
    ])
  })
})
