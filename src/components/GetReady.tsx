// "Get ready": a few seconds of countdown (big numbers and a soft tick each second) before anything that scores your
// timing starts, so you have time to get your hands on the guitar. Then the usual count-in bar plays.
// How long is set in Settings → You (Off, 3, 5 or 8 seconds); 5 by default.
import { useEffect, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { playClick } from '../audio/metronome'
import { useBack } from '../back'

const KEY = 'kg:getReady'
export const GET_READY_CHOICES = [0, 3, 5, 8]
export function getReadySecs(): number {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '5'); return GET_READY_CHOICES.includes(v) ? v : 5 } catch { return 5 }
}
export function setGetReadySecs(s: number) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage unavailable */ }
}

/** `start(fn)` counts down, then runs fn. `overlay` shows the countdown; tap it (or Back) to cancel. */
export function useGetReady() {
  const [left, setLeft] = useState(0)
  const timer = useRef(0)
  const job = useRef<(() => void) | null>(null)
  useEffect(() => () => clearInterval(timer.current), [])
  const cancel = () => { clearInterval(timer.current); job.current = null; setLeft(0) }
  useBack(left > 0, cancel)
  const tick = (accent: boolean) => {
    try { const ctx = audio(); void ctx.resume(); playClick(ctx.currentTime + 0.02, 'wood', accent ? 'accent' : 'beat', 0.55) } catch { /* no audio yet */ }
  }
  const start = (fn: () => void, secs = getReadySecs()) => {
    clearInterval(timer.current)
    if (secs <= 0) { fn(); return }
    job.current = fn
    let n = secs
    setLeft(n)
    tick(false)
    timer.current = window.setInterval(() => {
      n--
      if (n <= 0) {
        clearInterval(timer.current)
        setLeft(0)
        const f = job.current
        job.current = null
        f?.()
        return
      }
      setLeft(n)
      tick(false)
    }, 1000)
  }
  const overlay = left > 0 ? (
    <div className="get-ready" role="status" aria-live="assertive" onClick={cancel}>
      <div className="get-ready-card" onClick={e => e.stopPropagation()}>
        <span className="get-ready-label">Get ready</span>
        <b key={left} className="get-ready-num">{left}</b>
        <span className="small muted">Then a bar of clicks counts you in.</span>
        <button className="btn sm" onClick={cancel}>Cancel</button>
      </div>
    </div>
  ) : null
  return { start, cancel, counting: left > 0, overlay }
}
