// Strumming and picking patterns for the backing guitar.
import { playNote, strum as strumNotes, isPowerChord, soundInfo, type Handle, type SoundId } from './pluck'

/**
 * Hit kinds: D down strum, U up strum, B bass note (root), A alternate bass (next string up),
 * a1..a6 single note from the chord (low to high), o1..o6 the same an octave up, X muted chuck, P palm-muted power chug,
 * S short (staccato) chord, R a slow rolled chord (harp-like, low to high).
 */
type Kind = 'D' | 'U' | 'B' | 'A' | 'X' | 'P' | 'S' | 'R' | `a${number}` | `o${number}`
type Hit = [number, Kind]

const ARP: Hit[] = [[0, 'B'], [0.5, 'a3'], [1, 'a4'], [1.5, 'a5'], [2, 'a6'], [2.5, 'a5'], [3, 'a4'], [3.5, 'a3']]
/** a sequence of chord notes on an even grid */
const seq = (step: number, kinds: Kind[]): Hit[] => kinds.map((k, i) => [i * step, k] as Hit).filter(([b]) => b < 4 - 1e-6)
// Playbox-style arpeggiator patterns (its Arp / Strum ideas: up, zig-zag, move in / out, triplets, octaves, strike)
const ARPS: { id: string; label: string; hits: Hit[] }[] = [
  { id: 'arp-up', label: 'Arp up (8ths)', hits: seq(0.5, ['a3', 'a4', 'a5', 'a6', 'a3', 'a4', 'a5', 'a6']) },
  { id: 'arp-zigzag', label: 'Arp zig-zag up-down', hits: seq(0.5, ['a3', 'a4', 'a5', 'a6', 'a5', 'a4', 'a3', 'a4']) },
  { id: 'arp-movein', label: 'Arp move in (outside → in)', hits: seq(0.5, ['a3', 'a6', 'a4', 'a5', 'a3', 'a6', 'a4', 'a5']) },
  { id: 'arp-moveout', label: 'Arp move out (dotted 16ths)', hits: seq(0.75, ['a4', 'a5', 'a3', 'a6', 'a4', 'a5']) },
  { id: 'arp-triplets', label: 'Arp triplets up-down', hits: seq(1 / 3, ['a3', 'a4', 'a5', 'a6', 'a5', 'a4', 'a3', 'a4', 'a5', 'a6', 'a5', 'a4']) },
  { id: 'arp-octaves', label: 'Arp up two octaves', hits: seq(0.5, ['a3', 'a4', 'a5', 'a6', 'o3', 'o4', 'o5', 'o6']) },
  { id: 'arp-strike', label: 'Arp strike (each note twice)', hits: seq(0.25, ['a3', 'a3', 'a4', 'a4', 'a5', 'a5', 'a6', 'a6', 'a5', 'a5', 'a4', 'a4', 'a3', 'a3', 'a4', 'a4']) },
  { id: 'roll', label: 'Rolled chord (harp)', hits: [[0, 'R'], [2, 'R']] },
]

export const STRUMS: { id: string; label: string; hits: Hit[] }[] = [
  { id: 'whole', label: 'Whole notes', hits: [[0, 'D']] },
  { id: 'half', label: 'Half notes', hits: [[0, 'D'], [2, 'D']] },
  { id: 'quarters', label: 'Quarter strums', hits: [[0, 'D'], [1, 'D'], [2, 'D'], [3, 'D']] },
  { id: 'pop', label: 'D-DU-UDU (pop)', hits: [[0, 'D'], [1, 'D'], [1.5, 'U'], [2.5, 'U'], [3, 'D'], [3.5, 'U']] },
  { id: 'eighths', label: 'Driving 8ths', hits: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(b => [b, b % 1 ? 'U' : 'D'] as Hit) },
  { id: 'punk', label: 'Punk downstrokes', hits: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(b => [b, 'P'] as Hit) },
  { id: 'chug', label: 'Metal gallop', hits: [[0, 'D'], [0.5, 'P'], [0.75, 'P'], [1, 'P'], [1.5, 'P'], [1.75, 'P'], [2, 'D'], [2.5, 'P'], [2.75, 'P'], [3, 'P'], [3.5, 'P'], [3.75, 'P']] },
  { id: 'shuffle', label: 'Blues shuffle', hits: [[0, 'B'], [2 / 3, 'A'], [1, 'B'], [5 / 3, 'A'], [2, 'B'], [8 / 3, 'A'], [3, 'B'], [11 / 3, 'A']] },
  { id: 'country', label: 'Boom-chick (country)', hits: [[0, 'B'], [1, 'S'], [2, 'A'], [3, 'S']] },
  { id: 'travis', label: 'Travis picking (folk)', hits: [[0, 'B'], [0.5, 'a5'], [1, 'A'], [1.5, 'a4'], [2, 'B'], [2.5, 'a6'], [3, 'A'], [3.5, 'a5']] },
  { id: 'arpeggio', label: 'Arpeggio (ballad)', hits: ARP },
  { id: 'reggae', label: 'Reggae skank', hits: [[1, 'S'], [3, 'S']] },
  { id: 'funk', label: 'Funk 16ths', hits: [[0, 'D'], [0.25, 'X'], [0.5, 'U'], [0.75, 'X'], [1, 'X'], [1.5, 'S'], [1.75, 'U'], [2, 'X'], [2.5, 'D'], [2.75, 'X'], [3, 'X'], [3.25, 'U'], [3.5, 'S']] },
  { id: 'bossa', label: 'Bossa nova', hits: [[0, 'B'], [0.5, 'S'], [1, 'A'], [1.5, 'S'], [2, 'B'], [2.75, 'S'], [3, 'A'], [3.5, 'S']] },
  { id: 'comp', label: 'Jazz comping', hits: [[0, 'S'], [1.5, 'S'], [2 + 2 / 3, 'S']] },
  ...ARPS,
  { id: 'rumba', label: 'Rumba / flamenco', hits: [[0, 'D'], [0.5, 'X'], [0.75, 'U'], [1, 'D'], [1.5, 'U'], [2, 'D'], [2.5, 'X'], [2.75, 'U'], [3, 'D'], [3.5, 'U']] },
]

