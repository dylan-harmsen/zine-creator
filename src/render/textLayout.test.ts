import { describe, expect, it } from 'vitest'
import { wrapText } from './textLayout'

/** Every character is 1 unit wide. */
const measure = (t: string) => t.length

describe('wrapText', () => {
  it('keeps short text on one line', () => {
    expect(wrapText('hello world', 20, measure)).toEqual(['hello world'])
  })

  it('wraps on spaces', () => {
    expect(wrapText('the quick brown fox', 10, measure)).toEqual(['the quick', 'brown fox'])
  })

  it('keeps explicit line breaks and empty lines', () => {
    expect(wrapText('a\n\nb', 10, measure)).toEqual(['a', '', 'b'])
  })

  it('breaks a word longer than the line', () => {
    expect(wrapText('abcdefghij xy', 4, measure)).toEqual(['abcd', 'efgh', 'ij', 'xy'])
  })
})
