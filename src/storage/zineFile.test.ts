import { describe, expect, it } from 'vitest'
import { newProject } from '../model/types'
import { packZine, unpackZine, withFreshIds, type ZineAsset } from './zineFile'

function sample() {
  const project = newProject('micro-mini', 'Test zine')
  const asset: ZineAsset = { id: 'img-1', type: 'image/png', width: 4, height: 3, bytes: new Uint8Array([1, 2, 3, 250]) }
  project.pages[2].image = { assetId: asset.id, width: 4, height: 3, fit: 'cover', zoom: 1.5, panX: 2, panY: -1 }
  project.pages[2].texts.push({
    id: 't1',
    x: 1,
    y: 2,
    width: 30,
    text: 'Hello\nzine',
    font: 'Caveat',
    sizePt: 12,
    color: '#123456',
    align: 'center',
    background: '#ffffff',
  })
  return { project, assets: [asset] }
}

describe('.zine files', () => {
  it('round-trips a project and its images', () => {
    const { project, assets } = sample()
    const unpacked = unpackZine(packZine(project, assets))
    expect(unpacked.project).toEqual(project)
    expect(unpacked.assets).toEqual(assets)
  })

  it('rejects files that are not .zine files', () => {
    expect(() => unpackZine(new Uint8Array([1, 2, 3]))).toThrow('not a .zine file')
  })

  it('gives imported projects and assets fresh ids, keeping references intact', () => {
    const { project, assets } = sample()
    const fresh = withFreshIds(project, assets)
    expect(fresh.project.id).not.toBe(project.id)
    expect(fresh.assets[0].id).not.toBe('img-1')
    expect(fresh.project.pages[2].image?.assetId).toBe(fresh.assets[0].id)
    expect(fresh.assets[0].bytes).toEqual(assets[0].bytes)
  })
})
