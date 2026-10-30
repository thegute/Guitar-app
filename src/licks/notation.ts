// Licks are written as tab, the way guitarists read them, in a reference key and position:
//   strings 1–6 (1 = high e, 6 = low E), "S:F" = string S at fret F, "S:F+S:F" = played together
//   a duration token sets the length for the notes after it: w h q e s (whole … sixteenth), t = eighth-note
//   triplet, x = sixteenth triplet, sx = sextuplet sixteenth, add "." for dotted (q. e.)
//   "r" is a rest of the current length, "|" is a bar line (checked: every bar must be full)
//   after the fret: h hammer-on, p pull-off, / slide up into, \ slide down into, b bend a whole step, bh half step,
//   bq quarter, b3 step and a half, pb pre-bend, r release, ~ vibrato, m palm mute, n harmonic, t tap; "x" as
//   the fret is a muted (dead) note
// Example (A minor pentatonic, box 1):  "e 1:8 1:5 2:8b 2:5 | q 3:7b~ e 3:5 4:7 h 4:7~"
import type { Song, SongBar, SongStep } from '../tabs/model'

export interface LickNote { string: number; fret: number; tech?: string }
export interface LickEvent { notes: LickNote[]; dur: number }

const DUR: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 1 / 3, x: 1 / 6, sx: 1 / 6 }

/** Parse lick tab. Strings come back 0 = lowest (the app's order) for a 6-string guitar. */
export function parseLick(text: string, strings = 6): { events: LickEvent[]; bars: number[] } {
  const events: LickEvent[] = []
  const bars: number[] = []
  let dur = 0.5
  let inBar = 0
  for (const tok of text.trim().split(/\s+/)) {
    if (!tok) continue
    if (tok === '|') { bars.push(inBar); inBar = 0; continue }
    const d = /^(w|h|q|e|s|t|x|sx)(\.?)$/.exec(tok)
    if (d) { dur = DUR[d[1]] * (d[2] ? 1.5 : 1); continue }
    if (tok === 'r') { events.push({ notes: [], dur }); inBar += dur; continue }
    const notes: LickNote[] = []
    for (const part of tok.split('+')) {
      const m = /^([1-6]):(\d{1,2}|x)([a-z/\\~0-9]*)$/.exec(part)
      if (!m) throw new Error(`lick tab: can't read "${part}" in "${text}"`)
      const s = strings - Number(m[1])
      const fret = m[2] === 'x' ? 0 : Number(m[2])
      const tech = m[2] === 'x' ? 'x' : techOf(m[3])
      notes.push({ string: s, fret, ...(tech ? { tech } : {}) })
    }
    events.push({ notes, dur })
    inBar += dur
  }
  if (inBar > 1e-6) bars.push(inBar)
  return { events, bars }
}

/** Technique letters → the marks the tab shows (and the player bends to). */
function techOf(t: string): string | undefined {
  if (!t) return undefined
  const map: [RegExp, string][] = [[/^pb/, 'pb'], [/^b3/, 'b1½'], [/^bh/, 'b½'], [/^bq/, 'b¼'], [/^b/, 'b'], [/^h/, 'h'], [/^p/, 'p'], [/^\//, '/'], [/^\\/, '\\'], [/^r/, 'r'], [/^~/, '~'], [/^m/, 'PM'], [/^n/, 'harm'], [/^t/, 'T']]
  const out: string[] = []
  let rest = t
  while (rest) {
    const hit = map.find(([re]) => re.test(rest))
    if (!hit) break
    out.push(hit[1])
    rest = rest.replace(hit[0], '')
  }
  return out.join('') || undefined
}

/** A bent note let back down ("r"). */
export const isRelease = (tech?: string) => !!tech && /r/.test(tech.replace('harm', ''))
/** How far a note's tech bends it, in semitones (for playback; a release starts that far up). */
export function bendOf(tech?: string): number {
  if (!tech) return 0
  if (tech.includes('b1½')) return 3
  if (tech.includes('b½')) return 1
  if (tech.includes('b¼')) return 0.5
  if (/b/.test(tech) || isRelease(tech)) return 2
  return 0
}

export function lickBeats(text: string) { return parseLick(text).bars.reduce((a, b) => a + b, 0) }

/** Events → a one-track song. `shift` moves every fretted note; `capo` keeps open strings open (a capo does that). */
export function lickSong(events: LickEvent[], o: { tuning: number[]; shift?: number; capo?: number; title: string; tempo: number; program?: number; meter?: number }): Song {
  const meter = o.meter ?? 4
  const shift = o.shift ?? 0
  const capo = o.capo ?? 0
  const bars: SongBar[] = []
  let bar: SongStep[] = [], used = 0
  const push = (st: SongStep) => {
    bar.push(st)
    used += st.dur
    if (used >= meter - 1e-6) { bars.push({ steps: bar }); bar = []; used = 0 }
  }
  for (const ev of events) {
    let left = ev.dur, first = true
    while (left > 1e-6) {
      const take = Math.min(left, meter - used)
      const notes = first ? ev.notes.map(n => {
        const fret = n.tech === 'x' ? 0 : n.fret + shift
        return { string: n.string, fret, midi: o.tuning[n.string] + capo + fret, ...(n.tech ? { tech: n.tech } : {}) }
      }) : []
      push({ notes, dur: Math.round(take * 10000) / 10000 })
      left -= take
      first = false
    }
  }
  if (bar.length) { bar.push({ notes: [], dur: Math.round((meter - used) * 10000) / 10000 }); bars.push({ steps: bar }) }
  return { title: o.title, tempo: o.tempo, ...(meter !== 4 ? { meter } : {}), tracks: [{ name: o.title, tuning: o.tuning, capo, bars, program: o.program }] }
}

/** Lowest and highest fret used (open strings and dead notes left out). */
export function fretSpan(events: LickEvent[]) {
  let lo = 99, hi = -1
  for (const e of events) for (const n of e.notes) if (n.tech !== 'x' && n.fret > 0) { lo = Math.min(lo, n.fret); hi = Math.max(hi, n.fret) }
  return hi < 0 ? { lo: 0, hi: 0, open: true } : { lo, hi, open: events.some(e => e.notes.some(n => n.fret === 0 && n.tech !== 'x')) }
}
