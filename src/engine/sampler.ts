// Per-string guitar sampler engine & AudioWorklet bridge (Engine Week Part 4, notes/AUDIO-ENGINE.md & notes/ENGINE-WEEK.md):
// 1. Per-string monophonic voices (strings 0..5): playing a new note on a string damps the previous note on that string
//    over ~12 ms (tau = 0.004 s), just like lifting or re-picking a real guitar string.
// 2. Safeguard #4 + Upgrade #7 (Organic Legato on existing banks and sound packs):
//    - Hammer-on ('h') and pull-off ('p') start the destination sample ~35 ms past its pick transient (snapped to the
//      nearest zero-crossing), crossfading over ~8 ms from the ringing string and inheriting its real-time decay
//      envelope so a hammer-on onto a dying string never jumps back to full pick volume.
//    - Subtle low-passed (~260 Hz, ~4.5 ms) finger-fret contact thud impulse on hammer-on / pull-off.
//    - Slides ('/' and '\\') ramp playbackRate / detune smoothly from the ringing string's pitch into the destination
//      sustain body (~35 ms past the pick transient).

export type LegatoTech = 'h' | 'p' | '/' | '\\'

/** Finger-lift / re-pluck damping duration (~12 ms; time constant tau = 4 ms). */
export const FINGER_LIFT_DAMP_SEC = 0.012
/** Time constant for exponential setTargetAtTime finger-lift damping (12 ms ≈ 3 * tau). */
export const FINGER_LIFT_TAU_SEC = 0.004
/** How far into the sample to skip past the pick attack transient on legato notes (~35 ms). */
export const LEGATO_SKIP_SEC = 0.035
/** Crossfade duration between the ringing string and a legato destination (~8 ms). */
export const LEGATO_CROSSFADE_SEC = 0.008
/** Time constant for exponential setTargetAtTime legato crossfade (~8 ms ≈ 3 * tau). */
export const LEGATO_CROSSFADE_TAU_SEC = 0.0027

const STANDARD_TUNING = [40, 45, 50, 55, 59, 64] as const

export function isLegatoTech(tech?: string): tech is LegatoTech {
  return tech === 'h' || tech === 'p' || tech === '/' || tech === '\\'
}

/**
 * Infer the most natural guitar string (0 = lowest E2, 5 = highest E4) when the caller didn't specify one.
 * Picks the highest open string whose pitch is <= midi (within fret 0..22), clamping to 0..5.
 */
export function inferGuitarString(midi: number, tuning: readonly number[] = STANDARD_TUNING): number {
  let best = 0
  for (let s = 0; s < tuning.length; s++) {
    if (midi >= tuning[s]) best = s
  }
  return Math.max(0, Math.min(tuning.length - 1, best))
}

/**
 * Find the sample start offset (in seconds) for a legato note (Safeguard #4):
 * advances `skipSec` (~35 ms) past `baseOffSec` (past the pick transient into the sustain body) and snaps
 * within ±4 ms to the nearest upward zero-crossing (or minimum amplitude) so starting mid-wave never clicks.
 */
export function legatoOffsetOf(
  buf: AudioBuffer | Float32Array | null | undefined,
  baseOffSec = 0,
  sampleRate = 48000,
  skipSec = LEGATO_SKIP_SEC,
): number {
  if (!buf) return baseOffSec + skipSec
  const sr =
    buf instanceof Float32Array
      ? sampleRate
      : typeof buf.sampleRate === 'number' && buf.sampleRate > 0
        ? buf.sampleRate
        : sampleRate
  const data =
    buf instanceof Float32Array
      ? buf
      : typeof buf.getChannelData === 'function' && buf.length > 0
        ? buf.getChannelData(0)
        : null
  const targetSec = baseOffSec + skipSec
  if (!data || data.length === 0) return targetSec

  const targetIdx = Math.round(targetSec * sr)
  // Leave at least 20 ms of sustain tail if the buffer is very short
  const maxStartIdx = Math.max(0, data.length - Math.round(sr * 0.02))
  const center = Math.min(targetIdx, maxStartIdx)
  const radius = Math.max(4, Math.round(sr * 0.004))
  const lo = Math.max(1, center - radius)
  const hi = Math.min(data.length - 1, center + radius)

  let bestZeroIdx = -1
  let bestZeroDist = Infinity
  let minAmpIdx = center
  let minAmp = Math.abs(data[center] ?? 0)

  for (let i = lo; i <= hi; i++) {
    const prev = data[i - 1]
    const cur = data[i]
    const amp = Math.abs(cur)
    if (amp < minAmp) {
      minAmp = amp
      minAmpIdx = i
    }
    // Prefer an upward zero-crossing (or any sign change) closest to the 35 ms target
    if ((prev <= 0 && cur >= 0) || (prev >= 0 && cur <= 0)) {
      const dist = Math.abs(i - center) + (prev <= 0 && cur >= 0 ? 0 : 4)
      if (dist < bestZeroDist) {
        bestZeroDist = dist
        bestZeroIdx = i
      }
    }
  }

  const chosen = bestZeroIdx >= 0 ? bestZeroIdx : minAmpIdx
  return chosen / sr
}

