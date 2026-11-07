// The six-stem HT-Demucs (StemSplitio/htdemucs-6s-onnx, MIT; the STFT is inside the graph): drums, bass, other, vocals, guitar, piano.
// It takes 7.8 s of 44.1 kHz stereo at a time ([1, 2, 343980] "mix" → [1, 6, 2, 343980] "stems"). A long recording is cut into
// chunks that overlap and are cross-faded (the model is least sure at a chunk's edges), each chunk's stems are joined, and
// the stem asked for is returned mono at the recording's own sample rate.
import { resample } from './dsp'

export const STEMS = { sr: 44100, len: 343980, names: ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'] as const }
export type StemName = (typeof STEMS.names)[number]
/** one chunk: mix = [left | right] (2 × len), result = 6 stems × 2 channels × len */
export type StemRun = (mix: Float32Array) => Promise<Float32Array>

const OVERLAP = 44100 * 2 // 2 s cross-fade between chunks

export async function separate(
  x: Float32Array, sr: number, run: StemRun, which: StemName,
  o: { signal?: AbortSignal; onProgress?: (f: number) => void } = {},
): Promise<Float32Array> {
  const idx = STEMS.names.indexOf(which)
  const a = resample(x, sr, STEMS.sr)
  const n = a.length, L = STEMS.len, hop = L - OVERLAP
  const out = new Float32Array(n), wsum = new Float32Array(n)
  const count = Math.max(1, Math.ceil((n - OVERLAP) / hop))
  for (let c = 0; c < count; c++) {
    if (o.signal?.aborted) throw new Error('Cancelled.')
    const s = c * hop
    const mix = new Float32Array(2 * L)
    const seg = a.subarray(s, Math.min(n, s + L))
    mix.set(seg, 0); mix.set(seg, L) // mono → both channels
    const st = await run(mix)
    const base = idx * 2 * L
    const m = Math.min(L, n - s)
    for (let i = 0; i < m; i++) {
      // linear ramps over the overlap, except at the very start and end of the recording
      const up = c === 0 ? 1 : Math.min(1, i / OVERLAP), down = c === count - 1 ? 1 : Math.min(1, (L - i) / OVERLAP)
      const w = Math.max(1e-3, Math.min(up, down))
      out[s + i] += 0.5 * (st[base + i] + st[base + L + i]) * w
      wsum[s + i] += w
    }
    o.onProgress?.((c + 1) / count)
  }
  for (let i = 0; i < n; i++) out[i] /= wsum[i] || 1
  return resample(out, STEMS.sr, sr)
}
