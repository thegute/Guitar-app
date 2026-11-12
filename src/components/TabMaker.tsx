// Make a tab: licks and solos, chord melodies and riffs in the styles the owner loves, over Jam's chords (or the
// style's own progression), written fresh each time by the composer (src/compose). Hear it, roll another, open it in
// Play. Fingerpicking patterns stay in ProgressionTabs.
import { useEffect, useMemo, useState } from 'react'
import { Ico } from './Icon'
import { useInstrument } from '../instrument'
import { compose, type Part } from '../compose'
import { ALIAS, GROUPS, STYLES, style as styleOf, type StyleId } from '../compose/styles'
import type { ArrLevel } from '../compose/arrange'
import type { ModeId, ProgChord } from '../theory/progressions'
import type { SongDoc } from '../tabs/library'
import { Chips, KeyPicker, usePersist } from './Controls'
import { Preview } from './ProgressionTabs'
import { haptic } from '../audio/tapFeel'
import { ChordList } from './ChordName'

/** Jam's style → the composer style that fits it */
export function composerStyleFor(jamStyle: string): StyleId {
  const direct = STYLES.find(s => s.id === jamStyle)
  if (direct) return direct.id
  const map: Record<string, StyleId> = { bossa: 'classical', latin: 'classical', salsa: 'classical', hiphop: 'neosoul', trap: 'polyphia', dance: 'pop', afrobeat: 'funk', reggaeton: 'pop', island: 'hawaiian', metal: 'metal' }
  return map[jamStyle] ?? ALIAS[jamStyle] ?? 'pop'
}
const NAMES = ['e', 'B', 'G', 'D', 'A', 'E']
const tuningWords = (t: number[]) => {
  const n = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  return t.map(m => n[m % 12]).join(' ')
}