export interface StringVoiceState {
  id: number
  stringIndex: number
  stringKey: string
  midi: number
  startTime: number
  stopTime: number | null
  initialGain: number
  pm: boolean
  legato: LegatoTech | null
  sampleOffsetSec: number
  dampedAt: number | null
  dampDurationSec: number | null
  stop: (at: number, fast?: boolean, tauSec?: number) => void
}

/**
 * Compute the real-time remaining envelope (0..1) of a ringing string at audio time `atTime`.
 * Models natural plucked-string decay so a hammer-on onto a freshly plucked string stays strong (~0.95),
 * while a hammer-on onto a dying string inherits its decayed amplitude (~0.35–0.65) rather than jumping to 100%.
 */
export function ringingDecayAt(voice: Pick<StringVoiceState, 'startTime' | 'stopTime' | 'pm'>, atTime: number): number {
  const elapsed = atTime - voice.startTime
  if (elapsed < -0.02) return 0
  if (voice.stopTime !== null && atTime > voice.stopTime + 0.035) return 0
  const maxRingSec = voice.pm ? 0.45 : 2.8
  if (elapsed > maxRingSec) return 0
  const tau = voice.pm ? 0.14 : 1.35
  return Math.max(0, Math.min(1, Math.exp(-Math.max(0, elapsed) / tau)))
}

export interface PrepareStringVoiceOpts {
  /** Namespace separating independent instruments or double-track L/R channels (default: 'gtr'). */
  namespace?: string
  /** Optional group within the namespace (e.g. 'L' or 'R' for double-tracking). */
  group?: string
  /** Guitar string index (0 = lowest E, 5 = highest e). Inferred from `midi` if omitted. */
  string?: number
  /** Target MIDI note number. */
  midi: number
  /** AudioContext time (seconds) when the note starts. */
  when: number
  /** Requested linear gain (0..1+). */
  gain: number
  /** Palm-muted articulation. */
  pm?: boolean
  /** Playing technique ('h', 'p', '/', '\\', etc.). */
  tech?: string
  /** Starting MIDI pitch for a slide ('/' or '\\') if explicitly known. */
  slideFrom?: number
  /** Slide glide duration in seconds (default ~0.065 s). */
  slideTime?: number
  /** Decoded sample buffer (or channel data) for zero-crossing legato offset calculation. */
  buf?: AudioBuffer | Float32Array | null
  /** Base onset offset (seconds) of the pick attack in `buf`. */
  baseOffSec?: number
  /** Sample rate fallback when `buf` is a Float32Array. */
  sampleRate?: number
}

export interface StringVoicePlan {
  id: number
  stringIndex: number
  stringKey: string
  wasRinging: boolean
  prevMidi: number | null
  dampedPrev: boolean
  dampSec: number
  dampTauSec: number
  legato: LegatoTech | null
  sampleOffsetSec: number
  fadeInSec: number
  /** Multiplier (0..1) applied to note gain from real-time string decay inheritance. */
  gainScale: number
  /** Effective gain (`gain * gainScale`). */
  effectiveGain: number
  /** Amplitude of the subtle low-passed finger-fret contact thud on hammer-ons and pull-offs. */
  thudGain: number
  /** Starting semitone offset (`fromMidi - midi`) for slide pitch glide; 0 when not sliding. */
  slideSemitones: number
  /** Duration (seconds) of the slide pitch ramp. */
  slideTimeSec: number
}

let nextVoiceId = 1
const activeStrings = new Map<string, StringVoiceState>()
const lastStringByIndex = new Map<number, StringVoiceState>()
let totalSteals = 0
let totalLegatos = 0

