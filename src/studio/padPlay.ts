// Making a pad's sound: the kit drum (pitched or reversed if you changed it), a recording (trimmed, pitched,
// reversed, faded, looped), a file from your phone, or an instrument note or chord. Returns a handle so a pad
// that plays "while held" stops when you let go, and so choke groups can cut each other off.
import { audio } from '../audio/engine'
import { kitBuffer, type KitId, type Voice } from '../audio/drums'
import type { Handle } from '../audio/pluck'
import { loadInstr, playInstr } from './sounds'
import { sampleNow } from './padSamples'
import type { PadDef } from './pads'
import { prepareShift, shiftedNow } from './pitchShift'

const revCache = new WeakMap<AudioBuffer, AudioBuffer>()
function reversedBuf(b: AudioBuffer): AudioBuffer {
  const hit = revCache.get(b)
  if (hit) return hit
  const out = audio().createBuffer(b.numberOfChannels, b.length, b.sampleRate)
  for (let c = 0; c < b.numberOfChannels; c++) {
    const s = b.getChannelData(c), d = out.getChannelData(c)
    for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i]
  }
  revCache.set(b, out)
  return out
}

/** The buffer a pad plays (null = not a buffer pad, or not loaded yet). */
export function padBuffer(def: PadDef, pad: string, kit: KitId, files: Map<string, AudioBuffer>): { buf: AudioBuffer; start: number; end: number } | null {
  if (def.src === 'rec' && def.sample) {
    const b = sampleNow(def.sample)
    return b ? { buf: b, start: def.start ?? 0, end: def.end ?? b.duration } : null
  }
  if (def.src === 'file' && def.file) {
    const b = files.get(def.file.uri)
    return b ? { buf: b, start: def.start ?? 0, end: def.end ?? b.duration } : null
  }
  if (def.src === 'kit') {
    const k = kitBuffer(pad as Voice, kit)
    return k ? { buf: k.buf, start: k.off, end: k.buf.duration } : null
  }
  return null
}

/** What a pad's shifted copies are kept under. */
export const shiftId = (def: PadDef, pad: string, kit: KitId) => def.sample ?? def.file?.uri ?? `kit:${kit}:${pad}`

const chokes = new Map<number, Handle>()

export interface PadPlayCtx { kit: KitId; files: Map<string, AudioBuffer>; stepDur: number; dest: AudioNode }

/** Play a pad's sound at `when` (0 = now). `seq` = from the step grid (a held/looping pad stops after its length). */
export function playPad(def: PadDef, pad: string, when: number, vel: number, c: PadPlayCtx, seq = false): Handle | null {
  const ctx = audio()
  const t = Math.max(when, ctx.currentTime)
  const vol = (def.vol ?? 1) * vel
  const mode = def.mode ?? 'oneshot'
  let h: Handle | null = null
  if (def.src === 'note' || def.src === 'chord') {
    if (!def.inst) return null
    void loadInstr(def.inst)
    const root = (def.midi ?? 60) + (def.pitch ?? 0) + (def.keyShift ?? 0)
    const notes = def.src === 'chord' ? (def.ivs ?? [0, 4, 7]).map(i => root + i) : [root]
    const g = ctx.createGain()
    g.gain.value = 1
    g.connect(c.dest)
    // one shot: a beat long (or its length in the grid); held: until you let go
    const len = (def.len ?? 4) * c.stepDur
    const hs = notes.map(m => playInstr(def.inst!, m, t, Math.min(1.2, 0.8 * vol), { dest: g, dur: mode === 'oneshot' || seq ? len : undefined }))
    if (def.fadeIn) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + def.fadeIn) }
    h = { stop: (at?: number) => { const s = Math.max(at ?? ctx.currentTime, ctx.currentTime); const f = def.fadeOut || 0.03; g.gain.setTargetAtTime(0, s, f / 3); hs.forEach(x => x.stop(s + f)) } }
  } else {
    let pb = padBuffer(def, pad, c.kit, c.files)
    if (!pb) return null
    // the dial: tape (pitch and speed together) or keep the speed (a shifted copy, made once and kept)
    const dial = def.pitch ?? 0
    let tape = dial
    if (def.pitchMode === 'keep' && Math.abs(dial) > 0.005) {
      const id = shiftId(def, pad, c.kit)
      const sh = shiftedNow(id, pb.start, pb.end, dial, !!def.natural)
      if (sh) { pb = { buf: sh, start: 0, end: sh.duration }; tape = 0 }
      else void prepareShift(id, pb.buf, pb.start, pb.end, dial, !!def.natural)
    }
    tape += def.keyShift ?? 0
    const buf = def.reverse ? reversedBuf(pb.buf) : pb.buf
    const a = def.reverse ? buf.duration - pb.end : pb.start
    const b = def.reverse ? buf.duration - pb.start : pb.end
    const len = Math.max(0.005, b - a)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = Math.pow(2, tape / 12)
    const g = ctx.createGain()
    const level = 0.9 * vol * vol
    const fi = Math.min(def.fadeIn ?? 0, len / 2)
    const fo = Math.min(def.fadeOut ?? 0.004, len / 2)
    const real = len / src.playbackRate.value
    if (fi > 0.001) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + fi) } else g.gain.setValueAtTime(level, t)
    src.connect(g).connect(c.dest)
    if (mode === 'loop') {
      src.loop = true
      src.loopStart = a
      src.loopEnd = b
      src.start(t, a)
      if (seq) { const end = t + (def.len ?? 4) * c.stepDur; g.gain.setTargetAtTime(0, end, 0.01); src.stop(end + 0.08) }
    } else {
      src.start(t, a, len)
      if (fo > 0.001) { g.gain.setValueAtTime(level, t + Math.max(fi, real - fo)); g.gain.linearRampToValueAtTime(0, t + real) }
      if (mode === 'hold' && seq) { const end = t + (def.len ?? 4) * c.stepDur; if (end < t + real) { g.gain.setTargetAtTime(0, end, 0.01); src.stop(end + 0.08) } }
    }
    h = { stop: (at?: number) => { const s = Math.max(at ?? ctx.currentTime, ctx.currentTime); g.gain.cancelScheduledValues(s); g.gain.setTargetAtTime(0, s, Math.max(0.008, (def.fadeOut ?? 0.03) / 3)); try { src.stop(s + 0.25) } catch { /* noop */ } } }
  }
  // choke group: this pad cuts off the last one in its group
  if (def.choke && h) {
    const prev = chokes.get(def.choke)
    if (prev) prev.stop(t)
    chokes.set(def.choke, h)
  }
  return h
}
