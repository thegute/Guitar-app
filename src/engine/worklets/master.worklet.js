// KGuitar master bus (Stage 3, notes/AUDIO-ENGINE.md): glue compressor → true-peak look-ahead limiter, stereo-linked,
// in the audio thread. Plain JS: it's loaded with audioWorklet.addModule, not bundled.
//
// Glue: an SSL-style bus compressor. The detector listens through a 90 Hz high-pass (so the kick and bass don't pump the
// mix), feed-forward, log domain (Giannoulis, Massberg & Reiss 2012, "smooth branching" detector), soft knee, 2:1,
// 30 ms attack, programme-dependent ("auto") release: short after a single hit, longer while the mix stays dense.
//
// Limiter: the delayed signal is never allowed past the ceiling in TRUE peak (BS.1770 annex 2): every incoming sample is
// up-sampled 4× with a 48-tap polyphase windowed-sinc filter and the largest of the in-between values is the peak. The
// gain needed for each sample goes through a running minimum over L+1 samples and then an L-long moving average, with the
// audio delayed by L samples: that guarantees the gain is already down when the peak comes out (no overshoot) and that
// it ramps smoothly (no click). Release is a smooth one-pole recovery. A last clamp at full scale is only a safety net.

const LN10_20 = Math.LN10 / 20
const db2lin = d => Math.exp(d * LN10_20)
const lin2db = x => 20 * Math.log10(x + 1e-30)

/** 4-phase windowed-sinc interpolator taps (12 taps a phase), Kaiser-ish (Blackman) window */
function polyphase(phases = 4, tapsPer = 12) {
  const N = phases * tapsPer
  const h = new Float64Array(N)
  const mid = (N - 1) / 2
  for (let i = 0; i < N; i++) {
    const t = (i - mid) / phases
    const sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t)
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (N - 1))
    h[i] = sinc * w
  }
  const out = []
  for (let p = 0; p < phases; p++) {
    const ph = new Float64Array(tapsPer)
    let sum = 0
    for (let k = 0; k < tapsPer; k++) { ph[k] = h[k * phases + p]; sum += ph[k] }
    for (let k = 0; k < tapsPer; k++) ph[k] /= sum // each phase passes DC at unity
    out.push(ph)
  }
  return out
}

class Biquad {
  constructor() { this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0; this.z1 = 0; this.z2 = 0 }
  highpass(f, q, sr) {
    const w = (2 * Math.PI * f) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al
    this.b0 = (1 + c) / 2 / a0; this.b1 = -(1 + c) / a0; this.b2 = (1 + c) / 2 / a0
    this.a1 = (-2 * c) / a0; this.a2 = (1 - al) / a0
    return this
  }
  run(x) { const y = this.b0 * x + this.z1; this.z1 = this.b1 * x - this.a1 * y + this.z2; this.z2 = this.b2 * x - this.a2 * y; return y }
}

