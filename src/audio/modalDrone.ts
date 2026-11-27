// Modal Root / Power-5th Drone synthesizer for ear-training modes & hexatonic colors (Roy Ziv Modes Navigator method).
// Flows through route('band', 'keys') so it automatically obeys Backing Master Volume and stops cleanly via stopAll.
import { audio, route } from './engine'
import { liveSound, quietSound } from './stopAll'
import { midiToFreq, SHARPS } from '../theory/notes'

export type DroneVoicing = 'root' | 'fifth' | 'pad'

class ModalDrone {
  private playing = false
  private rootPc = 9 // A
  private voicing: DroneVoicing = 'fifth'
  private vol = 0.45
  private nodes: AudioNode[] = []
  private oscs: OscillatorNode[] = []
  private master: GainNode | null = null
  private subs = new Set<() => void>()

  private notify() {
    for (const f of this.subs) f()
  }

  subscribe(f: () => void) {
    this.subs.add(f)
    return () => { this.subs.delete(f) }
  }

  isPlaying() { return this.playing }
  getRootPc() { return this.rootPc }
  getVoicing() { return this.voicing }
  getVolume() { return this.vol }

  start(rootPc = this.rootPc, voicing: DroneVoicing = this.voicing) {
    this.stop()
    this.rootPc = ((rootPc % 12) + 12) % 12
    this.voicing = voicing
    const ctx = audio()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime

    const out = route('band', 'keys')
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(Math.max(0.02, this.vol * 0.24), now + 0.45)

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(voicing === 'pad' ? 680 : 520, now)
    lp.Q.setValueAtTime(1.1, now)

    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.setValueAtTime(0.14, now)
    lfoGain.gain.setValueAtTime(140, now)
    lfo.connect(lfoGain).connect(lp.frequency)
    lfo.start(now)

    lp.connect(master).connect(out)

    let baseMidi = 36 + this.rootPc
    if (baseMidi < 40) baseMidi += 12
    const voices: { midi: number; detune: number; type: OscillatorType; gain: number }[] = [
      { midi: baseMidi, detune: -4, type: 'sawtooth', gain: 0.45 },
      { midi: baseMidi, detune: 4, type: 'triangle', gain: 0.55 },
      { midi: baseMidi + 12, detune: -6, type: 'triangle', gain: 0.28 },
    ]
    if (voicing === 'fifth' || voicing === 'pad') {
      voices.push({ midi: baseMidi + 7, detune: 3, type: 'triangle', gain: 0.26 })
    }
    if (voicing === 'pad') {
      voices.push({ midi: baseMidi + 12, detune: 7, type: 'sawtooth', gain: 0.16 })
      voices.push({ midi: baseMidi + 19, detune: -5, type: 'sine', gain: 0.14 })
    }

    const oscs: OscillatorNode[] = [lfo]
    const nodes: AudioNode[] = [master, lp, lfoGain]
    for (const v of voices) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = v.type
      o.frequency.setValueAtTime(midiToFreq(v.midi), now)
      o.detune.setValueAtTime(v.detune, now)
      g.gain.setValueAtTime(v.gain, now)
      o.connect(g).connect(lp)
      o.start(now)
      oscs.push(o)
      nodes.push(g)
    }

    this.oscs = oscs
    this.nodes = nodes
    this.master = master
    this.playing = true
    liveSound(this, `${SHARPS[this.rootPc]} Drone`)
    this.notify()
  }

  setRoot(rootPc: number) {
    const next = ((rootPc % 12) + 12) % 12
    if (next === this.rootPc) return
    this.rootPc = next
    if (this.playing) this.start(next, this.voicing)
    else this.notify()
  }

  setVoicing(voicing: DroneVoicing) {
    if (voicing === this.voicing) return
    this.voicing = voicing
    if (this.playing) this.start(this.rootPc, voicing)
    else this.notify()
  }

  setVolume(v: number) {
    this.vol = Math.max(0.05, Math.min(1, v))
    if (this.master && this.playing) {
      try {
        const ctx = audio()
        this.master.gain.setTargetAtTime(this.vol * 0.24, ctx.currentTime, 0.08)
      } catch { /* ignore */ }
    }
    this.notify()
  }

  toggle(rootPc = this.rootPc, voicing: DroneVoicing = this.voicing) {
    if (this.playing) this.stop()
    else this.start(rootPc, voicing)
  }

  stop() {
    if (!this.playing && !this.oscs.length) return
    const master = this.master
    const oscs = this.oscs
    const nodes = this.nodes
    this.master = null
    this.oscs = []
    this.nodes = []
    this.playing = false
    quietSound(this)
    try {
      const ctx = audio()
      const now = ctx.currentTime
      if (master) {
        master.gain.cancelScheduledValues(now)
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now)
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
      }
      setTimeout(() => {
        for (const o of oscs) { try { o.stop(); o.disconnect() } catch { /* ignore */ } }
        for (const n of nodes) { try { n.disconnect() } catch { /* ignore */ } }
      }, 210)
    } catch {
      for (const o of oscs) { try { o.stop() } catch { /* ignore */ } }
    }
    this.notify()
  }
}

export const modalDrone = new ModalDrone()
