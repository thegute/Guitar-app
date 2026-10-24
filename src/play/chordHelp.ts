// When a strummed chord doesn't come out right: which chord note is missing (and on which string it should be),
// or which extra note is ringing. Works from the 12-note "chroma" of the strum and the chord's shape.
import type { SongNote } from '../tabs/model'

export interface ChordHelp {
  missing: { pc: number; strings: number[] }[]
  extra: { pc: number; near?: number }[]
  text: string
}

const STRING_NAMES_6 = ['low E', 'A', 'D', 'G', 'B', 'high E']

export function stringName(s: number, n: number, tuning?: number[], name?: (pc: number) => string) {
  if (n === 6 && (!tuning || tuning.every((m, i) => m % 12 === [4, 9, 2, 7, 11, 4][i]))) return STRING_NAMES_6[s]
  const open = tuning?.[s]
  return open !== undefined && name ? `${name(open % 12)}${s === 0 ? ' (lowest)' : s === n - 1 ? ' (highest)' : ''}` : `string ${n - s}`
}

/** Explain a wrong-sounding strum. `name` turns a pitch class into a note name (sharps or flats as the key likes). */
export function chordHelp(chroma: number[], notes: SongNote[], tuning: number[], name: (pc: number) => string): ChordHelp {
  const played = notes.filter(n => n.tech !== 'x')
  const tones = [...new Set(played.map(n => n.midi % 12))]
  const vals = tones.map(t => chroma[t])
  const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)
  const outsideMax = Math.max(0, ...chroma.map((v, i) => (tones.includes(i) ? 0 : v)))
  const missing = tones
    .filter(t => chroma[t] < Math.max(0.035, 0.4 * mean, 0.45 * outsideMax))
    .map(pc => ({ pc, strings: played.filter(n => n.midi % 12 === pc).map(n => n.string) }))
  const extra = chroma
    .map((v, pc) => ({ v, pc }))
    .filter(x => !tones.includes(x.pc) && x.v > Math.max(0.08, 0.7 * mean))
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map(({ pc }) => {
      // a string a fret off would give this note
      const near = played.find(n => Math.abs(((n.midi - pc + 6) % 12 + 12) % 12 - 6) === 1)
      return { pc, near: near?.string }
    })
  const sn = (s: number) => stringName(s, tuning.length, tuning, name)
  let text = ''
  if (missing.length) {
    const m = missing[0]
    const where = m.strings.length === 1 ? `the ${sn(m.strings[0])} string` : m.strings.length ? `the ${m.strings.map(sn).join(' and ')} strings` : 'the shape'
    text = `${name(m.pc)} isn't ringing: check ${where}. Press just behind the fret and keep other fingers off it.`
    if (missing.length > 1) text += ` ${name(missing[1].pc)} is quiet too.`
  }
  if (extra.length) {
    const e = extra[0]
    const add = e.near !== undefined
      ? `An extra ${name(e.pc)} rang out: is the ${sn(e.near)} string on the right fret?`
      : `An extra ${name(e.pc)} rang out, which isn't in this chord: mute strings you don't play.`
    text = text ? `${text} ${add}` : add
  }
  if (!text) text = 'Strum all the strings of the shape and let them ring.'
  return { missing, extra, text }
}