class KGMaster extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'glueThreshold', defaultValue: -12, minValue: -60, maxValue: 0, automationRate: 'k-rate' },
      { name: 'glueRatio', defaultValue: 2, minValue: 1, maxValue: 10, automationRate: 'k-rate' },
      { name: 'ceiling', defaultValue: -1, minValue: -12, maxValue: 0, automationRate: 'k-rate' },
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ]
  }

  constructor() {
    super()
    const sr = sampleRate
    // glue
    this.sc = new Biquad().highpass(90, 0.707, sr)
    this.sc2 = new Biquad().highpass(90, 0.707, sr) // 24 dB/oct: two in series
    this.knee = 6
    this.atk = Math.exp(-1 / (0.030 * sr))
    this.relFast = Math.exp(-1 / (0.10 * sr))
    this.relSlow = Math.exp(-1 / (1.2 * sr))
    this.dens = Math.exp(-1 / (2.0 * sr)) // how long "busy" lasts, for the auto release
    this.gr = 0 // gain reduction in dB (>= 0)
    this.ms = 0 // the side-chain's mean square (10 ms)
    this.msk = Math.exp(-1 / (0.010 * sr))
    this.busy = 0
    // limiter
    this.L = Math.max(32, Math.round(0.0015 * sr)) // 1.5 ms look-ahead
    this.phases = polyphase(4, 16)
    this.T = 16
    this.histL = new Float64Array(this.T); this.histR = new Float64Array(this.T); this.hpos = 0
    // the interpolator sees a peak ~T/2 samples after it happens: delay the audio by that too, so gain and peak line up
    this.D = this.T / 2
    this.dlen = this.L + this.D + 1
    this.dL = new Float32Array(this.dlen); this.dR = new Float32Array(this.dlen); this.dpos = 0
    // running minimum over L+1 samples: a monotonic deque of (index, value)
    this.qi = new Int32Array(this.L + 2); this.qv = new Float64Array(this.L + 2); this.qh = 0; this.qt = 0; this.n = 0
    // moving average over L samples of the held gain
    this.box = new Float64Array(this.L); this.bpos = 0; this.bsum = this.L
    this.box.fill(1)
    this.rel = Math.exp(-1 / (0.08 * sr))
    this.g = 1
    // meters for the app (peak GR of each block, sent ~20×/s)
    this.meterEvery = Math.round(sr / 20 / 128)
    this.meterN = 0; this.maxGlue = 0; this.maxLim = 0
  }

  truePeak(x, hist) {
    hist[this.hpos] = x
    let peak = Math.abs(x)
    for (let p = 1; p < 4; p++) {
      const h = this.phases[p]
      let y = 0
      for (let k = 0; k < this.T; k++) y += h[k] * hist[(this.hpos - k + this.T) % this.T]
      const a = Math.abs(y)
      if (a > peak) peak = a
    }
    return peak
  }

  pushMin(v) {
    const cap = this.L + 2
    while (this.qt !== this.qh && this.qv[(this.qt - 1 + cap) % cap] >= v) this.qt = (this.qt - 1 + cap) % cap
    this.qi[this.qt] = this.n; this.qv[this.qt] = v; this.qt = (this.qt + 1) % cap
    while (this.qi[this.qh] <= this.n - (this.L + 1)) this.qh = (this.qh + 1) % cap
    return this.qv[this.qh]
  }

  process(inputs, outputs, params) {
    const inp = inputs[0], out = outputs[0]
    if (!out || !out.length) return true
    const oL = out[0], oR = out[1] || out[0]
    const iL = inp && inp[0] ? inp[0] : null
    const iR = inp && inp[1] ? inp[1] : iL
    const n = oL.length
    if (params.bypass[0] > 0.5) {
      for (let i = 0; i < n; i++) { oL[i] = iL ? iL[i] : 0; if (oR !== oL) oR[i] = iR ? iR[i] : 0 }
      return true
    }
    const T = params.glueThreshold[0], R = params.glueRatio[0], W = this.knee
    // aim 0.25 dB under the ceiling: 4× detection can under-read the true peak of bright transients by that much
    const ceil = db2lin(params.ceiling[0] - 0.25)
    for (let i = 0; i < n; i++) {
      let l = iL ? iL[i] : 0, r = iR ? iR[i] : 0
      // ---- glue compressor ----
      const s = this.sc2.run(this.sc.run(0.5 * (l + r)))
      this.ms = this.msk * this.ms + (1 - this.msk) * (4 * s * s) // ×4: the side-chain is the average of L and R
      const xdb = 10 * Math.log10(this.ms + 1e-30) + 3 // RMS → a sine's peak level
      let over = xdb - T, target
      if (2 * over < -W) target = 0
      else if (2 * Math.abs(over) <= W) target = ((1 / R - 1) * (over + W / 2) * (over + W / 2)) / (2 * W)
      else target = (1 / R - 1) * over
      const want = -target // dB of reduction, >= 0
      this.busy = this.dens * this.busy + (1 - this.dens) * (want > 0.5 ? 1 : 0)
      const rel = this.relFast + (this.relSlow - this.relFast) * Math.min(1, this.busy * 1.5)
      this.gr = want > this.gr ? this.atk * this.gr + (1 - this.atk) * want : rel * this.gr + (1 - rel) * want
      const gg = db2lin(-this.gr)
      l *= gg; r *= gg
      if (this.gr > this.maxGlue) this.maxGlue = this.gr
      // ---- true-peak look-ahead limiter ----
      const pk = Math.max(this.truePeak(l, this.histL), this.truePeak(r, this.histR))
      this.hpos = (this.hpos + 1) % this.T
      const need = pk > ceil ? ceil / pk : 1
      const held = this.pushMin(need)
      this.n++
      this.bsum += held - this.box[this.bpos]; this.box[this.bpos] = held; this.bpos = (this.bpos + 1) % this.L
      const smooth = this.bsum / this.L
      this.g = smooth < this.g ? smooth : this.rel * this.g + (1 - this.rel) * smooth
      // the audio comes out L + D samples late (look-ahead + the interpolator's own lag)
      this.dL[this.dpos] = l; this.dR[this.dpos] = r
      const rp = (this.dpos + 1) % this.dlen
      let yl = this.dL[rp] * this.g, yr = this.dR[rp] * this.g
      this.dpos = rp
      if (yl > 1) yl = 1; else if (yl < -1) yl = -1
      if (yr > 1) yr = 1; else if (yr < -1) yr = -1
      oL[i] = yl
      if (oR !== oL) oR[i] = yr
      const lim = -lin2db(this.g)
      if (lim > this.maxLim) this.maxLim = lim
    }
    if (++this.meterN >= this.meterEvery) {
      this.port.postMessage({ glue: this.maxGlue, limit: this.maxLim })
      this.meterN = 0; this.maxGlue = 0; this.maxLim = 0
    }
    return true
  }
}
registerProcessor('kg-master', KGMaster)
