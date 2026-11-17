// The fills workshop for bluegrass (Tony Rice / Billy Strings), Chet Atkins, Plini and Matteo Mancuso: key and
// progression, the steps with their ideas, a longer part generator, the routine and the looper.
import { useEffect, useMemo, type ReactNode } from 'react'
import type { Instrument } from '../instrument'
import { Chips, usePersist } from '../components/Controls'
import { ProgressionDiagrams, progressionFromChords } from '../components/ProgressionDiagrams'
import { Win, WinArea } from '../components/Win'
import { openInPlay } from '../nav'
import { songStats } from '../play/songStats'
import { countUse } from '../usage'
import { startSession } from '../sessions/session'
import type { Song } from '../tabs/model'
import { FILL_LEARN } from './make'
import { FillIdea } from './FillIdea'
import { saveCurrentFills, fillsRoutine } from './current'
import { loopOver } from './loop'
import { STYLE2, style2Part, style2Workshop, type Style2 } from './styles2'

export function Style2Workshop({ inst, onExit, chips, style }: { inst: Instrument; onExit: () => void; chips: ReactNode; style: Style2 }) {
  const S = STYLE2[style]
  const [key, setKey] = usePersist(`fills:${style}:key`, S.keys[0])
  const [progId, setProgId] = usePersist(`fills:${style}:prog`, S.progs[0].id)
  const [bpm, setBpm] = usePersist(`fills:${style}:bpm`, S.bpm)
  const [open, setOpen] = usePersist<string>(`fills:${style}:open`, '')
  const [pbars, setPbars] = usePersist<4 | 6 | 8>('fills:pbars', 4)
  const [pseed, setPseed] = usePersist(`fills:${style}:pseed`, 1)
  const prog = (S.progs.find(p => p.id === progId) ?? S.progs[0]).chords
  const k = S.keys.includes(key) ? key : S.keys[0]
  const label = `${S.label} fills (${k})`
  const ws = useMemo(() => style2Workshop({ style, key: k, prog, bpm, title: label }), [style, k, prog, bpm, label])
  const part = useMemo(() => style2Part({ style, key: k, prog, bpm, title: label }, pbars, pseed), [style, k, prog, bpm, label, pbars, pseed])
  const chordDiagrams = useMemo(() => progressionFromChords(ws.chords, inst, { collapseRepeats: true }), [ws.chords, inst])
  const docFor = (id: string) => `fills:${style}:${k}:${progId}:${id}`
  const best = (id: string) => songStats(docFor(id))?.best ?? 0
  const put = (kk: string, v: unknown) => { try { localStorage.setItem('kg:' + kk, JSON.stringify(v)) } catch { /* storage */ } }
  const docOf = (id: string, song: Song) => ({ id: docFor(id), title: song.title, source: 'lesson' as const, inst: inst.id, key: { root: k, minor: false }, song, updated: Date.now() })
  const openStep = (id: string, song: Song, inTime?: boolean) => {
    countUse('fills:practise')
    if (inTime) put('playMode', 'time')
    put('playBand', true)
    openInPlay(docOf(id, song))
  }
  const next = ws.steps.find(s => best(s.id) < 90)
  useEffect(() => { saveCurrentFills({ style, label: `${S.label} fills over ${ws.chords.join(' ')}`, steps: ws.steps.map(st => ({ id: st.id, title: st.title, docId: docFor(st.id) })) }) })
  return (
    <div className="stack fills" style={{ gap: 12 }} data-testid="fills">
      <div className="row"><button className="btn sm" onClick={onExit}>← Back</button><h2 style={{ margin: 0 }}>Fills between chords</h2></div>
      <WinArea area={`fills-${style}`}>
      <Win id="fills-setup" title={`${S.label} fills`} className="panel" bodyClass="stack" bodyStyle={{ gap: 10 }}>
        <p className="small" style={{ margin: 0 }}>{S.intro} {ws.steps.length} steps; each one opens in the song player with a band, the mic and speed control.</p>
        {chips}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <label className="field" style={{ flex: '2 1 180px' }}><span>Progression</span>
            <select className="select" value={progId} onChange={e => setProgId(e.target.value)} data-testid="fills-prog">{S.progs.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
          </label>
          <label className="field" style={{ flex: '1 1 80px' }}><span>Key</span>
            <select className="select" value={k} onChange={e => setKey(e.target.value)}>{S.keys.map(x => <option key={x} value={x}>{x}</option>)}</select>
          </label>
          <label className="field" style={{ flex: '1 1 110px' }}><span>Tempo</span>
            <span className="row" style={{ gap: 6, alignItems: 'center' }}>
              <button className="btn sm" aria-label="Slower" onClick={() => setBpm(b => Math.max(40, b - 5))}>−</button><b>{bpm}</b>
              <button className="btn sm" aria-label="Faster" onClick={() => setBpm(b => Math.min(200, b + 5))}>+</button>
            </span>
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}><span data-chord-list>{ws.chords.join(' – ')}</span> · one bar each.</p>
        <ProgressionDiagrams items={chordDiagrams} tuning={inst.midis} size={0.68} />
        <button className="btn" data-testid="fills-routine" onClick={() => { countUse('fills:routine'); void fillsRoutine(ws.steps.map(st => ({ id: st.id, title: st.title, doc: docOf(st.id, st.song) })), best).then(startSession) }}>10-minute fills routine</button>
        {next && <button className="btn primary" data-testid="fills-next" onClick={() => openStep(next.id, next.song, next.inTime)}>Next: {next.title}</button>}
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
      <Win id="step-part" title={`${ws.steps.length + 1}. Longer parts`} className="panel fills-step" bodyClass="stack" bodyStyle={{ gap: 6 }}>
        <div className="stack" style={{ gap: 6 }} data-testid="fills-step-part">
          <button className="fills-head" onClick={() => setOpen(open === 'part' ? '' : 'part')} aria-expanded={open === 'part'}><b>{ws.steps.length + 1}. Longer parts: {pbars} bars</b></button>
          {open === 'part' && <>
            <p className="small" style={{ margin: 0 }}>A part made of the moves, one per bar, ending at home. Make as many as you like.</p>
            <Chips label="Length" items={[{ id: 4 as const, label: '4 bars' }, { id: 6 as const, label: '6 bars' }, { id: 8 as const, label: '8 bars' }]} value={pbars} onChange={setPbars} />
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary" data-testid="fills-go-part" onClick={() => openStep(`part-${pbars}-${pseed}`, part)}>Practise it</button>
              <button className="btn" data-testid="fills-new-part" onClick={() => setPseed(x => x + 1)}>New part</button>
            </div>
            <FillIdea learn={FILL_LEARN.part} />
          </>}
        </div>
      </Win>
      <Win id="fills-loop" title="Loop your own rhythm" className="panel" bodyClass="stack" bodyStyle={{ gap: 6 }}>
        <p className="small" style={{ margin: 0 }}>The looper gets {ws.chords.join(' – ')} as a beat. Record yourself playing the rhythm on track 1 (one bar of lights counts you in), then practise the fills over your own playing.</p>
        <button className="btn" data-testid="fills-loop" onClick={() => { countUse('fills:loop'); void loopOver({ chords: ws.chords, key: k, minor: false, bpm, groove: S.groove }) }}>Loop it</button>
      </Win>
      </WinArea>
    </div>
  )
}
