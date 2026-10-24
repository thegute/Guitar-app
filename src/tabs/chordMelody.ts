// Chord melody from a chord progression: writes a singable tune over the chords, then arranges it for one
// guitar (or ukulele) with the melody on top, chord notes under it and a bass note, all within a hand's reach.
//
// The tune follows rules melody writers use: chord notes on the strong beats, notes from the chord's scale in
// between, mostly stepwise motion with the odd leap that turns back, two-bar phrases that ask and answer, and an
// ending on the home note. Many candidates are written for each phrase and the most singable one is kept.
import type { Song, SongBar, SongNote, SongStep } from './model'

export type MelodyStyle = 'ballad' | 'folk' | 'jazz' | 'bossa' | 'blues' | 'country' | 'island'
export type MelodyLevel = 'melody' | 'bass' | 'full'
export const MELODY_STYLES: { id: MelodyStyle; label: string; feel: string }[] = [
  { id: 'ballad', label: 'Ballad', feel: 'Slow and singing: long notes, full chords under the melody.' },
  { id: 'folk', label: 'Folk (Travis bass)', feel: 'A steady alternating thumb bass with the tune on top, like a fingerpicked folk song.' },
  { id: 'jazz', label: 'Jazz', feel: 'Swinging eighths, colour notes (6ths, 9ths) and little approach notes, with 3rd-and-7th chords underneath.' },
  { id: 'bossa', label: 'Bossa nova', feel: 'Gentle and syncopated, notes that land just before the beat over a root-fifth bass.' },
  { id: 'blues', label: 'Blues', feel: 'Short call-and-response phrases from the blues scale, with the bluesy flat 3rd.' },
  { id: 'country', label: 'Country', feel: 'Bright major-pentatonic melody with sweet 3rds under it and a boom-chick bass.' },
  { id: 'island', label: 'Island (sweet 6ths)', feel: 'Relaxed and sunny, with the melody doubled a 6th below: the sound of island and slack-key style guitar.' },
]
export const MELODY_LEVELS: { id: MelodyLevel; label: string }[] = [
  { id: 'melody', label: 'Melody only' },
  { id: 'bass', label: 'Melody + bass' },
  { id: 'full', label: 'Full chord melody' },
]

export interface CMChord {
  name: string
  /** chord root pitch class */
  root: number
  /** chord tones, pitch classes (root first) */
  pcs: number[]
  /** the scale that fits this chord, pitch classes */
  scale: number[]
  beats: number
}
export interface MelNote { at: number; dur: number; midi: number }
export interface CMOptions {
  style: MelodyStyle
  level: MelodyLevel
  tonic: number
  tuning: number[]
  seed: number
  /** chords whose melody to keep from last time (locked), by chord index */
  keep?: (MelNote[] | null)[]
}

// ---------- random numbers you can repeat ----------
function rng(seed: number) {
  let a = seed >>> 0 || 1
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)]

