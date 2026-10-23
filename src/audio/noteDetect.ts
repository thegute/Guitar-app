// Note detection for the follow-along, working on every sample (not snapshots):
//  1. Pick attacks are found with spectral flux (a sudden burst of new sound across the spectrum), so a note picked
//     again while it still rings, or a soft pick, still counts.
//  2. Shortly after each attack the sound is checked for the notes the tab wants next: their whole harmonic series
//     (fundamental + overtones) has to stand out clearly from the neighbouring notes. That holds up with distortion,
//     room noise, other strings ringing on and a weak low fundamental on a phone mic.
//  3. Without an attack (hammer-on, pull-off, slide) a steady change of pitch counts too.
// Pure code (no Web Audio) so it runs live from an AudioWorklet and offline in tests.

/** In-place radix-2 FFT. */
export class FFT {
  readonly n: number
  private cos: Float32Array
  private sin: Float32Array
  private rev: Uint32Array
  constructor(n: number) {
    this.n = n
    this.cos = new Float32Array(n / 2)
    this.sin = new Float32Array(n / 2)
    for (let i = 0; i < n / 2; i++) { this.cos[i] = Math.cos((2 * Math.PI * i) / n); this.sin[i] = -Math.sin((2 * Math.PI * i) / n) }
    this.rev = new Uint32Array(n)
    const bits = Math.log2(n)
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1); this.rev[i] = r }
  }
  /** re/im in, transformed in place */
  run(re: Float32Array, im: Float32Array) {
    const n = this.n
    for (let i = 0; i < n; i++) { const j = this.rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = i + j, b = a + half
          const tr = re[b] * this.cos[k] - im[b] * this.sin[k]
          const ti = re[b] * this.sin[k] + im[b] * this.cos[k]
          re[b] = re[a] - tr; im[b] = im[a] - ti
          re[a] += tr; im[a] += ti
        }
      }
    }
  }
}

const hann = (n: number) => { const w = new Float32Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)); return w }
const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

export interface DetectedNote {
  midi: number
  /** seconds (on the clock of the samples you pushed) */
  time: number
  attack: boolean
  /** this is one of the notes you said to expect */
  expected: boolean
  /** 0..1, how clearly the note stood out */
  conf: number
}

export class NoteDetector {
  onNote?: (n: DetectedNote) => void
  onOnset?: (time: number) => void
  /** about 40 times a second: the clearest note now (or null) and the level */
  onFrame?: (f: { midi: number | null; level: number }) => void
  /** loudness needed to count: lower = more sensitive (from the input setup) */
  gate = 1
  strictOctave = false
  /** for tests: what each analysis saw */
  debug?: (d: { best: number; ranked: [number, number][]; exp: [number, number, number][] }) => void

  private sr: number
  private ring: Float32Array
  private w = 0 // samples written in total
  private hop = 256
  private sinceHop = 0
  private fftS = new FFT(1024)
  private winS = hann(1024)
  private reS = new Float32Array(1024)
  private imS = new Float32Array(1024)
  private prevMag = new Float32Array(512)
  private flux: number[] = []
  private lastOnset = -1
  private noise = 0.003
  private fftL = new FFT(8192)
  private reL = new Float32Array(8192)
  private imL = new Float32Array(8192)
  private winA = hann(2048)
  private winB = hann(4096)
  private mag = new Float32Array(4096)
  private wh = new Float32Array(4096)
  private pre = new Float64Array(4097)
  private pending: { at: number; ready: number; n: number; before: Float32Array; first?: number }[] = []
  private expected: number[] = []
  private current: number[] = []
  private lastEmit: { midi: number; time: number } | null = null
  private legato: { midi: number; count: number } | null = null
  private hopsSinceFrame = 0
  private recent: number[] = []
  private quietSince = 0

  constructor(sampleRate: number) {
    this.sr = sampleRate
    this.ring = new Float32Array(16384)
    this.hop = sampleRate > 60000 ? 512 : 256
  }

