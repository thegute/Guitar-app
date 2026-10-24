// "Play with the band": the other parts of a song under the one you're playing. A Guitar Pro file's drums, bass
// and other guitars, or (for songbook songs and anything with chord names) drums and bass made from the chords.
// Events are in beats from the start of the song, laid out on the same timeline as the tab you're playing.
import { playDrum, grooveOf, type Voice } from './drums'
import { bassLine, bassMidi } from './bass'
import { playBass, playNote, strum, soundForProgram, type Handle, type SoundId } from './pluck'
import { parseSymbol } from '../theory/chords'
import { pc } from '../theory/notes'
import { typeTones } from '../theory/progressions'
import { trackPickup, type FlatStep, type Song, type SongTrack } from '../tabs/model'

export interface DrumHit { beat: number; voice: Voice; vel: number }
export interface BandEvent {
  beat: number
  kind: 'drum' | 'bass' | 'gtr'
  level: number
  /** length in beats (bass and guitar notes) */
  dur: number
  voice?: Voice
  kit?: Record<string, string>
  midis?: number[]
  sound?: SoundId
}

/** General MIDI drum numbers → the app's recorded kit. */
export function gmDrum(n: number): Voice | null {
  if (n === 35 || n === 36) return 'kick'
  if (n === 37 || n === 31 || n === 33) return 'rim'
  if (n === 38 || n === 40 || n === 34 || n === 91) return 'snare'
  if (n === 39) return 'clap'
  if (n === 41 || n === 43) return 'tom3'
  if (n === 45 || n === 47) return 'tom2'
  if (n === 48 || n === 50) return 'tom1'
  if (n === 42) return 'hat'
  if (n === 44) return 'pedal'
  if (n === 46 || n === 92) return 'open'
  if (n === 49 || n === 57 || n === 52 || n === 55 || n === 30 || n === 97 || n === 98) return 'crash'
  if (n === 51 || n === 59 || n === 93 || n === 126 || n === 29) return 'ride'
  if (n === 53 || n === 127) return 'bell'
  if (n === 54 || n === 111 || n === 112 || n === 113) return 'tamb'
  if (n === 56 || (n >= 99 && n <= 103)) return 'cowbell'
  if (n === 69 || n === 70 || n === 82 || n === 119) return 'shaker'
  return null
}

const isBass = (t: SongTrack) => /bass/i.test(t.name) || (t.program !== undefined && t.program >= 32 && t.program <= 39) || t.tuning[0] <= 35

/** Does this song have anything to play along with? */
export function hasBand(song: Song, main: number) {
  return !!song.drums?.length || !!song.backing || song.tracks.some((t, i) => i !== main && t.bars.some(b => b.steps.some(s => s.notes.length)))
}

const SUFFIX_TYPE: Record<string, string> = { major: '', minor: 'm', '7': '7', m7: 'm7', maj7: 'maj7', dim: 'dim', dim7: 'dim7', aug: 'aug', sus2: 'sus2', sus4: 'sus4', '6': '6', m6: 'm6', '9': '9', m9: 'm9', m7b5: 'm7b5', '7sus4': '7sus4', add9: 'add9' }
const bassChord = (name: string) => { const { root, suffix } = parseSymbol(name); return { root: pc(root), tones: typeTones(SUFFIX_TYPE[suffix] ?? '') } }

/** Start beat of every step of a track. */
export function stepBeats(track: SongTrack): number[] {
  const out: number[] = []
  let b = 0
  for (const bar of track.bars) for (const s of bar.steps) { out.push(b); b += s.dur }
  return out
}

/** Everything the band plays, sorted by beat. */
export function bandEvents(song: Song, main: number): BandEvent[] {
  const ev: BandEvent[] = []
  for (const d of song.drums ?? []) ev.push({ beat: d.beat, kind: 'drum', voice: d.voice, level: 0.75 * d.vel, dur: 0 })
  song.tracks.forEach((t, i) => {
    if (i === main) return
    const bass = isBass(t)
    const sound = bass ? undefined : soundForProgram(t.program) ?? 'clean'
    let b = 0
    for (const bar of t.bars) for (const s of bar.steps) {
      const ms = s.notes.filter(n => n.tech !== 'x').map(n => n.midi)
      if (ms.length) ev.push({ beat: b, kind: bass ? 'bass' : 'gtr', midis: ms, dur: s.dur, level: bass ? 0.9 : 0.42, sound })
      b += s.dur
    }
  })
  if (song.backing) ev.push(...backingEvents(song, song.tracks[main]))
  return ev.sort((a, b) => a.beat - b.beat)
}

