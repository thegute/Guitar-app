// Voice isolation and stems for a clip (Get a sound): any sample rate, mono or stereo in → the voice, everything but the
// voice, and the four stems (drums, bass, other, vocals) at 44.1 kHz stereo. Runs HT-Demucs (demucs.ts) on the phone natively or in the browser.
import { resample } from './dsp'
import { DEMUCS, separate, type Stems } from './demucs'
import { voiceRunner } from './models'

export type VoicePart = 'voice' | 'rest'

export async function isolate(chans: Float32Array[], sr: number, o: { onProgress?: (f: number, note: string) => void; signal?: AbortSignal } = {}): Promise<{ stems: Stems; voice: Float32Array[]; rest: Float32Array[]; sr: number; secs: number; where: string }> {
  const t0 = performance.now()
  const L = resample(chans[0], sr, DEMUCS.sr)
  const R = chans[1] ? resample(chans[1], sr, DEMUCS.sr) : L
  o.onProgress?.(0, 'Starting the voice model…')
  const run = await voiceRunner()
  const segs = Math.max(1, Math.ceil(L.length / Math.floor(0.75 * DEMUCS.seg)))
  let first = 0
  const stems = await separate(L, R, run.run, {
    signal: o.signal,
    onProgress: f => {
      const done = Math.round(f * segs)
      if (done === 1) first = (performance.now() - t0) / 1000
      const left = first ? Math.max(0, Math.round(first * (segs - done))) : 0
      o.onProgress?.(f, f >= 1 ? 'Done.' : left ? `Separating… about ${left} s left` : 'Separating…')
    },
  })
  const [vl, vr] = stems.vocals
  const rl = new Float32Array(L.length), rr = new Float32Array(L.length)
  for (let i = 0; i < L.length; i++) { rl[i] = L[i] - vl[i]; rr[i] = R[i] - vr[i] }
  return { stems, voice: [vl, vr], rest: [rl, rr], sr: DEMUCS.sr, secs: (performance.now() - t0) / 1000, where: run.where }
}
