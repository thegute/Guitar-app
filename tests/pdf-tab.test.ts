import './test-env'
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { readPdf, pdfTabText } from '../src/tabs/pdfTab'
import { songFromPdf, stringNames } from '../src/tabs/importer'
import { INSTRUMENTS } from '../src/instrument'
import { flatten } from '../src/tabs/model'

const guitar = { ...INSTRUMENTS.guitar, tuning: INSTRUMENTS.guitar.tunings[0], midis: [40, 45, 50, 55, 59, 64] } as never
const notesOf = (d: Awaited<ReturnType<typeof songFromPdf>>) => flatten(d.song.tracks[0]).map(f => f.step).filter(s => s.notes.length).map(s => s.notes.map(n => `${n.string}:${n.fret}`).join('+'))
{
  const doc = await songFromPdf('text-tab.pdf', new Uint8Array(readFileSync('tests/fixtures/text-tab.pdf')), guitar)
  const n = notesOf(doc)
  assert.equal(n[0], '1:3+3:0', `first: A string 3rd fret with the open G: ${n.join(' ')}`)
  assert.ok(n.length >= 8, `${n.length} notes`)
  console.log('PDF text tab: ok', n.join(' '))
}
{
  const pages = await readPdf(new Uint8Array(readFileSync('tests/fixtures/staff-tab.pdf')))
  const { staff } = pdfTabText(pages, stringNames(guitar))

  const doc = await songFromPdf('staff-tab.pdf', new Uint8Array(readFileSync('tests/fixtures/staff-tab.pdf')), guitar)
  const n = notesOf(doc)
  assert.deepEqual(n, ['0:3', '3:0', '4:0', '5:3', '1:2', '2:2', '3:2', '4:3'])
  assert.equal(doc.song.tracks[0].bars.length, 2, 'two bars')
  console.log('PDF Guitar Pro style staff: ok')
}
{
  const doc = await songFromPdf('chord-sheet.pdf', new Uint8Array(readFileSync('tests/fixtures/chord-sheet.pdf')), guitar)
  assert.equal(doc.source, 'chords')
  const chords = doc.song.tracks[0].bars.flatMap(b => b.steps).map(s => s.chord).filter(Boolean)
  assert.deepEqual(chords.slice(0, 4), ['G', 'D', 'Em', 'C'])
  console.log('PDF chord sheet: ok')
}
{
  await assert.rejects(songFromPdf('scanned.pdf', new Uint8Array(readFileSync('tests/fixtures/scanned.pdf')), guitar), (e: Error) => e.name === 'Error' && /scanned/.test(e.message))
  console.log('PDF scanned pages → the picture reader: ok')
}