// ---------- rhythm: one bar of 4 beats per template, [start, length] in beats ----------
type Rh = [number, number][]
const RHYTHMS: Record<MelodyStyle, Rh[]> = {
  ballad: [[[0, 2], [2, 1], [3, 1]], [[0, 1], [1, 1], [2, 2]], [[0, 1.5], [1.5, 0.5], [2, 2]], [[0, 3], [3, 1]], [[0, 1], [1, 1], [2, 1], [3, 1]]],
  folk: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]], [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]], [[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]]],
  jazz: [[[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 1], [2.5, 0.5], [3, 1]], [[0, 1.5], [1.5, 0.5], [2, 0.5], [2.5, 1.5]], [[0.5, 0.5], [1, 1], [2, 0.5], [2.5, 1.5]], [[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]]],
  bossa: [[[0, 1.5], [1.5, 1], [2.5, 1.5]], [[0, 0.5], [0.5, 1], [1.5, 1], [2.5, 1.5]], [[0, 1], [1, 0.5], [1.5, 1.5], [3, 1]]],
  blues: [[[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]], [[0, 1], [1, 1], [2, 0.5], [2.5, 1.5]], [[0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 2]]],
  country: [[[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]], [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]], [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1], [3, 1]]],
  island: [[[0, 1], [1, 1], [2, 1.5], [3.5, 0.5]], [[0, 1.5], [1.5, 0.5], [2, 2]], [[0, 1], [1, 0.5], [1.5, 1.5], [3, 1]]],
}
/** rhythm for a chord lasting `beats`, ending with a held note when it closes a phrase */
function rhythmFor(r: () => number, style: MelodyStyle, beats: number, closes: boolean, final: boolean, motif: Rh | null): Rh {
  if (final) return beats >= 4 ? [[0, 2], [2, beats - 2]] : [[0, beats]]
  const out: Rh = []
  for (let off = 0; off < beats; off += 4) {
    const len = Math.min(4, beats - off)
    let bar: Rh = off === 0 && motif ? motif : pick(r, RHYTHMS[style])
    const lastBar = off + 4 >= beats
    if (closes && lastBar) {
      // a phrase ending: hold the last note
      const held = RHYTHMS[style].filter(t => t[t.length - 1][1] >= 1.5)
      if (held.length) bar = pick(r, held)
    }
    for (const [a, d] of bar) if (a < len) out.push([off + a, Math.min(d, len - a)])
  }
  return out
}

// ---------- pitches ----------
const inSet = (m: number, pcs: number[]) => pcs.includes(((m % 12) + 12) % 12)
function within(lo: number, hi: number, pcs: number[]) {
  const out: number[] = []
  for (let m = lo; m <= hi; m++) if (inSet(m, pcs)) out.push(m)
  return out
}

interface PhraseCtx { chords: { c: CMChord; rh: Rh; start: number }[]; ends: 'question' | 'answer' | 'home' }

function writePhrase(r: () => number, p: PhraseCtx, o: CMOptions, lo: number, hi: number, startFrom: number): MelNote[][] {
  const blues = o.style === 'blues'
  const keyBlues = [0, 3, 5, 6, 7, 10].map(x => (x + o.tonic) % 12)
  const peakAt = Math.floor(p.chords.reduce((a, c) => a + c.rh.length, 0) * (0.35 + r() * 0.3))
  const peak = Math.round(startFrom + 3 + r() * 5)
  const out: MelNote[][] = []
  let prev = startFrom
  let lastMove = 0
  let k = 0
  p.chords.forEach(({ c, rh }, ci) => {
    const notes: MelNote[] = []
    rh.forEach(([at, dur], ni) => {
      const isLast = ci === p.chords.length - 1 && ni === rh.length - 1
      const strong = at % 2 === 0 || ni === 0
      let pool: number[]
      if (isLast) {
        // home: the key note if this chord has it, otherwise the chord note nearest to it (leads back round)
        const near = [...c.pcs].sort((x, y) => Math.min((x - o.tonic + 12) % 12, (o.tonic - x + 12) % 12) - Math.min((y - o.tonic + 12) % 12, (o.tonic - y + 12) % 12))[0]
        const target = p.ends === 'home' ? [c.pcs.includes(o.tonic) ? o.tonic : near ?? c.root] : p.ends === 'answer' ? [c.root] : [c.pcs[1] ?? c.root, c.pcs[2] ?? c.root]
        pool = within(lo, hi, target)
      } else if (strong) {
        pool = within(lo, hi, o.style === 'jazz' ? [...c.pcs, ...c.scale.filter(x => (x - c.root + 12) % 12 === 2 || (x - c.root + 12) % 12 === 9)] : c.pcs)
      } else {
        pool = within(lo, hi, blues ? [...new Set([...keyBlues, ...c.pcs])] : o.style === 'country' || o.style === 'island' ? c.scale.filter(x => ![5, 11].includes((x - o.tonic + 12) % 12) || c.pcs.includes(x)) : c.scale)
      }
      if (!pool.length) pool = within(lo, hi, c.pcs.length ? c.pcs : [c.root])
      // where the tune is heading: up to the high point, then down to the phrase ending
      const goal = k < peakAt ? peak : isLast ? prev - 2 : startFrom
      const weights = pool.map(m => {
        const step = Math.abs(m - prev)
        let w = Math.exp(-step / 2.2)
        if (step === 0) w *= notes.length && notes[notes.length - 1].midi === m ? 0.25 : 0.6
        if (step > 7) w *= 0.08
        if (Math.abs(lastMove) > 4 && Math.sign(m - prev) === Math.sign(lastMove)) w *= 0.2 // after a leap, turn back
        w *= Math.exp(-Math.abs(m - goal) / 6)
        return w
      })
      const sum = weights.reduce((a, b) => a + b, 0)
      let x = r() * sum
      let chosen = pool[0]
      for (let i = 0; i < pool.length; i++) { x -= weights[i]; if (x <= 0) { chosen = pool[i]; break } }
      lastMove = chosen - prev
      prev = chosen
      notes.push({ at, dur, midi: chosen })
      k++
    })
    out.push(notes)
  })
  return out
}

