// The 4-track looper, locked to the beat maker's clock (one shared transport). Each track holds a loop for part A and
// one for part B; a loop is 1, 2, 4 or 8 times the beat's length (or set by hand: "Auto"), and every command you give
// (record, overdub, stop, switch A/B) is armed and lands exactly on the next bar line. Overdubs fold onto the loop
// however many times round you play. Track roles are defaults you can ignore: 1 rhythm, 2 embellishments,
// 3 bass (played back an octave lower, so a guitar becomes a bass), 4 lead (the others dip a little while it plays).
// Recordings are kept in IndexedDB; the bass octave, half speed and backwards are worked out once and cached.
import { audio } from '../audio/engine'
import { InputRecorder } from '../audio/looper'
import { kindOf, latencyMs } from '../audio/gear'
import { haptic, quietForMic } from '../audio/tapFeel'
import { loopTempo } from '../audio/tempo'
import { resample } from '../ml/dsp'
import { gridOffset, rotate, stretch } from '../studio/loops'
import { applyMicFx, type MicFx } from '../studio/micFx'
import { shiftSamples, stretchSamples } from '../studio/pitchShift'
import { loadBeat, pushBeat, saveBeat, setBars, type Beat, type PartId } from '../studio/beat'
import { sharedTransport } from '../studio/shared'
import type { StudioTransport } from '../studio/transport'
import { findAttack, PlayTrigger, wrapPreRoll, armBar, autoLength, lengths, duckCurve, foldTake, mixTakes, MULTS, peaks, phaseBars, smoothSeam, tempoFromLoop } from './logic'
import { dropTake, getTake, loadSession, putTake, saveSession } from './store'
import { bufferOf, each, levelTake, midOf, mixStereo, stretchTake, sub, type Take } from './take'
import { bassLine, notesIn, type BassNote } from './smartBass'
import { playBass, type Handle } from '../audio/pluck'

import { ROLES, type Role } from './roles'
export { ROLES, type Role }
export type LoopPart = 'A' | 'B'
/** Auto (close it by hand) or a length in bars */
export type LenChoice = 'auto' | number

export interface PartLoop {
  /** loop length in bars (before half speed) */
  len: number
  /** the absolute bar the loop's start fell on (only `origin mod len` matters) */
  origin: number
  takes: string[]
  /** undone takes, newest last; a Clear is one group */
  redo: string[][]
  /** trimmed: where each take starts playing (seconds in), the trim's start for the editor, the length before trimming */
  offs?: Record<string, number>
  start?: number
  full?: number
  /** smart bass: the line heard in the takes (beats), and which takes / trim it was heard from */
  notes?: BassNote[]
  notesOf?: string
}
export interface Track {
  role: Role
  vol: number
  pan: number
  mute: boolean
  solo: boolean
  rev: boolean
  half: boolean
  /** bass: an octave lower on playback */
  octave: boolean
  /** lead: the others dip while it plays */
  duck: boolean
  lenChoice: LenChoice
  parts: Partial<Record<LoopPart, PartLoop>>
  /** the role's tone (each part gets its own space in the mix: rhythm a little back and less boomy, lead forward) */
  tone?: boolean
  /** how much of the shared room (reverb) it gets, 0…1 */
  room?: number
  /** bass: played by a real recorded bass from the notes you played, instead of your guitar an octave down */
  smart?: boolean
}
export interface Session {
  tracks: Track[]
  part: LoopPart
  sel: number
  /** the tempo the takes were recorded at (a new beat tempo stretches them to fit) */
  bpm: number | null
  /** how a recording starts when nothing is playing: a bar of count-in, or straight away (the first loop sets the tempo) */
  start: 'count' | 'free' | 'play'
  align: boolean
  beatOn: boolean
  click: boolean
  advance: boolean
}

export type RecStatus = 'armed' | 'rec' | 'closing' | 'working'
export interface Rec {
  track: number
  part: LoopPart
  kind: 'new' | 'dub' | 'free'
  status: RecStatus
  /** absolute bar it starts on (free: the audio time instead) */
  startBar: number
  startT: number
  /** fixed length (bars) or null for Auto until it's closed */
  endBar: number | null
  /** start when I play: armed and listening for the first note */
  wait?: boolean
}

/** Each role's place in the mix: low cut, a cut or lift in the middle, presence, top. */
const TONE: Record<Role, { hp: number; lp: number; mid: [number, number]; pres: [number, number] }> = {
  rhythm: { hp: 90, lp: 16000, mid: [330, -2.5], pres: [2800, -1] },
  embellish: { hp: 170, lp: 16000, mid: [500, -2], pres: [3200, 1.5] },
  bass: { hp: 35, lp: 3800, mid: [700, -2], pres: [1500, 0] },
  lead: { hp: 130, lp: 16000, mid: [400, -1.5], pres: [2800, 2.5] },
}
const FLAT = { hp: 15, lp: 20000, mid: [1000, 0] as [number, number], pres: [3000, 0] as [number, number] }
const ROOM: Record<Role, number> = { rhythm: 0.1, embellish: 0.22, bass: 0, lead: 0.2 }
/** A soft room: stereo noise fading over ~1.4 s, darker as it fades. */
function roomIr(ctx: BaseAudioContext): AudioBuffer {
  const sr = ctx.sampleRate, n = Math.round(sr * 1.6)
  const b = ctx.createBuffer(2, n, sr)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c)
    let lp = 0
    for (let i = 0; i < n; i++) {
      const t = i / sr
      const k = 0.35 + 0.6 * Math.exp(-t * 2.5)
      lp = lp + k * ((Math.random() * 2 - 1) - lp)
      d[i] = lp * Math.exp(-t * 3.2) * (i < sr * 0.012 ? i / (sr * 0.012) : 1) * 0.35
    }
  }
  return b
}
const freshTrack = (role: Role): Track => ({ role, vol: role === 'bass' ? 1.1 : 1, pan: role === 'embellish' ? 0.25 : role === 'lead' ? -0.15 : 0, mute: false, solo: false, rev: false, half: false, octave: role === 'bass', duck: role === 'lead', lenChoice: 'auto', parts: {} })
const freshSession = (): Session => ({ tracks: ROLES.map(r => freshTrack(r.role)), part: 'A', sel: 0, bpm: null, start: 'count', align: true, beatOn: true, click: false, advance: true })
/** The looper's own effect on what you record (its own setting: the beat maker's mic effect no longer carries over) */
export const LOOPER_FX_KEY = 'looperFx'
const looperFx = (): MicFx => { try { return (JSON.parse(localStorage.getItem(`kg:${LOOPER_FX_KEY}`) ?? '"none"') as MicFx) || 'none' } catch { return 'none' } }

