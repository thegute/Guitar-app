// "Keep the speed" pitch for pads: the sound moved up or down without getting longer or shorter, worked out once with
// Signalsmith Stretch (MIT, a music-grade pitch/time engine) in an offline audio context and kept in memory, so the pad
// still fires instantly. "Keep the voice natural" (formant compensation) stops a shifted voice sounding like a cartoon.
import SignalsmithStretch from 'signalsmith-stretch'

const cache = new Map<string, AudioBuffer>()
const pending = new Map<string, Promise<AudioBuffer | null>>()
const keyOf = (id: string, a: number, b: number, semis: number, natural: boolean) => `${id}|${a.toFixed(4)}|${b.toFixed(4)}|${semis.toFixed(2)}|${natural ? 1 : 0}`

/** The shifted sound, if it's ready. */
export function shiftedNow(id: string, a: number, b: number, semis: number, natural: boolean): AudioBuffer | null {
  return cache.get(keyOf(id, a, b, semis, natural)) ?? null
}

/** Shift `buf` from `a` to `b` seconds by `semis`, keeping its length. Resolves with the shifted piece (null if it can't). */
export function prepareShift(id: string, buf: AudioBuffer, a: number, b: number, semis: number, natural: boolean): Promise<AudioBuffer | null> {
  const key = keyOf(id, a, b, semis, natural)
  const have = cache.get(key)
  if (have) return Promise.resolve(have)
  let p = pending.get(key)
  if (!p) {
    p = render(buf, a, b, semis, natural).then(r => { if (r) { cache.set(key, r); trim() } pending.delete(key); return r }).catch(() => { pending.delete(key); return null })
    pending.set(key, p)
  }
  return p
}

/** A whole recording shifted (no cache): the mic effects' octave up / down. */
export async function shiftSamples(x: Float32Array, sr: number, semis: number): Promise<Float32Array> {
  const buf = new AudioBuffer({ length: x.length, numberOfChannels: 1, sampleRate: sr })
  buf.getChannelData(0).set(x)
  const r = await render(buf, 0, x.length / sr, semis, false)
  return r ? r.getChannelData(0).slice() : x
}

/** A recording made slower or faster without changing its pitch (rate 0.9 = 10 % slower, longer). Signalsmith Stretch. */
export async function stretchSamples(x: Float32Array, sr: number, rate: number, semis = 0): Promise<Float32Array> {
  const buf = new AudioBuffer({ length: x.length, numberOfChannels: 1, sampleRate: sr })
  buf.getChannelData(0).set(x)
  const r = await render(buf, 0, x.length / sr, semis, false, rate)
  if (!r) throw new Error("The sound couldn't be stretched.")
  return r.getChannelData(0).slice()
}

/** Keep memory in check: the 24 most recent shifted sounds. */
function trim() {
  while (cache.size > 24) cache.delete(cache.keys().next().value as string)
}

const energy = (x: Float32Array) => { let e = 0; for (let i = 0; i < x.length; i += 7) e += x[i] * x[i]; return e }

/** If a render still comes back silent (the engine wasn't ready), it's simply done again, up to 3 times. */
async function render(buf: AudioBuffer, a: number, b: number, semis: number, natural: boolean, rate = 1): Promise<AudioBuffer | null> {
  const want = energy(buf.getChannelData(0).subarray(Math.floor(a * buf.sampleRate), Math.ceil(b * buf.sampleRate))) / rate
  for (let k = 0; k < 3; k++) {
    const r = await renderOnce(buf, a, b, semis, natural, rate)
    if (!r || want === 0 || energy(r.getChannelData(0)) > want * 0.05) return r
  }
  return null
}

async function renderOnce(buf: AudioBuffer, a: number, b: number, semis: number, natural: boolean, rate = 1): Promise<AudioBuffer | null> {
  const sr = buf.sampleRate
  const i0 = Math.max(0, Math.floor(a * sr)), i1 = Math.min(buf.length, Math.ceil(b * sr))
  if (i1 - i0 < 64) return null
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c).slice(i0, i1))
  const len = Math.round((i1 - i0) / rate)
  // the engine looks ahead: start it a little after 0 and cut that lead-in off afterwards
  const lead = 0.25
  const ctx = new OfflineAudioContext(chans.length, len + Math.ceil((lead + 0.3) * sr), sr)
  const node = await SignalsmithStretch(ctx, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [chans.length] })
  await node.addBuffers(chans)
  // wait for the engine to take the plan before rendering: an offline render can otherwise finish before the message lands (silence)
  await node.schedule({ output: lead, active: true, input: 0, rate, semitones: semis, formantCompensation: natural, ...(natural ? { formantBaseHz: 0 } : {}) })
  node.connect(ctx.destination)
  const out = await ctx.startRendering()
  const res = new AudioBuffer({ length: len, numberOfChannels: chans.length, sampleRate: sr })
  const from = Math.round(lead * sr)
  for (let c = 0; c < chans.length; c++) res.getChannelData(c).set(out.getChannelData(c).subarray(from, from + len))
  return res
}
