// The Jam backing track: chords (strummed or picked) in a chosen guitar sound, bass, drums and click, plus your
// recorded loop layers, all locked to one clock so recordings line up with the progression.
import { audio, out } from './engine'
import { playClick } from './metronome'
import { playGrooveBar, loadKit } from './drums'
import { playHit, strumPattern, type Handle } from './strums'
import { BassPlayer, type BassChord } from './bass'
import { loadBank, loadSound, type SoundId } from './pluck'

export interface JamChord {
  midis: number[]
  beats: number
  /** root pitch class and chord tones (semitones above the root), for the bass */
  root?: number
  tones?: number[]
}

export interface Layer {
  id: number
  buffer: AudioBuffer
  muted: boolean
  gain: GainNode
  source?: AudioBufferSourceNode
  /** fine timing, seconds: + plays the layer earlier, − later */
  shift: number
}

export class JamTransport {
  readonly chordsBus: GainNode
  readonly drumsBus: GainNode
  readonly clickBus: GainNode
  readonly loopBus: GainNode
  readonly bassBus: GainNode
  private chords: JamChord[] = []
  private starts: number[] = []
  loopBeats = 16
  bpm = 90
  strum = 'pop'
  drums = 'pop'
  bass = 'off'
  sound: SoundId = 'acoustic'
  private bassPlayer = new BassPlayer()
  /** context time of loop position 0 */
  T0 = 0
  playing = false
  private nextBeat = 0
  private countIn = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private ringing: Handle[] = []
  layers: Layer[] = []

  constructor() {
    const ctx = audio()
    const bus = () => { const g = ctx.createGain(); g.connect(out()); return g }
    this.chordsBus = bus()
    this.drumsBus = bus()
    this.clickBus = bus()
    this.loopBus = bus()
    this.bassBus = bus()
  }

  get spb() { return 60 / this.bpm }
  get loopDur() { return this.loopBeats * this.spb }

  setSong(chords: JamChord[], bpm: number, strum: string, drums: string, bass = 'off', sound: SoundId = 'acoustic') {
    this.chords = chords
    this.bass = bass
    this.sound = sound
    void loadSound(sound)
    if (drums !== 'off') void loadKit()
    if (bass !== 'off') void loadBank('bass')
    this.starts = []
    let b = 0
    for (const c of chords) { this.starts.push(b); b += c.beats }
    this.loopBeats = Math.max(1, b)
    this.bpm = bpm
    this.strum = strum
    this.drums = drums
  }

  setMix(m: { chords: boolean; drums: boolean; click: boolean; loop?: boolean; bass?: boolean }) {
    const ctx = audio()
    const set = (g: GainNode, on: boolean, level = 1) => g.gain.setTargetAtTime(on ? level : 0, ctx.currentTime, 0.015)
    set(this.chordsBus, m.chords)
    set(this.bassBus, m.bass ?? true, 0.6)
    set(this.drumsBus, m.drums, 0.9)
    set(this.clickBus, m.click, 0.8)
    set(this.loopBus, m.loop ?? true, 1.4)
  }

  /** Start playing. `countIn` beats of click come first; returns T0 (when the loop's first beat sounds). */
  start(countIn = 0) {
    this.stop()
    const ctx = audio()
    void ctx.resume()
    this.countIn = countIn
    this.T0 = ctx.currentTime + 0.15 + countIn * this.spb
    this.nextBeat = -countIn
    this.playing = true
    this.schedule()
    this.timer = setInterval(() => this.schedule(), 25)
    for (const l of this.layers) this.startLayer(l, this.T0)
    return this.T0
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    const now = audio().currentTime
    this.ringing.forEach(h => h.stop(now))
    this.ringing = []
    this.bassPlayer.stop(now)
    for (const l of this.layers) {
      try { l.source?.stop() } catch { /* not started */ }
      l.source = undefined
    }
    this.playing = false
  }

  /** Where we are: beat inside the loop (fractional) and which chord is sounding. Negative beat = counting in. */
  position(): { beat: number; loopBeat: number; chord: number; countIn: number } {
    if (!this.playing) return { beat: -1, loopBeat: -1, chord: -1, countIn: 0 }
    const b = (audio().currentTime - this.T0) / this.spb
    if (b < 0) return { beat: b, loopBeat: -1, chord: -1, countIn: Math.ceil(-b) }
    const lb = b % this.loopBeats
    let ci = 0
    for (let i = 0; i < this.starts.length; i++) if (this.starts[i] <= lb) ci = i
    return { beat: b, loopBeat: lb, chord: ci, countIn: 0 }
  }

  /** Context time of the next loop start at least `minAhead` seconds away. */
  nextLoopStart(minAhead = 0.1) {
    const now = audio().currentTime + minAhead
    if (now <= this.T0) return this.T0
    return this.T0 + Math.ceil((now - this.T0) / this.loopDur) * this.loopDur
  }

