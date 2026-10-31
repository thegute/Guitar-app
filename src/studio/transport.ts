// Plays a beat: drums, instrument tracks and recorded loops on one clock, looping. Schedules a little ahead on the
// audio clock (so timing is exact even when the screen is busy) and tells the screen where the playhead is.
import { liveSound, quietSound } from '../audio/stopAll'
import { audio, out } from '../audio/engine'
import { playDrum, prepareKit, type Voice } from '../audio/drums'
import { playClick } from '../audio/metronome'
import type { Handle } from '../audio/pluck'
import { STEPS_PER_BAR, allRows, totalSteps, type Beat } from './beat'
import { instr, loadInstr, playInstr } from './sounds'

/** A generated room reverb (a few seconds of decaying noise), shared by every track. */
function makeReverb(ctx: AudioContext) {
  const len = Math.floor(ctx.sampleRate * 2.6)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  }
  const c = ctx.createConvolver()
  c.buffer = buf
  return c
}

export interface LoopLayer { id: string; buf: AudioBuffer; vol: number; mute?: boolean }

export class StudioTransport {
  beat: Beat
  playing = false
  /** audio time of step 0 of the current pass */
  t0 = 0
  click = false
  private stepFns = new Set<(step: number) => void>()
  /** your own samples for some pads (phone only): played instead of the kit's sound */
  custom = new Map<Voice, AudioBuffer>()
  private timer: ReturnType<typeof setInterval> | null = null
  private raf = 0
  private next = 0
  private nextT = 0
  private queue: { t: number; s: number }[] = []
  private held: Handle[] = []
  private lastNote = new Map<string, number>()
  layers: LoopLayer[] = []
  private layerSrc: AudioBufferSourceNode[] = []
  readonly master: GainNode
  readonly drumBus: GainNode
  readonly loopBus: GainNode
  private reverb: ConvolverNode
  private reverbIn: GainNode
  private trackBus = new Map<string, { g: GainNode; send: GainNode }>()

  constructor(beat: Beat) {
    this.beat = beat
    const ctx = audio()
    this.master = ctx.createGain()
    this.master.connect(out())
    this.reverb = makeReverb(ctx)
    this.reverbIn = ctx.createGain()
    this.reverbIn.gain.value = 0.8
    this.reverbIn.connect(this.reverb).connect(this.master)
    this.drumBus = ctx.createGain()
    this.drumBus.connect(this.master)
    this.loopBus = ctx.createGain()
    this.loopBus.connect(this.master)
    this.setBeat(beat)
  }

  get stepDur() { return 60 / this.beat.bpm / 4 }
  get loopDur() { return totalSteps(this.beat) * this.stepDur }
  get barDur() { return STEPS_PER_BAR * this.stepDur }

  /** A track's bus (volume + reverb send). */
  bus(trackId: string) {
    let b = this.trackBus.get(trackId)
    if (!b) {
      const ctx = audio()
      const g = ctx.createGain()
      const send = ctx.createGain()
      g.connect(this.master)
      g.connect(send).connect(this.reverbIn)
      b = { g, send }
      this.trackBus.set(trackId, b)
    }
    return b
  }

  setBeat(beat: Beat) {
    const tempoChanged = this.playing && beat.bpm !== this.beat.bpm
    const pos = this.playing ? this.position() : 0
    this.beat = beat
    void prepareKit(beat.kit)
    const now = audio().currentTime
    this.drumBus.gain.setTargetAtTime(beat.drumVol, now, 0.02)
    for (const t of beat.tracks) {
      void loadInstr(t.inst)
      const b = this.bus(t.id)
      b.g.gain.setTargetAtTime(t.mute ? 0 : t.vol, now, 0.02)
      b.send.gain.setTargetAtTime(t.space, now, 0.02)
    }
    // a new tempo keeps the playhead where it is
    if (tempoChanged) {
      const ctx = audio()
      this.t0 = ctx.currentTime - pos * this.stepDur
      this.restartLayers()
    }
  }

  /** Where the playhead is, in steps (fractional), from the audio clock. */
  position(at = audio().currentTime) {
    const n = totalSteps(this.beat)
    const s = (at - this.t0) / this.stepDur
    return ((s % n) + n) % n
  }

  private swingOff(step: number) { return step % 2 === 1 ? this.beat.swing * this.stepDur : 0 }

  /** Start playing (after `countIn` beats of click). Returns the audio time of the first beat. */
  start(countIn = 0): number {
    liveSound(this)
    this.stop()
    const ctx = audio()
    void ctx.resume()
    this.playing = true
    const spb = 60 / this.beat.bpm
    const t = ctx.currentTime + 0.08
    for (let k = 0; k < countIn; k++) playClick(t + k * spb, 'wood', k % 4 === 0 ? 'accent' : 'beat', 0.9)
    this.t0 = t + countIn * spb
    this.next = 0
    this.nextT = this.t0
    this.restartLayers()
    const tick = () => this.schedule()
    tick()
    this.timer = setInterval(tick, 25)
    const frame = () => {
      const now = ctx.currentTime
      let last = -1
      while (this.queue.length && this.queue[0].t <= now) last = this.queue.shift()!.s
      if (last >= 0) { this.step = last; this.stepFns.forEach(f => f(last)) }
      this.raf = requestAnimationFrame(frame)
    }
    this.raf = requestAnimationFrame(frame)
    return this.t0
  }

