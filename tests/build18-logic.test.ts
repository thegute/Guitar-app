// The big update (builds 18–22) logic: tuner accuracy, key signatures on the circle, and more as features land.
import './test-env'
import { PitchDetector } from 'pitchy'
import { rawPitch, TunerSmoother } from '../src/audio/tunerPitch'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }

// ---------------- tuner: synthetic plucked strings (harmonics, stiffness, noise, a sharp attack)
{
  const sr = 48000
  const det = PitchDetector.forFloat32Array(4096)
  function pluck(midi: number, cents: number, secs: number, opts: { h2?: number; noise?: number; seed?: number } = {}) {
    const f0 = 440 * Math.pow(2, (midi - 69 + cents / 100) / 12)
    const n = Math.round(secs * sr)
    const out = new Float32Array(n)
    let seed = opts.seed ?? 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5 }
    const B = 1e-4
    const amps = [1, opts.h2 ?? 0.6, 0.35, 0.25, 0.15, 0.1, 0.06]
    for (let i = 0; i < n; i++) {
      const t = i / sr
      // the pitch starts a little sharp and settles (a hard pluck stretches the string)
      const bend = 1 + 0.004 * Math.exp(-t / 0.04)
      let v = 0
      amps.forEach((a, k) => {
        const p = k + 1
        v += a * Math.exp(-t / (1.8 / p)) * Math.sin(2 * Math.PI * p * f0 * bend * Math.sqrt(1 + B * p * p) * t + k)
      })
      out[i] = 0.25 * v + (opts.noise ?? 0.004) * rnd()
    }
    return out
  }
  function tune(sig: Float32Array, target: number | null = null) {
    const sm = new TunerSmoother()
    sm.target = target
    let last = null as ReturnType<TunerSmoother['push']>
    for (let at = 0; at + 4096 <= sig.length; at += 800) {
      const r = rawPitch(det, sig.subarray(at, at + 4096), sr)
      last = sm.push(at / sr, r.freq, r.clarity)
    }
    return last
  }
  const strings = [40, 45, 50, 55, 59, 64]
  let worst = 0
  for (const m of strings) {
    for (const c of [-31, -7.5, 0, 3.2, 18]) {
      const r = tune(pluck(m, c, 1.6))
      const err = r ? Math.abs(r.note + r.cents / 100 - (m + c / 100)) * 100 : Infinity
      worst = Math.max(worst, err)
      ok(!!r && err < 0.8, `tuner: string ${m} at ${c} cents → ${r ? `${r.note} ${r.cents}` : 'nothing'} (error ${err.toFixed(2)} cents)`)
    }
  }
  console.log(`  tuner: worst error ${worst.toFixed(2)} cents over 30 plucks`)
  // a low E whose 2nd harmonic is louder than the note still reads E2
  const loud2 = tune(pluck(40, 0, 1.6, { h2: 2.2 }))
  ok(!!loud2 && loud2.note === 40, `tuner: low E with a loud 2nd harmonic → ${loud2?.note}`)
  // noisy room
  const noisy = tune(pluck(45, 5, 1.6, { noise: 0.05 }))
  ok(!!noisy && Math.abs(noisy.cents - 5) < 2, `tuner: A in a very noisy room (no band filter) → ${noisy?.cents}`)
  // a picked string far off: measured from that string
  const far = tune(pluck(50, -230, 1.6), 50)
  ok(!!far && far.note === 50 && Math.abs(far.cents + 230) < 2, `tuner: D string 2.3 semitones low with D picked → ${far?.note} ${far?.cents}`)
  // a turning peg: the pitch glides up 20 cents, then holds; the reading follows and lands
  {
    const f = (t: number) => 440 * Math.pow(2, (45 - 69 + (t < 1 ? -0.2 + 0.2 * t : 0)) / 12)
    const n = Math.round(1.6 * sr), sig = new Float32Array(n)
    let ph = 0
    for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * f(t) / sr; sig[i] = 0.25 * (Math.sin(ph) + 0.5 * Math.sin(2 * ph + 1) + 0.3 * Math.sin(3 * ph + 2)) }
    const r = tune(sig)
    ok(!!r && Math.abs(r.cents) < 1, `tuner: follows a turning peg and lands (${r?.cents})`)
  }
  // silence gives nothing
  ok(tune(new Float32Array(sr)) === null, 'tuner: silence reads nothing')
  // steady once settled
  const st = tune(pluck(55, 1, 1.6))
  ok(!!st && st.stable, 'tuner: a held note reads as steady')
}

console.log(`build 18 logic: ${checks} checks, ${failed} failed`)
if (failed) process.exit(1)
