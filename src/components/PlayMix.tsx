// Play's "sounds while you play" strip (owner 2026-11-12): a metronome click you can turn on and slide from silent to
// loud, right under the play buttons, plus how much of the band / your part you hear when those are playing. The same
// place will take the backing track and the Strum Machine. Folds to one small chip (remembered).
import { useEffect, useState } from 'react'
import { catLevel, setCatLevel } from '../audio/engine'
import { usePersist } from './Controls'
import { MixSlider } from './MixSlider'
import { Ico } from './Icon'

export function PlayMix({ click, onClick, mix, band, bandAvail, bandOn, onBand }: {
  /** the click is on */
  click: boolean
  onClick: (on: boolean) => void
  /** show the your part ↔ band balance (In time with the tab or the band playing) */
  mix: boolean
  band: boolean
  bandAvail: boolean
  bandOn: boolean
  onBand: (on: boolean) => void
}) {
  const [open, setOpen] = usePersist('playMixOpen', true)
  const [lvl, setLvl] = useState(() => Math.round(catLevel('click') * 100))
  useEffect(() => { setCatLevel('click', lvl / 100) }, [lvl])
  if (!open) {
    return (
      <div className="play-mix folded">
        <button className="btn sm ghost" onClick={() => setOpen(true)} aria-expanded={false} data-testid="play-mix-open"><Ico n="sound" /> Sounds{click ? ` · click ${lvl}%` : ''}</button>
      </div>
    )
  }
  return (
    <div className="play-mix" role="group" aria-label="Sounds while you play" data-testid="play-mix">
      <span className="pm-item">
        <button className={`btn sm pm-toggle${click ? ' on' : ''}`} aria-pressed={click} onClick={() => onClick(!click)} data-testid="pm-click"><Ico n="timer" /> Click</button>
        <input type="range" min={0} max={150} step={5} value={click ? lvl : 0} disabled={!click} aria-label="Click volume"
          onChange={e => setLvl(Number(e.target.value))} data-testid="pm-click-vol" />
        <span className="small tabular pm-val">{click ? `${lvl}%` : 'off'}</span>
      </span>
      {bandAvail && (
        <button className={`btn sm pm-toggle${bandOn ? ' on' : ''}`} aria-pressed={bandOn} onClick={() => onBand(!bandOn)} data-testid="pm-band"><Ico n="drum" /> Band</button>
      )}
      {mix && <span className="pm-item pm-mix"><MixSlider band={band} compact /></span>}
      <button className="btn sm ghost pm-fold" onClick={() => setOpen(false)} aria-label="Fold the sounds strip"><Ico n="minus" /></button>
    </div>
  )
}
