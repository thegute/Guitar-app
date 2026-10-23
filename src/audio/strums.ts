// Strumming and picking patterns for the backing guitar.
import { playNote } from './pluck'

/**
 * Hit kinds: D down strum, U up strum, B bass note (root), A alternate bass (next string up),
 * a1..a6 single note from the chord (low to high), X muted chuck, P palm-muted power chug, S short (staccato) chord.
 */
type Kind = 'D' | 'U' | 'B' | 'A' | 'X' | 'P' | 'S' | `a${number}`
type Hit = [number, Kind]

const ARP: Hit[] = [[0, 'B'], [0.5, 'a3'], [1, 'a4'], [1.5, 'a5'], [2, 'a6'], [2.5, 'a5'], [3, 'a4'], [3.5, 'a3']]

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
  { id: 'rumba', label: 'Rumba / flamenco', hits: [[0, 'D'], [0.5, 'X'], [0.75, 'U'], [1, 'D'], [1.5, 'U'], [2, 'D'], [2.5, 'X'], [2.75, 'U'], [3, 'D'], [3.5, 'U']] },
]

export interface Handle { stop: (at?: number) => void }

/** Play one hit of a pattern for a chord voicing (midis low → high). */
export function playHit(kind: Kind, midis: number[], when: number, gain: number, dest?: AudioNode): Handle[] {
  if (!midis.length) return []
  const hs: Handle[] = []
  const strum = (notes: number[], up: boolean, g: number, spread = 0.014) => {
    const order = up ? [...notes].reverse() : notes
    order.forEach((m, i) => hs.push(playNote(m, when + i * spread, g, dest)))
  }
  switch (kind) {
    case 'D':
      strum(midis, false, gain)
      break
    case 'U':
      strum(midis.slice(-4), true, gain * 0.7, 0.01)
      break
    case 'S': {
      strum(midis.length > 3 ? midis.slice(-4) : midis, false, gain * 0.8, 0.008)
      const end = when + 0.16
      hs.forEach(h => h.stop(end))
      break
    }
    case 'X': {
      // muted chuck: a very short strum
      strum(midis.slice(-4), false, gain * 0.35, 0.004)
      hs.forEach(h => h.stop(when + 0.035))
      break
    }
    case 'P': {
      strum(midis.slice(0, Math.min(3, midis.length)), false, gain * 0.85, 0.004)
      hs.forEach(h => h.stop(when + 0.11))
      break
    }
    case 'B':
      hs.push(playNote(midis[0], when, gain * 0.95, dest))
      break
    case 'A':
      hs.push(playNote(midis[Math.min(1, midis.length - 1)], when, gain * 0.85, dest))
      break
    default: {
      // aN: the Nth note counted from the top so it works for 4, 5 or 6-string voicings
      const n = parseInt(kind.slice(1), 10)
      const idx = Math.max(0, midis.length - (7 - n))
      hs.push(playNote(midis[Math.min(idx, midis.length - 1)], when, gain * 0.8, dest))
    }
  }
  return hs
}

export function strumPattern(id: string) {
  return STRUMS.find(s => s.id === id) ?? STRUMS[3]
}
