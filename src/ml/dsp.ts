// Sound maths for the on-phone music models (pure, so tests check it against the models' own Python code):
//   resample   high-quality sample-rate change (windowed sinc, Kaiser window, 32 zero crossings)
//   logMel     Beat This!'s input: torchaudio MelSpectrogram(22050 Hz, n_fft 1024, hop 441 = 50 frames a second,
//              30–11000 Hz, 128 slaney mel bands, no band normalisation, magnitude, "frame_length" normalised),
//              then log(1 + 1000·x). Frames are centred with reflect padding, like torch.stft(center=True).
import { FFT } from '../audio/noteDetect'

/** Bessel I0 (for the Kaiser window). */
function i0(x: number) {
  let s = 1, t = 1
  for (let k = 1; k < 40; k++) { t *= (x / (2 * k)) ** 2; s += t; if (t < 1e-12 * s) break }
  return s
}

/** Resample mono audio from `from` Hz to `to` Hz (band-limited, Kaiser β 8.6, 32 zero crossings each side). */
export function resample(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x.slice()
  const ratio = to / from
  const n = Math.floor(x.length * ratio)
  const out = new Float32Array(n)
  const cutoff = Math.min(1, ratio) * 0.97 // a little under Nyquist
  const zc = 32
  const half = Math.ceil(zc / cutoff)
  const beta = 8.6, ib = i0(beta)
  // a table of the windowed sinc at 512 steps per sample (linear interpolation between steps)
  const RES = 512
  const len = half * RES + 1
  const table = new Float32Array(len + 1)
  for (let i = 0; i <= len; i++) {
    const t = i / RES
    const w = t <= half ? i0(beta * Math.sqrt(1 - (t / half) ** 2)) / ib : 0
    const a = Math.PI * t * cutoff
    table[i] = (t === 0 ? cutoff : (Math.sin(a) / (Math.PI * t))) * w
  }
  for (let j = 0; j < n; j++) {
    const c = j / ratio
    const c0 = Math.floor(c)
    let s = 0
    const lo = Math.max(0, c0 - half + 1), hi = Math.min(x.length - 1, c0 + half)
    for (let k = lo; k <= hi; k++) {
      const p = Math.abs(c - k) * RES
      const i = Math.floor(p)
      if (i >= len) continue
      const f = p - i
      s += x[k] * (table[i] * (1 - f) + table[i + 1] * f)
    }
    out[j] = s
  }
  return out
}

/** Slaney mel scale (like librosa / torchaudio "slaney"). */
const hzToMel = (f: number) => (f < 1000 ? (3 * f) / 200 : 15 + (27 * Math.log(f / 1000)) / Math.log(6.4))
const melToHz = (m: number) => (m < 15 ? (200 * m) / 3 : 1000 * Math.exp((Math.log(6.4) * (m - 15)) / 27))

/** torchaudio.functional.melscale_fbanks(n_freqs, f_min, f_max, n_mels, sr, norm=None, mel_scale='slaney'): [n_freqs][n_mels]. */
export function melBank(nFreqs: number, fMin: number, fMax: number, nMels: number, sr: number): Float32Array[] {
  const freqs = Array.from({ length: nFreqs }, (_, i) => (i * (sr / 2)) / (nFreqs - 1))
  const mMin = hzToMel(fMin), mMax = hzToMel(fMax)
  const pts = Array.from({ length: nMels + 2 }, (_, i) => melToHz(mMin + ((mMax - mMin) * i) / (nMels + 1)))
  const fb: Float32Array[] = Array.from({ length: nFreqs }, () => new Float32Array(nMels))
  for (let m = 0; m < nMels; m++) {
    const lo = pts[m], mid = pts[m + 1], hi = pts[m + 2]
    for (let k = 0; k < nFreqs; k++) {
      const down = (freqs[k] - lo) / (mid - lo), up = (hi - freqs[k]) / (hi - mid)
      fb[k][m] = Math.max(0, Math.min(down, up))
    }
  }
  return fb
}

let MEL: Float32Array[] | null = null
/** Beat This! log-mel spectrogram of 22050 Hz mono audio: frames × 128 (row-major), 50 frames a second. */
export function logMel(x: Float32Array): { data: Float32Array; frames: number } {
  const nFft = 1024, hop = 441, nMels = 128, nFreqs = nFft / 2 + 1
  MEL ??= melBank(nFreqs, 30, 11000, nMels, 22050)
  const fb = MEL
  // periodic Hann (torch.hann_window default); "frame_length" normalisation = torch.stft(normalized=True) = ÷ √n_fft
  const win = new Float32Array(nFft)
  for (let i = 0; i < nFft; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / nFft)
  const norm = 1 / Math.sqrt(nFft)
  const pad = nFft / 2
  const frames = Math.floor(x.length / hop) + 1
  const at = (i: number) => {
    // reflect padding
    let k = i - pad
    if (k < 0) k = -k
    if (k >= x.length) k = 2 * (x.length - 1) - k
    return x[Math.max(0, Math.min(x.length - 1, k))]
  }
  const fft = new FFT(nFft)
  const re = new Float32Array(nFft), im = new Float32Array(nFft)
  const mag = new Float32Array(nFreqs)
  const data = new Float32Array(frames * nMels)
  for (let f = 0; f < frames; f++) {
    const o = f * hop
    for (let i = 0; i < nFft; i++) { re[i] = at(o + i) * win[i]; im[i] = 0 }
    fft.run(re, im)
    for (let k = 0; k < nFreqs; k++) mag[k] = Math.hypot(re[k], im[k]) * norm
    const row = f * nMels
    for (let k = 0; k < nFreqs; k++) {
      const v = mag[k]
      if (!v) continue
      const w = fb[k]
      for (let m = 0; m < nMels; m++) if (w[m]) data[row + m] += v * w[m]
    }
    for (let m = 0; m < nMels; m++) data[row + m] = Math.log1p(1000 * data[row + m])
  }
  return { data, frames }
}
