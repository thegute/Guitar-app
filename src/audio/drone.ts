// A soft, slowly breathing drone on the tonic (root + fifth + octave), the backdrop for ear training.
import { liveSound, quietSound } from './stopAll'
import { audio, out } from './engine'
import { midiToFreq } from '../theory/notes'

export class Drone {
  private master: GainNode | null = null
  private oscs: { o: OscillatorNode; ratio: number }[] = []
  private lfo: OscillatorNode | null = null
  private filter: BiquadFilterNode | null = null
  private volume = 0.5
  tonic = 45

  start(tonic: number) {
    liveSound(this)
    const ctx = audio()
    void ctx.resume()
    this.stop()
    this.tonic = tonic
    const master = ctx.createGain()
    master.gain.value = 0
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 850
    filter.Q.value = 0.6
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.09
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 260
    lfo.connect(lfoGain).connect(filter.frequency)
    lfo.start()
    filter.connect(master).connect(out())
    const voices: [number, OscillatorType, number, number][] = [
      // semitones above tonic, wave, level, detune (cents)
      [0, 'sawtooth', 0.32, -6], [0, 'sawtooth', 0.32, 6], [12, 'triangle', 0.22, 0], [7, 'triangle', 0.12, 2], [-12, 'sine', 0.35, 0],
    ]
    for (const [st, type, lvl, det] of voices) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = midiToFreq(tonic + st)
      o.detune.value = det
      const g = ctx.createGain()
      g.gain.value = lvl
      o.connect(g).connect(filter)
      o.start()
      this.oscs.push({ o, ratio: st })
    }
    master.gain.setTargetAtTime(0.11 * this.volume, ctx.currentTime, 0.6)
    this.master = master
    this.lfo = lfo
    this.filter = filter
  }

  /** Glide to a new key. */
  setTonic(tonic: number) {
    if (!this.master) return this.start(tonic)
    const ctx = audio()
    this.tonic = tonic
    for (const { o, ratio } of this.oscs) o.frequency.setTargetAtTime(midiToFreq(tonic + ratio), ctx.currentTime, 0.25)
  }

  setVolume(v: number) {
    this.volume = v
    if (this.master) this.master.gain.setTargetAtTime(0.11 * v, audio().currentTime, 0.1)
  }

  get playing() { return !!this.master }

  stop() {
    quietSound(this)
    if (!this.master) return
    const ctx = audio()
    const m = this.master
    const oscs = this.oscs
    const lfo = this.lfo
    m.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    setTimeout(() => { oscs.forEach(({ o }) => { try { o.stop() } catch { /* stopped */ } }); try { lfo?.stop() } catch { /* stopped */ }; m.disconnect() }, 1200)
    this.master = null
    this.oscs = []
    this.lfo = null
    this.filter = null
  }
}
