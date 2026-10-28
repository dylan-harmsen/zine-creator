import { describe, expect, it } from 'vitest'
import { FONTS, familyFromPath } from './index'

describe('familyFromPath', () => {
  it('turns the filename into a display name', () => {
    expect(familyFromPath('./Special-Elite.ttf')).toBe('Special Elite')
    expect(familyFromPath('./Libre_Baskerville.woff2')).toBe('Libre Baskerville')
    expect(familyFromPath('./Inter.ttf')).toBe('Inter')
  })
})

describe('FONTS', () => {
  it('picks up every font in the folder', () => {
    expect(FONTS.map((f) => f.family)).toEqual([
      'Bebas Neue',
      'Caveat',
      'Inter',
      'Libre Baskerville',
      'Permanent Marker',
      'Special Elite',
    ])
  })
})
