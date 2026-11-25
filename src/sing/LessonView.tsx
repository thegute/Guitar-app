// Full 10-Module / 20-Lesson YouTube Video Course & Interactive Drill Runner!
// Every lesson pairs curated pro YouTube coach videos + structured breakdown + live mic interactive drill
// (including Guided Voice Range Profile, Appoggio Hiss Meter, Zero-Sag Hold, Ear-First Blind Target,
// Passaggio Bridge, Vibrato Oscilloscope, Harmony Lock, and the 5-Stage Sing & Strum Guitar Ladder!).
import { useEffect, useRef, useState } from 'react'
import { ALL_SING_LESSONS, SING_COURSE, type SingLesson } from './course'
import {
  classifyVoiceType,
  formatRange,
  markLessonDone,
  recordVocalStat,
  updateSingProfile,
  type SingProfile,
} from './profile'
import { midiToNoteName, pitchErrorCents, type VocalFrame } from './vocalEngine'
import { PianoWorkoutRunner, WORKOUT_PATTERNS, playChordCue, playCoachPiano } from './pianoCoach'
import { VocalTrackerCanvas, type TrailPoint } from './VocalTrackerCanvas'

interface Props {
  profile: SingProfile
  frame: VocalFrame | null
  micOn: boolean
  onToggleMic: () => void
  selectedLessonId: string
  onSelectLesson: (id: string) => void
  onOpenSongsHarmony: () => void
}

const STRUM_STAGES = [
  { id: 1, title: '1. Melody Only', desc: 'Sing the simple G–Em–C–D melody cleanly first (no guitar yet!).', arrows: '🎤 Focus on pitch & breath' },
  { id: 2, title: '2. Beat-1 Chord Ring', desc: 'Strum ONCE on Beat 1 of each bar and let the chord ring while singing.', arrows: '↓   ·   ·   ·   |  ↓   ·   ·   ·' },
  { id: 3, title: '3. Quarter-Note Pulse', desc: 'Steady relaxed down-strums on 1-2-3-4 while keeping your voice smooth.', arrows: '↓   ↓   ↓   ↓   |  ↓   ↓   ↓   ↓' },
  { id: 4, title: '4. Hum + Full Groove', desc: 'Play the full strumming groove while HUMMING — removes lyric overload!', arrows: '↓   ·   ↓ ↑ · ↑ ↓ ↑   (Hum "Mmm")' },
  { id: 5, title: '5. Full Sing & Strum!', desc: 'Keep your strumming wrist moving like a pendulum while singing the words!', arrows: '↓   ·   ↓ ↑ · ↑ ↓ ↑   (Full Lyrics!)' },
]

