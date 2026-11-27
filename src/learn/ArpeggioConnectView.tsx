// Interactive Arpeggio Connector Lab inside Learn → CAGED:
//   Mode 1: Chord-to-Chord in ONE neck zone ("The Connecting Game" — 3 progressive levels, curved bar-line arrows,
//           plain-English bar-by-bar coach, backing chord strums, 1-2-3-4 finger HandShape, Jam progression hook)
//   Mode 2: Diagonal CAGED Arpeggio Slides across the whole neck (same-string slides '/' up & '\' down, frets 0–17)
import { useEffect, useMemo, useRef, useState } from 'react'
import { Fretboard, type Mark } from '../components/Fretboard'
import { HandShape } from '../components/HandShape'
import { Chips, KeyPicker, usePersist } from '../components/Controls'
import { audio } from '../audio/engine'
import { playNote, strum } from '../audio/pluck'
import { learnGo, openInPlay } from '../nav'
import { InYourCourses } from '../lessons/InYourCourses'
import type { Instrument } from '../instrument'
import { pc, SHARPS } from '../theory/notes'
import { jamProgression, STARTER_PROGS, starterProgression } from '../tabs/fromProgression'
import { usePracticeTimer } from './progress'
import {
  buildChordToChordConnection,
  buildConnectSong,
  buildDiagonalArpeggioSlides,
  buildDiagonalSong,
  CONNECT_LEVELS,
  CONNECT_ZONES,
  explainArpeggioConnect,
  formatArpNote,
  handGroupForConnectBar,
  type ConnectChordSize,
  type ConnectLevel,
  type ConnectZoneId,
  type DiagonalQuality,
} from './arpeggioConnect'

interface Props {
  inst: Instrument
  root: string
  setRoot: (k: string) => void
  minor: boolean
  setMinor: (m: boolean) => void
}

