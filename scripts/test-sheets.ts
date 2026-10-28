// Writes a printable test sheet PDF for every mode to ./test-sheets/.
import { mkdir, writeFile } from 'node:fs/promises'
import { buildTestSheet } from '../src/export/testSheet'
import { MODES, MODE_IDS } from '../src/imposition/modes'

await mkdir('test-sheets', { recursive: true })
for (const id of MODE_IDS) {
  const path = `test-sheets/${id}.pdf`
  await writeFile(path, await buildTestSheet(MODES[id]))
  console.log(`wrote ${path}`)
}
