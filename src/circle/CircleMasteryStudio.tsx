// Circle of Fifths Pro Masterclass (6 Deep Interactive Chapters + 20 Curated YouTube Videos)
// & Interactive Practice Studio (5 Live Mic + Visual Drills: Wheel Walk, Guide-Tone 1-Fret Drop,
// Endless Original Circle Etude Generator, 12-Key Wheel Challenge, and Gravity Ear Trainer).
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleOfFifths } from '../components/CircleOfFifths'
import { Fretboard, type Mark } from '../components/Fretboard'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { Ico } from '../components/Icon'
import { usePersist } from '../components/Controls'
import { useInstrument } from '../instrument'
import { audio } from '../audio/engine'
import { playNote, strum } from '../audio/pluck'
import { playDrum } from '../audio/drums'
import { ChromaListener } from '../audio/chroma'
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import { learnGo, openInPlay, openLicksInKey, openScanner } from '../nav'
import { newId, youtubeId } from '../tabs/library'
import { addCardInstance, emitBandAddChord, publishFloat } from '../float/bus'
import {
  CIRCLE_FOURTHS, CIRCLE_PATHS, STANDARD_MIDI,
  analyzeVoiceLeading, buildCircleChord, buildGuideToneShell, buildTopTriadGrip, buildVoiceLedGrip,
  explainCircleChord, generateCircleEtude, instantiatePath,
  loadKeyMastery, markKeyMastered, resetKeyMastery,
  type CircleChord, type CircleChordQual, type EtudeLevel, type EtudePicking, type EtudeTexture, type EtudeZone,
} from './circleEngine'
import { CIRCLE_CHAPTERS, loadDoneChapters, toggleDoneChapter } from './circleCourse'

export type CircleStudioTab = 'masterclass' | 'practice'
type DrillId = 'walk' | 'guides' | 'etude' | 'keys12' | 'ear'

const KEYS_12 = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']

/** Play a CircleChord smoothly via KGuitar's acoustic/clean sampler. */
function soundCircleChord(ch: CircleChord, when = 0, grip?: { midi: number }[]) {
  const ctx = audio()
  void ctx.resume()
  const t = when || ctx.currentTime + 0.03
  if (grip && grip.length) {
    strum(grip.map(g => g.midi), t)
    return
  }
  const base = 48 + ch.rootPc
  const midis = [base, base + (ch.minor || ch.dim ? 3 : 4), base + (ch.dim ? 6 : 7)]
  if (ch.seventhPc !== null) {
    const iv7 = (ch.seventhPc - ch.rootPc + 12) % 12
    midis.push(base + iv7)
  }
  if (ch.qual === 'add9' || ch.qual === 'm9') midis.push(base + 14)
  strum(midis, t)
}

/** Check whether a 12-bin chroma spectrum matches a target CircleChord (for live mic Wait-for-Me). */
function chromaMatchesChord(chroma: number[], target: CircleChord): boolean {
  const core = [...new Set([target.rootPc, target.thirdPc, ...target.pcs.slice(0, 4)])]
  let hitSum = 0
  let strongCount = 0
  for (const p of core) {
    const v = chroma[p] ?? 0
    hitSum += v
    if (v >= 0.085) strongCount++
  }
  const rootOrThird = (chroma[target.rootPc] ?? 0) + (chroma[target.thirdPc] ?? 0)
  return hitSum >= 0.42 && strongCount >= 2 && rootOrThird >= 0.22
}

/** Format a compact 6-string ASCII tab preview for any generated Circle Etude. */
function formatEtudePreview(chords: CircleChord[], bars: { steps: { notes: { string: number; fret: number }[] }[] }[]): string {
  const names = ['e', 'B', 'G', 'D', 'A', 'E']
  const maxBars = Math.min(4, bars.length)
  const lines = names.map(n => `${n}|`)
  for (let bi = 0; bi < maxBars; bi++) {
    const steps = bars[bi].steps
    for (const st of steps) {
      for (let row = 0; row < 6; row++) {
        const sIdx = 5 - row
        const hit = st.notes.find(n => n.string === sIdx)
        const cell = hit ? String(hit.fret).padEnd(2, '-') : '--'
        lines[row] += cell + '-'
      }
    }
    for (let row = 0; row < 6; row++) lines[row] += '|'
  }
  const header = '  ' + chords.slice(0, maxBars).map(c => c.symbol.padEnd(Math.max(8, (bars[0]?.steps.length ?? 4) * 3 + 1), ' ')).join('')
  return `${header}\n${lines.join('\n')}`
}