  addLayer(buffer: AudioBuffer, id: number) {
    const g = audio().createGain()
    g.connect(this.loopBus)
    const l: Layer = { id, buffer, muted: false, gain: g, shift: 0 }
    this.layers.push(l)
    if (this.playing) this.startLayer(l, this.nextLoopStart(0.05))
    return l
  }
  removeLayer(id: number) {
    const l = this.layers.find(x => x.id === id)
    if (!l) return
    try { l.source?.stop() } catch { /* not started */ }
    l.gain.disconnect()
    this.layers = this.layers.filter(x => x !== l)
  }
  clearLayers() {
    for (const l of [...this.layers]) this.removeLayer(l.id)
  }
  muteLayer(id: number, muted: boolean) {
    const l = this.layers.find(x => x.id === id)
    if (!l) return
    l.muted = muted
    l.gain.gain.setTargetAtTime(muted ? 0 : 1, audio().currentTime, 0.015)
  }

  /** Nudge a layer earlier (+) or later (−) by some milliseconds, without stopping. */
  nudgeLayer(id: number, ms: number) {
    const l = this.layers.find(x => x.id === id)
    if (!l) return 0
    l.shift += ms / 1000
    if (this.playing) {
      const old = l.source
      const at = audio().currentTime + 0.03
      this.startLayer(l, at)
      try { old?.stop(at) } catch { /* not started */ }
    }
    return Math.round(l.shift * 1000)
  }

  private startLayer(l: Layer, at: number) {
    const ctx = audio()
    const src = ctx.createBufferSource()
    src.buffer = l.buffer
    src.loop = true
    src.loopStart = 0
    src.loopEnd = Math.min(this.loopDur, l.buffer.duration)
    src.connect(l.gain)
    l.gain.gain.value = l.muted ? 0 : 1
    // if starting mid-loop, jump into the buffer at the matching spot
    const pos = at > this.T0 ? (at - this.T0) % this.loopDur : 0
    const offset = (((pos + l.shift) % this.loopDur) + this.loopDur) % this.loopDur
    src.start(Math.max(at, ctx.currentTime), offset)
    l.source = src
  }

  private chordIndexAt(lb: number) {
    let ci = 0
    for (let i = 0; i < this.starts.length; i++) if (this.starts[i] <= lb) ci = i
    return ci
  }

  private bassChord(i: number): BassChord | null {
    const c = this.chords[i]
    if (!c) return null
    return { root: c.root ?? (c.midis[0] ?? 40) % 12, tones: c.tones ?? [0, 4, 7] }
  }

  private schedule() {
    const ctx = audio()
    const horizon = ctx.currentTime + 0.3
    const pat = strumPattern(this.strum)
    const first = pat.hits[0]?.[1] === 'B' || /^a/.test(pat.hits[0]?.[1] ?? '') ? 'B' : 'D'
    while (this.T0 + this.nextBeat * this.spb <= horizon) {
      const b = this.nextBeat
      const t = this.T0 + b * this.spb
      this.nextBeat++
      if (b < 0) {
        // count-in clicks always sound
        playClick(t, 'wood', (b + this.countIn) % 4 === 0 ? 'accent' : 'beat', 0.9)
        continue
      }
      const lb = b % this.loopBeats
      playClick(t, 'click', lb % 4 === 0 ? 'accent' : 'beat', 0.45, this.clickBus)
      if (lb % 4 === 0 && this.drums !== 'off') {
        const beats = Math.min(4, this.loopBeats - lb)
        // a fill in the last bar of the loop, a crash when it comes round again
        const lastBar = lb + 4 >= this.loopBeats && this.loopBeats >= 8
        playGrooveBar(this.drums, t, this.spb, 0.9, this.drumsBus, beats, 0, { fill: lastBar, crash: lb === 0 && b > 0 })
      }
      if (!this.chords.length) continue
      const ci = this.chordIndexAt(lb)
      const ch = this.chords[ci]
      const pos = lb % 4
      if (this.bass !== 'off') {
        this.bassPlayer.beat(this.bass, pos, t, this.spb, 1, this.bassBus, off => {
          const i = this.chordIndexAt((lb + off) % this.loopBeats)
          const c = this.bassChord(i)
          return c ? { c, next: this.bassChord((i + 1) % this.chords.length) } : null
        })
      }
      const hits = pat.hits.filter(([p]) => p >= pos && p < pos + 1)
      const isStart = this.starts[ci] === lb
      if (isStart) {
        // let the old chord stop as the new one starts
        this.ringing.forEach(h => h.stop(t))
        this.ringing = []
        if (!hits.some(([p]) => p - pos < 0.26)) hits.unshift([pos, first])
      }
      for (const [p, kind] of hits) {
        const at = t + (p - pos) * this.spb
        // a new strum re-strikes the same strings, so the last one stops (single picked notes ring on)
        if (kind === 'D' || kind === 'U' || kind === 'S' || kind === 'X' || kind === 'P') {
          this.ringing.forEach(h => h.stop(at + 0.004))
          this.ringing = []
        }
        this.ringing.push(...playHit(kind, ch.midis, at, 0.5, this.chordsBus, this.sound))
      }
      if (this.ringing.length > 80) this.ringing.splice(0, this.ringing.length - 80)
    }
  }
}
