// One shared AudioContext for the whole app. Created on the first user gesture.
let ctx: AudioContext | null = null
let master: GainNode | null = null

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
    master.connect(comp).connect(ceiling).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function out(): AudioNode {
  audio()
  return master!
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