  /** the notes (MIDI) the tab wants now, plus the step after (in case one was missed); checked for first */
  expect(midis: number[], after: number[] = []) { this.current = [...new Set(midis)]; this.expected = [...new Set([...midis, ...after])] }

  get time() { return this.w / this.sr }

  push(x: Float32Array) {
    for (let i = 0; i < x.length; i++) {
      this.ring[this.w & 16383] = x[i]
      this.w++
      if (++this.sinceHop >= this.hop) { this.sinceHop = 0; this.step() }
    }
  }

  /** copy the last n samples ending `endOffset` samples ago */
  private take(n: number, out: Float32Array, win: Float32Array, endOffset = 0) {
    const start = this.w - endOffset - n
    for (let i = 0; i < n; i++) out[i] = this.ring[(start + i) & 16383] * win[i]
  }

  private level(n = 1024) {
    let s = 0
    for (let i = this.w - n; i < this.w; i++) { const v = this.ring[i & 16383]; s += v * v }
    return Math.sqrt(s / n)
  }

  private step() {
    if (this.w < 4096) return
    const now = this.time
    const level = this.level(1024)
    // short-term loudness of the last ~70 ms: a rise means a pick is under way
    const short = this.level(256)
    this.recent.push(short)
    if (this.recent.length > 12) this.recent.shift()
    const rising = short > 1.35 * Math.min(...this.recent)
    if (level < this.noise * 1.5) this.noise = this.noise * 0.97 + level * 0.03
    const gateLevel = Math.max(0.0045 * this.gate, this.noise * 3 * this.gate)
    const loud = level > gateLevel
    if (!loud) this.quietSince++
    else this.quietSince = 0

    // ---- spectral flux (pick attacks) ----
    this.take(1024, this.reS, this.winS)
    this.imS.fill(0)
    this.fftS.run(this.reS, this.imS)
    const lo = Math.floor((60 * 1024) / this.sr), hi = Math.min(511, Math.ceil((6000 * 1024) / this.sr))
    let fl = 0
    for (let k = 1; k < 512; k++) {
      const m = Math.log(1 + 200 * Math.hypot(this.reS[k], this.imS[k]))
      if (k >= lo && k <= hi) { const d = m - this.prevMag[k]; if (d > 0) fl += d }
      this.prevMag[k] = m
    }
    const hist = this.flux
    const sorted = [...hist].sort((a, b) => a - b)
    const med = sorted.length ? sorted[sorted.length >> 1] : 0
    const mad = sorted.length ? sorted.reduce((a, v) => a + Math.abs(v - med), 0) / sorted.length : 0
    hist.push(fl)
    if (hist.length > 50) hist.shift()
    const thresh = med + 3.2 * mad + 2.5
    if (loud && fl > thresh && hist.length > 8 && now - this.lastOnset > 0.05) {
      // attack time: back off by half a short window
      const at = now - 512 / this.sr
      this.lastOnset = now
      this.onOnset?.(at)
      // analyse once enough sound after the attack has arrived (longer for low notes)
      const low = this.expected.some(m => m < 52)
      const n = low ? 4096 : 2048
      // what was already sounding (ringing strings) just before the pick
      const before = this.salience(2048)
      this.pending.push({ at, ready: this.w + Math.round(0.012 * this.sr) + n - 512, n, before })
      this.legato = null
    }

    // ---- analyse pending attacks ----
    while (this.pending.length && this.w >= this.pending[0].ready) {
      const p = this.pending.shift()!
      if (!loud && this.quietSince > 4) continue
      const r = this.analyse(p.first === undefined ? p.n : 4096, p.before)
      if (r?.expected) { this.emit(r.midi, p.at, true, true, r.conf); continue }
      if (p.first === undefined) {
        // not what the tab wants? listen once more, a little later and longer, before calling it a wrong note
        if (r) this.pending.push({ ...p, ready: this.w + Math.round(0.045 * this.sr), first: r.midi })
        continue
      }
      if (r && ((r.midi - p.first) % 12 + 12) % 12 === 0 && r.conf >= 0.45) this.emit(r.midi, p.at, true, false, r.conf)
    }

    // ---- live readout and legato changes, ~40 times a second ----
    if (++this.hopsSinceFrame >= Math.max(1, Math.round(this.sr / this.hop / 40))) {
      this.hopsSinceFrame = 0
      const busy = this.pending.length > 0 || now - this.lastOnset < 0.12 || rising
      // hammer-ons, pull-offs and slides can only confirm the note you're on, not one further ahead
      const r = loud ? this.analyse(2048, null, this.current) : null
      this.onFrame?.({ midi: r && r.conf > 0.35 ? r.midi : null, level })
      if (r && !busy && r.conf > 0.6) {
        const same = (a: number, b: number) => (this.strictOctave ? a === b : ((a - b) % 12 + 12) % 12 === 0)
        const last = this.lastEmit
        if (!last || !same(last.midi, r.midi)) {
          if (this.legato && this.legato.midi === r.midi) this.legato.count++
          else this.legato = { midi: r.midi, count: 1 }
          // an expected note needs two readings in a row, anything else three
          if (this.legato.count >= (r.expected ? 3 : 4)) { this.emit(r.midi, now, false, r.expected, r.conf); this.legato = null }
        } else this.legato = null
      }
    }
  }