interface Voice { src: AudioBufferSourceNode; fade: GainNode; start: number; end: number }
interface Out { gain: GainNode; pan: StereoPannerNode; hp: BiquadFilterNode; lp: BiquadFilterNode; mid: BiquadFilterNode; pres: BiquadFilterNode; send: GainNode }
interface Ready { key: string; buf: AudioBuffer; lenBars: number; peaks: Float32Array; duck?: Float32Array }

const trimSig = (l: PartLoop) => (l.offs ? Object.values(l.offs).map(v => v.toFixed(4)).join(',') : '')
const fmtLen = (bars: number) => (Number.isInteger(bars) ? `${bars} bar${bars > 1 ? 's' : ''}` : `${Math.round(bars * 4)} beats`)
const monoOf = (b: AudioBuffer) => midOf({ l: b.getChannelData(0), r: b.numberOfChannels > 1 ? b.getChannelData(1) : null })

export class LoopStation {
  s: Session
  rec: Rec | null = null
  note = ''
  version = 0
  private t: StudioTransport
  /** the takes as they play now (fitted to the beat's tempo) */
  private takes = new Map<string, Take>()
  /** each take as recorded, with the tempo it was recorded at: a tempo change always stretches from these, never from
   *  a stretched copy (stretching a stretch again and again is what garbled loops) */
  private origs = new Map<string, { take: Take; bpm: number | null }>()
  private ready = new Map<string, Ready>()
  private building = new Set<string>()
  private voices: Voice[][] = [[], [], [], []]
  /** smart bass notes scheduled ahead (stopped with the track) */
  private bassNotes: { h: Handle; start: number; end: number }[] = []
  private until = [0, 0, 0, 0]
  private outs: Out[] = []
  private duck: GainNode
  private bus: GainNode
  private timer: ReturnType<typeof setInterval> | null = null
  private wasPlaying = false
  private recorder: InputRecorder | null = null
  private listeners = new Set<() => void>()
  /** part switch armed for this audio time */
  partAt: { part: LoopPart; t: number } | null = null
  /** stop armed for this audio time */
  stopAt: number | null = null
  private loaded: Promise<void>
  private fitting = false
  private trigger: PlayTrigger | null = null

  constructor() {
    this.t = sharedTransport()
    this.s = { ...freshSession(), ...(loadSession<Session>() ?? {}) }
    const ctx = audio()
    this.bus = ctx.createGain()
    this.bus.connect(this.t.loopBus)
    this.duck = ctx.createGain()
    this.duck.connect(this.bus)
    // one room shared by the four tracks (a short, soft hall made here: no file to load)
    const room = ctx.createConvolver()
    room.buffer = roomIr(ctx)
    const roomOut = ctx.createGain(); roomOut.gain.value = 0.9
    room.connect(roomOut).connect(this.bus)
    for (let i = 0; i < 4; i++) {
      const gain = ctx.createGain()
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.Q.value = 0.7
      const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.Q.value = 0.9
      const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.Q.value = 0.8
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7
      const pan = ctx.createStereoPanner()
      const send = ctx.createGain()
      gain.connect(hp).connect(mid).connect(pres).connect(lp).connect(pan).connect(i === 3 ? this.bus : this.duck)
      pan.connect(send).connect(room)
      this.outs.push({ gain, pan, hp, lp, mid, pres, send })
    }
    this.t.keep = () => this.t.playing && (this.hasAudio() || !!this.rec)
    this.applyMix()
    this.applyBeat()
    this.loaded = this.loadTakes()
    this.timer = setInterval(() => this.tick(), 25)
  }

