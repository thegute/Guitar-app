// "Match a song's vibe": KGuitar listens to a bit of a song (recorded from a YouTube video or a file) and makes a NEW beat
// with the same feel: its tempo, straight or swung, how busy the kick / snare / hi-hat are and where they fall in the bar,
// its key and the chords it keeps coming back to. It never copies the recording: it reads a feel and writes its own beat.
//   readVibe(x, sr)  → what it heard (pure; tested with a made-up song in tests/vibe-logic.test.ts)
//   vibeBeat(v, o)   → a beat: `close` 0..1 (0 = loose, borrows from the nearest known groove; 1 = as heard), `seed` rerolls
import { FFT } from '../audio/noteDetect'
import { addChroma } from '../audio/chroma'
import { HOP_SEC, guessMeter, tempoFromOnsets, trackBeats } from '../audio/tempo'
import { matchChords, findLoop, keyOf, chordName, type Quality } from '../audio/chordFinder'
import { GROOVES, type KitId } from '../audio/drums'
import { SHARPS, FLATS, keyPrefersFlats } from '../theory/notes'
import { bassNotesFor, chordNotesFor, newId, rowsFromGroove, type Beat, type DrumRow, type Track } from './beat'

export type Band = 'kick' | 'snare' | 'hat'
export const BANDS: Band[] = ['kick', 'snare', 'hat']
export interface Vibe {
  bpm: number
  /** beats in a bar (3 = waltz feel, written with 12-step rows) */
  beatsPerBar: 3 | 4
  /** 0 straight … 0.33 full triplet swing on the 16ths (the beat maker's swing) */
  swing: number
  /** per band, how strongly each 16th of the bar is hit, averaged over the bars heard (0..1, loudest = 1) */
  profile: Record<Band, number[]>
  key: { root: string; minor: boolean } | null
  /** the chord loop, one chord per bar */
  chords: { root: number; q: Quality; name: string }[]
  /** the known groove it sounds closest to (its kit is used too) */
  nearest: string
  bars: number
  sure: { tempo: number; key: number }
}

const EDGES: Record<Band, [number, number]> = { kick: [35, 140], snare: [180, 3500], hat: [6000, 15000] }

/** Spectral flux in three bands, one value per hop. */
function bandFlux(x: Float32Array, sr: number): { flux: Record<Band, Float32Array>; hopSec: number; offset: number } {
  const N = sr > 30000 ? 2048 : 1024, hop = N / 8
  const fft = new FFT(N)
  const win = new Float32Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
  const frames = Math.max(0, Math.floor((x.length - N) / hop) + 1)
  const binHz = sr / N
  const range = (b: Band) => [Math.max(1, Math.floor(EDGES[b][0] / binHz)), Math.min(N / 2 - 1, Math.ceil(EDGES[b][1] / binHz))]
  const rk = BANDS.map(range)
  const flux: Record<Band, Float32Array> = { kick: new Float32Array(frames), snare: new Float32Array(frames), hat: new Float32Array(frames) }
  const prev = new Float32Array(N / 2), mag = new Float32Array(N / 2)
  const re = new Float32Array(N), im = new Float32Array(N)
  const raw = BANDS.map(() => new Float32Array(frames))
  for (let f = 0; f < frames; f++) {
    const a = f * hop
    for (let i = 0; i < N; i++) { re[i] = x[a + i] * win[i]; im[i] = 0 }
    fft.run(re, im)
    for (let k = 0; k < N / 2; k++) mag[k] = Math.hypot(re[k], im[k])
    BANDS.forEach((_, bi) => {
      const [lo, hi] = rk[bi]
      let s = 0
      for (let k = lo; k <= hi; k++) { const d = mag[k] - prev[k]; if (d > 0) s += d }
      raw[bi][f] = s / (hi - lo + 1)
    })
    prev.set(mag)
  }
  // each drum shows up in more than one band: keep what stands out in its own band (a snare's noise also reaches the
  // kick band, a hi-hat reaches the snare band)
  for (let f = 0; f < frames; f++) {
    const [lo, mid, hi] = [raw[0][f], raw[1][f], raw[2][f]]
    flux.kick[f] = Math.max(0, lo - 1.0 * mid)
    flux.snare[f] = Math.max(0, mid - 0.35 * hi)
    flux.hat[f] = Math.max(0, hi - 0.2 * mid)
  }
  // one hit = one peak: keep only the biggest value within ±60 ms in each band (a kick's pitch drop makes a second bump)
  const w = Math.max(1, Math.round((0.06 * sr) / hop))
  for (const b of BANDS) {
    const f = flux[b], keep = new Float32Array(frames)
    for (let i = 0; i < frames; i++) {
      let top = true
      for (let j = Math.max(0, i - w); j <= Math.min(frames - 1, i + w) && top; j++) if (f[j] > f[i] || (f[j] === f[i] && j < i)) top = false
      if (top) keep[i] = f[i]
    }
    flux[b] = keep
  }
  // a frame's flux belongs to the middle of its window
  return { flux, hopSec: hop / sr, offset: N / 2 / sr }
}

