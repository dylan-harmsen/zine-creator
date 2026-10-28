// Line wrapping and box sizing for text boxes. The width is set by the user;
// the height always follows from the text.

import type { TextBox } from '../model/types'

export const MM_PER_PT = 25.4 / 72
export const LINE_HEIGHT = 1.2
/** Inner padding, in mm, so toggling the background never moves the text. */
export const TEXT_PADDING = 1

export type Measure = (text: string) => number

/** Wraps on spaces; a word wider than the line is broken by character. */
export function wrapText(text: string, maxWidth: number, measure: Measure): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const candidate = line === '' ? word : `${line} ${word}`
      if (measure(candidate) <= maxWidth) {
        line = candidate
        continue
      }
      if (line !== '') lines.push(line)
      line = ''
      // Break an over-long word into pieces that fit.
      let piece = ''
      for (const ch of word) {
        if (piece !== '' && measure(piece + ch) > maxWidth) {
          lines.push(piece)
          piece = ''
        }
        piece += ch
      }
      line = piece
    }
    lines.push(line)
  }
  return lines
}

export function fontString(box: TextBox, pxPerMm: number): string {
  return `${box.sizePt * MM_PER_PT * pxPerMm}px "${box.font}"`
}

export interface TextLayout {
  lines: string[]
  lineHeight: number
  height: number
}

let measureCtx: CanvasRenderingContext2D | null = null

/** Lays out a box in mm. Measures at a fixed scale so the result never depends on zoom. */
export function layoutTextBox(box: TextBox): TextLayout {
  const pxPerMm = 10
  measureCtx ??= document.createElement('canvas').getContext('2d')!
  measureCtx.font = fontString(box, pxPerMm)
  const inner = Math.max(box.width - TEXT_PADDING * 2, 1)
  const lines = wrapText(box.text, inner, (t) => measureCtx!.measureText(t).width / pxPerMm)
  const lineHeight = box.sizePt * MM_PER_PT * LINE_HEIGHT
  return { lines, lineHeight, height: lines.length * lineHeight + TEXT_PADDING * 2 }
}