export function TabMaker({ chords, tonic: fixedTonic, mode: fixedMode, bpm, jamStyle, part, onOpen }: {
  chords?: ProgChord[]; tonic?: string; mode?: ModeId; bpm?: number; jamStyle?: string
  part: Exclude<Part, never>; onOpen: (d: SongDoc) => void
}) {
  const inst = useInstrument()
  const [styleRaw, setStyle] = usePersist<string>(`tm:${part}:style`, jamStyle ? composerStyleFor(jamStyle) : part === 'melody' ? 'fingerstyle' : 'mayer')
  const st = styleOf(styleRaw)
  const [followJam, setFollowJam] = usePersist(`tm:${part}:follow`, true)
  useEffect(() => { if (jamStyle && followJam) setStyle(composerStyleFor(jamStyle)) }, [jamStyle, followJam]) // eslint-disable-line react-hooks/exhaustive-deps
  const [keyPref, setKey] = usePersist('tm:key', 'A')
  const [level, setLevel] = usePersist<1 | 2 | 3>(`tm:${part}:level`, 2)
  const [arr, setArr] = usePersist<ArrLevel>('tm:arrange', 'full')
  const hasProg = !!chords?.length
  const progBars = Math.max(1, Math.round((chords ?? []).reduce((a, c) => a + (c.beats ?? 4), 0) / 4))
  const [len, setLen] = usePersist<number>(`tm:${part}:bars`, part === 'lead' ? 4 : 0)
  const bars = len === 0 ? (hasProg ? (progBars <= 2 ? progBars * 2 : progBars) : 4) : len
  const tonic = fixedTonic ?? keyPref
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [made, setMade] = useState<ReturnType<typeof compose> | null>(null)
  const sig = `${st.id}:${tonic}:${fixedMode}:${level}:${bars}:${arr}:${inst.id}:${inst.tuning.id}:${(chords ?? []).map(c => c.symbol + (c.beats ?? 4)).join(',')}`
  const make = (fresh: boolean) => {
    const s = fresh ? Math.floor(Math.random() * 1e9) : seed
    setSeed(s)
    haptic('light')
    setMade(compose({ style: st.id, part, tonic, mode: fixedMode, chords: hasProg ? chords : undefined, bars, level, seed: s, tuning: inst.midis, bpm: hasProg ? bpm : undefined, arrange: arr }))
  }
  // remake with the new settings once something has been made
  useEffect(() => { if (made) make(true) }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  const doc: SongDoc | null = useMemo(() => made ? {
    id: `jam:${part}:${inst.id}:${made.style.id}:${tonic}:${seed.toString(36)}`, title: made.song.title, source: 'jam', inst: inst.id,
    key: { root: tonic, minor: made.minor }, song: made.song, updated: Date.now(),
  } : null, [made]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => GROUPS.map(g => ({ g, styles: STYLES.filter(s => s.group === g) })), [])
  const retuned = made && made.tuning.join() !== inst.midis.join()
  const what = part === 'lead' ? 'lick or solo' : part === 'melody' ? 'chord melody' : 'riff'
  return (
    <div className="stack tab-maker" style={{ gap: 8 }} data-testid={`tm-${part}`}>
      <label className="field">
        <span>Style</span>
        <select className="select" value={st.id} onChange={e => { setStyle(e.target.value); setFollowJam(false) }} aria-label="Style">
          {groups.map(({ g, styles }) => <optgroup key={g} label={g}>{styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>)}
        </select>
      </label>
      {jamStyle && !followJam && <button className="link-btn small" style={{ alignSelf: 'flex-start' }} onClick={() => setFollowJam(true)}>Match Jam's style again</button>}
      <p className="small muted" style={{ margin: 0 }}>{st.feel} <i>Listen to: {st.artists}.</i></p>
      {!fixedTonic && <KeyPicker value={keyPref} onChange={setKey} />}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Chips label="Length" wrap items={[...(hasProg ? [{ id: 0, label: 'Your chords' }] : []), { id: 1, label: '1 bar' }, { id: 2, label: '2 bars' }, { id: 4, label: '4 bars' }, { id: 8, label: '8 bars' }]} value={hasProg || len !== 0 ? len : 4} onChange={setLen} />
        {part === 'melody'
          ? <Chips label="Arrangement" items={[{ id: 'melody', label: 'Melody only' }, { id: 'bass', label: 'Melody + bass' }, { id: 'full', label: 'Full' }] as { id: ArrLevel; label: string }[]} value={arr} onChange={setArr} />
          : <Chips label="Level" items={[{ id: 1, label: 'Easy' }, { id: 2, label: 'Medium' }, { id: 3, label: 'Hard' }]} value={level} onChange={setLevel} />}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Over {hasProg ? <>your chords: <b><ChordList names={chords!.map(c => c.symbol)} /></b></> : <>the style's own chords in {tonic}</>}. A new one every time: an idea, its answer, and an ending that lands home.</p>
      <div className="row">
        <button className="btn" onClick={() => make(true)} data-testid="tm-make"><Ico n="dice" /> {made ? `Another ${what}` : `Make a ${what}`}</button>
        {doc && <button className="btn primary" onClick={() => onOpen(doc)}>Open in Play</button>}
      </div>
      {made && doc && (
        <>
          {made.capo > 0 && <p className="notice small" style={{ margin: 0 }}>Capo on the {made.capo}{['st', 'nd', 'rd'][made.capo - 1] ?? 'th'} fret, the way {st.label.replace(/ \(.*\)$/, '').toLowerCase()} players do it: the numbers count from the capo (0 = the capo).</p>}
          {retuned && <p className="notice small" style={{ margin: 0 }}>Tune to <b>{tuningWords(made.tuning)}</b> first (low to high){made.tuning.length === 6 ? `: ${made.tuning.map((m, i) => m !== inst.midis[i] ? `${NAMES[5 - i]} string down to ${tuningWords([m])}` : '').filter(Boolean).join(', ')}` : ''}. Play shows a tuning reminder too.</p>}
          <Preview doc={doc} minor={made.minor} />
        </>
      )}
    </div>
  )
}

/** Songs → Practice: the tab maker with its three parts, over the style's own chords or your Jam progression. */
export function TabMakerPanel({ onOpen, jam }: { onOpen: (d: SongDoc) => void; jam: { chords: ProgChord[]; tonic: string; mode: ModeId; bpm: number } | null }) {
  const [part, setPart] = usePersist<'lead' | 'melody' | 'riff'>('tm:part', 'lead')
  const [useJam, setUseJam] = usePersist('tm:useJam', false)
  const j = useJam && jam ? jam : null
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="seg" role="group" aria-label="What to make">
        {([['lead', 'Licks & solos'], ['melody', 'Chord melody'], ['riff', 'Riffs']] as const).map(([id, label]) => (
          <button key={id} aria-pressed={part === id} onClick={() => setPart(id)}>{label}</button>
        ))}
      </div>
      {jam && <Chips label="Chords" items={[{ id: 'style', label: "The style's own" }, { id: 'jam', label: `My Jam progression (${jam.tonic})` }]} value={useJam ? 'jam' : 'style'} onChange={v => setUseJam(v === 'jam')} />}
      <TabMaker key={part + (j ? 'j' : '')} part={part} onOpen={onOpen} {...(j ? { chords: j.chords, tonic: j.tonic, mode: j.mode, bpm: j.bpm } : {})} />
    </div>
  )
}
