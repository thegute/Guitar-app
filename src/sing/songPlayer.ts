// Upgraded Real-Time Streaming Dual-Track Song Engine for Sing Mode!
// - Streams stereo Backing Track + stereo Isolated Vocal Stem through live SignalsmithStretch AudioWorklet nodes
//   so ±12 semitone Key Shifting (with formant preservation on vocals!) and 0.65x–1.15x Speed change INSTANTLY!
// - Also supports built-in MIDI/chord synth playback for starter songs (zero external audio needed!)
// - Independent Backing Volume, Original Singer Guide Fader (with optional Ghost Guide!), Harmony Guide Synth Fader,
//   A–B Phrase Looping, "Loop Last 4 Sec", and Instant Vocal Mirror audio playback!
import SignalsmithStretch from 'signalsmith-stretch'
import { audio, catBus } from '../audio/engine'
import { liveSound, quietSound } from '../audio/stopAll'
import type { MelodyNote, SongChord } from './vocalEngine'
import { playCoachPiano, playVocalGuideTone } from './pianoCoach'

export interface SongMixState {
  playing: boolean
  time: number
  duration: number
  shiftSemis: number
  speed: number
  backingVol: number
  /** 0..1 original singer guide volume (also Lead-Pull fader in Harmony Mode!) */
  singerVol: number
  /** 0..1 synth harmony guide tone volume */
  harmonyGuideVol: number
  /** Ghost Guide: when true, original singer ducks quietly and sneaks back in if you drift off pitch */
  ghostGuide: boolean
  loopA: number | null
  loopB: number | null
  streamingStretch: boolean
}

type StretchNode = Awaited<ReturnType<typeof SignalsmithStretch>>

/**
 * Dual-track real-time streaming song player with SignalsmithStretch AudioWorklet support
 * and automatic graceful fallback (standard AudioBufferSourceNode or synth backing for starter songs).
 */
export class SingSongPlayer {
  private backingNode: StretchNode | null = null
  private vocalNode: StretchNode | null = null
  private backingGain: GainNode | null = null
  private vocalGain: GainNode | null = null
  private fallbackBacking: AudioBufferSourceNode | null = null
  private fallbackVocal: AudioBufferSourceNode | null = null

  private sr = 44100
  private backingChans: [Float32Array, Float32Array] | null = null
  private vocalChans: [Float32Array, Float32Array] | null = null
  private melody: MelodyNote[] = []
  private harmony: MelodyNote[] = []
  private chords: SongChord[] = []

  private state: SongMixState = {
    playing: false,
    time: 0,
    duration: 16,
    shiftSemis: 0,
    speed: 1,
    backingVol: 0.85,
    singerVol: 0.55,
    harmonyGuideVol: 0.45,
    ghostGuide: false,
    loopA: null,
    loopB: null,
    streamingStretch: false,
  }

  private playStartCtx = 0
  private playStartSong = 0
  private raf = 0
  private lastSchedT = -1
  private offPitchFactor = 0
  private listeners = new Set<(s: SongMixState) => void>()

  onChange(f: (s: SongMixState) => void) {
    this.listeners.add(f)
    return () => { this.listeners.delete(f) }
  }

  getState(): SongMixState {
    return { ...this.state }
  }

  private emit() {
    const snap = this.getState()
    this.listeners.forEach(f => f(snap))
  }

  /** Load stereo audio stems (or null for synth-backed starter practice songs) + melody/harmony/chords. */
  load(opts: {
    duration: number
    sr?: number
    backing?: [Float32Array, Float32Array] | null
    vocal?: [Float32Array, Float32Array] | null
    melody: MelodyNote[]
    harmony: MelodyNote[]
    chords: SongChord[]
    shiftSemis?: number
    speed?: number
  }) {
    this.stop()
    this.sr = opts.sr ?? 44100
    this.backingChans = opts.backing ?? null
    this.vocalChans = opts.vocal ?? null
    this.melody = opts.melody
    this.harmony = opts.harmony
    this.chords = opts.chords
    this.state = {
      ...this.state,
      time: 0,
      duration: Math.max(1, opts.duration),
      shiftSemis: opts.shiftSemis ?? this.state.shiftSemis,
      speed: opts.speed ?? this.state.speed,
      loopA: null,
      loopB: null,
    }
    this.teardownStretch()
    this.emit()
  }

