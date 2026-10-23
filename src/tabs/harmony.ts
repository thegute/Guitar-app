// Chords inside a tab: reading chord names, guessing chords from notes, and how one chord connects to the next.
import { Chord, Scale } from 'tonal'
import { FLATS, SHARPS, pc } from '../theory/notes'
import type { SongTrack } from './model'
import { flatten } from './model'
import type { KeyGuess } from './keyDetect'

export interface ChordInfo {
  name: string
  root: number
  pcs: number[]
  /** chord-tone label per pitch class: R, b3, 3, 5, b7 ... */
  labels: Map<number, string>
  /** the chord's 3rd (or 4th/2nd for sus chords) */
  third: number | null
  seventh: number | null
  /** root, 3rd, 5th only */
  triad: number[]
}

function toneLabel(iv: string): string {
  const m = /^(\d+)([PMmdA]+)$/.exec(iv)
  if (!m) return '?'
  let num = parseInt(m[1], 10)
  if (num === 1 || num === 8) return 'R'
  if (num > 13) num -= 7
  const q = m[2]
  const perfect = [4, 5, 11, 12].includes(num)
  const acc = q === 'm' ? 'b' : q === 'd' ? (perfect ? 'b' : 'bb') : q === 'A' ? '#' : q === 'dd' ? 'bb' : ''
  if (num === 7 && q === 'd') return '6' // diminished 7th reads as a 6th on the neck
  return acc + num
}

const cache = new Map<string, ChordInfo | null>()