/** Reusable interactive Voice-Leading Fretboard for Masterclass chapters & Practice drills. */
function VoiceLeadBoard({
  chord, prevChord, view, zone, tuning, compact,
}: {
  chord: CircleChord
  prevChord: CircleChord | null
  view: 'voicing' | 'shell' | 'triad'
  zone: EtudeZone
  tuning: number[]
  compact?: boolean
}) {
  const prevGrip = useMemo(() => {
    if (!prevChord) return null
    if (view === 'shell') return buildGuideToneShell(prevChord, zone, undefined, tuning)
    if (view === 'triad') return buildTopTriadGrip(prevChord, zone, undefined, tuning)
    return buildVoiceLedGrip(prevChord, zone, null, tuning)
  }, [prevChord, view, zone, tuning])

  const prevCenter = prevGrip?.length ? prevGrip.reduce((a, b) => a + b.fret, 0) / prevGrip.length : undefined

  const grip = useMemo(() => {
    if (view === 'shell') return buildGuideToneShell(chord, zone, prevCenter, tuning)
    if (view === 'triad') return buildTopTriadGrip(chord, zone, prevCenter, tuning)
    return buildVoiceLedGrip(chord, zone, prevGrip?.map(g => g.fret) ?? null, tuning)
  }, [chord, view, zone, prevCenter, prevGrip, tuning])

  const vl = useMemo(() => analyzeVoiceLeading(prevChord, chord, chord.root.includes('b')), [prevChord, chord])
  const anchorSet = useMemo(() => new Set(vl.anchors), [vl.anchors])

  const frets = grip.map(g => g.fret)
  const lo = Math.max(0, Math.min(...frets, zone === 'open' ? 0 : 4) - 1)
  const hi = Math.min(15, Math.max(lo + 5, Math.max(...frets) + 1))

  const arrows = useMemo(() => {
    if (!prevGrip) return undefined
    const arr: { s1: number; f1: number; s2: number; f2: number; kind?: 'guide' | 'move' | 'look' }[] = []
    for (const g of grip) {
      const prevOnStr = prevGrip.find(p => p.string === g.string)
      if (prevOnStr && prevOnStr.fret !== g.fret && Math.abs(prevOnStr.fret - g.fret) <= 3) {
        arr.push({
          s1: prevOnStr.string, f1: prevOnStr.fret,
          s2: g.string, f2: g.fret,
          kind: Math.abs(prevOnStr.fret - g.fret) === 1 ? 'guide' : 'move',
        })
      }
    }
    return arr
  }, [grip, prevGrip])

  const markFor = (midi: number, s: number, f: number): Mark | null => {
    const hit = grip.find(g => g.string === s && g.fret === f)
    if (hit) {
      const p = midi % 12
      if (hit.degree === 'R') return { label: 'R', role: 'root' }
      if (prevChord && anchorSet.has(p)) return { label: hit.degree, role: 'common' }
      if (prevChord && (p === chord.thirdPc || p === chord.seventhPc)) return { label: hit.degree, role: 'next' }
      return { label: hit.degree, role: 'chord' }
    }
    // Faint ghost of previous chord's moving note so you see where your finger came from
    const was = prevGrip?.find(p => p.string === s && p.fret === f)
    if (was) return { label: was.degree, role: 'ghost' }
    return null
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <Fretboard
        tuning={tuning}
        fromFret={lo}
        toFret={hi}
        markFor={markFor}
        arrows={arrows}
        compact={compact}
        zoomId={`cof-vl-${view}`}
        onTap={midi => {
          const ctx = audio()
          void ctx.resume()
          playNote(midi, ctx.currentTime + 0.02, 0.9)
        }}
      />
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className="small" style={{ color: '#a7f3d0' }}>
          <b>{vl.headline}</b>
        </span>
        <button className="btn sm" onClick={() => soundCircleChord(chord, 0, grip)}>
          <Ico n="sound" /> Hear {chord.symbol}
        </button>
      </div>
    </div>
  )
}

