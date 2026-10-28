// Every font file in this folder is bundled and offered in the editor.
// The display name comes from the filename: `Special-Elite.ttf` → "Special Elite".
// Keep each font's licence next to it as `<Name>.LICENSE.txt`.

export interface FontEntry {
  family: string
  url: string
}

const files = import.meta.glob<string>('./*.{ttf,otf,woff,woff2}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function familyFromPath(path: string): string {
  const file = path.split('/').pop() ?? path
  return file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
}

export const FONTS: FontEntry[] = Object.entries(files)
  .map(([path, url]) => ({ family: familyFromPath(path), url }))
  .sort((a, b) => a.family.localeCompare(b.family))

let loading: Promise<void> | undefined

/** Registers every bundled font with the document. Await before any canvas render. */
export function loadFonts(): Promise<void> {
  loading ??= Promise.all(
    FONTS.map(async ({ family, url }) => {
      const face = await new FontFace(family, `url(${url})`).load()
      document.fonts.add(face)
    }),
  ).then(() => undefined)
  return loading
}
