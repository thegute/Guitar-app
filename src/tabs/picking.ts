// Turn a chord progression into a tab you can play along with: Travis picking, arpeggio (fingerpicking) patterns
// or strum-along chords. Each chord's shape decides the strings: the thumb plays the bass (root, then the
// alternate bass string), the fingers pick the top strings.
import type { Voicing } from '../theory/chords'
import { pc } from '../theory/notes'
import type { Song, SongBar, SongNote, SongStep } from './model'

/** R root bass · A alternate bass · f1/f2/f3 the three highest strings of the shape (f3 = top) · C the whole chord */
export type Role = 'R' | 'A' | 'f1' | 'f2' | 'f3' | 'C'
type PHit = [number, Role[]]
export interface PickPattern { id: string; group: 'travis' | 'arpeggio' | 'strum'; label: string; how: string; hits: PHit[] }

const h = (b: number, ...r: Role[]): PHit => [b, r]
export const PICK_PATTERNS: PickPattern[] = [
  // Travis picking: the thumb keeps a steady alternating bass on every beat
  { id: 'thumb', group: 'travis', label: 'Alternating thumb (start here)', how: 'Thumb only: the root on beats 1 and 3, the other bass string on 2 and 4. Get it steady before adding fingers.',
    hits: [h(0, 'R'), h(1, 'A'), h(2, 'R'), h(3, 'A')] },
  { id: 'travis', group: 'travis', label: 'Basic Travis', how: 'Thumb on every beat, fingers in between: top string, then the 2nd string. Keep the thumb going no matter what.',
    hits: [h(0, 'R'), h(0.5, 'f3'), h(1, 'A'), h(1.5, 'f2'), h(2, 'R'), h(2.5, 'f3'), h(3, 'A'), h(3.5, 'f2')] },
  { id: 'pinch', group: 'travis', label: 'Pinch on beat 1', how: 'Thumb and finger together on beat 1 (a "pinch"), then the basic pattern. The pinch makes the top note ring like a melody.',
    hits: [h(0, 'R', 'f3'), h(1, 'A'), h(1.5, 'f2'), h(2, 'R'), h(2.5, 'f3'), h(3, 'A'), h(3.5, 'f2')] },
  { id: 'pinch2', group: 'travis', label: 'Pinches on 1 and 3', how: 'Pinch on beats 1 and 3, single finger notes after beats 2 and 4. Very common in folk and country.',
    hits: [h(0, 'R', 'f3'), h(1, 'A'), h(1.5, 'f2'), h(2, 'R', 'f3'), h(3, 'A'), h(3.5, 'f2')] },
  { id: 'three', group: 'travis', label: 'Three-finger Travis', how: 'Uses all three top strings between the bass notes: 3rd string, 2nd, top, 2nd.',
    hits: [h(0, 'R'), h(0.5, 'f1'), h(1, 'A'), h(1.5, 'f2'), h(2, 'R'), h(2.5, 'f3'), h(3, 'A'), h(3.5, 'f2')] },
  { id: 'synco', group: 'travis', label: 'Syncopated Travis', how: 'The finger notes jump ahead of the beat (the "and" of 2 and 4 get the top string), giving that bouncy, rolling feel.',
    hits: [h(0, 'R', 'f2'), h(0.5, 'f3'), h(1, 'A'), h(1.5, 'f3'), h(2, 'R'), h(2.5, 'f2'), h(3, 'A'), h(3.5, 'f3')] },
  { id: 'roll', group: 'travis', label: 'Rolling 3-3-2', how: 'Thumb, index, middle in groups of 3-3-2: the forward roll of banjo players, great over slow chords.',
    hits: [h(0, 'R'), h(0.5, 'f2'), h(1, 'f3'), h(1.5, 'A'), h(2, 'f2'), h(2.5, 'f3'), h(3, 'R'), h(3.5, 'f3')] },
  // arpeggio / fingerpicking
  { id: 'arp-up', group: 'arpeggio', label: 'Rising arpeggio', how: 'Bass, then each string upwards. Let every note ring into the next.',
    hits: [h(0, 'R'), h(0.5, 'f1'), h(1, 'f2'), h(1.5, 'f3'), h(2, 'A'), h(2.5, 'f1'), h(3, 'f2'), h(3.5, 'f3')] },
  { id: 'arp-updown', group: 'arpeggio', label: 'Up and down (ballad)', how: 'Bass, up the strings and back down. The classic ballad pattern (p-i-m-a-m-i).',
    hits: [h(0, 'R'), h(0.5, 'f1'), h(1, 'f2'), h(1.5, 'f3'), h(2, 'f2'), h(2.5, 'f1'), h(3, 'A'), h(3.5, 'f1')] },
  { id: 'arp-broken', group: 'arpeggio', label: 'Broken chord, alternating bass', how: 'Bass on 1 and 3 with the 3rd and 2nd strings rocking in between.',
    hits: [h(0, 'R'), h(0.5, 'f1'), h(1, 'f2'), h(1.5, 'f1'), h(2, 'A'), h(2.5, 'f1'), h(3, 'f2'), h(3.5, 'f1')] },
  { id: 'arp-16', group: 'arpeggio', label: 'Sixteenth-note roll', how: 'Four quick notes per beat, rising: bass, 3rd, 2nd, top string. Start slow.',
    hits: [0, 1, 2, 3].flatMap(b => [h(b, b % 2 ? 'A' : 'R'), h(b + 0.25, 'f1'), h(b + 0.5, 'f2'), h(b + 0.75, 'f3')]) },
  { id: 'arp-pinch', group: 'arpeggio', label: 'Pinch and ripple', how: 'Bass and top string together, then the middle strings ripple: a pretty pattern for slow songs.',
    hits: [h(0, 'R', 'f3'), h(0.5, 'f1'), h(1, 'f2'), h(1.5, 'f1'), h(2, 'A', 'f3'), h(2.5, 'f1'), h(3, 'f2'), h(3.5, 'f1')] },
  // strum along
  { id: 'strum', group: 'strum', label: 'Strum along (one strum per beat)', how: 'Strum the whole chord on every beat. The app listens for all the chord\'s notes.',
    hits: [h(0, 'C'), h(1, 'C'), h(2, 'C'), h(3, 'C')] },
]
export const pickPattern = (id: string) => PICK_PATTERNS.find(p => p.id === id) ?? PICK_PATTERNS[1]
/** Jam's strum pattern ids → the nearest tab pattern */
export function patternForStrum(strumId: string) {
  return strumId === 'travis' ? 'travis' : strumId === 'arpeggio' ? 'arp-updown' : strumId === 'bossa' ? 'pinch2' : strumId === 'country' ? 'thumb' : 'travis'
}