export function samplerStats() {
  return {
    activeCount: activeStrings.size,
    totalSteals,
    totalLegatos,
  }
}

export function getStringVoiceState(stringIndex: number, namespace = 'gtr', group = ''): StringVoiceState | null {
  const key = `${namespace}:${group}:${stringIndex}`
  return activeStrings.get(key) ?? lastStringByIndex.get(stringIndex) ?? null
}

/**
 * Prepare a per-string voice before scheduling a note in `pluck.ts` or `packs.ts`:
 * - Steals and damps any note already ringing on the same string (~12 ms finger-lift damping, or ~8 ms legato crossfade).
 * - Calculates the ~35 ms zero-crossing sample offset, decay inheritance, finger-fret thud, and slide pitch ramp.
 */
export function prepareStringVoice(opts: PrepareStringVoiceOpts): StringVoicePlan {
  const id = nextVoiceId++
  const stringIndex = opts.string !== undefined ? Math.max(0, Math.min(11, opts.string)) : inferGuitarString(opts.midi)
  const ns = opts.namespace ?? 'gtr'
  const grp = opts.group ?? ''
  const stringKey = `${ns}:${grp}:${stringIndex}`

  const prev = activeStrings.get(stringKey)
  const decay = prev ? ringingDecayAt(prev, opts.when) : 0
  const wasRinging = !!prev && decay > 0.05
  const prevMidi = wasRinging && prev ? prev.midi : null

  const requestedLegato = isLegatoTech(opts.tech) ? opts.tech : null
  // Hammer-ons, pull-offs, and slides use legato transient-skip & crossfade whenever requested or transitioning from a ringing string
  const legato: LegatoTech | null = requestedLegato

  const dampSec = legato ? LEGATO_CROSSFADE_SEC : FINGER_LIFT_DAMP_SEC
  const dampTauSec = legato ? LEGATO_CROSSFADE_TAU_SEC : FINGER_LIFT_TAU_SEC

  let dampedPrev = false
  if (prev) {
    prev.dampedAt = opts.when
    prev.dampDurationSec = dampSec
    prev.stop(opts.when, true, dampTauSec)
    dampedPrev = true
    totalSteals++
  }

  const baseOff = opts.baseOffSec ?? 0
  const sampleOffsetSec =
    legato !== null
      ? legatoOffsetOf(opts.buf, baseOff, opts.sampleRate ?? 48000, LEGATO_SKIP_SEC)
      : baseOff

  const fadeInSec = legato !== null ? LEGATO_CROSSFADE_SEC : 0

  // Real-time decay inheritance (Safeguard #4 + Upgrade #7):
  // If the string was ringing, inherit its current decay envelope at `opts.when` so a hammer-on onto a dying string
  // never jumps back to full pick volume. Pull-offs are naturally slightly softer (~0.88x) than hammer-ons (~0.96x).
  let gainScale = 1
  if (legato !== null) {
    totalLegatos++
    const baseArticScale = legato === 'p' ? 0.88 : legato === 'h' ? 0.96 : 0.94
    const ringEnv = wasRinging ? decay : 0.85
    gainScale = Math.max(0.22, Math.min(1, ringEnv * baseArticScale))
  }

  const effectiveGain = opts.gain * gainScale
  const thudGain =
    legato === 'h'
      ? effectiveGain * 0.14
      : legato === 'p'
        ? effectiveGain * 0.1
        : 0

  let slideSemitones = 0
  const slideTimeSec = Math.max(0.025, Math.min(0.25, opts.slideTime ?? 0.065))
  if (legato === '/' || legato === '\\') {
    const fromMidi =
      opts.slideFrom !== undefined
        ? opts.slideFrom
        : prevMidi !== null && prevMidi !== opts.midi
          ? prevMidi
          : legato === '/'
            ? opts.midi - 2
            : opts.midi + 2
    slideSemitones = Math.max(-12, Math.min(12, fromMidi - opts.midi))
  }

  return {
    id,
    stringIndex,
    stringKey,
    wasRinging,
    prevMidi,
    dampedPrev,
    dampSec,
    dampTauSec,
    legato,
    sampleOffsetSec,
    fadeInSec,
    gainScale,
    effectiveGain,
    thudGain,
    slideSemitones,
    slideTimeSec,
  }
}

/**
 * Register a newly started string voice so subsequent notes on the same string can damp it or legato from it.
 */
