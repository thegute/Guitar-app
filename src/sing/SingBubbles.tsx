// Floating Singing Bubbles: tiny, 1-tap, draggable, shrinkable, opacity-adjustable helper bubbles
// tucked cleanly on the Sing stage so you never have to stop singing to dig through menus!
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { midiToNoteName, type CapoAdvice, type SongChord, type VocalFrame } from './vocalEngine'
import type { CoachPinKind } from './songStore'
import type { SongMixState } from './songPlayer'
import { playChordCue, playCoachPiano } from './pianoCoach'
import type { MirrorSnapshot } from './micSession'
import { playMirrorClip } from './songPlayer'

export type BubbleId = 'mirror' | 'mix' | 'loop' | 'pitchpipe' | 'capo' | 'tone' | 'pin' | 'health'

interface Props {
  frame: VocalFrame | null
  micOn: boolean
  /** current song mix state (if inside Songs tab) */
  mix?: SongMixState | null
  onMixChange?: (patch: Partial<SongMixState>) => void
  onFitMyVoice?: () => void
  onLoopLast4?: () => void
  onClearLoop?: () => void
  onDropPin?: (kind: CoachPinKind) => void
  /** start note & key for Pocket Pitch Pipe */
  rootMidi: number
  keyMinor?: boolean
  startNoteMidi?: number
  /** capo & current/next chord for Sing & Play */
  capo?: CapoAdvice | null
  currentChord?: SongChord | null
  nextChord?: SongChord | null
  /** Dashcam Vocal Mirror grabber */
  onCaptureMirror: () => MirrorSnapshot | null
  onSaveTake?: (snap: MirrorSnapshot) => void
  /** Vocal health active seconds today + quick cooldown launcher */
  todayVocalSec: number
  onStartCooldown: () => void
  /** show song-specific bubbles (mix, loop, pin, capo) */
  inSongMode: boolean
}

