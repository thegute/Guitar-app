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
import { gridOffset, levelLoop, rotate, stretch } from '../studio/loops'
import { applyMicFx, MIC_FX_KEY, type MicFx } from '../studio/micFx'
import { shiftSamples, stretchSamples } from '../studio/pitchShift'
import { loadBeat, pushBeat, saveBeat, setBars, type Beat, type PartId } from '../studio/beat'
import { sharedTransport } from '../studio/shared'
import type { StudioTransport } from '../studio/transport'
import { armBar, autoLength, lengths, duckCurve, foldTake, mixTakes, MULTS, peaks, phaseBars, smoothSeam, tempoFromLoop } from './logic'
import { dropTake, getTake, loadSession, putTake, saveSession } from './store'

export type Role = 'rhythm' | 'embellish' | 'bass' | 'lead'
export const ROLES: { role: Role; label: string; hint: string }[] = [
  { role: 'rhythm', label: 'Rhythm', hint: 'Chords and strumming: the bed the rest sits on.' },
  { role: 'embellish', label: 'Embellishments', hint: 'Hammer-ons, sus and add9 colours, little counter-melodies between the chords.' },
  { role: 'bass', label: 'Bass', hint: 'Play a bassline on your guitar: it plays back an octave lower, like a bass guitar.' },
  { role: 'lead', label: 'Lead', hint: 'Melodies, solos and harmonies: the other tracks dip a little while it plays so it stands out.' },
]
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
}
export interface Session {
  tracks: Track[]
  part: LoopPart
  sel: number
  /** the tempo the takes were recorded at (a new beat tempo stretches them to fit) */
  bpm: number | null
  /** how a recording starts when nothing is playing: a bar of count-in, or straight away (the first loop sets the tempo) */
  start: 'count' | 'free'
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
}

const freshTrack = (role: Role): Track => ({ role, vol: role === 'bass' ? 1.1 : 1, pan: role === 'embellish' ? 0.25 : role === 'lead' ? -0.15 : 0, mute: false, solo: false, rev: false, half: false, octave: role === 'bass', duck: role === 'lead', lenChoice: 'auto', parts: {} })
const freshSession = (): Session => ({ tracks: ROLES.map(r => freshTrack(r.role)), part: 'A', sel: 0, bpm: null, start: 'count', align: true, beatOn: true, click: false, advance: true })
const micFx = (): MicFx => { try { return (JSON.parse(localStorage.getItem(`kg:${MIC_FX_KEY}`) ?? '"none"') as MicFx) || 'none' } catch { return 'none' } }

interface Voice { src: AudioBufferSourceNode; fade: GainNode; start: number; end: number }
interface Out { gain: GainNode; pan: StereoPannerNode }
interface Ready { key: string; buf: AudioBuffer; lenBars: number; peaks: Float32Array; duck?: Float32Array }

export class LoopStation {
  s: Session
  rec: Rec | null = null
  note = ''
  version = 0
  private t: StudioTransport
  private takes = new Map<string, Float32Array>()
  private ready = new Map<string, Ready>()
  private building = new Set<string>()
  private voices: Voice[][] = [[], [], [], []]
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

