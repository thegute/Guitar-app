// Loops for the beat maker that stay in time with the beat:
//   * on the beat: recording starts exactly on bar 1 and stops itself at the bar line (captured against the audio
//     clock, with the input's delay taken off)
//   * auto-align: the take is nudged (up to ±90 ms) so what you played lines up with the 16th-note grid
//   * free loop: play a loop roughly, stop whenever; it's stretched (without changing pitch) to a whole number of bars
// Takes are levelled to a steady loudness (not just their peak), so quiet playing isn't lost in the mix.
// Pure maths here (no audio context), so it can be tested; stored in IndexedDB per beat.

/** Onset strength every `hop` samples (positive change in energy). */
export function onsetEnvelope(x: Float32Array, sr: number, hopSec = 0.005): Float32Array {
  const hop = Math.max(1, Math.round(sr * hopSec))
  const n = Math.floor(x.length / hop)
  const e = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let k = i * hop; k < (i + 1) * hop; k++) s += x[k] * x[k]
    e[i] = Math.sqrt(s / hop)
  }
  const out = new Float32Array(n)
  for (let i = 1; i < n; i++) out[i] = Math.max(0, e[i] - e[i - 1] * 1.05)
  return out
}

/**
 * How far (seconds) the take should move so its onsets land on the grid: + means it was played late. Looks within
 * ±maxShift; downbeats count most. Returns 0 if there isn't enough to go on.
 */
export function gridOffset(x: Float32Array, sr: number, stepDur: number, maxShift = 0.09): number {
  const hopSec = 0.005
  const env = onsetEnvelope(x, sr, hopSec)
  const total = env.reduce((a, b) => a + b, 0)
  if (total < 1e-3) return 0
  const steps = Math.floor(x.length / sr / stepDur)
  if (steps < 4) return 0
  const range = Math.round(maxShift / hopSec)
  let best = 0, bestScore = -1
  const at = (i: number) => (i >= 0 && i < env.length ? env[i] : 0)
  for (let d = -range; d <= range; d++) {
    let score = 0
    for (let s = 0; s < steps; s++) {
      const w = s % 4 === 0 ? 1.6 : s % 2 === 0 ? 1.2 : 1
      const i = Math.round((s * stepDur) / hopSec) + d
      score += w * Math.max(at(i - 1), at(i), at(i + 1))
    }
    // prefer small moves when it's close
    score *= 1 - Math.abs(d) / (range * 8)
    if (score > bestScore) { bestScore = score; best = d }
  }
  return best * hopSec
}

/** Move a loop earlier (positive shift) or later, wrapping round: it's a loop. */
export function rotate(x: Float32Array, shiftSamples: number): Float32Array {
  const n = x.length
  const out = new Float32Array(n)
  const k = ((Math.round(shiftSamples) % n) + n) % n
  for (let i = 0; i < n; i++) out[i] = x[(i + k) % n]
  return out
}

/**
 * Change a recording's length without changing its pitch (WSOLA: overlapping windows, each placed where it best
 * continues the last one).
 */
export function stretch(x: Float32Array, targetLen: number, sr: number): Float32Array {
  if (targetLen === x.length || x.length < 4096) {
    const out = new Float32Array(targetLen)
    out.set(x.subarray(0, Math.min(targetLen, x.length)))
    return out
  }
  const win = Math.round(sr * 0.046) & ~1
  const hopOut = win >> 2
  const ratio = targetLen / x.length
  const hopIn = hopOut / ratio
  const tol = Math.round(sr * 0.012)
  const w = new Float32Array(win)
  for (let i = 0; i < win; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / win)
  const out = new Float32Array(targetLen + win)
  const norm = new Float32Array(targetLen + win)
  let prevPos = 0
  for (let k = 0; k * hopOut < targetLen; k++) {
    const ideal = Math.round(k * hopIn)
    let pos = ideal
    if (k > 0) {
      // the natural continuation of the last frame, compared with candidates near the ideal spot
      const nat = prevPos + hopOut
      let best = -Infinity
      for (let d = -tol; d <= tol; d += 2) {
        const p = ideal + d
        if (p < 0 || p + win >= x.length) continue
        let c = 0
        for (let i = 0; i < win; i += 4) c += x[p + i] * (x[nat + i] ?? 0)
        if (c > best) { best = c; pos = p }
      }
    }
    pos = Math.max(0, Math.min(x.length - win - 1, pos))
    const o = k * hopOut
    for (let i = 0; i < win && o + i < out.length; i++) { out[o + i] += x[pos + i] * w[i]; norm[o + i] += w[i] }
    prevPos = pos
  }
  const res = new Float32Array(targetLen)
  for (let i = 0; i < targetLen; i++) res[i] = norm[i] > 1e-3 ? out[i] / norm[i] : 0
  return res
}

