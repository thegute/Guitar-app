// The looper's timing lights: four lamps for the four beats of the bar. During the count-in they light one by one in
// two colours (beat 1 gold, the others teal) so you feel the whole bar before it starts; while playing the beat you're
// on lights, and the box around them (`edgeRef`) flashes on every beat, brighter on the 1. Driven by the audio clock.
import { useEffect, useRef, type RefObject } from 'react'
import { audio } from '../audio/engine'
import type { StudioTransport } from '../studio/transport'

export function BarLights({ t, playing, recording, edgeRef }: { t: StudioTransport; playing: boolean; recording?: boolean; edgeRef?: RefObject<HTMLElement | null> }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const d = el.current
    if (!d) return
    const cells = [...d.querySelectorAll<HTMLElement>('i')]
    const label = d.querySelector('b')!
    const edge = () => edgeRef?.current ?? null
    const clear = () => { cells.forEach(c => { c.dataset.on = '' }); d.dataset.mode = 'off'; label.textContent = ''; const e = edge(); if (e) e.dataset.pulse = '' }
    if (!playing) { clear(); return }
    let raf = 0, last = ''
    const tick = () => {
      const now = audio().currentTime
      const spb = t.barDur / 4
      let key: string
      if (now < t.t0) {
        // counting in: how many beats of the bar before the start have gone by (1..4)
        const left = (t.t0 - now) / spb
        const gone = Math.max(1, Math.min(4, 4 - Math.ceil(left - 0.001) + 1))
        key = `c${gone}`
        if (key !== last) {
          d.dataset.mode = 'count'
          cells.forEach((c, i) => { c.dataset.on = i < gone ? (i === 0 ? 'one' : 'beat') : '' })
          label.textContent = String(gone)
          const e = edge(); if (e) e.dataset.pulse = gone === 1 ? 'one' : 'beat'
        }
      } else {
        const beatsIn = (now - t.t0) / spb
        const beat = Math.floor(beatsIn) % 4
        const bar = Math.floor(beatsIn / 4) % 4
        const flash = beatsIn - Math.floor(beatsIn) < 0.22
        key = `p${beat}${flash ? 'f' : ''}${bar}`
        if (key !== last) {
          d.dataset.mode = recording ? 'rec' : 'play'
          cells.forEach((c, i) => { c.dataset.on = i === beat ? (i === 0 ? 'one' : 'beat') : '' })
          label.textContent = `bar ${bar + 1} · ${beat + 1}`
          const e = edge(); if (e) e.dataset.pulse = flash ? (beat === 0 ? 'one' : 'beat') : ''
        }
      }
      last = key
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); clear() }
  }, [playing, recording, t, edgeRef])
  return (
    <div ref={el} className="bar-lights" data-mode="off" data-testid="bar-lights" aria-hidden>
      <i /><i /><i /><i /><b />
    </div>
  )
}
