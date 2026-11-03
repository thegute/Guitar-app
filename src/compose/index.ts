// The composer: licks and solos, riffs and rhythm parts, over a progression (from Jam) or the style's own chords,
// in any key, on any tuning. Writes many versions and keeps the most musical one that also sits well on the neck.
import { lickSong, type LickEvent } from '../licks/notation'
import { keyLabel } from '../licks/generator'
import type { Song } from '../tabs/model'
import type { ModeId, ProgChord } from '../theory/progressions'
import { pc } from '../theory/notes'
import { keyInfo, mod, styleProgression, timeline, type CChord } from './harmony'
import { rng, scoreLine, writeLine, type LNote, type LineOptions } from './line'
import { placeLine } from './fret'
import { makeRiff } from './riff'
import { arrangeEvents, placeArranged, type ArrLevel } from './arrange'
import { style, type StyleDef, type StyleId } from './styles'

export type Part = 'lead' | 'riff' | 'melody'
export interface ComposeOptions {
  style: StyleId | string
  part: Part
  tonic: string
  mode?: ModeId
  /** the progression (Jam's); without it the style's own progression in this key */
  chords?: ProgChord[]
  bars: number
  level: 1 | 2 | 3
  seed: number
  /** the instrument's tuning, low string first */
  tuning: number[]
  bpm?: number
  /** chord melody: melody only, melody + bass, or the full arrangement */
  arrange?: ArrLevel
  /** beats in a bar (3 for a waltz); the style's own otherwise */
  meter?: number
  /** force the capo (songbook pieces keep one capo for every section) */
  capo?: number
}
export interface Composed { song: Song; capo: number; key: string; minor: boolean; tuning: number[]; style: StyleDef; chords: string[] }

const STANDARD = [40, 45, 50, 55, 59, 64]
const isStandard = (t: number[]) => t.length === 6 && t.every((m, i) => m === STANDARD[i])
const MINORISH: ModeId[] = ['minor', 'dorian', 'phrygian', 'harmonic']

/** The tuning a style is played in on this instrument (slack key retunes a guitar to open G). */
export function tuningFor(st: StyleDef, tuning: number[]): number[] {
  return st.tuning && isStandard(tuning) ? st.tuning : tuning
}

/** Open-string styles: the capo that puts the key where the open strings ring (G, C, D, A, E on guitar; G in open G). */
export function capoFor(st: StyleDef, tuning: number[], tonic: number, minor: boolean): number {
  if (st.moves !== 'open' && st.open < .6) return 0
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
  let best = 0, bestC = Infinity
  for (let c = 0; c <= 7; c++) {
    const written = mod(tonic - c)
    const scale = steps.map(x => mod(written + x))
    const fit = tuning.filter(t => scale.includes(mod(t))).length
    const rootOpen = tuning.some(t => mod(t) === written) ? 1 : 0
    const cost = (tuning.length - fit) * 2 - rootOpen * 1.5 + c * .45
    if (cost < bestC) { bestC = cost; best = c }
  }
  return best
}

/** clip overlaps and keep notes playable */
function tidy(notes: LNote[], lo: number, hi: number): LNote[] {
  const s = notes.filter(n => n.dur > 1e-3 && (n.want === 'x' || (n.midi >= lo && n.midi <= hi))).sort((a, b) => a.at - b.at)
  const out: LNote[] = []
  for (const n of s) {
    const p = out[out.length - 1]
    if (p && n.at < p.at + p.dur - 1e-6) {
      p.dur = Math.round((n.at - p.at) * 1e4) / 1e4
      if (p.dur <= 1e-3) out.pop()
    }
    out.push({ ...n, under: n.under !== undefined && n.under >= lo ? n.under : undefined })
  }
  return out
}

export function lineOptions(st: StyleDef, tl: CChord[], tonic: string, mode: ModeId, bars: number, level: 1 | 2 | 3, eff: number[], meter: number, singable = false): LineOptions {
  const n = eff.length
  const zl = st.zone[0], zh = st.zone[1]
  const lo = eff[0] + (st.moves === 'open' ? 0 : Math.max(0, zl - 2))
  const hi = eff[n - 1] + Math.min(zh, n === 4 ? 15 : 22)
  const ref = eff[Math.max(0, n - 3)]
  const center = Math.round(st.moves === 'open' ? ref + 4 : ref + zl + (zh - zl) * .38 + 1) + (singable ? 3 : 0)
  return { st, key: keyInfo(tonic, mode), tl, bars, level, meter, lo, hi: Math.max(hi, lo + 12), center: Math.min(center, hi - 5), singable }
}

