// Heard notes → a tab on the real beat grid (from Beat This!): every note is placed by the beats around it, so a
// recording that speeds up or slows down still lines up; bar lines fall on the "1"s; notes before the first "1"
// become a pickup bar; each beat is split in 16ths or triplets, whichever fits its notes; a song where most beats
// split in three is written in 6/8 (or 9/8, 12/8). Strings and frets come from the hand engine.
import type { Song, SongBar, SongStep } from '../tabs/model'
import { placeAndFinger } from '../hand/engine'
import { keepLegatoOnString } from '../hand/legato'
import { handSize, scaleFor } from '../hand/neck'
import type { BeatGrid, Note } from './post'
import { chordInfo } from '../tabs/harmony'

export interface ToTabOpts {
  tuning: number[]
  title: string
  /** keep chords (several notes at once) or only the loudest note at each moment */
  chords: boolean
  /** the beat grid; without it the notes are laid on a steady `bpm` from the first note */
  grid?: BeatGrid | null
  bpm?: number
  /** General MIDI program for Hear it (25 steel acoustic, 27 clean electric) */
  program?: number
  /** chord names with the time (s) each starts (the AI's second opinion): written above the tab */
  chordTimes?: { t: number; name: string }[]
  /** filled in: bars where the chord and the notes clearly disagree (0-based, counting a pickup bar) */
  report?: { checkBars: number[] }
}

/** Each note's place in beats from the first downbeat (negative = before it). */
export function beatPositions(times: number[], grid: BeatGrid | null | undefined, bpm: number): number[] {
  if (!grid || grid.beats.length < 4) {
    const t0 = times.length ? Math.min(...times) : 0
    return times.map(t => ((t - t0) * bpm) / 60)
  }
  const spb = 60 / grid.bpm
  // the beats, carried on at the tempo before the first and after the last one
  const beats = [...grid.beats]
  const lo = Math.min(...times, beats[0]), hi = Math.max(...times, beats[beats.length - 1])
  while (beats[0] > lo - spb) beats.unshift(beats[0] - spb)
  while (beats[beats.length - 1] < hi + spb) beats.push(beats[beats.length - 1] + spb)
  const zero = beats.findIndex(b => Math.abs(b - grid.firstDownbeat) < spb / 2)
  return times.map(t => {
    let i = 0
    while (i < beats.length - 2 && beats[i + 1] <= t) i++
    return i - zero + (t - beats[i]) / (beats[i + 1] - beats[i])
  })
}

/**
 * Round each beat's notes to a grid: 16ths, 8th triplets, 16th sextuplets or (for a fast run) 32nds, whichever fits that
 * beat's notes best. 16ths win when it's close. A grid that would squeeze two separate notes onto one spot loses (a fast
 * run keeps every note: sextuplets or 32nds instead).
 */
export function quantize(pos: number[]): { q: number[]; triplets: number; split: number } {
  const byBeat = new Map<number, number[]>()
  pos.forEach((p, i) => { const b = Math.floor(p + 1e-6); (byBeat.get(b) ?? byBeat.set(b, []).get(b)!).push(i) })
  const q = new Array<number>(pos.length)
  let triplets = 0, split = 0
  // how much each grid is held back: plain 16ths are the usual answer
  const PRIOR: Record<number, number> = { 4: 0, 3: 0.012, 6: 0.03, 8: 0.035 }
  for (const [b, idx] of byBeat) {
    const sorted = idx.map(i => pos[i]).sort((x, y) => x - y)
    // distinct onsets (notes struck together, a chord, are one onset)
    const onsets = sorted.filter((x, k) => k === 0 || x - sorted[k - 1] > 0.04)
    const cost = (d: number) => {
      let e = 0
      const seen = new Set<number>()
      let clash = 0
      for (const x of onsets) {
        const r = Math.round((x - b) * d)
        e += Math.abs((x - b) * d - r) / d
        if (seen.has(r)) clash++
        seen.add(r)
      }
      return e + clash * 0.25 + PRIOR[d] * onsets.length
    }
    const e4 = cost(4)
    let d = 4, best = e4
    // triplets need clearly better timing than 16ths; sextuplets and 32nds only for runs (4+ onsets or tight pairs)
    const tight = onsets.some((x, k) => k > 0 && x - onsets[k - 1] < 0.2)
    const cands: number[] = [3]
    if (onsets.length >= 4 || tight) cands.push(6, 8)
    for (const c of cands) { const v = cost(c); if (v * (c === 3 ? 1.25 : 1) < best) { best = v; d = c } }
    const off = idx.some(i => Math.abs(pos[i] - Math.round(pos[i])) > 0.12)
    if (off) { split++; if (d === 3) triplets++ }
    for (const i of idx) q[i] = b + Math.round((pos[i] - b) * d) / d
  }
  return { q, triplets, split }
}

