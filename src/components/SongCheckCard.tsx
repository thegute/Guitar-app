// The song check card (what a song asks of you) and the retune warning, shown above the tab.
import type { SongCheck } from '../play/songCheck'
import { LEVELS } from '../tabs/songbook'

const SPEED = (v: number) => (v === 1 ? 'full speed' : v === 0.75 ? '¾ speed' : '½ speed')

export function SongCheckCard({ check, speed, onSpeed, onLoopBar, onClose }: {
  check: SongCheck
  speed: number
  onSpeed: (v: number) => void
  onLoopBar: (bar: number) => void
  onClose: () => void
}) {
  const lv = LEVELS.find(l => l.id === check.level)!
  return (
    <section className="song-check" aria-label="Song check">
      <div className="sc-head">
        <b>Song check</b>
        <span className="sc-level" title={check.why.length ? `Because of: ${check.why.join(', ')}` : undefined}>
          <span aria-hidden="true">{'●'.repeat(check.level)}{'○'.repeat(4 - check.level)}</span> Level {check.level}, {lv.label.toLowerCase()}
        </span>
        <button className="btn sm ghost" onClick={onClose}>Got it</button>
      </div>
      <dl className="sc-list small">
        <div><dt>Chords</dt><dd>{check.chords.length ? check.chords.slice(0, 12).join('  ') + (check.chords.length > 12 ? ' …' : '') : 'none named in this tab'}</dd></div>
        {check.barre.length > 0 && <div><dt>Barre</dt><dd>{check.barre.slice(0, 8).join(', ')}</dd></div>}
        {check.techniques.length > 0 && <div><dt>Techniques</dt><dd>{check.techniques.map(t => `${t.label} (${t.count})`).join(', ')}</dd></div>}
        {check.fastest && <div><dt>Hardest bar</dt><dd>bar {check.fastest.bar + 1}, about {Math.round(check.fastest.nps * 10) / 10} notes a second at full speed</dd></div>}
        <div><dt>Neck</dt><dd>{check.maxFret <= 4 ? 'first position (frets 0–4)' : `up to fret ${check.maxFret}`}{check.capo ? `, capo on ${check.capo}` : ''}</dd></div>
      </dl>
      <div className="row sc-actions">
        <span className="small">Start at <b>{SPEED(check.startSpeed)}</b>{check.why.length ? <span className="muted"> ({check.why.join(', ')})</span> : null}.</span>
        {speed !== check.startSpeed && <button className="btn sm" onClick={() => onSpeed(check.startSpeed)}>Use {SPEED(check.startSpeed)}</button>}
        {check.fastest && <button className="btn sm" onClick={() => onLoopBar(check.fastest!.bar)}>⟲ Loop bar {check.fastest.bar + 1}</button>}
      </div>
    </section>
  )
}

export function RetuneNotice({ check, current, onTune, onClose }: {
  check: SongCheck
  current: string
  onTune: () => void
  onClose: () => void
}) {
  const t = check.tuning
  if (!t) return null
  return (
    <div className="notice retune" role="status">
      <span>
        {t.id ? <>This song is in <b>{t.name}</b> ({t.notes}). </> : <>This tab uses an unusual tuning: <b>{t.notes}</b>. </>}
        You're tuned to {current}, so the notes won't match until you retune.
      </span>
      <span className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
        <button className="btn sm primary" onClick={onTune}>{t.id ? `Tune to ${t.name}` : 'Open the tuner'}</button>
        <button className="btn sm ghost" onClick={onClose} aria-label="Hide this">✕</button>
      </span>
    </div>
  )
}