/** Chroma (and low-end chroma) per bar. */
function barChroma(x: Float32Array, sr: number, bars: [number, number][]): { chroma: number[][]; bass: number[][] } {
  const N = 8192, hop = 2048
  const fft = new FFT(N)
  const win = new Float32Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
  let peak = 0
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]))
  const chroma = bars.map(() => new Array(12).fill(0)), bass = bars.map(() => new Array(12).fill(0))
  if (peak < 1e-5) return { chroma, bass }
  const re = new Float32Array(N), im = new Float32Array(N), db = new Float32Array(N / 2), low = new Float32Array(N / 2)
  const binHz = sr / N
  for (let a = 0; a + N <= x.length; a += hop) {
    const t = (a + N / 2) / sr
    const bi = bars.findIndex(([s, e]) => t >= s && t < e)
    if (bi < 0) continue
    for (let i = 0; i < N; i++) { re[i] = (x[a + i] / peak) * win[i]; im[i] = 0 }
    fft.run(re, im)
    for (let k = 0; k < N / 2; k++) { db[k] = 20 * Math.log10((2 * Math.hypot(re[k], im[k])) / N + 1e-12); low[k] = k * binHz < 220 ? db[k] : -120 }
    addChroma(db, binHz, chroma[bi])
    addChroma(low, binHz, bass[bi])
  }
  return { chroma, bass }
}

const peakNear = (f: Float32Array, t: number, w: number, hop: number, off: number) => {
  let m = 0, at = t
  for (let i = Math.max(0, Math.floor((t - w - off) / hop)); i <= Math.min(f.length - 1, Math.ceil((t + w - off) / hop)); i++) if (f[i] > m && f[i] >= (f[i - 1] ?? 0) && f[i] >= (f[i + 1] ?? 0)) { m = f[i]; at = i * hop + off }
  return { m, at }
}

/** One known groove's kick / snare / hat as 16-step strengths. */
export function grooveProfile(id: string): Record<Band, number[]> {
  const rows = rowsFromGroove(id, 1)
  const out: Record<Band, number[]> = { kick: Array(16).fill(0), snare: Array(16).fill(0), hat: Array(16).fill(0) }
  const into: Record<string, Band> = { kick: 'kick', snare: 'snare', ghost: 'snare', clap: 'snare', rim: 'snare', hat: 'hat', open: 'hat', ride: 'hat', pedal: 'hat', shaker: 'hat', bell: 'hat' }
  for (const r of rows) { const b = into[r.voice]; if (b) r.steps.forEach((v, i) => { out[b][i] = Math.max(out[b][i], v) }) }
  return out
}
const cos = (a: number[], b: number[]) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] } return na && nb ? d / Math.sqrt(na * nb) : 0 }
const clear = (v: number[]) => v.map(x => (x >= 0.4 ? x : 0))
function nearestGroove(p: Record<Band, number[]>): string {
  let best = { id: 'rock', s: -1 }
  for (const g of GROOVES) {
    const q = grooveProfile(g.id)
    if (!q.kick.some(v => v) || !q.snare.some(v => v)) continue
    const s = 1.2 * cos(clear(p.kick), q.kick) + 1.2 * cos(clear(p.snare), q.snare) + 0.6 * cos(clear(p.hat), q.hat) - (g.group === 'Heavy' && p.kick.filter(v => v >= 0.5).length < 6 ? 1 : 0) - (g.kit === '808' || g.kit === '909' ? 0.08 : 0)
    if (s > best.s) best = { id: g.id, s }
  }
  return best.id
}

