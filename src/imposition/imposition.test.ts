import { describe, expect, it } from 'vitest'
import { MODES, MODE_IDS } from './modes'
import { cropMarkSegments, foldSegments, gridRect, placedPages } from './geometry'

/** Page map as written in docs/spec.md: negative = rotated 180°. */
function pageMap(id: keyof typeof MODES): number[][] {
  const mode = MODES[id]
  const rows: number[][] = []
  for (let r = 0; r < mode.rows; r++) {
    rows.push(
      mode.slots
        .slice(r * mode.columns, (r + 1) * mode.columns)
        .map((s) => (s.rotation === 180 ? -s.page : s.page)),
    )
  }
  return rows
}

describe.each(MODE_IDS)('%s', (id) => {
  const mode = MODES[id]

  it('has one slot per grid cell', () => {
    expect(mode.slots).toHaveLength(mode.columns * mode.rows)
  })

  it('places every page exactly once', () => {
    const pages = mode.slots.map((s) => s.page).sort((a, b) => a - b)
    expect(pages).toEqual(Array.from({ length: mode.pageCount }, (_, i) => i + 1))
  })

  it('fits the grid, plus bleed, on the sheet', () => {
    const g = gridRect(mode)
    expect(g.x - mode.bleedMm).toBeGreaterThanOrEqual(0)
    expect(g.y - mode.bleedMm).toBeGreaterThanOrEqual(0)
  })

  it('puts each facing pair side by side across a fold, in reading order', () => {
    // So an image merged across a facing pair prints as one continuous picture.
    const folds = foldSegments(mode)
    for (let first = 2; first < mode.pageCount; first += 2) {
      const a = mode.slots.findIndex((s) => s.page === first)
      const b = mode.slots.findIndex((s) => s.page === first + 1)
      const [rowA, colA] = [Math.floor(a / mode.columns), a % mode.columns]
      const [rowB, colB] = [Math.floor(b / mode.columns), b % mode.columns]
      const rotation = mode.slots[a].rotation
      expect(mode.slots[b].rotation).toBe(rotation)
      expect(rowB).toBe(rowA)
      // Upright, the first page is on the left; turned, on the right.
      expect(colB - colA).toBe(rotation === 0 ? 1 : -1)
      const x = Math.max(colA, colB)
      const onFold = folds.some((f) => f.x1 === x && f.x2 === x && f.y1 <= rowA && f.y2 >= rowA + 1)
      expect(onFold).toBe(true)
    }
  })

  it('keeps cuts on interior grid lines', () => {
    for (const c of mode.cuts) {
      expect(c.x1 === c.x2 || c.y1 === c.y2).toBe(true)
      if (c.y1 === c.y2) expect(c.y1 > 0 && c.y1 < mode.rows).toBe(true)
      else expect(c.x1 > 0 && c.x1 < mode.columns).toBe(true)
    }
  })
})

describe('A4 mini zine', () => {
  it('matches the spec page map', () => {
    expect(pageMap('a4-mini')).toEqual([
      [-7, -6, -5, -4],
      [8, 1, 2, 3],
    ])
  })

  it('has A4 landscape panels running edge to edge', () => {
    expect(gridRect(MODES['a4-mini'])).toEqual({ x: 0, y: 0, width: 297, height: 210 })
    expect(placedPages(MODES['a4-mini'])[5].rect).toEqual({ x: 74.25, y: 105, width: 74.25, height: 105 })
  })

  it('folds everywhere except the centre slit', () => {
    expect(foldSegments(MODES['a4-mini'])).toEqual([
      { x1: 0, y1: 1, x2: 1, y2: 1 },
      { x1: 3, y1: 1, x2: 4, y2: 1 },
      { x1: 1, y1: 0, x2: 1, y2: 2 },
      { x1: 2, y1: 0, x2: 2, y2: 2 },
      { x1: 3, y1: 0, x2: 3, y2: 2 },
    ])
  })
})

describe('Micro mini zine', () => {
  it('matches the spec page map', () => {
    expect(pageMap('micro-mini')).toEqual([
      [-9, -8, -7, -6],
      [10, 11, 4, 5],
      [-13, -12, -3, -2],
      [14, 15, 16, 1],
    ])
  })

  it('uses A8 portrait pages on A4 portrait', () => {
    const mode = MODES['micro-mini']
    expect([mode.sheetWidthMm, mode.sheetHeightMm]).toEqual([210, 297])
    expect([mode.pageWidthMm, mode.pageHeightMm]).toEqual([52.5, 74.25])
  })

  it('folds everywhere except the I cut and the side cuts', () => {
    expect(foldSegments(MODES['micro-mini'])).toEqual([
      { x1: 0, y1: 1, x2: 1, y2: 1 },
      { x1: 3, y1: 1, x2: 4, y2: 1 },
      { x1: 1, y1: 2, x2: 3, y2: 2 },
      { x1: 0, y1: 3, x2: 1, y2: 3 },
      { x1: 3, y1: 3, x2: 4, y2: 3 },
      { x1: 1, y1: 0, x2: 1, y2: 4 },
      { x1: 2, y1: 0, x2: 2, y2: 1 },
      { x1: 2, y1: 3, x2: 2, y2: 4 },
      { x1: 3, y1: 0, x2: 3, y2: 4 },
    ])
  })
})

describe('TCG card zine', () => {
  it('shares the A4 mini page map and cuts', () => {
    expect(MODES['tcg-mini'].slots).toEqual(MODES['a4-mini'].slots)
    expect(MODES['tcg-mini'].cuts).toEqual(MODES['a4-mini'].cuts)
  })

  it('centres 63 × 88 mm cards on A4 landscape', () => {
    expect(gridRect(MODES['tcg-mini'])).toEqual({ x: 22.5, y: 17, width: 252, height: 176 })
  })

  it('puts crop marks outside the bleed and on the sheet', () => {
    const mode = MODES['tcg-mini']
    const g = gridRect(mode)
    const marks = cropMarkSegments(mode)
    expect(marks).toHaveLength(8)
    for (const m of marks) {
      for (const [x, y] of [[m.x1, m.y1], [m.x2, m.y2]]) {
        const insideX = x > g.x - mode.bleedMm && x < g.x + g.width + mode.bleedMm
        const insideY = y > g.y - mode.bleedMm && y < g.y + g.height + mode.bleedMm
        expect(insideX && insideY).toBe(false)
        expect(x >= 0 && x <= mode.sheetWidthMm && y >= 0 && y <= mode.sheetHeightMm).toBe(true)
      }
    }
  })
})
