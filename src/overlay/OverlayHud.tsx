// Sleek translucent floating HUD rendered inside Android's OverlayService WebView (?overlay=1)
// so KGuitar floats right on top of Songsterr, YouTube, Spotify, or any other app!
// Features:
// - Live Ear: listens to Songsterr/YouTube/Spotify audio → live Chord, Key, Best Solo Scale & Chord Trail
// - 5-Layer Fretboard (with Capo) locked to live chord/key
// - Mini Harmonic GPS Circle of Fifths lighting up the chord trail
// - Live Pro Licks transposed to the song's key/chord
// - Tools: Quick Tuner, Chord Lookup (+ Strum), Tap Tempo + Soft Drone, Sticky Note, Streak Logger,
//   and 1-tap Scan Riff / Match Song Vibe / Send to Jam launchers!
import { useEffect, useMemo, useRef, useState } from 'react'
import { PitchDetector } from 'pitchy'
import { LayerNeck } from '../components/LayerNeck'
import { CircleOfFifths } from '../components/CircleOfFifths'
import { ChordDiagram } from '../components/ChordDiagram'
import { HandShape } from '../components/HandShape'
import { LicksCardBody } from '../float/CreativeCards'
import { Ico } from '../components/Icon'
import { stringName, useInstrument } from '../instrument'
import { usePracticeTimer } from '../learn/progress'
import { audio } from '../audio/engine'
import { openInput, type OpenedInput } from '../audio/input'
import { addChroma } from '../audio/chroma'
import { ChordSegmenter, chordName, matchChords } from '../audio/chordFinder'
import { Drone } from '../audio/drone'
import { activeSound, strum } from '../audio/pluck'
import { parseSymbol } from '../theory/chords'
import { shapesFor } from '../theory/shapes'
import { KEYS, SHARPS, FLATS, keyPrefersFlats, pc } from '../theory/notes'
import { detectKey } from '../tabs/keyDetect'
import {
  addSystemBubble,
  appendChordTrail,
  broadcastOverlayState,
  formatTrailForJam,
  guessBestScale,
  isNativeOverlayWebView,
  loadSharedOverlayState,
  nativeBridge,
  overlayInitialTab,
  overlayWindowId,
  pushOverlayChordLabel,
  subscribeOverlayState,
  type TrailChord,
} from './bridge'
import { scaleBoxesToHandGroups, voicingToHandGroup } from './handGuideHelper'

type HudTab = 'neck' | 'hand' | 'circle' | 'licks' | 'tools'
const VALID_TABS: HudTab[] = ['neck', 'hand', 'circle', 'licks', 'tools']
const QUALS = ['', 'm', '7', 'm7', 'maj7'] as const

const hudDrone = new Drone()

function noteFromFreq(freq: number): { name: string; cents: number } | null {
  if (!freq || freq < 60 || freq > 1400) return null
  const midiFloat = 69 + 12 * Math.log2(freq / 440)
  const midi = Math.round(midiFloat)
  const cents = Math.round((midiFloat - midi) * 100)
  const name = SHARPS[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1)
  return { name, cents }
}

