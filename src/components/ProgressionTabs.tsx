// "Turn this progression into a tab": fingerpicking (Travis / arpeggio) or strum-along, and the chord melody
// maker, with a preview you can hear before opening it in Play. Used in Jam and in Songs → Practice tabs.
import { activeSound, soundForProgram } from '../audio/pluck'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useInstrument } from '../instrument'
import type { Voicing } from '../theory/chords'
import type { ModeId, ProgChord } from '../theory/progressions'
import { PICK_PATTERNS, pickPattern } from '../tabs/picking'
import { MELODY_LEVELS, MELODY_STYLES, type MelNote, type MelodyLevel, type MelodyStyle } from '../tabs/chordMelody'
import { chordMelodyDoc, pickingDoc } from '../tabs/fromProgression'
import { flatten } from '../tabs/model'
import type { SongDoc } from '../tabs/library'
import { TabView } from './TabView'
import { Chips, usePersist } from './Controls'
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
        <span className="small muted">{doc.song.tempo} BPM · {track.bars.length} bars</span>
      </div>
      <TabView track={track} mode="fret" flats={keyPrefersFlats(doc.key?.root ?? 'C', minor)} cursor={at} playing={at >= 0} states={states} version={0} spans={[]}
        onTap={() => {}} />
    </div>
  )
}

export function ProgressionTabs({ chords, voicings, tonic, mode, bpm, onOpen, suggest }: Props) {
  const inst = useInstrument()
  const [patId, setPatId] = usePersist('pickPattern', suggest ?? 'travis')
  const [style, setStyle] = usePersist<MelodyStyle>('cmStyle', 'ballad')
  const [level, setLevel] = usePersist<MelodyLevel>('cmLevel', 'full')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [mel, setMel] = useState<{ melody: MelNote[][]; doc: SongDoc } | null>(null)
  const [keep, setKeep] = useState<boolean[]>([])
  const [show, setShow] = useState<'pick' | 'melody' | null>(null)
  const sig = chords.map(c => c.symbol + (c.beats ?? 4)).join(',') + tonic + mode + inst.id + inst.tuning.id
  useEffect(() => { setMel(null); setKeep([]) }, [sig])
  const minor = ['minor', 'dorian', 'phrygian', 'harmonic'].includes(mode)
  const pat = pickPattern(patId)
  const pickDoc = useMemo(() => pickingDoc(chords, patId, inst, bpm, tonic, mode, voicings), [chords, patId, inst, bpm, tonic, mode, voicings])

  const makeMelody = (fresh: boolean) => {
    const s = fresh ? Math.floor(Math.random() * 1e9) : seed
    setSeed(s)
    const k = mel && fresh ? mel.melody.map((m, i) => (keep[i] ? m : null)) : undefined
    setMel(chordMelodyDoc(chords, tonic, mode, inst, bpm, { style, level, seed: s, keep: k }))
    setShow('melody')
  }
  // changing the style or level rewrites the tune (locked chords are kept)
  useEffect(() => { if (mel) makeMelody(true) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [style, level])

  if (!chords.length) return null
  return (
    <div className="stack prog-tabs" style={{ gap: 10 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h3 style={{ margin: 0 }}>Fingerpicking tab</h3>
        <label className="field">
          <span>Pattern</span>
          <select className="select" value={patId} onChange={e => { setPatId(e.target.value); setShow('pick') }}>
            <optgroup label="Travis picking">{PICK_PATTERNS.filter(p => p.group === 'travis').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
            <optgroup label="Arpeggios">{PICK_PATTERNS.filter(p => p.group === 'arpeggio').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
            <optgroup label="Strumming">{PICK_PATTERNS.filter(p => p.group === 'strum').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
          </select>
        </label>
        <p className="small muted" style={{ margin: 0 }}>{pat.how}</p>
        <div className="row">
          <button className="btn" onClick={() => setShow(show === 'pick' ? null : 'pick')} aria-expanded={show === 'pick'}>{show === 'pick' ? 'Hide preview' : 'Preview'}</button>
          <button className="btn primary" disabled={!pickDoc} onClick={() => pickDoc && onOpen(pickDoc)}>Open in Play</button>
        </div>
        {show === 'pick' && pickDoc && <Preview doc={pickDoc} minor={minor} />}
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <h3 style={{ margin: 0 }}>Chord melody</h3>
        <p className="small muted" style={{ margin: 0 }}>A tune written over these chords, with the melody on top and the chords under it. Every one is different: roll again until you like it, and keep the parts you like.</p>
        <Chips label="Style" wrap items={MELODY_STYLES.map(s => ({ id: s.id, label: s.label }))} value={style} onChange={setStyle} />
        <p className="small muted" style={{ margin: 0 }}>{MELODY_STYLES.find(s => s.id === style)?.feel}</p>
        <Chips label="Level" items={MELODY_LEVELS.map(l => ({ id: l.id, label: l.label }))} value={level} onChange={setLevel} />
        <div className="row">
          <button className="btn" onClick={() => makeMelody(true)}>{mel ? '🎲 Roll again' : '🎲 Make a melody'}</button>
          {mel && <button className="btn primary" onClick={() => onOpen(mel.doc)}>Open in Play</button>}
        </div>
        {mel && show === 'melody' && (
          <>
            <div className="row keep-row" style={{ gap: 6 }} role="group" aria-label="Keep these chords' melody when rolling again">
              <span className="small muted">Keep:</span>
              {chords.map((c, i) => (
                <button key={i} className="chip" aria-pressed={!!keep[i]} onClick={() => { const k = [...keep]; k[i] = !k[i]; setKeep(k) }}>{i + 1}. {c.symbol}</button>
              ))}
            </div>
            <Preview doc={mel.doc} minor={minor} />
          </>
        )}
        {mel && show !== 'melody' && <button className="btn sm ghost" onClick={() => setShow('melody')}>Show the melody</button>}
      </div>
    </div>
  )
}