  /** Harmonic salience of every note 34..100 in the last n samples; checks the expected notes first. */
  /** how strongly each note 34..100 (with its overtones) sounds in the last n samples */
  private salience(n: number): Float32Array {
    const re = this.reL, im = this.imL
    re.fill(0); im.fill(0)
    this.take(n, re, n === 2048 ? this.winA : this.winB)
    this.fftL.run(re, im)
    const N = 8192, bin = this.sr / N
    for (let k = 0; k < N / 2; k++) this.mag[k] = Math.sqrt(Math.hypot(re[k], im[k]))
    // keep only what sticks up above its surroundings (harmonic peaks), so broadband noise and the skirts of
    // a neighbouring peak count for little
    const pre = this.pre
    pre[0] = 0
    for (let k = 0; k < N / 2; k++) pre[k + 1] = pre[k] + this.mag[k]
    const wh = this.wh
    for (let k = 0; k < N / 2; k++) {
      const W = Math.max(10, Math.round(k * 0.06))
      const a = Math.max(0, k - W), b = Math.min(N / 2, k + W + 1)
      const mean = (pre[b] - pre[a]) / (b - a)
      wh[k] = Math.max(0, this.mag[k] - mean)
    }
    const peak = (f: number) => {
      const c = f / bin, w = Math.max(1, c * 0.018)
      let best = 0
      // only a real peak counts, not the slope of a neighbouring note's peak
      for (let k = Math.max(1, Math.floor(c - w)); k <= Math.min(N / 2 - 2, Math.ceil(c + w)); k++) if (wh[k] > best && wh[k] >= wh[k - 1] && wh[k] >= wh[k + 1]) best = wh[k]
      return best
    }
    const sal = (m: number) => {
      const f0 = midiHz(m)
      let s = 0, wsum = 0
      // low notes: their overtones carry the pitch (a phone mic hardly hears a low fundamental)
      const H = m < 55 ? 10 : 8, decay = m < 55 ? 0.92 : 0.82
      for (let h = 1; h <= H; h++) {
        const f = f0 * h
        if (f > this.sr * 0.45) break
        const wgt = Math.pow(decay, h - 1)
        s += wgt * peak(f); wsum += wgt
      }
      return s / wsum
    }
    const S = new Float32Array(101)
    for (let m = 34; m <= 100; m++) S[m] = sal(m)
    return S
  }