function scorePhrase(ph: MelNote[][]): number {
  const ms = ph.flat().map(n => n.midi)
  if (ms.length < 2) return 0
  let steps = 0, leaps = 0, unresolved = 0, repeats = 0
  for (let i = 1; i < ms.length; i++) {
    const d = ms[i] - ms[i - 1]
    if (Math.abs(d) <= 2) steps++
    if (Math.abs(d) > 5) { leaps++; if (i + 1 < ms.length && Math.sign(ms[i + 1] - ms[i]) === Math.sign(d)) unresolved++ }
    if (d === 0 && i > 1 && ms[i - 2] === ms[i]) repeats++
  }
  const span = Math.max(...ms) - Math.min(...ms)
  const top = Math.max(...ms)
  const peaks = ms.filter(m => m === top).length
  return (steps / (ms.length - 1)) * 3 - leaps * 0.4 - unresolved * 1.2 - repeats * 0.8 + (span >= 4 && span <= 12 ? 1 : -0.5) + (peaks === 1 ? 0.6 : 0)
}

/** Write the tune: one list of notes per chord (times are beats from the chord's start). */
export function makeMelody(chords: CMChord[], o: CMOptions): MelNote[][] {
  const r = rng(o.seed)
  const top = Math.max(...o.tuning)
  const lo = top - 4, hi = top + 12
  // phrases of about two bars
  const phrases: number[][] = []
  let cur: number[] = [], beats = 0
  chords.forEach((c, i) => { cur.push(i); beats += c.beats || 4; if (beats >= 8 || i === chords.length - 1) { phrases.push(cur); cur = []; beats = 0 } })
  const result: MelNote[][] = chords.map(() => [])
  let motif: Rh | null = null
  let startFrom = Math.round((lo + hi) / 2) - 2
  phrases.forEach((idxs, pi) => {
    const final = pi === phrases.length - 1
    const ends: PhraseCtx['ends'] = final ? 'home' : pi % 2 === 0 ? 'question' : 'answer'
    // repeat the opening rhythm at the start of every other phrase so the tune hangs together
    const ctx: PhraseCtx = {
      ends,
      chords: idxs.map((ci, j) => ({
        c: chords[ci], start: 0,
        rh: rhythmFor(r, o.style, chords[ci].beats || 4, j === idxs.length - 1, final && j === idxs.length - 1, j === 0 && pi % 2 === 0 && motif ? motif : null),
      })),
    }
    if (!motif) motif = ctx.chords[0].rh.filter(([a]) => a < 4) as Rh
    let best: MelNote[][] | null = null, bestScore = -Infinity
    for (let t = 0; t < 40; t++) {
      const cand = writePhrase(r, ctx, o, lo, hi, startFrom)
      const sc = scorePhrase(cand)
      if (sc > bestScore) { bestScore = sc; best = cand }
    }
    best!.forEach((notes, j) => { result[idxs[j]] = o.keep?.[idxs[j]] ?? notes })
    const last = result[idxs[idxs.length - 1]]
    startFrom = last.length ? last[last.length - 1].midi : startFrom
  })
  return result
}

// ---------- arranging for one instrument ----------
interface Ev { at: number; melody?: number; bass?: number; harm: number[]; chord?: string }

