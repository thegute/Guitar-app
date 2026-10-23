// Turning text or files into saved songs: text tabs, chord sheets (chords over lyrics) and Guitar Pro files.
// Used by the Songs panel and by sharing into KGuitar from other apps.
import type { Instrument } from '../instrument'
import { newId, saveSong, type SongDoc } from './library'
import { parseTextTab } from './textTab'
import { parseChordSheet } from './chordSheet'
import { fromTextTab } from './model'

/** A tab or chord sheet from text, or null if it has neither tab lines nor enough chords. */
export function songFromText(text: string, title: string, inst: Instrument, youtube?: string): SongDoc | null {
  const parsed = parseTextTab(text, title || 'Pasted tab', inst.tuning.notes)
  if (parsed) {
    const song = fromTextTab(parsed)
    if (title) song.title = title
    return { id: newId(), title: song.title, source: 'text', inst: inst.id, song, youtube, updated: Date.now() }
  }
  const sheet = parseChordSheet(text, title || 'Pasted tab', inst)
  if (sheet) return { id: newId(), title: sheet.title, source: 'chords', inst: inst.id, song: sheet, youtube, updated: Date.now() }
  return null
}

const looksText = (name: string, bytes: Uint8Array) =>
  /\.(txt|tab|text|crd|chopro|cho|pro)$/i.test(name) || bytes.slice(0, 200).every(b => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 0xc2)

/** Read one tab file (text tab, chord sheet or Guitar Pro) into a saved song. Throws with a short reason if it can't. */
export async function songFromFile(name: string, bytes: Uint8Array, inst: Instrument, youtube?: string): Promise<SongDoc> {
  let doc: SongDoc | null
  if (looksText(name, bytes)) {
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
