// A looper take in stereo (or mono from the phone's mic): what the pedal sends, kept as it is. The mono helpers in
// logic.ts / loops.ts work on one channel; these run them on both channels the same way.
import { mixTakes } from './logic'
import { stretchStereo } from '../studio/pitchShift'

export interface Take { l: Float32Array; r: Float32Array | null }

export const isStereo = (t: Take) => !!t.r
export const lengthOf = (t: Take) => t.l.length
/** Both channels as one (for anything that only needs to hear the loop: waveforms, the lead's ducking, tabs, pads). */
export function midOf(t: Take): Float32Array {
  if (!t.r) return t.l
  const out = new Float32Array(t.l.length)
  for (let i = 0; i < out.length; i++) out[i] = (t.l[i] + (t.r[i] ?? 0)) * 0.5
  return out
}
/** The same thing done to each channel. */
export function each(t: Take, fn: (x: Float32Array) => Float32Array): Take { return { l: fn(t.l), r: t.r ? fn(t.r) : null } }
export async function eachAsync(t: Take, fn: (x: Float32Array) => Promise<Float32Array>): Promise<Take> { return { l: await fn(t.l), r: t.r ? await fn(t.r) : null } }
export function sub(t: Take, a: number, b?: number): Take { return { l: t.l.subarray(a, b), r: t.r ? t.r.subarray(a, b) : null } }

/** Several takes played together. A mono take in a stereo mix is put in the middle (both sides). */
export function mixStereo(takes: Take[], len: number): Take {
  const st = takes.some(isStereo)
  const l = mixTakes(takes.map(t => t.l), len)
  return { l, r: st ? mixTakes(takes.map(t => t.r ?? t.l), len) : null }
}

/**
 * Level a take without changing its sound: one gain for the whole take (both channels), aiming at about −18 dBFS over
 * the parts you played but never letting a peak go over −1 dBFS. Nothing is limited or clipped (the old leveller pushed
 * quiet clean playing up and then squashed the pick attacks, which garbled clean and acoustic loops). Tiny edge fades.
 */
export function levelTake(t: Take, sr: number): Take {
  const m = midOf(t)
  const blk = Math.round(sr * 0.05)
  const rms: number[] = []
  for (let i = 0; i + blk <= m.length; i += blk) { let s = 0; for (let k = i; k < i + blk; k++) s += m[k] * m[k]; rms.push(Math.sqrt(s / blk)) }
  const loud = rms.filter(r => r > 0.002).sort((a, b) => a - b)
  const level = loud.length ? loud[Math.floor(loud.length * 0.6)] : 0
  let peak = 0
  for (const x of [t.l, t.r]) if (x) for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > peak) peak = v }
  const gain = level > 0 ? Math.max(0.05, Math.min(30, 0.126 / level, peak > 0 ? 0.89 / peak : 30)) : 1
  const fade = Math.min(Math.round(sr * 0.004), m.length >> 2)
  return each(t, x => {
    const out = new Float32Array(x.length)
    for (let i = 0; i < x.length; i++) {
      let v = x[i] * gain
      if (i < fade) v *= i / fade
      else if (i > x.length - fade) v *= (x.length - i) / fade
      out[i] = v
    }
    return out
  })
}

/** Slower or faster, pitch kept (Signalsmith Stretch), both channels together so the stereo picture stays put. */
export async function stretchTake(t: Take, sr: number, rate: number): Promise<Take> {
  if (!t.r) { const [l] = await stretchStereo([t.l], sr, rate); return { l, r: null } }
  const [l, r] = await stretchStereo([t.l, t.r], sr, rate)
  return { l, r }
}

/** An AudioBuffer of a take (1 or 2 channels). */
export function bufferOf(ctx: BaseAudioContext, t: Take, sr: number): AudioBuffer {
  const buf = ctx.createBuffer(t.r ? 2 : 1, t.l.length, sr)
  buf.getChannelData(0).set(t.l)
  if (t.r) buf.getChannelData(1).set(t.r.subarray(0, t.l.length))
  return buf
}

/** Samples dropped while recording (the phone couldn't keep up): runs of exact zeros in the middle of sound. */
export function dropouts(x: Float32Array, sr: number): number {
  const minRun = Math.round(sr * 0.002)
  let n = 0, run = 0, before = 0
  for (let i = 0; i < x.length; i++) {
    if (x[i] === 0) { run++; continue }
    if (run >= minRun && before > 0.01 && Math.abs(x[i]) > 0.01) n++
    run = 0; before = Math.abs(x[i])
  }
  return n
}