  /** Which note is it? `before` = the sound just before a pick: what the pick added counts most (ringing strings
   *  don't), and a note picked again counts when the pick clearly made it louder. */
  private analyse(n: number, before?: Float32Array | null, only?: number[]): { midi: number; expected: boolean; conf: number } | null {
    const plain = this.salience(n)
    const views: { S: Float32Array; boosted: boolean }[] = []
    if (before) {
      const diff = new Float32Array(101)
      for (let m = 34; m <= 100; m++) diff[m] = Math.max(0, plain[m] - 0.9 * before[m])
      views.push({ S: diff, boosted: false })
    }
    views.push({ S: plain, boosted: !!before })
    let fallback: { midi: number; expected: boolean; conf: number } | null = null
    for (const { S, boosted } of views) {
      let best = -1, bestS = 0
      for (let m = 34; m <= 100; m++) if (S[m] > bestS) { bestS = S[m]; best = m }
      if (best < 0 || bestS <= 0) continue
      // room noise lifts every note's score about equally: measure against that floor
      const sorted = Array.from(S.subarray(34, 101)).sort((a, b) => a - b)
      const floor = sorted[Math.floor(sorted.length * 0.4)]
      const top = bestS - floor
      if (top <= 0) continue
      // a note an octave below the winner whose odd harmonics are also there is the real one (weak fundamentals)
      if (best - 12 >= 34 && S[best - 12] - floor > top * 0.82) best -= 12
      const contrast = (m: number) => (S[m] - floor) / Math.max(top * 0.04, Math.max(S[m - 1] ?? 0, S[m + 1] ?? 0) - floor)
      // expected notes: accept when the note clearly stands out
      let bestExp = -1, bestExpScore = 0
      for (const e of only ?? this.expected) {
        // an octave off only counts for low notes (a phone mic often hears a low string an octave up)
        const cands = this.strictOctave ? [e] : e < 52 ? [e, e + 12] : [e]
        for (const c of cands) {
          const sc = S[c] - floor
          // in the plain view after a pick, the note must also have got louder (picked again, not just ringing on)
          if (boosted && before && plain[c] < 1.2 * before[c]) continue
          // just the 3rd or 5th overtone of a lower note that's really sounding (a 5th or major 3rd below)?
          if ((S[c - 19] ?? 0) > 0.8 * S[c] || (S[c - 28] ?? 0) > 0.8 * S[c]) continue
          if (sc >= top * 0.3 && contrast(c) >= 1.35 && sc > bestExpScore) { bestExpScore = sc; bestExp = e }
        }
      }
      if (this.debug) {
        const ranked = Array.from({ length: 67 }, (_, i) => [i + 34, +(((S[i + 34] - floor) / top).toFixed(2))] as [number, number]).sort((a, b) => b[1] - a[1]).slice(0, 5)
        this.debug({ best, ranked, exp: this.expected.flatMap(e => [e, e - 12, e + 12].filter(c => c >= 35 && c <= 99).map(c => [c, +(((S[c] - floor) / top).toFixed(2)), +contrast(c).toFixed(2)] as [number, number, number])) })
      }
      if (bestExp >= 0) return { midi: bestExp, expected: true, conf: Math.min(1, bestExpScore / top) }
      // the first view decides what "something else" was played
      if (!fallback && contrast(best) >= 1.25) fallback = { midi: best, expected: false, conf: Math.min(1, (contrast(best) - 1) / 1.5) }
    }
    return fallback
  }

  private emit(midi: number, time: number, attack: boolean, expected: boolean, conf: number) {
    // the note that's already ringing sounding again (a string brushed, a swell) isn't a wrong note
    const last = this.lastEmit
    if (!expected && last && time - last.time < 1 && ((last.midi - midi) % 12 + 12) % 12 === 0) return
    this.lastEmit = { midi, time }
    this.onNote?.({ midi, time, attack, expected, conf })
  }
}