export function registerStringVoice(
  plan: StringVoicePlan,
  opts: {
    midi: number
    when: number
    gain: number
    pm?: boolean
    stop: (at: number, fast?: boolean, tauSec?: number) => void
  },
): StringVoiceState {
  const state: StringVoiceState = {
    id: plan.id,
    stringIndex: plan.stringIndex,
    stringKey: plan.stringKey,
    midi: opts.midi,
    startTime: opts.when,
    stopTime: null,
    initialGain: plan.effectiveGain,
    pm: !!opts.pm,
    legato: plan.legato,
    sampleOffsetSec: plan.sampleOffsetSec,
    dampedAt: null,
    dampDurationSec: null,
    stop: (at: number, fast = false, tauSec?: number) => {
      if (state.stopTime === null || at < state.stopTime) state.stopTime = at
      opts.stop(at, fast, tauSec)
    },
  }
  activeStrings.set(plan.stringKey, state)
  lastStringByIndex.set(plan.stringIndex, state)
  return state
}

/** Stop and clear all ringing string voices (e.g. when leaving a screen or pressing Stop). */
export function stopStringVoices(atTime?: number) {
  for (const [, v] of activeStrings) {
    try {
      v.stop(atTime ?? v.startTime, true, FINGER_LIFT_TAU_SEC)
    } catch {
      /* already stopped */
    }
  }
  activeStrings.clear()
  lastStringByIndex.clear()
  if (workletNode) {
    try {
      workletNode.port.postMessage({ type: 'stopAll', releaseSec: 0.02 })
    } catch {
      /* noop */
    }
  }
}

/**
 * Schedule the gain envelope for a note (8 ms crossfade-in on legato notes, immediate full level on picked notes).
 */
export function scheduleVoiceGain(g: GainNode, targetGain: number, when: number, plan: StringVoicePlan) {
  const param = g.gain
  if (plan.fadeInSec > 0 && typeof param.setValueAtTime === 'function' && typeof param.linearRampToValueAtTime === 'function') {
    try {
      param.setValueAtTime(0.0001, when)
      param.linearRampToValueAtTime(targetGain, when + plan.fadeInSec)
      return
    } catch {
      /* fall through to direct value assignment */
    }
  }
  param.value = targetGain
}

/**
 * Apply slide pitch glide (`/` or `\`) and string bends to an `AudioBufferSourceNode`.
 */
export function applySlideAndBend(
  src: AudioBufferSourceNode,
  baseRate: number,
  when: number,
  plan: StringVoicePlan,
  bendOpts?: { bend?: number; bendTime?: number; prebent?: boolean; release?: boolean },
) {
  const hasSlide = (plan.legato === '/' || plan.legato === '\\') && Math.abs(plan.slideSemitones) > 0.01
  if (hasSlide) {
    const startRate = baseRate * Math.pow(2, plan.slideSemitones / 12)
    if (
      src.playbackRate &&
      typeof src.playbackRate.setValueAtTime === 'function' &&
      typeof src.playbackRate.exponentialRampToValueAtTime === 'function'
    ) {
      try {
        src.playbackRate.setValueAtTime(startRate, when)
        src.playbackRate.exponentialRampToValueAtTime(baseRate, when + plan.slideTimeSec)
      } catch {
        src.playbackRate.value = baseRate
      }
    } else if (src.detune && typeof src.detune.setValueAtTime === 'function' && typeof src.detune.linearRampToValueAtTime === 'function') {
      try {
        src.playbackRate.value = baseRate
        src.detune.setValueAtTime(plan.slideSemitones * 100, when)
        src.detune.linearRampToValueAtTime(0, when + plan.slideTimeSec)
      } catch {
        src.playbackRate.value = baseRate
      }
    } else {
      src.playbackRate.value = baseRate
    }
  } else {
    src.playbackRate.value = baseRate
  }

  if (bendOpts?.bend && src.detune && typeof src.detune.setValueAtTime === 'function') {
    const c = bendOpts.bend * 100
    const dt = bendOpts.bendTime ?? 0.14
    const bendStart = hasSlide ? when + plan.slideTimeSec : when
    try {
      if (bendOpts.release) {
        src.detune.setValueAtTime(c, bendStart)
        src.detune.linearRampToValueAtTime(0, bendStart + dt)
      } else if (bendOpts.prebent) {
        src.detune.setValueAtTime(c, bendStart)
      } else {
        src.detune.setValueAtTime(0, bendStart + 0.03)
        src.detune.linearRampToValueAtTime(c, bendStart + 0.03 + dt)
      }
    } catch {
      /* noop */
    }
  }
}

