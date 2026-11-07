// The beat light: a count-in number, then a flash on every beat (bigger on beat 1) with bar.beat, on the audio clock.
import { useEffect, useRef } from 'react'
import { audio } from '../audio/engine'
import type { StudioTransport } from './transport'

export function BeatLight({ t, playing, big = false, label }: { t: StudioTransport; playing: boolean; big?: boolean; label?: string }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const d = el.current
    if (!d) return
    const b = d.querySelector('b')!
    if (!playing) { d.dataset.state = 'off'; b.textContent = label ?? ''; return }
    let raf = 0, last = ''
    const tick = () => {
      const now = audio().currentTime
      const spb = 60 / t.beat.bpm
      let state: string, text: string
      if (now < t.t0) { state = 'count'; text = String(Math.ceil((t.t0 - now) / spb - 0.001)) }
      else {
        const pos = t.position(now)
        const beat = Math.floor(pos / 4)
        state = pos / 4 - beat < 0.28 ? (beat % 4 === 0 ? 'one' : 'beat') : 'idle'
        text = label ?? `${Math.floor(beat / 4) + 1}.${(beat % 4) + 1}`
      }
      if (state + text !== last) { d.dataset.state = state; b.textContent = text; last = state + text }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, t, label])
  return <div ref={el} className={`st-light${big ? ' big' : ''}`} data-state="off" aria-hidden><b /></div>
}
