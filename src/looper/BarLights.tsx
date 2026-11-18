// The looper's visual count-in and first-beat cue bar: four lamps for the beats of the bar.
// During count-in they fill with a sweep bar (beat 1 gold, the others teal) into a bright Beat 1 drop cue ("1 · REC!" / "1 · GO!"),
// then pulse softly on every Beat 1 while looping. Driven straight from the audio clock.
import { useEffect, useRef, type RefObject } from 'react'
import { audio } from '../audio/engine'
import { cueStateFromBeats } from '../play/cueState'
import type { StudioTransport } from '../studio/transport'

export function BarLights({ t, playing, recording, edgeRef, meter = 4 }: { t: StudioTransport; playing: boolean; recording?: boolean; edgeRef?: RefObject<HTMLElement | null>; meter?: number }) {
  const el = useRef<HTMLDivElement>(null)
  const nBeats = Math.max(1, Math.round(meter || 4))
  useEffect(() => {
    const d = el.current
    if (!d) return
    const cells = [...d.querySelectorAll<HTMLElement>('i')]
    const label = d.querySelector('b')!
    const edge = () => edgeRef?.current ?? null
    const clear = () => {
      cells.forEach(c => { c.dataset.on = '' })
      d.dataset.mode = 'off'
      d.style.setProperty('--cue-prog', '0%')
      label.textContent = ''
      const e = edge(); if (e) e.dataset.pulse = ''
    }
    if (!playing) { clear(); return }
    let raf = 0, last = ''
    const tick = () => {
      const now = audio().currentTime
      const spb = t.barDur / nBeats
      const beatNow = (now - t.t0) / spb
      const st = cueStateFromBeats({
        beatNow,
        fromBeat: 0,
        meter: nBeats,
        countInTotal: t.countInTotal || nBeats,
        swung: t.countInSwung,
      })
      const prog = st.phase === 'count' ? `${Math.round(st.countFrac * 1000) / 10}%` : st.phase === 'drop' ? '100%' : '0%'
      d.style.setProperty('--cue-prog', prog)

      const flash = st.beatFrac < 0.24
      const key = `${st.phase}|${st.bar}|${st.beat}|${flash ? 'f' : ''}|${recording ? 'r' : ''}`
      if (key !== last) {
        last = key
        if (st.phase === 'count') {
          d.dataset.mode = 'count'
          cells.forEach((c, i) => { c.dataset.on = i + 1 <= st.beat ? (i === 0 ? 'one' : 'beat') : '' })
          label.textContent = st.countBars > 1 ? `B${st.bar} · ${st.beat}` : String(st.beat)
          const e = edge(); if (e) e.dataset.pulse = st.beat === 1 ? 'one' : 'beat'
        } else if (st.phase === 'drop') {
          d.dataset.mode = recording ? 'rec-drop' : 'drop'
          cells.forEach((c, i) => { c.dataset.on = i === 0 ? 'one' : '' })
          label.textContent = recording ? '1 · REC!' : '1 · GO!'
          const e = edge(); if (e) e.dataset.pulse = 'drop'
        } else {
          d.dataset.mode = recording ? 'rec' : 'play'
          cells.forEach((c, i) => { c.dataset.on = i + 1 === st.beat ? (i === 0 ? 'one' : 'beat') : '' })
          label.textContent = `bar ${st.bar} · ${st.beat}`
          const e = edge(); if (e) e.dataset.pulse = flash ? (st.beat === 1 ? 'one' : 'beat') : ''
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); clear() }
  }, [playing, recording, t, edgeRef, nBeats])
  return (
    <div ref={el} className="bar-lights" data-mode="off" data-testid="bar-lights" aria-hidden>
      {Array.from({ length: nBeats }, (_, i) => <i key={i} />)}
      <b />
    </div>
  )
}
