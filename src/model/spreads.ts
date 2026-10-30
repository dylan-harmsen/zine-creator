/**
 * Groups page indices into what the reader sees: the front cover alone,
 * then facing pairs, then the back cover alone.
 */
export function spreads(pageCount: number): number[][] {
  const result: number[][] = [[0]]
  for (let i = 1; i < pageCount - 1; i += 2) result.push([i, i + 1])
  result.push([pageCount - 1])
  return result
}

export function spreadOf(pageCount: number, pageIndex: number): number[] {
  return spreads(pageCount).find((s) => s.includes(pageIndex))!
}

export function movePage<T>(pages: T[], from: number, to: number): T[] {
  const next = pages.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

// Merging: the two pages of a facing pair can share one image. Only facing
// pairs qualify (pages 2–3, 4–5, …); the covers face nothing.

interface Mergeable {
  mergedWithNext: boolean
}

/** True when page `index` is the first page of a facing pair. */
export function canMerge(pageCount: number, index: number): boolean {
  return index % 2 === 1 && index + 1 < pageCount - 1
}

/** The facing pair holding page `index`, or null for a cover. */
export function facingPair(pageCount: number, index: number): [number, number] | null {
  const spread = spreadOf(pageCount, index)
  return spread.length === 2 ? [spread[0], spread[1]] : null
}

/** Index of the page holding the image shown on page `index`: the first page of a merged pair, else the page itself. */
export function imageOwner(pages: Mergeable[], index: number): number {
  return index > 0 && pages[index - 1].mergedWithNext ? index - 1 : index
}

export function isMerged(pages: Mergeable[], index: number): boolean {
  return pages[imageOwner(pages, index)].mergedWithNext
}

/**
 * Moves the page at `from` so it lands at `to`. A page of a merged pair takes
 * its partner along, and the pair can only land on another facing pair.
 * Returns null when the move would separate a merged pair or shift one off
 * its facing pair.
 */
export function movePages<T extends Mergeable>(pages: T[], from: number, to: number): T[] | null {
  const owner = imageOwner(pages, from)
  let next: T[]
  if (pages[owner].mergedWithNext) {
    const target = facingPair(pages.length, to)
    if (!target) return null
    next = pages.slice()
    const pair = next.splice(owner, 2)
    next.splice(target[0], 0, ...pair)
  } else {
    next = movePage(pages, from, to)
  }
  for (const [i, page] of pages.entries()) {
    if (!page.mergedWithNext) continue
    const j = next.indexOf(page)
    if (!canMerge(next.length, j) || next[j + 1] !== pages[i + 1]) return null
  }
  return next
}
