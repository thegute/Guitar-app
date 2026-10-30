// Turn a chord progression into a tab you can play along with: Travis picking, arpeggio (fingerpicking) patterns
// or strum-along chords. Each chord's shape decides the strings: the thumb plays the bass (root, then the
// alternate bass string), the fingers pick the top strings.
import type { Voicing } from '../theory/chords'
import { pc } from '../theory/notes'
const pcOf = (name: string) => pc(name)
import type { Song, SongBar, SongNote, SongStep } from './model'

/** R root bass · A alternate bass · f1/f2/f3 the three highest strings of the shape (f3 = top) · C the whole chord ·
 *  T the treble strings only (the "chick" of boom-chick) */
export type Role = 'R' | 'A' | 'f1' | 'f2' | 'f3' | 'C' | 'T'
type PHit = [number, Role[]]
export interface PickPattern {
  id: string; group: 'travis' | 'arpeggio' | 'strum' | 'bluegrass' | 'reggae'; label: string; how: string; hits: PHit[]
  /** length of one pass of the pattern in beats (3 for waltzes; default 4) */
  beats?: number
  /** bluegrass: walk the bass up or down into the next chord */
  walk?: boolean
  /** reggae: play short chops on a small shape on the top three strings instead of the open chord */
  chop?: boolean
}

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
  { id: 'falling', group: 'arpeggio', label: 'Falling arpeggio (p-a-m-i)', how: 'Bass, then the top string, the 2nd and the 3rd: the notes fall like rain. Let every one ring.',
    hits: [h(0, 'R'), h(0.5, 'f3'), h(1, 'f2'), h(1.5, 'f1'), h(2, 'A'), h(2.5, 'f3'), h(3, 'f2'), h(3.5, 'f1')] },
  { id: 'arp-pinch', group: 'arpeggio', label: 'Pinch and ripple', how: 'Bass and top string together, then the middle strings ripple: a pretty pattern for slow songs.',
    hits: [h(0, 'R', 'f3'), h(0.5, 'f1'), h(1, 'f2'), h(1.5, 'f1'), h(2, 'A', 'f3'), h(2.5, 'f1'), h(3, 'f2'), h(3.5, 'f1')] },
  // bluegrass / folk rhythm guitar
  { id: 'boomchick', group: 'bluegrass', label: 'Boom-chick (bass and strum)', how: 'Bass note on 1, a short strum of the top strings on 2, the other bass note on 3, strum on 4. Walks the bass into the next chord.',
    hits: [h(0, 'R'), h(1, 'T'), h(2, 'A'), h(3, 'T')], walk: true },
  { id: 'carter', group: 'bluegrass', label: 'Boom-chicka (bass, down-up)', how: 'Like boom-chick, but each strum is a quick down-up ("chick-a"). The engine of bluegrass and old-time rhythm.',
    hits: [h(0, 'R'), h(1, 'T'), h(1.5, 'T'), h(2, 'A'), h(3, 'T'), h(3.5, 'T')], walk: true },
  { id: 'waltz', group: 'bluegrass', label: 'Waltz (bass, strum, strum)', how: 'For songs in 3: bass note on 1, strums on 2 and 3. Alternate the bass note each bar.',
    hits: [h(0, 'R'), h(1, 'T'), h(2, 'T'), h(3, 'A'), h(4, 'T'), h(5, 'T')], beats: 6 },
  { id: 'cross', group: 'bluegrass', label: 'Crosspicking (3-3-2 roll)', how: 'A flatpick roll across three strings: low, middle, high, in groups of 3-3-2, so the chord rings like a banjo or a mandolin.',
    hits: [h(0, 'R'), h(0.5, 'f2'), h(1, 'f3'), h(1.5, 'A'), h(2, 'f2'), h(2.5, 'f3'), h(3, 'A'), h(3.5, 'f3')] },
  // reggae: chops on a small shape up the neck, let go right after so they're short
  { id: 'onedrop', group: 'reggae', label: 'One drop chops (2 and 4)', how: 'A short, crisp chop on beats 2 and 4, nothing on 1 and 3. Let the fretting hand relax right after each chop to cut it off.',
    hits: [h(1, 'C'), h(3, 'C')], chop: true },
  { id: 'rockers', group: 'reggae', label: 'Skank on every "and"', how: 'Count 1-and-2-and: chop on every "and". Light, quick upstrokes or downstrokes, muted straight away.',
    hits: [h(0.5, 'C'), h(1.5, 'C'), h(2.5, 'C'), h(3.5, 'C')], chop: true },
  { id: 'double', group: 'reggae', label: 'Double chop (steppers)', how: 'Two fast chops on beats 2 and 4 ("chk-a"), the second right behind the first. Keep them short and even.',
    hits: [h(1, 'C'), h(1.25, 'C'), h(3, 'C'), h(3.25, 'C')], chop: true },
  { id: 'ska', group: 'reggae', label: 'Ska upstrokes', how: 'Fast upstrokes on every "and", a bit longer and brighter than reggae chops. Keep your strumming hand moving down-up all the time.',
    hits: [h(0.5, 'C'), h(1.5, 'C'), h(2.5, 'C'), h(3.5, 'C')], chop: true },
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
export function roleStrings(v: Voicing, tuning: number[], root: string): Record<Exclude<Role, 'C' | 'T'>, { string: number; fret: number }> {
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

/** A small chord shape on the top three strings, near `near` (reggae chops): every chord tone, within four frets. */
export function chopShape(pcs: number[], tuning: number[], near = 6): number[] | null {
  const n = tuning.length
  const top = [n - 3, n - 2, n - 1]
  const want = new Set(pcs.slice(0, 3))
  let best: { frets: number[]; score: number } | null = null
  for (let a = 1; a <= 14; a++) for (let b = 1; b <= 14; b++) for (let c = 1; c <= 14; c++) {
    const fs = [a, b, c]
    if (Math.max(...fs) - Math.min(...fs) > 3) continue
    const got = top.map((s, k) => (tuning[s] + fs[k]) % 12)
    if (!got.every(g => want.has(g)) || new Set(got).size < Math.min(3, want.size)) continue
    const score = Math.abs((a + b + c) / 3 - near) + (Math.max(...fs) - Math.min(...fs)) * 0.3
    if (!best || score < best.score) best = { frets: fs, score }
  }
  if (!best) return null
  return tuning.map((_, s) => (s < n - 3 ? -1 : best!.frets[s - (n - 3)]))
}

/** A bass note for this pitch class low on the neck (frets 0–4 on the bass strings). */
function bassAt(midi: number, tuning: number[]): { string: number; fret: number } | null {
  for (let s = 0; s < Math.min(3, tuning.length); s++) {
    const f = midi - tuning[s]
    if (f >= 0 && f <= 4) return { string: s, fret: f }
  }
  return null
}

/** Two notes walking from one bass note toward the next chord's root, on the key's scale. */
export function bassWalk(from: number, toPc: number, scalePcs: number[], tuning: number[]): number[] {
  const low = tuning[0]
  // the target root nearest the starting note, inside the bass range
  const cands = [-12, 0, 12].map(o => from + ((((toPc - from) % 12) + 12) % 12) + o - 12).filter(m => m >= low && m <= low + 14)
  if (!cands.length) return []
  const to = cands.reduce((a, b) => (Math.abs(b - from) < Math.abs(a - from) ? b : a))
  if (to === from) return []
  const dir = to > from ? 1 : -1
  const steps: number[] = []
  for (let m = to - dir; m !== from && steps.length < 2; m -= dir) if (scalePcs.includes(((m % 12) + 12) % 12)) steps.unshift(m)
  return steps.length === 2 ? steps : []
}

/** The progression as a tab in the chosen pattern, played `times` times through. */
export function pickingSong(chords: PickChord[], patternId: string, tuning: number[],
  opts: { title?: string; bpm?: number; times?: number; meter?: number; scale?: number[]; program?: number } = {}): Song {
  const pat = pickPattern(patternId)
  const times = Math.max(1, opts.times ?? 2)
  const meter = opts.meter ?? (pat.beats === 6 ? 3 : 4)
  const span = pat.beats ?? 4
  // every note on one timeline (beats from the start)
  const events: { at: number; notes: SongNote[]; chord?: string }[] = []
  const seq = Array.from({ length: times }, () => chords).flat()
  let t = 0
  seq.forEach((c, ci) => {
    let v = c.voicing
    if (pat.chop) {
      const pcs = [...new Set(v.frets.map((f, s) => (f >= 0 ? (tuning[s] + f) % 12 : -1)).filter(x => x >= 0))]
      // root, then the other tones (a 7th chord's chop keeps root, third and seventh's neighbours as they fall)
      const root = pcOf(c.root)
      const ordered = [root, ...pcs.filter(x => x !== root)]
      const frets = chopShape(ordered, tuning)
      if (frets) v = { ...v, frets }
    }
    const roles = roleStrings(v, tuning, c.root)
    const all = v.frets.map((f, s) => (f >= 0 ? { string: s, fret: f, midi: tuning[s] + f } : null)).filter((n): n is SongNote => !!n)
    const treble = all.filter(n => n.string >= Math.max(0, tuning.length - 4))
    const beats = c.beats || 4
    // bass walk into the next chord over the last two beats (bluegrass), when this chord lasts a bar or more
    const next = seq[ci + 1]
    let walk: number[] = []
    if (pat.walk && next && next.root !== c.root && beats >= 4 && opts.scale) {
      walk = bassWalk(tuning[roles.R.string] + roles.R.fret, pcOf(next.root), opts.scale, tuning)
    }
    let first = true
    for (let off = 0; off < beats; off += span) {
      for (const [b, rs] of pat.hits) {
        if (off + b >= beats) continue
        const notes: SongNote[] = []
        const at = off + b
        // the walk replaces the last two beats' hits with single bass notes
        if (walk.length === 2 && at >= beats - 2) {
          if (at === beats - 2 || at === beats - 1) {
            const w = bassAt(walk[at - (beats - 2)], tuning)
            if (w) { events.push({ at: t + at, notes: [{ string: w.string, fret: w.fret, midi: tuning[w.string] + w.fret }] }); first = false }
          }
          continue
        }
        for (const r of rs) {
          if (r === 'C') { notes.push(...all.filter(n => !notes.some(x => x.string === n.string))); continue }
          if (r === 'T') { notes.push(...(treble.length >= 2 ? treble : all).filter(n => !notes.some(x => x.string === n.string))); continue }
          const p = roles[r]
          if (!notes.some(n => n.string === p.string)) notes.push({ string: p.string, fret: p.fret, midi: tuning[p.string] + p.fret })
        }
        events.push({ at: t + at, notes: notes.sort((x, y) => x.string - y.string), chord: first ? c.name : undefined })
        first = false
      }
    }
    t += beats
  })
  // cut into bars; each step lasts until the next note (or the bar line)
  const total = Math.ceil(t / meter) * meter
  const bars: SongBar[] = []
  for (let b0 = 0; b0 < total; b0 += meter) {
    const inBar = events.filter(e => e.at >= b0 && e.at < b0 + meter)
    const steps: SongStep[] = []
    if (!inBar.length || inBar[0].at > b0) steps.push({ notes: [], dur: (inBar[0]?.at ?? b0 + meter) - b0 })
    inBar.forEach((e, i) => {
      const end = i + 1 < inBar.length ? inBar[i + 1].at : b0 + meter
      steps.push({ notes: e.notes, dur: Math.round((end - e.at) * 1000) / 1000, ...(e.chord ? { chord: e.chord } : {}) })
    })
    bars.push({ steps })
  }
  return {
    title: opts.title ?? `${pat.label}: ${chords.map(c => c.name).join(' – ')}`,
    tempo: opts.bpm ?? 80,
    meter,
    tracks: [{ name: pat.label, tuning, capo: 0, bars, program: opts.program ?? (pat.chop ? 27 : 25) }],
  }
}