  updateGuides(melody: MelodyNote[], harmony: MelodyNote[], chords: SongChord[]) {
    this.melody = melody
    this.harmony = harmony
    this.chords = chords
  }

  /** Called by the live vocal tracker so Ghost Guide can sneak the original singer in if you drift >35¢ off pitch. */
  reportLiveErrorCents(absCents: number | null) {
    const target = absCents !== null && absCents > 38 ? 1 : 0
    this.offPitchFactor = this.offPitchFactor * 0.85 + target * 0.15
    this.applyGains()
  }

  setMix(patch: Partial<Pick<SongMixState, 'shiftSemis' | 'speed' | 'backingVol' | 'singerVol' | 'harmonyGuideVol' | 'ghostGuide' | 'loopA' | 'loopB'>>) {
    const prevSemis = this.state.shiftSemis
    const prevSpeed = this.state.speed
    const wasPlaying = this.state.playing
    const curT = this.currentTime()
    this.state = { ...this.state, ...patch }
    this.applyGains()

    if (wasPlaying && (this.state.shiftSemis !== prevSemis || this.state.speed !== prevSpeed)) {
      // Live real-time update on SignalsmithStretch nodes without restarting audio!
      if (this.backingNode && this.state.streamingStretch) {
        const ctx = audio()
        this.playStartSong = curT
        this.playStartCtx = ctx.currentTime
        void this.backingNode.schedule({
          output: ctx.currentTime + 0.02,
          active: true,
          input: curT,
          rate: this.state.speed,
          semitones: this.state.shiftSemis,
        })
        if (this.vocalNode) {
          void this.vocalNode.schedule({
            output: ctx.currentTime + 0.02,
            active: true,
            input: curT,
            rate: this.state.speed,
            semitones: this.state.shiftSemis,
            formantCompensation: true,
            formantBaseHz: 0,
          })
        }
      } else {
        // Fallback / synth mode: re-anchor clock cleanly
        this.playStartSong = curT
        this.playStartCtx = audio().currentTime
      }
    }
    this.emit()
  }

  /** Instant "Loop Last 4 Sec" button — grabs the phrase you just sang and drops speed to 80%! */
  loopLast4Sec() {
    const cur = this.currentTime()
    const a = Math.max(0, Math.round((cur - 4.0) * 10) / 10)
    const b = Math.min(this.state.duration, Math.max(a + 2.0, Math.round((cur + 0.3) * 10) / 10))
    this.setMix({ loopA: a, loopB: b, speed: Math.min(this.state.speed, 0.85) })
    void this.play(a)
  }

  clearLoop() {
    this.setMix({ loopA: null, loopB: null })
  }

  currentTime(): number {
    if (!this.state.playing) return this.state.time
    const ctx = audio()
    return Math.min(this.state.duration, Math.max(0, this.playStartSong + (ctx.currentTime - this.playStartCtx) * this.state.speed))
  }

  async play(fromSec?: number) {
    const startAt = fromSec !== undefined ? Math.max(0, Math.min(this.state.duration - 0.05, fromSec)) : this.state.time
    this.stopSourcesOnly()
    const ctx = audio()
    if (ctx.state === 'suspended') await ctx.resume()

    this.playStartSong = startAt
    this.playStartCtx = ctx.currentTime
    this.lastSchedT = startAt - 0.05
    this.state.playing = true
    this.state.time = startAt
    liveSound(this, 'Sing Track')

    if (this.backingChans) {
      const ok = await this.startStretchStreams(startAt)
      if (!ok) this.startFallbackStreams(startAt)
    }
    this.applyGains()
    this.tick()
    this.emit()
  }

  pause() {
    if (!this.state.playing) return
    this.state.time = this.currentTime()
    this.state.playing = false
    this.stopSourcesOnly()
    quietSound(this)
    this.emit()
  }