export function notesToSong(notes: Note[], o: ToTabOpts): Song | null {
  const lo = o.tuning[0], hi = o.tuning[o.tuning.length - 1] + 20
  const inRange = notes.filter(n => n.midi >= lo && n.midi <= hi)
  if (!inRange.length) return null
  // quiet ghosts of louder notes (string noise, ringing) are left out
  const loudest = Math.max(...inRange.map(n => n.velocity))
  const keep = inRange.filter(n => n.velocity >= loudest * 0.22)
  const bpm = o.grid?.bpm ?? o.bpm ?? 90
  const pos = beatPositions(keep.map(n => n.start), o.grid, bpm)
  const ends = beatPositions(keep.map(n => n.end), o.grid, bpm)
  const { q, triplets, split } = quantize(pos)
  // most beats split in three: write it in compound time (a beat = a dotted quarter)
  const compound = split >= 4 && triplets / split >= 0.6
  const scale = compound ? 1.5 : 1
  const perBar = o.grid?.beatsPerBar ?? 4
  const meter = perBar * scale
  // slots: the notes that start together
  const slots = new Map<number, number[]>()
  q.forEach((p, i) => { const k = Math.round(p * scale * 1e4) / 1e4; (slots.get(k) ?? slots.set(k, []).get(k)!).push(i) })
  const keys = [...slots.keys()].sort((a, b) => a - b)
  const evs = keys.map((k, j) => {
    const idx = slots.get(k)!
    const top = idx.reduce((a, b) => (keep[b].velocity > keep[a].velocity ? b : a))
    const own = Math.max(0.25, Math.round((ends[top] - pos[top]) * scale * 4) / 4)
    const next = keys[j + 1] ?? k + own
    // a tab note lasts until the next one (no fussy little rests); a real gap of a beat or more stays a rest
    const dur = o.chords || next - k <= 1 + 1e-6 ? next - k : Math.min(next - k, Math.max(own, 1))
    const midis = o.chords ? [...new Set(idx.map(i => keep[i].midi))].sort((a, b) => b - a).slice(0, 6) : [keep[top].midi]
    // a technique mark only on a single note (a chord's notes don't hammer together)
    const tech = midis.length === 1 ? keep[top].tech : undefined
    return { at: k, dur: Math.max(1 / 12, dur), midis, tech }
  })
  // bends and vibrato help the hand engine choose fingers; hammer-ons / pull-offs / slides are kept on one string afterwards
  const placed = placeAndFinger(evs.map(e => ({ midis: e.midis, dur: e.dur, ...(e.tech === 'b' || e.tech === '~' ? { techs: [e.tech] } : {}) })), { scale: scaleFor(o.tuning.length), size: handSize(), tuning: o.tuning, open: 0.5, warm: 0.3 })
  placed.notes = keepLegatoOnString(placed.notes, evs.map(e => e.tech), o.tuning)
  // chord names: on the first note at (or just before) where each chord starts
  const chordAt = new Map<number, string>()
  const chordPos: { at: number; name: string }[] = []
  if (o.chordTimes?.length) {
    const cp = beatPositions(o.chordTimes.map(c => c.t), o.grid, bpm).map(p => Math.round(p * 4) / 4 * scale)
    o.chordTimes.forEach((c, i) => {
      chordPos.push({ at: cp[i], name: c.name })
      const j = evs.findIndex(e => e.at >= cp[i] - 0.26)
      if (j >= 0 && evs[j].at - cp[i] <= 1.5 * scale) chordAt.set(j, c.name)
    })
  }
  // bars: a pickup bar for what comes before the first "1", then whole bars
  const first = keys[0]
  const startAt = first < 0 ? first : Math.floor(first / meter) * meter
  const bars: SongBar[] = []
  let bar: SongStep[] = [], barEnd = first < 0 ? 0 : startAt + meter, t = startAt
  const push = (st: SongStep) => { if (st.dur > 1e-6) bar.push({ ...st, dur: Math.round(st.dur * 1e4) / 1e4 }) }
  const close = () => { bars.push({ steps: bar }); bar = []; barEnd += meter }
  const emit = (notesOf: SongStep['notes'], at: number, dur: number, chord?: string) => {
    if (at > t + 1e-6) rest(at - t)
    let left = dur, firstPart = true
    while (left > 1e-6) {
      const take = Math.min(left, barEnd - t)
      push({ notes: firstPart ? notesOf : [], dur: take, ...(firstPart && chord ? { chord } : {}) })
      t += take; left -= take; firstPart = false
      if (t >= barEnd - 1e-6) close()
    }
  }
  const rest = (d: number) => {
    let left = d
    while (left > 1e-6) { const take = Math.min(left, barEnd - t); push({ notes: [], dur: take }); t += take; left -= take; if (t >= barEnd - 1e-6) close() }
  }
  evs.forEach((e, i) => emit(placed.notes[i].map(n => ({ string: n.string, fret: n.fret, midi: o.tuning[n.string] + n.fret, ...(e.tech ? { tech: e.tech } : {}) })), e.at, e.dur, chordAt.get(i)))
  if (bar.length) { rest(barEnd - t) }
  if (!bars.some(b => b.steps.some(s => s.notes.length))) return null
  // bars where the chord and the notes clearly disagree (most of the notes' time is outside the chord): "check this bar"
  if (o.report && chordPos.length) {
    const check: number[] = []
    let start = startAt
    bars.forEach((b, bi) => {
      const len = b.steps.reduce((a, x) => a + x.dur, 0)
      const cur = [...chordPos].reverse().find(c => c.at <= start + len / 2)
      const info = cur ? chordInfo(cur.name) : null
      if (info) {
        let inChord = 0, all = 0, count = 0
        for (const st of b.steps) for (const n of st.notes) { count++; all += st.dur; if (info.pcs.includes(n.midi % 12)) inChord += st.dur }
        if (count >= 3 && inChord / all < 0.4) check.push(bi)
      }
      start += len
    })
    o.report.checkBars = check
  }
  const quarterBpm = Math.round(bpm * scale * 10) / 10
  const sig: [number, number] | undefined = compound ? [perBar * 3, 8] : perBar !== 4 ? [perBar, 4] : undefined
  return {
    title: o.title, tempo: quarterBpm,
    ...(Number.isInteger(meter) && meter !== 4 ? { meter } : {}),
    ...(sig ? { timeSig: sig } : {}),
    tracks: [{ name: o.title, tuning: o.tuning, capo: 0, bars, program: o.program ?? 25 }],
  }
}
