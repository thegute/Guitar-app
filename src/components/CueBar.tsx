// Slim Visual Count-in & First-Beat Cue Bar (Batch H3).
// Driven directly from the audio clock via requestAnimationFrame so beats never drift or trigger React re-renders.
import { useEffect, useRef } from 'react'
import { cueStateFromBeats } from '../play/cueState'

export interface CueReadout {
  beatNow: number
  fromBeat: number
  countInTotal: number
  swung?: boolean
}

interface CueBarProps {
  active: boolean
  meter: number
  dropWord?: 'GO' | 'REC'
  read: () => CueReadout | null
  compact?: boolean
  countNumTestId?: string
}

export function CueBar({ active, meter, dropWord = 'GO', read, compact, countNumTestId }: CueBarProps) {
  const root = useRef<HTMLDivElement>(null)
  const nBeats = Math.max(1, Math.min(12, Math.round(meter || 4)))

  useEffect(() => {
    const el = root.current
    if (!el) return
    const pips = [...el.querySelectorAll<HTMLElement>('.cb-pip')]
    const label = el.querySelector<HTMLElement>('.cb-label')
    const sub = el.querySelector<HTMLElement>('.cb-sub')
    const andChip = el.querySelector<HTMLElement>('.cb-and')
    const countNum = el.querySelector<HTMLElement>('.cb-count-num')

    const clear = () => {
      el.dataset.phase = 'idle'
      el.dataset.beatOne = '0'
      el.style.setProperty('--cue-prog', '0%')
      pips.forEach(p => { p.dataset.on = '' })
      if (label) label.textContent = ''
      if (sub) sub.textContent = ''
      if (andChip) andChip.hidden = true
      if (countNum) { countNum.hidden = true; countNum.textContent = ''; if (countNumTestId) countNum.removeAttribute('data-testid') }
    }

    if (!active) { clear(); return }

    let raf = 0
    let lastKey = ''
    const tick = () => {
      const r = read()
      if (!r) {
        if (lastKey !== 'wait') { lastKey = 'wait'; clear() }
        raf = requestAnimationFrame(tick)
        return
      }
      const st = cueStateFromBeats({
        beatNow: r.beatNow,
        fromBeat: r.fromBeat,
        meter: nBeats,
        countInTotal: r.countInTotal,
        swung: r.swung,
      })

      const progPct = st.phase === 'count' ? `${Math.round(st.countFrac * 1000) / 10}%` : st.phase === 'drop' ? '100%' : '0%'
      el.style.setProperty('--cue-prog', progPct)

      const key = `${st.phase}|${st.bar}|${st.beat}|${st.isBeatOne ? 1 : 0}|${st.showAnd ? 1 : 0}`
      if (key !== lastKey) {
        lastKey = key
        el.dataset.phase = st.phase
        el.dataset.beatOne = st.isBeatOne ? '1' : '0'
        pips.forEach((p, i) => {
          const b = i + 1
          if (st.phase === 'count') p.dataset.on = b <= st.beat ? (b === 1 ? 'one' : 'beat') : ''
          else p.dataset.on = b === st.beat ? (b === 1 ? 'one' : 'beat') : ''
        })
        if (andChip) andChip.hidden = !st.showAnd
        if (label) {
          if (st.phase === 'count') {
            label.textContent = st.countBars > 1
              ? (st.bar === 1 ? `Count-in · Bar 1/${st.countBars} (Listen)` : `Count-in · Bar ${st.bar}/${st.countBars} (Ready!)`)
              : 'Count-in · Ready'
          } else if (st.phase === 'drop') {
            label.textContent = `Beat 1 · ${dropWord}!`
          } else {
            label.textContent = `Bar ${st.bar}`
          }
        }
        if (sub) {
          sub.textContent = st.phase === 'drop' ? dropWord : `${st.beat}/${nBeats}`
        }
        if (countNum) {
          if (st.phase === 'count') {
            const rem = Math.max(1, Math.ceil(r.fromBeat - r.beatNow - 0.02))
            countNum.hidden = false
            countNum.textContent = String(rem)
            if (countNumTestId) countNum.setAttribute('data-testid', countNumTestId)
          } else {
            countNum.hidden = true
            countNum.textContent = ''
            if (countNumTestId) countNum.removeAttribute('data-testid')
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); clear() }
  }, [active, nBeats, dropWord, read, countNumTestId])

  if (!active) return null

  return (
    <div
      ref={root}
      className={`cue-bar${compact ? ' compact' : ''}`}
      data-phase="idle"
      data-beat-one="0"
      data-testid="cue-bar"
      role="status"
      aria-live="off"
      aria-label="Visual count-in and beat cue"
    >
      <span className="cb-label small" />
      <span className="cb-pips" aria-hidden="true">
        {Array.from({ length: nBeats }, (_, i) => (
          <i key={i} className={`cb-pip${i === 0 ? ' cb-one' : ''}`}>{i + 1}</i>
        ))}
        <span className="cb-and" hidden>&amp;</span>
      </span>
      <span className="cb-right">
        <b className="cb-count-num tabular" hidden />
        <span className="cb-sub small tabular" />
      </span>
    </div>
  )
}
