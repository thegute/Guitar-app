// One shared AudioContext for the whole app. Created on the first user gesture.
// The very last step folds everything to mono when the pedal + wireless setup is on (rig.ts): one node at the end, so
// every sound KGuitar makes, now or later, reaches a mono plug whole.
import { monoOut, onRig } from './rig'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let fold: GainNode | null = null
/** before the mono fold: for sounds that skip the master compressor (your guitar played back through an interface) */
let finalIn: GainNode | null = null

function applyFold() {
  if (!fold) return
  // 'explicit' + 'speakers': one channel = (L + R) / 2, which the output then sends to both sides
  fold.channelCount = monoOut() ? 1 : 2
}
onRig(applyFold)

export function audio(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' })
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -10
    comp.ratio.value = 4
    master = ctx.createGain()
    master.gain.value = 0.8
    // a soft ceiling after the compressor so a busy mix (drums + bass + amp guitar) never hard-clips
    const ceiling = ctx.createWaveShaper()
    const n = 2048
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1
      const a = Math.abs(x)
      curve[i] = Math.sign(x) * (a < 0.7 ? a : 0.7 + 0.28 * Math.tanh((a - 0.7) / 0.28))
    }
    ceiling.curve = curve
    ceiling.oversample = '2x'
    fold = ctx.createGain()
    fold.channelCountMode = 'explicit'
    fold.channelInterpretation = 'speakers'
    finalIn = ctx.createGain()
    master.connect(comp).connect(ceiling).connect(finalIn).connect(fold).connect(ctx.destination)
    applyFold()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function out(): AudioNode {
  audio()
  return master!
}
/** The end of the chain (after the compressor and ceiling, before the mono fold). */
export function finalOut(): AudioNode {
  audio()
  return finalIn!
}

/** Keep the screen awake while practising (tuner, metronome, playback). */
let wakeLock: { release: () => Promise<void> } | null = null
export async function keepAwake(on: boolean) {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    if (on && !wakeLock && nav.wakeLock) wakeLock = await nav.wakeLock.request('screen')
    if (!on && wakeLock) {
      await wakeLock.release()
      wakeLock = null
    }
  } catch {
    /* not supported: fine */
  }
}
