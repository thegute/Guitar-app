// KGuitar per-string sampler worklet (Stage 3 / Engine Week Part 4, notes/AUDIO-ENGINE.md & notes/ENGINE-WEEK.md):
// - One monophonic voice slot per guitar string (plus polyphonic release/crossfade tails): playing a new note on a
//   string lifts the finger off the old note (~12 ms damping) or crossfades (~8 ms) on legato techniques.
// - Safeguard #4 + Upgrade #7: Hammer-ons ('h') and pull-offs ('p') start the destination sample ~35 ms past its pick
//   transient (at a zero-crossing), crossfade from the ringing string, inherit its real-time decay envelope so a
//   hammer-on onto a dying string never jumps back to full pick volume, and add a subtle low-passed finger-fret thud.
// - Slides ('/' and '\\') glide playbackRate smoothly from the ringing string's pitch into the destination sustain body.

class KgSampler extends AudioWorkletProcessor {
  constructor() {
    super()
    /** @type {Map<string, { left: Float32Array; right: Float32Array; sr: number }>} */
    this.samples = new Map()
    /** @type {Array<any>} */
    this.voices = []
    /** @type {Map<string, any>} */
    this.stringActive = new Map()
    this.port.onmessage = e => this.onMessage(e.data)
  }

  onMessage(msg) {
    if (!msg || typeof msg !== 'object') return
    if (msg.type === 'sample') {
      const left = msg.left instanceof Float32Array ? msg.left : new Float32Array(msg.left || 0)
      const right = msg.right instanceof Float32Array ? msg.right : left
      this.samples.set(msg.key, { left, right, sr: msg.sr || sampleRate })
      return
    }
    if (msg.type === 'noteOn') {
      this.triggerVoice(msg)
      return
    }
    if (msg.type === 'noteOff') {
      this.releaseVoice(msg.id, msg.stringKey, msg.stopFrame || currentFrame, msg.releaseSec || 0.035)
      return
    }
    if (msg.type === 'stopAll') {
      const at = msg.stopFrame || currentFrame
      const rel = msg.releaseSec || 0.025
      for (const v of this.voices) this.beginRelease(v, at, rel)
      this.stringActive.clear()
    }
  }

  beginRelease(v, atFrame, releaseSec) {
    if (!v || v.releasing) return
    v.releasing = true
    v.releaseStartFrame = Math.max(atFrame, v.startFrame)
    v.releaseFrames = Math.max(8, Math.round((releaseSec || 0.012) * sampleRate))
  }

  releaseVoice(id, stringKey, atFrame, releaseSec) {
    for (const v of this.voices) {
      if ((id && v.id === id) || (!id && stringKey && v.stringKey === stringKey && !v.releasing)) {
        this.beginRelease(v, atFrame, releaseSec)
        if (this.stringActive.get(v.stringKey) === v) this.stringActive.delete(v.stringKey)
      }
    }
  }

  triggerVoice(msg) {
    const startFrame = Math.max(currentFrame, msg.startFrame || currentFrame)
    const stringKey = msg.stringKey || ''
    const legato = msg.legato || null
    const prev = stringKey ? this.stringActive.get(stringKey) : null
    let inheritedDecay = 1
    if (prev && !prev.done) {
      // Steal the string: 8 ms crossfade for legato, 12 ms finger-lift damping for a fresh pick
      const dampSec = legato ? (msg.crossfadeSec || 0.008) : (msg.dampSec || 0.012)
      this.beginRelease(prev, startFrame, dampSec)
      const elapsedSec = Math.max(0, (startFrame - prev.startFrame) / sampleRate)
      const naturalDecay = Math.exp(-elapsedSec / (prev.decayTauSec || 1.35))
      inheritedDecay = Math.max(0.18, Math.min(1, prev.currentEnv * naturalDecay))
    }

    const sample = this.samples.get(msg.key)
    const sr = sample ? sample.sr : sampleRate
    const offsetSec = Math.max(0, msg.offsetSec || 0)
    const fadeInSec = legato ? (msg.crossfadeSec || 0.008) : 0.0015
    const fadeInFrames = Math.max(1, Math.round(fadeInSec * sampleRate))
    const targetRate = Math.max(0.125, Math.min(8, (msg.rate || 1) * (sr / sampleRate)))
    const startRate =
      msg.slideFromRate && msg.slideFromRate > 0
        ? Math.max(0.125, Math.min(8, msg.slideFromRate * (sr / sampleRate)))
        : targetRate
    const slideFrames = msg.slideSec > 0 ? Math.max(1, Math.round(msg.slideSec * sampleRate)) : 0
    const legatoScale =
      legato && prev
        ? inheritedDecay * (legato === 'p' ? 0.88 : legato === 'h' ? 0.96 : 0.94)
        : 1
    const gain = (msg.gain ?? 0.8) * (msg.gainAlreadyScaled ? 1 : legatoScale)
    const pan = Math.max(-1, Math.min(1, msg.pan || 0))
    const angle = ((pan + 1) * Math.PI) / 4
    const panL = Math.cos(angle)
    const panR = Math.sin(angle)
    const thudAmp = (legato === 'h' || legato === 'p') ? (msg.thudGain ?? gain * 0.14) : 0
    const thudFrames = Math.round(0.0045 * sampleRate)

    const voice = {
      id: msg.id || 0,
      key: msg.key,
      stringKey,
      startFrame,
      framePos: offsetSec * sr,
      rate: startRate,
      startRate,
      targetRate,
      slideFrames,
      slideProgress: 0,
      gain,
      panL,
      panR,
      fadeInFrames,
      ageFrames: 0,
      currentEnv: 1,
      decayTauSec: msg.pm ? 0.14 : 1.35,
      releasing: false,
      releaseStartFrame: 0,
      releaseFrames: Math.round(0.012 * sampleRate),
      releaseProgress: 0,
      thudAmp,
      thudFrames,
      thudPos: 0,
      done: false,
    }
    if (stringKey) this.stringActive.set(stringKey, voice)
    this.voices.push(voice)
    if (this.voices.length > 48) this.voices.splice(0, this.voices.length - 48)
  }