/** Licks, solos and riffs. */
export function compose(o: ComposeOptions): Composed {
  const st = style(o.style)
  const mode: ModeId = o.mode ?? (st.minor ? 'minor' : 'major')
  const minor = MINORISH.includes(mode)
  const chords = o.chords?.length ? o.chords : styleProgression(st, o.tonic, mode)
  const meter = o.meter ?? st.meter ?? 4
  const bars = Math.max(1, Math.min(32, o.bars))
  const tl = timeline(chords, o.tonic, mode, bars, meter)
  const tuning = tuningFor(st, o.tuning)
  const capo = o.capo ?? capoFor(st, tuning, pc(o.tonic), minor)
  const eff = tuning.map(t => t + capo)
  const key = keyLabel(o.tonic, minor)
  let events: LickEvent[] = []
  // fingerpicked styles always have the thumb's bass under the line; chord melodies are arranged the style's way
  const arranged = o.part === 'melody' || (o.part === 'lead' && ['fingerstyle', 'classical', 'slackkey'].includes(st.id))
  if (arranged) {
    const singable = o.part === 'melody'
    const lo = lineOptions(st, tl, o.tonic, mode, bars, singable ? (Math.min(o.level, 2) as 1 | 2) : o.level, eff, meter, singable)
    const level: ArrLevel = o.part === 'melody' ? (o.arrange ?? 'full') : o.level === 1 ? 'bass' : 'full'
    let best: { ev: LickEvent[]; score: number } | null = null
    for (let t = 0; t < 16; t++) {
      const r = rng(o.seed + t * 7919)
      const notes = tidy(writeLine(r, lo), eff[0], eff[eff.length - 1] + 17)
      if (notes.length < 2) continue
      const evs = arrangeEvents(notes, tl, st.melody, level, eff, meter, r)
      const placed = placeArranged(evs, eff, st)
      if (!placed.events.some(e => e.notes.length)) continue
      const lead = evs.length && evs[0].at > 1e-6 ? [{ notes: [], dur: evs[0].at }] : []
      const score = scoreLine(notes, lo) - placed.cost * 1.2
      if (!best || score > best.score) best = { ev: [...lead, ...placed.events], score }
    }
    events = best?.ev ?? []
  } else if (o.part === 'riff' && ['power', 'gallop', 'djent', 'funk16', 'skank', 'dub'].includes(st.riff)) {
    events = makeRiff(st.riff, tl, bars, meter, eff, o.level, rng(o.seed))
  } else {
    const lo = lineOptions(st, tl, o.tonic, mode, bars, o.level, eff, meter)
    let best: { ev: LickEvent[]; score: number } | null = null
    const tries = bars > 8 ? 12 : 24
    for (let t = 0; t < tries; t++) {
      const r = rng(o.seed + t * 7919)
      const notes = tidy(writeLine(r, lo), eff[0], eff[eff.length - 1] + 24)
      if (notes.length < 2) continue
      const placed = placeLine(notes, tuning, st, r, meter, capo)
      if (!placed.events.some(e => e.notes.length)) continue
      const score = scoreLine(notes, lo) - placed.cost * 1.5
      if (!best || score > best.score) best = { ev: placed.events, score }
    }
    events = best?.ev ?? []
  }
  if (!events.some(e => e.notes.length)) events = fallback(tl, eff, bars, meter)
  const kind = o.part === 'riff' ? 'riff' : o.part === 'melody' ? 'chord melody' : bars <= 2 ? 'lick' : 'solo'
  const short = st.label.replace(/ \(.*\)$/, '')
  const title = o.part === 'melody' ? `Chord melody (${short}) in ${key}: ${chords.map(c => c.symbol).join(' – ')}` : `${short} ${kind} in ${key}`
  const tempo = Math.round((o.bpm ?? st.bpm) * (o.level === 1 ? .85 : o.level === 3 ? 1.08 : 1))
  const song = lickSong(events, { tuning, capo, title, tempo, program: st.program, meter })
  // chord names over the bars
  const bars0 = song.tracks[0].bars
  for (const c of tl) {
    const b = Math.floor(c.start / meter + 1e-6)
    const bar = bars0[b]
    if (!bar) continue
    let t = b * meter
    for (const s of bar.steps) { if (c.start >= t - 1e-6 && c.start < t + s.dur - 1e-6) { s.chord ??= c.name; break } t += s.dur }
  }
  return { song, capo, key, minor, tuning, style: st, chords: chords.map(c => c.symbol) }
}

/** Never nothing: the chord roots, one per beat, as a last resort. */
function fallback(tl: CChord[], eff: number[], bars: number, meter: number): LickEvent[] {
  const ev: LickEvent[] = []
  for (let t = 0; t < bars * meter; t++) {
    const c = tl.find(x => t >= x.start && t < x.start + x.beats) ?? tl[0]
    const s = eff.findIndex(o => { const f = mod(c.root - o); return f <= 7 })
    const ss = s < 0 ? 0 : Math.min(s + 1, eff.length - 1)
    ev.push({ notes: [{ string: ss, fret: mod(c.root - eff[ss]) }], dur: 1 })
  }
  return ev
}