export type { Handle }

/** Play one hit of a pattern for a chord voicing (midis low → high) in the given guitar sound. */
export function playHit(kind: Kind, midis: number[], when: number, gain: number, dest?: AudioNode, sound?: SoundId): Handle[] {
  if (!midis.length) return []
  const hs: Handle[] = []
  const amp = sound ? !!soundInfo(sound).amp : false
  // a backing part on an amp sound is double-tracked: two takes, left and right, like a real rhythm guitar recording
  const chord = (notes: number[], o: { up?: boolean; g: number; spread?: number; pm?: boolean }) =>
    hs.push(strumNotes(notes, when, { up: o.up, gain: o.g, spread: o.spread ?? 0.014, dest, sound, pm: o.pm, double: amp }))
  const note = (m: number, g: number, pm = false) => hs.push(playNote(m, when, g, dest, { sound, pm, double: amp }))
  // power chords stay whole on upstrokes too (they're only 2-3 strings)
  const top = (n: number) => (isPowerChord(midis) ? midis : midis.slice(-n))
  switch (kind) {
    case 'D':
      chord(midis, { g: gain })
      break
    case 'U':
      chord(top(4), { up: true, g: gain * 0.7 / 0.75, spread: 0.01 })
      break
    case 'S': {
      chord(midis.length > 3 && !isPowerChord(midis) ? midis.slice(-4) : midis, { g: gain * 0.8, spread: 0.008 })
      const end = when + 0.16
      hs.forEach(h => h.stop(end))
      break
    }
    case 'X': {
      // muted chuck: a very short strum (through an amp: a tight palm-muted chug)
      if (amp) chord(midis.slice(0, Math.min(3, midis.length)), { g: gain * 0.45, spread: 0.004, pm: true })
      else chord(midis.slice(-4), { g: gain * 0.35, spread: 0.004 })
      hs.forEach(h => h.stop(when + (amp ? 0.06 : 0.035)))
      break
    }
    case 'P': {
      // palm-muted chug on the low strings: recorded palm mutes when the sound has them
      chord(midis.slice(0, Math.min(3, midis.length)), { g: gain * 0.85, spread: 0.004, pm: true })
      hs.forEach(h => h.stop(when + (amp ? 0.2 : 0.11)))
      break
    }
    case 'R':
      // a slow roll: the pick (or the harp) walks up the chord over ~a quarter of a second, every note left ringing
      chord(midis, { g: gain * 0.85, spread: 0.06 })
      break
    case 'B':
      note(midis[0], gain * 0.95)
      break
    case 'A':
      note(midis[Math.min(1, midis.length - 1)], gain * 0.85)
      break
    default: {
      // aN: the Nth note counted from the top so it works for 4, 5 or 6-string voicings; oN: the same an octave up
      const n = parseInt(kind.slice(1), 10)
      const idx = Math.max(0, midis.length - (7 - n))
      note(midis[Math.min(idx, midis.length - 1)] + (kind[0] === 'o' ? 12 : 0), gain * (kind[0] === 'o' ? 0.7 : 0.8))
    }
  }
  return hs
}

export function strumPattern(id: string) {
  return STRUMS.find(s => s.id === id) ?? STRUMS[3]
}