  // ───────── state for screens
  on(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f) } }
  private changed(save = true) {
    this.version++
    if (save) saveSession(this.s)
    this.listeners.forEach(f => f())
  }
  get transport() { return this.t }
  get beat(): Beat { return this.t.beat }
  get playing() { return this.t.playing }
  get barDur() { return this.t.barDur }
  /** the beat's length in bars: loop lengths are multiples of it */
  get base() { return this.t.beat.bars }
  /** absolute bar now (fractional; negative during a count-in) */
  barNow(at = audio().currentTime) { return (at - this.t.t0) / this.t.barDur }
  loopOf(i: number, part = this.s.part): PartLoop | null { const l = this.s.tracks[i].parts[part]; return l && l.takes.length ? l : null }
  hasAudio() { return this.s.tracks.some(tr => Object.values(tr.parts).some(p => p && p.takes.length)) }
  /** how far round its loop track i is (0..1), or null */
  progress(i: number, at = audio().currentTime): number | null {
    const l = this.loopOf(i)
    const r = this.readyFor(i)
    if (!l || !this.playing) return null
    const len = r?.lenBars ?? l.len
    return phaseBars(this.barNow(at), l.origin, len) / len
  }
  peaksOf(i: number): Float32Array | null { return this.readyFor(i)?.peaks ?? null }
  lengthOf(i: number): number | null { const l = this.loopOf(i); if (!l) return null; return l.len * (this.s.tracks[i].half ? 2 : 1) }

  // ───────── settings
  set(patch: Partial<Session>) {
    this.s = { ...this.s, ...patch }
    this.applyMix(); this.applyBeat()
    this.changed()
  }
  setTrack(i: number, patch: Partial<Track>) {
    const before = this.s.tracks[i]
    this.s.tracks = this.s.tracks.map((tr, k) => (k === i ? { ...tr, ...patch } : tr))
    const sound = patch.rev !== undefined || patch.half !== undefined || patch.octave !== undefined || patch.smart !== undefined
    if (sound && (patch.rev !== before.rev || patch.half !== before.half || patch.octave !== before.octave || patch.smart !== before.smart)) this.restartTrack(i)
    if (patch.duck !== undefined && i === 3) this.resetDuck()
    this.applyMix()
    this.changed()
  }
  select(i: number) { this.s.sel = i; this.changed() }
  private applyMix() {
    const now = audio().currentTime
    const solo = this.s.tracks.some(tr => tr.solo)
    this.s.tracks.forEach((tr, i) => {
      const on = !tr.mute && (!solo || tr.solo)
      this.outs[i].gain.gain.setTargetAtTime(on ? tr.vol : 0, now, 0.015)
      this.outs[i].pan.pan.setTargetAtTime(tr.pan, now, 0.02)
      const o = this.outs[i], eq = tr.tone === false ? FLAT : TONE[tr.role]
      o.hp.frequency.setTargetAtTime(eq.hp, now, 0.02)
      o.lp.frequency.setTargetAtTime(eq.lp, now, 0.02)
      o.mid.frequency.setTargetAtTime(eq.mid[0], now, 0.02); o.mid.gain.setTargetAtTime(eq.mid[1], now, 0.02)
      o.pres.frequency.setTargetAtTime(eq.pres[0], now, 0.02); o.pres.gain.setTargetAtTime(eq.pres[1], now, 0.02)
      o.send.gain.setTargetAtTime(tr.room ?? ROOM[tr.role], now, 0.05)
    })
    if (this.s.tracks[3].mute || !this.s.tracks[3].duck || (solo && !this.s.tracks[3].solo)) this.resetDuck()
  }
  private applyBeat() {
    const now = audio().currentTime
    this.t.beatBus.gain.setTargetAtTime(this.s.beatOn ? 1 : 0, now, 0.02)
    this.t.click = this.s.click
  }

  // ───────── takes
  private async loadTakes() {
    const ids = new Set(this.s.tracks.flatMap(tr => Object.values(tr.parts).flatMap(p => (p ? [...p.takes, ...p.redo.flat()] : []))))
    const sr = audio().sampleRate
    await Promise.all([...ids].map(async id => {
      const t = await getTake(id)
      if (!t) return
      const rs = (x: Float32Array) => (t.sr === sr ? x : resample(x, t.sr, sr))
      const take: Take = { l: rs(t.data), r: t.right ? rs(t.right) : null }
      this.origs.set(id, { take, bpm: t.bpm ?? this.s.bpm })
      this.takes.set(id, take)
    }))
    // takes that went missing (storage cleared) leave their loops
    for (const tr of this.s.tracks) for (const k of Object.keys(tr.parts) as LoopPart[]) {
      const p = tr.parts[k]
      if (p) { p.takes = p.takes.filter(id => this.takes.has(id)); p.redo = p.redo.map(g => g.filter(id => this.takes.has(id))).filter(g => g.length) }
    }
    this.changed(false)
  }
  /** pieces of sound the phone dropped during the last recording (0 = a clean take) */
  dropped = 0
  /** The looper's effect, if one is picked: EQ / fuzz / reverb on each channel, pitch effects on the middle. */
  private async withFx(x: Take, sr: number): Promise<Take> {
    const fx = looperFx()
    if (fx === 'none') return x
    if (fx === 'synth' || fx === 'octaveUp' || fx === 'octaveDown') return { l: await applyMicFx(midOf(x), sr, fx, { keepLength: true }), r: null }
    return { l: await applyMicFx(x.l, sr, fx, { keepLength: true }), r: x.r ? await applyMicFx(x.r, sr, fx, { keepLength: true }) : null }
  }
  /** A part's takes played together, each from its trim start, `n` samples long. */
  private mixOf(l: PartLoop, n: number, sr: number): Take {
    const list = l.takes.map(id => {
      const t = this.takes.get(id)
      if (!t) return null
      const off = Math.round((l.offs?.[id] ?? 0) * sr)
      return off ? each(t, y => rotate(y, off)) : t
    }).filter(Boolean) as Take[]
    return mixStereo(list, n)
  }

  // ───────── trim (cut the dead space, move the start, line it up with the beat): the takes are never changed
  /** What the trim editor shows: the untrimmed loop's waveform and where the trim sits on it (seconds). */
  trimView(i: number, part = this.s.part): { peaks: Float32Array; fullSec: number; start: number; lenSec: number; barSec: number } | null {
    const l = this.s.tracks[i].parts[part]
    if (!l || !l.takes.length) return null
    const sr = audio().sampleRate
    const full = l.full ?? l.len
    const n = Math.round(full * this.barDur * sr)
    const base: PartLoop = { ...l, offs: Object.fromEntries(l.takes.map(id => [id, (l.offs?.[id] ?? 0) - (l.start ?? 0)])) }
    return { peaks: peaks(midOf(this.mixOf(base, n, sr)), 240), fullSec: full * this.barDur, start: l.start ?? 0, lenSec: l.len * this.barDur, barSec: this.barDur }
  }
  /** Trim a loop: it starts `start` seconds into what was recorded and lasts `lenBars` (beats count: 0.25 = a beat). */
  setTrim(i: number, start: number, lenBars: number, part = this.s.part) {
    const l = this.s.tracks[i].parts[part]
    if (!l || !l.takes.length) return
    l.full ??= l.len
    const d = start - (l.start ?? 0)
    l.offs = Object.fromEntries(l.takes.map(id => [id, (l.offs?.[id] ?? 0) + d]))
    l.start = start
    l.len = Math.max(0.25, Math.round(lenBars * 4) / 4)
    this.note = `Track ${i + 1} trimmed: ${fmtLen(l.len)}.`
    this.restartTrack(i); this.changed()
  }
  /** Back to the loop as it was recorded. */
  resetTrim(i: number, part = this.s.part) {
    const l = this.s.tracks[i].parts[part]
    if (!l || !l.takes.length || l.full === undefined) return
    const st = l.start ?? 0
    l.offs = Object.fromEntries(l.takes.map(id => [id, (l.offs?.[id] ?? 0) - st]))
    l.len = l.full; l.start = 0; delete l.full
    this.note = `Track ${i + 1}: trim undone.`
    this.restartTrack(i); this.changed()
  }
  /** Trim by itself: the loop starts at your first note and ends at the last whole beat (or bar) with sound in it. */
  autoTrim(i: number, snap: 'bar' | 'beat' = 'bar', part = this.s.part): string {
    const v = this.trimView(i, part)
    const l = this.s.tracks[i].parts[part]
    if (!v || !l) return 'Nothing to trim.'
    const sr = audio().sampleRate
    const full = l.full ?? l.len
    const n = Math.round(full * this.barDur * sr)
    const base: PartLoop = { ...l, offs: Object.fromEntries(l.takes.map(id => [id, (l.offs?.[id] ?? 0) - (l.start ?? 0)])) }
    const m = midOf(this.mixOf(base, n, sr))
    const a = findAttack(m.subarray(0, Math.min(m.length, Math.round(sr * 1.5))), sr)
    // the end: the last 20 ms with real sound in it (3 % of the loudest)
    const hop = Math.round(sr * 0.02)
    let top = 0
    for (let k = 0; k < m.length; k++) top = Math.max(top, Math.abs(m[k]))
    let end = m.length
    for (let k = m.length - hop; k > a; k -= hop) { let p = 0; for (let j = k; j < k + hop; j++) p = Math.max(p, Math.abs(m[j])); if (p > top * 0.03) { end = k + hop; break } }
    // a start that's only a hair in (under 30 ms) is the loop starting on the beat already
    const start = a / sr < 0.03 ? 0 : a / sr
    const beat = this.barDur / 4
    const beats = Math.max(1, Math.ceil((end / sr - start) / beat - 0.15))
    const lenBars = snap === 'bar' ? Math.max(1, Math.ceil(beats / 4)) : beats / 4
    if (Math.abs(lenBars - l.len) < 1e-6 && Math.abs(start - (l.start ?? 0)) < 0.005) return 'Already tight: nothing to cut.'
    this.setTrim(i, start, lenBars, part)
    return `Trimmed to ${fmtLen(lenBars)}${start > 0 ? `, starting ${Math.round(start * 1000)} ms in (your first note)` : ''}.`
  }
  /** Move the loop so its notes land on the beat (the grid the beat maker plays). */
  lineUp(i: number, part = this.s.part): string {
    const l = this.s.tracks[i].parts[part]
    if (!l || !l.takes.length) return 'Nothing to line up.'
    const sr = audio().sampleRate
    const n = Math.round(l.len * this.barDur * sr)
    const moved = gridOffset(midOf(this.mixOf(l, n, sr)), sr, this.t.stepDur, 0.12)
    if (!moved) return 'It already sits on the beat.'
    this.setTrim(i, (l.start ?? 0) + moved, l.len, part)
    return `Moved ${Math.round(Math.abs(moved) * 1000)} ms ${moved > 0 ? 'earlier' : 'later'}: the notes sit on the beat now.`
  }

  private stopBass(at: number) {
    for (const b of this.bassNotes) if (b.end > at) { try { b.h.stop(Math.max(at, b.start)) } catch { /* gone */ } }
    this.bassNotes = this.bassNotes.filter(b => b.end <= at)
  }
  /** the smart bass line is there and still matches the loop */
  hasSmartBass(i: number, part = this.s.part) { const l = this.s.tracks[i].parts[part]; return !!l?.notes?.length && l.notesOf === this.notesSig(l) }
  private notesSig(l: PartLoop) { return `${l.takes.join(',')}|${trimSig(l)}|${l.len}` }
  /** Smart bass: hear the notes of the bass track's loop (Basic Pitch) and play them with a real bass. */
  async makeSmartBass(i: number, part = this.s.part): Promise<string> {
    const tr = this.s.tracks[i], l = tr.parts[part]
    if (!l || !l.takes.length) return 'Record a bass line first.'
    const sr = audio().sampleRate
    const n = Math.round(l.len * this.barDur * sr)
    const x = midOf(this.mixOf(l, n, sr))
    const { transcribe } = await import('../audio/transcribe')
    const heard = await transcribe(x, sr)
    const notes = bassLine(heard, this.barDur / 4, l.len * 4, 0.5)
    if (!notes.length) return "Couldn't hear a bass line in that loop: play single notes on the low strings."
    l.notes = notes; l.notesOf = this.notesSig(l)
    this.setTrack(i, { smart: true })
    this.restartTrack(i); this.changed()
    return `Real bass: ${notes.length} notes heard and played by the bass. Tap again to hear your own take.`
  }

  private async addTake(t: Take | Float32Array): Promise<string> {
    const take: Take = t instanceof Float32Array ? { l: t, r: null } : t
    const id = Math.random().toString(36).slice(2, 10)
    const bpm = this.t.beat.bpm
    this.takes.set(id, take)
    this.origs.set(id, { take, bpm })
    await putTake({ id, sr: audio().sampleRate, data: take.l, ...(take.r ? { right: take.r } : {}), bpm, at: Date.now() })
    return id
  }
  private dropTakeId(id: string) { this.takes.delete(id); this.origs.delete(id); void dropTake(id) }
  private keyOf(i: number, part: LoopPart): string | null {
    const l = this.s.tracks[i].parts[part]
    if (!l || !l.takes.length) return null
    const tr = this.s.tracks[i]
    return `${i}|${part}|${l.takes.join(',')}|${l.len}|${trimSig(l)}|${tr.rev ? 1 : 0}|${tr.half ? 1 : 0}|${tr.role === 'bass' && tr.octave ? 1 : 0}|${audio().sampleRate}|${this.t.beat.bpm}`
  }
  /** The loop as you hear it (mix of takes, then backwards / half speed / bass octave), when it's ready. */
  private readyFor(i: number, part = this.s.part): Ready | null {
    const key = this.keyOf(i, part)
    if (!key) return null
    const r = this.ready.get(key)
    if (r) return r
    if (!this.building.has(key)) void this.build(i, part, key)
    // meanwhile: the plain mix (no effects)
    return this.plain(i, part)
  }
  private plainCache = new Map<string, Ready>()
  private plain(i: number, part: LoopPart): Ready | null {
    const l = this.s.tracks[i].parts[part]
    if (!l || !l.takes.length) return null
    const ctx = audio()
    const n = Math.round(l.len * this.barDur * ctx.sampleRate)
    const key = `${l.takes.join(',')}|${n}|${trimSig(l)}`
    let r = this.plainCache.get(key)
    if (!r) {
      const x = this.mixOf(l, n, ctx.sampleRate)
      const buf = bufferOf(ctx, x, ctx.sampleRate)
      r = { key, buf, lenBars: l.len, peaks: peaks(midOf(x)) }
      this.plainCache.set(key, r)
      if (this.plainCache.size > 16) this.plainCache.delete(this.plainCache.keys().next().value as string)
    }
    return r
  }
  private async build(i: number, part: LoopPart, key: string) {
    this.building.add(key)
    try {
      const tr = this.s.tracks[i], l = tr.parts[part]!
      const ctx = audio(), sr = ctx.sampleRate
      const n = Math.round(l.len * this.barDur * sr)
      let x = this.mixOf(l, n, sr)
      // the bass an octave down: one channel (a bass sits in the middle)
      if (tr.role === 'bass' && tr.octave) x = { l: await shiftSamples(midOf(x), sr, -12), r: null }
      if (tr.rev) x = each(x, y => y.slice().reverse())
      let lenBars = l.len
      if (tr.half) { x = await stretchTake(x, sr, 0.5); lenBars = l.len * 2 }
      const len = Math.round(lenBars * this.barDur * sr)
      if (x.l.length !== len) x = each(x, y => { const z = new Float32Array(len); z.set(y.subarray(0, len)); return z })
      const buf = bufferOf(ctx, x, sr)
      const m = midOf(x)
      const r: Ready = { key, buf, lenBars, peaks: peaks(m), ...(tr.role === 'lead' ? { duck: duckCurve(m, sr) } : {}) }
      this.ready.set(key, r)
      while (this.ready.size > 24) this.ready.delete(this.ready.keys().next().value as string)
      // swap it in where the loop has got to
      if (this.keyOf(i, this.s.part) === key) this.restartTrack(i)
      this.changed(false)
    } catch { /* keep the plain version */ } finally { this.building.delete(key) }
  }

  // ───────── playback (scheduled a little ahead on the audio clock)
  private tick() {
    const ctx = audio()
    const now = ctx.currentTime
    const playing = this.t.playing
    if (playing && !this.wasPlaying) { this.until = [0, 0, 0, 0]; this.resetDuck() }
    if (!playing && this.wasPlaying) { this.silence(); if (this.rec && this.rec.kind !== 'free') this.cancelRec('Stopped.') }
    this.wasPlaying = playing
    // armed part switch and stop
    if (this.partAt && now >= this.partAt.t - 0.005) { this.s.part = this.partAt.part; this.partAt = null; this.note = `Part ${this.s.part}.`; this.changed() }
    if (this.stopAt !== null && now >= this.stopAt - 0.03) { this.stopAt = null; this.stopNow() }
    if (this.rec) this.recTick(now)
    if (!this.fitting && !this.rec && this.s.bpm !== null && Math.abs(this.t.beat.bpm - this.s.bpm) > 0.01 && this.hasAudio()) { this.fitting = true; void this.followTempo().finally(() => { this.fitting = false }) }
    if (!playing) return
    const horizon = now + 0.25
    for (let i = 0; i < 4; i++) {
      // a part switch inside the horizon: play up to it, then the new part's loop
      const sw = this.partAt && this.partAt.t < horizon ? this.partAt : null
      if (this.until[i] < now) this.until[i] = now
      while (this.until[i] < horizon) {
        const part = sw && this.until[i] >= sw.t - 1e-4 ? sw.part : this.s.part
        const r = this.loopOf(i, part) ? this.readyFor(i, part) : null
        const l = this.loopOf(i, part)
        const stopBy = sw && part !== sw.part ? sw.t : Infinity
        if (!r || !l) { this.until[i] = Math.min(horizon, stopBy); if (stopBy <= horizon && this.until[i] >= stopBy) continue; break }
        const t = this.until[i]
        const ph = phaseBars(this.barNow(t), l.origin, r.lenBars)
        const off = ph > r.lenBars - 1e-6 ? 0 : ph * this.barDur
        const end = Math.min(t + (r.lenBars * this.barDur - off), stopBy)
        if (end - t < 0.002) { this.until[i] = end + 1e-6; continue }
        this.play(i, r, t, off, end, off > 0.004 && t - now < 0.01)
        this.until[i] = end
      }
    }
  }
  private play(i: number, r: Ready, t: number, off: number, end: number, fadeIn: boolean) {
    const tr = this.s.tracks[i], l = tr.parts[this.s.part]
    if (tr.role === 'bass' && tr.smart && l?.notes && l.notesOf === this.notesSig(l)) {
      // a real bass plays the notes you played (no audio of the take)
      const beat = this.barDur / 4
      for (const n of notesIn(l.notes, off / beat, off / beat + (end - t) / beat)) {
        const at = t + n.b * beat - off
        const h = playBass(n.m, at, 0.9 * n.v, this.outs[i].gain)
        const stop = Math.min(end, at + n.d * beat)
        h.stop(stop)
        this.bassNotes.push({ h, start: at, end: stop })
      }
      const now = audio().currentTime
      this.bassNotes = this.bassNotes.filter(b => b.end > now - 1)
      return
    }
    const ctx = audio()
    const src = ctx.createBufferSource()
    src.buffer = r.buf
    const fade = ctx.createGain()
    if (fadeIn) { fade.gain.setValueAtTime(0, t); fade.gain.linearRampToValueAtTime(1, t + 0.012) }
    src.connect(fade).connect(this.outs[i].gain)
    src.start(t, off)
    src.stop(end)
    this.voices[i].push({ src, fade, start: t, end })
    src.onended = () => { this.voices[i] = this.voices[i].filter(v => v.src !== src) }
    // the lead's loudness dips the other tracks
    if (i === 3 && r.duck && this.s.tracks[3].duck && !this.s.tracks[3].mute) {
      const step = 0.02
      const a = Math.floor(off / step), b = Math.max(a + 2, Math.ceil((off + (end - t)) / step))
      const curve = r.duck.slice(Math.min(a, r.duck.length - 2), Math.min(b, r.duck.length))
      try { if (curve.length >= 2 && end - t > 0.03) this.duck.gain.setValueCurveAtTime(curve, t, end - t - 0.002) } catch { /* overlapping: skip this pass */ }
    }
  }
  private resetDuck() {
    const now = audio().currentTime
    try { this.duck.gain.cancelScheduledValues(now); this.duck.gain.setValueAtTime(1, now) } catch { /* noop */ }
  }
  /** Rejoin one track where its loop has got to (new take, new sound). */
  private restartTrack(i: number) {
    const now = audio().currentTime
    for (const v of this.voices[i]) { try { v.fade.gain.setTargetAtTime(0, now, 0.004); v.src.stop(now + 0.02) } catch { /* ended */ } }
    this.voices[i] = []
    if (this.s.tracks[i].role === 'bass') this.stopBass(now)
    this.until[i] = now + 0.02
    if (i === 3) this.resetDuck()
  }
  /** Everything scheduled past `t` stops there and is scheduled again from `t` (a part switch armed or taken back). */
  private cutAt(t: number) {
    for (let i = 0; i < 4; i++) {
      for (const v of this.voices[i]) if (v.end > t) { try { v.src.stop(Math.max(t, v.start)) } catch { /* ended */ } v.end = t }
      if (this.until[i] > t) this.until[i] = t
    }
    try { const g = this.duck.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam }; if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else g.cancelScheduledValues(t) } catch { /* noop */ }
  }
  private switched = false
  private silence() {
    const now = audio().currentTime
    for (let i = 0; i < 4; i++) { for (const v of this.voices[i]) { try { v.src.stop(now) } catch { /* ended */ } } this.voices[i] = [] }
    this.stopBass(now)
    this.until = [0, 0, 0, 0]
    this.resetDuck()
  }

  // ───────── transport
  /** Start the beat and loops (from the top). */
  start(countIn = 0) { this.stopAt = null; this.t.start(countIn); this.wasPlaying = false; this.changed(false) }
  /** Stop at the end of this bar (press again: now). */
  stop() {
    if (!this.playing) return
    if (this.stopAt !== null) { this.stopNow(); return }
    this.stopAt = this.t.t0 + Math.ceil(this.barNow() - 0.02) * this.barDur
    if (this.stopAt - audio().currentTime < 0.05) this.stopAt += this.barDur
    this.note = 'Stopping at the end of the bar.'
    this.changed(false)
  }
  stopNow() {
    this.stopAt = null; this.partAt = null
    if (this.rec && this.rec.status !== 'working') this.cancelRec()
    this.t.livePart = this.switched ? { part: this.s.part as PartId, from: 0 } : null
    this.t.stop()
    this.silence()
    this.note = ''
    this.changed(false)
  }
  /** Switch to the other part (A ↔ B) on the next bar line, beat and loops together. */
  switchPart(to?: LoopPart) {
    const part = to ?? (this.s.part === 'A' ? 'B' : 'A')
    if (!this.playing) { this.s.part = part; this.t.livePart = { part: part as PartId, from: 0 }; this.changed(); return }
    if (this.partAt?.part === part || (this.partAt && part === this.s.part)) {
      // pressed again: stay in this part
      const t = this.partAt.t
      this.partAt = null
      this.t.livePart = this.s.part === 'A' && !this.switched ? null : { part: this.s.part as PartId, from: 0 }
      this.cutAt(t)
      this.note = `Staying in part ${this.s.part}.`
      this.changed(false)
      return
    }
    this.switched = true
    const bar = armBar(this.barNow(), this.barDur, 0)
    const t = this.t.t0 + bar * this.barDur
    this.partAt = { part, t }
    this.t.livePart = { part: part as PartId, from: Math.round(bar * 16) }
    this.cutAt(t)
    this.note = `Part ${part} comes in on beat 1 of the next bar.`
    haptic('light')
    this.changed(false)
  }

  // ───────── recording
  private async openInput() {
    this.recorder ??= new InputRecorder()
    await this.recorder.start()
  }
  /** Close the mic when the looper isn't on screen and nothing is recording. */
  releaseInput() { if (!this.rec) { this.recorder?.stop(); this.recorder = null } }
  /** Keep the mic open while the looper is on screen, so a press a hair late can still start on the beat. */
  async warmInput() { try { await this.openInput() } catch { /* asked again on record */ } }
  private latency() { return latencyMs(kindOf(this.recorder?.input?.external)) / 1000 }

  /** The one-button looper (pedal 1): empty → record; recording → close the loop; playing → overdub; overdub → stop it. */
  async press(i = this.s.sel) {
    if (this.s.sel !== i) this.s.sel = i
    const r = this.rec
    const now = audio().currentTime
    if (r) {
      if (r.status === 'working') return
      if (r.track !== i) { this.note = `Track ${r.track + 1} is recording: finish that first.`; this.changed(false); return }
      if (r.status === 'armed') { this.cancelRec('Cancelled.'); return }
      if (r.kind === 'free') { void this.closeFree(); return }
      if (r.status === 'closing') return
      if (r.kind === 'new') {
        if (r.endBar !== null) { this.note = `Closes by itself on bar ${r.endBar - r.startBar + 1}.`; this.changed(false); return }
        const played = this.barNow() - r.startBar
        r.endBar = r.startBar + autoLength(Math.max(0.5, played), this.base)
      } else {
        r.endBar = Math.max(r.startBar + 1, armBar(this.barNow(), this.barDur))
      }
      r.status = 'closing'
      haptic('medium')
      this.changed(false)
      return
    }
    try { await this.openInput() } catch { this.note = "The microphone or amp input couldn't be opened. Allow microphone access and try again."; this.changed(false); return }
    const tr = this.s.tracks[i]
    const existing = this.loopOf(i)
    if (this.s.start === 'play' && !existing) {
      // start when I play: listen, and start the take at the first note (with what came just before it)
      this.trigger = new PlayTrigger()
      const free = !this.playing && !this.hasAudio()
      // loops already there: they play while you get ready, and the take starts on the bar nearest your first note
      if (!free && !this.playing) this.start(0)
      this.rec = { track: i, part: this.s.part, kind: free ? 'free' : 'new', status: 'armed', startBar: 0, startT: now, endBar: !free && tr.lenChoice !== 'auto' ? tr.lenChoice : null, wait: true }
      quietForMic(true); haptic('medium')
      this.note = free ? 'Listening: start playing and the looper starts with you. Press again where the loop comes round.' : 'Listening: start playing and the take starts on the nearest bar.'
      this.changed(false)
      return
    }
    if (!this.playing) {
      if (!existing && this.s.start === 'free' && !this.hasAudio()) {
        this.rec = { track: i, part: this.s.part, kind: 'free', status: 'rec', startBar: 0, startT: now, endBar: null }
        quietForMic(true); haptic('medium')
        this.note = 'Recording. Play your loop and press again exactly where it comes round: that sets the tempo.'
        this.changed(false)
        return
      }
      this.start(4)
      const startBar = 0
      this.rec = { track: i, part: this.s.part, kind: existing ? 'dub' : 'new', status: 'armed', startBar, startT: this.t.t0, endBar: !existing && tr.lenChoice !== 'auto' ? startBar + tr.lenChoice : null }
    } else {
      const startBar = armBar(this.barNow(), this.barDur)
      this.rec = { track: i, part: this.s.part, kind: existing ? 'dub' : 'new', status: 'armed', startBar, startT: this.t.t0 + startBar * this.barDur, endBar: !existing && tr.lenChoice !== 'auto' ? startBar + tr.lenChoice : null }
      if (this.rec.startT <= now) this.rec.status = 'rec'
    }
    quietForMic(true); haptic('medium')
    this.note = this.rec.status === 'armed' ? 'ARMED: punching in on beat 1.' : 'Recording.'
    this.changed(false)
  }
  private recTick(now: number) {
    const r = this.rec!
    if (r.wait) {
      if (!this.trigger?.feed(this.recorder?.level ?? 0)) return
      r.wait = false
      haptic('light')
      if (r.kind === 'free') {
        // a little before we heard it: the real start is found in the audio when the loop is closed
        r.status = 'rec'; r.startT = now - 0.3
        this.note = 'Recording. Press again exactly where the loop comes round: that sets the tempo.'
      } else {
        // the nearest bar line (a note a little after the 1 still counts as on the 1; the time before it is kept)
        const bn = this.barNow(now - 0.04)
        const startBar = Math.abs(bn - Math.round(bn)) < 0.35 ? Math.round(bn) : Math.ceil(bn)
        r.startBar = startBar; r.startT = this.t.t0 + startBar * this.barDur
        if (r.endBar !== null) r.endBar = startBar + r.endBar
        r.status = r.startT <= now ? 'rec' : 'armed'
        this.note = r.endBar !== null ? `Recording ${r.endBar - startBar} bars.` : 'Recording: press again where the loop should end.'
      }
      this.changed(false)
      return
    }
    if (r.status === 'armed' && now >= r.startT) { r.status = 'rec'; this.note = r.kind === 'dub' ? 'Overdubbing: press again to stop adding.' : r.endBar !== null ? `Recording ${r.endBar - r.startBar} bars.` : 'Recording: press again where the loop should end.'; this.changed(false) }
    if (r.kind === 'free') { if (now - r.startT > 60) void this.closeFree(); return }
    if (r.status !== 'rec' && r.status !== 'closing') return
    // Auto length at its longest, or a long overdub: close it
    if (r.endBar === null) {
      const bars = this.barNow(now) - r.startBar
      if (r.kind === 'new' && bars >= 8 * this.base) { r.endBar = r.startBar + Math.max(...lengths(this.base)); r.status = 'closing' }
      if (r.kind === 'dub' && now - r.startT > 170) { r.endBar = armBar(this.barNow(now), this.barDur); r.status = 'closing' }
    }
    if (r.endBar !== null && now >= this.t.t0 + r.endBar * this.barDur) void this.finish()
  }
  cancelRec(why = '') {
    if (!this.rec) return
    this.rec = null
    quietForMic(false)
    this.note = why
    this.changed(false)
  }
  private async finish() {
    const r = this.rec
    if (!r || r.status === 'working' || r.endBar === null) return
    r.status = 'working'
    this.changed(false)
    const ctx = audio(), sr = ctx.sampleRate
    const bars = r.endBar - r.startBar
    const lat = this.latency()
    try {
      // a little past the end too: it's crossfaded into the start so the loop goes round without a click
      const extra = Math.round(0.012 * sr)
      // a new loop also keeps the moment before its first beat: a note picked a hair early comes round at the loop's end
      const pre = r.kind === 'new' ? Math.round(0.12 * sr) : 0
      const gaps0 = this.recorder!.gaps
      const raw = await this.recorder!.captureStereo(r.startT + lat - pre / sr, bars * this.barDur + (extra + pre) / sr)
      this.dropped = this.recorder!.gaps - gaps0
      let x = await this.withFx(levelTake(raw, sr), sr)
      const n = Math.round(bars * this.barDur * sr)
      const tr = this.s.tracks[r.track]
      if (r.kind === 'new') {
        let take = each(x, y => wrapPreRoll(y, pre, n))
        x = sub(x, pre)
        if (this.s.align) { const moved = gridOffset(midOf(take), sr, this.t.stepDur); if (moved) take = each(take, y => rotate(y, moved * sr)) }
        const after = x
        take = { l: smoothSeam(take.l, after.l.subarray(n, n + extra)), r: take.r && after.r ? smoothSeam(take.r, after.r.subarray(n, n + extra)) : null }
        const id = await this.addTake(take)
        const old = tr.parts[r.part]
        for (const g of old?.redo ?? []) for (const d of g) this.dropTakeId(d)
        tr.parts[r.part] = { len: bars, origin: r.startBar, takes: [id], redo: [] }
        if (this.s.bpm === null || !this.hasOtherAudio(r.track, r.part)) this.s.bpm = this.t.beat.bpm
        this.note = `Track ${r.track + 1}: ${bars} bar${bars > 1 ? 's' : ''} recorded.`
        if (this.s.advance) { const next = [1, 2, 3].map(k => (r.track + k) % 4).find(k => !this.loopOf(k)); if (next !== undefined) this.s.sel = next }
      } else {
        const l = tr.parts[r.part]!
        const len = Math.round(l.len * this.barDur * sr)
        const phase0 = phaseBars(r.startBar, l.origin, l.len) * this.barDur * sr
        const id = await this.addTake(each(sub(x, 0, n), y => foldTake(y, len, phase0)))
        l.takes.push(id)
        for (const g of l.redo) for (const d of g) this.dropTakeId(d)
        l.redo = []
        this.note = `Track ${r.track + 1}: overdub ${l.takes.length - 1} added.`
      }
      if (this.dropped > 0) this.note += ` The phone dropped ${this.dropped} bit${this.dropped > 1 ? 's' : ''} of sound while recording (heard as clicks): close other apps and record again if it sounds rough.`
      haptic('success')
      this.rec = null
      quietForMic(false)
      this.restartTrack(r.track)
      this.changed()
    } catch {
      this.rec = null
      quietForMic(false)
      this.note = "Couldn't record. Check the input: Play → Options → Set up input."
      this.changed(false)
    }
  }
  private hasOtherAudio(track: number, part: LoopPart) {
    return this.s.tracks.some((tr, i) => Object.entries(tr.parts).some(([p, l]) => !!l && l.takes.length > 0 && !(i === track && p === part)))
  }
  /** The first loop, played freely: its length sets the tempo, and the beat joins in where it has got to. */
  private async closeFree() {
    const r = this.rec
    if (!r || r.kind !== 'free' || r.status === 'working') return
    r.status = 'working'
    this.changed(false)
    const ctx = audio(), sr = ctx.sampleRate
    const end = ctx.currentTime
    let secs = end - r.startT
    if (secs < 0.8) { this.cancelRec('Too short: play at least a bar.'); return }
    try {
      const lat = this.latency()
      const extra = Math.round(0.012 * sr)
      const gaps0 = this.recorder!.gaps
      let raw = await this.recorder!.captureStereo(r.startT + lat, secs + extra / sr)
      this.dropped = this.recorder!.gaps - gaps0
      // started when you played: the loop begins at the real start of the first note (a few ms before it, never cut)
      if (this.s.start === 'play') {
        const a = findAttack(midOf(raw).subarray(0, Math.round(0.6 * sr)), sr)
        raw = sub(raw, a); secs -= a / sr; r.startT += a / sr
      }
      const lt = loopTempo(midOf(raw).subarray(0, Math.round(secs * sr)), sr)
      const { bpm, bars } = tempoFromLoop(secs, lt?.beats ?? null, this.t.beat.bpm)
      // the beat takes the loop's tempo, and a length the loop is a whole number of
      const beatBars = ([1, 2, 4, 8] as const).filter(b => bars % b === 0 && b <= bars).pop() ?? 1
      const b = setBars({ ...loadBeat(), bpm: Math.round(bpm * 100) / 100 }, Math.min(beatBars, 4) as Beat['bars'])
      this.useBeat(b)
      const x = await this.withFx(levelTake(raw, sr), sr)
      const n = Math.round(bars * this.barDur * sr)
      const take: Take = { l: smoothSeam(x.l.subarray(0, n).slice(), x.l.subarray(n, n + extra)), r: x.r ? smoothSeam(x.r.subarray(0, n).slice(), x.r.subarray(n, n + extra)) : null }
      const id = await this.addTake(take)
      const tr = this.s.tracks[r.track]
      tr.parts[r.part] = { len: bars, origin: 0, takes: [id], redo: [] }
      this.s.bpm = b.bpm
      this.rec = null
      quietForMic(false)
      // the beat starts where the loop started, so it's already in step
      this.t.startFrom(r.startT)
      this.wasPlaying = false
      this.note = `Your loop is ${bars} bar${bars > 1 ? 's' : ''} at ${Math.round(b.bpm)} BPM: the beat follows it.`
      if (this.dropped > 0) this.note += ` The phone dropped ${this.dropped} bit${this.dropped > 1 ? 's' : ''} of sound while recording (heard as clicks): close other apps and record again if it sounds rough.`
      if (this.s.advance) this.s.sel = (r.track + 1) % 4
      haptic('success')
      this.changed()
    } catch {
      this.cancelRec("Couldn't record. Check the input: Play → Options → Set up input.")
    }
  }

  // ───────── undo / redo / clear
  undo(i = this.s.sel) {
    if (this.rec && this.rec.track === i && this.rec.status !== 'working') { this.cancelRec('Recording cancelled.'); return }
    const l = this.s.tracks[i].parts[this.s.part]
    if (!l || !l.takes.length) return
    l.redo.push([l.takes.pop()!])
    this.note = l.takes.length ? `Track ${i + 1}: last overdub taken off.` : `Track ${i + 1}: loop taken off (Redo brings it back).`
    this.restartTrack(i); this.changed()
  }
  redo(i = this.s.sel) {
    const l = this.s.tracks[i].parts[this.s.part]
    if (!l || !l.redo.length) return
    l.takes.push(...l.redo.pop()!)
    this.note = `Track ${i + 1}: back again.`
    this.restartTrack(i); this.changed()
  }
  clear(i = this.s.sel) {
    const l = this.s.tracks[i].parts[this.s.part]
    if (!l || !l.takes.length) return
    l.redo.push(l.takes.splice(0))
    this.note = `Track ${i + 1} cleared (Undo… Redo brings it back).`
    haptic('heavy')
    this.restartTrack(i); this.changed()
  }
  canRedo(i: number) { return !!this.s.tracks[i].parts[this.s.part]?.redo.length }
  /** Everything gone: all tracks, both parts. */
  async clearAll() {
    this.stopNow()
    for (const id of [...this.takes.keys()]) this.dropTakeId(id)
    this.takes.clear(); this.origs.clear(); this.ready.clear(); this.plainCache.clear()
    const keep = this.s
    this.s = { ...freshSession(), start: keep.start, align: keep.align, beatOn: keep.beatOn, click: keep.click, advance: keep.advance }
    this.note = 'All loops cleared.'
    this.changed()
  }

  // ───────── the beat
  /** Use a new beat (saved and shown in the beat maker too). */
  useBeat(b: Beat) {
    saveBeat(b); pushBeat(b)
    this.t.setBeat(b)
    this.changed(false)
  }
  /** The beat's tempo changed with loops recorded at another: stretch every take to fit (pitch stays). */
  async followTempo() {
    const from = this.s.bpm, to = this.t.beat.bpm
    if (!from || Math.abs(from - to) < 0.01 || !this.hasAudio()) { if (!this.hasAudio()) this.s.bpm = to; return }
    this.note = `Fitting the loops to ${to} BPM…`
    this.changed(false)
    const sr = audio().sampleRate
    for (const id of [...this.takes.keys()]) {
      const o = this.origs.get(id)
      if (!o) continue
      const fromBpm = o.bpm ?? from
      if (Math.abs(fromBpm - to) < 0.01) { this.takes.set(id, o.take); continue }
      // always from the take as recorded (never from an earlier stretch)
      const rate = to / fromBpm
      const n = Math.round(o.take.l.length / rate)
      let y: Take
      try { y = await stretchTake(o.take, sr, rate) } catch { y = each(o.take, x => stretch(x, n, sr)) }
      if (y.l.length !== n) y = each(y, x => { const z = new Float32Array(n); z.set(x.subarray(0, n)); return z })
      this.takes.set(id, y)
    }
    this.s.bpm = to
    this.ready.clear(); this.plainCache.clear()
    for (let i = 0; i < 4; i++) this.restartTrack(i)
    this.note = `Loops fitted to ${to} BPM.`
    this.changed()
  }

  /** The loop as one sound (what track i plays), for Chop onto pads, the Riff Scanner, or saving. */
  soundOf(i: number): { x: Float32Array; sr: number; bars: number } | null {
    const r = this.readyFor(i)
    if (!r) return null
    return { x: monoOf(r.buf), sr: r.buf.sampleRate, bars: r.lenBars }
  }
  /** The loop as you played it (the takes mixed, without backwards / half speed / bass octave). */
  rawOf(i: number): { x: Float32Array; sr: number; bars: number } | null {
    const r = this.plain(i, this.s.part)
    return r ? { x: monoOf(r.buf), sr: r.buf.sampleRate, bars: r.lenBars } : null
  }
  /** Put a ready-made sound (a resample) on an empty track as its loop. */
  async putOn(i: number, x: Float32Array, bars: number, startBar: number) {
    const id = await this.addTake(x)
    this.s.tracks[i].parts[this.s.part] = { len: bars, origin: startBar, takes: [id], redo: [] }
    this.s.bpm ??= this.t.beat.bpm
    this.restartTrack(i); this.changed()
  }
  /** The longest loop in this part, in bars (at least the beat's length). */
  longest() { return Math.max(this.base, ...[0, 1, 2, 3].map(i => this.lengthOf(i) ?? 0)) }
  waitLoaded() { return this.loaded }
  dispose() { if (this.timer) clearInterval(this.timer) }
}

let one: LoopStation | null = null
/** The one looper (made on first use). */
export function station(): LoopStation { return (one ??= new LoopStation()) }
export const stationMade = () => !!one
export { MULTS }
