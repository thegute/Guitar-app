// Turning text or files into saved songs: text tabs, chord sheets (chords over lyrics) and Guitar Pro files.
// Used by the Songs panel and by sharing into KGuitar from other apps.
import type { Instrument } from '../instrument'
import { newId, saveSong, type SongDoc } from './library'
import { parseTextTab } from './textTab'
import { parseChordSheet } from './chordSheet'
import { fromTextTab } from './model'
import { guessTabTempo } from '../audio/tempo'

/** A tab or chord sheet from text, or null if it has neither tab lines nor enough chords. */
export function songFromText(text: string, title: string, inst: Instrument, youtube?: string): SongDoc | null {
  const parsed = parseTextTab(text, title || 'Pasted tab', inst.tuning.notes)
  if (parsed) {
    const song = fromTextTab(parsed)
    if (title) song.title = title
    // no tempo written on a text tab: a likely one from how busy the rhythm is (the badge in Play says it's a guess)
    if (!song.tempo) { song.tempo = guessTabTempo(song.tracks[0].bars.flatMap(b => b.steps.filter(st => st.notes.length).map(st => st.dur))); song.tempoFrom = 'guess' }
    return { id: newId(), title: song.title, source: 'text', inst: inst.id, song, youtube, updated: Date.now() }
  }
  const sheet = parseChordSheet(text, title || 'Pasted tab', inst)
  if (sheet) return { id: newId(), title: sheet.title, source: 'chords', inst: inst.id, song: { ...sheet, tempoFrom: sheet.tempoFrom ?? 'guess' }, youtube, updated: Date.now() }
  return null
}

const looksText = (name: string, bytes: Uint8Array) =>
  /\.(txt|tab|text|crd|chopro|cho|pro)$/i.test(name) || bytes.slice(0, 200).every(b => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 0xc2)

export const isPdf = (name: string, bytes: Uint8Array) => /\.pdf$/i.test(name) || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
/** string names, highest first (e B G D A E), the way text tabs write them */
export const stringNames = (inst: Instrument) => [...inst.tuning.notes].reverse().map((n, i, a) => { const x = n.replace(/-?\d+$/, ''); return i === 0 && a.length === 6 && x === 'E' ? 'e' : x })

/** A tab or chord sheet from a PDF (pages `from`…`to` of a book). Throws ScannedPdf when the tab on those pages is
 *  pictures (a scanned book, or tab printed as an image next to real text): the AI picture reader can read those. */
/** "Artist   Song" from the top of a Songsterr print, to look the real song up on Songsterr. */
function songsterrTitle(text: string): string | undefined {
  const line = text.split('\n').map(l => l.trim()).find(l => l && !/songsterr|guitar tabs/i.test(l))
  return line ? line.replace(/\s{2,}/g, ' - ') : undefined
}

export async function songFromPdf(name: string, bytes: Uint8Array, inst: Instrument, youtube?: string, range?: { from: number; to: number }): Promise<SongDoc> {
  const { readPdf, pdfTabText, ScannedPdf } = await import('./pdfTab')
  const pages = await readPdf(bytes, range?.from ?? 1, range?.to)
  const base = name.replace(/\.[^.]+$/, '')
  const title = range ? `${base} p.${range.from}${range.to > range.from ? `–${range.to}` : ''}` : base
  // a tab PDF drawn by tab software: its numbers, staff and rhythm are exact shapes, read directly (no picture, no AI)
  const { readPdfShapes } = await import('../scan/tabReadSong')
  const shaped = readPdfShapes(pages, inst.midis, title)
  if (shaped && shaped.notes >= 6) return { id: newId(), title, source: 'text', inst: inst.id, song: shaped.song, youtube, updated: Date.now() }
  const { staff, text, drawn, songsterr } = pdfTabText(pages, stringNames(inst))
  // the tab is printed with its numbers drawn as shapes (a Songsterr print): reading the page's words would only find
  // the lyrics and chord names, so it goes to the picture reader (which sees the numbers) instead
  if (drawn) throw new ScannedPdf(bytes, range?.from ?? 1, Math.min(6, pages.length || 6), songsterr ? songsterrTitle(text) : undefined)
  const doc = (staff && songFromText(staff, title, inst, youtube)) || songFromText(text, title, inst, youtube)
  if (doc) return { ...doc, source: doc.source === 'chords' ? 'chords' : 'text' }
  const words = pages.reduce((a, p) => a + p.texts.filter(t => t.str.trim()).length, 0)
  const pictured = pages.some(p => (p.pictures ?? 0) >= 0.12)
  if (words < 8 * Math.max(1, pages.length) || pictured) throw new ScannedPdf(bytes, range?.from ?? 1, Math.min(6, pages.length || 6))
  throw new Error('no tab lines or chords found in the PDF')
}

/** Read one tab file (text tab, chord sheet, PDF or Guitar Pro) into a saved song. Throws with a short reason if it can't. */
export async function songFromFile(name: string, bytes: Uint8Array, inst: Instrument, youtube?: string): Promise<SongDoc> {
  let doc: SongDoc | null
  if (isPdf(name, bytes)) {
    doc = await songFromPdf(name, bytes, inst, youtube)
  } else if (looksText(name, bytes)) {
    doc = songFromText(new TextDecoder().decode(bytes), name.replace(/\.[^.]+$/, ''), inst, youtube)
    if (!doc) throw new Error('no tab lines or chords found')
  } else {
    const { importGuitarPro } = await import('./gpImport')
    const song = importGuitarPro(bytes, name)
    doc = { id: newId(), title: song.title, artist: song.artist, source: 'gp', inst: inst.id, song, youtube, updated: Date.now() }
  }
  await saveSong(doc)
  return doc
}