  stop() {
    this.state.playing = false
    this.state.time = 0
    this.stopSourcesOnly()
    quietSound(this)
    this.emit()
  }

  seek(sec: number) {
    const clamped = Math.max(0, Math.min(this.state.duration, sec))
    if (this.state.playing) void this.play(clamped)
    else {
      this.state.time = clamped
      this.emit()
    }
  }

  private async ensureStretchNodes(): Promise<boolean> {
    if (!this.backingChans) return false
    const ctx = audio()
    if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return false
    try {
      if (!this.backingNode) {
        const node = await SignalsmithStretch(ctx, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] })
        await node.addBuffers(this.backingChans)
        const g = ctx.createGain()
        node.connect(g).connect(catBus('loops').input)
        this.backingNode = node
        this.backingGain = g
      }
      if (this.vocalChans && !this.vocalNode) {
        const node = await SignalsmithStretch(ctx, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] })
        await node.addBuffers(this.vocalChans)
        const g = ctx.createGain()
        node.connect(g).connect(catBus('voice').input)
        this.vocalNode = node
        this.vocalGain = g
      }
      this.state.streamingStretch = true
      return true
    } catch {
      this.state.streamingStretch = false
      return false
    }
  }

  private async startStretchStreams(startAt: number): Promise<boolean> {
    const ready = await this.ensureStretchNodes()
    if (!ready || !this.backingNode) return false
    const ctx = audio()
    const when = ctx.currentTime + 0.03
    this.playStartCtx = when
    this.playStartSong = startAt
    const loopEnd = this.state.loopB ?? this.state.duration
    const loopStart = this.state.loopA ?? 0
    const looping = this.state.loopA !== null && this.state.loopB !== null && loopEnd > loopStart + 0.5

    await this.backingNode.schedule({
      output: when,
      active: true,
      input: startAt,
      rate: this.state.speed,
      semitones: this.state.shiftSemis,
      ...(looping ? { loopStart, loopEnd } : {}),
    })
    if (this.vocalNode) {
      await this.vocalNode.schedule({
        output: when,
        active: true,
        input: startAt,
        rate: this.state.speed,
        semitones: this.state.shiftSemis,
        formantCompensation: true,
        formantBaseHz: 0,
        ...(looping ? { loopStart, loopEnd } : {}),
      })
    }
    return true
  }

  private startFallbackStreams(startAt: number) {
    if (!this.backingChans) return
    const ctx = audio()
    const makeSrc = (chans: [Float32Array, Float32Array], target: AudioNode) => {
      const buf = ctx.createBuffer(2, chans[0].length, this.sr)
      buf.getChannelData(0).set(chans[0])
      buf.getChannelData(1).set(chans[1])
      const s = ctx.createBufferSource()
      s.buffer = buf
      s.playbackRate.value = this.state.speed
      const g = ctx.createGain()
      s.connect(g).connect(target)
      s.start(0, startAt)
      return { s, g }
    }
    const b = makeSrc(this.backingChans, catBus('loops').input)
    this.fallbackBacking = b.s
    this.backingGain = b.g
    if (this.vocalChans) {
      const v = makeSrc(this.vocalChans, catBus('voice').input)
      this.fallbackVocal = v.s
      this.vocalGain = v.g
    }
  }

  private applyGains() {
    const ctx = audio()
    const now = ctx.currentTime
    if (this.backingGain) this.backingGain.gain.setTargetAtTime(this.state.backingVol, now, 0.03)
    if (this.vocalGain) {
      const effectiveSinger = this.state.ghostGuide
        ? Math.min(1, this.state.singerVol * 0.12 + this.offPitchFactor * Math.max(0.45, this.state.singerVol))
        : this.state.singerVol
      this.vocalGain.gain.setTargetAtTime(effectiveSinger, now, 0.05)
    }
  }

  private stopSourcesOnly() {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0 }
    if (this.backingNode) void this.backingNode.schedule({ active: false })
    if (this.vocalNode) void this.vocalNode.schedule({ active: false })
    try { this.fallbackBacking?.stop() } catch { /* done */ }
    try { this.fallbackVocal?.stop() } catch { /* done */ }
    this.fallbackBacking = null
    this.fallbackVocal = null
  }

  private teardownStretch() {
    this.stopSourcesOnly()
    try { this.backingNode?.disconnect(); this.backingGain?.disconnect() } catch { /* ignore */ }
    try { this.vocalNode?.disconnect(); this.vocalGain?.disconnect() } catch { /* ignore */ }
    this.backingNode = null
    this.vocalNode = null
    this.backingGain = null
    this.vocalGain = null
  }

  private tick = () => {
    if (!this.state.playing) return
    const t = this.currentTime()

    // Handle A-B looping cleanly
    if (this.state.loopA !== null && this.state.loopB !== null && this.state.loopB > this.state.loopA + 0.4) {
      if (t >= this.state.loopB) {
        if (!this.state.streamingStretch) {
          void this.play(this.state.loopA)
          return
        }
        this.playStartSong = this.state.loopA
        this.playStartCtx = audio().currentTime
        this.lastSchedT = this.state.loopA - 0.05
      }
    } else if (t >= this.state.duration) {
      this.stop()
      return
    }

    // Schedule synth guides (Harmony Guide Ooh voice + starter song piano chords/lead!)
    const lookAhead = t + 0.08
    if (lookAhead > this.lastSchedT) {
      // 1. Starter song chord accompaniment (when no real audio backing is loaded)
      if (!this.backingChans && this.state.backingVol > 0.02) {
        for (const c of this.chords) {
          if (c.t0 > this.lastSchedT && c.t0 <= lookAhead) {
            const rootMidi = 48 + (((c.root + this.state.shiftSemis) % 12) + 12) % 12
            const dur = Math.max(0.4, (c.t1 - c.t0) / this.state.speed)
            const v = this.state.backingVol * 0.24
            playCoachPiano(rootMidi, dur, v)
            playCoachPiano(rootMidi + (c.minor ? 3 : 4), dur, v * 0.85)
            playCoachPiano(rootMidi + 7, dur, v * 0.85)
          }
        }
      }
      // 2. Starter song lead melody (when no real vocal stem is loaded)
      if (!this.vocalChans && this.state.singerVol > 0.02) {
        const eff = this.state.ghostGuide
          ? this.state.singerVol * 0.15 + this.offPitchFactor * Math.max(0.45, this.state.singerVol)
          : this.state.singerVol
        for (const n of this.melody) {
          if (n.t0 > this.lastSchedT && n.t0 <= lookAhead) {
            playCoachPiano(n.midi + this.state.shiftSemis, Math.max(0.15, (n.t1 - n.t0) / this.state.speed), eff * 0.32)
          }
        }
      }
      // 3. Soft "Ooh" Harmony Guide voice (works on BOTH uploaded songs AND starter songs!)
      if (this.state.harmonyGuideVol > 0.02 && this.harmony.length) {
        for (const h of this.harmony) {
          if (h.t0 > this.lastSchedT && h.t0 <= lookAhead) {
            playVocalGuideTone(h.midi, Math.max(0.15, (h.t1 - h.t0) / this.state.speed), this.state.harmonyGuideVol * 0.34)
          }
        }
      }
      this.lastSchedT = lookAhead
    }

    this.state.time = t
    this.emit()
    this.raf = requestAnimationFrame(this.tick)
  }
}

/** Play back a captured Float32Array Vocal Mirror clip through KGuitar's voice bus. */
export function playMirrorClip(samples: Float32Array, sr: number, onEnd?: () => void): () => void {
  const ctx = audio()
  if (ctx.state === 'suspended') void ctx.resume()
  const buf = ctx.createBuffer(1, samples.length, sr)
  buf.getChannelData(0).set(samples)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = 1.0
  src.connect(g).connect(catBus('voice').input)
  const handle = { stop: () => { try { src.stop() } catch { /* done */ } quietSound(handle) } }
  liveSound(handle, 'Vocal Mirror Replay')
  src.onended = () => {
    quietSound(handle)
    onEnd?.()
  }
  src.start()
  return handle.stop
}