function accompaniment(c: CMChord, notes: MelNote[], o: CMOptions, bassLo: number): { bass: [number, number][]; harm: Map<number, number[]> } {
  const bassOf = (pcv: number) => { let m = bassLo; while (((m % 12) + 12) % 12 !== pcv) m++; return m }
  const root = bassOf(c.root)
  const fifthPc = c.pcs.find(x => (x - c.root + 12) % 12 === 7) ?? c.pcs[c.pcs.length - 1] ?? c.root
  let fifth = bassOf(fifthPc)
  if (fifth - root > 9) fifth -= 12
  if (fifth < bassLo) fifth += 12
  const bass: [number, number][] = []
  const beats = c.beats || 4
  for (let off = 0; off < beats; off += 4) {
    const len = Math.min(4, beats - off)
    if (o.style === 'folk') [0, 1, 2, 3].filter(b => b < len).forEach(b => bass.push([off + b, b % 2 ? fifth : root]))
    else if (['bossa', 'country', 'island', 'blues'].includes(o.style)) [0, 2].filter(b => b < len).forEach(b => bass.push([off + b, b ? fifth : root]))
    else bass.push([off, root])
  }
  const harm = new Map<number, number[]>()
  if (o.level === 'full') {
    for (const n of notes) {
      const strong = n.at % 2 === 0
      const below = (pcs: number[], count: number) => {
        const out: number[] = []
        for (let m = n.midi - 1; m > n.midi - 13 && out.length < count; m--) if (inSet(m, pcs) && !out.some(x => x % 12 === m % 12) && m % 12 !== n.midi % 12) out.push(m)
        return out
      }
      if (o.style === 'island') {
        // the melody doubled a 6th below, using the chord's scale
        const six = [n.midi - 9, n.midi - 8].find(m => inSet(m, c.scale))
        if (six !== undefined) harm.set(n.at, [six])
      } else if (o.style === 'country') {
        if (strong) { const third = [n.midi - 4, n.midi - 3].find(m => inSet(m, c.scale)); if (third !== undefined) harm.set(n.at, [third]) }
      } else if (o.style === 'jazz') {
        if (strong) {
          const guide = c.pcs.filter(x => [3, 4, 10, 11].includes((x - c.root + 12) % 12))
          harm.set(n.at, below(guide.length ? guide : c.pcs, 2))
        }
      } else if (n.at === 0) harm.set(n.at, below(c.pcs, o.style === 'ballad' || o.style === 'bossa' ? 2 : 1))
      else if (strong && o.style === 'ballad') harm.set(n.at, below(c.pcs, 1))
    }
  }
  return { bass, harm }
}