export function SingBubbles({
  frame,
  micOn,
  mix,
  onMixChange,
  onFitMyVoice,
  onLoopLast4,
  onClearLoop,
  onDropPin,
  rootMidi,
  keyMinor = false,
  startNoteMidi,
  capo,
  currentChord,
  nextChord,
  onCaptureMirror,
  onSaveTake,
  todayVocalSec,
  onStartCooldown,
  inSongMode,
}: Props) {
  const [open, setOpen] = useState<BubbleId | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [opacity, setOpacity] = useState(0.95)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [mirrorSnap, setMirrorSnap] = useState<MirrorSnapshot | null>(null)
  const [replaying, setReplaying] = useState(false)
  const [toast, setToast] = useState('')
  const stopReplayRef = useRef<(() => void) | null>(null)
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; id: number } | null>(null)

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(t => (t === msg ? '' : t)), 2200)
  }

  const onGripDown = (e: RPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, id: e.pointerId }
  }
  const onGripMove = (e: RPointerEvent) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    setPos({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) })
  }
  const onGripUp = () => { dragRef.current = null }

  const toggle = (id: BubbleId) => setOpen(cur => (cur === id ? null : id))

  const handleHearMe = () => {
    if (replaying) {
      stopReplayRef.current?.()
      stopReplayRef.current = null
      setReplaying(false)
      return
    }
    const snap = onCaptureMirror()
    if (!snap) {
      flash(micOn ? 'Sing a couple seconds first!' : 'Turn on the mic to capture your voice!')
      return
    }
    setMirrorSnap(snap)
    setReplaying(true)
    stopReplayRef.current = playMirrorClip(snap.samples, snap.sr, () => {
      setReplaying(false)
      stopReplayRef.current = null
    })
  }

  const vocalMin = Math.floor(todayVocalSec / 60)
  const needsRest = vocalMin >= 20

  return (
    <div
      className="sing-bubbles-dock"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, opacity }}
      data-testid="sing-bubbles-dock"
    >
      {toast && <div className="sing-bubble-toast" role="status">{toast}</div>}

      {/* Expanded Bubble Popover */}
      {!minimized && open && (
        <div className="sing-bubble-pop" data-testid={`sing-bubble-pop-${open}`}>
          <div className="sing-bubble-pop-head">
            <strong className="small">
              {open === 'mirror' && '🎙️ Dashcam Vocal Mirror'}
              {open === 'mix' && '🎚️ Quick Mix & Key'}
              {open === 'loop' && '🔁 Tough-Spot Loop'}
              {open === 'pitchpipe' && '🎹 Pocket Pitch Pipe'}
              {open === 'capo' && '🎸 Capo & Next Chord'}
              {open === 'tone' && '✨ Live Tone & Breath'}
              {open === 'pin' && '🏷️ Drop Timeline Coach Pin'}
              {open === 'health' && '💧 Vocal Health Guard'}
            </strong>
            <div className="row" style={{ gap: 6 }}>
              <input
                type="range"
                min={0.35}
                max={1}
                step={0.05}
                value={opacity}
                onChange={e => setOpacity(Number(e.target.value))}
                style={{ width: 54 }}
                aria-label="Bubble opacity"
                title="Bubble opacity"
              />
              <button type="button" className="btn sm" onClick={() => setOpen(null)}>✕</button>
            </div>
          </div>

          {open === 'mirror' && (
            <div className="col" style={{ gap: 8 }}>
              <p className="small muted" style={{ margin: 0 }}>
                Silently keeps your last 15 seconds while the mic is on. Tap <b>Hear Me</b> right after any line!
              </p>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <button type="button" className="btn primary sm" onClick={handleHearMe}>
                  {replaying ? '■ Stop Replay' : '▶ Hear Me (Last 8s)'}
                </button>
                {mirrorSnap && onSaveTake && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => { onSaveTake(mirrorSnap); flash('Saved take to My Voice!') }}
                  >
                    💾 Save Take
                  </button>
                )}
              </div>
              {mirrorSnap && (
                <div className="sing-mirror-mini">
                  <span className="small">
                    Captured {mirrorSnap.duration.toFixed(1)}s · {mirrorSnap.trail.filter(p => p.midi !== null).length} pitched frames
                  </span>
                </div>
              )}
            </div>
          )}

          {open === 'mix' && mix && onMixChange && (
            <div className="col" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span className="small">Key Shift: <b>{mix.shiftSemis > 0 ? `+${mix.shiftSemis}` : mix.shiftSemis} st</b></span>
                <div className="row" style={{ gap: 4 }}>
                  <button type="button" className="btn sm" onClick={() => onMixChange({ shiftSemis: Math.max(-12, mix.shiftSemis - 1) })}>−1</button>
                  <button type="button" className="btn sm" onClick={() => onMixChange({ shiftSemis: Math.min(12, mix.shiftSemis + 1) })}>+1</button>
                  {onFitMyVoice && <button type="button" className="btn primary sm" onClick={onFitMyVoice}>✨ Fit Voice</button>}
                </div>
              </div>
              <label className="small">
                Speed ({Math.round(mix.speed * 100)}%)
                <input type="range" min={0.65} max={1.15} step={0.05} value={mix.speed} onChange={e => onMixChange({ speed: Number(e.target.value) })} style={{ width: '100%' }} />
              </label>
              <label className="small">
                Original Singer / Lead-Pull ({Math.round(mix.singerVol * 100)}%)
                <input type="range" min={0} max={1} step={0.05} value={mix.singerVol} onChange={e => onMixChange({ singerVol: Number(e.target.value) })} style={{ width: '100%' }} />
              </label>
              <label className="small">
                Harmony Guide Voice ({Math.round(mix.harmonyGuideVol * 100)}%)
                <input type="range" min={0} max={1} step={0.05} value={mix.harmonyGuideVol} onChange={e => onMixChange({ harmonyGuideVol: Number(e.target.value) })} style={{ width: '100%' }} />
              </label>
              <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={mix.ghostGuide} onChange={e => onMixChange({ ghostGuide: e.target.checked })} />
                👻 Ghost Guide (singer sneaks in only if you drift off pitch)
              </label>
            </div>
          )}

          {open === 'loop' && mix && (
            <div className="col" style={{ gap: 8 }}>
              <p className="small muted" style={{ margin: 0 }}>
                Cracked on a phrase? Loop the last 4 seconds at 85% speed until it locks in.
              </p>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn primary sm" onClick={() => { onLoopLast4?.(); flash('Looping last 4s at 85%!') }}>
                  ⚡ Loop Last 4s
                </button>
                <button type="button" className="btn sm" onClick={() => { onMixChange?.({ loopA: mix.time }); flash(`Set A at ${mix.time.toFixed(1)}s`) }}>
                  Set A
                </button>
                <button type="button" className="btn sm" onClick={() => { onMixChange?.({ loopB: Math.max((mix.loopA ?? 0) + 1, mix.time) }); flash(`Set B at ${mix.time.toFixed(1)}s`) }}>
                  Set B
                </button>
                {(mix.loopA !== null || mix.loopB !== null) && (
                  <button type="button" className="btn sm" onClick={() => { onClearLoop?.(); flash('Loop cleared') }}>
                    Clear Loop
                  </button>
                )}
              </div>
            </div>
          )}

          {open === 'pitchpipe' && (
            <div className="col" style={{ gap: 8 }}>
              <p className="small muted" style={{ margin: 0 }}>Tap to hear your starting note or chord tones before you sing:</p>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {startNoteMidi !== undefined && (
                  <button type="button" className="btn primary sm" onClick={() => playCoachPiano(startNoteMidi, 1.1, 0.42)}>
                    ▶ Start ({midiToNoteName(startNoteMidi)})
                  </button>
                )}
                <button type="button" className="btn sm" onClick={() => playChordCue(rootMidi, keyMinor, 0.34)}>
                  Chord ({midiToNoteName(rootMidi)}{keyMinor ? 'm' : ''})
                </button>
                <button type="button" className="btn sm" onClick={() => playCoachPiano(rootMidi, 0.9, 0.4)}>Root</button>
                <button type="button" className="btn sm" onClick={() => playCoachPiano(rootMidi + (keyMinor ? 3 : 4), 0.9, 0.4)}>3rd</button>
                <button type="button" className="btn sm" onClick={() => playCoachPiano(rootMidi + 7, 0.9, 0.4)}>5th</button>
              </div>
            </div>
          )}

          {open === 'capo' && capo && (
            <div className="col" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="small">Song Key: <b>{capo.keyName}</b></span>
                <span className="sing-pill-tag">{capo.capo === 0 ? 'No Capo' : `Capo Fret ${capo.capo}`}</span>
              </div>
              <div className="small">Easy open shapes: <b>{capo.shapes.join(' · ')}</b></div>
              {(currentChord || nextChord) && (
                <div className="row" style={{ gap: 10, marginTop: 4 }}>
                  <div className="sing-chord-box now">
                    <span className="small muted">NOW</span>
                    <strong>{currentChord?.name ?? capo.shapes[0]}</strong>
                  </div>
                  <div className="sing-chord-box next">
                    <span className="small muted">NEXT</span>
                    <strong>{nextChord?.name ?? capo.shapes[1]}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {open === 'tone' && (
            <div className="col" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="small">Live Pitch: <b>{frame?.midi ? midiToNoteName(frame.midi) : '—'}</b></span>
                <span className="sing-pill-tag">{frame?.tone.label ?? (micOn ? 'Quiet' : 'Mic Off')}</span>
              </div>
              <div className="small">
                Clear Closure (Airy ↔ Clear): <b>{Math.round((frame?.tone.clarity ?? 0) * 100)}%</b>
                <div className="sing-meter-track"><div className="sing-meter-fill good" style={{ width: `${Math.round((frame?.tone.clarity ?? 0) * 100)}%` }} /></div>
              </div>
              <div className="small">
                Mask Ring / Brightness (Warm ↔ Bright): <b>{Math.round((frame?.tone.brightness ?? 0) * 100)}%</b>
                <div className="sing-meter-track"><div className="sing-meter-fill ring" style={{ width: `${Math.round((frame?.tone.brightness ?? 0) * 100)}%` }} /></div>
              </div>
              {frame?.vibrato.active && (
                <div className="small" style={{ color: '#5eead4' }}>
                  ✨ Vibrato: <b>{frame.vibrato.rateHz} Hz</b> (±{frame.vibrato.depthCents}¢ · {frame.vibrato.quality})
                </div>
              )}
            </div>
          )}

          {open === 'pin' && onDropPin && (
            <div className="col" style={{ gap: 8 }}>
              <p className="small muted" style={{ margin: 0 }}>Drop a reminder at the current second so it warns you 1 beat early next pass:</p>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn sm" onClick={() => { onDropPin('breath'); flash('Pinned 💨 Breath!') }}>💨 Breath</button>
                <button type="button" className="btn sm" onClick={() => { onDropPin('head'); flash('Pinned 🪶 Head/Mix!') }}>🪶 Head/Mix</button>
                <button type="button" className="btn sm" onClick={() => { onDropPin('vowel'); flash('Pinned 😮 Open Vowel!') }}>😮 Open Vowel</button>
                <button type="button" className="btn sm" onClick={() => { onDropPin('belt'); flash('Pinned 🔥 Belt/Support!') }}>🔥 Belt</button>
              </div>
            </div>
          )}

          {open === 'health' && (
            <div className="col" style={{ gap: 8 }}>
              <div className="small">Active singing today: <b>{vocalMin} min</b></div>
              <p className="small muted" style={{ margin: 0 }}>
                {needsRest
                  ? 'Great session! Take a sip of water and run a quick 60-second soft humming cool-down so your voice stays fresh tomorrow.'
                  : 'Stay hydrated (room-temp water), keep throat relaxed, and finish heavy runs with a 60-sec humming cool-down.'}
              </p>
              <button type="button" className="btn primary sm" onClick={() => { onStartCooldown(); setOpen(null) }}>
                🫧 Start 60s Hum Cool-Down
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compact Draggable Bubble Rail */}
      <div className="sing-bubble-rail">
        <span
          className="sing-bubble-grip"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
          title="Drag floating singing bubbles"
        >
          ⠿
        </span>

        {minimized ? (
          <button type="button" className="sing-bubble-btn active" onClick={() => setMinimized(false)} title="Expand Sing Bubbles">
            🎤 Bubbles ↗
          </button>
        ) : (
          <>
            <button type="button" className={`sing-bubble-btn${open === 'mirror' || replaying ? ' active' : ''}`} onClick={() => toggle('mirror')} title="Dashcam Vocal Mirror">
              🎙️ {replaying ? 'Playing' : 'Mirror'}
            </button>
            {inSongMode && mix && (
              <>
                <button type="button" className={`sing-bubble-btn${open === 'mix' ? ' active' : ''}`} onClick={() => toggle('mix')} title="Quick Mix & Key">
                  🎚️ {mix.shiftSemis ? `${mix.shiftSemis > 0 ? '+' : ''}${mix.shiftSemis}st` : 'Mix'}
                </button>
                <button type="button" className={`sing-bubble-btn${open === 'loop' || mix.loopA !== null ? ' active' : ''}`} onClick={() => toggle('loop')} title="Loop Last 4s / A-B">
                  🔁 Loop
                </button>
                <button type="button" className={`sing-bubble-btn${open === 'pin' ? ' active' : ''}`} onClick={() => toggle('pin')} title="Drop Coach Pin">
                  🏷️ Pin
                </button>
              </>
            )}
            <button type="button" className={`sing-bubble-btn${open === 'pitchpipe' ? ' active' : ''}`} onClick={() => toggle('pitchpipe')} title="Pocket Pitch Pipe">
              🎹 Pipe
            </button>
            {capo && (
              <button type="button" className={`sing-bubble-btn${open === 'capo' ? ' active' : ''}`} onClick={() => toggle('capo')} title="Capo & Next Chord">
                🎸 {capo.capo ? `C${capo.capo}` : capo.keyName}
              </button>
            )}
            <button type="button" className={`sing-bubble-btn${open === 'tone' ? ' active' : ''}`} onClick={() => toggle('tone')} title="Live Tone & Breath Orb">
              ✨ {frame?.tone.label && frame.tone.label !== 'Quiet' ? frame.tone.label : 'Tone'}
            </button>
            <button type="button" className={`sing-bubble-btn${needsRest ? ' warn' : ''}${open === 'health' ? ' active' : ''}`} onClick={() => toggle('health')} title="Vocal Health & Water Timer">
              💧 {vocalMin}m
            </button>
            <button type="button" className="sing-bubble-btn" onClick={() => { setOpen(null); setMinimized(true) }} title="Shrink bubbles">—</button>
          </>
        )}
      </div>
    </div>
  )
}
