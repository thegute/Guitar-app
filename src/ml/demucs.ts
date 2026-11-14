// Voice isolation with HT-Demucs v4 (Meta, MIT): the network itself runs in ONNX Runtime (only its inner fwd(x, xt)
// part is in the ONNX file); everything around it is here, written to match demucs 4.0.1 exactly:
//   apply_model    7.8 s segments, 25 % overlap, triangle weights, the last segment centred with real context
//   _spec          reflect pad (1536 | 1536 + rest), STFT n_fft 4096 hop 1024 Hann, normalized, centre, last bin and
//                  2 frames each side dropped → [4, 2048, 336] as L.re L.im R.re R.im
//   normalise      x and xt each by their own mean and (unbiased) std, + 1e-5
//   _mask/_ispec   the network's spectrogram back to complex, one empty bin + 2 frames each side, iSTFT, trimmed
//   sum            time branch + frequency branch per source; sources: drums, bass, other, vocals
// Whole clips are normalised first (as demucs' own separate does). Only the vocals are rebuilt (half the work);
// "everything else" is the mix minus the vocals.
export const DEMUCS = { sr: 44100, seg: 343980, nfft: 4096, hop: 1024, bins: 2048, frames: 336, sources: ['drums', 'bass', 'other', 'vocals'] as const }
const N = DEMUCS.nfft, HOP = DEMUCS.hop, F = DEMUCS.bins, T = DEMUCS.frames, SEG = DEMUCS.seg

// ---------- a double-precision FFT (4096) ----------
class FFT64 {
  private c: Float64Array
  private s: Float64Array
  private rev: Uint32Array
  constructor(readonly n: number) {
    this.c = new Float64Array(n / 2); this.s = new Float64Array(n / 2)
    for (let i = 0; i < n / 2; i++) { this.c[i] = Math.cos((2 * Math.PI * i) / n); this.s[i] = -Math.sin((2 * Math.PI * i) / n) }
    this.rev = new Uint32Array(n)
    const bits = Math.log2(n)
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1); this.rev[i] = r }
  }
  /** forward DFT in place (inverse: pass im negated and negate the result's im) */
  run(re: Float64Array, im: Float64Array) {
    const n = this.n
    for (let i = 0; i < n; i++) { const j = this.rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size
      for (let i = 0; i < n; i += size) for (let j = 0, k = 0; j < half; j++, k += step) {
        const a = i + j, b = a + half
        const tr = re[b] * this.c[k] - im[b] * this.s[k], ti = re[b] * this.s[k] + im[b] * this.c[k]
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti
      }
    }
  }
}
let fft: FFT64 | null = null
let win: Float64Array | null = null
function tools() {
  fft ??= new FFT64(N)
  if (!win) { win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N) } // torch.hann_window: periodic
  return { fft, win }
}

/** torch's reflect padding (no repeat of the edge sample). */
function reflectPad(x: Float32Array | Float64Array, left: number, right: number): Float64Array {
  const L = x.length, out = new Float64Array(L + left + right)
  const at = (i: number) => { let k = i; while (k < 0 || k >= L) k = k < 0 ? -k : 2 * (L - 1) - k; return x[k] }
  for (let i = 0; i < out.length; i++) out[i] = at(i - left)
  return out
}

/** torch.stft(n_fft 4096, hop 1024, Hann, normalized, center, reflect) of one channel: all 2049 bins, bins major. */
export function stft(x: Float32Array | Float64Array): { re: Float32Array; im: Float32Array; frames: number; bins: number } {
  const { fft: f, win: w } = tools()
  const xc = reflectPad(x, N / 2, N / 2)
  const frames = 1 + Math.floor((xc.length - N) / HOP)
  const B = N / 2 + 1
  const re = new Float32Array(B * frames), im = new Float32Array(B * frames)
  const fr = new Float64Array(N), fi = new Float64Array(N)
  const norm = 1 / Math.sqrt(N)
  for (let t = 0; t < frames; t++) {
    const o = t * HOP
    for (let i = 0; i < N; i++) { fr[i] = xc[o + i] * w[i]; fi[i] = 0 }
    f.run(fr, fi)
    for (let b = 0; b < B; b++) { re[b * frames + t] = fr[b] * norm; im[b * frames + t] = fi[b] * norm }
  }
  return { re, im, frames, bins: B }
}

