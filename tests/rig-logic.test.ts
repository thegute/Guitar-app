// Audio setups (rig.ts): the pedal + wireless setup switches on by itself when the Pocket Master is in the device
// list, the stereo switch lasts until it's unplugged, interface monitoring never happens with the pedal or the mic,
// and the pedal setup keeps its own timing while sharing the USB input's sensitivity.
import './test-env'
import { strict as assert } from 'node:assert'
import { rig, monoOut, monitoring, noteDevices, noteInput, setStereoWithPedal, setMonitor, markPedal, isPedal, switchedAt } from '../src/audio/rig'
import { gear, setGear, kindOf, latencyMs, isSetUp, timingChecked } from '../src/audio/gear'

let checks = 0
const ok = (c: boolean, m: string) => { checks++; assert.ok(c, m) }
const MIC = { label: 'Bottom microphone', external: false }
const PM = { label: 'USB-Audio - Pocket Master', external: true }
const GENERIC = { label: 'USB audio', external: true }

ok(rig() === 'stereo' && !monoOut(), 'nothing plugged in: stereo')
noteDevices([MIC, PM])
ok(rig() === 'pedal' && monoOut() && !monitoring(), 'Pocket Master listed: pedal setup, mono, no playback')
ok(switchedAt() > 0, 'the notice knows it switched')
setStereoWithPedal(true)
ok(rig() === 'stereo' && !monoOut(), 'wired headphones: one tap to stereo')
noteDevices([MIC])
ok(rig() === 'stereo', 'unplugged: stereo')
noteDevices([MIC, PM])
ok(rig() === 'pedal', 'plugged in again: back to mono (the stereo switch was for that time only)')

// monitoring: only an interface, only when switched on
noteDevices([MIC])
setMonitor(true)
noteInput(MIC)
ok(!monitoring(), 'never plays the phone mic back (it would howl)')
noteInput(GENERIC)
ok(rig() === 'interface' && monitoring(), 'an interface with "Hear my guitar" on: playback')
noteDevices([MIC, PM])
ok(rig() === 'pedal' && !monitoring(), 'the pedal never plays your guitar back, even with the switch on')
setMonitor(false)
noteDevices([MIC]); noteInput(null)

// a pedal Android lists with a generic name
ok(!isPedal(GENERIC.label), 'a generic USB name is not assumed to be the pedal')
markPedal(GENERIC.label, true)
noteDevices([MIC, GENERIC])
ok(rig() === 'pedal', '"Yes, that\'s my pedal" turns the pedal setup on')
markPedal(GENERIC.label, false)
noteDevices([MIC])
ok(rig() === 'stereo', 'forgetting it goes back to stereo')

// timing per setup, one sensitivity for the USB input
setGear('usb', { gate: 1.4, latencyMs: 60, setAt: 1 })
noteDevices([MIC, PM])
ok(kindOf(true) === 'pedal' && kindOf(false) === 'mic', 'recording from the pedal uses the pedal setup\'s timing')
ok(gear('pedal').gate === 1.4, 'the pedal setup shares the USB sensitivity')
ok(!timingChecked('pedal') && latencyMs('pedal') > 0, 'the wireless timing starts as a guess')
setGear('pedal', { latencyMs: 95, setAt: 2 })
ok(latencyMs('pedal') === 95 && latencyMs('usb') === 60, 'the pedal + wireless timing is kept apart from wired USB')
setGear('pedal', { gate: 0.9, noise: 0.01, latencyMs: 97, setAt: 3 })
ok(gear('usb').gate === 0.9 && latencyMs('usb') === 60 && latencyMs('pedal') === 97, 'a setup run with the pedal updates the input\'s sensitivity, not wired USB timing')
ok(isSetUp('pedal') && isSetUp(), 'set up counts')
setStereoWithPedal(true)
ok(kindOf(true) === 'usb', 'stereo with the pedal (wired headphones) uses the wired timing')