/**
 * A free take → whole bars at this tempo (1, 2, 4 or 8). Only a small change is made by stretching (up to 12%, which you
 * can't hear); anything bigger keeps the take at its own speed and trims or pads it to the bars instead. (Squeezing a
 * 6-bar take into 4 bars made it play back far too fast.)
 */
export function fitToBars(x: Float32Array, sr: number, barDur: number): { samples: Float32Array; bars: number; ratio: number; how: 'stretch' | 'trim' } {
  const secs = x.length / sr
  const closest = [1, 2, 4, 8].reduce((a, b) => (Math.abs(Math.log((b * barDur) / secs)) < Math.abs(Math.log((a * barDur) / secs)) ? b : a))
  const target = Math.round(closest * barDur * sr)
  const ratio = target / x.length
  if (Math.abs(ratio - 1) <= 0.12) return { samples: stretch(x, target, sr), bars: closest, ratio, how: 'stretch' }
  // too far: the bar count that fits without speeding up, at most 8 bars; trim or pad
  const bars = [1, 2, 4, 8].find(b => b * barDur >= secs * 0.97) ?? 8
  const len = Math.round(bars * barDur * sr)
  const out = new Float32Array(len)
  out.set(x.subarray(0, Math.min(len, x.length)))
  return { samples: out, bars, ratio: len / x.length, how: 'trim' }
}

/** Level a take: about −18 dBFS loudness over the parts you played, peaks kept under control, tiny edge fades. */
export function levelLoop(x: Float32Array, sr: number): Float32Array {
  const blk = Math.round(sr * 0.05)
  const rms: number[] = []
  for (let i = 0; i + blk <= x.length; i += blk) {
    let s = 0
    for (let k = i; k < i + blk; k++) s += x[k] * x[k]
    rms.push(Math.sqrt(s / blk))
  }
  const loud = rms.filter(r => r > 0.002).sort((a, b) => a - b)
  const level = loud.length ? loud[Math.floor(loud.length * 0.6)] : 0
  const gain = level > 0 ? Math.min(30, 0.126 / level) : 1
  const out = new Float32Array(x.length)
  const fade = Math.min(Math.round(sr * 0.004), x.length >> 2)
  for (let i = 0; i < x.length; i++) {
    let v = x[i] * gain
    // soft limit instead of clipping
    if (Math.abs(v) > 0.7) v = Math.sign(v) * (0.7 + 0.25 * Math.tanh((Math.abs(v) - 0.7) / 0.25))
    if (i < fade) v *= i / fade
    else if (i > x.length - fade) v *= (x.length - i) / fade
    out[i] = v
  }
  return out
}

// ---- storage (IndexedDB): each take with its beat's name
export interface StoredLoop { id: string; beat: string; sr: number; data: Float32Array; vol: number; mute?: boolean; bars: number; at: number }
const DB = 'kg-loops', STORE = 'loops'
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: 'id' }) }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((res, rej) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
export const saveLoop = (l: StoredLoop) => tx('readwrite', s => s.put(l))
export const deleteLoop = (id: string) => tx('readwrite', s => s.delete(id))
export async function loopsFor(beat: string): Promise<StoredLoop[]> {
  try {
    const all = await tx<StoredLoop[]>('readonly', s => s.getAll() as IDBRequest<StoredLoop[]>)
    return all.filter(l => l.beat === beat).sort((a, b) => a.at - b.at)
  } catch { return [] }
}
