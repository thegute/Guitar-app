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

console.log(`audio setups: ${checks} checks, 0 failed`)