export function OverlayHud() {
  const inst = useInstrument()
  const isNative = isNativeOverlayWebView()
  const bridge = nativeBridge()
  const wid = useMemo(() => overlayWindowId(), [])

  // Practicing over Songsterr / YouTube automatically counts toward KGuitar's daily streak!
  usePracticeTimer('jam', true, true)

  const initialShared = useMemo(() => loadSharedOverlayState(), [])
  const [tab, setTab] = useState<HudTab>(() => {
    const t = overlayInitialTab() as HudTab
    return VALID_TABS.includes(t) ? t : 'neck'
  })
  const [root, setRoot] = useState(initialShared?.root ?? 'E')
  const [qual, setQual] = useState<string>(initialShared?.qual ?? 'm')
  const [keyRoot, setKeyRoot] = useState(initialShared?.keyRoot ?? 'G')
  const [keyMinor, setKeyMinor] = useState(initialShared?.keyMinor ?? false)
  const [capo, setCapo] = useState(initialShared?.capo ?? 0)
  const [trail, setTrail] = useState<TrailChord[]>(
    initialShared?.trail?.length ? initialShared.trail : [{ symbol: 'Em', root: 'E', minor: true, at: 1 }],
  )

  // Hand Fingers tab controls (Chord voicings vs 5 Solo Scale boxes)
  const [handMode, setHandMode] = useState<'chord' | 'scale'>('chord')
  const [voicingIdx, setVoicingIdx] = useState(0)
  const [boxIdx, setBoxIdx] = useState(0)

  // HUD appearance & collapsible menu controls
  const [hudOpacity, setHudOpacity] = useState(0.95)
  const [hudZoom, setHudZoom] = useState(1)
  const [showAppear, setShowAppear] = useState(false)
  const [menuHidden, setMenuHidden] = useState(false)
  const [chordDrawer, setChordDrawer] = useState(false)

  // Live Ear state (mic / speaker listener for Songsterr / YouTube / Spotify)
  const [listening, setListening] = useState(false)
  const [earErr, setEarErr] = useState('')
  const [liveConfidence, setLiveConfidence] = useState(0)
  const [tunerRead, setTunerRead] = useState<{ name: string; cents: number } | null>(null)
  const inputRef = useRef<OpenedInput | null>(null)
  const rafRef = useRef<number>(0)
  const segRef = useRef<ChordSegmenter | null>(null)

  // Tools: Chord Lookup, Tap Tempo, Drone, Sticky Note
  const [lookup, setLookup] = useState('Em7')
  const [droneOn, setDroneOn] = useState(false)
  const [bpm, setBpm] = useState(initialShared?.bpm ?? 100)
  const tapsRef = useRef<number[]>([])
  const [sticky, setSticky] = useState(() => {
    try { return localStorage.getItem('kg:sticky:overlay') ?? '' } catch { return '' }
  })

  // Prevent echo loops when applying state broadcast from another open bubble
  const applyingRemote = useRef(false)

  const activeSymbol = `${root}${qual}`
  const isChordMinor = qual === 'm' || qual === 'm7'
  const effectiveRootPc = (pc(root) - capo + 12) % 12
  const effectiveKeyPc = (pc(keyRoot) - capo + 12) % 12
  const effectiveRootName = (keyPrefersFlats(keyRoot, keyMinor) ? FLATS : SHARPS)[effectiveRootPc]
  const bestScale = useMemo(() => guessBestScale(keyRoot, keyMinor, activeSymbol), [keyRoot, keyMinor, activeSymbol])

  // Notify native drag bar & Edge Pill of current tab & chord
  useEffect(() => { bridge?.setTab?.(tab) }, [bridge, tab])
  useEffect(() => {
    pushOverlayChordLabel(`${activeSymbol} · Key ${keyRoot}${keyMinor ? 'm' : ''}`)
  }, [activeSymbol, keyRoot, keyMinor])

  // Broadcast state changes to all other open overlay bubbles (so 1 Live Ear drives ALL open bubbles!)
  useEffect(() => {
    if (applyingRemote.current) { applyingRemote.current = false; return }
    broadcastOverlayState({ root, qual, keyRoot, keyMinor, capo, bpm, trail, fromWid: wid, at: Date.now() })
  }, [root, qual, keyRoot, keyMinor, capo, bpm, trail, wid])

  // Subscribe to updates from sibling overlay bubbles
  useEffect(() => subscribeOverlayState(wid, s => {
    applyingRemote.current = true
    setRoot(s.root)
    setQual(s.qual)
    setKeyRoot(s.keyRoot)
    setKeyMinor(s.keyMinor)
    setCapo(s.capo)
    setBpm(s.bpm)
    if (s.trail?.length) setTrail(s.trail)
  }), [wid])

  // Reset chord voicing index when chord changes
  useEffect(() => { setVoicingIdx(0) }, [effectiveRootName, qual])

  useEffect(() => () => {
    hudDrone.stop()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    inputRef.current?.stream.getTracks().forEach(t => t.stop())
  }, [])

  // Real-time Live Ear loop: runs Chroma chord detection + PitchDetector tuner simultaneously
  async function toggleListen() {
    if (listening) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      inputRef.current?.stream.getTracks().forEach(t => t.stop())
      inputRef.current = null
      setListening(false)
      setTunerRead(null)
      return
    }
    setEarErr('')
    try {
      const inp = await openInput()
      inputRef.current = inp
      const ctx = audio()
      if (ctx.state === 'suspended') void ctx.resume()
      const src = ctx.createMediaStreamSource(inp.stream)
      const an = ctx.createAnalyser()
      an.fftSize = 4096
      an.smoothingTimeConstant = 0.65
      src.connect(an)
      const binHz = ctx.sampleRate / an.fftSize
      const timeBuf = new Float32Array(an.fftSize)
      const freqBuf = new Float32Array(an.frequencyBinCount)
      const detector = PitchDetector.forFloat32Array(an.fftSize)
      const seg = new ChordSegmenter(0.45, 0.30)
      segRef.current = seg
      const startTime = performance.now()
      let lastTick = 0
      const keyHist = new Array<number>(12).fill(0)
      let keySamples = 0
      setListening(true)

      const loop = () => {
        if (!inputRef.current) return
        rafRef.current = requestAnimationFrame(loop)
        const now = performance.now()
        if (now - lastTick < 90) return
        lastTick = now

        an.getFloatTimeDomainData(timeBuf)
        an.getFloatFrequencyData(freqBuf)
        let sumSq = 0
        for (let i = 0; i < timeBuf.length; i++) sumSq += timeBuf[i] * timeBuf[i]
        const rms = Math.sqrt(sumSq / timeBuf.length)

        // Tuner pitch readout
        if (rms > 0.008) {
          const [freq, clarity] = detector.findPitch(timeBuf, ctx.sampleRate)
          if (clarity > 0.86) setTunerRead(noteFromFreq(freq))
        }

        // Chroma + bass chroma chord detection
        if (rms > 0.005) {
          const chroma = new Array<number>(12).fill(0)
          const bass = new Array<number>(12).fill(0)
          addChroma(freqBuf, binHz, chroma)
          for (let i = Math.floor(55 / binHz); i < Math.min(freqBuf.length, Math.floor(220 / binHz)); i++) {
            const db = freqBuf[i]
            if (db < -72) continue
            const midi = Math.round(69 + 12 * Math.log2((i * binHz) / 440))
            bass[((midi % 12) + 12) % 12] += Math.pow(10, db / 20)
          }
          const tSec = (now - startTime) / 1000
          seg.push(tSec, chroma, bass, rms, false)
          const top = matchChords(chroma, bass)[0]
          if (top) setLiveConfidence(Math.round(Math.min(1, top.score) * 100))

          const lastSeg = seg.segments[seg.segments.length - 1]
          if (lastSeg && lastSeg.score > 0.58) {
            const flats = keyPrefersFlats(keyRoot, keyMinor)
            const rName = (flats ? FLATS : SHARPS)[lastSeg.root]
            const sym = chordName(lastSeg, flats)
            const min = lastSeg.q === 'm' || lastSeg.q === 'm7'
            setRoot(rName)
            setQual(lastSeg.q)
            setTrail(tr => appendChordTrail(tr, sym, rName, min, 8))
            keyHist[lastSeg.root] += 1.5
            keyHist[(lastSeg.root + (min ? 3 : 4)) % 12] += 1
            keyHist[(lastSeg.root + 7) % 12] += 1
            keySamples++
            if (keySamples >= 3) {
              const bestKey = detectKey(keyHist)[0]
              if (bestKey) {
                setKeyRoot(bestKey.root)
                setKeyMinor(bestKey.minor)
              }
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch {
      setEarErr('Allow microphone permission so KGuitar can hear Songsterr / YouTube.')
      setListening(false)
    }
  }

  function pickManualChord(r: string, q: string) {
    setRoot(r)
    setQual(q)
    const min = q === 'm' || q === 'm7'
    setTrail(tr => appendChordTrail(tr, `${r}${q}`, r, min, 8))
  }

  function sendTrailToJam() {
    const chords = formatTrailForJam(trail)
    try {
      localStorage.setItem('kg:progKey', JSON.stringify(keyRoot))
      localStorage.setItem('kg:progMode', JSON.stringify(keyMinor ? 'minor' : 'major'))
      localStorage.setItem('kg:progBpm', JSON.stringify(bpm))
      if (chords.length) localStorage.setItem('kg:overlayJamChords', JSON.stringify(chords))
    } catch { /* storage full */ }
    if (bridge) bridge.openMain('jam')
    else location.href = '/'
  }

  function openRoute(route: string) {
    if (bridge) bridge.openMain(route)
    else location.href = '/'
  }

  function tapTempo() {
    const now = performance.now()
    const recent = tapsRef.current.filter(t => now - t < 2500)
    recent.push(now)
    tapsRef.current = recent.slice(-6)
    if (recent.length >= 2) {
      let sum = 0
      for (let i = 1; i < recent.length; i++) sum += recent[i] - recent[i - 1]
      const avg = sum / (recent.length - 1)
      setBpm(Math.max(40, Math.min(240, Math.round(60000 / avg))))
    }
  }

  function toggleDrone() {
    if (droneOn) {
      hudDrone.stop()
      setDroneOn(false)
    } else {
      hudDrone.start(pc(keyRoot), [0, 7])
      setDroneOn(true)
    }
  }

  const lookupShapes = useMemo(() => {
    try {
      const p = parseSymbol(lookup.trim() || activeSymbol)
      return shapesFor({ root: p.root, type: p.suffix }, inst).slice(0, 3)
    } catch { return [] }
  }, [lookup, activeSymbol, inst])

  // Chord voicings & 5 solo scale boxes for the live "Where to put your fingers (1-2-3-4)" Hand tab
  const activeChordShapes = useMemo(() => {
    try {
      const p = parseSymbol(`${effectiveRootName}${qual}`)
      return shapesFor({ root: p.root, type: p.suffix }, inst).slice(0, 5)
    } catch { return [] }
  }, [effectiveRootName, qual, inst])
  const curVoicing = activeChordShapes[voicingIdx % Math.max(1, activeChordShapes.length)] ?? null
  const chordHandGroup = useMemo(() => (curVoicing ? voicingToHandGroup(curVoicing) : null), [curVoicing])
  const scaleBoxes = useMemo(
    () => scaleBoxesToHandGroups(effectiveKeyPc, keyMinor, inst.midis),
    [effectiveKeyPc, keyMinor, inst.midis],
  )
  const curScaleBox = scaleBoxes[boxIdx % Math.max(1, scaleBoxes.length)] ?? null
  const stringNames = useMemo(
    () => Array.from({ length: inst.midis.length }, (_, s) => stringName(inst.midis, s)),
    [inst.midis],
  )

  const floatCtx = useMemo(() => ({
    keyName: `${keyRoot}${keyMinor ? 'm' : ''}`,
    chordNow: activeSymbol,
    bpm,
    tuning: inst.midis,
  }), [keyRoot, keyMinor, activeSymbol, bpm, inst.midis])

  const changeOpacity = (v: number) => {
    const clamped = Math.max(0.3, Math.min(1, v))
    setHudOpacity(clamped)
    bridge?.setOpacity(clamped)
  }

  return (
    <div
      className={`ov-root${menuHidden ? ' ov-pure' : ''}`}
      style={{ opacity: isNative ? 1 : hudOpacity }}
      data-testid="overlay-hud"
    >
      {/* Pure Canvas Mode: tiny corner pill brings controls right back */}
      {menuHidden && (
        <button
          className={`ov-restore-pill${listening ? ' live' : ''}`}
          onClick={() => setMenuHidden(false)}
          data-testid="ov-show-menu"
          title="Show menu & controls"
          aria-label="Show menu"
        >
          ☰ {listening ? '● ' : ''}{activeSymbol}
        </button>
      )}

      {/* Single Ultra-Slim Top Micro-Bar (scrolls away cleanly when you swipe up!) */}
      {!menuHidden && (
        <div className="ov-chrome">
          <div className="ov-bar">
            <button
              className={`ov-icon-btn${listening ? ' live' : ''}`}
              onClick={() => void toggleListen()}
              data-testid="ov-listen"
              title="Listen to Songsterr, YouTube or your guitar to detect chords & key live"
              aria-label={listening ? 'Stop Live Ear' : 'Start Live Ear'}
            >
              {listening ? '●' : '🎤'}
            </button>

            <button
              className={`ov-chord-pill${chordDrawer ? ' on' : ''}`}
              onClick={() => setChordDrawer(v => !v)}
              data-testid="ov-chord-drawer-btn"
              title={`Chord ${activeSymbol} · Key ${keyRoot}${keyMinor ? 'm' : ''} (tap for chord trail, solo scale, manual chord, Capo & + Bubble)`}
              aria-expanded={chordDrawer}
            >
              <strong>{activeSymbol}</strong>
              <span className="ov-pill-key">{keyRoot}{keyMinor ? 'm' : ''}{capo > 0 ? ` C${capo}` : ''}</span>
              <span className="ov-caret">{chordDrawer ? '▴' : '▾'}</span>
            </button>

            <div className="ov-tabs seg" role="tablist" aria-label="Overlay tools">
              {([
                ['neck', 'Neck'],
                ['hand', 'Hand'],
                ['circle', 'Circle'],
                ['licks', 'Licks'],
                ['tools', 'Tools'],
              ] as const).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)} data-testid={`ov-tab-${id}`}>
                  {label}
                </button>
              ))}
            </div>

            <button
              className={`ov-icon-btn${showAppear ? ' on' : ''}`}
              onClick={() => setShowAppear(v => !v)}
              title="Opacity & Zoom"
              aria-label="Opacity and Zoom"
            >
              ◐
            </button>

            <button
              className="ov-icon-btn"
              onClick={() => { setMenuHidden(true); setChordDrawer(false); setShowAppear(false) }}
              data-testid="ov-hide-menu"
              title="Hide menu (full Fretboard / Hand / Circle view)"
              aria-label="Hide menu"
            >
              ▴
            </button>

            {!isNative && (
              <button className="ov-icon-btn" onClick={() => { location.href = '/' }} title="Back to full KGuitar">↗</button>
            )}
          </div>

          {/* Opacity & Zoom Strip (collapsible) */}
          {showAppear && (
            <div className="ov-appear row small">
              <span className="muted">Opacity</span>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={Math.round(hudOpacity * 100)}
                onChange={e => changeOpacity(Number(e.target.value) / 100)}
                style={{ flex: 1, minWidth: 60 }}
              />
              <span className="tabular">{Math.round(hudOpacity * 100)}%</span>
              <span className="muted" style={{ marginLeft: 4 }}>Zoom</span>
              <button className="fc-op-chip" onClick={() => setHudZoom(z => Math.max(0.75, Math.round((z - 0.1) * 100) / 100))}>−</button>
              <button className="fc-op-chip tabular" onClick={() => setHudZoom(1)}>{Math.round(hudZoom * 100)}%</button>
              <button className="fc-op-chip" onClick={() => setHudZoom(z => Math.min(1.4, Math.round((z + 0.1) * 100) / 100))}>+</button>
            </div>
          )}

          {earErr && <div className="ov-err small">{earErr}</div>}

          {/* Collapsible Chord / Trail / Solo Scale / Capo / + Multi-Bubble Drawer */}
          {chordDrawer && (
            <div className="ov-drawer stack" data-testid="ov-chord-drawer">
              <div className="ov-scale small">
                <span className="muted">Solo:</span> <b>{bestScale}</b>
                {listening && liveConfidence > 0 && <span className="muted"> ({liveConfidence}%)</span>}
              </div>
              <div className="ov-trail">
                {trail.map((t, i) => (
                  <button
                    key={`${t.symbol}-${i}`}
                    className={`ov-chip${i === trail.length - 1 ? ' now' : ''}`}
                    onClick={() => { setRoot(t.root); setQual(t.minor ? 'm' : '') }}
                  >
                    {t.symbol}
                  </button>
                ))}
                <button className="ov-chip jam" onClick={sendTrailToJam} title="Send detected chords straight into KGuitar Jam">
                  → Jam
                </button>
              </div>
              <div className="row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="select sm"
                  value={root}
                  onChange={e => pickManualChord(e.target.value, qual)}
                  aria-label="Chord root"
                  style={{ minHeight: 26, padding: '1px 6px', fontSize: 12 }}
                >
                  {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                {QUALS.map(q => (
                  <button
                    key={q || 'maj'}
                    className={`chip${qual === q ? ' on' : ''}`}
                    style={{ minHeight: 24, padding: '1px 7px', fontSize: 11 }}
                    onClick={() => pickManualChord(root, q)}
                  >
                    {q || 'Maj'}
                  </button>
                ))}
                <label className="small muted row" style={{ gap: 4, marginLeft: 'auto' }}>
                  Capo
                  <select
                    className="select sm"
                    value={capo}
                    onChange={e => setCapo(Number(e.target.value))}
                    style={{ minHeight: 24, padding: '1px 4px', fontSize: 11 }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(c => <option key={c} value={c}>{c === 0 ? 'Off' : `Fret ${c}`}</option>)}
                  </select>
                </label>
              </div>
              <div className="row small" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: 11 }}>Open extra bubble:</span>
                {(['neck', 'hand', 'circle', 'licks'] as const).map(kind => (
                  <button
                    key={kind}
                    className="ov-chip"
                    onClick={() => { void addSystemBubble(kind); setChordDrawer(false) }}
                    data-testid={`ov-spawn-${kind}`}
                  >
                    + {kind === 'neck' ? 'Fretboard' : kind === 'hand' ? 'Hand Fingers' : kind === 'circle' ? 'Circle' : 'Licks'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Zoomable Content Body (scrolls together with the top bar!) */}
      <div className="ov-body" style={hudZoom !== 1 ? { zoom: hudZoom } : undefined}>
        {tab === 'neck' && (
          <div className="ov-neck-wrap">
            <LayerNeck
              rootPc={effectiveRootPc}
              minor={isChordMinor}
              inst={inst}
              where="overlayHud"
              compact
              floating
              noLinks={['caged', 'chord', 'scale', 'licks']}
            />
          </div>
        )}

        {tab === 'hand' && (
          <div className="ov-hand-wrap stack" style={{ gap: 6 }} data-testid="ov-hand-panel">
            {!menuHidden && (
              <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="seg" role="group" aria-label="Hand diagram mode">
                  <button aria-pressed={handMode === 'chord'} onClick={() => setHandMode('chord')} style={{ minHeight: 24, fontSize: 11, padding: '2px 8px' }}>
                    Chord ({activeSymbol})
                  </button>
                  <button aria-pressed={handMode === 'scale'} onClick={() => setHandMode('scale')} style={{ minHeight: 24, fontSize: 11, padding: '2px 8px' }}>
                    Solo Box ({keyRoot}{keyMinor ? 'm' : ''})
                  </button>
                </div>
                {handMode === 'chord' && curVoicing && (
                  <button
                    className="btn sm"
                    style={{ minHeight: 24, padding: '2px 8px', fontSize: 11, marginLeft: 'auto' }}
                    onClick={() => {
                      const midis = curVoicing.frets.map((f, i) => (f < 0 ? -1 : inst.midis[i] + f + capo)).filter(x => x >= 0)
                      if (midis.length) strum(midis, audio().currentTime, { spread: 0.03, gain: 0.75, sound: activeSound() })
                    }}
                  >
                    ▶ Strum
                  </button>
                )}
              </div>
            )}

            {handMode === 'chord' ? (
              chordHandGroup && curVoicing ? (
                <>
                  <div className="ov-hand-stage">
                    <HandShape
                      group={chordHandGroup}
                      next={null}
                      moveSoon={false}
                      expected={[]}
                      nStr={inst.midis.length}
                      stringNames={stringNames}
                    />
                    <ChordDiagram
                      name={activeSymbol}
                      voicing={curVoicing}
                      size={0.78}
                      onClick={() => {
                        const midis = curVoicing.frets.map((f, i) => (f < 0 ? -1 : inst.midis[i] + f + capo)).filter(x => x >= 0)
                        if (midis.length) strum(midis, audio().currentTime, { spread: 0.03, gain: 0.75, sound: activeSound() })
                      }}
                    />
                  </div>
                  {!menuHidden && activeChordShapes.length > 1 && (
                    <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                      {activeChordShapes.map((_, idx) => (
                        <button
                          key={idx}
                          className={`ov-chip${voicingIdx === idx ? ' now' : ''}`}
                          onClick={() => setVoicingIdx(idx)}
                        >
                          Shape {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <span className="small muted">No chord shape found for {activeSymbol}.</span>
              )
            ) : (
              curScaleBox ? (
                <>
                  <div className="ov-hand-stage">
                    <HandShape
                      group={curScaleBox.group}
                      next={null}
                      moveSoon={false}
                      expected={[]}
                      nStr={inst.midis.length}
                      stringNames={stringNames}
                    />
                  </div>
                  {!menuHidden && (
                    <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                      {scaleBoxes.map((b, idx) => (
                        <button
                          key={b.label}
                          className={`ov-chip${boxIdx === idx ? ' now' : ''}`}
                          onClick={() => setBoxIdx(idx)}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : null
            )}

            {!menuHidden && (
              <div className="small muted" style={{ fontSize: 10.5 }}>
                <b>Fingers:</b> 1 Index · 2 Middle · 3 Ring · 4 Pinky · ○ Open{capo > 0 ? ` · Capo ${capo}` : ''}
              </div>
            )}
          </div>
        )}

        {tab === 'circle' && (
          <div className="ov-circle-wrap">
            <CircleOfFifths
              tonic={keyRoot}
              minor={keyMinor}
              active={{ root, minor: isChordMinor }}
              trail={trail.map(t => ({ root: t.root, minor: t.minor }))}
              size={260}
              onPick={(r, m) => {
                pickManualChord(r, m ? 'm' : '')
                const sh = shapesFor({ root: r, type: m ? 'minor' : 'major' }, inst)[0]
                if (sh) {
                  const midis = sh.frets.map((f, i) => (f < 0 ? -1 : inst.midis[i] + f)).filter(x => x >= 0)
                  if (midis.length) strum(midis, audio().currentTime, { spread: 0.03, gain: 0.7, sound: activeSound() })
                }
              }}
            />
            {!menuHidden && <span className="small muted" style={{ fontSize: 11 }}>Tap any wedge to hear it &amp; light up the fretboard.</span>}
          </div>
        )}

        {tab === 'licks' && (
          <LicksCardBody ctx={floatCtx} />
        )}

        {tab === 'tools' && (
          <div className="stack" style={{ gap: 8 }}>
            {/* Quick Tuner + Tap Tempo + Drone */}
            <div className="ov-card row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <div className="small muted">Quick Tuner</div>
                <strong style={{ fontSize: 15 }}>
                  {tunerRead
                    ? `${tunerRead.name} (${tunerRead.cents > 0 ? `+${tunerRead.cents}` : tunerRead.cents}¢)`
                    : listening ? 'Pluck a string…' : 'Tap 🎤 Listen above'}
                </strong>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn sm" onClick={tapTempo}>Tap {bpm} BPM</button>
                <button className={`btn sm${droneOn ? ' primary' : ''}`} onClick={toggleDrone}>
                  {droneOn ? `■ ${keyRoot} Drone` : `♪ ${keyRoot} Drone`}
                </button>
              </div>
            </div>

            {/* Quick Chord Lookup */}
            <div className="ov-card stack" style={{ gap: 6 }}>
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <span className="small muted">Chord Lookup</span>
                <input
                  className="input"
                  style={{ flex: 1, minHeight: 28, fontSize: 13 }}
                  value={lookup}
                  onFocus={() => bridge?.setFocusable(true)}
                  onBlur={() => bridge?.setFocusable(false)}
                  onChange={e => setLookup(e.target.value)}
                  placeholder="e.g. F#m7b5, Gadd9, Bm7"
                />
                <button
                  className="btn sm"
                  onClick={() => {
                    const sh = lookupShapes[0]
                    if (!sh) return
                    const midis = sh.frets.map((f, i) => (f < 0 ? -1 : inst.midis[i] + f)).filter(x => x >= 0)
                    if (midis.length) strum(midis, audio().currentTime, { spread: 0.03, gain: 0.75, sound: activeSound() })
                  }}
                >
                  ▶ Strum
                </button>
              </div>
              {lookupShapes.length > 0 ? (
                <div className="row" style={{ gap: 8, overflowX: 'auto' }}>
                  {lookupShapes.map((sh, i) => (
                    <ChordDiagram
                      key={i}
                      voicing={sh}
                      size={0.78}
                      onClick={() => {
                        const midis = sh.frets.map((f, idx) => (f < 0 ? -1 : inst.midis[idx] + f)).filter(x => x >= 0)
                        if (midis.length) strum(midis, audio().currentTime, { spread: 0.03, gain: 0.75, sound: activeSound() })
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span className="small muted">Type any chord name (C, Am7, D9, F#m7b5…)</span>
              )}
            </div>

            {/* Quick Sticky Note (syncs via Phone <-> Tablet Sync!) */}
            <div className="ov-card stack" style={{ gap: 4 }}>
              <span className="small muted">Song / Songsterr Sticky Note (syncs across devices)</span>
              <textarea
                className="input"
                rows={2}
                style={{ fontSize: 12, resize: 'vertical' }}
                value={sticky}
                onFocus={() => bridge?.setFocusable(true)}
                onBlur={() => bridge?.setFocusable(false)}
                onChange={e => {
                  setSticky(e.target.value)
                  try { localStorage.setItem('kg:sticky:overlay', e.target.value) } catch { /* full */ }
                }}
                placeholder="Capo 2, tricky bridge at 1:42, solo in Em pentatonic…"
              />
            </div>

            {/* 1-Tap KGuitar Launchers */}
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button className="btn sm primary" onClick={() => openRoute('scan')}>
                <Ico n="scan" /> Scan Riff
              </button>
              <button className="btn sm" onClick={() => openRoute('vibe')}>
                <Ico n="film" /> Match Song Vibe
              </button>
              <button className="btn sm" onClick={sendTrailToJam}>
                <Ico n="guitar" /> Jam Chords
              </button>
              <button className="btn sm ghost" onClick={() => openRoute('home')}>
                Open KGuitar ↗
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
