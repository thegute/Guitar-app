// What the on-phone models' raw outputs mean (pure; checked against the models' own Python code in the tests).
//
// Guitar notes (Riley et al. GAPS, a Kong et al. high-resolution transcription model): 16 kHz audio in 10-second
// chunks, out 1001 frames (100 a second) × 88 keys (A0…C8) of onset / offset / frame / velocity. Chunks overlap; each
// keeps its middle. Notes: an onset is a local peak above 0.3 rising/falling for 2 frames, placed to a fraction of a
// frame from its neighbours; it lasts until the frame output drops to 0.1 or an offset peak (Kong's rules).
//
// Beats (Beat This!): log-mel chunks of 1500 frames with 6-frame borders, out beat / downbeat logits per frame;
// a beat is a local maximum within ±3 frames above 0 (probability 0.5), neighbours merged, each downbeat moved to
// the nearest beat. The tempo is the slope of the beats in time; beats per bar from the downbeats.

export const NOTE = { sr: 16000, chunk: 160000, fps: 100, frames: 1001, keys: 88, firstMidi: 21 }
/** each chunk moves 8 s on (keeps 1 s either side for context: measured as accurate as the 50% overlap, a third less work) */
export const NOTE_STEP = 128000

export interface NoteOut { onset: Float32Array; offset: Float32Array; frame: Float32Array; velocity: Float32Array }
export interface Note { start: number; end: number; midi: number; velocity: number }

/** Where each chunk starts (samples) for audio of length n. */
export function noteChunks(n: number): number[] {
  const count = Math.max(1, Math.ceil((n - NOTE.chunk) / NOTE_STEP) + 1)
  return Array.from({ length: count }, (_, i) => i * NOTE_STEP)
}

/** Join the chunks' outputs (frames × 88 each, the last frame dropped) into one, keeping each chunk's middle. */
export function joinNoteChunks(outs: NoteOut[], totalFrames: number): NoteOut {
  const K = NOTE.keys, n = NOTE.frames - 1, st = NOTE_STEP / 160, b = (n - st) / 2
  const join = (key: keyof NoteOut) => {
    const out = new Float32Array(totalFrames * K)
    let w = 0
    outs.forEach((o, i) => {
      const from = i === 0 ? 0 : b, to = i === outs.length - 1 ? n : n - b
      for (let f = from; f < to && w < totalFrames; f++, w++) out.set(o[key].subarray(f * K, (f + 1) * K), w * K)
    })
    return out
  }
  return { onset: join('onset'), offset: join('offset'), frame: join('frame'), velocity: join('velocity') }
}

/** Peaks above `thr` that rise for `nb` frames before and fall for `nb` after, with the sub-frame shift. */
function peaks(x: Float32Array, frames: number, k: number, thr: number, nb: number): Map<number, number> {
  const K = NOTE.keys
  const v = (n: number) => x[n * K + k]
  const out = new Map<number, number>()
  for (let n = nb; n < frames - nb; n++) {
    const c = v(n)
    if (c <= thr) continue
    let mono = true
    for (let i = 0; i < nb; i++) if (v(n - i) < v(n - i - 1) || v(n + i) < v(n + i + 1)) { mono = false; break }
    if (!mono) continue
    const a = v(n - 1), b = v(n + 1)
    out.set(n, a > b ? (b - a) / (c - b) / 2 : (b - a) / (c - a) / 2)
  }
  return out
}

/** Notes from the joined outputs (Kong's note detection: onset, then frame drop-out or offset). */
export function notesFrom(o: NoteOut, frames: number, thr = { onset: 0.3, offset: 0.3, frame: 0.1 }): Note[] {
  const K = NOTE.keys
  const notes: Note[] = []
  for (let k = 0; k < K; k++) {
    const on = peaks(o.onset, frames, k, thr.onset, 2)
    if (!on.size) continue
    const off = peaks(o.offset, frames, k, thr.offset, 4)
    let bgn: number | null = null, gone: number | null = null, offAt: number | null = null
    const add = (fin: number, offShift: number) => {
      const b = bgn!
      notes.push({ start: (b + (on.get(b) ?? 0)) / NOTE.fps, end: (fin + offShift) / NOTE.fps, midi: k + NOTE.firstMidi, velocity: o.velocity[b * K + k] })
      bgn = gone = offAt = null
    }
    for (let i = 0; i < frames; i++) {
      if (on.has(i)) {
        if (bgn !== null) { const b = bgn; add(Math.max(i - 1, 0), 0); void b }
        bgn = i
      }
      if (bgn !== null && i > bgn) {
        if (o.frame[i * K + k] <= thr.frame && gone === null) gone = i
        if (off.has(i) && offAt === null) offAt = i
        if (gone !== null) {
          const fin = offAt !== null && offAt - bgn > gone - offAt ? offAt : gone
          add(fin, off.get(fin) ?? 0)
        } else if (i - bgn >= 600 || i === frames - 1) add(i, off.get(i) ?? 0)
      }
    }
  }
  return notes.sort((a, b) => a.start - b.start || a.midi - b.midi)
}

// ---------------- beats ----------------

