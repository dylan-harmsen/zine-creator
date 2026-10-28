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
