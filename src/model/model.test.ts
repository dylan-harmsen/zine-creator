import { describe, expect, it } from 'vitest'
import { NO_EDGES } from '../imposition/edges'
import { effectiveDpi, layoutImage } from './imageLayout'
import { movePage, spreadOf, spreads } from './spreads'
import type { PageImage } from './types'

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
