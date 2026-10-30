// Writes a printable test sheet PDF for every mode and orientation to ./test-sheets/.
import { mkdir, writeFile } from 'node:fs/promises'
import { buildTestSheet } from '../src/export/testSheet'
import { MODES, MODE_IDS } from '../src/imposition/modes'
import { ORIENTATIONS } from '../src/imposition/orientation'

await mkdir('test-sheets', { recursive: true })
for (const id of MODE_IDS) {
  for (const orientation of ORIENTATIONS) {
    const path = `test-sheets/${id}${orientation === 'landscape' ? '-landscape' : ''}.pdf`
    await writeFile(path, await buildTestSheet(MODES[id], orientation))
    console.log(`wrote ${path}`)
  }
}