// ---- Engine Week Part 3: Automatic Timing Calibration per Gear Profile (Safeguard #1 + Upgrade #5) ----
import { analyseLoopbackSamples, analyseStrumSamples } from '../src/audio/looper'
{
  const sr = 48000
  const from = 1.0
  const clicks6 = Array.from({ length: 6 }, (_, i) => 1.25 + i * 0.48)
  const makeBuffer = (durSec: number, spikeTimesSec: number[]) => {
    const buf = new Float32Array(Math.round(durSec * sr))
    for (let i = 0; i < buf.length; i++) buf[i] = (Math.sin(i * 0.17) * 0.0008)
    for (const t of spikeTimesSec) {
      const idx = Math.round((t - from) * sr)
      for (let k = 0; k < Math.round(sr * 0.008); k++) {
        if (idx + k >= 0 && idx + k < buf.length) {
          buf[idx + k] = 0.45 * Math.sin(k * 0.6) * Math.exp(-k / (sr * 0.003))
        }
      }
    }
    return buf
  }

  // 1. Clean speaker loopback: 6 clicks arriving 42 ms after each scheduled click
  const loopClean = analyseLoopbackSamples(
    makeBuffer(3.6, clicks6.map((c, i) => c + 0.042 + (i % 2 ? 0.001 : -0.001))),
    sr,
    from,
    clicks6,
  )
  ok(loopClean.ok && loopClean.latencyMs !== null && Math.abs(loopClean.latencyMs - 42) <= 3, `loopback 42ms: got ${loopClean.latencyMs}`)
  ok(loopClean.spreadMs !== null && loopClean.spreadMs <= 3, `loopback tight spread: ±${loopClean.spreadMs}ms`)

  // 2. Safeguard #1: Silent speaker / headphones plugged in -> never fails silently, explains why
  const loopSilent = analyseLoopbackSamples(makeBuffer(3.6, []), sr, from, clicks6)
  ok(!loopSilent.ok && loopSilent.reason === 'no-signal' && /8-click strum check/i.test(loopSilent.message), 'silent loopback explains why and offers 8-click strum check')

  // 3. Safeguard #1: Late Bluetooth spikes (> 500 ms) -> rejected with late-signal explanation
  const loopLate = analyseLoopbackSamples(
    makeBuffer(4.0, clicks6.map(c => c + 0.62)),
    sr,
    from,
    clicks6,
  )
  ok(!loopLate.ok && loopLate.reason === 'late-signal' && /500 ms/i.test(loopLate.message), 'late (>500ms) spikes rejected with clear Bluetooth message')

  // 4. Safeguard #1: Random room bumps (wildly inconsistent offsets) -> rejected as inconsistent
  const loopNoisy = analyseLoopbackSamples(
    makeBuffer(3.6, [clicks6[0] + 0.02, clicks6[1] + 0.14, clicks6[2] + 0.29, clicks6[3] + 0.05, clicks6[4] + 0.38, clicks6[5] + 0.21]),
    sr,
    from,
    clicks6,
  )
  ok(!loopNoisy.ok && loopNoisy.reason === 'inconsistent', 'inconsistent room noise rejected')

  // 5. Upgrade #5: 8-click play-along strum check with outlier trimming & spread reporting
  const clicks8 = Array.from({ length: 8 }, (_, i) => 1.3 + i * 0.55)
  // 7 strums around 88 ms (±4 ms) + 1 wild outlier at 260 ms
  const strumTimes = clicks8.map((c, i) => c + (i === 2 ? 0.26 : 0.088 + ((i % 3) - 1) * 0.004))
  const strumRes = analyseStrumSamples(makeBuffer(5.5, strumTimes), sr, from, clicks8)
  ok(strumRes.ok && strumRes.latencyMs !== null && Math.abs(strumRes.latencyMs - 88) <= 5, `strum median 88ms (outlier trimmed): got ${strumRes.latencyMs}`)
  ok(strumRes.spreadMs !== null && strumRes.spreadMs <= 6, `strum spread reported: ±${strumRes.spreadMs}ms`)

  // 6. Per-profile spreadMs and method persistence across mic / usb / pedal
  setGear('mic', { latencyMs: 42, spreadMs: 2, method: 'loopback', setAt: 10 })
  setGear('usb', { latencyMs: 64, spreadMs: 4, method: 'strum', setAt: 11 })
  setGear('pedal', { latencyMs: 92, spreadMs: 5, method: 'strum', setAt: 12 })
  ok(gear('mic').latencyMs === 42 && gear('mic').spreadMs === 2 && gear('mic').method === 'loopback', 'mic profile stores loopback & spread')
  ok(gear('usb').latencyMs === 64 && gear('usb').spreadMs === 4 && gear('usb').method === 'strum', 'usb profile stores strum & spread')
  ok(gear('pedal').latencyMs === 92 && gear('pedal').spreadMs === 5 && gear('pedal').method === 'strum', 'pedal profile stores its own wireless timing & spread')
}

console.log(`audio setups: ${checks} checks, 0 failed`)