export interface PickChord { name: string; root: string; voicing: Voicing; beats: number }

/** Which string plays each role for one chord shape. */
export function roleStrings(v: Voicing, tuning: number[], root: string): Record<Exclude<Role, 'C'>, { string: number; fret: number }> {
  const frets = v.frets
  const played = frets.map((f, s) => (f >= 0 ? s : -1)).filter(s => s >= 0)
  const nFing = tuning.length >= 6 ? 3 : 2
  const fingers = played.slice(-nFing)
  const thumbs = played.filter(s => !fingers.includes(s))
  const at = (s: number) => ({ string: s, fret: frets[s] })
  const rootPc = pc(root)
  const chordPcs = new Set(played.map(s => (tuning[s] + frets[s]) % 12))
  const lowest = (a: number[]) => [...a].sort((x, y) => tuning[x] + frets[x] - (tuning[y] + frets[y]))
  const rs = lowest(thumbs.length ? thumbs : played)
  const R = rs.find(s => (tuning[s] + frets[s]) % 12 === rootPc) ?? rs[0]
  // alternate bass: E-shape roots jump to the 4th string, others use the next string up; if the shape has no
  // other bass string, borrow an open string next to the root when it's a chord note
  let A = R
  const others = thumbs.filter(s => s !== R)
  if (R === 0 && others.includes(2)) A = 2
  else if (others.includes(R + 1)) A = R + 1
  else if (others.length) A = others[0]
  else {
    for (const s of [R - 1, R + 1]) {
      if (s >= 0 && s < tuning.length && !fingers.includes(s) && frets[s] < 0 && chordPcs.has(tuning[s] % 12)) { A = s; break }
    }
  }
  const aAt = A !== R && frets[A] < 0 ? { string: A, fret: 0 } : at(A)
  const f = fingers.length ? fingers : played
  return {
    R: at(R), A: aAt,
    f3: at(f[f.length - 1]),
    f2: at(f[Math.max(0, f.length - 2)]),
    f1: at(f[Math.max(0, f.length - 3)]),
  }
}

/** The progression as a tab in the chosen pattern, played `times` times through. */
export function pickingSong(chords: PickChord[], patternId: string, tuning: number[], opts: { title?: string; bpm?: number; times?: number } = {}): Song {
  const pat = pickPattern(patternId)
  const times = Math.max(1, opts.times ?? 2)
  // every note on one timeline (beats from the start)
  const events: { at: number; notes: SongNote[]; chord?: string }[] = []
  let t = 0
  for (let rep = 0; rep < times; rep++) {
    for (const c of chords) {
      const roles = roleStrings(c.voicing, tuning, c.root)
      const all = c.voicing.frets.map((f, s) => (f >= 0 ? { string: s, fret: f, midi: tuning[s] + f } : null)).filter((n): n is SongNote => !!n)
      const beats = c.beats || 4
      let first = true
      for (let off = 0; off < beats; off += 4) {
        for (const [b, rs] of pat.hits) {
          if (off + b >= beats) continue
          const notes: SongNote[] = []
          for (const r of rs) {
            if (r === 'C') { notes.push(...all); continue }
            const p = roles[r]
            if (!notes.some(n => n.string === p.string)) notes.push({ string: p.string, fret: p.fret, midi: tuning[p.string] + p.fret })
          }
          events.push({ at: t + off + b, notes: notes.sort((x, y) => x.string - y.string), chord: first ? c.name : undefined })
          first = false
        }
      }
      t += beats
    }
  }
  // cut into 4/4 bars; each step lasts until the next note (or the bar line)
  const total = Math.ceil(t / 4) * 4
  const bars: SongBar[] = []
  for (let b0 = 0; b0 < total; b0 += 4) {
    const inBar = events.filter(e => e.at >= b0 && e.at < b0 + 4)
    const steps: SongStep[] = []
    if (!inBar.length || inBar[0].at > b0) steps.push({ notes: [], dur: (inBar[0]?.at ?? b0 + 4) - b0 })
    inBar.forEach((e, i) => {
      const end = i + 1 < inBar.length ? inBar[i + 1].at : b0 + 4
      steps.push({ notes: e.notes, dur: Math.round((end - e.at) * 1000) / 1000, ...(e.chord ? { chord: e.chord } : {}) })
    })
    bars.push({ steps })
  }
  return {
    title: opts.title ?? `${pat.label}: ${chords.map(c => c.name).join(' – ')}`,
    tempo: opts.bpm ?? 80,
    tracks: [{ name: pat.label, tuning, capo: 0, bars }],
  }
}
