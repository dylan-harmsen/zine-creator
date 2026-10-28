import { describe, expect, it } from 'vitest'
import { bleedEdges, gridTouchesSheetEdge, outerEdges } from './edges'

describe('outerEdges', () => {
  it('reports sheet-side edges for an upright page', () => {
    // A4 mini page 8 sits bottom-left, upright.
    expect(outerEdges('a4-mini', 8)).toEqual({ top: false, right: false, bottom: true, left: true })
  })

  it('flips edges into the page frame for a rotated page', () => {
    // A4 mini page 7 sits top-left, rotated: the sheet's top-left corner is the page's bottom-right.
    expect(outerEdges('a4-mini', 7)).toEqual({ top: false, right: true, bottom: true, left: false })
  })

  it('finds interior pages with no outer edges', () => {
    // Micro mini page 11 is row 2, column 2.
    expect(outerEdges('micro-mini', 11)).toEqual({ top: false, right: false, bottom: false, left: false })
  })
})

describe('bleedEdges', () => {
  it('adds bleed only on outer edges in TCG mode', () => {
    expect(bleedEdges('tcg-mini', true, 1)).toEqual({ top: 0, right: 0, bottom: 3, left: 0 })
    expect(bleedEdges('tcg-mini', true, 7)).toEqual({ top: 0, right: 3, bottom: 3, left: 0 })
  })

  it('is zero when bleed is off or the mode has none', () => {
    expect(bleedEdges('tcg-mini', false, 7)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    expect(bleedEdges('a4-mini', true, 7)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })
})

describe('gridTouchesSheetEdge', () => {
  it('is true for the edge-to-edge A4 modes only', () => {
    expect(gridTouchesSheetEdge('a4-mini')).toBe(true)
    expect(gridTouchesSheetEdge('micro-mini')).toBe(true)
    expect(gridTouchesSheetEdge('tcg-mini')).toBe(false)
  })
})
