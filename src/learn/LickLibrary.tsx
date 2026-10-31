// Must-know licks: the licks every player of a style should have under their fingers, each with a breakdown (what it
// is, how to play it step by step, the secret to making it sound right, where to use it and a tempo to aim for).
// Pick a key (open-string styles use a capo), hear it, and open it in Play so the app follows you.
import { useBack } from '../back'
import { useMemo, useState } from 'react'
import { useInstrument } from '../instrument'
import { LICKS, lickById, type LickDef } from '../licks/library'
import { LICK_STYLES, lickStyle, type LickStyleId } from '../licks/styles'
import { keyLabel, lickInKey, placeFor } from '../licks/generator'
import { Chips, usePersist } from '../components/Controls'
import { Preview } from '../components/ProgressionTabs'
import { openInPlay } from '../nav'
import { KEYS } from '../theory/notes'
import { useScreenInfo } from '../assistant/screen'
import { addToChain } from '../licks/chain'

const LEVEL = ['', 'Easy', 'Medium', 'Hard']
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t)

export function LickLibrary({ initial, onExit }: { initial?: string; onExit: () => void }) {
  const first = initial ? lickById(initial) : undefined
  const [styleSaved, setStyle] = usePersist<string>('mustStyle', 'blues')
  const styleRaw = styleSaved === 'jawaiian' ? 'reggaerock' : styleSaved
  const [style, setStyleNow] = useState<LickStyleId>(((first?.style ?? (LICK_STYLES.some(s => s.id === initial) ? initial : styleRaw)) as LickStyleId) || 'blues')
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState<string | null>(first?.id ?? null)
  const pick = (s: LickStyleId) => { setStyleNow(s); setStyle(s); setOpen(null) }
  const st = lickStyle(style)
  const list = useMemo(() => LICKS.filter(l => l.style === style && (all || l.must)).sort((a, b) => a.level - b.level), [style, all])
  const cur = open ? lickById(open) : null
  // the phone's Back button steps back inside the licks (a lick → the list → must-know) before leaving
  useBack(!!open, () => setOpen(null))
  useBack(all && !open, () => setAll(false))
  if (cur) return <LickDetail lick={cur} onBack={() => (first && open === first.id && initial === first.id ? onExit() : setOpen(null))} />
  const counts = (s: LickStyleId) => LICKS.filter(l => l.style === s && l.must).length
  return (
    <div className="stack lick-library">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
      </div>
      <h1 style={{ margin: 0 }}>Must-know licks</h1>
      <p className="small muted" style={{ margin: 0 }}>The licks every player of a style should know, each explained step by step. Tap one to learn it, hear it in any key and play along.</p>
      <label className="field">
        <span>Style</span>
        <select className="select" value={style} onChange={e => pick(e.target.value as LickStyleId)}>
          {[...new Set(LICK_STYLES.map(s => s.group))].map(g => (
            <optgroup key={g} label={g}>{LICK_STYLES.filter(s => s.group === g).map(s => <option key={s.id} value={s.id}>{s.label} ({counts(s.id)})</option>)}</optgroup>
          ))}
        </select>
      </label>
      <p className="small muted" style={{ margin: 0 }}>{st.feel} <i>Listen to: {st.listen}.</i></p>
      {LICKS.some(l => l.style === style && !l.must) && <Chips label="Which licks" items={[{ id: 'must', label: 'Must-know' }, { id: 'all', label: `Every ${st.label.replace(/ \(.*\)$/, '').toLowerCase()} lick` }]} value={all ? 'all' : 'must'} onChange={v => setAll(v === 'all')} />}
      <ul className="lick-list">
        {list.map(l => (
          <li key={l.id}>
            <button className="lick-card" onClick={() => setOpen(l.id)}>
              <span className="lick-top"><b>{l.name}</b><span className={`lvl lvl-${l.level}`}>{LEVEL[l.level]}</span></span>
              <span className="small muted">{kindLabel(l)} · over {l.chord ?? keyLabel(l.ref, l.minor ?? st.minor)} · key of {keyLabel(l.ref, l.minor ?? st.minor)}</span>
              {l.must && <span className="small">{clip(l.must.about, 130)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const kindLabel = (l: LickDef) => ({ lick: 'Lick', arpeggio: 'Arpeggio', run: 'Run', riff: 'Riff', ending: 'Ending', 'double-stop': 'Double stops', turnaround: 'Turnaround' } as Record<string, string>)[l.kind]

function LickDetail({ lick, onBack }: { lick: LickDef; onBack: () => void }) {
  const inst = useInstrument()
  const st = lickStyle(lick.style)
  const minor = lick.minor ?? st.minor
  const [key, setKey] = useState(lick.ref)
  useScreenInfo('lick', { label: `Lick "${lick.name}" (${st.label}) in ${key}${minor ? ' minor' : ''}`, summary: `In Must-know licks, looking at "${lick.name}", a ${st.label} lick (level ${lick.level}${lick.chord ? `, over ${lick.chord} in the written key` : ''}), shown in ${key}${minor ? ' minor' : ''}.${lick.must ? ` What it is: ${lick.must.about}` : ''}` })
  const [slow, setSlow] = useState(false)
  const [chained, setChained] = useState(0)
  const keys = KEYS.filter(k => !!placeFor(lick, k))
  const tempo = Math.round((lick.bpm ?? st.bpm) * (slow ? 0.6 : 1))
  const placed = useMemo(() => lickInKey(lick, key, inst.midis, tempo), [lick, key, inst.midis, tempo])
  const doc = placed ? { id: `lick:${lick.id}:${key}:${inst.id}:${tempo}`, title: placed.song.title, source: 'lesson' as const, inst: inst.id, key: { root: key, minor }, song: placed.song, updated: Date.now() } : null
  const b = lick.must
  return (
    <div className="stack lick-detail">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onBack}>← Licks</button>
        <span className={`lvl lvl-${lick.level}`}>{LEVEL[lick.level]}</span>
      </div>
      <h1 style={{ margin: 0 }}>{lick.name}</h1>
      <p className="small muted" style={{ margin: 0 }}>{st.label} · {kindLabel(lick)} · over {placed?.chord ?? lick.chord} · in the style of {st.listen.split(', ').slice(0, 2).join(' and ')}</p>
      {b && <p style={{ margin: 0 }}>{b.about}</p>}
      <div className="panel stack" style={{ gap: 8 }}>
        <Chips label="Key" wrap keyStyle items={keys.map(k => ({ id: k, label: keyLabel(k, minor) }))} value={key} onChange={setKey} />
        <Chips label="Speed" items={[{ id: 'full', label: `Full speed (${lick.bpm ?? st.bpm} bpm)` }, { id: 'slow', label: 'Slow (60%)' }]} value={slow ? 'slow' : 'full'} onChange={v => setSlow(v === 'slow')} />
        {placed && placed.capo > 0 && <p className="notice small" style={{ margin: 0 }}>Capo on the {placed.capo}{['st', 'nd', 'rd'][placed.capo - 1] ?? 'th'} fret. Fret numbers count from the capo.</p>}
        {doc && <Preview doc={doc} minor={minor} />}
        {doc && <button className="btn primary" onClick={() => openInPlay(doc)}>Play along (it listens to you)</button>}
        {(lick.meter ?? 4) === 4 && <button className="btn sm" onClick={() => { addToChain(lick.id, key); setChained(n => n + 1) }}>{chained ? `✓ Added to your lick chain${chained > 1 ? ` (×${chained})` : ''}` : '＋ Add to my lick chain'}</button>}
        {chained > 0 && <span className="small muted">Find it in Learn → Explore → Lick chainer, or Songs → Exercises.</span>}
      </div>
      {b && (
        <>
          <section className="panel stack" style={{ gap: 6 }}>
            <h2 style={{ margin: 0 }}>How to play it</h2>
            <ol className="lick-steps">{b.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </section>
          <section className="panel stack" style={{ gap: 6 }}>
            <h2 style={{ margin: 0 }}>The secret</h2>
            <p style={{ margin: 0 }}>{b.tip}</p>
          </section>
          <section className="panel stack" style={{ gap: 6 }}>
            <h2 style={{ margin: 0 }}>Where to use it</h2>
            <p style={{ margin: 0 }}>{b.use}</p>
            <p className="small muted" style={{ margin: 0 }}>Goal: {b.goal} bpm, clean. Start slow (60%), then In time with the speed trainer.</p>
          </section>
        </>
      )}
    </div>
  )
}