export function LessonView({
  profile,
  frame,
  micOn,
  onToggleMic,
  selectedLessonId,
  onSelectLesson,
  onOpenSongsHarmony,
}: Props) {
  const lesson: SingLesson = ALL_SING_LESSONS.find(l => l.id === selectedLessonId) ?? ALL_SING_LESSONS[0]
  const [videoIdx, setVideoIdx] = useState(0)
  const [showBreakdown, setShowBreakdown] = useState(true)

  // Interactive Drill States
  const [rangeLow, setRangeLow] = useState<number | null>(null)
  const [rangeHigh, setRangeHigh] = useState<number | null>(null)
  const [rangeStep, setRangeStep] = useState<'idle' | 'low' | 'high' | 'done'>('idle')

  const [hissSec, setHissSec] = useState(0)
  const [sustainSec, setSustainSec] = useState(0)
  const [sustainSag, setSustainSag] = useState(false)
  const [sustainTarget, setSustainTarget] = useState(Math.round((profile.comfortLow + profile.comfortHigh) / 2))

  // Ear-First Blind Drill state
  const [blindTarget, setBlindTarget] = useState(Math.round((profile.comfortLow + profile.comfortHigh) / 2))
  const [blindPhase, setBlindPhase] = useState<'ready' | 'imagine' | 'sing' | 'reveal'>('ready')
  const [blindResult, setBlindResult] = useState<{ cents: number; ok: boolean } | null>(null)

  // Workout pattern runner inside lessons
  const runnerRef = useRef<PianoWorkoutRunner | null>(null)
  const [workoutActive, setWorkoutActive] = useState(false)
  const [workoutTarget, setWorkoutTarget] = useState<number | null>(null)
  const [workoutBpm, setWorkoutBpm] = useState(88)

  // Sing & Strum 5-Stage Ladder state
  const [strumStage, setStrumStage] = useState(1)
  const strumStageRef = useRef(strumStage)
  strumStageRef.current = strumStage
  const [strumPlaying, setStrumPlaying] = useState(false)
  const [strumBar, setStrumBar] = useState(0)
  const [strumBeat, setStrumBeat] = useState(0)
  const strumTimerRef = useRef<number | null>(null)

  // Rolling trail for the lesson's live mini tracker
  const [trail, setTrail] = useState<TrailPoint[]>([])
  const tRef = useRef(0)

  // Reset video & drill states when switching lessons
  useEffect(() => {
    setVideoIdx(0)
    setRangeStep('idle')
    setHissSec(0)
    setSustainSec(0)
    setSustainSag(false)
    setBlindPhase('ready')
    setBlindResult(null)
    runnerRef.current?.stop()
    setWorkoutActive(false)
    if (strumTimerRef.current) { clearInterval(strumTimerRef.current); strumTimerRef.current = null }
    setStrumPlaying(false)
  }, [lesson.id])

  useEffect(() => {
    return () => {
      runnerRef.current?.stop()
      if (strumTimerRef.current) clearInterval(strumTimerRef.current)
    }
  }, [])

  // Feed live vocal frames into whichever drill is active!
  useEffect(() => {
    if (!frame) return
    tRef.current = frame.t
    const activeTarget = workoutTarget ?? (lesson.drill.kind === 'sustain-nosag' ? sustainTarget : lesson.drill.kind === 'ear-blind' ? blindTarget : null)
    const err = activeTarget !== null ? pitchErrorCents(frame, activeTarget) : null

    setTrail(prev => {
      const next = [
        ...prev,
        {
          t: frame.t,
          midi: frame.centerMidi ?? frame.midi,
          level: frame.level,
          errCents: err,
          vibrato: frame.vibrato.active && frame.vibrato.quality === 'smooth',
          scoop: frame.flags.includes('scoop'),
          sag: frame.flags.includes('sag'),
        },
      ]
      while (next.length && frame.t - next[0].t > 7) next.shift()
      return next
    })

    // 1. Guided Voice Range Test
    if (lesson.drill.kind === 'range-test' && frame.midi !== null && frame.pitchClarity > 0.85) {
      const m = Math.round(frame.midi)
      if (rangeStep === 'low') setRangeLow(cur => (cur === null ? m : Math.min(cur, m)))
      if (rangeStep === 'high') setRangeHigh(cur => (cur === null ? m : Math.max(cur, m)))
    }

    // 2. Breath Hiss Timer
    if (lesson.drill.kind === 'breath-hiss' && frame.hiss > 0.08) {
      setHissSec(s => Math.min(25, Math.round((s + 0.033) * 10) / 10))
    }

    // 3. Zero-Sag Sustain Hold
    if (lesson.drill.kind === 'sustain-nosag' && err !== null && Math.abs(err) <= 35) {
      setSustainSec(s => Math.min(12, Math.round((s + 0.033) * 10) / 10))
      if (frame.flags.includes('sag')) setSustainSag(true)
    }

    // 4. Ear-First Blind Target Capture
    if (lesson.drill.kind === 'ear-blind' && blindPhase === 'sing' && err !== null && frame.pitchClarity > 0.85) {
      setBlindResult({ cents: err, ok: Math.abs(err) <= 30 })
      setBlindPhase('reveal')
    }
  }, [frame, lesson.drill.kind, rangeStep, blindPhase, blindTarget, sustainTarget, workoutTarget])

  const saveRangeProfile = () => {
    const lo = rangeLow ?? profile.lowMidi
    const hi = Math.max(lo + 10, rangeHigh ?? profile.highMidi)
    const { voiceType, passaggioMidi } = classifyVoiceType(lo, hi)
    updateSingProfile({
      tested: true,
      lowMidi: lo,
      highMidi: hi,
      comfortLow: Math.min(hi - 6, lo + 2),
      comfortHigh: Math.max(lo + 8, hi - 2),
      passaggioMidi,
      voiceType,
    })
    setRangeStep('done')
    markLessonDone(lesson.id, true)
  }

  const startBlindRound = () => {
    const lo = profile.comfortLow
    const hi = profile.comfortHigh
    const nextNote = lo + Math.floor(Math.random() * Math.max(1, hi - lo + 1))
    setBlindTarget(nextNote)
    setBlindResult(null)
    setBlindPhase('imagine')
    playCoachPiano(nextNote, 1.0, 0.42)
    window.setTimeout(() => setBlindPhase('sing'), 1100)
  }

  const toggleLessonWorkout = () => {
    if (workoutActive) {
      runnerRef.current?.stop()
      setWorkoutActive(false)
      setWorkoutTarget(null)
      return
    }
    const pat = WORKOUT_PATTERNS.find(p => p.id === lesson.drill.patternId) ?? WORKOUT_PATTERNS[0]
    const runner = runnerRef.current ?? new PianoWorkoutRunner()
    runnerRef.current = runner
    runner.onStep = st => setWorkoutTarget(st.targetMidi)
    runner.onDone = () => {
      setWorkoutActive(false)
      setWorkoutTarget(null)
      recordVocalStat(88, 0, 2)
    }
    setWorkoutActive(true)
    const isBridge = lesson.drill.kind === 'passaggio-bridge'
    runner.start({
      pattern: pat,
      lowRoot: isBridge ? Math.max(40, profile.passaggioMidi - 4) : profile.comfortLow,
      highRoot: isBridge ? Math.min(76, profile.passaggioMidi + 3) : profile.comfortHigh,
      bpm: workoutBpm,
      useVocalGuide: lesson.drill.kind === 'harmony-lock',
    })
  }

  const toggleStrumLadder = () => {
    if (strumPlaying) {
      if (strumTimerRef.current) { clearInterval(strumTimerRef.current); strumTimerRef.current = null }
      setStrumPlaying(false)
      return
    }
    const prog = [
      { root: 55, minor: false, name: 'G' },
      { root: 52, minor: true, name: 'Em' },
      { root: 48, minor: false, name: 'C' },
      { root: 50, minor: false, name: 'D' },
    ]
    let step = 0
    setStrumPlaying(true)
    setStrumBar(0)
    setStrumBeat(0)
    playChordCue(prog[0].root, prog[0].minor, 0.34)
    strumTimerRef.current = window.setInterval(() => {
      step = (step + 1) % 16
      const bar = Math.floor(step / 4)
      const beat = step % 4
      setStrumBar(bar)
      setStrumBeat(beat)
      const ch = prog[bar]
      if (beat === 0) playChordCue(ch.root, ch.minor, 0.34)
      else if (strumStageRef.current >= 3) playCoachPiano(ch.root + 12, 0.35, 0.16)
    }, 680)
  }

  const doneSet = new Set(profile.doneLessons)
  const isDone = doneSet.has(lesson.id)
  const activeVideo = lesson.videos[videoIdx] ?? lesson.videos[0]
  const pct = Math.round((profile.doneLessons.length / ALL_SING_LESSONS.length) * 100)
  const STRUM_CHORDS = ['G', 'Em', 'C', 'D']

  return (
    <div className="sing-course-layout">
      {/* Left/Top 10-Module Curriculum Rail */}
      <aside className="sing-course-rail card" aria-label="Voice lessons curriculum">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>🎓 10-Module Pro Course</strong>
          <span className="sing-pill-tag">{pct}% ({profile.doneLessons.length}/{ALL_SING_LESSONS.length})</span>
        </div>
        <div className="sing-meter-track" style={{ marginBottom: 12 }}>
          <div className="sing-meter-fill good" style={{ width: `${pct}%` }} />
        </div>
        <div className="sing-module-list">
          {SING_COURSE.map(mod => (
            <div key={mod.id} className="sing-module-group">
              <div className="sing-module-title">
                <span>{mod.icon}</span>
                <span><b>M{mod.num}:</b> {mod.title}</span>
              </div>
              {mod.lessons.map(l => {
                const active = l.id === lesson.id
                const done = doneSet.has(l.id)
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={`sing-lesson-item${active ? ' active' : ''}${done ? ' done' : ''}`}
                    onClick={() => onSelectLesson(l.id)}
                  >
                    <span className="sing-lesson-check">{done ? '✓' : l.num}</span>
                    <span className="sing-lesson-name">{l.title}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Active Lesson Stage: Video + Breakdown + Interactive Drill */}
      <div className="sing-lesson-main col" style={{ gap: 14 }}>
        <div className="card col" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span className="sing-pill-tag">Lesson {lesson.num}</span>
              <h2 style={{ margin: '4px 0 2px' }}>{lesson.title}</h2>
              <p className="small muted" style={{ margin: 0 }}>{lesson.goal}</p>
            </div>
            <button
              type="button"
              className={`btn sm${isDone ? '' : ' primary'}`}
              onClick={() => markLessonDone(lesson.id, !isDone)}
            >
              {isDone ? '✓ Completed' : 'Mark Complete'}
            </button>
          </div>

          {/* Multi-Video Selector Tabs */}
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {lesson.videos.map((v, i) => (
              <button
                key={v.youtubeId}
                type="button"
                className={`btn sm${i === videoIdx ? ' primary' : ''}`}
                onClick={() => setVideoIdx(i)}
              >
                ▶ {v.coach} ({i + 1})
              </button>
            ))}
            <a
              className="btn sm"
              href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in YouTube ↗
            </a>
          </div>

          {/* Embedded Pro YouTube Video Player */}
          <div className="sing-yt-wrap">
            <iframe
              key={activeVideo.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?rel=0`}
              title={activeVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="small muted">
            <b>{activeVideo.title}</b> — {activeVideo.coach}{activeVideo.note ? ` · ${activeVideo.note}` : ''}
          </div>
        </div>

        {/* Structured Video Breakdown Card */}
        <div className="card col" style={{ gap: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>📋 Lesson Breakdown & Body Cues</strong>
            <button type="button" className="btn sm" onClick={() => setShowBreakdown(v => !v)}>
              {showBreakdown ? 'Hide' : 'Show'}
            </button>
          </div>
          {showBreakdown && (
            <>
              <ul className="sing-breakdown-list">
                {lesson.keyConcepts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              <div className="sing-cue-grid">
                <div className="sing-cue-box feel">
                  <strong>💡 How It Should Feel</strong>
                  <p className="small" style={{ margin: '4px 0 0' }}>{lesson.bodyCue}</p>
                </div>
                <div className="sing-cue-box trap">
                  <strong>⚠️ Common Trap to Avoid</strong>
                  <p className="small" style={{ margin: '4px 0 0' }}>{lesson.avoidTrap}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Built-In Interactive Drill tailored to this exact lesson! */}
        <div className="card col" style={{ gap: 10 }} data-testid="sing-lesson-drill">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>🎤 Interactive Drill: {lesson.drill.title}</strong>
              <p className="small muted" style={{ margin: '2px 0 0' }}>{lesson.drill.prompt}</p>
            </div>
            <button type="button" className={`btn sm${micOn ? ' primary' : ''}`} onClick={onToggleMic}>
              {micOn ? '🎙️ Mic Listening' : '🎙️ Start Mic'}
            </button>
          </div>

          {/* Drill 1: Guided Voice Range Profile */}
          {lesson.drill.kind === 'range-test' && (
            <div className="col" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className={`btn sm${rangeStep === 'low' ? ' primary' : ''}`} onClick={() => { if (!micOn) onToggleMic(); setRangeLow(null); setRangeStep('low') }}>
                  1. Find Lowest Note {rangeLow ? `(${midiToNoteName(rangeLow)})` : ''}
                </button>
                <button type="button" className={`btn sm${rangeStep === 'high' ? ' primary' : ''}`} onClick={() => { if (!micOn) onToggleMic(); setRangeHigh(null); setRangeStep('high') }}>
                  2. Find Highest Note {rangeHigh ? `(${midiToNoteName(rangeHigh)})` : ''}
                </button>
                <button type="button" className="btn primary sm" onClick={saveRangeProfile}>
                  ✓ Save My Voice Profile
                </button>
              </div>
              <div className="small">
                Current Profile: <b>{profile.voiceType}</b> · Range <b>{formatRange(profile.lowMidi, profile.highMidi)}</b> · Break Zone <b>{midiToNoteName(profile.passaggioMidi)}</b>
              </div>
            </div>
          )}

          {/* Drill 2: Steady Appoggio Hiss Breath Meter */}
          {lesson.drill.kind === 'breath-hiss' && (
            <div className="col" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="small">Steady "Sss" Time: <b>{hissSec.toFixed(1)}s / {lesson.drill.targetSec ?? 10}s</b></span>
                <button type="button" className="btn sm" onClick={() => setHissSec(0)}>Reset Timer</button>
              </div>
              <div className="sing-meter-track">
                <div className="sing-meter-fill good" style={{ width: `${Math.min(100, (hissSec / (lesson.drill.targetSec ?? 10)) * 100)}%` }} />
              </div>
              <div className="small muted">Live airflow hiss level: {Math.round((frame?.hiss ?? 0) * 100)}% {hissSec >= (lesson.drill.targetSec ?? 10) ? '· 🎉 Goal Hit!' : ''}</div>
            </div>
          )}

          {/* Drill 3: Zero-Sag Sustained Note Hold */}
          {lesson.drill.kind === 'sustain-nosag' && (
            <div className="col" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn sm" onClick={() => playCoachPiano(sustainTarget, 1.2, 0.42)}>
                  🎹 Hear Target ({midiToNoteName(sustainTarget)})
                </button>
                <button type="button" className="btn sm" onClick={() => setSustainTarget(n => Math.max(profile.comfortLow, n - 1))}>−1</button>
                <button type="button" className="btn sm" onClick={() => setSustainTarget(n => Math.min(profile.comfortHigh, n + 1))}>+1</button>
                <button type="button" className="btn sm" onClick={() => { setSustainSec(0); setSustainSag(false) }}>Reset</button>
                <span className="small">Hold: <b>{sustainSec.toFixed(1)}s / {lesson.drill.targetSec ?? 6}s</b> {sustainSag ? '⚠️ Sag detected — lift ribs!' : ''}</span>
              </div>
            </div>
          )}

          {/* Drill 4: Ear-First Blind Target Drill */}
          {lesson.drill.kind === 'ear-blind' && (
            <div className="col" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn primary sm" onClick={() => { if (!micOn) onToggleMic(); startBlindRound() }}>
                  🙈 Play New Blind Note
                </button>
                <button type="button" className="btn sm" onClick={() => playCoachPiano(blindTarget, 1.0, 0.4)}>
                  🔁 Replay Reference
                </button>
                <span className="small">
                  {blindPhase === 'imagine' && '👂 Hear it inside your head…'}
                  {blindPhase === 'sing' && '🎤 Now sing it BLIND (pitch line hidden!)'}
                  {blindPhase === 'reveal' && blindResult && (
                    <b>{blindResult.ok ? '🎯 DEAD-ON!' : '🔍 Reveal:'} {blindResult.cents > 0 ? `+${blindResult.cents}` : blindResult.cents}¢ from {midiToNoteName(blindTarget)}</b>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Drill 5: Vibrato Lab */}
          {lesson.drill.kind === 'vibrato-lab' && (
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <div className="sing-stat-chip">
                <span className="small muted">Rate</span>
                <strong>{frame?.vibrato.active ? `${frame.vibrato.rateHz} Hz` : 'Straight'}</strong>
              </div>
              <div className="sing-stat-chip">
                <span className="small muted">Depth</span>
                <strong>{frame?.vibrato.active ? `±${frame.vibrato.depthCents}¢` : '—'}</strong>
              </div>
              <div className="sing-stat-chip">
                <span className="small muted">Quality</span>
                <strong>{frame?.vibrato.quality === 'smooth' ? '✨ Smooth (Ideal 5–7 Hz!)' : frame?.vibrato.quality ?? 'Hold note 3s+'}</strong>
              </div>
            </div>
          )}

          {/* Drill 6: Piano Workout / Passaggio / Harmony Lock */}
          {(lesson.drill.kind === 'workout-pattern' || lesson.drill.kind === 'passaggio-bridge' || lesson.drill.kind === 'harmony-lock') && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className={`btn sm${workoutActive ? '' : ' primary'}`} onClick={toggleLessonWorkout}>
                {workoutActive ? '■ Stop Coach Piano' : '▶ Run Coach Piano Drill'}
              </button>
              <label className="row small" style={{ gap: 6 }}>
                BPM
                <input type="range" min={60} max={130} value={workoutBpm} onChange={e => setWorkoutBpm(Number(e.target.value))} style={{ width: 90 }} />
                <b>{workoutBpm}</b>
              </label>
              {lesson.drill.kind === 'harmony-lock' && (
                <button type="button" className="btn sm" onClick={onOpenSongsHarmony}>
                  🤝 Try Harmony Mode on Songs →
                </button>
              )}
            </div>
          )}

          {/* Drill 7: 5-Stage Sing & Strum Guitar Independence Ladder */}
          {lesson.drill.kind === 'sing-strum' && (
            <div className="col" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {STRUM_STAGES.map(st => (
                  <button
                    key={st.id}
                    type="button"
                    className={`btn sm${strumStage === st.id ? ' primary' : ''}`}
                    onClick={() => setStrumStage(st.id)}
                  >
                    {st.title}
                  </button>
                ))}
              </div>
              <div className="sing-strum-stage-box">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong>{STRUM_STAGES[strumStage - 1].title}</strong>
                    <p className="small muted" style={{ margin: '2px 0' }}>{STRUM_STAGES[strumStage - 1].desc}</p>
                  </div>
                  <button type="button" className={`btn sm${strumPlaying ? '' : ' primary'}`} onClick={toggleStrumLadder}>
                    {strumPlaying ? '■ Stop Groove' : '▶ Play G–Em–C–D Groove'}
                  </button>
                </div>
                <div className="sing-strum-grid">
                  {STRUM_CHORDS.map((c, idx) => (
                    <div key={c} className={`sing-strum-bar${strumPlaying && strumBar === idx ? ' active' : ''}`}>
                      <strong>{c}</strong>
                      <div className="row" style={{ gap: 4, justifyContent: 'center' }}>
                        {[0, 1, 2, 3].map(b => (
                          <span key={b} className={`sing-beat-dot${strumPlaying && strumBar === idx && strumBeat === b ? ' on' : ''}`}>
                            {b + 1}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="small" style={{ fontFamily: 'monospace', marginTop: 6 }}>
                  Strum cue: <b>{STRUM_STAGES[strumStage - 1].arrows}</b>
                </div>
              </div>
            </div>
          )}

          {/* Compact Live Vocal Pitch & Zone Mirror for immediate feedback during ANY lesson drill! */}
          <VocalTrackerCanvas
            time={tRef.current}
            targets={workoutTarget ? [{ t0: tRef.current - 0.5, t1: tRef.current + 1.5, midi: workoutTarget, lyric: midiToNoteName(workoutTarget) }] : lesson.drill.kind === 'sustain-nosag' ? [{ t0: tRef.current - 1, t1: tRef.current + 3, midi: sustainTarget, lyric: midiToNoteName(sustainTarget) }] : []}
            frame={frame}
            trail={trail}
            lowMidi={profile.lowMidi}
            highMidi={profile.highMidi}
            passaggioMidi={profile.passaggioMidi}
            blindMode={lesson.drill.kind === 'ear-blind' && blindPhase === 'sing'}
            height={195}
          />
        </div>
      </div>
    </div>
  )
}
