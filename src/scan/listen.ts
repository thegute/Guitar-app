// The AI's second opinion on a recording (Gemini listens to the same clip while the guitar model works): the song if
// it knows it, key, tempo, time signature, the chords with their times, sections, the strum, techniques, and the
// stretches where someone talks or sings. It never replaces the notes the guitar model heard; it labels them,
// cleans them and checks them. Only when the guitar model can't run does its own (rough) note list stand in.
import { listenAudio } from '../assistant/providers'
import type { Note } from '../ml/post'
import { pc } from '../theory/notes'

export interface Heard {
  song?: string
  artist?: string
  key?: string
  tempo?: number
  timeSig?: [number, number]
  chords: { t: number; name: string }[]
  sections: { t: number; name: string }[]
  /** eighth-note slots of one bar: D U B X - */
  strum?: string
  techniques: string[]
  voice: { from: number; to: number; kind: 'talk' | 'sing' }[]
  /** only when asked: the AI's own notes (rough) */
  notes?: Note[]
}

export const LISTEN_PROMPT = (o: { inst: string; notes: boolean }) => `Listen to this ${o.inst} recording. Answer in exactly this shape, nothing else (leave a line out if you can't tell):
SONG: <title> | <artist>     (only if you recognise this exact recording or song)
KEY: <key, like G or Em>
TEMPO: <quarter-note BPM, a whole number>
TIME: <time signature, like 4/4, 3/4, 6/8>
CHORDS: <seconds> <chord>; <seconds> <chord>; ...     (where each chord starts, like 0.0 G; 2.4 C; 4.9 D)
SECTIONS: <seconds> <name>; ...     (intro, verse, chorus, bridge, solo, outro)
STRUM: <one bar of the strum as 8 eighth-note slots of D U B X or -, like D-DU-UDU>     (only if it's strummed)
TECHNIQUES: <slides, hammer-ons, pull-offs, bends, vibrato, palm muting, harmonics, tapping … that you hear>
VOICE: <from>-<to> talk; <from>-<to> sing; ...     (seconds where someone talks or sings)
${o.notes ? `NOTES:
<one ${o.inst} note per line: <start seconds> <note with octave, like E4 or F#3> <length seconds>; every note you hear, in order>
` : ''}Times are seconds from the start of this clip. Be exact about times; never guess a song you don't recognise.`

const num = (s: string) => Number(s.replace(',', '.'))

export function parseHeard(text: string): Heard {
  const t = text.replace(/```[a-z]*\n?|```/g, '')
  const line = (k: string) => new RegExp(`^\\s*${k}:\\s*(.*)$`, 'im').exec(t)?.[1]?.trim() ?? ''
  const h: Heard = { chords: [], sections: [], techniques: [], voice: [] }
  const song = line('SONG')
  if (song && !/unknown|not sure|^-$/i.test(song)) { const [a, b] = song.split('|').map(x => x.trim()); h.song = a || undefined; h.artist = b || undefined }
  const key = line('KEY'); if (/^[A-G][#b]?m?\b/.test(key)) h.key = key.split(/\s/)[0]
  const tempo = num(/\d{2,3}(?:[.,]\d)?/.exec(line('TEMPO'))?.[0] ?? '')
  if (tempo >= 30 && tempo <= 300) h.tempo = Math.round(tempo)
  const sig = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(line('TIME')); if (sig) h.timeSig = [Number(sig[1]), Number(sig[2])]
  for (const part of line('CHORDS').split(/[;,]\s*/)) {
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*s?\s+([A-G][#b]?[^\s;]*)/.exec(part)
    if (m) h.chords.push({ t: num(m[1]), name: m[2].replace(/[.)]$/, '') })
  }
  for (const part of line('SECTIONS').split(/;\s*/)) {
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*s?\s+([a-z][a-z ]*)/i.exec(part)
    if (m) h.sections.push({ t: num(m[1]), name: m[2].trim().toLowerCase() })
  }
  const strum = line('STRUM').toUpperCase().replace(/\s/g, '')
  if (/^[DUBX-]{8}$|^[DUBX-]{6}$/.test(strum) && /[DUBX]/.test(strum)) h.strum = strum
  h.techniques = line('TECHNIQUES').split(/,\s*/).map(x => x.trim().toLowerCase()).filter(x => x && !/^none/.test(x))
  for (const part of line('VOICE').split(/;\s*/)) {
    const m = /(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*s?\s*(talk|speak|speech|sing|vocal)/i.exec(part)
    if (m) h.voice.push({ from: num(m[1]), to: num(m[2]), kind: /sing|vocal/i.test(m[3]) ? 'sing' : 'talk' })
  }
  const ni = t.search(/^\s*NOTES:\s*$/im)
  if (ni >= 0) {
    const notes: Note[] = []
    for (const l of t.slice(t.indexOf('\n', ni) + 1).split('\n')) {
      const m = /^\s*(\d+(?:[.,]\d+)?)\s+([A-Ga-g])([#b♯♭]?)(-?\d)\s+(\d+(?:[.,]\d+)?)/.exec(l)
      if (!m) continue
      const p = pc(m[2].toUpperCase() + m[3].replace('♯', '#').replace('♭', 'b'))
      if (!(p >= 0)) continue
      const midi = 12 * (Number(m[4]) + 1) + p
      notes.push({ start: num(m[1]), end: num(m[1]) + Math.max(0.05, num(m[5])), midi, velocity: 0.6 })
    }
    if (notes.length) h.notes = notes
  }
  return h
}

/** Leave out what was played while someone talked (always) or sang (unless singing is kept). */
export function withoutVoice(notes: Note[], voice: Heard['voice'], keepSinging = false): Note[] {
  const out = voice.filter(v => v.kind === 'talk' || !keepSinging)
  if (!out.length) return notes
  return notes.filter(n => !out.some(v => n.start >= v.from - 0.05 && n.start <= v.to + 0.05))
}

/** 16-bit mono WAV at 16 kHz of (the first `maxSec` seconds of) a recording, as base64 (what Gemini takes in). */
export function wavBase64(x: Float32Array, sr: number, maxSec = 240): string {
  const step = sr / 16000
  const n = Math.min(Math.floor(x.length / step), 16000 * maxSec)
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true)
  // a light average over each step (the AI only needs to hear it; the notes come from the guitar model)
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * step), b = Math.max(a + 1, Math.floor((i + 1) * step))
    let s = 0
    for (let k = a; k < b && k < x.length; k++) s += x[k]
    v.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round((s / (b - a)) * 32767))), true)
  }
  const bytes = new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < bytes.length; i += 0x8000) str += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(str)
}

export async function aiListen(x: Float32Array, sr: number, o: { inst: string; notes: boolean; signal?: AbortSignal }): Promise<Heard> {
  const text = await listenAudio(wavBase64(x, sr), 'audio/wav', LISTEN_PROMPT(o), { signal: o.signal, maxTokens: o.notes ? 8000 : 2000 })
  return parseHeard(text)
}