/**
 * Play a subtle, low-passed (~260 Hz, ~4.5 ms) finger-fret contact thud when a hammer-on or pull-off hits the fretwire.
 */
export function playFingerThud(ctx: BaseAudioContext, when: number, thudGain: number, dest: AudioNode, pan?: number) {
  if (thudGain <= 0.0005 || typeof ctx.createOscillator !== 'function') return
  try {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 260
    if (typeof osc.frequency.setValueAtTime === 'function' && typeof osc.frequency.exponentialRampToValueAtTime === 'function') {
      osc.frequency.setValueAtTime(285, when)
      osc.frequency.exponentialRampToValueAtTime(140, when + 0.0045)
    }
    g.gain.value = thudGain
    if (typeof g.gain.setValueAtTime === 'function' && typeof g.gain.exponentialRampToValueAtTime === 'function') {
      g.gain.setValueAtTime(thudGain, when)
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.0045)
    }
    let node: AudioNode = osc.connect(g)
    if (typeof ctx.createBiquadFilter === 'function') {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 340
      node = node.connect(lp)
    }
    if (pan !== undefined && typeof (ctx as AudioContext).createStereoPanner === 'function') {
      const p = (ctx as AudioContext).createStereoPanner()
      p.pan.value = pan
      node = node.connect(p)
    }
    node.connect(dest)
    osc.start(when)
    osc.stop(when + 0.005)
  } catch {
    /* ignore in minimal test stubs */
  }
}

// ---- AudioWorklet bridge (`kg-sampler` in src/engine/worklets/sampler.worklet.js) ----------------------------------
let workletLoading: Promise<AudioWorkletNode | null> | null = null
let workletNode: AudioWorkletNode | null = null
const uploadedSamples = new Set<string>()

export function samplerWorkletReady(): boolean {
  return workletNode !== null
}

export function ensureSamplerWorklet(ctx: AudioContext, dest?: AudioNode): Promise<AudioWorkletNode | null> {
  if (workletNode) return Promise.resolve(workletNode)
  if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return Promise.resolve(null)
  if (!workletLoading) {
    workletLoading = ctx.audioWorklet
      .addModule(new URL('./worklets/sampler.worklet.js', import.meta.url).href)
      .then(() => {
        const node = new AudioWorkletNode(ctx, 'kg-sampler', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers',
        })
        if (dest) node.connect(dest)
        workletNode = node
        return node
      })
      .catch(() => null)
  }
  return workletLoading
}

export function registerSampleInWorklet(key: string, buf: AudioBuffer) {
  if (!workletNode || uploadedSamples.has(key)) return
  try {
    const left = new Float32Array(buf.getChannelData(0))
    const right = buf.numberOfChannels > 1 ? new Float32Array(buf.getChannelData(1)) : left
    workletNode.port.postMessage({ type: 'sample', key, left, right, sr: buf.sampleRate })
    uploadedSamples.add(key)
  } catch {
    /* noop */
  }
}

// ---- Offline / deterministic worklet PCM renderer (used by unit tests & offline checks) ----------------------------
export interface OfflineNoteEvent {
  sample: Float32Array
  sampleRate?: number
  baseOffSec?: number
  string: number
  midi: number
  whenSec: number
  gain?: number
  tech?: LegatoTech
  slideFrom?: number
  slideTimeSec?: number
  pm?: boolean
}

/**
 * Render a sequence of per-string note events into a `Float32Array` buffer using the exact `kg-sampler` worklet
 * algorithm (12 ms finger-lift damping on same-string voice steal, 35 ms zero-crossing transient skip on legato,
 * 8 ms crossfade from ringing string, real-time decay inheritance, finger-fret thud, and slide pitch glide).
 */