  process(_inputs, outputs) {
    const out = outputs[0]
    if (!out || !out[0]) return true
    const outL = out[0]
    const outR = out[1] || out[0]
    const n = outL.length

    for (let i = 0; i < n; i++) {
      const absFrame = currentFrame + i
      let sumL = 0
      let sumR = 0
      for (let vIdx = 0; vIdx < this.voices.length; vIdx++) {
        const v = this.voices[vIdx]
        if (v.done || absFrame < v.startFrame) continue
        const s = this.samples.get(v.key)
        if (!s) {
          v.done = true
          continue
        }
        const idx = Math.floor(v.framePos)
        if (idx < 0 || idx + 1 >= s.left.length) {
          v.done = true
          continue
        }
        const frac = v.framePos - idx
        const sampL = s.left[idx] + (s.left[idx + 1] - s.left[idx]) * frac
        const sampR = s.right[idx] + (s.right[idx + 1] - s.right[idx]) * frac

        // Fade-in envelope (8 ms crossfade on legato, 1.5 ms anti-click on normal pick)
        let env = v.ageFrames < v.fadeInFrames ? v.ageFrames / v.fadeInFrames : 1
        // Release / voice-steal damping envelope
        if (v.releasing && absFrame >= v.releaseStartFrame) {
          v.releaseProgress++
          const r = 1 - v.releaseProgress / v.releaseFrames
          if (r <= 0.0005) {
            v.done = true
            continue
          }
          // Smooth raised-cosine / exponential damping curve
          env *= r * r
        }
        v.currentEnv = env

        // Subtle finger-fret contact thud on hammer-on / pull-off (~260 Hz low-passed impulse over 4.5 ms)
        let thud = 0
        if (v.thudAmp > 0 && v.thudPos < v.thudFrames) {
          const prog = v.thudPos / v.thudFrames
          thud =
            v.thudAmp *
            Math.sin(2 * Math.PI * 260 * (v.thudPos / sampleRate)) *
            (1 - prog) *
            (1 - prog)
          v.thudPos++
        }

        const amp = env * v.gain
        sumL += (sampL * amp + thud) * v.panL
        sumR += (sampR * amp + thud) * v.panR

        // Advance pitch glide for slides
        if (v.slideFrames > 0 && v.slideProgress < v.slideFrames) {
          v.slideProgress++
          const u = v.slideProgress / v.slideFrames
          v.rate = v.startRate * Math.pow(v.targetRate / v.startRate, u)
        } else {
          v.rate = v.targetRate
        }
        v.framePos += v.rate
        v.ageFrames++
      }
      outL[i] += sumL
      if (outR !== outL) outR[i] += sumR
    }

    // Prune completed voices
    for (let k = this.voices.length - 1; k >= 0; k--) {
      const v = this.voices[k]
      if (v.done) {
        if (this.stringActive.get(v.stringKey) === v) this.stringActive.delete(v.stringKey)
        this.voices.splice(k, 1)
      }
    }
    return true
  }
}

registerProcessor('kg-sampler', KgSampler)