export function ArpeggioConnectView({ inst, root, setRoot, minor, setMinor }: Props) {
  const [subMode, setSubMode] = usePersist<'changes' | 'diagonal'>('arpConnMode', 'changes')
  const [progId, setProgId] = usePersist<string>('arpConnProg', 'pop')
  const [zoneId, setZoneId] = usePersist<ConnectZoneId>('arpConnZone', 'mid')
  const [level, setLevel] = usePersist<ConnectLevel>('arpConnLevel', 1)
  const [chordSize, setChordSize] = usePersist<ConnectChordSize>('arpConnSize', 'triad')
  const [diagQual, setDiagQual] = usePersist<DiagonalQuality>('arpConnDiagQ', minor ? 'min' : 'maj')
  const [bpm, setBpm] = usePersist<number>('arpConnBpm', 78)
  const [chordsUnder, setChordsUnder] = usePersist<boolean>('arpConnBacking', true)
  const [guideOpen, setGuideOpen] = usePersist<boolean>('arpConnGuide', true)

  const [barIdx, setBarIdx] = useState(0)
  const [activeStepIdx, setActiveStepIdx] = useState(-1)
  const [demoRunning, setDemoRunning] = useState(false)

  usePracticeTimer('caged', demoRunning, false)

  const jam = useMemo(() => jamProgression(), [])
  const r = pc(root)

  // Resolve chord progression for Mode 1 (either user's Jam chords or starter progression in chosen key)
  const activeProg = useMemo(() => {
    if (progId === 'jam' && jam?.chords.length) {
      const syms = jam.chords.slice(0, 8).map(c => c.symbol)
      return {
        label: `My Jam (${syms.join(' – ')})`,
        chords: syms,
        keyRootPc: pc(jam.tonic),
        keyMinor: ['minor', 'dorian', 'phrygian', 'harmonic'].includes(jam.mode),
      }
    }
    const safeId = progId === 'jam' ? 'pop' : progId
    const sp = starterProgression(safeId, root)
    const syms = sp.chords.slice(0, 8).map(c => c.symbol)
    return {
      label: STARTER_PROGS.find(p => p.id === safeId)?.label ?? 'I–V–vi–IV',
      chords: syms,
      keyRootPc: r,
      keyMinor: sp.mode === 'minor',
    }
  }, [progId, jam, root, r])

  const conn = useMemo(
    () =>
      buildChordToChordConnection({
        chords: activeProg.chords,
        keyRootPc: activeProg.keyRootPc,
        keyMinor: activeProg.keyMinor,
        inst,
        zoneId,
        level,
        chordSize,
      }),
    [activeProg, inst, zoneId, level, chordSize],
  )

  const diag = useMemo(
    () => buildDiagonalArpeggioSlides({ rootPc: r, quality: diagQual, inst }),
    [r, diagQual, inst],
  )

  const coach = useMemo(
    () => explainArpeggioConnect(subMode, level, chordSize),
    [subMode, level, chordSize],
  )

  const demoTimerRef = useRef<number | null>(null)
  function stopDemo() {
    if (demoTimerRef.current !== null) {
      clearTimeout(demoTimerRef.current)
      demoTimerRef.current = null
    }
    setDemoRunning(false)
    setActiveStepIdx(-1)
  }

  useEffect(() => {
    setBarIdx(0)
    stopDemo()
  }, [subMode, progId, zoneId, level, chordSize, diagQual, r, inst.id])

  useEffect(() => () => stopDemo(), [])

  const safeBarIdx = conn.bars.length ? barIdx % conn.bars.length : 0
  const curBar = conn.bars[safeBarIdx] ?? null
  const nextBar = conn.bars.length ? conn.bars[(safeBarIdx + 1) % conn.bars.length] : null
  const handGroup = useMemo(() => (curBar ? handGroupForConnectBar(curBar) : null), [curBar])

  // Mode 1 Demo Playback (with optional soft backing chord strum on beat 1!)
  function startChangesDemo(fromBar = safeBarIdx) {
    stopDemo()
    if (!conn.bars.length) return
    const ctx = audio()
    void ctx.resume()
    setDemoRunning(true)

    const msPerBeat = (60 / bpm) * 1000
    let b = fromBar
    let n = 0

    const tick = () => {
      const bar = conn.bars[b]
      if (!bar) { stopDemo(); return }
      setBarIdx(b)
      if (n === 0 && chordsUnder && bar.backingMidis.length) {
        strum(bar.backingMidis, audio().currentTime + 0.01, { gain: 0.34, spread: 0.024 })
      }
      const note = bar.notes[n]
      if (note) {
        setActiveStepIdx(n)
        playNote(note.midi, audio().currentTime + 0.015, note.isRoot ? 0.92 : note.isBridge ? 0.65 : 0.8)
      }
      const waitMs = Math.max(140, (note?.dur ?? 1) * msPerBeat)
      n++
      if (n >= bar.notes.length) {
        b++
        n = 0
        if (b >= conn.bars.length) {
          demoTimerRef.current = window.setTimeout(() => stopDemo(), waitMs)
          return
        }
      }
      demoTimerRef.current = window.setTimeout(tick, waitMs)
    }
    tick()
  }

  // Mode 2 Demo Playback (Diagonal CAGED Slides!)
  function startDiagonalDemo() {
    stopDemo()
    if (!diag.steps.length) return
    const ctx = audio()
    void ctx.resume()
    setDemoRunning(true)

    const msPerNote = Math.max(150, (60 / bpm) * 500)
    let i = 0

    const tick = () => {
      const st = diag.steps[i]
      if (!st) { stopDemo(); return }
      if (i === 0 && chordsUnder) {
        const rootMidi = 48 + r
        const chordMidis = diag.chord.pcs.slice(0, 4).map(p => (48 + p < rootMidi ? 60 + p : 48 + p))
        strum([rootMidi - 12, ...chordMidis], audio().currentTime + 0.01, { gain: 0.32, spread: 0.025 })
      }
      setActiveStepIdx(i)
      playNote(st.note.midi, audio().currentTime + 0.015, st.note.isRoot ? 0.92 : 0.78)
      i++
      if (i >= diag.steps.length) {
        demoTimerRef.current = window.setTimeout(() => stopDemo(), msPerNote * 1.4)
      } else {
        demoTimerRef.current = window.setTimeout(tick, msPerNote)
      }
    }
    tick()
  }

  function openInPlayHandler() {
    stopDemo()
    if (subMode === 'changes') {
      const song = buildConnectSong(conn, inst, bpm, level, 2)
      const id = `arp-connect:${inst.id}:${progId}:${SHARPS[activeProg.keyRootPc]}:${zoneId}:L${level}:${chordSize}`
      openInPlay({ id, title: song.title, artist: song.artist, source: 'lesson', inst: inst.id, song, updated: Date.now() })
    } else {
      const song = buildDiagonalSong(diag, inst, bpm)
      const id = `arp-diag:${inst.id}:${SHARPS[r]}:${diagQual}`
      openInPlay({ id, title: song.title, artist: song.artist, source: 'lesson', inst: inst.id, song, updated: Date.now() })
    }
  }

  // Mode 1 Fretboard marks + curved bar-line handoff arrow
  const activeChangesNote = subMode === 'changes' && curBar && activeStepIdx >= 0 ? curBar.notes[activeStepIdx] : null
  const changesMarkFor = (_midi: number, s: number, f: number): Mark | null => {
    if (!curBar) return null
    if (activeChangesNote && activeChangesNote.string === s && activeChangesNote.fret === f) {
      return { label: activeChangesNote.label, role: 'live' }
    }
    const bridgeHit = curBar.notes.find(n => n.isBridge && n.string === s && n.fret === f)
    if (bridgeHit) return { label: bridgeHit.label, role: 'pass' }

    const curHit = curBar.zoneTones.find(n => n.string === s && n.fret === f)
    const nextHit = nextBar?.zoneTones.find(n => n.string === s && n.fret === f)
    if (curHit && nextHit) return { label: curHit.label, role: 'common' }
    if (curHit) return { label: curHit.label, role: curHit.isRoot ? 'root' : 'chord' }
    if (nextHit) return { label: nextHit.label, role: 'next' }
    return null
  }

  const changesArrows = useMemo(() => {
    if (!curBar?.handoffToNext) return []
    const { from, to, kind } = curBar.handoffToNext
    if (from.string === to.string && from.fret === to.fret) return []
    return [{ s1: from.string, f1: from.fret, s2: to.string, f2: to.fret, kind: (kind === 'half-step' || to.isGuide ? 'guide' : 'move') as 'guide' | 'move' }]
  }, [curBar])

  // Mode 2 Fretboard marks + gold curved slide arrows across frets 0–17
  const activeDiagNote = subMode === 'diagonal' && activeStepIdx >= 0 ? diag.steps[activeStepIdx]?.note : null
  const diagPathKeys = useMemo(() => new Set(diag.steps.map(st => `${st.note.string}-${st.note.fret}`)), [diag])
  const diagMarkFor = (_midi: number, s: number, f: number): Mark | null => {
    if (activeDiagNote && activeDiagNote.string === s && activeDiagNote.fret === f) {
      return { label: activeDiagNote.label, role: 'live' }
    }
    const hit = diag.neckTones.find(n => n.string === s && n.fret === f)
    if (!hit) return null
    if (diagPathKeys.has(`${s}-${f}`)) {
      return { label: hit.label, role: hit.isRoot ? 'root' : 'chord' }
    }
    return { label: hit.label, role: 'ghost' }
  }

  const progChips = [
    ...(jam?.chords.length ? [{ id: 'jam', label: `🎸 My Jam (${jam.chords.slice(0, 4).map(c => c.symbol).join('–')})` }] : []),
    ...STARTER_PROGS.map(p => ({ id: p.id, label: p.label })),
  ]

  const slideCallouts = useMemo(
    () => diag.steps.filter(st => st.callout && st.note.tech === '/').map(st => st.callout!),
    [diag],
  )

  return (
    <div className="stack" style={{ gap: 12 }} data-testid="arpeggio-connect-view">
      {/* 1. Mode Switcher + Plain-English Coach Guide */}
      <div className="card stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="seg" role="tablist" aria-label="Arpeggio connection style">
            <button
              className="btn sm"
              role="tab"
              aria-selected={subMode === 'changes'}
              aria-pressed={subMode === 'changes'}
              onClick={() => setSubMode('changes')}
              data-testid="arp-mode-changes"
            >
              🔗 Chord-to-Chord (One Box)
            </button>
            <button
              className="btn sm"
              role="tab"
              aria-selected={subMode === 'diagonal'}
              aria-pressed={subMode === 'diagonal'}
              onClick={() => setSubMode('diagonal')}
              data-testid="arp-mode-diagonal"
            >
              ↗ Diagonal CAGED Slides
            </button>
          </div>
          <button
            className={`btn sm${guideOpen ? ' on' : ''}`}
            aria-pressed={guideOpen}
            onClick={() => setGuideOpen(g => !g)}
            data-testid="arp-guide-toggle"
          >
            📖 {guideOpen ? 'Hide Guide' : 'Explain How This Works'}
          </button>
        </div>

        {guideOpen && (
          <div className="caged-coach-box stack" style={{ gap: 6 }} data-testid="arp-coach-guide">
            <p className="small" style={{ margin: 0 }}><b>What you&apos;re doing:</b> {coach.what}</p>
            <p className="small" style={{ margin: 0 }}><b>Why it works:</b> {coach.why}</p>
            <p className="small" style={{ margin: 0 }}><b>How to play it:</b> {coach.how}</p>
            <p className="small muted" style={{ margin: 0 }}><b>Avoid this beginner trap:</b> {coach.avoid}</p>
          </div>
        )}

        {/* Controls per Mode */}
        {subMode === 'changes' ? (
          <div className="stack" style={{ gap: 8 }}>
            {progId !== 'jam' && <KeyPicker value={root} onChange={setRoot} label="Key" />}
            <Chips label="Progression" items={progChips} value={progId} onChange={setProgId} wrap />
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chips
                label="Neck Zone"
                items={CONNECT_ZONES.map(z => ({ id: z.id, label: z.label }))}
                value={zoneId}
                onChange={v => setZoneId(v as ConnectZoneId)}
              />
              <Chips
                label="Chord Tones"
                items={[
                  { id: 'triad', label: '3-Note Triads (R–3–5)' },
                  { id: '7th', label: '4-Note 7ths (R–3–5–7)' },
                ]}
                value={chordSize}
                onChange={v => setChordSize(v as ConnectChordSize)}
              />
            </div>
            <Chips
              label="Difficulty"
              items={CONNECT_LEVELS.map(l => ({ id: String(l.id), label: l.short }))}
              value={String(level)}
              onChange={v => setLevel(Number(v) as ConnectLevel)}
              wrap
            />
          </div>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            <KeyPicker value={root} onChange={setRoot} label="Chord Root" />
            <Chips
              label="Chord Type"
              items={[
                { id: 'maj', label: `${SHARPS[r]} Major (R–3–5)` },
                { id: 'min', label: `${SHARPS[r]}m Minor (R–♭3–5)` },
                { id: 'dom7', label: `${SHARPS[r]}7 Dominant (R–3–5–♭7)` },
              ]}
              value={diagQual}
              onChange={v => {
                const q = v as DiagonalQuality
                setDiagQual(q)
                setMinor(q === 'min')
              }}
            />
          </div>
        )}
      </div>

      {/* 2. Live Fretboard + Handoff Map */}
      {subMode === 'changes' && curBar ? (
        <div className="card stack" style={{ gap: 10 }}>
          {/* Bar-by-bar progression strip with handoff badges */}
          <div className="row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {conn.bars.map((b, i) => (
              <div key={`${b.chordName}-${i}`} className="row" style={{ gap: 4, alignItems: 'center' }}>
                <button
                  className={`btn sm${i === safeBarIdx ? ' primary' : ''}`}
                  style={{ padding: '3px 9px', minHeight: 28 }}
                  onClick={() => { stopDemo(); setBarIdx(i) }}
                >
                  {i + 1}. {b.chordName}
                </button>
                {i < conn.bars.length - 1 && b.handoffToNext && (
                  <span className="small muted" style={{ fontSize: 11 }}>
                    →{b.handoffToNext.kind === 'half-step' ? '½' : b.handoffToNext.kind === 'shared' ? '=' : ''}
                  </span>
                )}
              </div>
            ))}
          </div>

          <Fretboard
            tuning={inst.midis}
            fromFret={Math.max(0, conn.zone[0] - 1)}
            toFret={Math.min(18, conn.zone[1] + 2)}
            markFor={changesMarkFor}
            arrows={changesArrows}
            zoomId="arp-connect-changes"
            onTap={m => { const ctx = audio(); void ctx.resume(); playNote(m, ctx.currentTime + 0.01, 0.85) }}
          />

          <p className="small muted" style={{ margin: 0 }}>
            Red = Root · Gold = {curBar.chordName} chord tones · Gold ring = Shared with {nextBar?.chordName} · Teal ring = Next chord ({nextBar?.chordName}) · Arrow = Exact bar-line handoff{level === 2 ? ' · Cyan = Scale/approach bridge' : ''}.
          </p>

          {/* Bar-by-Bar Plain-English Handoff Explanation + HandShape + Note Sequence */}
          <div className="caged-warmup-detail">
            {handGroup && (
              <HandShape
                group={handGroup}
                moveSoon={false}
                expected={activeChangesNote ? [{ string: activeChangesNote.string, fret: activeChangesNote.fret, midi: activeChangesNote.midi }] : []}
                nStr={inst.strings}
                stringNames={inst.tuning.notes.map(n => n.replace(/\d+$/, ''))}
                compact
              />
            )}
            <div className="stack" style={{ gap: 6, flex: '1 1 240px' }}>
              <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>Bar {safeBarIdx + 1}: {curBar.chordName} → {nextBar?.chordName}</b>
                {curBar.handoffToNext && (
                  <span className="badge">
                    {curBar.handoffToNext.kind === 'half-step'
                      ? '1-fret pull!'
                      : curBar.handoffToNext.kind === 'whole-step'
                        ? '2-fret step'
                        : curBar.handoffToNext.kind === 'shared'
                          ? 'Shared tone'
                          : `${Math.abs(curBar.handoffToNext.semitones)}-fret step`}
                  </span>
                )}
              </div>
              {curBar.handoffToNext && (
                <p className="small" style={{ margin: 0 }} data-testid="arp-bar-callout">
                  💡 {curBar.handoffToNext.coachText}
                </p>
              )}
              <div className="caged-seq-strip" aria-label="Notes in this bar">
                {curBar.notes.map((n, ni) => (
                  <button
                    key={ni}
                    type="button"
                    className={`caged-note-pill${n.isRoot ? ' root' : ''}${n.isBridge ? ' bridge' : ''}${ni === activeStepIdx ? ' live' : ''}`}
                    onClick={() => { const ctx = audio(); void ctx.resume(); playNote(n.midi, ctx.currentTime + 0.01, 0.85) }}
                    title={`${SHARPS[n.pc]} (${n.label}) — tap to hear`}
                    style={{ cursor: 'pointer' }}
                  >
                    {ni === 0 ? '① ' : ''}{formatArpNote(n)} <small style={{ opacity: 0.75 }}>{n.label}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <b>{diag.chordName} Diagonal Slide Path:</b>
            <span className="badge">{diag.shapePath.join(' → ')} → back down</span>
          </div>

          <Fretboard
            tuning={inst.midis}
            fromFret={0}
            toFret={17}
            markFor={diagMarkFor}
            arrows={diag.slideArrows}
            zoomId="arp-connect-diag"
            onTap={m => { const ctx = audio(); void ctx.resume(); playNote(m, ctx.currentTime + 0.01, 0.85) }}
          />

          <p className="small muted" style={{ margin: 0 }}>
            Solid dots = your diagonal slide path · Gold arrows = slide along the SAME string into the next CAGED shape · Faint dots = other {diag.chordName} chord tones on the neck.
          </p>

          {slideCallouts.length > 0 && (
            <div className="caged-triad-bar stack" style={{ gap: 4 }}>
              <b className="small">Exact Shape-to-Shape Slides Going Up:</b>
              {slideCallouts.map((c, idx) => (
                <span key={idx} className="small">↗ {c}</span>
              ))}
            </div>
          )}

          <div className="caged-seq-strip" aria-label="Diagonal arpeggio slide notes">
            {diag.steps.map((st, idx) => (
              <button
                key={idx}
                type="button"
                className={`caged-note-pill${st.note.isRoot ? ' root' : ''}${idx === activeStepIdx ? ' live' : ''}`}
                onClick={() => { const ctx = audio(); void ctx.resume(); playNote(st.note.midi, ctx.currentTime + 0.01, 0.85) }}
                style={{ cursor: 'pointer' }}
              >
                {formatArpNote(st.note)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Audio Demo, BPM, Backing Chords & Open in Play */}
      <div className="card stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn sm${demoRunning ? ' primary' : ''}`}
            onClick={() => {
              if (demoRunning) stopDemo()
              else if (subMode === 'changes') startChangesDemo(0)
              else startDiagonalDemo()
            }}
            data-testid="arp-demo-btn"
          >
            {demoRunning ? '■ Stop Demo' : subMode === 'changes' ? '▶ Hear Connected Progression' : '▶ Hear Diagonal Slides'}
          </button>
          <button
            className={`btn sm${chordsUnder ? ' on' : ''}`}
            aria-pressed={chordsUnder}
            onClick={() => setChordsUnder(c => !c)}
            title="Strum the backing chord softly on beat 1 so your ear hears the harmony change"
          >
            🎸 Backing Chords {chordsUnder ? 'ON' : 'OFF'}
          </button>
          <label className="row small" style={{ gap: 6, alignItems: 'center' }}>
            <span>BPM</span>
            <input
              type="range"
              min={55}
              max={130}
              step={5}
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              style={{ width: 96, accentColor: 'var(--accent)' }}
              aria-label="Arpeggio connector tempo BPM"
            />
            <b className="tabular" style={{ minWidth: 28 }}>{bpm}</b>
          </label>
          <button className="btn primary sm" onClick={openInPlayHandler} data-testid="arp-open-play-btn">
            🎸 Open in Play (Backing Band + Mic)
          </button>
        </div>

        {/* Direct jumps to related deep lessons inside KGuitar */}
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4, borderTop: '1px solid var(--line)' }}>
          <span className="small muted">Go deeper in your lessons:</span>
          <button className="btn sm" onClick={() => learnGo({ lesson: 'c6-arps' })}>Level 6 · CAGED Arpeggios</button>
          <button className="btn sm" onClick={() => learnGo({ lesson: 'c6-targets' })}>Level 6 · Target Chord Tones</button>
          <button className="btn sm" onClick={() => learnGo({ tool: 'circle' })}>Circle Ch. 4 · One-Box Arpeggios</button>
        </div>
        <InYourCourses topics={['arpeggios', 'triads', 'chord-tones', 'caged', 'hexatonic']} title="Triad & arpeggio lessons in your courses" />
      </div>
    </div>
  )
}