/** What a recording's feel is. Needs a few bars (8 s or more is best). */
export function readVibe(x: Float32Array, sr: number): Vibe | null {
  const { flux, hopSec, offset } = bandFlux(x, sr)
  // per band: normalise so the band's loud hits are ~1
  const norm = (f: Float32Array) => { const s = Array.from(f).filter(v => v > 0).sort((a, b) => b - a); const top = s[Math.floor(s.length * 0.1)] || 1; return f.map(v => Math.min(1.5, v / top)) }
  const nf = { kick: norm(flux.kick), snare: norm(flux.snare), hat: norm(flux.hat) }
  if (!nf.kick.some(v => v > 0.3) && !nf.snare.some(v => v > 0.3)) return null
  // the beat comes from the kick and snare (busy hi-hats, swung or not, pull a beat tracker onto the off-beats)
  const n10 = Math.floor((nf.kick.length * hopSec) / HOP_SEC)
  const env = new Float32Array(n10)
  for (let i = 0; i < nf.kick.length; i++) { const j = Math.floor((i * hopSec + offset) / HOP_SEC); if (j < n10) env[j] = Math.max(env[j], nf.kick[i] + nf.snare[i] + 0.05 * nf.hat[i]) }
  { const top = Array.from(env).sort((a, b) => b - a)[Math.floor(env.length * 0.02)] || 1; for (let i = 0; i < n10; i++) env[i] = Math.min(1, env[i] / top) }
  const g = tempoFromOnsets(env, { hop: HOP_SEC })
  if (!g) return null
  let bpm = g.bpm
  while (bpm > 140) bpm /= 2
  while (bpm < 65) bpm *= 2
  const tracked = trackBeats(env, bpm, HOP_SEC, 400)
  if (tracked.length < 8) return null
  // smooth the grid: each beat from a straight line through its neighbours, so one loud off-beat hit can't pull a beat
  const allBeats = tracked.map((_, i) => {
    const a = Math.max(0, i - 4), b = Math.min(tracked.length - 1, i + 4)
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0
    for (let j = a; j <= b; j++) { n++; sx += j; sy += tracked[j]; sxx += j * j; sxy += j * tracked[j] }
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1)
    return (sy - m * sx) / n + m * i
  })
  // chords mostly change on bar 1: how much the harmony moves at each beat
  const beatSpans: [number, number][] = allBeats.slice(1).map((b, i) => [allBeats[i], b])
  const bc = barChroma(x, sr, beatSpans).chroma
  const move = bc.map((c, i) => (i ? 1 - cos(c, bc[i - 1]) : 0))
  // in 3 or in 4: the kick on each beat and the chord moves repeat every bar
  const kb = allBeats.map(t => peakNear(nf.kick, t, 0.05, hopSec, offset).m)
  const rep = (P: number, v: number[]) => { let a = 0, n = 0; for (let i = 0; i + P < v.length; i++) { a += v[i] * v[i + P]; n++ } return n ? a / n : 0 }
  const in3 = rep(3, kb) + rep(3, move), in4 = rep(4, kb) + rep(4, move)
  const meter = guessMeter(env, allBeats, HOP_SEC)
  const beatsPerBar: 3 | 4 = in3 > in4 * 1.15 || (Math.abs(in3 - in4) < 0.02 && (meter.num === 3 || meter.num === 9)) ? 3 : 4
  const slots = beatsPerBar * 4
  type Read = { prof: Record<Band, number[]>; spans: [number, number][]; dl: number[] }
  const read = (start: number): Read => {
    const beats = allBeats.slice(start)
    const prof: Record<Band, number[]> = { kick: Array(slots).fill(0), snare: Array(slots).fill(0), hat: Array(slots).fill(0) }
    const spans: [number, number][] = []
    // [off-16th delay sum, weight, on-16th delay sum, weight, off-8th delay sum, weight]
    const dl = [0, 0, 0, 0, 0, 0]
    for (let b0 = 0; b0 + beatsPerBar < beats.length; b0 += beatsPerBar) {
      spans.push([beats[b0], beats[b0 + beatsPerBar]])
      for (let k = 0; k < beatsPerBar; k++) {
        const t0 = beats[b0 + k], d = beats[b0 + k + 1] - t0
        for (let s = 0; s < 4; s++) {
          const t = t0 + (s * d) / 4
          for (const band of BANDS) {
            // swing moves the off 16ths late: look a little later for those
            const p = peakNear(nf[band], s % 2 ? t + d / 24 : t, d / 10, hopSec, offset)
            prof[band][k * 4 + s] += p.m
            if (band === 'hat' && p.m > 0.3) {
              const v = p.m * ((p.at - t) / (d / 4))
              if (s % 2) { dl[0] += v; dl[1] += p.m } else { dl[2] += v; dl[3] += p.m }
              if (s === 2) { dl[4] += v; dl[5] += p.m }
            }
          }
        }
      }
    }
    return { prof, spans, dl }
  }
  // where bar 1 is: the kick lands on 1, the snare on the backbeat (2 and 4, or 3 in a waltz) and not on 1
  const moveAt = (r: number) => { let a = 0, n = 0; for (let i = r; i < move.length; i += beatsPerBar) { a += move[i]; n++ } return n ? a / n : 0 }
  const moveAll = move.reduce((a, b) => a + b, 0) / (move.length || 1) || 1
  let best: Read | null = null, bestScore = -Infinity
  for (let r = 0; r < beatsPerBar; r++) {
    const rd = read(r)
    const n = rd.spans.length || 1
    const k = rd.prof.kick.map(v => v / n), sn = rd.prof.snare.map(v => v / n)
    const back = beatsPerBar === 4 ? sn[4] + sn[12] : sn[8]
    const score = 1.2 * (moveAt(r) / moveAll - 1) + 1.2 * k[0] + 0.4 * k[beatsPerBar === 4 ? 8 : 0] + back - 0.6 * sn[0] - 0.4 * (beatsPerBar === 4 ? k[4] + k[12] : k[8]) * 0.5
    if (score > bestScore) { bestScore = score; best = rd }
  }
  const { prof, spans: barSpans, dl } = best!
  const bars = barSpans.length
  if (bars < 2) return null
  for (const band of BANDS) { const m = Math.max(...prof[band]) || 1; prof[band] = prof[band].map(v => v / m) }
  // a weak snare reading right on a strong kick is the kick's click, not a snare
  prof.snare = prof.snare.map((v, i) => (prof.kick[i] > 0.7 && v < 0.85 ? v * 0.4 : v))
  for (const band of BANDS) prof[band] = prof[band].map(v => Math.round(v * 100) / 100)
  // how late the off 16ths land, against how late the hits on the beat read (the analysis has its own small lag)
  const base = dl[3] ? dl[2] / dl[3] : 0
  let swing = dl[1] ? Math.max(0, Math.min(0.33, dl[0] / dl[1] - base)) : 0
  // a shuffle on the 8ths: count it in half time so the 8ths become swung 16ths
  const e8 = dl[5] ? dl[4] / dl[5] - base : 0
  if (e8 > 0.25 && bpm > 130) { bpm = bpm / 2; swing = Math.min(0.33, e8 / 2 + 0.1) }
  if (swing < 0.05) swing = 0
  // chords and key
  const { chroma, bass } = barChroma(x, sr, barSpans)
  const sumC = new Array(12).fill(0), sumB = new Array(12).fill(0)
  chroma.forEach(c => c.forEach((v, i) => { sumC[i] += v })); bass.forEach(c => c.forEach((v, i) => { sumB[i] += v }))
  const kg = keyOf(sumC, sumB)
  const key = kg ? { root: SHARPS[(SHARPS.indexOf(kg.root) + 12) % 12] === kg.root ? kg.root : SHARPS[FLATS.indexOf(kg.root)] ?? 'C', minor: kg.minor } : null
  const flats = kg ? keyPrefersFlats(kg.root, kg.minor) : false
  const perBar = chroma.map((c, i) => {
    if (!c.some(v => v > 0)) return null
    const m = matchChords(c, bass[i]), g = m[0]
    // a plain triad unless the 7th is clearly there
    if (g.q === '7' || g.q === 'm7') { const tri = m.find(x => x.root === g.root && x.q === (g.q === 'm7' ? 'm' : '')); if (tri && g.score - tri.score < 0.04) return tri }
    return g
  })
  const names = perBar.map(g => (g ? chordName(g, flats) : '?'))
  let loop = findLoop(names.filter(n => n !== '?'), 4)
  if (!loop.length) loop = []
  let chords = loop.map(n => { const g = perBar[names.indexOf(n)]!; return { root: g.root, q: g.q, name: n } })
  // start the loop on the home chord when it's in there (C G Am F, not G Am F C)
  if (key) { const home = chords.findIndex(c => SHARPS[c.root] === key.root && (c.q === 'm' || c.q === 'm7') === key.minor); if (home > 0) chords = [...chords.slice(home), ...chords.slice(0, home)] }
  const kp = beatsPerBar === 4 ? prof : { kick: [...prof.kick, 0, 0, 0, 0], snare: [...prof.snare, 0, 0, 0, 0], hat: [...prof.hat, 0, 0, 0, 0] }
  return {
    bpm: Math.round(bpm), beatsPerBar, swing: Math.round(swing * 100) / 100, profile: prof, key, chords,
    nearest: nearestGroove(kp), bars,
    sure: { tempo: g.confidence, key: kg ? Math.max(0, Math.min(1, kg.score)) : 0 },
  }
}