/** Read a chord name (Am7, C/G, F#m7b5, Dsus4 ...). Returns null for "N.C." or unreadable names. */
export function chordInfo(name: string): ChordInfo | null {
  if (cache.has(name)) return cache.get(name)!
  const main = name.split('/')[0].trim()
  const tries = [main, main.replace(/[()]/g, ''), main.replace(/\(maj7\)/i, 'Maj7'), /^[A-G][#b]?m(?!aj)/.test(main) ? main.slice(0, main.search(/m/) + 1) : (/^[A-G][#b]?/.exec(main)?.[0] ?? '')]
  let res: ChordInfo | null = null
  for (const t of tries) {
    if (!t) continue
    const c = Chord.get(t)
    if (c.empty || !c.tonic) continue
    const root = pc(c.tonic)
    const labels = new Map<number, string>()
    const pcs: number[] = []
    let third: number | null = null
    let seventh: number | null = null
    let fifth: number | null = null
    c.intervals.forEach((iv, i) => {
      const p = pc(c.notes[i])
      if (labels.has(p)) return
      const l = toneLabel(iv)
      labels.set(p, l)
      pcs.push(p)
      if (/^(b3|3|4|2)$/.test(l) && third === null) third = p
      if (/^(b5|5|#5)$/.test(l)) fifth = p
      if (/^(b7|7|6)$/.test(l) && /^7/.test(iv)) seventh = p
    })
    const triad = [root, third, fifth].filter((x): x is number => x !== null)
    res = { name, root, pcs, labels, third, seventh, triad }
    break
  }
  cache.set(name, res)
  return res
}

// ---------- guessing chords from the notes in each bar ----------

const TYPES: { suffix: string; ivs: number[]; cost: number }[] = [
  { suffix: '', ivs: [0, 4, 7], cost: 0 },
  { suffix: 'm', ivs: [0, 3, 7], cost: 0 },
  { suffix: '7', ivs: [0, 4, 7, 10], cost: 0.14 },
  { suffix: 'm7', ivs: [0, 3, 7, 10], cost: 0.18 },
  { suffix: 'maj7', ivs: [0, 4, 7, 11], cost: 0.2 },
  { suffix: 'dim', ivs: [0, 3, 6], cost: 0.12 },
  { suffix: 'sus4', ivs: [0, 5, 7], cost: 0.35 },
  { suffix: '5', ivs: [0, 7], cost: 0.05 },
]

export function keyScalePcs(key: KeyGuess): number[] {
  return Scale.get(`${key.root} ${key.minor ? 'aeolian' : 'major'}`).notes.map(pc)
}

/** Best chord for one bar (or null when the bar is empty). */
// how likely each scale degree's chord is in ordinary songs (I, IV, V and vi most of all)
const MAJOR_PRIOR = [0.2, 0.06, 0, 0.15, 0.17, 0.1, -0.1]
const MINOR_PRIOR = [0.2, -0.05, 0.08, 0.14, 0.12, 0.1, 0.1]

function guessChord(w: number[], bass: number | null, key: KeyGuess | null, flats: boolean, powerChords: boolean): string | null {
  const total = w.reduce((a, b) => a + b, 0)
  if (total < 1e-6) return null
  const scale = key ? keyScalePcs(key) : null
  const inKey = scale ? new Set(scale) : null
  const distinct = w.filter(x => x > 0).length
  let best: { name: string; score: number } | null = null
  for (let r = 0; r < 12; r++) {
    for (const t of TYPES) {
      if (t.suffix === '5' && (!powerChords || distinct > 2)) continue
      // colour chords (7ths, sus, dim, power) only when their root is actually played
      if (t.suffix !== '' && t.suffix !== 'm' && w[r] === 0) continue
      const pcs = t.ivs.map(i => (r + i) % 12)
      let inside = 0
      for (const p of pcs) inside += w[p]
      const outside = total - inside
      let score = (inside - 0.8 * outside) / total - t.cost
      // every chord tone missing costs a little (except the 5th)
      for (let k = 1; k < pcs.length; k++) if (w[pcs[k]] === 0 && t.ivs[k] !== 7) score -= 0.12
      if (w[r] === 0) score -= 0.12
      if (bass === r) score += 0.2
      if (inKey && scale && pcs.every(p => inKey.has(p))) {
        score += 0.12
        const deg = scale.indexOf(r)
        if (deg >= 0) score += (key!.minor ? MINOR_PRIOR : MAJOR_PRIOR)[deg]
      }
      // the major V in a minor key (E in A minor) is common too
      if (key?.minor && scale && r === (scale[0] + 7) % 12 && t.ivs[1] === 4) score += 0.2
      if (!best || score > best.score) best = { name: (flats ? FLATS : SHARPS)[r] + t.suffix, score }
    }
  }
  return best && best.score > 0.05 ? best.name : null
}

export function guessBarChords(track: SongTrack, key: KeyGuess | null, flats: boolean): (string | null)[] {
  return track.bars.map(bar => {
    const w = new Array(12).fill(0)
    let low = Infinity
    const sounding = bar.steps.filter(s => s.notes.some(n => n.tech !== 'x'))
    const power = sounding.length > 0 && sounding.every(s => s.notes.length >= 2)
    bar.steps.forEach((s, i) => {
      for (const n of s.notes) {
        if (n.tech === 'x') continue
        // longer notes and the first note of the bar say most about the chord
        w[n.midi % 12] += Math.max(0.25, Math.min(s.dur, 2)) * (i === 0 ? 1.5 : 1)
        // only notes on the three bass strings count as a bass note
        if (n.string <= 2) low = Math.min(low, n.midi)
      }
    })
    return guessChord(w, low < Infinity ? low % 12 : null, key, flats, power)
  })
}

// ---------- the chord at each point in the song ----------

export type ChordSource = 'tab' | 'guess' | 'you'
export interface ChordSpan {
  name: string
  source: ChordSource
  /** first flat step index of this chord */
  start: number
  /** flat step index after the last one */
  end: number
  bar: number
}

/**
 * Builds the song's chord progression: your own edits first, then chord names written in the tab,
 * then guesses from the notes. Returns the spans and a lookup from step index to span index.
 */
export function chordTimeline(track: SongTrack, edits: Record<number, string>, guesses: (string | null)[]): { spans: ChordSpan[]; at: Int32Array } {
  const flat = flatten(track)
  const tabHasChords = flat.some(f => f.step.chord)
  const at = new Int32Array(flat.length).fill(-1)
  const spans: ChordSpan[] = []
  let cur: { name: string; source: ChordSource } | null = null
  flat.forEach((f, i) => {
    let next = cur
    if (edits[f.bar] !== undefined) {
      // your edit replaces everything in that bar ('' means no chord)
      if (f.idx === 0) next = edits[f.bar] ? { name: edits[f.bar], source: 'you' } : null
    } else if (f.step.chord) next = { name: f.step.chord, source: 'tab' }
    else if (!tabHasChords && f.idx === 0 && guesses[f.bar]) next = { name: guesses[f.bar]!, source: 'guess' }
    if ((next?.name ?? null) !== (cur?.name ?? null)) {
      const last = spans[spans.length - 1]
      if (last && last.end === flat.length) last.end = i
      if (next) spans.push({ name: next.name, source: next.source, start: i, end: flat.length, bar: f.bar })
    }
    cur = next
    if (cur) at[i] = spans.length - 1
  })
  return { spans, at }
}

// ---------- connecting one chord to the next ----------

export interface Move {
  from: number
  to: number
  /** semitones, negative = down */
  by: number
  fromLabel: string
  toLabel: string
}
export function voiceLeading(a: ChordInfo, b: ChordInfo): { common: number[]; moves: Move[] } {
  const common = a.pcs.filter(p => b.pcs.includes(p))
  const moves: Move[] = []
  for (const p of a.pcs) {
    if (common.includes(p)) continue
    let best = { to: b.root, by: 99 }
    for (const q of b.pcs) {
      let d = (q - p + 12) % 12
      if (d > 6) d -= 12
      if (Math.abs(d) < Math.abs(best.by) || (Math.abs(d) === Math.abs(best.by) && d > 0)) best = { to: q, by: d }
    }
    moves.push({ from: p, to: best.to, by: best.by, fromLabel: a.labels.get(p) ?? '', toLabel: b.labels.get(best.to) ?? '' })
  }
  return { common, moves }
}

/** Positions (string, fret) of closed triad shapes for a chord on three neighbouring strings. */
export function triadShapes(c: ChordInfo, low: number, tuning: number[], maxFret = 15): Set<string> {
  const pcs = c.triad.length >= 3 ? c.triad : c.pcs.slice(0, 3)
  const want = new Set(pcs)
  const out = new Set<string>()
  const strs = [low, low + 1, low + 2]
  if (strs[2] >= tuning.length) return out
  const options = strs.map(s => {
    const fs: number[] = []
    for (let f = 0; f <= maxFret; f++) if (want.has((tuning[s] + f) % 12)) fs.push(f)
    return fs
  })
  for (const a of options[0])
    for (const b of options[1])
      for (const d of options[2]) {
        const fr = [a, b, d]
        const fretted = fr.filter(f => f > 0)
        const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0
        if (span > 4) continue
        if (fretted.length && fr.some(f => f === 0) && Math.max(...fretted) > 5) continue
        const got = new Set(fr.map((f, i) => (tuning[strs[i]] + f) % 12))
        if (got.size !== want.size) continue
        fr.forEach((f, i) => out.add(`${strs[i]}-${f}`))
      }
  return out
}

export interface WalkNote {
  string: number
  fret: number
  midi: number
}

/**
 * A short line of notes that walks from a tone of the current chord to the 3rd (or root) of the next chord,
 * through the notes of the key, played within one hand position.
 */
export function connectingWalk(a: ChordInfo, b: ChordInfo, keyPcs: number[], tuning: number[], lo: number, hi: number): WalkNote[] {
  // the key's notes, adjusted to fit the chord you are heading to (plus the tones of the chord you are leaving)
  const allowed = new Set([...chordScale(b, keyPcs, false).pcs, ...a.pcs])
  const pos: WalkNote[] = []
  for (let s = 0; s < tuning.length; s++)
    for (let f = lo; f <= hi; f++) {
      const m = tuning[s] + f
      if (allowed.has(m % 12)) pos.push({ string: s, fret: f, midi: m })
    }
  const target = b.third ?? b.root
  let best: { notes: WalkNote[]; score: number } | null = null
  for (const t of pos.filter(p => p.midi % 12 === target)) {
    for (const st of pos.filter(p => a.pcs.includes(p.midi % 12))) {
      const dist = t.midi - st.midi
      if (Math.abs(dist) < 2 || Math.abs(dist) > 7) continue
      const dir = Math.sign(dist)
      // pitches in between that belong to the scale
      const pitches: number[] = [st.midi]
      for (let m = st.midi + dir; m !== t.midi; m += dir) if (allowed.has(((m % 12) + 12) % 12)) pitches.push(m)
      pitches.push(t.midi)
      if (pitches.length < 3 || pitches.length > 6) continue
      // place each pitch on the neck, staying close to the previous finger
      const line: WalkNote[] = [st]
      let ok = true
      for (let k = 1; k < pitches.length; k++) {
        const cands = pos.filter(p => p.midi === pitches[k])
        if (!cands.length) { ok = false; break }
        const prev = line[line.length - 1]
        cands.sort((x, y) => Math.abs(x.string - prev.string) * 2 + Math.abs(x.fret - prev.fret) - (Math.abs(y.string - prev.string) * 2 + Math.abs(y.fret - prev.fret)))
        line.push(k === pitches.length - 1 ? t : cands[0])
      }
      if (!ok) continue
      let score = -Math.abs(pitches.length - 4)
      const startLabel = a.labels.get(st.midi % 12)
      if (startLabel === 'R' || startLabel === '3' || startLabel === 'b3') score += 0.6
      if (t.string >= 2) score += 0.5
      if (st.string >= 2) score += 0.3
      score -= Math.abs(t.string - st.string) * 0.15
      if (!best || score > best.score) best = { notes: line, score }
    }
  }
  return best?.notes ?? []
}

/** Hand position (5-fret window) used for the tab around a step. */
export function handWindow(frets: number[]): [number, number] {
  const fretted = frets.filter(f => f > 0).sort((a, b) => a - b)
  if (!fretted.length) return [0, 4]
  const med = fretted[Math.floor(fretted.length / 2)]
  if (med <= 4) return [0, 4]
  const lo = Math.max(1, med - 2)
  return [lo, lo + 4]
}

/**
 * The notes to solo with over one chord: the key's scale, with any note that clashes with the chord
 * (a half step from a chord tone) swapped for the chord tone. Over E major in A minor you get
 * A harmonic minor, i.e. E Phrygian dominant.
 */
export function chordScale(c: ChordInfo, keyPcs: number[], flats: boolean): { pcs: number[]; name: string } {
  const set = new Set(keyPcs)
  const keep = (n: number) => n === keyPcs[0] || c.pcs.includes(n)
  for (const t of c.pcs) {
    if (set.has(t)) continue
    // the chord tone replaces its neighbour: G# replaces G, F# replaces F, Bb replaces B (never the key's tonic)
    const below = (t + 11) % 12
    const above = (t + 1) % 12
    if (set.has(below) && !keep(below)) set.delete(below)
    else if (set.has(above) && !keep(above)) set.delete(above)
    set.add(t)
  }
  const pcs = [...set].sort((a, b) => ((a - c.root + 12) % 12) - ((b - c.root + 12) % 12))
  const names = pcs.map(p => (flats ? FLATS : SHARPS)[p])
  const found = Scale.detect(names, { tonic: names[0], match: 'exact' })[0]
  return { pcs, name: found ?? `${names[0]} scale` }
}