export const BEAT = { fps: 50, chunk: 1500, border: 6, mels: 128 }

/** Where each spectrogram chunk starts (can be negative: zero-padded), like beat_this split_piece(avoid_short_end). */
export function beatChunks(frames: number): number[] {
  const { chunk, border } = BEAT
  const starts: number[] = []
  for (let s = -border; s < frames - border; s += chunk - 2 * border) starts.push(s)
  if (frames > chunk - 2 * border) starts[starts.length - 1] = frames - (chunk - border)
  return starts
}
/** The chunk at `start` (zero-padded where it runs off either end), frames × 128. */
export function beatChunk(spect: Float32Array, frames: number, start: number): { data: Float32Array; frames: number } {
  const { chunk, border, mels } = BEAT
  const left = Math.max(0, -start), right = Math.max(0, Math.min(border, start + chunk - frames))
  const from = Math.max(start, 0), to = Math.min(start + chunk, frames)
  const n = left + (to - from) + right
  const data = new Float32Array(n * mels)
  data.set(spect.subarray(from * mels, to * mels), left * mels)
  return { data, frames: n }
}
/** Join chunk predictions (keep_first: an earlier chunk wins where they overlap). */
export function joinBeatChunks(preds: { beat: Float32Array; downbeat: Float32Array }[], starts: number[], frames: number) {
  const { chunk, border } = BEAT
  const beat = new Float32Array(frames).fill(-1000), downbeat = new Float32Array(frames).fill(-1000)
  for (let i = preds.length - 1; i >= 0; i--) {
    const s = starts[i], p = preds[i]
    for (let f = s + border, j = border; f < s + chunk - border && j < p.beat.length - border; f++, j++) {
      if (f < 0 || f >= frames) continue
      beat[f] = p.beat[j]; downbeat[f] = p.downbeat[j]
    }
  }
  return { beat, downbeat }
}

function dedup(ps: number[], width = 1): number[] {
  if (!ps.length) return []
  const out: number[] = []
  let p = ps[0], c = 1
  for (const q of ps.slice(1)) {
    if (q - p <= width) { c++; p += (q - p) / c } else { out.push(p); p = q; c = 1 }
  }
  out.push(p)
  return out
}
function framePeaks(x: Float32Array): number[] {
  const out: number[] = []
  for (let i = 0; i < x.length; i++) {
    if (x[i] <= 0) continue
    let mx = -Infinity
    for (let j = Math.max(0, i - 3); j <= Math.min(x.length - 1, i + 3); j++) if (x[j] > mx) mx = x[j]
    if (x[i] === mx) out.push(i)
  }
  return out
}
/** Beat and downbeat times (seconds) from the logits (beat_this "minimal" postprocessing). */
export function beatsFrom(beat: Float32Array, downbeat: Float32Array): { beats: number[]; downbeats: number[] } {
  const beats = dedup(framePeaks(beat)).map(f => f / BEAT.fps)
  let downs = dedup(framePeaks(downbeat)).map(f => f / BEAT.fps)
  if (beats.length) downs = [...new Set(downs.map(d => beats.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a))))].sort((a, b) => a - b)
  return { beats, downbeats: downs }
}

export interface BeatGrid { bpm: number; beatsPerBar: number; firstDownbeat: number; beats: number[]; downbeats: number[]; steady: number }

/**
 * The tempo (the best straight line through the beats, so it's exact to a tenth of a BPM, not to the 20 ms frames),
 * beats per bar (the usual gap between downbeats) and how steady the beat was (0..1).
 */
export function gridFrom(beats: number[], downbeats: number[]): BeatGrid | null {
  if (beats.length < 4) return null
  const gaps = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b)
  const med = gaps[Math.floor(gaps.length / 2)]
  // fit beat index → time over the longest stretch with no missing or extra beats
  let best: number[] = [], run: number[] = [beats[0]]
  for (let i = 1; i < beats.length; i++) {
    const g = beats[i] - beats[i - 1]
    if (Math.abs(g / med - 1) < 0.25) run.push(beats[i])
    else { if (run.length > best.length) best = run; run = [beats[i]] }
  }
  if (run.length > best.length) best = run
  let spb = med
  if (best.length >= 4) {
    const n = best.length, mx = (n - 1) / 2, my = best.reduce((a, b) => a + b, 0) / n
    let sxy = 0, sxx = 0
    best.forEach((t, i) => { sxy += (i - mx) * (t - my); sxx += (i - mx) ** 2 })
    spb = sxy / sxx
  }
  const steady = gaps.filter(g => Math.abs(g / med - 1) < 0.1).length / gaps.length
  let beatsPerBar = 4
  if (downbeats.length >= 3) {
    const per = downbeats.slice(1).map((d, i) => Math.round((d - downbeats[i]) / spb)).filter(x => x >= 2 && x <= 12)
    const count = new Map<number, number>()
    for (const p of per) count.set(p, (count.get(p) ?? 0) + 1)
    const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top) beatsPerBar = top[0]
  }
  return { bpm: Math.round((600 / spb)) / 10, beatsPerBar, firstDownbeat: downbeats[0] ?? beats[0], beats, downbeats, steady }
}