/** HTDemucs._spec for one channel: [F bins × le frames] complex (re, im), bins major. */
export function spec(x: Float32Array): { re: Float32Array; im: Float32Array } {
  const le = Math.ceil(x.length / HOP)
  const pad = (HOP / 2) * 3
  const full = stft(reflectPad(x, pad, pad + le * HOP - x.length)) // le + 4 frames
  const re = new Float32Array(F * le), im = new Float32Array(F * le)
  for (let b = 0; b < F; b++) for (let t = 0; t < le; t++) { re[b * le + t] = full.re[b * full.frames + t + 2]; im[b * le + t] = full.im[b * full.frames + t + 2] }
  return { re, im }
}

/** HTDemucs._ispec for one channel (bins major, `le` frames) → `length` samples. */
export function ispec(re: Float32Array, im: Float32Array, le: number, length: number): Float32Array {
  const { fft: f, win: w } = tools()
  const pad = (HOP / 2) * 3
  const outLen = HOP * Math.ceil(length / HOP) + 2 * pad
  const frames = le + 4
  // istft(center=True, length=outLen): overlap-add over a signal n_fft/2 longer each side, then trimmed
  const full = (frames - 1) * HOP + N
  const y = new Float64Array(full), env = new Float64Array(full)
  const fr = new Float64Array(N), fi = new Float64Array(N)
  const scale = Math.sqrt(N) / N
  for (let t = 0; t < frames; t++) {
    const k = t - 2
    fr.fill(0); fi.fill(0)
    if (k >= 0 && k < le) {
      // one-sided → full spectrum (the top bin, F, stays 0: it was padded with zeros)
      for (let b = 0; b < F; b++) { fr[b] = re[b * le + k]; fi[b] = im[b * le + k] }
      fi[0] = 0
      for (let b = 1; b < F; b++) { fr[N - b] = fr[b]; fi[N - b] = -fi[b] }
    }
    // inverse via the forward transform of the conjugate
    for (let i = 0; i < N; i++) fi[i] = -fi[i]
    f.run(fr, fi)
    const o = t * HOP
    for (let i = 0; i < N; i++) { y[o + i] += fr[i] * scale * w[i]; env[o + i] += w[i] * w[i] }
  }
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const j = N / 2 + pad + i
    out[i] = j < full && env[j] > 1e-11 ? y[j] / env[j] : 0
  }
  void outLen
  return out
}

/** mean and unbiased std (torch's default) */
function stats(a: Float32Array): { mean: number; std: number } {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]
  const mean = s / a.length
  let v = 0
  for (let i = 0; i < a.length; i++) { const d = a[i] - mean; v += d * d }
  return { mean, std: Math.sqrt(v / (a.length - 1)) }
}

export interface Prepped { x: Float32Array; xt: Float32Array; mean: number; std: number; meant: number; stdt: number; z: { re: Float32Array; im: Float32Array }[] }
/** One 7.8 s stereo segment → the network's two inputs (and what's needed to undo them). */
export function prep(l: Float32Array, r: Float32Array): Prepped {
  const z = [spec(l), spec(r)]
  const mag = new Float32Array(4 * F * T)
  for (let c = 0; c < 2; c++) { mag.set(z[c].re, (2 * c) * F * T); mag.set(z[c].im, (2 * c + 1) * F * T) }
  const { mean, std } = stats(mag)
  for (let i = 0; i < mag.length; i++) mag[i] = (mag[i] - mean) / (1e-5 + std)
  const xt = new Float32Array(2 * SEG)
  xt.set(l, 0); xt.set(r, SEG)
  const st = stats(xt)
  for (let i = 0; i < xt.length; i++) xt[i] = (xt[i] - st.mean) / (1e-5 + st.std)
  return { x: mag, xt, mean, std, meant: st.mean, stdt: st.std, z }
}

/**
 * The network's outputs → one source's stereo sound. `xOut` = [16 or 4 (one source), F, T], `xtOut` = [8 or 2, SEG];
 * `src` = which source is in them (when they hold all four).
 */
export function post(xOut: Float32Array, xtOut: Float32Array, p: Prepped, src = 3): [Float32Array, Float32Array] {
  const all = xOut.length === 16 * F * T
  const xo = all ? src * 4 * F * T : 0
  const to = all ? src * 2 * SEG : 0
  const out: Float32Array[] = []
  for (let c = 0; c < 2; c++) {
    // CAC: channel pairs (re, im) per audio channel; the network's output is a mask-free complex spectrogram
    const re = new Float32Array(F * T), im = new Float32Array(F * T)
    const a = xo + 2 * c * F * T, b = xo + (2 * c + 1) * F * T
    for (let i = 0; i < F * T; i++) { re[i] = xOut[a + i] * p.std + p.mean; im[i] = xOut[b + i] * p.std + p.mean }
    const freq = ispec(re, im, T, SEG)
    const o = new Float32Array(SEG)
    for (let i = 0; i < SEG; i++) o[i] = freq[i] + (xtOut[to + c * SEG + i] * p.stdt + p.meant)
    out.push(o)
  }
  return [out[0], out[1]]
}

