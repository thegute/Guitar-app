// Lick maker: pick a style, key, length and level and it builds a phrase from the lick library (a motif, an answer
// and an ending, kept in one area of the neck). Hear it, open it in Play, or learn the licks it was built from.
import { useMemo, useState } from 'react'
import { useInstrument } from '../instrument'
import { LICK_STYLES, lickStyle, type LickStyleId } from '../licks/styles'
import { makePhrase, type LickFilter } from '../licks/generator'
import type { SongDoc } from '../tabs/library'
import { Chips, KeyPicker, usePersist } from './Controls'
import { Preview } from './ProgressionTabs'
import { learnGo } from '../nav'

const GROUPS = [...new Set(LICK_STYLES.map(s => s.group))]

export function LickMaker({ onOpen, fixedKey }: { onOpen: (d: SongDoc) => void; fixedKey?: string }) {
  const inst = useInstrument()
  const [styleRaw, setStyle] = usePersist<string>('lickStyle', 'blues')
  const style = (LICK_STYLES.some(s => s.id === styleRaw) ? styleRaw : 'blues') as LickStyleId
  const [keyPref, setKey] = usePersist('lickKey', 'A')
  const [bars, setBars] = usePersist<1 | 2 | 4>('lickBars', 2)
  const [level, setLevel] = usePersist<1 | 2 | 3>('lickLevel', 2)
  const [kind, setKind] = usePersist<LickFilter>('lickKind', 'any')
  const [made, setMade] = useState<{ doc: SongDoc; parts: { id: string; name: string; must: boolean }[]; capo: number } | null>(null)
  const key = fixedKey ?? keyPref
  const st = lickStyle(style)
  const roll = (over?: Partial<{ style: LickStyleId; bars: 1 | 2 | 4; level: 1 | 2 | 3; key: string; kind: LickFilter }>) => {
    const seed = Math.floor(Math.random() * 1e9)
    const o = { style: over?.style ?? style, root: over?.key ?? key, bars: over?.bars ?? bars, level: over?.level ?? level, kind: over?.kind ?? kind, seed }
    const m = makePhrase(o, inst.midis)
    const minor = lickStyle(o.style).minor
    setMade({
      doc: { id: `jam:lick:${inst.id}:${o.style}:${o.root}:${seed.toString(36)}`, title: m.song.title, source: 'jam', inst: inst.id, key: { root: o.root, minor }, song: m.song, updated: Date.now() },
      parts: m.parts.map(p => ({ id: p.id, name: p.name, must: !!p.must })),
      capo: m.capo,
    })
  }
  const groups = useMemo(() => GROUPS.map(g => ({ g, styles: LICK_STYLES.filter(s => s.group === g) })), [])
  return (
    <div className="stack lick-maker" style={{ gap: 8 }}>
      <label className="field">
        <span>Style</span>
        <select className="select" value={style} onChange={e => { const v = e.target.value as LickStyleId; setStyle(v); if (made) roll({ style: v }) }}>
          {groups.map(({ g, styles }) => (
            <optgroup key={g} label={g}>{styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
          ))}
        </select>
      </label>
      <p className="small muted" style={{ margin: 0 }}>{st.feel} <i>Listen to: {st.listen}.</i></p>
      {!fixedKey && <KeyPicker value={keyPref} onChange={v => { setKey(v); if (made) roll({ key: v }) }} />}
      <Chips label="What kind" items={[{ id: 'any', label: 'Anything' }, { id: 'licks', label: 'Licks' }, { id: 'arpeggios', label: 'Arpeggios' }, { id: 'runs', label: 'Runs & riffs' }] as { id: LickFilter; label: string }[]} value={kind} onChange={v => { setKind(v); if (made) roll({ kind: v }) }} />
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Chips label="Length" items={[{ id: 1, label: '1 bar' }, { id: 2, label: '2 bars' }, { id: 4, label: '4 bars' }]} value={bars} onChange={v => { setBars(v); if (made) roll({ bars: v }) }} />
        <Chips label="Level" items={[{ id: 1, label: 'Easy' }, { id: 2, label: 'Medium' }, { id: 3, label: 'Hard' }]} value={level} onChange={v => { setLevel(v); if (made) roll({ level: v }) }} />
      </div>
      <div className="row">
        <button className="btn" onClick={() => roll()}>🎲 {made ? 'Another lick' : 'Make a lick'}</button>
        {made && <button className="btn primary" onClick={() => onOpen(made.doc)}>Open in Play</button>}
      </div>
      {made && (
        <>
          {made.capo > 0 && <p className="notice small" style={{ margin: 0 }}>Capo on the {made.capo}{['st', 'nd', 'rd'][made.capo - 1] ?? 'th'} fret: this style uses open strings, so the numbers are counted from the capo (0 = the capo).</p>}
          <Preview doc={made.doc} minor={st.minor} />
          <p className="small muted" style={{ margin: 0 }}>
            Built from: {made.parts.map((p, i) => (
              <span key={p.id + i}>{i ? ', ' : ''}{p.must ? <button className="link-btn" onClick={() => learnGo({ licks: p.id })}>{p.name}</button> : p.name}</span>
            ))}
          </p>
        </>
      )}
      <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => learnGo({ licks: style })}>📖 Must-know {st.label.replace(/ \(.*\)$/, '').toLowerCase()} licks, explained</button>
    </div>
  )
}
