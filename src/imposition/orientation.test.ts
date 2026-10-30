import { describe, expect, it } from 'vitest'
import { MODES } from './modes'
import { contentRotation, orientEdges, pageSize } from './orientation'

describe('pageSize', () => {
  it('swaps width and height for landscape pages', () => {
    expect(pageSize(MODES['a4-mini'], 'portrait')).toEqual({ width: 74.25, height: 105 })
    expect(pageSize(MODES['a4-mini'], 'landscape')).toEqual({ width: 105, height: 74.25 })
  })
})

describe('contentRotation', () => {
  it('turns landscape pages a quarter turn anticlockwise in their slot', () => {
    expect(contentRotation(0, 'portrait')).toBe(0)
    expect(contentRotation(180, 'portrait')).toBe(180)
    expect(contentRotation(0, 'landscape')).toBe(270)
    expect(contentRotation(180, 'landscape')).toBe(90)
  })
})

describe('orientEdges', () => {
  it('brings the portrait left edge (the front cover spine) to the top', () => {
    const edges = { top: 't', right: 'r', bottom: 'b', left: 'l' }
    expect(orientEdges(edges, 'portrait')).toBe(edges)
    expect(orientEdges(edges, 'landscape')).toEqual({ top: 'l', right: 't', bottom: 'r', left: 'b' })
  })
})
