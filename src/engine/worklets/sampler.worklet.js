// KGuitar per-string sampler worklet (Stage 3 / Argon Step 1, notes/AUDIO-ENGINE.md & notes/SOUND-ENGINE-FINISH.md):
// - Multi-output bus routing (16 stereo output slots) so `me`, `band`, `guitar`, `bass`, `keys`, and custom buses stay isolated.
// - 4-point Catmull-Rom cubic interpolation for crisp acoustic harmonics and pick transients across pitch shifts, bends, and slides.
// - One monophonic voice slot per guitar string (plus polyphonic release/crossfade tails): playing a new note on a
//   string lifts the finger off the old note (~12 ms damping) or crossfades (~8 ms) on legato techniques.
// - Safeguard #4 + Upgrade #7: Hammer-ons ('h') and pull-offs ('p') start the destination sample ~35 ms past its pick
//   transient (at a zero-crossing), crossfade from the ringing string, inherit its real-time decay envelope so a
//   hammer-on onto a dying string never jumps back to full pick volume, and add a subtle low-passed finger-fret thud.
// - Precomputed per-sample pitch multipliers for slides ('/' and '\\') and bends (zero Math.pow inside the audio loop).

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
    if (msg.type === 'evict') {
      if (msg.key) this.samples.delete(msg.key)
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

  stealVoiceSlot() {
    if (this.voices.length < 64) return
    // Prefer removing a voice that is already done or furthest into release, else quietest voice
    let victimIdx = 0
    let lowestScore = Infinity
    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i]
      if (v.done) { victimIdx = i; break }
      const score = (v.releasing ? 0.05 : 1) * v.currentEnv * v.gain
      if (score < lowestScore) {
        lowestScore = score
        victimIdx = i
      }
    }
    const victim = this.voices[victimIdx]
    if (victim && this.stringActive.get(victim.stringKey) === victim) {
      this.stringActive.delete(victim.stringKey)
    }
    this.voices.splice(victimIdx, 1)
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
    const baseTargetRate = Math.max(0.125, Math.min(8, (msg.rate || 1) * (sr / sampleRate)))
    const startRate =
      msg.slideFromRate && msg.slideFromRate > 0
        ? Math.max(0.125, Math.min(8, msg.slideFromRate * (sr / sampleRate)))
        : baseTargetRate
    const slideFrames = msg.slideSec > 0 && Math.abs(startRate - baseTargetRate) > 1e-6
      ? Math.max(1, Math.round(msg.slideSec * sampleRate))
      : 0
    const slideStep = slideFrames > 0 ? Math.pow(baseTargetRate / startRate, 1 / slideFrames) : 1

    // String bend scheduling (precomputed multiplicative step; zero Math.pow in process loop)
    const bendSemi = msg.bend || 0
    let bendDelayFrames = 0
    let bendFrames = 0
    let bendStep = 1
    let initialBendMult = 1
    let finalBendMult = 1
    if (Math.abs(bendSemi) > 1e-4) {
      const bendRatio = Math.pow(2, bendSemi / 12)
      const dtFrames = Math.max(1, Math.round((msg.bendTime || 0.14) * sampleRate))
      if (msg.bendRelease) {
        initialBendMult = bendRatio
        finalBendMult = 1
        bendDelayFrames = slideFrames
        bendFrames = dtFrames
        bendStep = Math.pow(1 / bendRatio, 1 / dtFrames)
      } else if (msg.bendPre) {
        initialBendMult = bendRatio
        finalBendMult = bendRatio
      } else {
        initialBendMult = 1
        finalBendMult = bendRatio
        bendDelayFrames = slideFrames + Math.round(0.03 * sampleRate)
        bendFrames = dtFrames
        bendStep = Math.pow(bendRatio, 1 / dtFrames)
      }
    }

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
    const stopFrame = msg.durSec > 0 ? startFrame + Math.max(16, Math.round(msg.durSec * sampleRate)) : 0
    const stopReleaseSec = msg.releaseSec || 0.035

    this.stealVoiceSlot()

    const voice = {
      id: msg.id || 0,
      key: msg.key,
      outIdx: msg.outIdx || 0,
      stringKey,
      startFrame,
      stopFrame,
      stopReleaseSec,
      framePos: offsetSec * sr,
      rate: startRate,
      targetRate: baseTargetRate,
      slideFrames,
      slideProgress: 0,
      slideStep,
      bendMult: initialBendMult,
      finalBendMult,
      bendDelayFrames,
      bendFrames,
      bendProgress: 0,
      bendStep,
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
      thudW: (2 * Math.PI * 260) / sampleRate,
      done: false,
    }
    if (stringKey) this.stringActive.set(stringKey, voice)
    this.voices.push(voice)
  }

  process(_inputs, outputs) {
    if (!outputs || !outputs.length || !this.voices.length) return true
    const firstOut = outputs[0]
    if (!firstOut || !firstOut[0]) return true
    const n = firstOut[0].length

    for (let vIdx = 0; vIdx < this.voices.length; vIdx++) {
      const v = this.voices[vIdx]
      if (v.done) continue
      const s = this.samples.get(v.key)
      if (!s) {
        v.done = true
        continue
      }
      const left = s.left
      const right = s.right
      const len = left.length
      if (len < 2) {
        v.done = true
        continue
      }
      const destOut = outputs[v.outIdx] || firstOut
      const outL = destOut[0]
      const outR = destOut[1] || outL

      for (let i = 0; i < n; i++) {
        const absFrame = currentFrame + i
        if (absFrame < v.startFrame) continue
        if (v.stopFrame > 0 && !v.releasing && absFrame >= v.stopFrame) {
          this.beginRelease(v, absFrame, v.stopReleaseSec)
        }

        const idx = v.framePos | 0
        if (idx < 0 || idx + 1 >= len) {
          v.done = true
          break
        }
        const frac = v.framePos - idx

        // 4-point Catmull-Rom cubic interpolation
        const i0 = idx > 0 ? idx - 1 : 0
        const i2 = idx + 1
        const i3 = idx + 2 < len ? idx + 2 : len - 1

        const y0L = left[i0], y1L = left[idx], y2L = left[i2], y3L = left[i3]
        const c1L = 0.5 * (y2L - y0L)
        const c2L = y0L - 2.5 * y1L + 2 * y2L - 0.5 * y3L
        const c3L = 0.5 * (y3L - y0L) + 1.5 * (y1L - y2L)
        const sampL = ((c3L * frac + c2L) * frac + c1L) * frac + y1L

        const sampR = right === left
          ? sampL
          : (() => {
              const y0R = right[i0], y1R = right[idx], y2R = right[i2], y3R = right[i3]
              const c1R = 0.5 * (y2R - y0R)
              const c2R = y0R - 2.5 * y1R + 2 * y2R - 0.5 * y3R
              const c3R = 0.5 * (y3R - y0R) + 1.5 * (y1R - y2R)
              return ((c3R * frac + c2R) * frac + c1R) * frac + y1R
            })()

        // Fade-in envelope (8 ms crossfade on legato, 1.5 ms anti-click on normal pick)
        let env = v.ageFrames < v.fadeInFrames ? v.ageFrames / v.fadeInFrames : 1
        if (v.releasing && absFrame >= v.releaseStartFrame) {
          v.releaseProgress++
          const r = 1 - v.releaseProgress / v.releaseFrames
          if (r <= 0.0005) {
            v.done = true
            break
          }
          env *= r * r
        }
        v.currentEnv = env

        let thud = 0
        if (v.thudAmp > 0 && v.thudPos < v.thudFrames) {
          const prog = 1 - v.thudPos / v.thudFrames
          thud = v.thudAmp * Math.sin(v.thudW * v.thudPos) * prog * prog
          v.thudPos++
        }

        const amp = env * v.gain
        const sigL = sampL * amp + thud
        const sigR = sampR * amp + thud
        outL[i] += sigL * v.panL
        if (outR !== outL) outR[i] += sigR * v.panR

        // Advance pitch glide for slides (precomputed multiplier)
        if (v.slideFrames > 0 && v.slideProgress < v.slideFrames) {
          v.slideProgress++
          v.rate = v.slideProgress >= v.slideFrames ? v.targetRate : v.rate * v.slideStep
        } else {
          v.rate = v.targetRate
        }

        // Advance string bend pitch curve (precomputed multiplier)
        if (v.bendFrames > 0 && v.ageFrames >= v.bendDelayFrames && v.bendProgress < v.bendFrames) {
          v.bendProgress++
          v.bendMult = v.bendProgress >= v.bendFrames ? v.finalBendMult : v.bendMult * v.bendStep
        }

        v.framePos += v.rate * v.bendMult
        v.ageFrames++
      }
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
