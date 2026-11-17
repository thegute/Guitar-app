// The fills workshop, metal style: chug riffs with lead fills. Key and progression, the neck map (the pedal on the low
// string and the minor-scale notes the fills use), ten steps and generated riffs, all with the metal band.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Instrument } from '../instrument'
import { Chips, usePersist } from '../components/Controls'
import { Fretboard, type Mark } from '../components/Fretboard'
import { ProgressionDiagrams, progressionFromChords } from '../components/ProgressionDiagrams'
import { Win, WinArea } from '../components/Win'
import { openInPlay } from '../nav'
import { songStats } from '../play/songStats'
import { countUse } from '../usage'
import { pcLabel } from '../learn/targets'
import type { Song } from '../tabs/model'
import { FILL_LEARN } from './make'
import { FillIdea } from './FillIdea'
import { saveCurrentFills, fillsRoutine } from './current'
import { startSession } from '../sessions/session'
import { loopOver } from './loop'
import { METAL_KEYS, METAL_PROGS, metalRiff, metalWorkshop } from './metal'

const MINOR = [0, 2, 3, 5, 7, 8, 10]
const PCS: Record<string, number> = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 }
const DEG = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']

export function MetalWorkshop({ inst, onExit, chips }: { inst: Instrument; onExit: () => void; chips: ReactNode }) {
  const [key, setKey] = usePersist('fills:mkey', 'E')
  const [progId, setProgId] = usePersist('fills:mprog', 'i-vi-vii')
  const [bpm, setBpm] = usePersist('fills:mbpm', 110)
  const [open, setOpen] = usePersist<string>('fills:mopen', 'm-chug')
  const [rbars, setRbars] = usePersist<4 | 6 | 8>('fills:mrbars', 4)
  const [rseed, setRseed] = usePersist('fills:mrseed', 1)
  const [, bump] = useState(0)
  const prog = (METAL_PROGS.find(p => p.id === progId) ?? METAL_PROGS[0]).chords
  const ws = useMemo(() => metalWorkshop({ key, prog, bpm, title: `Metal fills (${key} minor)` }), [key, prog, bpm])
  const riff = useMemo(() => metalRiff({ key, prog, bpm, title: `Metal fills (${key} minor)` }, rbars, rseed), [key, prog, bpm, rbars, rseed])
  const chordDiagrams = useMemo(() => progressionFromChords(ws.chords, inst, { collapseRepeats: true }), [ws.chords, inst])
  const k = PCS[key] ?? 4
  const pf = ((k - inst.midis[0]) % 12 + 12) % 12
  const docFor = (id: string) => `fills:metal:${key}:${progId}:${id}`
  const best = (id: string) => songStats(docFor(id))?.best ?? 0
  const put = (kk: string, v: unknown) => { try { localStorage.setItem('kg:' + kk, JSON.stringify(v)) } catch { /* storage */ } }
  const openStep = (id: string, song: Song, inTime?: boolean) => {
    countUse('fills:practise')
    if (inTime) put('playMode', 'time')
    put('playBand', true)
    openInPlay({ id: docFor(id), title: song.title, source: 'lesson', inst: inst.id, key: { root: key, minor: true }, song, updated: Date.now() })
    bump(x => x + 1)
  }
  const markFor = (midi: number, s: number, fret: number): Mark | null => {
    if (fret < pf || fret > pf + 5) return null
    if (s === 0 && fret === pf) return { label: 'chug', role: 'root' }
    if (s < 1 || s > 3) return null
    const d = ((midi - k) % 12 + 12) % 12
    if (!MINOR.includes(d)) return null
    return { label: DEG[d], role: d === 0 ? 'root' : d === 7 || d === 3 ? 'chord' : 'scale' }
  }
  const next = ws.steps.find(s => best(s.id) < 90)
  useEffect(() => { saveCurrentFills({ style: 'metal', label: `Metal fills in ${key} minor`, steps: ws.steps.map(st => ({ id: st.id, title: st.title, docId: docFor(st.id) })) }) })
  return (
    <div className="stack fills" style={{ gap: 12 }} data-testid="fills">
      <div className="row"><button className="btn sm" onClick={onExit}>← Back</button><h2 style={{ margin: 0 }}>Fills between chords</h2></div>
      <WinArea area="fills-metal">
      <Win id="fills-setup" title="Metal fills" className="panel" bodyClass="stack" bodyStyle={{ gap: 10 }}>
        <p className="small" style={{ margin: 0 }}>Chug riffs with lead fills, the modern metal way (Trivium, Killswitch Engage, Bullet for My Valentine, Periphery): palm-muted chugs and gallops on the low string, and little melodies dropped in between. {ws.steps.length} steps; each one opens in the song player with a metal band (double kick and bass), the mic and speed control.</p>
        {chips}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <label className="field" style={{ flex: '2 1 180px' }}><span>Progression</span>
            <select className="select" value={progId} onChange={e => setProgId(e.target.value)} data-testid="fills-prog">{METAL_PROGS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
          </label>
          <label className="field" style={{ flex: '1 1 90px' }}><span>Key (minor)</span>
            <select className="select" value={key} onChange={e => setKey(e.target.value)}>{METAL_KEYS.map(x => <option key={x} value={x}>{x}m</option>)}</select>
          </label>
          <label className="field" style={{ flex: '1 1 110px' }}><span>Tempo</span>
            <span className="row" style={{ gap: 6, alignItems: 'center' }}>
              <button className="btn sm" aria-label="Slower" onClick={() => setBpm(b => Math.max(50, b - 5))}>−</button><b>{bpm}</b>
              <button className="btn sm" aria-label="Faster" onClick={() => setBpm(b => Math.min(220, b + 5))}>+</button>
            </span>
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>{ws.chords.join(' – ')} · start slow (the speed trainer in the song player takes it up as you get it clean).</p>
        <button className="btn" data-testid="fills-routine" onClick={() => { countUse('fills:routine'); void fillsRoutine(ws.steps.map(st => ({ id: st.id, title: st.title, doc: { id: docFor(st.id), title: st.song.title, source: 'lesson', inst: inst.id, key: { root: key, minor: true }, song: st.song, updated: Date.now() } })), best).then(startSession) }}>10-minute fills routine</button>
        {next && <button className="btn primary" data-testid="fills-next" onClick={() => openStep(next.id, next.song, next.inTime)}>Next: {next.title}</button>}
      </Win>
      <Win id="fills-map" title="Where the fills live" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
        <div className="stack" style={{ gap: 8 }} data-testid="fills-map">
          <ProgressionDiagrams items={chordDiagrams} tuning={inst.midis} size={0.68} />
          <Fretboard tuning={inst.midis} fromFret={Math.max(0, pf - 1)} toFret={pf + 6} markFor={markFor} zoomId="fills-metal" />
          <p className="small" style={{ margin: 0 }}>"chug" is the pedal: {pcLabel(inst.midis[0] + pf)} on the low string{pf === 0 ? ' (open)' : `, fret ${pf}`}. The numbered notes on the A, D and G strings are {key} natural minor, right above it: every fill comes from these, so the hand never moves far.</p>
        </div>
      </Win>
      {ws.steps.map(st => {
        const b = best(st.id), isOpen = open === st.id
        return (
          <Win key={st.id} id={`step-${st.id}`} title={st.title} className={`panel fills-step${b >= 90 ? ' done' : ''}`} bodyClass="stack" bodyStyle={{ gap: 6 }}>
            <div className="stack" style={{ gap: 6 }} data-testid={`fills-step-${st.id}`}>
              <button className="fills-head" onClick={() => setOpen(isOpen ? '' : st.id)} aria-expanded={isOpen}><b>{b >= 90 ? '✓ ' : ''}{st.title}</b>{b > 0 && <span className="small muted">best {b}%</span>}</button>
              {isOpen && <>
                <p className="small" style={{ margin: 0 }}>{st.why}</p>
                <ol className="small fills-how">{st.how.map((h, i) => <li key={i}>{h}</li>)}</ol>
                <p className="small muted" style={{ margin: 0 }}>Listen for: {st.listen}</p>
                {FILL_LEARN[st.id] && <FillIdea learn={FILL_LEARN[st.id]} />}
                <button className="btn primary" data-testid={`fills-go-${st.id}`} onClick={() => openStep(st.id, st.song, st.inTime)}>Practise it{st.inTime ? ' (In time)' : ''}</button>
              </>}
            </div>
          </Win>
        )
      })}
      <Win id="fills-loop" title="Loop your own rhythm" className="panel" bodyClass="stack" bodyStyle={{ gap: 6 }}>
        <p className="small" style={{ margin: 0 }}>The looper gets {ws.chords.join(' – ')} as a metal beat. Record yourself chugging it on track 1 (one bar of lights counts you in), then play the fills over your own chugs and record them on track 2.</p>
        <button className="btn" data-testid="fills-loop" onClick={() => { countUse('fills:loop'); void loopOver({ chords: ws.chords, key, minor: true, bpm, groove: 'metal' }) }}>Loop it</button>
      </Win>
      <Win id="step-riff" title={`${ws.steps.length + 1}. Longer riffs`} className="panel fills-step" bodyClass="stack" bodyStyle={{ gap: 6 }}>
        <div className="stack" style={{ gap: 6 }} data-testid="fills-step-riff">
          <button className="fills-head" onClick={() => setOpen(open === 'riff' ? '' : 'riff')} aria-expanded={open === 'riff'}><b>{ws.steps.length + 1}. Longer riffs: {rbars} bars</b></button>
          {open === 'riff' && <>
            <p className="small" style={{ margin: 0 }}>Whole riffs built from the moves: a fill idea, the same idea over the next chord, a longer burst, and a gallop into the last power chord. Make as many as you like.</p>
            <Chips label="Length" items={[{ id: 4 as const, label: '4 bars' }, { id: 6 as const, label: '6 bars' }, { id: 8 as const, label: '8 bars' }]} value={rbars} onChange={setRbars} />
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary" data-testid="fills-go-riff" onClick={() => openStep(`riff-${rbars}-${rseed}`, riff)}>Practise it</button>
              <button className="btn" data-testid="fills-new-riff" onClick={() => setRseed(x => x + 1)}>New riff</button>
            </div>
            <FillIdea learn={FILL_LEARN.riff} />
          </>}
        </div>
      </Win>
      </WinArea>
    </div>
  )
}