/** A small seeded random (so Reroll gives a new beat and the same seed gives the same beat). */
export function rand(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }

export interface VibeOpts { close: number; seed: number; chords: boolean; kit?: KitId; bars?: 1 | 2 | 4 }
const VOICE: Record<Band, string> = { kick: 'kick', snare: 'snare', hat: 'hat' }

/** Words for what it heard, for the result card. */
export function describeVibe(v: Vibe): string {
  const feel = v.swing >= 0.22 ? 'swung' : v.swing >= 0.1 ? 'a little swing' : 'straight'
  const hats = v.profile.hat.filter(x => x > 0.5).length
  const busy = hats >= 12 ? '16th hi-hats' : hats >= 6 ? '8th hi-hats' : hats ? 'sparse hi-hats' : 'no clear hi-hat'
  const kicks = v.profile.kick.filter(x => x > 0.5).length
  return `${v.bpm} BPM, ${v.beatsPerBar === 3 ? 'in 3' : 'in 4'}, ${feel}, ${busy}, ${kicks <= 2 ? 'a simple kick' : kicks >= 6 ? 'a busy kick' : 'a moving kick'}`
}

/** A new beat with the song's feel. */
export function vibeBeat(v: Vibe, o: VibeOpts, base?: Partial<Beat>): Beat {
  const r = rand(o.seed * 7919 + 13)
  const slots = v.beatsPerBar * 4
  const g = grooveProfile(v.nearest)
  const gk = GROOVES.find(x => x.id === v.nearest)
  const close = Math.max(0, Math.min(1, o.close))
  const bars = o.bars ?? (v.chords.length >= 3 ? 4 : 2)
  const rows: DrumRow[] = []
  for (const band of BANDS) {
    const one = Array.from({ length: slots }, (_, i) => {
      const heard = v.profile[band][i]
      const known = v.beatsPerBar === 4 ? g[band][i] : (i % 4 === 0 ? g[band][i] : 0)
      // blend: close = what was heard, loose = the known groove
      let w = close * heard + (1 - close) * known
      // a little life: borderline hits come and go with the seed
      if (w > 0.28 && w < 0.5 && r() < 0.5) w = 0
      else if (w >= 0.18 && w <= 0.28 && r() < 0.35 * (1.2 - close)) w = 0.5
      return w >= 0.42 ? Math.round(Math.min(1, 0.45 + w * 0.55) * 100) / 100 : 0
    })
    // keep the backbone: kick on 1, a snare somewhere (2 and 4, or 3 in a waltz)
    if (band === 'kick' && !one[0]) one[0] = 1
    if (band === 'snare' && !one.some(x => x)) (v.beatsPerBar === 3 ? [8] : [4, 12]).forEach(i => { one[i] = 1 })
    // later bars: a small change each (a kick pushed, a ghost note) so it breathes
    const steps: number[] = []
    for (let b = 0; b < bars; b++) {
      const bar = [...one]
      if (b % 2 === 1) {
        if (band === 'kick') { const free = bar.map((x, i) => (!x && i > slots / 2 ? i : -1)).filter(i => i >= 0); if (free.length && r() < 0.7) bar[free[Math.floor(r() * free.length)]] = 0.7 }
        if (band === 'snare' && r() < 0.5) { const i = slots - 1 - Math.floor(r() * 3); if (!bar[i]) bar[i] = 0.35 }
      }
      steps.push(...bar, ...(v.beatsPerBar === 3 ? Array(4).fill(0) : []))
    }
    const row: DrumRow = { voice: VOICE[band] as DrumRow['voice'], steps }
    if (v.beatsPerBar === 3) { row.steps = steps.filter((_, i) => i % 16 < 12); row.len = 12 * bars; row.steps = [...row.steps, ...Array(16 * bars - row.steps.length).fill(0)] }
    rows.push(row)
  }
  // an open hat where the song leaves a gap on an off-beat (only at loose settings it may wander)
  if (v.beatsPerBar === 4 && v.profile.hat.filter(x => x > 0.5).length >= 6 && r() < 0.4 + 0.3 * (1 - close)) {
    rows.push({ voice: 'open' as DrumRow['voice'], steps: Array.from({ length: 16 * bars }, (_, i) => (i % 16 === 14 && (i >> 4) % 2 === 1 ? 0.6 : 0)) })
  }
  const key = v.key ?? { root: 'A', minor: true }
  const tracks: Track[] = []
  if (o.chords && v.chords.length) {
    const barSteps: 12 | 16 = v.beatsPerBar === 3 ? 12 : 16
    const trackLen = v.beatsPerBar === 3 ? 12 * bars : undefined
    const kpc = SHARPS.indexOf(key.root)
    const type = (q: Quality) => (q === 'm' ? 'min' : q === '7' ? '7' : q === 'm7' ? 'm7' : 'maj')
    const prog: [number, string][] = Array.from({ length: bars }, (_, b) => { const c = v.chords[b % v.chords.length]; return [((c.root - kpc) % 12 + 12) % 12, type(c.q)] })
    const hatsBusy = v.profile.hat.filter(x => x > 0.5).length
    const pattern = v.swing >= 0.15 ? 'stabs' : hatsBusy >= 10 ? 'pulse' : 'hold'
    tracks.push({ id: newId(), inst: 'grand', notes: chordNotesFor(prog, key.root, 57, pattern, 'close', barSteps), vol: 0.55, space: 0.25, ...(trackLen ? { len: trackLen } : {}) })
    const kickSteps = rows[0].steps.slice(0, barSteps).map((x, i) => (x ? i : -1)).filter(i => i >= 0)
    const fallbackKick = v.beatsPerBar === 3 ? [0, 4, 8] : [0, 8]
    tracks.push({ id: newId(), inst: 'bass', notes: bassNotesFor(prog, key.root, 33, kickSteps.length ? kickSteps : fallbackKick, 2, barSteps), vol: 0.8, space: 0.03, ...(trackLen ? { len: trackLen } : {}) })
  }
  return {
    name: 'Song vibe', bpm: v.bpm, bars: bars as Beat['bars'], swing: v.swing, kit: o.kit ?? gk?.kit ?? 'studio', rows, tracks,
    key: key.root, minor: key.minor, drumVol: 0.9, ...base,
  }
}

export const flatsFor = (v: Vibe) => (v.key ? keyPrefersFlats(v.key.root, v.key.minor) : false)
export const chordLine = (v: Vibe) => v.chords.map(c => c.name).join('  ')
