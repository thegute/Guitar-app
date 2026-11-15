// Learn → Explore → Fills between chords: the workshop. Pick a style, a key and a progression; the shape map shows each
// chord's shell, its notes and the free-finger notes around it; nine steps teach the fills one idea at a time, each one
// a looping tab you practise in Play with the band, the mic, speed control and the coach.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Instrument } from '../instrument'
import { Chips, usePersist } from '../components/Controls'
import { Fretboard, type Mark } from '../components/Fretboard'
import { openInPlay } from '../nav'
import { songStats } from '../play/songStats'
import { jamProgression } from '../tabs/fromProgression'
import { pcLabel } from '../learn/targets'
import { countUse } from '../usage'
import { freeNotes, triadOf, STD } from './shells'
import { workshop, melodicPart, connectedPart, FILL_LEARN, type FillStyle } from './make'
import { launch } from '../search/launch'
import { spell } from '../theory/progressions'
import { FillIdea } from './FillIdea'
import { MetalWorkshop } from './MetalWorkshop'
import { saveCurrentFills } from './current'
import { loopOver } from './loop'

const STYLES = [
  { id: 'mayer', label: 'John Mayer soul fills', ready: true },
  { id: 'asato', label: 'Mateus Asato', ready: true },
  { id: 'metal', label: 'Metal: chugs with lead fills', ready: true },
  { id: 'bluegrass', label: 'Tony Rice / Billy Strings', ready: false },
  { id: 'atkins', label: 'Chet Atkins', ready: false },
  { id: 'plini', label: 'Plini', ready: false },
  { id: 'mancuso', label: 'Matteo Mancuso', ready: false },
]
/** progressions that suit soul fills (semitones above the key, minor or not) */
const PROGS: { id: string; label: string; chords: [number, boolean][] }[] = [
  { id: 'i-vi-iv-v', label: 'I – vi – IV – V', chords: [[0, false], [9, true], [5, false], [7, false]] },
  { id: 'i-iv', label: 'I – IV (slow soul)', chords: [[0, false], [0, false], [5, false], [5, false]] },
  { id: 'i-v-vi-iv', label: 'I – V – vi – IV', chords: [[0, false], [7, false], [9, true], [5, false]] },
  { id: 'vi-iv-i-v', label: 'vi – IV – I – V', chords: [[9, true], [5, false], [0, false], [7, false]] },
  { id: 'i-iii-iv-v', label: 'I – iii – IV – V', chords: [[0, false], [4, true], [5, false], [7, false]] },
]
const KEYS = ['G', 'A', 'C', 'D', 'E', 'F']
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function FillsWorkshop({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  const [style, setStyle] = usePersist('fills:style', 'mayer')
  const chips = <Chips label="Style" items={STYLES.map(s => ({ id: s.id, label: s.ready ? s.label : `${s.label} (soon)` }))} value={style} onChange={v => { if (STYLES.find(s => s.id === v)?.ready) setStyle(v) }} wrap />
  const standard = inst.id === 'guitar' && inst.midis.length === 6 && inst.midis.every((m, i) => m === STD[i])
  if (!standard) return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row"><button className="btn sm" onClick={onExit}>← Back</button><h2 style={{ margin: 0 }}>Fills between chords</h2></div>
      <p className="panel small">The fills workshop is for guitar in standard tuning for now. Switch the instrument (or the tuning) in Settings to use it.</p>
    </div>
  )
  return style === 'metal' ? <MetalWorkshop inst={inst} onExit={onExit} chips={chips} /> : <SoftWorkshop inst={inst} onExit={onExit} style={style} chips={chips} />
}