export function CircleMasteryStudio({
  mode,
  onSwitchMode,
  tonic,
  setTonic,
  minor,
  setMinor,
  onQuiz,
}: {
  mode: CircleStudioTab
  onSwitchMode: (m: CircleStudioTab) => void
  tonic: string
  setTonic: (k: string) => void
  minor: boolean
  setMinor: (m: boolean) => void
  onQuiz: (id: string) => void
}) {
  const inst = useInstrument()
  const tuning = inst.midis.length === 6 ? inst.midis : STANDARD_MIDI

  // Shared Masterclass state
  const [chIdx, setChIdx] = usePersist<number>('circleChapterIdx', 0)
  const [doneChapters, setDoneChapters] = useState<string[]>(() => loadDoneChapters())
  const [activeStep, setActiveStep] = useState(0)
  const [boardView, setBoardView] = useState<'voicing' | 'shell' | 'triad'>('voicing')
  const [selectedVidIdx, setSelectedVidIdx] = useState<number>(0)
  const [customUrl, setCustomUrl] = useState('')
  const [customWatchUrl, setCustomWatchUrl] = useState('')
  const [playingProg, setPlayingProg] = useState(false)
  const progTimers = useRef<number[]>([])

  // Shared Practice Mode state
  const [drill, setDrill] = usePersist<DrillId>('circleDrill', 'walk')
  const [pathId, setPathId] = usePersist<string>('circlePathId', 'minor-gravity')
  const [zone, setZone] = usePersist<EtudeZone>('circleZone', 'mid')
  const [texture, setTexture] = usePersist<EtudeTexture>('circleTexture', 'peaceful')
  const [level, setLevel] = usePersist<EtudeLevel>('circleLevel', 'starter')
  const [picking, setPicking] = usePersist<EtudePicking>('circlePicking', 'finger')
  const [bpm, setBpm] = usePersist<number>('circleBpm', 84)

  // Live Mic Wait-for-Me state (used in Walk, Guides, and 12-Key Challenge)
  const [micOn, setMicOn] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [micMsg, setMicMsg] = useState('')
  const [micFlash, setMicFlash] = useState(false)
  const listenerRef = useRef<ChromaListener | null>(null)
  const [walkIdx, setWalkIdx] = useState(0)
  const [walkLoops, setWalkLoops] = useState(0)

  // 12-Key Wheel Challenge state
  const [key12Idx, setKey12Idx] = useState(0)
  const [key12Qual, setKey12Qual] = useState<'maj7' | 'm7' | '7' | 'maj' | 'min'>('maj7')
  const [key12Timed, setKey12Timed] = useState(false)
  const [key12Bars, setKey12Bars] = useState(2)
  const [key12Beat, setKey12Beat] = useState(0)
  const [mastery, setMastery] = useState<Record<string, number>>(() => loadKeyMastery())

  // Gravity Ear Trainer state
  const [earStreak, setEarStreak] = useState(0)
  const [earQ, setEarQ] = useState(() => makeEarQuestion())
  const [earGuess, setEarGuess] = useState<string | null>(null)

  const chapter = CIRCLE_CHAPTERS[Math.min(chIdx, CIRCLE_CHAPTERS.length - 1)]
  const chapterPath = useMemo(() => instantiatePath(chapter.pathId, tonic), [chapter.pathId, tonic])
  const practicePath = useMemo(() => instantiatePath(pathId, tonic), [pathId, tonic])

  // Stop any audio timers when switching chapters or unmounting
  const clearProgTimers = () => {
    progTimers.current.forEach(t => window.clearTimeout(t))
    progTimers.current = []
    setPlayingProg(false)
  }
  useEffect(() => () => {
    clearProgTimers()
    listenerRef.current?.stop()
    listenerRef.current = null
  }, [])

  // Reset chapter step & video index when chapter changes
  useEffect(() => {
    setActiveStep(0)
    setSelectedVidIdx(0)
    setCustomWatchUrl('')
    clearProgTimers()
    setBoardView(chapter.id === 'ch2-guidetones' ? 'shell' : chapter.id === 'ch3-peaceful' ? 'voicing' : 'voicing')
  }, [chapter.id])

  // Publish live chord to floating cards (so floating 5-Layer Fretboard / Licks stay synced!)
  const liveCh = mode === 'masterclass'
    ? chapterPath[activeStep % chapterPath.length]
    : drill === 'keys12'
      ? buildCircleChord(pc(CIRCLE_FOURTHS[key12Idx % 12]), key12Qual, keyPrefersFlats(CIRCLE_FOURTHS[key12Idx % 12]))
      : practicePath[walkIdx % practicePath.length]

  const prevCh = mode === 'masterclass'
    ? (activeStep > 0 ? chapterPath[(activeStep - 1) % chapterPath.length] : null)
    : drill === 'keys12'
      ? (key12Idx > 0 ? buildCircleChord(pc(CIRCLE_FOURTHS[(key12Idx - 1) % 12]), key12Qual, keyPrefersFlats(CIRCLE_FOURTHS[(key12Idx - 1) % 12])) : null)
      : (walkIdx > 0 ? practicePath[(walkIdx - 1) % practicePath.length] : null)

  const nextCh = mode === 'masterclass'
    ? chapterPath[(activeStep + 1) % chapterPath.length]
    : drill === 'keys12'
      ? buildCircleChord(pc(CIRCLE_FOURTHS[(key12Idx + 1) % 12]), key12Qual, keyPrefersFlats(CIRCLE_FOURTHS[(key12Idx + 1) % 12]))
      : practicePath[(walkIdx + 1) % practicePath.length]

  useEffect(() => {
    if (!liveCh) return
    const p = pc(tonic)
    const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
    publishFloat('circle-mastery', {
      chordNow: liveCh.symbol,
      chordNext: nextCh?.symbol,
      keyName: `${tonic}${minor ? 'm' : ''}`,
      keyPcs: steps.map(s => (p + s) % 12),
      bpm,
    })
  }, [liveCh?.symbol, nextCh?.symbol, tonic, minor, bpm])

  // Live Mic Listener wiring for Walk, Guide-Tone Drill, and 12-Key Challenge
  const targetRef = useRef<CircleChord | null>(null)
  targetRef.current = liveCh ?? null
  const drillRef = useRef(drill)
  drillRef.current = drill
  const pathLenRef = useRef(practicePath.length)
  pathLenRef.current = practicePath.length

  const toggleMic = async () => {
    if (micOn) {
      listenerRef.current?.stop()
      listenerRef.current = null
      setMicOn(false)
      setMicMsg('')
      return
    }
    try {
      const l = new ChromaListener()
      l.onLevel = lv => setMicLevel(lv)
      l.onChord = chroma => {
        const tgt = targetRef.current
        if (!tgt) return
        if (chromaMatchesChord(chroma, tgt)) {
          setMicFlash(true)
          setMicMsg(`✓ Nailed ${tgt.symbol}!`)
          window.setTimeout(() => setMicFlash(false), 450)
          if (drillRef.current === 'keys12') {
            setKey12Idx(prev => {
              const kName = CIRCLE_FOURTHS[prev % 12]
              setMastery(markKeyMastered(kName, 1))
              return (prev + 1) % 12
            })
          } else {
            setWalkIdx(prev => {
              const nxt = (prev + 1) % Math.max(1, pathLenRef.current)
              if (nxt === 0) setWalkLoops(n => n + 1)
              return nxt
            })
          }
        } else {
          setMicMsg(`Heard a strum — aim for ${tgt.symbol} (${tgt.pcs.slice(0, 3).map(x => SHARPS[x]).join('·')})`)
        }
      }
      await l.start()
      listenerRef.current = l
      setMicOn(true)
      setMicMsg('Listening… strum or pluck the highlighted chord!')
    } catch {
      setMicMsg('Mic unavailable — tap Hear or Next to step through.')
      setMicOn(false)
    }
  }

  // Timed Click for 12-Key Challenge
  useEffect(() => {
    if (!key12Timed || mode !== 'practice' || drill !== 'keys12') return
    const beatMs = (60 / Math.max(40, bpm)) * 1000
    let b = 0
    const totalBeats = key12Bars * 4
    const iv = window.setInterval(() => {
      const ctx = audio()
      void ctx.resume()
      const beatInBar = b % 4
      playDrum(beatInBar === 0 ? 'bell' : 'rim', ctx.currentTime + 0.02, beatInBar === 0 ? 0.55 : 0.35)
      setKey12Beat(beatInBar + 1)
      if (b > 0 && b % totalBeats === 0) {
        setKey12Idx(prev => {
          setMastery(markKeyMastered(CIRCLE_FOURTHS[prev % 12], 1))
          return (prev + 1) % 12
        })
      }
      b++
    }, beatMs)
    return () => window.clearInterval(iv)
  }, [key12Timed, mode, drill, bpm, key12Bars])

  // Play any chord sequence with synchronized Circle & Fretboard animation
  const playSequence = (seq: CircleChord[], onStep?: (i: number) => void, msPerChord = 1150) => {
    clearProgTimers()
    setPlayingProg(true)
    const ctx = audio()
    void ctx.resume()
    seq.forEach((ch, i) => {
      const id = window.setTimeout(() => {
        onStep?.(i)
        soundCircleChord(ch)
      }, i * msPerChord + 40)
      progTimers.current.push(id)
    })
    const doneId = window.setTimeout(() => setPlayingProg(false), seq.length * msPerChord + 300)
    progTimers.current.push(doneId)
  }

  // Send progression straight into Pocket Band & open the floating card
  const sendToPocketBand = (seq: CircleChord[]) => {
    seq.slice(0, 8).forEach(ch => emitBandAddChord(ch.symbol))
    addCardInstance('learn', 'band')
  }

  // Generate an original playable Etude and launch it directly in Play with Circle + 5-Layer rig!
  const launchEtudeInPlay = (opts: { pathId: string; texture: EtudeTexture; level: EtudeLevel; zone: EtudeZone; picking: EtudePicking; bpm?: number }) => {
    const { song } = generateCircleEtude({ tonic, ...opts, tuning })
    // Ensure both Circle and 5-Layer Fretboard are ready in Play!
    addCardInstance('play', 'circle')
    addCardInstance('play', 'neck')
    try { localStorage.setItem('kg:floatNeck5Layer', '1') } catch { /* private */ }
    openInPlay({ id: newId(), title: song.title, artist: song.artist, source: 'lesson', song, updated: Date.now() })
  }

  // Live preview of the Etude Studio
  const etudePreview = useMemo(
    () => generateCircleEtude({ tonic, pathId, texture, level, zone, picking, bpm, tuning }),
    [tonic, pathId, texture, level, zone, picking, bpm, tuning],
  )

  const hearEtudePreview = () => {
    clearProgTimers()
    setPlayingProg(true)
    const ctx = audio()
    void ctx.resume()
    const beatSec = 60 / Math.max(50, bpm)
    let offset = 0.06
    const t0 = ctx.currentTime
    etudePreview.song.tracks[0].bars.slice(0, 4).forEach((bar, bi) => {
      const id = window.setTimeout(() => setWalkIdx(bi), Math.round(offset * 1000))
      progTimers.current.push(id)
      for (const st of bar.steps) {
        st.notes.forEach((n, ni) => playNote(n.midi, t0 + offset + ni * 0.012, Math.max(0.45, st.dur * beatSec * 1.15)))
        offset += st.dur * beatSec
      }
    })
    progTimers.current.push(window.setTimeout(() => setPlayingProg(false), Math.round((offset + 0.3) * 1000)))
  }

  // Ear Trainer audio playback
  const playEarQuestion = (q: EarQuestion) => {
    const ctx = audio()
    void ctx.resume()
    const t0 = ctx.currentTime + 0.05
    q.chords.forEach((ch, i) => soundCircleChord(ch, t0 + i * 0.9))
  }

  const explanation = liveCh ? explainCircleChord(liveCh.symbol, prevCh?.symbol, tonic, minor) : null

  return (
    <div className="stack" style={{ gap: 12 }}>
      {/* Shared Key Transposer Ribbon */}
      <div className="panel" style={{ padding: '10px 12px' }}>
        <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="small muted" style={{ fontWeight: 700, marginRight: 4 }}>Key (transposes all diagrams, audio & tabs):</span>
            {KEYS_12.map(k => (
              <button
                key={k}
                className={`chip${pc(tonic) === pc(k) ? ' on' : ''}`}
                style={{ padding: '2px 8px', fontSize: 12 }}
                onClick={() => { setTonic(k); setActiveStep(0); setWalkIdx(0) }}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="seg">
            <button aria-pressed={!minor} onClick={() => setMinor(false)}>Major</button>
            <button aria-pressed={minor} onClick={() => setMinor(true)}>Minor</button>
          </div>
        </div>
      </div>

      {/* ==================== MODE A: 6-CHAPTER PRO MASTERCLASS ==================== */}
      {mode === 'masterclass' && (
        <div className="stack" style={{ gap: 12 }}>
          {/* Chapter Navigator */}
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {CIRCLE_CHAPTERS.map((c, i) => {
              const isDone = doneChapters.includes(c.id)
              return (
                <button
                  key={c.id}
                  className={`chip${i === chIdx ? ' on' : ''}`}
                  style={{ fontSize: 12, padding: '5px 10px' }}
                  onClick={() => {
                    setChIdx(i)
                    if (c.minorDefault !== undefined) setMinor(c.minorDefault)
                  }}
                >
                  {isDone ? '✓ ' : `${c.num}. `}{c.title}
                </button>
              )
            })}
            <span className="small muted" style={{ marginLeft: 'auto' }}>
              <b>{doneChapters.length} / {CIRCLE_CHAPTERS.length}</b> completed
            </span>
          </div>

          {/* Chapter Hero + Interactive Visual Stage */}
          <div className="panel stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div className="small" style={{ color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Chapter {chapter.num} of 6 · ~{chapter.minutes} min
                </div>
                <h2 style={{ margin: '2px 0 4px' }}>{chapter.title}</h2>
                <p className="small muted" style={{ margin: 0 }}>{chapter.subtitle}</p>
              </div>
              <button
                className={`btn sm${doneChapters.includes(chapter.id) ? ' primary' : ''}`}
                onClick={() => setDoneChapters(toggleDoneChapter(chapter.id))}
              >
                {doneChapters.includes(chapter.id) ? '✓ Chapter Completed' : 'Mark Chapter Done'}
              </button>
            </div>

            {/* Why It Sounds So Good callout */}
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 10, padding: '10px 12px' }}>
              <div className="small" style={{ color: 'var(--amber)', fontWeight: 700, marginBottom: 3 }}>Why this sounds so good</div>
              <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>{chapter.whyItSoundsGreat}</p>
            </div>

            {/* LIVE INTERACTIVE STAGE: Circle GPS + Voice-Leading Fretboard */}
            <div className="cof-stage-grid">
              <div className="stack" style={{ gap: 6, alignItems: 'center' }}>
                <CircleOfFifths
                  tonic={tonic}
                  minor={minor}
                  active={liveCh ? { root: liveCh.root, minor: liveCh.minor, dim: liveCh.dim } : null}
                  trail={chapterPath.map(c => ({ root: c.root, minor: c.minor, dim: c.dim }))}
                  nextChord={nextCh ? { root: nextCh.root, minor: nextCh.minor, dim: nextCh.dim } : null}
                  allowDim
                  size={270}
                  onPick={(r, m, d) => {
                    const hit = chapterPath.findIndex(c => pc(c.root) === pc(r) && c.minor === m && !!c.dim === !!d)
                    if (hit >= 0) {
                      setActiveStep(hit)
                      soundCircleChord(chapterPath[hit])
                    } else {
                      const custom = buildCircleChord(pc(r), d ? 'dim' : m ? 'm7' : 'maj7', keyPrefersFlats(tonic, minor))
                      soundCircleChord(custom)
                    }
                  }}
                />
                <div className="row" style={{ gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {chapterPath.map((ch, i) => (
                    <button
                      key={`${ch.symbol}-${i}`}
                      className={`chip${activeStep === i ? ' on' : ''}`}
                      style={{
                        fontSize: 11.5,
                        padding: '3px 8px',
                        borderColor: ch.outsideTag ? 'rgba(168,85,247,0.6)' : undefined,
                      }}
                      onClick={() => { setActiveStep(i); soundCircleChord(ch) }}
                    >
                      <b>{i + 1}.</b> {ch.symbol}
                      {ch.roman && <span className="muted" style={{ marginLeft: 3 }}>{ch.roman}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="stack" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="small" style={{ fontWeight: 700 }}>
                    Interactive Fretboard — {liveCh?.symbol} {liveCh?.outsideTag && <span style={{ color: '#c084fc' }}>({liveCh.outsideTag})</span>}
                  </span>
                  <div className="seg">
                    <button aria-pressed={boardView === 'voicing'} onClick={() => setBoardView('voicing')}>Full Voicing</button>
                    <button aria-pressed={boardView === 'shell'} onClick={() => setBoardView('shell')}>3rd+7th Shell</button>
                    <button aria-pressed={boardView === 'triad'} onClick={() => setBoardView('triad')}>Top Triad</button>
                  </div>
                </div>
                {liveCh && (
                  <VoiceLeadBoard chord={liveCh} prevChord={prevCh} view={boardView} zone={chapter.practicePreset.zone} tuning={tuning} />
                )}
                {explanation && (
                  <div
                    className="small"
                    style={{
                      background: explanation.outside ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${explanation.outside ? 'rgba(168,85,247,0.4)' : 'var(--hairline)'}`,
                      borderRadius: 8,
                      padding: '6px 9px',
                    }}
                  >
                    <b style={{ color: explanation.outside ? '#d8b4fe' : 'var(--amber)' }}>{explanation.badge}:</b> {explanation.text}
                  </div>
                )}
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className={`btn sm${playingProg ? ' on' : ' primary'}`}
                    onClick={() => (playingProg ? clearProgTimers() : playSequence(chapterPath, setActiveStep))}
                  >
                    {playingProg ? '■ Stop Flow' : '▶ Hear Full Circle Flow'}
                  </button>
                  <button
                    className="btn sm"
                    onClick={() => {
                      setPathId(chapter.pathId)
                      setTexture(chapter.practicePreset.texture)
                      setLevel(chapter.practicePreset.level)
                      setZone(chapter.practicePreset.zone)
                      setDrill(chapter.id === 'ch2-guidetones' ? 'guides' : chapter.id === 'ch6-pro' ? 'keys12' : 'walk')
                      onSwitchMode('practice')
                    }}
                  >
                    🎯 Practice This Chapter
                  </button>
                  <button
                    className="btn sm"
                    onClick={() => launchEtudeInPlay({ pathId: chapter.pathId, ...chapter.practicePreset, picking })}
                  >
                    🎸 Play Etude Tab
                  </button>
                  <button className="btn sm ghost" onClick={() => sendToPocketBand(chapterPath)}>
                    🥁 Send to Pocket Band
                  </button>
                  <button className="btn sm ghost" onClick={() => openLicksInKey(tonic, minor)}>
                    ✨ Licks in {tonic}{minor ? 'm' : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Deep Breakdown + Interactive Hear-It Demos + Worked Guide-Tone Table */}
          <div className="panel stack" style={{ gap: 10 }}>
            <h3 style={{ margin: 0 }}>Deep Breakdown</h3>
            <div className="stack" style={{ gap: 8 }}>
              {chapter.deepDive.map((sec, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--hairline)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{sec.heading}</div>
                  <p className="small" style={{ margin: 0, lineHeight: 1.55, color: 'var(--pearl-2)' }}>{sec.body}</p>
                </div>
              ))}
            </div>

            {/* Interactive Hear-It Demos (transposed live to current tonic!) */}
            <div className="stack" style={{ gap: 6 }}>
              <div className="small" style={{ fontWeight: 700 }}>Hear It in {tonic}{minor ? 'm' : ''} (tap to listen):</div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {chapter.demos.map((demo, i) => {
                  const flats = keyPrefersFlats(tonic, minor)
                  const built = demo.chords.map(c => buildCircleChord(pc(tonic) + c.semi, (c.suffix || 'maj') as CircleChordQual, flats))
                  return (
                    <button
                      key={i}
                      className="btn sm"
                      onClick={() => playSequence(built, undefined, 900)}
                      title={demo.note}
                    >
                      <Ico n="sound" /> {demo.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Worked Voice-Leading Breakdown */}
            <div className="stack" style={{ gap: 6 }}>
              <div className="small" style={{ fontWeight: 700 }}>{chapter.workedTitle}</div>
              <div className="cof-worked-table">
                {chapter.worked.map((w, i) => (
                  <div key={i} className="cof-worked-row">
                    <b>{w.move}</b>
                    <span className="small" style={{ color: '#6ee7b7' }}>Anchor: {w.anchor}</span>
                    <span className="small" style={{ color: '#fcd34d' }}>Move: {w.shift}</span>
                    <span className="small muted">{w.why}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Mistakes */}
            <div className="stack" style={{ gap: 6 }}>
              <div className="small" style={{ fontWeight: 700 }}>Common Pitfalls to Dodge</div>
              {chapter.mistakes.map((m, i) => (
                <div key={i} className="small" style={{ display: 'grid', gap: 2, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.025)' }}>
                  <span style={{ color: '#fca5a5' }}>✕ {m.wrong}</span>
                  <span style={{ color: '#6ee7b7' }}>✓ {m.right}</span>
                </div>
              ))}
            </div>

            {/* Cross-Links to KGuitar's Existing Theory Course */}
            {chapter.courseLinks.length > 0 && (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4 }}>
                <span className="small muted">Go deeper in KGuitar Theory Course:</span>
                {chapter.courseLinks.map(lk => (
                  <button key={lk.id} className="btn sm ghost" onClick={() => learnGo({ lesson: lk.id })}>
                    📚 {lk.label}
                  </button>
                ))}
                <button className="btn sm ghost" onClick={() => onQuiz('cof-chords')}>⚡ Circle Quiz</button>
              </div>
            )}
          </div>

          {/* Curated Video Lessons + Custom Mauricio / YouTube Link Loader */}
          <div className="panel stack" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>📹 Curated Video Lessons ({chapter.videos.length} hand-picked for Ch. {chapter.num})</h3>
              <span className="small muted">Speed (0.5×–1×) & A–B loop built in — float Circle or 5-Layer Fretboard over the video!</span>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {chapter.videos.map((v, i) => (
                <button
                  key={v.id}
                  className={`chip${!customWatchUrl && selectedVidIdx === i ? ' on' : ''}`}
                  style={{ fontSize: 12, textAlign: 'left', padding: '5px 10px' }}
                  onClick={() => { setCustomWatchUrl(''); setSelectedVidIdx(i) }}
                >
                  <b>{v.teacher}:</b> {v.title}
                </button>
              ))}
            </div>
            {!customWatchUrl && chapter.videos[selectedVidIdx] && (
              <div className="small" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.28)', borderRadius: 8, padding: '6px 10px' }}>
                <b>What to watch for:</b> {chapter.videos[selectedVidIdx].watchFor}
              </div>
            )}
            <YouTubePlayer
              url={customWatchUrl || `https://www.youtube.com/watch?v=${chapter.videos[selectedVidIdx]?.id ?? chapter.videos[0].id}`}
              onUrl={u => setCustomWatchUrl(u ?? '')}
              note="Float the Circle GPS or 5-Layer Fretboard right beside this video while you play along."
            />
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Paste any Mauricio Murúa or YouTube link to study here or scan…"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
              />
              <button
                className="btn sm"
                disabled={!youtubeId(customUrl)}
                onClick={() => { setCustomWatchUrl(customUrl.trim()) }}
              >
                ▶ Watch Here
              </button>
              <button
                className="btn sm primary"
                disabled={!youtubeId(customUrl)}
                onClick={() => openScanner({ link: customUrl.trim() })}
              >
                🔍 Scan with Riff Scanner
              </button>
            </div>
          </div>

          {/* Next / Prev Chapter Footer */}
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button className="btn sm" disabled={chIdx <= 0} onClick={() => setChIdx(chIdx - 1)}>← Previous Chapter</button>
            <button
              className="btn sm primary"
              onClick={() => {
                if (chIdx < CIRCLE_CHAPTERS.length - 1) setChIdx(chIdx + 1)
                else onSwitchMode('practice')
              }}
            >
              {chIdx < CIRCLE_CHAPTERS.length - 1 ? `Next: Ch. ${chIdx + 2} →` : '🎯 Jump into Practice Studio →'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODE B: 5-DRILL INTERACTIVE PRACTICE STUDIO ==================== */}
      {mode === 'practice' && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {([
              ['walk', '1. Guided Wheel Walk (Mic)'],
              ['guides', '2. Guide-Tone 1-Fret Drill'],
              ['etude', '3. Circle Etude Studio'],
              ['keys12', '4. 12-Key Wheel Challenge'],
              ['ear', '5. Gravity Ear Trainer'],
            ] as [DrillId, string][]).map(([id, label]) => (
              <button key={id} className={`chip${drill === id ? ' on' : ''}`} style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => { setDrill(id); setWalkIdx(0) }}>
                {label}
              </button>
            ))}
          </div>

          {/* DRILL 1 & DRILL 2: Guided Wheel Walk & Guide-Tone 1-Fret Drill */}
          {(drill === 'walk' || drill === 'guides') && (
            <div className="panel stack" style={{ gap: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{drill === 'walk' ? 'Guided Wheel Walk (Wait-for-Me)' : 'Guide-Tone "1-Fret Drop" Drill'}</h2>
                  <p className="small muted" style={{ margin: '2px 0 0' }}>
                    {drill === 'walk'
                      ? 'Play each highlighted chord cleanly — your mic hears it, flashes green, and advances the arrow around the Circle.'
                      : 'Isolate the 3rd & 7th guide tones on the D & G strings! Watch the Anchor note stay put while one finger glides 1 fret.'}
                  </p>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className={`btn sm${micOn ? ' primary' : ''}`} onClick={toggleMic}>
                    {micOn ? '🎤 Listening (Stop)' : '🎤 Start Mic Wait-for-Me'}
                  </button>
                  <button className="btn sm" onClick={() => liveCh && soundCircleChord(liveCh)}><Ico n="sound" /> Hear</button>
                  <button className="btn sm" onClick={() => setWalkIdx(i => (i + 1) % practicePath.length)}>Next →</button>
                </div>
              </div>

              {/* Path + Zone controls */}
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="select sm" style={{ width: 'auto' }} value={pathId} onChange={e => { setPathId(e.target.value); setWalkIdx(0) }}>
                  {CIRCLE_PATHS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="seg">
                  {(['open', 'mid', 'high'] as EtudeZone[]).map(z => (
                    <button key={z} aria-pressed={zone === z} onClick={() => setZone(z)}>
                      {z === 'open' ? 'Open' : z === 'mid' ? 'Frets 5–9' : 'Frets 7–12'}
                    </button>
                  ))}
                </div>
                {walkLoops > 0 && <span className="small" style={{ color: '#6ee7b7', fontWeight: 700 }}>🔥 {walkLoops} clean lap{walkLoops === 1 ? '' : 's'}!</span>}
              </div>

              {micOn && (
                <div className="row" style={{ gap: 8, alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: micFlash ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.04)', border: '1px solid var(--hairline)' }}>
                  <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, micLevel * 300)}%`, height: '100%', background: '#10b981' }} />
                  </div>
                  <span className="small">{micMsg}</span>
                </div>
              )}

              <div className="cof-stage-grid">
                <div className="stack" style={{ gap: 6, alignItems: 'center' }}>
                  <CircleOfFifths
                    tonic={tonic}
                    minor={CIRCLE_PATHS.find(p => p.id === pathId)?.minorKey ?? minor}
                    active={liveCh ? { root: liveCh.root, minor: liveCh.minor, dim: liveCh.dim } : null}
                    trail={practicePath.map(c => ({ root: c.root, minor: c.minor, dim: c.dim }))}
                    nextChord={nextCh ? { root: nextCh.root, minor: nextCh.minor, dim: nextCh.dim } : null}
                    size={280}
                    allowDim
                    onPick={(r, m, d) => {
                      const hit = practicePath.findIndex(c => pc(c.root) === pc(r) && c.minor === m && !!c.dim === !!d)
                      if (hit >= 0) { setWalkIdx(hit); soundCircleChord(practicePath[hit]) }
                    }}
                  />
                  <div className="row" style={{ gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {practicePath.map((c, i) => (
                      <button key={i} className={`chip${walkIdx === i ? ' on' : ''}`} style={{ fontSize: 11.5 }} onClick={() => { setWalkIdx(i); soundCircleChord(c) }}>
                        {i + 1}. {c.symbol}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    Play: <span style={{ color: 'var(--amber)' }}>{liveCh?.symbol}</span>
                    {nextCh && <span className="small muted" style={{ fontWeight: 500, marginLeft: 10 }}>Next → {nextCh.symbol}</span>}
                  </div>
                  {liveCh && (
                    <VoiceLeadBoard
                      chord={liveCh}
                      prevChord={prevCh}
                      view={drill === 'guides' ? 'shell' : 'voicing'}
                      zone={zone}
                      tuning={tuning}
                    />
                  )}
                  {explanation && (
                    <div className="small muted" style={{ padding: '6px 9px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--hairline)' }}>
                      <b>{explanation.badge}:</b> {explanation.text}
                    </div>
                  )}
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn sm" onClick={() => (playingProg ? clearProgTimers() : playSequence(practicePath, setWalkIdx))}>
                      {playingProg ? '■ Stop Demo' : '▶ Auto-Play Path'}
                    </button>
                    <button className="btn sm primary" onClick={() => launchEtudeInPlay({ pathId, texture: drill === 'guides' ? 'triads' : texture, level, zone, picking, bpm })}>
                      🎸 Open Full Tab in Play
                    </button>
                    <button className="btn sm ghost" onClick={() => sendToPocketBand(practicePath)}>
                      🥁 Send to Pocket Band
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DRILL 3: CIRCLE ETUDE STUDIO */}
          {drill === 'etude' && (
            <div className="panel stack" style={{ gap: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Circle Etude Studio (Endless Original Tabs)</h2>
                <p className="small muted" style={{ margin: '2px 0 0' }}>
                  Generates playable voice-led guitar pieces around the Circle in any key, texture, difficulty, and neck zone — then opens straight in Play with Wait-for-Me, Hand fingers, Floating Circle & 5-Layer Fretboard.
                </p>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="select sm" style={{ width: 'auto' }} value={pathId} onChange={e => setPathId(e.target.value)}>
                  {CIRCLE_PATHS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="seg">
                  {([['peaceful', 'Peaceful Voicings'], ['arpeggio', 'Circle of Arpeggios'], ['twister', 'String-Skipper'], ['triads', 'Voice-Led Triads']] as [EtudeTexture, string][]).map(([id, lab]) => (
                    <button key={id} aria-pressed={texture === id} onClick={() => setTexture(id)}>{lab}</button>
                  ))}
                </div>
                <div className="seg">
                  {([['starter', 'Starter'], ['intermediate', 'Intermediate'], ['pro', 'Pro']] as [EtudeLevel, string][]).map(([id, lab]) => (
                    <button key={id} aria-pressed={level === id} onClick={() => setLevel(id)}>{lab}</button>
                  ))}
                </div>
                <div className="seg">
                  <button aria-pressed={picking === 'finger'} onClick={() => setPicking('finger')}>Fingerstyle</button>
                  <button aria-pressed={picking === 'pick'} onClick={() => setPicking('pick')}>Pick</button>
                </div>
                <div className="seg">
                  {(['open', 'mid', 'high'] as EtudeZone[]).map(z => (
                    <button key={z} aria-pressed={zone === z} onClick={() => setZone(z)}>
                      {z === 'open' ? 'Open' : z === 'mid' ? 'Frets 5–9' : 'Frets 7–12'}
                    </button>
                  ))}
                </div>
                <label className="row small" style={{ gap: 4 }}>
                  BPM
                  <input type="number" className="input" style={{ width: 64, padding: '3px 6px' }} min={45} max={180} value={bpm} onChange={e => setBpm(Math.max(45, Math.min(180, Number(e.target.value) || 84)))} />
                </label>
              </div>

              <div className="cof-stage-grid">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <CircleOfFifths
                    tonic={tonic}
                    minor={CIRCLE_PATHS.find(p => p.id === pathId)?.minorKey ?? minor}
                    active={etudePreview.chords[walkIdx % etudePreview.chords.length] ? {
                      root: etudePreview.chords[walkIdx % etudePreview.chords.length].root,
                      minor: etudePreview.chords[walkIdx % etudePreview.chords.length].minor,
                      dim: etudePreview.chords[walkIdx % etudePreview.chords.length].dim,
                    } : null}
                    trail={etudePreview.chords.map(c => ({ root: c.root, minor: c.minor, dim: c.dim }))}
                    size={250}
                  />
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <div className="small" style={{ fontWeight: 700 }}>{etudePreview.song.title} ({etudePreview.song.tracks[0].bars.length} bars · {bpm} BPM)</div>
                  <pre className="fc-mini-tab" style={{ margin: 0, fontSize: 11.5, padding: '8px 10px' }}>
                    {formatEtudePreview(etudePreview.chords, etudePreview.song.tracks[0].bars)}
                  </pre>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <button className={`btn sm${playingProg ? ' on' : ''}`} onClick={() => (playingProg ? clearProgTimers() : hearEtudePreview())}>
                      {playingProg ? '■ Stop Preview' : '▶ Hear Etude'}
                    </button>
                    <button className="btn sm primary" onClick={() => launchEtudeInPlay({ pathId, texture, level, zone, picking, bpm })}>
                      🎸 Open in Play (with Circle + 5-Layer Rig)
                    </button>
                    <button className="btn sm ghost" onClick={() => sendToPocketBand(etudePreview.chords)}>
                      🥁 Send Chords to Pocket Band
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DRILL 4: AROUND THE 12-KEY WHEEL CHALLENGE */}
          {drill === 'keys12' && (
            <div className="panel stack" style={{ gap: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Around the 12-Key Wheel Challenge</h2>
                  <p className="small muted" style={{ margin: '2px 0 0' }}>
                    The Berklee / session-pro test: play one voicing cleanly through all 12 keys counter-clockwise (C → F → B♭ → E♭…). Watch the emerald Mastery Ring fill!
                  </p>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className={`btn sm${micOn ? ' primary' : ''}`} onClick={toggleMic}>
                    {micOn ? '🎤 Mic Wait-for-Me ON' : '🎤 Mic Wait-for-Me'}
                  </button>
                  <button className={`btn sm${key12Timed ? ' primary' : ''}`} onClick={() => setKey12Timed(v => !v)}>
                    {key12Timed ? `■ Stop Click (Beat ${key12Beat || 1})` : '🥁 Timed Click Mode'}
                  </button>
                </div>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="seg">
                  {(['maj7', 'm7', '7', 'maj', 'min'] as const).map(q => (
                    <button key={q} aria-pressed={key12Qual === q} onClick={() => setKey12Qual(q)}>{q}</button>
                  ))}
                </div>
                <div className="seg">
                  {[1, 2, 4].map(nb => (
                    <button key={nb} aria-pressed={key12Bars === nb} onClick={() => setKey12Bars(nb)}>{nb} bar{nb === 1 ? '' : 's'}/key</button>
                  ))}
                </div>
                <label className="row small" style={{ gap: 4 }}>
                  BPM
                  <input type="number" className="input" style={{ width: 62, padding: '3px 6px' }} min={45} max={160} value={bpm} onChange={e => setBpm(Math.max(45, Math.min(160, Number(e.target.value) || 80)))} />
                </label>
                <span className="small" style={{ color: '#6ee7b7', marginLeft: 'auto' }}>
                  Mastered: <b>{Object.values(mastery).filter(v => v >= 1).length} / 12 keys</b>
                </span>
                <button className="btn sm ghost" onClick={() => setMastery(resetKeyMastery())}>Reset Ring</button>
              </div>

              <div className="cof-stage-grid">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <CircleOfFifths
                    tonic={CIRCLE_FOURTHS[key12Idx % 12]}
                    minor={key12Qual === 'm7' || key12Qual === 'min'}
                    active={liveCh ? { root: liveCh.root, minor: liveCh.minor } : null}
                    nextChord={nextCh ? { root: nextCh.root, minor: nextCh.minor } : null}
                    mastery={mastery}
                    size={280}
                    onPick={r => {
                      const idx = CIRCLE_FOURTHS.findIndex(k => pc(k) === pc(r))
                      if (idx >= 0) setKey12Idx(idx)
                    }}
                  />
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>
                    Key {key12Idx + 1}/12: <span style={{ color: 'var(--amber)' }}>{liveCh?.symbol}</span>
                    <span className="small muted" style={{ fontWeight: 500, marginLeft: 10 }}>Next → {nextCh?.symbol}</span>
                  </div>
                  {liveCh && (
                    <VoiceLeadBoard chord={liveCh} prevChord={prevCh} view="voicing" zone={zone} tuning={tuning} />
                  )}
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className="btn sm primary"
                      onClick={() => {
                        setMastery(markKeyMastered(CIRCLE_FOURTHS[key12Idx % 12], 1))
                        setKey12Idx(i => (i + 1) % 12)
                      }}
                    >
                      ✓ Got It — Next Key →
                    </button>
                    <button className="btn sm" onClick={() => liveCh && soundCircleChord(liveCh)}><Ico n="sound" /> Hear {liveCh?.symbol}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DRILL 5: GRAVITY EAR TRAINER */}
          {drill === 'ear' && (
            <div className="panel stack" style={{ gap: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Gravity Ear Trainer</h2>
                  <p className="small muted" style={{ margin: '2px 0 0' }}>
                    Listen to the Circle move and name what your ears heard — then watch the arrow reveal itself on the wheel!
                  </p>
                </div>
                <span className="small" style={{ color: '#fcd34d', fontWeight: 700 }}>🔥 Streak: {earStreak}</span>
              </div>

              <div className="cof-stage-grid">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <CircleOfFifths
                    tonic={earQ.tonic}
                    minor={earQ.minor}
                    trail={earGuess ? earQ.chords.map(c => ({ root: c.root, minor: c.minor, dim: c.dim })) : []}
                    active={earGuess ? { root: earQ.chords[earQ.chords.length - 1].root, minor: earQ.chords[earQ.chords.length - 1].minor } : null}
                    size={260}
                  />
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn primary" onClick={() => playEarQuestion(earQ)}>
                      <Ico n="sound" /> Play Progression (in {earQ.tonic}{earQ.minor ? 'm' : ''})
                    </button>
                    <button className="btn" onClick={() => { const nq = makeEarQuestion(); setEarQ(nq); setEarGuess(null); playEarQuestion(nq) }}>
                      Next Question →
                    </button>
                  </div>
                  <div className="stack" style={{ gap: 6 }}>
                    {EAR_MOVES.map(m => {
                      const picked = earGuess === m.id
                      const correct = earGuess !== null && m.id === earQ.moveId
                      return (
                        <button
                          key={m.id}
                          className={`btn sm${correct ? ' primary' : ''}`}
                          style={{
                            justifyContent: 'flex-start',
                            borderColor: picked && !correct ? '#ef4444' : undefined,
                            background: picked && !correct ? 'rgba(239,68,68,0.18)' : undefined,
                          }}
                          onClick={() => {
                            if (earGuess) return
                            setEarGuess(m.id)
                            setEarStreak(s => (m.id === earQ.moveId ? s + 1 : 0))
                          }}
                        >
                          {correct ? '✓ ' : picked ? '✕ ' : ''}{m.label}
                        </button>
                      )
                    })}
                  </div>
                  {earGuess && (
                    <div className="small" style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <b>{earQ.chords.map(c => c.symbol).join(' → ')}</b> — {EAR_MOVES.find(x => x.id === earQ.moveId)?.explain}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface EarQuestion {
  tonic: string
  minor: boolean
  moveId: string
  chords: CircleChord[]
}

const EAR_MOVES = [
  { id: 'ii-V-I', label: 'Major ii7 → V7 → Imaj7 (Counter-clockwise gravity)', minor: false, seq: [[2, 'm7'], [7, '7'], [0, 'maj7']] as [number, CircleChordQual][], explain: 'Pure counter-clockwise Circle-of-4ths resolution with 1-fret guide-tone drops.' },
  { id: 'harm-v-i', label: 'Harmonic Minor V7 → i (Outside-slice pull into minor)', minor: true, seq: [[5, 'm7'], [7, '7'], [0, 'm9']] as [number, CircleChordQual][], explain: 'Steps outside Natural Minor to grab major V7, snapping strongly home to i.' },
  { id: 'secdom', label: 'Secondary Dominant Chain (I → V7/ii → ii7 → V7)', minor: false, seq: [[0, 'maj7'], [9, '7'], [2, 'm7'], [7, '7']] as [number, CircleChordQual][], explain: 'Turns the vi chord into a bright dominant 7th pulling straight into ii.' },
  { id: 'tritone', label: 'Tritone Sub Glide (ii7 → ♭II7 → Imaj7)', minor: false, seq: [[2, 'm7'], [1, '7'], [0, 'maj7']] as [number, CircleChordQual][], explain: 'Jumps straight across the Circle so the bass glides down smoothly by half-steps!' },
  { id: 'borrowed-iv', label: 'Borrowed Parallel Minor iv (I → IV → iv → I)', minor: false, seq: [[0, 'maj7'], [5, 'maj7'], [5, 'm7'], [0, 'maj7']] as [number, CircleChordQual][], explain: 'Shifts IV major into bittersweet parallel minor iv before settling home.' },
]

function makeEarQuestion(): EarQuestion {
  const m = EAR_MOVES[Math.floor(Math.random() * EAR_MOVES.length)]
  const tonic = KEYS_12[Math.floor(Math.random() * KEYS_12.length)]
  const flats = keyPrefersFlats(tonic, m.minor)
  const chords = m.seq.map(([semi, q]) => buildCircleChord(pc(tonic) + semi, q, flats))
  return { tonic, minor: m.minor, moveId: m.id, chords }
}
