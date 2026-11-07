// Between the looper and the rest of the app: chop a loop onto the beat maker's pads, record the whole mix (beat +
// loops + the effects pad) onto a pad, an empty track or My recordings, and send a loop to the Riff Scanner.
import { audio } from '../audio/engine'
import { TapRecorder, encodeWav } from '../audio/tap'
import { keepRecording } from '../audio/recordings'
import { loadBeat, newId } from '../studio/beat'
import { BANKS, detectRoot, padName, sliceAtOnsets, type BankId } from '../studio/pads'
import { saveSample } from '../studio/padSamples'
import { setPendingSound } from '../scan/pending'
import { openJam } from '../nav'
import { equalSlices } from './logic'
import { ROLES, station } from './station'

const MAX_PAD_SECS = 30

/** The bank with the most free pads (B first when they're even: A usually has your own sounds). */
function roomiest(): BankId {
  const b = loadBeat()
  const free = (k: BankId) => BANKS[k].filter(p => !b.pads?.[p]).length
  return free('B') >= free('A') ? 'B' : 'A'
}

/**
 * Chop track i onto pads: at each note you picked, or into equal pieces on the beat. The slices go on one bank, in a
 * choke group (each one cuts the last off, like a real string), ready to finger-drum or pitch with the dial.
 */
export async function chopToPads(i: number, how: 'hits' | 'beats'): Promise<string> {
  const st = station()
  const snd = st.soundOf(i)
  if (!snd) return 'Record something on this track first.'
  const { x, sr, bars } = snd
  const secs = x.length / sr
  const pieces = how === 'hits' ? sliceAtOnsets(x, sr, 16) : equalSlices(secs, Math.min(16, Math.max(2, Math.round(bars * 4 > 16 ? 16 : bars * 4))))
  if (!pieces.length) return 'No clear notes in it to cut at: try "On the beat".'
  const id = newId()
  await saveSample(id, x.slice(), sr)
  const bank = roomiest()
  const label = ROLES.find(r => r.role === st.s.tracks[i].role)?.label ?? `Track ${i + 1}`
  const defs = pieces.slice(0, 16).map((p, k) => {
    const piece = x.subarray(Math.round(p.start * sr), Math.round(p.end * sr))
    return [BANKS[bank][k], { src: 'rec' as const, sample: id, start: p.start, end: p.end, root: detectRoot(piece, sr) ?? undefined, name: `${label} ${k + 1}`, choke: 1, mode: 'oneshot' as const }] as const
  })
  const b = loadBeat()
  st.useBeat({ ...b, pads: { ...b.pads, ...Object.fromEntries(defs) } })
  return `${defs.length} slice${defs.length > 1 ? 's' : ''} of track ${i + 1} on pads ${padName(defs[0][0])} to ${padName(defs[defs.length - 1][0])} (Beat maker → Your pads, bank ${bank}).`
}

/** Record what you hear (beat + loops + effects) for the longest loop, from the next bar line. */
export async function recordMix(onWait?: (secsLeft: number) => void): Promise<{ l: Float32Array; r: Float32Array; sr: number; bars: number; startBar: number }> {
  const st = station()
  const t = st.transport
  if (!t.playing) st.start(0)
  const tap = new TapRecorder()
  await tap.start(t.fx.output)
  try {
    const ctx = audio()
    const startBar = Math.max(0, Math.ceil(st.barNow() + 0.02))
    const bars = st.longest()
    const start = t.t0 + startBar * t.barDur
    const dur = bars * t.barDur
    const tick = setInterval(() => onWait?.(Math.max(0, start + dur - ctx.currentTime)), 200)
    try {
      const { l, r } = await tap.capture(start, dur)
      return { l, r, sr: ctx.sampleRate, bars, startBar }
    } finally { clearInterval(tick) }
  } finally { tap.stop() }
}

/** The mix onto one of Your pads (resample). */
export async function resampleToPad(onWait?: (s: number) => void): Promise<string> {
  const m = await recordMix(onWait)
  const mono = new Float32Array(m.l.length)
  for (let k = 0; k < mono.length; k++) mono[k] = (m.l[k] + m.r[k]) * 0.5
  if (mono.length / m.sr > MAX_PAD_SECS) return `That's ${Math.round(mono.length / m.sr)} s: a pad holds up to ${MAX_PAD_SECS} s. Use "onto an empty track" instead.`
  const b = loadBeat()
  const bank = roomiest()
  const pad = BANKS[bank].find(p => !b.pads?.[p]) ?? BANKS[bank][BANKS[bank].length - 1]
  const id = newId()
  await saveSample(id, mono, m.sr)
  station().useBeat({ ...b, pads: { ...b.pads, [pad]: { src: 'rec', sample: id, start: 0, end: mono.length / m.sr, name: 'Resample', mode: 'oneshot' } } })
  return `The whole mix is on pad ${padName(pad)} (Beat maker → Your pads).`
}

/** The mix onto an empty looper track; the tracks it came from are muted (unmute them any time). */
export async function resampleToTrack(onWait?: (s: number) => void): Promise<string> {
  const st = station()
  const empty = [0, 1, 2, 3].find(i => !st.loopOf(i))
  if (empty === undefined) return 'No empty track: clear one first.'
  const m = await recordMix(onWait)
  const mono = new Float32Array(m.l.length)
  for (let k = 0; k < mono.length; k++) mono[k] = (m.l[k] + m.r[k]) * 0.5
  const was = [0, 1, 2, 3].filter(i => i !== empty && st.loopOf(i))
  await st.putOn(empty, mono, m.bars, m.startBar)
  for (const i of was) st.setTrack(i, { mute: true })
  st.set({ beatOn: false })
  return `Everything is now on track ${empty + 1}; the other tracks and the beat are muted (turn them back on any time).`
}

/** The mix as a WAV in My recordings. */
export async function saveMix(onWait?: (s: number) => void): Promise<string> {
  const m = await recordMix(onWait)
  const blob = encodeWav([m.l, m.r], m.sr)
  const d = new Date()
  await keepRecording(blob, `Looper ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, m.l.length / m.sr)
  return 'Saved in My recordings (Learn → Explore → My recordings), where you can play it, name it and share it.'
}

/** Send track i to the Riff Scanner (Notes from a recording) to become a tab. */
export function toScanner(i: number) {
  const st = station()
  // as you played it (the bass octave, backwards and half speed are only for listening)
  const snd = st.rawOf(i)
  if (!snd) return false
  setPendingSound({ x: snd.x.slice(), sr: snd.sr, title: `Looper track ${i + 1}` })
  openJam('find')
  return true
}