  constructor() {
    this.t = sharedTransport()
    this.s = { ...freshSession(), ...(loadSession<Session>() ?? {}) }
    const ctx = audio()
    this.bus = ctx.createGain()
    this.bus.connect(this.t.loopBus)
    this.duck = ctx.createGain()
    this.duck.connect(this.bus)
    for (let i = 0; i < 4; i++) {
      const gain = ctx.createGain()
      const pan = ctx.createStereoPanner()
      gain.connect(pan).connect(i === 3 ? this.bus : this.duck)
      this.outs.push({ gain, pan })
    }
    this.t.keep = () => this.t.playing && this.hasAudio()
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
    const sound = patch.rev !== undefined || patch.half !== undefined || patch.octave !== undefined
    if (sound && (patch.rev !== before.rev || patch.half !== before.half || patch.octave !== before.octave)) this.restartTrack(i)
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
      if (t) this.takes.set(id, t.sr === sr ? t.data : resample(t.data, t.sr, sr))
    }))
    // takes that went missing (storage cleared) leave their loops
    for (const tr of this.s.tracks) for (const k of Object.keys(tr.parts) as LoopPart[]) {
      const p = tr.parts[k]
      if (p) { p.takes = p.takes.filter(id => this.takes.has(id)); p.redo = p.redo.map(g => g.filter(id => this.takes.has(id))).filter(g => g.length) }
    }
    this.changed(false)
  }
  private async addTake(data: Float32Array): Promise<string> {
    const id = Math.random().toString(36).slice(2, 10)
    this.takes.set(id, data)
    await putTake({ id, sr: audio().sampleRate, data, at: Date.now() })
    return id
  }
  private keyOf(i: number, part: LoopPart): string | null {
    const l = this.s.tracks[i].parts[part]
    if (!l || !l.takes.length) return null
    const tr = this.s.tracks[i]
    return `${i}|${part}|${l.takes.join(',')}|${l.len}|${tr.rev ? 1 : 0}|${tr.half ? 1 : 0}|${tr.role === 'bass' && tr.octave ? 1 : 0}|${audio().sampleRate}|${this.t.beat.bpm}`
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
    const key = `${l.takes.join(',')}|${n}`
    let r = this.plainCache.get(key)
    if (!r) {
      const x = mixTakes(l.takes.map(id => this.takes.get(id)!).filter(Boolean), n)
      const buf = ctx.createBuffer(1, n, ctx.sampleRate); buf.getChannelData(0).set(x)
      r = { key, buf, lenBars: l.len, peaks: peaks(x) }
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
      let x = mixTakes(l.takes.map(id => this.takes.get(id)!).filter(Boolean), n)
      if (tr.role === 'bass' && tr.octave) x = await shiftSamples(x, sr, -12)
      if (tr.rev) x = x.slice().reverse()
      let lenBars = l.len
      if (tr.half) { x = await stretchSamples(x, sr, 0.5); lenBars = l.len * 2 }
      const len = Math.round(lenBars * this.barDur * sr)
      if (x.length !== len) { const y = new Float32Array(len); y.set(x.subarray(0, len)); x = y }
      const buf = ctx.createBuffer(1, x.length, sr); buf.getChannelData(0).set(x)
      const r: Ready = { key, buf, lenBars, peaks: peaks(x), ...(tr.role === 'lead' ? { duck: duckCurve(x, sr) } : {}) }
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
      const raw = await this.recorder!.capture(r.startT + lat, bars * this.barDur + extra / sr)
      let x = await applyMicFx(levelLoop(raw, sr), sr, micFx(), { keepLength: true })
      const n = Math.round(bars * this.barDur * sr)
      const tr = this.s.tracks[r.track]
      if (r.kind === 'new') {
        let take: Float32Array<ArrayBufferLike> = x.subarray(0, n).slice()
        if (this.s.align) { const moved = gridOffset(take, sr, this.t.stepDur); if (moved) take = rotate(take, moved * sr) }
        take = smoothSeam(take, x.subarray(n, n + extra))
        const id = await this.addTake(take)
        const old = tr.parts[r.part]
        for (const g of old?.redo ?? []) for (const d of g) { this.takes.delete(d); void dropTake(d) }
        tr.parts[r.part] = { len: bars, origin: r.startBar, takes: [id], redo: [] }
        if (this.s.bpm === null || !this.hasOtherAudio(r.track, r.part)) this.s.bpm = this.t.beat.bpm
        this.note = `Track ${r.track + 1}: ${bars} bar${bars > 1 ? 's' : ''} recorded.`
        if (this.s.advance) { const next = [1, 2, 3].map(k => (r.track + k) % 4).find(k => !this.loopOf(k)); if (next !== undefined) this.s.sel = next }
      } else {
        const l = tr.parts[r.part]!
        const len = Math.round(l.len * this.barDur * sr)
        const phase0 = phaseBars(r.startBar, l.origin, l.len) * this.barDur * sr
        const id = await this.addTake(foldTake(x.subarray(0, n), len, phase0))
        l.takes.push(id)
        for (const g of l.redo) for (const d of g) { this.takes.delete(d); void dropTake(d) }
        l.redo = []
        this.note = `Track ${r.track + 1}: overdub ${l.takes.length - 1} added.`
      }
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
    const secs = end - r.startT
    if (secs < 0.8) { this.cancelRec('Too short: play at least a bar.'); return }
    try {
      const lat = this.latency()
      const extra = Math.round(0.012 * sr)
      const raw = await this.recorder!.capture(r.startT + lat, secs + extra / sr)
      const lt = loopTempo(raw.subarray(0, Math.round(secs * sr)), sr)
      const { bpm, bars } = tempoFromLoop(secs, lt?.beats ?? null, this.t.beat.bpm)
      // the beat takes the loop's tempo, and a length the loop is a whole number of
      const beatBars = ([1, 2, 4, 8] as const).filter(b => bars % b === 0 && b <= bars).pop() ?? 1
      const b = setBars({ ...loadBeat(), bpm: Math.round(bpm * 100) / 100 }, Math.min(beatBars, 4) as Beat['bars'])
      this.useBeat(b)
      let x = await applyMicFx(levelLoop(raw, sr), sr, micFx(), { keepLength: true })
      const n = Math.round(bars * this.barDur * sr)
      const take = smoothSeam(x.subarray(0, n).slice(), x.subarray(n, n + extra))
      x = take
      const id = await this.addTake(x)
      const tr = this.s.tracks[r.track]
      tr.parts[r.part] = { len: bars, origin: 0, takes: [id], redo: [] }
      this.s.bpm = b.bpm
      this.rec = null
      quietForMic(false)
      // the beat starts where the loop started, so it's already in step
      this.t.startFrom(r.startT)
      this.wasPlaying = false
      this.note = `Your loop is ${bars} bar${bars > 1 ? 's' : ''} at ${Math.round(b.bpm)} BPM: the beat follows it.`
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
    for (const id of this.takes.keys()) void dropTake(id)
    this.takes.clear(); this.ready.clear(); this.plainCache.clear()
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
    const rate = to / from
    const ids = [...this.takes.keys()]
    for (const id of ids) {
      const x = this.takes.get(id)!
      const n = Math.round(x.length / rate)
      let y: Float32Array
      try { y = await stretchSamples(x, sr, rate) } catch { y = stretch(x, n, sr) }
      if (y.length !== n) { const z = new Float32Array(n); z.set(y.subarray(0, n)); y = z }
      this.takes.set(id, y)
      void putTake({ id, sr, data: y, at: Date.now() })
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
    return { x: r.buf.getChannelData(0), sr: r.buf.sampleRate, bars: r.lenBars }
  }
  /** The loop as you played it (the takes mixed, without backwards / half speed / bass octave). */
  rawOf(i: number): { x: Float32Array; sr: number; bars: number } | null {
    const r = this.plain(i, this.s.part)
    return r ? { x: r.buf.getChannelData(0), sr: r.buf.sampleRate, bars: r.lenBars } : null
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
