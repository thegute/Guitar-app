// Plays a tab back with the guitar synth so you can hear how it should sound,
// reporting which step is sounding so the tab can highlight along.
import { bendOf, isRelease } from '../licks/notation'
import { audio } from './engine'
import { playNote, strum, isPowerChord, activeSound, soundInfo, type SoundId } from './pluck'
import type { FlatStep } from '../tabs/model'
import { BandVoices, type BandEvent } from './band'
import { playClick, type ClickSound } from './metronome'

export class TabPlayer {
  onStep?: (flatIdx: number) => void
  onEnd?: () => void
  private timer: ReturnType<typeof setInterval> | null = null
  private raf = 0
  private queue: { t: number; i: number }[] = []
  private ringing = new Map<number, { stop: (at?: number) => void }>()
  private all: { stop: (at?: number) => void }[] = []
  private endAt = 0
  playing = false
  /** which guitar sound (default: the active sound) */
  sound?: SoundId
  /** overall level (the quiet guide while you play uses less) */
  level = 1
  /** the band under the tab: events for each step, with their offset in beats (see audio/band.ts) */
  band?: { off: number; e: BandEvent }[][]
  /** false: the band only (In time with the band, you play the part) */
  part = true
  /** chord sheets: play each chord with this strum pattern; offs = each step's start inside its bar */
  strum?: { hits: [number, string][]; offs: number[] }
  private voices = new BandVoices()
  /** beats of clicks before the first note (the first play only, not each loop) */
  countIn = 0
  /** a click on every beat while it plays */
  click = false
  clickSound: ClickSound = 'wood'
  /** beats in a bar (where the accented click goes) */
  meter = 4
  /** count-in beats as they sound: 1, 2, 3 … then 0 when the music starts */
  onCount?: (n: number) => void
  private counts: { t: number; n: number }[] = []

  /** Play steps [from, to) at the given tempo (quarter notes per minute). With `loopFrom`, it jumps back there at `to` and keeps going. */
  play(flat: FlatStep[], from: number, bpm: number, to = flat.length, loopFrom?: number) {
    this.stop()
    const ctx = audio()
    void ctx.resume()
    this.playing = true
    let t = ctx.currentTime + 0.15
    const amp = !!soundInfo(this.sound ?? activeSound()).amp
    let i = Math.max(0, from)
    this.endAt = 0
    // where each step starts, in beats (for the clicks)
    const beatAt: number[] = []
    let acc = 0
    for (const f of flat) { beatAt.push(acc); acc += f.step.dur }
    this.counts = []
    if (this.countIn > 0) {
      const spb = 60 / bpm
      for (let k = 0; k < this.countIn; k++) {
        playClick(t + k * spb, this.clickSound, k % this.meter === 0 ? 'accent' : 'beat', 0.8)
        this.counts.push({ t: t + k * spb, n: k + 1 })
      }
      t += this.countIn * spb
      this.counts.push({ t, n: 0 })
    }
    const schedule = () => {
      while (t < ctx.currentTime + 0.3) {
        if (i >= to) {
          if (loopFrom === undefined) break
          i = loopFrom
        }
        const st = flat[i].step
        const spb = 60 / bpm
        if (this.click) {
          const b0 = beatAt[i]
          for (let k = Math.ceil(b0 - 1e-6); k < b0 + st.dur - 1e-6; k++) playClick(t + (k - b0) * spb, this.clickSound, k % this.meter === 0 ? 'accent' : 'beat', 0.6)
        }
        for (const { off, e } of this.band?.[i] ?? []) this.voices.play(e, t + off * spb, spb)
        if (!this.part) { this.queue.push({ t, i }); t += st.dur * spb; i++; continue }
        const notes = st.notes
        const ns = notes.filter(n => n.tech !== 'x')
        notes.forEach(n => { if (n.tech === 'x') { this.ringing.get(n.string)?.stop(t); this.ringing.delete(n.string) } })
        // through a distorted amp, players mute the last note when they pick the next one (otherwise it's mush)
        if (amp && ns.length === 1) { this.ringing.forEach(h => h.stop(t)); this.ringing.clear() }
        const sp = this.strum
        if (sp && st.chord && new Set(ns.map(n => n.midi % 12)).size >= 3) {
          // strum along: down, up, bass note or a short chop at each stroke of the pattern
          const off = sp.offs[i] ?? 0
          const ms = ns.map(n => n.midi)
          this.ringing.forEach(h => h.stop(t))
          this.ringing.clear()
          for (const [p, k] of sp.hits) {
            if (p < off - 1e-6 || p >= off + st.dur - 1e-6) continue
            const at = t + (p - off) * spb
            const h = k === 'B' ? playNote(Math.min(...ms), at, 0.7 * this.level, undefined, { sound: this.sound })
              : strum(k === 'U' ? ms.slice(-4) : ms, at, { up: k === 'U', gain: (k === 'X' ? 0.5 : 0.62) * this.level, sound: this.sound, spread: k === 'X' ? 0.006 : 0.014 })
            if (k === 'X') h.stop(at + 0.11)
            this.all.push(h)
            this.ringing.set(-1 - this.all.length, h)
          }
        } else if (isPowerChord(ns.map(n => n.midi)) && ns.length >= 2) {
          // power chords play as one recorded chord on the amp sounds (palm muted if the tab says PM)
          ns.forEach(n => this.ringing.get(n.string)?.stop(t))
          const h = strum(ns.map(n => n.midi), t, { gain: 0.7 * this.level, sound: this.sound, pm: ns.some(n => n.tech === 'PM'), spread: 0.012 })
          ns.forEach(n => this.ringing.set(n.string, h))
          this.all.push(h)
        } else {
          ns.forEach((n, k) => {
            // a new note on a string stops the one ringing on it, like a real guitar
            this.ringing.get(n.string)?.stop(t)
            const at = t + (ns.length > 2 ? k * 0.012 : 0)
            const b = bendOf(n.tech)
            const h = playNote(n.midi, at, (ns.length > 2 ? 0.55 : 0.75) * this.level, undefined, {
              sound: this.sound, pm: n.tech === 'PM',
              ...(b ? { bend: b, prebent: n.tech?.startsWith('pb'), release: isRelease(n.tech), bendTime: Math.min(0.25, st.dur * spb * 0.5) } : {}),
            })
            this.ringing.set(n.string, h)
            this.all.push(h)
          })
        }
        this.queue.push({ t, i })
        t += (st.dur * 60) / bpm
        i++
      }
      if (loopFrom === undefined && i >= to && !this.endAt) this.endAt = t + 0.2
      if (this.all.length > 400) this.all.splice(0, 200)
    }
    schedule()
    this.timer = setInterval(schedule, 60)
    const tick = () => {
      const now = ctx.currentTime
      let last = -1
      while (this.counts.length && this.counts[0].t <= now) this.onCount?.(this.counts.shift()!.n)
      while (this.queue.length && this.queue[0].t <= now) last = this.queue.shift()!.i
      if (last >= 0) this.onStep?.(last)
      if (this.endAt && now >= this.endAt) {
        this.stop()
        this.onEnd?.()
        return
      }
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    cancelAnimationFrame(this.raf)
    const now = audio().currentTime
    for (const h of this.all) h.stop(now)
    this.all = []
    this.voices.stop(now)
    this.ringing.clear()
    this.queue = []
    this.counts = []
    this.playing = false
  }
}
