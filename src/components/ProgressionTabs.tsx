// "Turn this progression into a tab": fingerpicking (Travis / arpeggio) or strum-along, and the chord melody
// maker, with a preview you can hear before opening it in Play. Used in Jam and in Learn → Exercises.
import { activeSound, soundForProgram } from '../audio/pluck'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useInstrument } from '../instrument'
import type { Voicing } from '../theory/chords'
import type { ModeId, ProgChord } from '../theory/progressions'
import { PICK_PATTERNS, pickPattern } from '../tabs/picking'
import { pickingDoc } from '../tabs/fromProgression'
import { flatten } from '../tabs/model'
import { HandGuide } from './HandGuide'
import type { SongDoc } from '../tabs/library'
import { TabView } from './TabView'
import { usePersist } from './Controls'
import { TabPlayer } from '../audio/tabPlayer'
import { keyPrefersFlats } from '../theory/notes'

interface Props {
  chords: ProgChord[]
  voicings?: (Voicing | undefined)[]
  tonic: string
  mode: ModeId
  bpm: number
  onOpen: (doc: SongDoc) => void
  /** suggested picking pattern (e.g. from Jam's strum choice) */
  suggest?: string
  /** show only the fingerpicking or the chord melody part (Jam switches between them) */
  part?: 'pick' | 'melody'
}

export function Preview({ doc, minor }: { doc: SongDoc; minor: boolean }) {
  const track = doc.song.tracks[0]
  const flat = useMemo(() => flatten(track), [track])
  const states = useMemo(() => new Uint8Array(flat.length), [flat])
  const [at, setAt] = useState(-1)
  const player = useRef<TabPlayer | null>(null)
  useEffect(() => () => player.current?.stop(), [])
  useEffect(() => { player.current?.stop(); setAt(-1) }, [doc])
  const hear = () => {
    const p = (player.current ??= new TabPlayer())
    if (p.playing) { p.stop(); setAt(-1); return }
    p.onStep = i => setAt(i)
    p.onEnd = () => setAt(-1)
    p.sound = activeSound(soundForProgram(track.program))
    p.play(flat, 0, doc.song.tempo ?? 80)
    setAt(0)
  }
  return (
    <div className="tab-preview">
      <div className="row" style={{ gap: 6 }}>
        <button className={`btn sm hear${at >= 0 ? ' on' : ''}`} onClick={hear} aria-pressed={at >= 0}>{at >= 0 ? '■ Stop' : '▶ Hear it'}</button>
        <span className="small muted">{doc.song.tempo} BPM · {track.bars.length} bar{track.bars.length === 1 ? '' : 's'}</span>
      </div>
      <TabView track={track} mode="fret" flats={keyPrefersFlats(doc.key?.root ?? 'C', minor)} cursor={at} playing={at >= 0} states={states} version={0} spans={[]}
        onTap={() => {}} />
      <HandGuide track={track} cursor={at} />
    </div>
  )
}

export function ProgressionTabs({ chords, voicings, tonic, mode, bpm, onOpen, suggest }: Props) {
  const inst = useInstrument()
  const [patId, setPatId] = usePersist('pickPattern', suggest ?? 'travis')
  const [show, setShow] = useState(false)
  const minor = ['minor', 'dorian', 'phrygian', 'harmonic'].includes(mode)
  const pat = pickPattern(patId)
  const pickDoc = useMemo(() => pickingDoc(chords, patId, inst, bpm, tonic, mode, voicings), [chords, patId, inst, bpm, tonic, mode, voicings])
  if (!chords.length) return null
  const groups: [string, string][] = [['travis', 'Travis picking'], ['arpeggio', 'Arpeggios'], ['fingerstyle', 'Fingerstyle, slack key and classical'], ['bluegrass', 'Bluegrass and folk rhythm'], ['reggae', 'Reggae'], ['strum', 'Strumming']]
  return (
    <div className="stack prog-tabs" style={{ gap: 6 }}>
      <label className="field">
        <span>Pattern</span>
        <select className="select" value={patId} onChange={e => { setPatId(e.target.value); setShow(true) }}>
          {groups.map(([g, label]) => {
            const ps = PICK_PATTERNS.filter(p => p.group === g)
            return ps.length ? <optgroup key={g} label={label}>{ps.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup> : null
          })}
        </select>
      </label>
      <p className="small muted" style={{ margin: 0 }}>{pat.how}</p>
      <div className="row">
        <button className="btn" onClick={() => setShow(!show)} aria-expanded={show}>{show ? 'Hide preview' : 'Preview'}</button>
        <button className="btn primary" disabled={!pickDoc} onClick={() => pickDoc && onOpen(pickDoc)}>Open in Play</button>
      </div>
      {show && pickDoc && <Preview doc={pickDoc} minor={minor} />}
    </div>
  )
}