/** Find strings and frets for every note sounding together, staying near where the hand already is. */
function place(ev: Ev, tuning: number[], prevCenter: number): { notes: SongNote[]; center: number } {
  const pos = (m: number) => tuning.map((t, s) => ({ s, f: m - t })).filter(p => p.f >= 0 && p.f <= 15)
  const mel = ev.melody !== undefined ? pos(ev.melody) : [{ s: -1, f: 0 }]
  const bass = ev.bass !== undefined ? pos(ev.bass) : []
  let best: { notes: { s: number; f: number; m: number }[]; cost: number } | null = null
  const tryCombo = (chosen: { s: number; f: number; m: number }[], missing: number) => {
    const strings = new Set(chosen.map(c => c.s))
    if (strings.size !== chosen.length) return
    const fretted = chosen.filter(c => c.f > 0).map(c => c.f)
    const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0
    if (span > 4) return
    const center = fretted.length ? fretted.reduce((a, b) => a + b, 0) / fretted.length : prevCenter
    const melNote = chosen.find(c => c.m === ev.melody)
    const cost = Math.abs(center - prevCenter) * 0.5 + span * 0.5 + missing * 3 + (melNote && melNote.f > 12 ? 2 : 0) + (melNote ? (tuning.length - 1 - melNote.s) * 0.3 : 0)
    if (!best || cost < best.cost) best = { notes: chosen, cost }
  }
  const harmOpts = ev.harm.map(h => pos(h))
  for (const m of mel) {
    const base = m.s >= 0 ? [{ ...m, m: ev.melody! }] : []
    const bassChoices: ({ s: number; f: number; m: number } | null)[] = bass.length ? [...bass.map(b => ({ ...b, m: ev.bass! })), null] : [null]
    for (const b of bassChoices) {
      const withBass = b ? [...base, b] : base
      const missBass = ev.bass !== undefined && !b ? 1.3 : 0
      // harmony: up to two notes, each optional
      const h0 = harmOpts[0] ?? [], h1 = harmOpts[1] ?? []
      const opt0: ({ s: number; f: number; m: number } | null)[] = [...h0.map(p => ({ ...p, m: ev.harm[0] })), null]
      const opt1: ({ s: number; f: number; m: number } | null)[] = [...h1.map(p => ({ ...p, m: ev.harm[1] })), null]
      for (const a of opt0) for (const c of opt1) {
        const chosen = [...withBass, ...(a ? [a] : []), ...(c ? [c] : [])]
        const missing = (ev.harm.length > 0 && !a ? 1 : 0) + (ev.harm.length > 1 && !c ? 1 : 0)
        tryCombo(chosen, missing + missBass)
      }
    }
  }
  const b = best as { notes: { s: number; f: number; m: number }[]; cost: number } | null
  if (!b) return { notes: [], center: prevCenter }
  const fretted = b.notes.filter(n => n.f > 0).map(n => n.f)
  return {
    notes: b.notes.map(n => ({ string: n.s, fret: n.f, midi: n.m })).sort((x, y) => x.string - y.string),
    center: fretted.length ? fretted.reduce((x, y) => x + y, 0) / fretted.length : prevCenter,
  }
}

/** The tune arranged as a tab (melody on top, plus bass and chord notes depending on the level). */
export function chordMelodySong(chords: CMChord[], melody: MelNote[][], o: CMOptions & { title: string; bpm: number }): Song {
  const bassLo = Math.min(...o.tuning)
  const evs = new Map<number, Ev>()
  const at = (t: number) => { const k = Math.round(t * 1000) / 1000; let e = evs.get(k); if (!e) { e = { at: k, harm: [] }; evs.set(k, e) } return e }
  let t = 0
  chords.forEach((c, i) => {
    const notes = melody[i] ?? []
    const acc = accompaniment(c, notes, o, bassLo)
    for (const n of notes) { const e = at(t + n.at); e.melody = n.midi; e.harm = acc.harm.get(n.at) ?? [] }
    if (o.level !== 'melody') for (const [b, m] of acc.bass) { const e = at(t + b); if (e.bass === undefined) e.bass = m }
    at(t).chord = c.name
    t += c.beats || 4
  })
  // bass notes must sit below the melody
  for (const e of evs.values()) if (e.bass !== undefined && e.melody !== undefined && e.bass >= e.melody) e.bass -= 12
  const list = [...evs.values()].sort((a, b) => a.at - b.at)
  let center = 3
  const placed = list.map(e => { const p = place(e, o.tuning, center); center = p.center; return { at: e.at, notes: p.notes, chord: e.chord } })
  const total = Math.ceil(t / 4) * 4
  const bars: SongBar[] = []
  for (let b0 = 0; b0 < total; b0 += 4) {
    const inBar = placed.filter(e => e.at >= b0 && e.at < b0 + 4)
    const steps: SongStep[] = []
    if (!inBar.length || inBar[0].at > b0) steps.push({ notes: [], dur: (inBar[0]?.at ?? b0 + 4) - b0 })
    inBar.forEach((e, i) => {
      const end = i + 1 < inBar.length ? inBar[i + 1].at : b0 + 4
      steps.push({ notes: e.notes, dur: Math.round((end - e.at) * 1000) / 1000, ...(e.chord ? { chord: e.chord } : {}) })
    })
    bars.push({ steps })
  }
  const program = ({ jazz: 26, bossa: 24, blues: 27, country: 27 } as Record<string, number>)[o.style] ?? 25
  return { title: o.title, tempo: o.bpm, tracks: [{ name: 'Chord melody', tuning: o.tuning, capo: 0, bars, program }] }
}
