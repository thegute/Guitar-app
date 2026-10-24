// Plays a tab back with the guitar synth so you can hear how it should sound,
// reporting which step is sounding so the tab can highlight along.
import { audio } from './engine'
import { playNote, strum, isPowerChord, activeSound, soundInfo, type SoundId } from './pluck'
import type { FlatStep } from '../tabs/model'

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
    const schedule = () => {
      while (t < ctx.currentTime + 0.3) {
        if (i >= to) {
          if (loopFrom === undefined) break
          i = loopFrom
        }
        const st = flat[i].step
        const notes = st.notes
        const ns = notes.filter(n => n.tech !== 'x')
        notes.forEach(n => { if (n.tech === 'x') { this.ringing.get(n.string)?.stop(t); this.ringing.delete(n.string) } })
        // through a distorted amp, players mute the last note when they pick the next one (otherwise it's mush)
        if (amp && ns.length === 1) { this.ringing.forEach(h => h.stop(t)); this.ringing.clear() }
        if (isPowerChord(ns.map(n => n.midi)) && ns.length >= 2) {
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
            const h = playNote(n.midi, at, (ns.length > 2 ? 0.55 : 0.75) * this.level, undefined, { sound: this.sound, pm: n.tech === 'PM' })
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
    this.ringing.clear()
    this.queue = []
    this.playing = false
  }
}
