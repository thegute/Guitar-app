// Scaler-Style Songwriter Views mounted inside Jam → Flow Coach:
// 1) ChordVibeSetsView — Genre/Mood chord soundboards (tap to hear + see guitar shape + build Strum Machine chart)
// 2) KeyShifterView — Smooth multi-path Key A → Key B modulation bridge builder
// 3) DetectScaleView — Live mic / tapped pitch-class scale & mode detector → 1-tap Floating 5-Layer Neck or Strum Machine
import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { strum } from '../audio/pluck'
import { ChromaListener } from '../audio/chroma'
import { strumMachine } from '../audio/strumMachine'
import { downloadMidiFile, exportStrumChartToMidi } from '../audio/midiChords'
import { ChordDiagram } from './ChordDiagram'
import { VoiceLeadNeck } from './VoiceLeadNeck'
import { useInstrument } from '../instrument'
import { openLicksInKey, openStrumGrid } from '../nav'
import { KEYS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import { shapesFor } from '../theory/shapes'
import {
  chartForScale,
  parseChordQual,
  type EdgeFlavor,
  type StrumChart,
} from '../theory/harmonicFlow'
import {
  CHORD_VIBE_SETS,
  buildKeyShiftBridges,
  detectScalesFromPcs,
  resolveVibeSet,
  topPcsFromChroma,
  type ResolvedVibeChord,
} from '../theory/scalerSuite'

const FLAVOR_COLOR: Record<EdgeFlavor, { label: string; color: string }> = {
  diatonic: { label: 'In Key', color: 'var(--fb-mint, #10b981)' },
  pull: { label: 'Pull', color: 'var(--fb-gold, #f59e0b)' },
  color: { label: 'Color', color: 'var(--fb-embel, #c084fc)' },
}

function symbolToMidis(symbol: string): number[] {
  const parsed = parseChordQual(symbol)
  const r = 48 + (parsed?.rootPc ?? 0)
  const map: Record<string, number[]> = {
    '': [0, 4, 7, 12],
    m: [0, 3, 7, 12],
    '5': [0, 7, 12],
    '7': [0, 4, 7, 10],
    m7: [0, 3, 7, 10],
    maj7: [0, 4, 7, 11],
    dim: [0, 3, 6, 9],
    sus4: [0, 5, 7, 12],
    add9: [0, 4, 7, 14],
  }
  return (map[parsed?.qual ?? ''] ?? [0, 4, 7, 12]).map(iv => r + iv)
}

function playSymbol(symbol: string, delay = 0.015) {
  const ctx = audio()
  void ctx.resume()
  strum(symbolToMidis(symbol), ctx.currentTime + delay, { gain: 0.76, spread: 0.02 })
}

function shapeFor(symbol: string, inst: ReturnType<typeof useInstrument>) {
  const m = symbol.trim().match(/^([A-G][#b]?)(.*)$/)
  if (!m) return null
  const qual = parseChordQual(symbol)?.qual ?? ''
  const type = qual === '' ? '' : qual === 'm' ? 'm' : qual
  return shapesFor({ root: m[1], type }, inst)[0] ?? null
}

// =====================================================================================
// 1. Chord Vibe Sets
// =====================================================================================
export function ChordVibeSetsView({ tonic, onTonic }: { tonic: string; onTonic: (k: string) => void }) {
  const inst = useInstrument()
  const [setId, setSetId] = useState(CHORD_VIBE_SETS[0].id)
  const [selected, setSelected] = useState<ResolvedVibeChord | null>(null)
  const [chain, setChain] = useState<string[]>([])

  const def = useMemo(() => CHORD_VIBE_SETS.find(s => s.id === setId) ?? CHORD_VIBE_SETS[0], [setId])
  const chords = useMemo(() => resolveVibeSet(setId, tonic), [setId, tonic])

  // Seed a starter 4-chord chain whenever vibe or key changes if chain is empty
  useEffect(() => {
    const starter = def.starterProgression.map(i => chords[i]?.symbol).filter(Boolean) as string[]
    setChain(starter)
    setSelected(chords[0] ?? null)
  }, [setId, tonic, def, chords])

  const activeChord = selected ?? chords[0]
  const activeShape = useMemo(() => (activeChord ? shapeFor(activeChord.symbol, inst) : null), [activeChord, inst])

  const buildChart = (): StrumChart => ({
    id: `vibe-${setId}-${Date.now()}`,
    name: `${tonic}${def.minor ? 'm' : ''} ${def.name}`,
    tonic,
    minor: def.minor,
    capo: 0,
    bpm: def.defaultBpm,
    style: def.defaultStyle,
    bars: (chain.length ? chain : [chords[0].symbol]).map((c, idx) => ({
      chords: [c],
      section: idx === 0 ? def.name : undefined,
    })),
  })

  return (
    <div className="stack" style={{ gap: 12 }} data-testid="chord-vibe-sets">
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="field" style={{ minWidth: 96 }}>
            <span>Key</span>
            <select className="select" value={tonic} onChange={e => onTonic(e.target.value)} data-testid="vibe-key-select">
              {KEYS.map(k => <option key={k} value={k}>{k}{def.minor ? 'm' : ''}</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: '1 1 200px' }}>
            <span>Vibe / Genre</span>
            <select className="select" value={setId} onChange={e => setSetId(e.target.value)} data-testid="vibe-set-select">
              {CHORD_VIBE_SETS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>{def.desc}</p>
        <div className="row small" style={{ gap: 12 }}>
          <span style={{ color: FLAVOR_COLOR.diatonic.color }}>● In Key</span>
          <span style={{ color: FLAVOR_COLOR.pull.color }}>● Pull (Tension)</span>
          <span style={{ color: FLAVOR_COLOR.color.color }}>● Color (Borrowed)</span>
        </div>

        {/* Tappable Chord Soundboard */}
        <div className="vibe-pad-grid" data-testid="vibe-pad-grid">
          {chords.map((c, idx) => {
            const fc = FLAVOR_COLOR[c.flavor]
            const isSel = activeChord?.symbol === c.symbol && activeChord?.roman === c.roman
            return (
              <div
                key={`${c.roman}-${idx}`}
                className={`vibe-pad${isSel ? ' sel' : ''}`}
                style={{ borderColor: fc.color }}
                data-testid={`vibe-pad-${idx}`}
              >
                <button
                  className="vibe-pad-main"
                  onClick={() => {
                    setSelected(c)
                    playSymbol(c.symbol)
                  }}
                >
                  <span className="vibe-pad-sym">{c.symbol}</span>
                  <span className="vibe-pad-roman" style={{ color: fc.color }}>{c.roman}</span>
                  <span className="vibe-pad-tip">{c.tip}</span>
                </button>
                <button
                  className="btn sm vibe-pad-add"
                  onClick={() => {
                    setSelected(c)
                    playSymbol(c.symbol)
                    setChain(prev => [...prev, c.symbol].slice(-12))
                  }}
                  title={`Add ${c.symbol} to progression`}
                  data-testid={`vibe-add-${idx}`}
                >
                  + Add
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Guitar Shape + Progression Strip */}
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="stack" style={{ gap: 6, flex: '1 1 220px' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.92rem' }}>Your Vibe Progression</strong>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" disabled={chain.length === 0} onClick={() => setChain(c => c.slice(0, -1))}>Undo</button>
                <button className="btn sm" onClick={() => setChain([])}>Clear</button>
              </div>
            </div>
            <div className="flow-trail" data-testid="vibe-chain">
              {chain.length === 0 && <span className="small muted">Tap "+ Add" on any chord above to build a progression.</span>}
              {chain.map((sym, i) => (
                <span key={`${sym}-${i}`} className="flow-trail-chip">
                  {i > 0 && <span className="muted" style={{ marginRight: 4 }}>→</span>}
                  <button className="btn sm" onClick={() => playSymbol(sym)}>{sym}</button>
                </span>
              ))}
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <button
                className="btn sm primary"
                disabled={chain.length === 0}
                onClick={() => openStrumGrid({ chart: buildChart(), autoPlay: true })}
                data-testid="vibe-to-strum"
              >
                🎸 Open in Strum Machine
              </button>
              <button
                className="btn sm"
                disabled={chain.length === 0}
                onClick={() => downloadMidiFile(exportStrumChartToMidi(buildChart()), `${tonic}_${def.id}`)}
                data-testid="vibe-export-midi"
              >
                🎹 Export .mid
              </button>
              <button className="btn sm" onClick={() => openLicksInKey(tonic, def.minor)}>
                ⚡ Licks in {tonic}{def.minor ? 'm' : ''}
              </button>
            </div>
          </div>
          {activeChord && activeShape && (
            <div className="stack" style={{ alignItems: 'center', gap: 2 }}>
              <span className="small muted">{activeChord.symbol} ({activeChord.roman})</span>
              <ChordDiagram name={activeChord.symbol} voicing={activeShape} active size={0.85} onClick={() => playSymbol(activeChord.symbol)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================================================
// 2. Key Shifter (Modulation Bridge Wizard)
// =====================================================================================
export function KeyShifterView({ initialTonic, initialMinor }: { initialTonic: string; initialMinor: boolean }) {
  const inst = useInstrument()
  const [fromTonic, setFromTonic] = useState(initialTonic)
  const [fromMinor, setFromMinor] = useState(initialMinor)
  const [toTonic, setToTonic] = useState(() => KEYS[(pc(initialTonic) + 3) % 12])
  const [toMinor, setToMinor] = useState(initialMinor)
  const [pickedIdx, setPickedIdx] = useState(0)

  const bridges = useMemo(
    () => buildKeyShiftBridges(fromTonic, fromMinor, toTonic, toMinor),
    [fromTonic, fromMinor, toTonic, toMinor],
  )
  const active = bridges[pickedIdx] ?? bridges[0]
  const flats = keyPrefersFlats(toTonic, toMinor)

  const audition = (syms: string[]) => {
    syms.forEach((s, i) => playSymbol(s, 0.02 + i * 0.95))
  }

  const sendToStrum = (syms: string[], title: string) => {
    const chart: StrumChart = {
      id: `keyshift-${Date.now()}`,
      name: `${fromTonic}${fromMinor ? 'm' : ''} → ${toTonic}${toMinor ? 'm' : ''} (${title})`,
      tonic: toTonic,
      minor: toMinor,
      capo: 0,
      bpm: 96,
      style: 'folk',
      bars: syms.map((c, idx) => ({ chords: [c], section: idx === 0 ? 'Key Shift' : undefined })),
    }
    openStrumGrid({ chart, autoPlay: true })
  }

  return (
    <div className="stack" style={{ gap: 12 }} data-testid="key-shifter-view">
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="field" style={{ minWidth: 96 }}>
            <span>From Key</span>
            <select className="select" value={fromTonic} onChange={e => setFromTonic(e.target.value)} data-testid="shift-from-key">
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Start key quality">
            <button aria-pressed={!fromMinor} onClick={() => setFromMinor(false)}>Maj</button>
            <button aria-pressed={fromMinor} onClick={() => setFromMinor(true)}>Min</button>
          </div>
          <span style={{ fontWeight: 800, padding: '0 4px', alignSelf: 'center' }}>→</span>
          <label className="field" style={{ minWidth: 96 }}>
            <span>To Key</span>
            <select className="select" value={toTonic} onChange={e => setToTonic(e.target.value)} data-testid="shift-to-key">
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Target key quality">
            <button aria-pressed={!toMinor} onClick={() => setToMinor(false)}>Maj</button>
            <button aria-pressed={toMinor} onClick={() => setToMinor(true)}>Min</button>
          </div>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          {bridges.map((br, i) => {
            const syms = br.steps.map(s => s.symbol)
            return (
              <div
                key={br.id}
                className={`card stack${pickedIdx === i ? ' selected-bridge' : ''}`}
                style={{ gap: 8, padding: 10, border: pickedIdx === i ? '2px solid var(--accent)' : '1px solid var(--line)', borderRadius: 10 }}
                onClick={() => setPickedIdx(i)}
                data-testid={`shift-bridge-${br.id}`}
              >
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <strong>{br.title}</strong> <span className="badge">{br.feel}</span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn sm" onClick={e => { e.stopPropagation(); audition(syms) }}>▶ Hear Bridge</button>
                    <button className="btn sm primary" onClick={e => { e.stopPropagation(); sendToStrum(syms, br.title) }}>
                      🎸 Open in Strum Machine
                    </button>
                  </div>
                </div>
                <div className="flow-trail">
                  {br.steps.map((st, idx) => (
                    <span key={idx} className="flow-trail-chip">
                      {idx > 0 && <span className="muted" style={{ marginRight: 4 }}>→</span>}
                      <button
                        className="btn sm"
                        style={{ borderColor: FLAVOR_COLOR[st.flavor].color }}
                        onClick={e => { e.stopPropagation(); playSymbol(st.symbol) }}
                      >
                        <b>{st.symbol}</b> <span className="small muted">({st.role})</span>
                      </button>
                    </span>
                  ))}
                </div>
                <p className="small muted" style={{ margin: 0 }}>{br.explanation}</p>
              </div>
            )
          })}
        </div>
      </div>

      {active && active.steps.length >= 2 && (
        <div className="panel stack" style={{ gap: 8 }}>
          <strong style={{ fontSize: '0.92rem' }}>Voice-Leading Neck: {active.steps.map(s => s.symbol).join(' → ')}</strong>
          <VoiceLeadNeck
            chords={active.steps.map(s => s.symbol)}
            tuning={inst.midis}
            where="keyShift"
            flats={flats}
            compact
            bpm={90}
          />
        </div>
      )}
    </div>
  )
}

// =====================================================================================
// 3. Detect Scale (Play or Tap Notes → Find Scale & Launch 5-Layer Neck / Strum Machine)
// =====================================================================================
export function DetectScaleView({ onPickVibe }: { onPickVibe: (tonic: string) => void }) {
  const [pcs, setPcs] = useState<number[]>([9, 0, 2, 4, 7]) // default Am pentatonic example ready to inspect
  const [listening, setListening] = useState(false)
  const [err, setErr] = useState('')
  const listenerRef = useRef<ChromaListener | null>(null)

  useEffect(() => () => { listenerRef.current?.stop() }, [])

  const toggleMic = async () => {
    if (listening) {
      listenerRef.current?.stop()
      listenerRef.current = null
      setListening(false)
      return
    }
    setErr('')
    try {
      const cl = new ChromaListener()
      cl.onChord = chroma => {
        const found = topPcsFromChroma(chroma, 3)
        if (found.length) {
          setPcs(prev => [...new Set([...prev, ...found])])
        }
      }
      await cl.start()
      listenerRef.current = cl
      setPcs([])
      setListening(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Microphone unavailable.')
      setListening(false)
    }
  }

  const togglePc = (p: number) => {
    setPcs(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]))
  }

  const matches = useMemo(() => detectScalesFromPcs(pcs, 6), [pcs])

  return (
    <div className="stack" style={{ gap: 12 }} data-testid="detect-scale-view">
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`btn sm${listening ? ' primary' : ''}`}
              onClick={() => void toggleMic()}
              data-testid="detect-mic-btn"
            >
              🎤 {listening ? 'Listening… (Play notes or chords)' : 'Listen to My Guitar'}
            </button>
            <button className="btn sm" onClick={() => setPcs([])} data-testid="detect-clear-btn">Clear Notes</button>
          </div>
          <span className="small muted">{pcs.length} note{pcs.length === 1 ? '' : 's'} active</span>
        </div>

        {err && <p className="small" style={{ color: 'var(--coral)', margin: 0 }}>{err}</p>}

        {/* 12-Note Tappable Note Pad */}
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} data-testid="detect-note-pad">
          {SHARPS.map((n, i) => {
            const on = pcs.includes(i)
            return (
              <button
                key={n}
                className={`btn sm${on ? ' primary' : ''}`}
                aria-pressed={on}
                onClick={() => togglePc(i)}
                data-testid={`detect-note-${n}`}
                style={{ minWidth: 42 }}
              >
                {n}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ranked Matching Scales & Modes */}
      <div className="panel stack" style={{ gap: 8 }} data-testid="detect-results">
        <strong style={{ fontSize: '0.95rem' }}>Top Matching Scales &amp; Modes</strong>
        {matches.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>Tap at least 2 notes above or play your guitar to detect your scale.</p>
        ) : (
          matches.map((m, idx) => (
            <div
              key={`${m.root}-${m.scaleId}`}
              className="row"
              style={{
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: idx === 0 ? '2px solid var(--fb-mint, #10b981)' : '1px solid var(--line)',
              }}
              data-testid={`detect-match-${idx}`}
            >
              <div>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <strong>{m.label}</strong>
                  <span className="badge" style={{ color: 'var(--fb-mint, #10b981)' }}>
                    {Math.round(m.score * 100)}% fit ({m.matched}/{m.totalInput})
                  </span>
                </div>
                <p className="small muted" style={{ margin: '2px 0 0' }}>{m.feel}</p>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn sm primary"
                  onClick={() => {
                    const chart = chartForScale(m.root, m.scaleId, m.minor ? 'folk' : 'folk')
                    strumMachine.setChart(chart, { autoPlay: true })
                    strumMachine.setFloatNeckFollow('key')
                    strumMachine.setFloatNeckOpen(true)
                  }}
                >
                  🎸 Jam + 5-Layer Neck
                </button>
                <button
                  className="btn sm"
                  onClick={() => openStrumGrid({ chart: chartForScale(m.root, m.scaleId, 'folk'), autoPlay: true })}
                >
                  Strum Machine
                </button>
                <button className="btn sm" onClick={() => onPickVibe(m.root)}>
                  Vibe Sets
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