  private schedule() {
    const ctx = audio()
    const n = totalSteps(this.beat)
    while (this.nextT < ctx.currentTime + 0.12) {
      const s = this.next % n
      const t = this.nextT + this.swingOff(s)
      const b = this.beat
      for (const r of allRows(b)) {
        const v = r.steps[s]
        if (v > 0) this.drum(r.voice, t, Math.min(1.5, v * r.gain))
      }
      for (const tr of b.tracks) {
        if (tr.mute) continue
        for (const note of tr.notes) {
          if (note.s !== s) continue
          const from = this.lastNote.get(tr.id)
          const dur = note.l * this.stepDur * 0.98
          this.held.push(playInstr(tr.inst, note.m, t, note.v, { dest: this.bus(tr.id).g, dur, from }))
          this.lastNote.set(tr.id, note.m)
        }
      }
      if (this.click && s % 4 === 0) playClick(t, 'wood', s % 16 === 0 ? 'accent' : 'beat', 0.6)
      // the loop layers restart at the top of each pass
      if (s === 0 && this.next > 0) this.restartLayers(this.nextT)
      this.queue.push({ t, s })
      this.next++
      this.nextT = this.t0 + this.next * this.stepDur
      if (this.held.length > 300) this.held.splice(0, 150)
    }
  }

  /** (Re)start the recorded loops so their first sample lands on step 0. */
  private restartLayers(at?: number) {
    const ctx = audio()
    const when = at ?? this.t0
    if (at === undefined) { this.layerSrc.forEach(s => { try { s.stop() } catch { /* noop */ } }); this.layerSrc = [] }
    if (!this.playing) return
    for (const L of this.layers) {
      if (L.mute) continue
      const src = ctx.createBufferSource()
      src.buffer = L.buf
      const g = ctx.createGain()
      g.gain.value = L.vol
      src.connect(g).connect(this.loopBus)
      // started late (tempo change, or added while playing): join in at the right point
      const offset = Math.max(0, ctx.currentTime - when)
      if (offset < L.buf.duration) src.start(Math.max(when, ctx.currentTime), offset)
      this.layerSrc.push(src)
    }
    if (this.layerSrc.length > 64) this.layerSrc.splice(0, 32)
  }
  /** Loops changed (added, muted, volume): rejoin them where the playhead is. */
  refreshLayers() {
    if (!this.playing) return
    const ctx = audio()
    this.layerSrc.forEach(s => { try { s.stop() } catch { /* noop */ } })
    this.layerSrc = []
    const passStart = this.t0 + Math.floor((ctx.currentTime - this.t0) / this.loopDur) * this.loopDur
    this.restartLayers(passStart)
  }

  /** The step being heard now (-1 when stopped); `onStep` tells you each time it moves. */
  step = -1
  onStep(f: (step: number) => void) { this.stepFns.add(f); return () => { this.stepFns.delete(f) } }

  private drum(voice: Voice, when: number, vel: number) {
    const buf = this.custom.get(voice)
    if (!buf) { playDrum(voice, when, Math.min(1, vel), this.drumBus, { kit: this.beat.kit }, Math.max(1, vel)); return }
    const ctx = audio()
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = 0.9 * vel * vel
    src.connect(g).connect(this.drumBus)
    src.start(Math.max(when, ctx.currentTime))
  }

  stop() {
    quietSound(this)
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    cancelAnimationFrame(this.raf)
    const now = audio().currentTime
    this.held.forEach(h => h.stop(now))
    this.held = []
    this.layerSrc.forEach(s => { try { s.stop() } catch { /* noop */ } })
    this.layerSrc = []
    this.queue = []
    this.lastNote.clear()
    this.playing = false
    this.step = -1
    this.stepFns.forEach(f => f(-1))
  }

  /** Hit a pad now (finger drumming): plays at once, on the beat's kit. */
  hit(voice: Voice, vel = 0.9) {
    this.drum(voice, 0, Math.min(1.5, vel * (this.beat.voiceVol?.[voice] ?? 1)))
  }
  /** Press a key now; returns the note so it can be released. */
  press(trackId: string, inst: string, midi: number, vel = 0.8): Handle {
    const from = this.lastNote.get(trackId)
    this.lastNote.set(trackId, midi)
    return playInstr(inst, midi, 0, vel, { dest: this.bus(trackId).g, from: instr(inst).slide || instr(inst).synth === 'sub808' ? from : undefined })
  }
}
