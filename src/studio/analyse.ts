// What a sample is: its tempo and length in beats (a loop), and its key (from the notes in its sound), so it can be
// stretched to the beat's tempo and moved into the beat's key.
import { FFT } from '../audio/noteDetect'
import { addChroma } from '../audio/chroma'
import { detectKey, type KeyGuess } from '../tabs/keyDetect'
import { loopTempo } from '../audio/tempo'
import { pc } from '../theory/notes'

/** The key of a sound (up to its first 30 s): the best guess and how far ahead of the next it is (0..1). */
export function soundKey(x: Float32Array, sr: number): { key: KeyGuess; sure: number } | null {
  const N = 8192, hop = 4096
  const fft = new FFT(N)
  const win = new Float32Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
  let peak = 0
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]))
  if (peak < 1e-4) return null
  const acc = new Array(12).fill(0)
  const re = new Float32Array(N), im = new Float32Array(N), db = new Float32Array(N / 2)
  const end = Math.min(x.length, sr * 30)
  for (let a = 0; a + N <= end; a += hop) {
    for (let i = 0; i < N; i++) { re[i] = (x[a + i] / peak) * win[i]; im[i] = 0 }
    fft.run(re, im)
    for (let k = 0; k < N / 2; k++) db[k] = 20 * Math.log10((2 * Math.hypot(re[k], im[k])) / N + 1e-12)
    addChroma(db, sr / N, acc)
  }
  if (acc.every(v => v === 0)) return null
  const g = detectKey(acc)
  return { key: g[0], sure: Math.max(0, Math.min(1, (g[0].score - g[1].score) * 5 + (g[0].score - 0.5))) }
}

/** The smallest move (−6…+5 semitones) from one key to another (relative major/minor count as the same key). */
export function keyMove(from: { root: string; minor: boolean }, to: { root: string; minor: boolean }): number {
  // compare as major keys: A minor = C major
  const asMajor = (k: { root: string; minor: boolean }) => (pc(k.root) + (k.minor ? 3 : 0)) % 12
  const d = (((asMajor(to) - asMajor(from)) % 12) + 12) % 12
  return d > 5 ? d - 12 : d
}

export { loopTempo }