/** Drums and bass made from the chord names of a track (songbook songs). */
function backingEvents(song: Song, track: SongTrack): BandEvent[] {
  const { groove, bass } = song.backing!
  const meter = song.meter ?? 4
  const beats = stepBeats(track)
  const flat = track.bars.flatMap(b => b.steps)
  const total = flat.reduce((a, s) => a + s.dur, 0)
  // chord changes along the song
  const changes: { beat: number; name: string }[] = []
  flat.forEach((s, i) => { if (s.chord && changes[changes.length - 1]?.name !== s.chord) changes.push({ beat: beats[i], name: s.chord }) })
  if (!changes.length) return []
  const chordAt = (b: number) => { let k = 0; while (k + 1 < changes.length && changes[k + 1].beat <= b + 1e-6) k++; return k }
  // a pickup bar: the band comes in on the first full bar
  const first = track.bars[0]?.steps.reduce((a, s) => a + s.dur, 0) ?? meter
  const start = trackPickup(track, meter) > 0 ? first : 0
  const ev: BandEvent[] = []
  const g = grooveOf(groove)
  const span = meter === 3 ? 3 : 4
  const waltz: [number, Voice, number][] = [[0, 'kick', 1], [0, 'hat', 0.55], [1, 'snare', 0.5], [1, 'hat', 0.5], [2, 'snare', 0.4], [2, 'hat', 0.5]]
  const line = bassLine(bass)
  let prev: number | null = null
  for (let b0 = start; b0 < total - 1e-6; b0 += span) {
    const hits = meter === 3 ? waltz : g?.hits ?? []
    for (const [p, v, l] of hits) if (b0 + p < total) ev.push({ beat: b0 + p, kind: 'drum', voice: v, level: l * 0.62 * (meter === 3 ? 1 : g?.level ?? 1), kit: g?.kit as Record<string, string> | undefined, dur: 0 })
    for (const [p, deg, len, lv] of line?.hits ?? []) {
      if (meter === 3 && p >= 3) continue
      const at = b0 + p
      if (at >= total) continue
      const k = chordAt(at)
      const c = bassChord(changes[k].name)
      const nx = changes[k + 1] ? bassChord(changes[k + 1].name) : null
      const m = bassMidi(deg, c, nx, Math.floor(p), prev)
      prev = m
      ev.push({ beat: at, kind: 'bass', midis: [m], dur: len, level: 0.8 * lv * (line?.level ?? 1) })
    }
  }
  return ev
}

/** The band's events for each step of the tab you're playing, with their offset (in beats) from the step. */
export function bandByStep(events: BandEvent[], flat: FlatStep[]): { off: number; e: BandEvent }[][] {
  const out: { off: number; e: BandEvent }[][] = flat.map(() => [])
  let b = 0, k = 0
  flat.forEach((f, i) => {
    const end = b + f.step.dur
    while (k < events.length && events[k].beat < b - 1e-6) k++
    while (k < events.length && events[k].beat < end - 1e-6) { out[i].push({ off: events[k].beat - b, e: events[k] }); k++ }
    b = end
  })
  return out
}

/** Plays band events; keeps one bass note at a time and lets every note stop when its length is up. */
export class BandVoices {
  private bass: Handle | null = null
  private all: Handle[] = []
  constructor(public level = 1) {}
  play(e: BandEvent, t: number, spb: number) {
    if (e.kind === 'drum') { playDrum(e.voice!, t, e.level * this.level, undefined, e.kit as never); return }
    const end = t + Math.max(0.08, e.dur * spb * 0.95)
    if (e.kind === 'bass') {
      this.bass?.stop(t)
      const h = playBass(e.midis![0], t, e.level * 0.8 * this.level)
      h.stop(end)
      this.bass = h
      this.all.push(h)
      return
    }
    const ms = e.midis!
    const h = ms.length >= 3 ? strum(ms, t, { gain: e.level * this.level, sound: e.sound, spread: 0.01 }) : (() => {
      const hs = ms.map(m => playNote(m, t, e.level * this.level, undefined, { sound: e.sound }))
      return { stop: (at?: number) => hs.forEach(x => x.stop(at)) }
    })()
    h.stop(end)
    this.all.push(h)
    if (this.all.length > 300) this.all.splice(0, 150)
  }
  stop(at?: number) {
    for (const h of this.all) h.stop(at)
    this.all = []
    this.bass = null
  }
}