export function renderSamplerOffline(
  events: OfflineNoteEvent[],
  durationSec: number,
  sampleRate = 48000,
): { buffer: Float32Array; plans: StringVoicePlan[] } {
  const totalFrames = Math.max(1, Math.round(durationSec * sampleRate))
  const out = new Float32Array(totalFrames)
  const plans: StringVoicePlan[] = []

  interface SimVoice {
    sample: Float32Array
    sr: number
    string: number
    startFrame: number
    framePos: number
    startRate: number
    targetRate: number
    slideFrames: number
    slideProgress: number
    gain: number
    fadeInFrames: number
    ageFrames: number
    releasing: boolean
    releaseStartFrame: number
    releaseFrames: number
    releaseProgress: number
    thudAmp: number
    thudFrames: number
    thudPos: number
    done: boolean
  }

  const voices: SimVoice[] = []
  const byString = new Map<number, SimVoice>()

  const sorted = [...events].sort((a, b) => a.whenSec - b.whenSec)
  for (const ev of sorted) {
    const sr = ev.sampleRate ?? sampleRate
    const plan = prepareStringVoice({
      namespace: 'offline',
      string: ev.string,
      midi: ev.midi,
      when: ev.whenSec,
      gain: ev.gain ?? 0.8,
      pm: ev.pm,
      tech: ev.tech,
      slideFrom: ev.slideFrom,
      slideTime: ev.slideTimeSec,
      buf: ev.sample,
      baseOffSec: ev.baseOffSec ?? 0,
      sampleRate: sr,
    })
    plans.push(plan)
    const startFrame = Math.max(0, Math.round(ev.whenSec * sampleRate))
    const prev = byString.get(ev.string)
    if (prev && !prev.done && !prev.releasing) {
      prev.releasing = true
      prev.releaseStartFrame = startFrame
      prev.releaseFrames = Math.max(4, Math.round(plan.dampSec * sampleRate))
    }

    const targetRate = sr / sampleRate
    const startRate =
      plan.slideSemitones !== 0
        ? targetRate * Math.pow(2, plan.slideSemitones / 12)
        : targetRate
    const slideFrames = plan.slideSemitones !== 0 ? Math.max(1, Math.round(plan.slideTimeSec * sampleRate)) : 0
    const fadeInFrames = plan.fadeInSec > 0 ? Math.max(1, Math.round(plan.fadeInSec * sampleRate)) : Math.max(1, Math.round(0.0015 * sampleRate))

    const sim: SimVoice = {
      sample: ev.sample,
      sr,
      string: ev.string,
      startFrame,
      framePos: plan.sampleOffsetSec * sr,
      startRate,
      targetRate,
      slideFrames,
      slideProgress: 0,
      gain: plan.effectiveGain,
      fadeInFrames,
      ageFrames: 0,
      releasing: false,
      releaseStartFrame: 0,
      releaseFrames: Math.round(FINGER_LIFT_DAMP_SEC * sampleRate),
      releaseProgress: 0,
      thudAmp: plan.thudGain,
      thudFrames: Math.round(0.0045 * sampleRate),
      thudPos: 0,
      done: false,
    }
    byString.set(ev.string, sim)
    voices.push(sim)
    registerStringVoice(plan, {
      midi: ev.midi,
      when: ev.whenSec,
      gain: ev.gain ?? 0.8,
      pm: ev.pm,
      stop: () => {},
    })
  }

  for (let f = 0; f < totalFrames; f++) {
    let sum = 0
    for (let k = 0; k < voices.length; k++) {
      const v = voices[k]
      if (v.done || f < v.startFrame) continue
      const idx = Math.floor(v.framePos)
      if (idx < 0 || idx + 1 >= v.sample.length) {
        v.done = true
        continue
      }
      const frac = v.framePos - idx
      const samp = v.sample[idx] + (v.sample[idx + 1] - v.sample[idx]) * frac
      let env = v.ageFrames < v.fadeInFrames ? v.ageFrames / v.fadeInFrames : 1
      if (v.releasing && f >= v.releaseStartFrame) {
        v.releaseProgress++
        const r = 1 - v.releaseProgress / v.releaseFrames
        if (r <= 0.0005) {
          v.done = true
          continue
        }
        env *= r * r
      }
      let thud = 0
      if (v.thudAmp > 0 && v.thudPos < v.thudFrames) {
        const prog = v.thudPos / v.thudFrames
        thud = v.thudAmp * Math.sin((2 * Math.PI * 260 * v.thudPos) / sampleRate) * (1 - prog) * (1 - prog)
        v.thudPos++
      }
      sum += samp * env * v.gain + thud
      let rate = v.targetRate
      if (v.slideFrames > 0 && v.slideProgress < v.slideFrames) {
        v.slideProgress++
        const u = v.slideProgress / v.slideFrames
        rate = v.startRate * Math.pow(v.targetRate / v.startRate, u)
      }
      v.framePos += rate
      v.ageFrames++
    }
    out[f] = sum
  }

  return { buffer: out, plans }
}
