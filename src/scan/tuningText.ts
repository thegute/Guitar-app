// The tuning, capo and tempo a printed tab states in words: string names written left of the staff lines (Songsterr:
// "e B G D A E", "D A D G B E"), a tuning line ("Tuning: E♭ A♭ D♭ G♭ B♭ E♭", "Drop D", "DADGAD", "Half step down"), a capo
// ("Capo 3", "Capo III", "capo on the 2nd fret"), and the tempo ("♩ = 130", "= 148").
import type { PdfText } from '../tabs/pdfTab'

export interface TuningFound {
  /** note names lowest string first, e.g. ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] */
  names?: string[]
  /** open-string pitches (MIDI), lowest first, in the octave each string usually sits */
  midis?: number[]
  capo?: number
  tempo?: number
  /** where it came from, in words (for the song check card) */
  from: string[]
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
/** standard tuning per string count (the octave a retuned string stays near) */
const STD: Record<number, number[]> = { 6: [40, 45, 50, 55, 59, 64], 7: [35, 40, 45, 50, 55, 59, 64], 4: [43, 48, 52, 57], 8: [30, 35, 40, 45, 50, 55, 59, 64] }

/** "Eb", "E♭", "F#", "f♯", "Bb" → pitch class, or null */
export function pitchClass(name: string): number | null {
  const m = /^([A-Ga-g])\s*([#♯b♭]?)$/.exec(name.trim())
  if (!m) return null
  const base = PC[m[1].toUpperCase()]
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0
  return (base + acc + 12) % 12
}
/** names lowest string first → MIDI pitches near standard tuning (a string is never retuned more than a fifth or so) */
export function tuningMidis(names: string[]): number[] | null {
  const std = STD[names.length]
  if (!std) return null
  const out: number[] = []
  for (let i = 0; i < names.length; i++) {
    const pc = pitchClass(names[i])
    if (pc === null) return null
    let best = std[i], bd = 99
    for (let m = std[i] - 8; m <= std[i] + 6; m++) if (m % 12 === pc && Math.abs(m - std[i]) < bd) { bd = Math.abs(m - std[i]); best = m }
    out.push(best)
  }
  return out
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 }

/** From a tab's words (anywhere in the text, e.g. a text tab's header). */
export function tuningFromWords(text: string, strings = 6): TuningFound | undefined {
  const f: TuningFound = { from: [] }
  const capo = /\bcapo\b[^\n\d]{0,20}?(\d{1,2})\b/i.exec(text) ?? /\bcapo\s+([IVX]{1,4})\b/.exec(text)
  if (capo) { const n = ROMAN[capo[1]] ?? Number(capo[1]); if (n > 0 && n < 13) { f.capo = n; f.from.push(`Capo ${n}`) } }
  const tempo = /(?:♩|tempo|bpm)?\s*=\s*(\d{2,3})\b/i.exec(text)
  if (tempo && /♩|=/.test(tempo[0])) { const n = Number(tempo[1]); if (n >= 30 && n <= 320) f.tempo = n }
  // a written tuning: six (or 4–8) note names in a row, low to high
  const line = new RegExp(`(?:tuning[:\\s]*)?((?:[A-G][#♯b♭]?[\\s,-]*){${strings}})(?![a-z])`, 'g')
  for (const m of text.matchAll(line)) {
    const names = m[1].match(/[A-G][#♯b♭]?/g) ?? []
    if (names.length !== strings) continue
    // a plain chord list isn't a tuning: tunings start low and the 6-string ones are mostly fourths
    const mids = tuningMidis(names)
    if (!mids || mids.some((x, i) => i && x <= mids[i - 1])) continue
    if (!/tuning/i.test(m[0]) && /^(E A D G B E)$/.test(names.join(' '))) { f.names = names; f.midis = mids; break }
    f.names = names; f.midis = mids; f.from.push(`Tuning ${names.join(' ')}`); break
  }
  if (!f.names) {
    const named: [RegExp, string[]][] = [
      [/\bdrop\s*d\b/i, ['D', 'A', 'D', 'G', 'B', 'E']], [/\bdadgad\b/i, ['D', 'A', 'D', 'G', 'A', 'D']], [/\bopen\s*g\b/i, ['D', 'G', 'D', 'G', 'B', 'D']],
      [/\bopen\s*d\b/i, ['D', 'A', 'D', 'F#', 'A', 'D']], [/\bdrop\s*c\b/i, ['C', 'G', 'C', 'F', 'A', 'D']],
      [/\b(half\s*step|½\s*step|semitone)\s*down\b|\be[b♭]\s*(standard|tuning)\b/i, ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb']],
      [/\b(whole\s*step|full\s*step)\s*down\b|\bd\s*standard\b/i, ['D', 'G', 'C', 'F', 'A', 'D']],
    ]
    if (strings === 6) for (const [re, names] of named) if (re.test(text)) { f.names = names; f.midis = tuningMidis(names) ?? undefined; f.from.push(`Tuning ${names.join(' ')}`); break }
  }
  return f.names || f.capo || f.tempo ? f : undefined
}

/** From a PDF page's text items: string names left of a staff's lines first, then the page's words. */
export function tuningFromText(texts: PdfText[], height: number, staves: { lines: number[]; gap: number; left: number }[], strings: number): TuningFound | undefined {
  let byLines: string[] | undefined
  for (const st of staves) {
    // one short note name level with each line, just left of (or at) the staff's start
    const names: string[] = []
    for (const ly of st.lines) {
      const t = texts.find(t => t.x < st.left + st.gap * 0.5 && t.x > st.left - st.gap * 6 && Math.abs(height - (t.y + t.h * 0.35) - ly) < st.gap * 0.45 && pitchClass(t.str) !== null)
      if (!t) break
      names.push(t.str.trim())
    }
    if (names.length === strings) { byLines = names.reverse(); break } // lines run top (high) → bottom (low)
  }
  const page = texts.map(t => t.str).join(' ')
  const words = tuningFromWords(page, strings)
  const f: TuningFound = words ?? { from: [] }
  if (byLines) {
    const mids = tuningMidis(byLines.map(n => n.length === 1 ? n.toUpperCase() : n[0].toUpperCase() + n.slice(1)))
    if (mids) { f.names = byLines.map(n => n[0].toUpperCase() + n.slice(1)); f.midis = mids; f.from = [...f.from.filter(x => !x.startsWith('Tuning')), `Strings named ${byLines.join(' ')}`] }
  }
  return f.names || f.capo || f.tempo ? f : undefined
}