export type Runner = (x: Float32Array, xt: Float32Array) => Promise<{ x: Float32Array; xt: Float32Array }>
export type Stem = (typeof DEMUCS.sources)[number]
export type Stems = Record<Stem, [Float32Array, Float32Array]>

/**
 * A whole clip (44.1 kHz stereo) → its four stems (drums, bass, other, vocals), the way demucs' apply_model does it.
 * `run` gives the network's outputs for all four sources ([16, F, T] and [8, SEG]).
 */
export async function separate(l: Float32Array, r: Float32Array, run: Runner, o: { onProgress?: (f: number) => void; signal?: AbortSignal } = {}): Promise<Stems> {
  const length = l.length
  // separate.py: the clip normalised by its mono mix
  const mono = new Float32Array(length)
  for (let i = 0; i < length; i++) mono[i] = (l[i] + r[i]) / 2
  const { mean: rm, std: rs0 } = stats(mono)
  const rs = rs0 > 1e-8 ? rs0 : 1
  const L = new Float32Array(length), R = new Float32Array(length)
  for (let i = 0; i < length; i++) { L[i] = (l[i] - rm) / rs; R[i] = (r[i] - rm) / rs }
  const outs = DEMUCS.sources.map(() => [new Float32Array(length), new Float32Array(length)] as [Float32Array, Float32Array])
  const sum = new Float32Array(length)
  const stride = Math.floor(0.75 * SEG)
  const weight = new Float32Array(SEG)
  const half = SEG >> 1
  for (let i = 0; i < SEG; i++) weight[i] = (i < half ? i + 1 : SEG - i) / half
  const offsets: number[] = []
  for (let off = 0; off < length; off += stride) offsets.push(off)
  for (let k = 0; k < offsets.length; k++) {
    if (o.signal?.aborted) throw new Error('Cancelled.')
    const off = offsets[k]
    const chunkLen = Math.min(SEG, length - off)
    // TensorChunk.padded: a short last piece is centred in the segment with the real sound around it
    const start = off - ((SEG - chunkLen) >> 1)
    const sl = new Float32Array(SEG), sr = new Float32Array(SEG)
    for (let i = 0; i < SEG; i++) { const j = start + i; if (j >= 0 && j < length) { sl[i] = L[j]; sr[i] = R[j] } }
    const p = prep(sl, sr)
    const res = await run(p.x, p.xt)
    const trim = (SEG - chunkLen) >> 1
    for (let s = 0; s < DEMUCS.sources.length; s++) {
      const [vl, vr] = post(res.x, res.xt, p, s)
      for (let i = 0; i < chunkLen; i++) { const w = weight[i]; outs[s][0][off + i] += w * vl[trim + i]; outs[s][1][off + i] += w * vr[trim + i] }
    }
    for (let i = 0; i < chunkLen; i++) sum[off + i] += weight[i]
    o.onProgress?.((k + 1) / offsets.length)
  }
  for (const [a, b] of outs) for (let i = 0; i < length; i++) { const s = sum[i] || 1; a[i] = (a[i] / s) * rs + rm; b[i] = (b[i] / s) * rs + rm }
  return Object.fromEntries(DEMUCS.sources.map((n, s) => [n, outs[s]])) as Stems
}

/** Just the vocals (kept for the bench). */
export async function vocals(l: Float32Array, r: Float32Array, run: Runner, o: { onProgress?: (f: number) => void; signal?: AbortSignal } = {}): Promise<[Float32Array, Float32Array]> {
  return (await separate(l, r, run, o)).vocals
}

/** The guitar part ("other": in a guitar band that's the guitars and keys) and the backing without it (drums + bass +
 *  vocals), for playing along to a recording minus its guitar. */
export function guitarAndBacking(st: Stems): { guitar: [Float32Array, Float32Array]; backing: [Float32Array, Float32Array] } {
  const n = st.other[0].length
  const backing: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)]
  for (const k of ['drums', 'bass', 'vocals'] as const) for (let c = 0; c < 2; c++) { const a = st[k][c], b = backing[c]; for (let i = 0; i < n; i++) b[i] += a[i] }
  return { guitar: st.other, backing }
}