function SoftWorkshop({ inst, onExit, style, chips }: { inst: Instrument; onExit: () => void; style: string; chips: ReactNode }) {
  const [key, setKey] = usePersist('fills:key', 'G')
  const [progId, setProgId] = usePersist('fills:prog', 'i-vi-iv-v')
  const [bpm, setBpm] = usePersist('fills:bpm', 70)
  const [show, setShow] = usePersist<'roles' | 'fingers'>('fills:show', 'roles')
  const [sel, setSel] = useState(0)
  const [mbars, setMbars] = usePersist<4 | 6 | 8>('fills:mbars', 4)
  const [mseed, setMseed] = usePersist('fills:mseed', 1)
  const [open, setOpen] = usePersist<string>('fills:open', 'shells')
  const jam = useMemo(() => jamProgression(), [])
  const jamOk = !!jam && jam.chords.length >= 2 && jam.chords.length <= 8 && jam.chords.every(c => triadOf(c.symbol))
  const chords = useMemo(() => {
    if (progId === 'jam' && jamOk) return jam!.chords.map(c => c.symbol)
    const p = PROGS.find(x => x.id === progId) ?? PROGS[0]
    return p.chords.map(([s, m]) => NAMES[(PC[key] + s) % 12] + (m ? 'm' : ''))
  }, [progId, key, jam, jamOk])
  const wkey = progId === 'jam' && jamOk ? jam!.tonic : key
  const standard = inst.id === 'guitar' && inst.midis.length === 6 && inst.midis.every((m, i) => m === STD[i])
  const fstyle = (style === 'asato' ? 'asato' : 'mayer') as FillStyle
  const stitle = fstyle === 'asato' ? 'Asato fills' : 'Soul fills'
  const ws = useMemo(() => workshop({ chords, key: wkey, bpm, style: fstyle, title: `${stitle} (${chords.join(' ')})` }), [chords, wkey, bpm, fstyle])
  const sh = ws.shells[Math.min(sel, ws.shells.length - 1)]
  const free = sh ? freeNotes(sh) : []

  const markFor = (midi: number, s: number, fret: number): Mark | null => {
    if (!sh) return null
    const n = sh.notes.find(x => x.string === s && x.fret === fret)
    if (n) return { label: show === 'fingers' ? (n.finger ? String(n.finger) : 'o') : n.role, role: n.role === 'R' ? 'root' : 'chord' }
    const f = free.find(x => x.string === s && x.fret === fret)
    if (f) return { label: f.role, role: 'embel' }
    return null
  }
  const docFor = (stepId: string) => `fills:${style}:${wkey}:${chords.join('-')}:${stepId}`
  const best = (id: string) => songStats(docFor(id))?.best ?? 0
  const put = (k: string, v: unknown) => { try { localStorage.setItem('kg:' + k, JSON.stringify(v)) } catch { /* storage */ } }
  const openStep = (id: string, song: import('../tabs/model').Song, inTime?: boolean) => {
    countUse('fills:practise')
    if (inTime) put('playMode', 'time')
    // the band (drums and bass) behind every step
    put('playBand', true)
    openInPlay({ id: docFor(id), title: song.title, source: 'lesson', inst: inst.id, key: { root: wkey, minor: false }, song, updated: Date.now() })
  }
  const practise = (i: number) => { const st = ws.steps[i]; openStep(st.id, st.song, st.inTime) }
  const melody = useMemo(() => (fstyle === 'asato' ? connectedPart : melodicPart)({ chords, key: wkey, bpm, style: fstyle, title: `${stitle} (${chords.join(' ')})` }, mbars, mseed), [chords, wkey, bpm, mbars, mseed, fstyle])
  /** jam freely over the progression with Jam's band (drums, bass, chords) */
  const jamOver = () => {
    countUse('fills:jam')
    const PCN: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 }
    const prog = chords.map(c => { const m = /^([A-G][#b]?)(.*)$/.exec(c)!; return { ...spell(wkey, 'major', { semi: ((PCN[m[1]] - PCN[wkey]) % 12 + 12) % 12, type: m[2] }), beats: 4 } })
    put('progKey', wkey); put('progMode', 'major'); put('progStyle', 'neosoul'); put('progBpm', bpm); put('jamProg', prog)
    launch({ jam: { page: 'jam' } })
  }
  const nextStep = ws.steps.find(s => best(s.id) < 90)
  useEffect(() => { saveCurrentFills({ style, label: `${STYLES.find(x => x.id === style)?.label ?? 'Fills'} over ${chords.join(' ')}`, steps: ws.steps.map(st => ({ id: st.id, title: st.title, docId: docFor(st.id) })) }) })

  return (
    <div className="stack fills" style={{ gap: 12 }} data-testid="fills">
      <div className="row"><button className="btn sm" onClick={onExit}>← Back</button><h2 style={{ margin: 0 }}>Fills between chords</h2></div>
      <div className="panel stack" style={{ gap: 10 }}>
        <p className="small" style={{ margin: 0 }}>{fstyle === 'asato'
          ? 'Mateus Asato\'s way: the same small shapes as Mayer, decorated much more: slides into every chord, quick hammer-pull flicks, 3rds on the top strings, 16th-note flourishes and muted ghost strums. Learn the John Mayer steps first if these feel fast.'
          : 'Little melodies between chord shapes, the way John Mayer, Hendrix and Curtis Mayfield play rhythm guitar.'} {ws.steps.length} steps over one progression; each one opens in the song player with a band, the mic and speed control.</p>
        {chips}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <label className="field" style={{ flex: '2 1 180px' }}><span>Progression</span>
            <select className="select" value={progId} onChange={e => { setProgId(e.target.value); setSel(0) }} data-testid="fills-prog">
              {jamOk && <option value="jam">Your Jam progression ({jam!.chords.map(c => c.symbol).join(' ')})</option>}
              {PROGS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          {progId !== 'jam' && <label className="field" style={{ flex: '1 1 80px' }}><span>Key</span>
            <select className="select" value={key} onChange={e => { setKey(e.target.value); setSel(0) }}>{KEYS.map(k => <option key={k} value={k}>{k}</option>)}</select>
          </label>}
          <label className="field" style={{ flex: '1 1 110px' }}><span>Tempo</span>
            <span className="row" style={{ gap: 6, alignItems: 'center' }}>
              <button className="btn sm" aria-label="Slower" onClick={() => setBpm(b => Math.max(40, b - 5))}>−</button><b>{bpm}</b>
              <button className="btn sm" aria-label="Faster" onClick={() => setBpm(b => Math.min(160, b + 5))}>+</button>
            </span>
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>{chords.join(' – ')} · one bar each. In the song player you can slow it down further, loop a bar, or turn on the speed trainer.</p>
        {nextStep && <button className="btn primary" data-testid="fills-next" onClick={() => practise(ws.steps.indexOf(nextStep))}>Next: {nextStep.title}</button>}
      </div>

      <div className="panel stack" style={{ gap: 8 }} data-testid="fills-map">
        <b>The shape map</b>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {ws.shells.map((s, i) => <button key={i} className={`btn sm${i === sel ? ' primary' : ''}`} data-chord={s.chord} onClick={() => setSel(i)}>{s.chord}</button>)}
          <Chips label="Show" items={[{ id: 'roles' as const, label: 'Notes' }, { id: 'fingers' as const, label: 'Fingers' }]} value={show} onChange={setShow} />
        </div>
        {sh && <Fretboard tuning={inst.midis} fromFret={Math.max(0, sh.lo - 2)} toFret={Math.max(sh.hi + 3, 5)} markFor={markFor} zoomId="fills" />}
        {sh && <p className="small" style={{ margin: 0 }}>
          {sh.chord}: {sh.notes.map(n => `${pcLabel(n.midi)} (${n.role === 'R' ? 'root' : n.role})`).join(', ')}{sh.notes.some(n => n.finger) && ` · fingers ${sh.notes.map(n => n.finger || 'open').join('-')} from the G string up`}.
          {' '}Violet: free-finger notes ({[...new Set(free.map(f => f.role))].join(', ')}): hammer on from below, pull off from above, or slide in.
        </p>}
      </div>

      {ws.steps.map((st, i) => {
        const b = best(st.id), isOpen = open === st.id
        return (
          <div key={st.id} className={`panel stack fills-step${b >= 90 ? ' done' : ''}`} style={{ gap: 6 }} data-testid={`fills-step-${st.id}`}>
            <button className="fills-head" onClick={() => setOpen(isOpen ? '' : st.id)} aria-expanded={isOpen}>
              <b>{b >= 90 ? '✓ ' : ''}{st.title}</b>{b > 0 && <span className="small muted">best {b}%</span>}
            </button>
            {isOpen && <>
              <p className="small" style={{ margin: 0 }}>{st.why}</p>
              <ol className="small fills-how">{st.how.map((h, k) => <li key={k}>{h}</li>)}</ol>
              <p className="small muted" style={{ margin: 0 }}>Listen for: {st.listen}</p>
              {FILL_LEARN[st.id] && <FillIdea learn={FILL_LEARN[st.id]} />}
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" data-testid={`fills-go-${st.id}`} onClick={() => practise(i)}>Practise it{st.inTime ? ' (In time)' : ''}</button>
              </div>
            </>}
          </div>
        )
      })}
      <div className="panel stack fills-step" style={{ gap: 6 }} data-testid="fills-step-melody">
        <button className="fills-head" onClick={() => setOpen(open === 'melody' ? '' : 'melody')} aria-expanded={open === 'melody'}>
          <b>{ws.steps.length + 1}. Longer melodies: {mbars} bars</b>{best(`melody-${mbars}-${mseed}`) > 0 && <span className="small muted">best {best(`melody-${mbars}-${mseed}`)}%</span>}
        </button>
        {open === 'melody' && <>
          <p className="small" style={{ margin: 0 }}>{fstyle === 'asato' ? 'One flowing part in his style, no full chords: two notes of each chord on 1, then a line that never stops, into the next chord, ending at home. Make as many as you like.' : 'Fills joined up into a melody: an idea, the same idea over the next chord, a longer answer, and a walk home, with the chord on 1 of every bar. Make as many as you like.'}</p>
          <Chips label="Length" items={[{ id: 4 as const, label: '4 bars' }, { id: 6 as const, label: '6 bars' }, { id: 8 as const, label: '8 bars' }]} value={mbars} onChange={setMbars} />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary" data-testid="fills-go-melody" disabled={!melody} onClick={() => melody && openStep(`melody-${mbars}-${mseed}`, melody)}>Practise it</button>
            <button className="btn" data-testid="fills-new-melody" onClick={() => setMseed(x => x + 1)}>New melody</button>
          </div>
          <FillIdea learn={fstyle === 'asato' ? FILL_LEARN.connected : FILL_LEARN.melody} />
        </>}
      </div>
      <div className="panel stack" style={{ gap: 6 }}>
        <b>Jam over it</b>
        <p className="small" style={{ margin: 0 }}>Drums, bass and chords play {chords.join(' – ')} in Jam, round and round, so you can try your own fills freely. Every step above has the band too.</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" data-testid="fills-jam" onClick={jamOver}>Jam over {chords.join(' ')}</button>
          <button className="btn" data-testid="fills-loop" onClick={() => { countUse('fills:loop'); void loopOver({ chords, key: wkey, minor: false, bpm, groove: 'halftime' }) }}>Loop your own rhythm</button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Loop your own rhythm: the looper gets these chords as a beat. Record yourself strumming them on track 1 (one bar of lights counts you in), then practise the fills over your own playing, and record them on track 2.</p>
      </div>
      <p className="small muted">Learned at 90% or better in the song player. More styles (Mateus Asato, Tony Rice and Billy Strings, Chet Atkins, Plini, Matteo Mancuso) are on the way.</p>
    </div>
  )
}
