// Learn → Exercises: the exercise library (moved here from Songs), tidied into sections. A row of section chips at the top:
//   For you (today's picks + every exercise) · Technique · Fretboard · Chords & rhythm · Fingerstyle · Licks · Make your own
// The first six show the library kept to that section (its filters only offer that section's types); Make your own holds the
// generators (fingerpicking patterns, lick chainer, tab maker) and the example songs. The floating hand card follows the
// exercise you're on (it replaced the "Left hand" window). Each section remembers its own filters' section (kg:exSection).
import { useEffect, useMemo, useRef } from 'react'
import { Win, WinArea } from '../components/Win'
import { LickChainer } from '../components/LickChainer'
import { TabMakerPanel } from '../components/TabMaker'
import { ProgressionTabs } from '../components/ProgressionTabs'
import { KeyPicker, Chips, usePersist } from '../components/Controls'
import { ExerciseBrowser } from './ExerciseBrowser'
import { STARTER_PROGS, jamProgression, starterProgression } from '../tabs/fromProgression'
import { openInPlay } from '../nav'
import { refreshBuiltIn, saveSong, type SongDoc } from '../tabs/library'
import { EXAMPLES, exampleDoc } from '../tabs/examples'
import { useInstrument } from '../instrument'
import { Ico } from '../components/Icon'
import { Fold } from '../components/Fold'

type Section = 'foryou' | 'technique' | 'fretboard' | 'chords' | 'fingerstyle' | 'licks' | 'make'
const SECTIONS: { id: Section; label: string; group?: string; hint: string }[] = [
  { id: 'foryou', label: 'For you', hint: 'Today\'s three picks, then every exercise' },
  { id: 'technique', label: 'Technique', group: 'Technique', hint: 'Warm-ups, picking, legato, bends, tapping, rhythm' },
  { id: 'fretboard', label: 'Fretboard', group: 'Theory on the neck', hint: 'Scales, sequences, arpeggios, triads, intervals, chord tones, knowing the neck' },
  { id: 'chords', label: 'Chords & rhythm', group: 'Chords and rhythm guitar', hint: 'Chord changes, strumming, barre chords, power chords and riffs' },
  { id: 'fingerstyle', label: 'Fingerstyle', group: 'Fingerstyle', hint: 'Fingerpicking and melodic fingerstyle' },
  { id: 'licks', label: 'Licks', group: 'Licks', hint: 'Licks in every style, with breakdowns' },
  { id: 'make', label: 'Make your own', hint: 'Fingerpicking patterns, lick chainer, tab maker and example songs' },
]

export function ExercisesPage() {
  const [sec, setSec] = usePersist<Section>('exSection', 'foryou')
  const cur = SECTIONS.find(s => s.id === sec) ?? SECTIONS[0]
  const inst = useInstrument()
  const saveOpen = async (d: SongDoc) => { await saveSong(d); openInPlay(d) }
  // on a narrow screen the row scrolls sideways: keep the chosen section in view
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[aria-selected=true]'), r = row.current
    if (el && r) r.scrollTo({ left: Math.max(0, el.offsetLeft - r.offsetLeft - 16), behavior: 'smooth' })
  }, [sec])
  return (
    <div className="stack ex-page">
      <div className="ex-sections" role="tablist" aria-label="Exercise sections" data-testid="ex-sections" ref={row}>
        {SECTIONS.map(s => (
          <button key={s.id} role="tab" className="chip" aria-selected={s.id === cur.id} aria-pressed={s.id === cur.id} title={s.hint} onClick={() => setSec(s.id)}>{s.label}</button>
        ))}
      </div>
      <p className="small ex-hint">{cur.hint}.</p>
      {cur.id !== 'make' ? (
        <WinArea area={`ex-${cur.id}`}>
          <ExerciseBrowser key={cur.id} group={cur.group} suggest={cur.id === 'foryou'} />
        </WinArea>
      ) : (
        <WinArea area="ex-make">
          <Win id="ex-picking" title="Fingerpicking patterns" className="panel"><PickingSection onOpen={saveOpen} /></Win>
          <Win id="ex-chain" title="Lick chainer" className="panel"><LickChainer onOpen={saveOpen} /></Win>
          <Win id="ex-licks" title="Tab maker: licks, chord melodies, riffs" className="panel"><TabMakerPanel onOpen={saveOpen} jam={jamProgression()} /></Win>
          <Win id="ex-examples" title="Example songs" className="panel">
            <ul className="song-list">
              {EXAMPLES.filter(e => e.for === inst.id || e.for === 'any').map(e => (
                <li key={e.id}>
                  <button className="song-open" onClick={() => void refreshBuiltIn(exampleDoc(e.id, inst.tuning.notes)).then(openInPlay)}><Ico n="play" /> <b>{e.title}</b></button>
                </li>
              ))}
            </ul>
          </Win>
        </WinArea>
      )}
    </div>
  )
}


/** Fingerpicking (Travis / arpeggio) and chord melody tabs from your Jam progression or a starter progression. */
function PickingSection({ onOpen }: { onOpen: (d: SongDoc) => void }) {
  const jam = useMemo(() => jamProgression(), [])
  const [src, setSrc] = usePersist('pickSource', jam ? 'jam' : 'pop')
  const [key, setKey] = usePersist('pickKey', 'G')
  const useJam = src === 'jam' && !!jam
  const prog = useMemo(() => (useJam ? { mode: jam!.mode, chords: jam!.chords } : starterProgression(src === 'jam' ? 'pop' : src, key)), [useJam, jam, src, key])
  return (
    <Fold id="songsPicking" title="Fingerpicking" summary="over a progression"
      hint="Travis picking, arpeggios, slack key, classical and more over a progression: the one you made in Jam, or a classic one.">
      <label className="field">
        <span>Progression</span>
        <select className="select" value={useJam ? 'jam' : src === 'jam' ? 'pop' : src} onChange={e => setSrc(e.target.value)}>
          {jam && <option value="jam">My Jam progression: {jam.chords.map(c => c.symbol).join(' – ')}</option>}
          {STARTER_PROGS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      {!useJam && <KeyPicker value={key} onChange={setKey} />}
      <ProgressionTabs part="pick" chords={prog.chords} tonic={useJam ? jam!.tonic : key} mode={prog.mode} bpm={useJam ? jam!.bpm : 80} onOpen={onOpen} />
    </Fold>
  )
}
