// Intuitive Beat Maker UI modules:
// 1. FloatingBeatTransport: always-reachable draggable floating Play/Rec/BPM/Undo pill (shrinkable to a single round ▶ button).
// 2. BeatHelperBar: 1-tap Style Starters + 7 undoable Auto-Producer tools (Bounce, Hat Rolls, Auto Fill, Bass, Chords, Remix, Full Song).
// 3. BeatGuideCoach: collapsible 5-step Guided Beat Coach with "✨ Do this step for me" on every step.
// 4. TrackStrip: clean channel strip (🥁 Drums · 🎸 Bass · 🎹 Chords) with Mute, Solo, Volume & quick add/remove.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from '../audio/tapFeel'
import { usePersist } from '../components/Controls'
import { BeatLight } from './BeatLight'
import type { Beat } from './beat'
import { padLabel } from './beat'
import {
  GUIDE_STEPS, QUICK_VIBES,
  applyAutoBassline, applyAutoChords, applyAutoDrumFill, applyAutoFullSong,
  applyBounceAndGhosts, applyGuideStep, applyProHatRolls, applyRemixVariation, loadQuickVibe,
  type HelperResult,
} from './beatHelper'
import type { PadId } from './pads'
import { instr } from './sounds'
import type { StudioTransport } from './transport'

export type SetBeatFn = (f: Beat | ((b: Beat) => Beat), remember?: boolean) => void

const FLOAT_POS_KEY = 'kg:beatPlayPos'

function loadFloatPos(): { x: number; y: number } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(FLOAT_POS_KEY) ?? 'null') as { x?: number; y?: number } | null
    if (raw && typeof raw.x === 'number' && typeof raw.y === 'number') return { x: raw.x, y: raw.y }
  } catch { /* private */ }
  return null
}

function saveFloatPos(p: { x: number; y: number }) {
  try { localStorage.setItem(FLOAT_POS_KEY, JSON.stringify(p)) } catch { /* private */ }
}

/**
 * Draggable Floating Play Pill for Beat Maker (visible in both Cockpit and Windows layouts).
 * Drag via the ⠿ grip (or drag the round button when shrunk). Tap "—" to shrink to a single floating ▶ Play button.
 */
export function FloatingBeatTransport({
  active, t, bpm, playing, recording, canUndo,
  onPlay, onStop, onToggleRecord, onBpm, onUndo,
}: {
  active: boolean
  t: StudioTransport
  bpm: number
  playing: boolean
  recording: boolean
  canUndo: boolean
  onPlay: () => void
  onStop: () => void
  onToggleRecord: () => void
  onBpm: (next: number) => void
  onUndo: () => void
}) {
  const [mini, setMini] = usePersist('studioPlayMini', true)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(loadFloatPos)
  const pillRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pid: number; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const clampPos = useCallback((x: number, y: number) => {
    const vw = typeof innerWidth === 'number' ? innerWidth : 800
    const vh = typeof innerHeight === 'number' ? innerHeight : 700
    const rect = pillRef.current?.getBoundingClientRect()
    const w = rect?.width || (mini ? 60 : 284)
    const h = rect?.height || (mini ? 60 : 54)
    return {
      x: Math.round(Math.max(8, Math.min(vw - w - 8, x))),
      y: Math.round(Math.max(8, Math.min(vh - h - 8, y))),
    }
  }, [mini])

  useEffect(() => {
    if (!active) return
    const onResize = () => setPos(p => (p ? clampPos(p.x, p.y) : p))
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [active, clampPos])

  useEffect(() => {
    if (!active) return
    // Re-clamp whenever switching between mini and expanded pill
    const id = requestAnimationFrame(() => setPos(p => (p ? clampPos(p.x, p.y) : p)))
    return () => cancelAnimationFrame(id)
  }, [active, mini, clampPos])

  if (!active || typeof document === 'undefined') return null

  const startDrag = (e: React.PointerEvent) => {
    const el = pillRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = {
      pid: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      moved: false,
    }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }

  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || d.pid !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < 6) return
    d.moved = true
    const next = clampPos(d.origX + dx, d.origY + dy)
    setPos(next)
  }

  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || d.pid !== e.pointerId) return
    dragRef.current = null
    if (d.moved) {
      suppressClick.current = true
      setTimeout(() => { suppressClick.current = false }, 80)
      const rect = pillRef.current?.getBoundingClientRect()
      if (rect) saveFloatPos(clampPos(rect.left, rect.top))
    }
  }

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : { right: 14, bottom: 78 }

  if (mini) {
    return createPortal(
      <div
        ref={pillRef}
        className={`bf-pill mini${playing ? ' playing' : ''}`}
        style={style}
        role="region"
        aria-label="Floating beat play button"
        data-testid="beat-float-pill"
      >
        <button
          className={`bf-play-btn${playing ? ' on' : ''}`}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={() => {
            if (suppressClick.current) return
            haptic('light')
            if (playing) onStop(); else onPlay()
          }}
          aria-label={playing ? 'Stop beat' : 'Play beat'}
          title={playing ? 'Stop beat (drag to move)' : 'Play beat (drag to move)'}
          data-testid="beat-float-play"
        >
          {playing ? '■' : '▶'}
        </button>
        <button
          className="bf-expand"
          onClick={() => setMini(false)}
          aria-label="Expand floating beat controls"
          title="Expand floating beat controls"
          data-testid="beat-float-expand"
        >
          ↗
        </button>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div
      ref={pillRef}
      className={`bf-pill${playing ? ' playing' : ''}`}
      style={style}
      role="region"
      aria-label="Floating beat transport"
      data-testid="beat-float-pill"
    >
      <span
        className="bf-grip"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title="Drag anywhere on screen"
        aria-label="Drag floating play bar"
        data-testid="beat-float-grip"
      >
        ⠿
      </span>
      <button
        className={`bf-play-btn${playing ? ' on' : ''}`}
        onClick={() => { haptic('light'); if (playing) onStop(); else onPlay() }}
        aria-label={playing ? 'Stop beat' : 'Play beat'}
        data-testid="beat-float-play"
      >
        {playing ? '■' : '▶'}
      </button>
      <button
        className={`bf-rec-btn${recording ? ' on' : ''}`}
        onClick={onToggleRecord}
        aria-pressed={recording}
        aria-label="Record into beat"
        title="Record pads/keys into beat"
        data-testid="beat-float-rec"
      >
        ●
      </button>
      <BeatLight t={t} playing={playing} />
      <div className="bf-bpm" role="group" aria-label="Floating tempo">
        <button className="bf-step" onClick={() => onBpm(Math.max(40, bpm - 2))} aria-label="Slower">−</button>
        <span className="bf-bpm-val" title="Beats per minute">{bpm}</span>
        <button className="bf-step" onClick={() => onBpm(Math.min(220, bpm + 2))} aria-label="Faster">+</button>
      </div>
      <button
        className="bf-icon-btn"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo last beat change"
        title="Undo"
        data-testid="beat-float-undo"
      >
        ↶
      </button>
      <button
        className="bf-icon-btn"
        onClick={() => setMini(true)}
        aria-label="Shrink to single floating Play button"
        title="Shrink to single ▶ Play button"
        data-testid="beat-float-shrink"
      >
        —
      </button>
    </div>,
    document.body,
  )
}

/**
 * ✨ Smart Beat Helper Bar: 1-tap Style Starters + 7 undoable Auto-Producer buttons + live plain-English coaching toast.
 */
export function BeatHelperBar({
  beat, setBeat, onTip, onFocusVoice, tip, canUndo, onUndo, compact = false,
}: {
  beat: Beat
  setBeat: SetBeatFn
  onTip: (tip: string) => void
  onFocusVoice?: (v: PadId) => void
  tip: string
  canUndo: boolean
  onUndo: () => void
  compact?: boolean
}) {
  const run = (fn: (b: Beat) => HelperResult) => {
    let result: HelperResult | null = null
    setBeat(b => {
      result = fn(b)
      return result.beat
    })
    haptic('light')
    if (result) {
      const r = result as HelperResult
      onTip(r.tip)
      if (r.focusVoice && onFocusVoice) onFocusVoice(r.focusVoice)
    }
  }

  const pickVibe = (id: string) => {
    const res = loadQuickVibe(id)
    if (!res) return
    setBeat(res.beat)
    haptic('light')
    onTip(res.tip)
    if (res.focusVoice && onFocusVoice) onFocusVoice(res.focusVoice)
  }

  return (
    <div className={`bh-bar${compact ? ' compact' : ''}`} data-testid="beat-helper-bar">
      <div className="bh-row bh-vibes" role="group" aria-label="Quick style starters">
        <span className="bh-label">Style:</span>
        {QUICK_VIBES.map(v => (
          <button
            key={v.id}
            className={`bh-chip${beat.name.toLowerCase().includes(v.label.split(' ')[0].toLowerCase()) ? ' on' : ''}`}
            onClick={() => pickVibe(v.id)}
            data-testid={`bh-vibe-${v.id}`}
          >
            {v.emoji} {v.label}
          </button>
        ))}
      </div>
      <div className="bh-row bh-actions" role="group" aria-label="Auto beat helpers">
        <span className="bh-label">✨ Helper:</span>
        <button className="bh-btn" onClick={() => run(applyBounceAndGhosts)} data-testid="bh-bounce" title="Add quiet ghost snares, dynamic groove, and subtle pocket swing">
          👻 Bounce
        </button>
        <button className="bh-btn" onClick={() => run(applyProHatRolls)} data-testid="bh-hats" title="Add rapid ×2 / ×3 hi-hat rolls and an open-hat lift">
          🔥 Hat Rolls
        </button>
        <button className="bh-btn" onClick={() => run(applyAutoDrumFill)} data-testid="bh-fill" title="Write a turnaround drum fill on the last bar into a beat-1 crash">
          🥁 Auto Fill
        </button>
        <button className="bh-btn" onClick={() => run(applyAutoBassline)} data-testid="bh-bass" title={`Lock a bassline in ${beat.key}${beat.minor ? 'm' : ''} directly to your kick drum`}>
          🎸 Auto Bass
        </button>
        <button className="bh-btn" onClick={() => run(applyAutoChords)} data-testid="bh-chords" title={`Add matching chords in ${beat.key}${beat.minor ? 'm' : ''} locked to your beat`}>
          🎹 Auto Chords
        </button>
        <button className="bh-btn" onClick={() => run(b => applyRemixVariation(b))} data-testid="bh-remix" title="Keep kick & snare solid while generating a fresh hat & percussion groove">
          🎲 Remix
        </button>
        <button className="bh-btn accent" onClick={() => run(applyAutoFullSong)} data-testid="bh-song" title="Auto-build Verse A, Chorus B, Breakdown C & Ending D and turn Song Mode on">
          🎶 Full Song
        </button>
      </div>
      {tip && (
        <div className="bh-toast" role="status" data-testid="bh-toast">
          <span className="bh-toast-text">💡 {tip}</span>
          {canUndo && (
            <button className="btn sm ghost" onClick={onUndo} data-testid="bh-toast-undo">
              ↶ Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 🧭 "Guide Me" 5-Step Guided Beat Coach: teaches beat-making step by step with a 1-tap "✨ Do this step for me" button.
 */
export function BeatGuideCoach({
  beat, setBeat, onTip, onFocusVoice, onClose,
}: {
  beat: Beat
  setBeat: SetBeatFn
  onTip: (tip: string) => void
  onFocusVoice?: (v: PadId) => void
  onClose?: () => void
}) {
  const [stepIdx, setStepIdx] = usePersist<number>('studioGuideStep', 0)
  const cur = GUIDE_STEPS[Math.max(0, Math.min(GUIDE_STEPS.length - 1, stepIdx))]

  const hasVoice = (v: string) => beat.rows.some(r => r.voice === v && r.steps.some(x => x > 0))
  const doneFlags = [
    hasVoice('kick'),
    hasVoice('snare') || hasVoice('clap'),
    hasVoice('hat') || hasVoice('ride'),
    beat.tracks.length > 0,
    hasVoice('crash') || beat.swing > 0.05 || beat.rows.some(r => r.voice === 'snare' && r.steps.some(x => x > 0 && x < 0.45)),
  ]

  const selectStep = (idx: number) => {
    setStepIdx(idx)
    const def = GUIDE_STEPS[idx]
    if (def && onFocusVoice) onFocusVoice(def.voice)
  }

  const doThisStep = () => {
    let res: HelperResult | null = null
    setBeat(b => {
      res = applyGuideStep(b, cur.id as 0 | 1 | 2 | 3 | 4)
      return res.beat
    })
    haptic('light')
    if (res) {
      const r = res as HelperResult
      onTip(r.tip)
      if (r.focusVoice && onFocusVoice) onFocusVoice(r.focusVoice)
    }
  }

  return (
    <section className="bg-coach" aria-label="Guided beat coach" data-testid="beat-guide-coach">
      <div className="bg-head">
        <div className="bg-steps" role="tablist" aria-label="Beat building steps">
          {GUIDE_STEPS.map((s, idx) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={idx === stepIdx}
              className={`bg-pill${idx === stepIdx ? ' cur' : ''}${doneFlags[idx] ? ' done' : ''}`}
              onClick={() => selectStep(idx)}
              data-testid={`guide-step-${idx}`}
            >
              {doneFlags[idx] ? '✓ ' : ''}{s.short}
            </button>
          ))}
        </div>
        {onClose && (
          <button className="btn sm ghost" onClick={onClose} aria-label="Hide Guide Me" data-testid="guide-close">
            ✕
          </button>
        )}
      </div>
      <div className="bg-body">
        <div className="bg-copy">
          <b>{cur.emoji} {cur.title}</b>
          <span className="small muted">{cur.hint}</span>
        </div>
        <div className="bg-btns">
          <button className="btn sm primary" onClick={doThisStep} data-testid="guide-auto-btn">
            {cur.cta}
          </button>
          {stepIdx < GUIDE_STEPS.length - 1 && (
            <button className="btn sm" onClick={() => selectStep(stepIdx + 1)} data-testid="guide-next-btn">
              Next →
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

const BASS_IDS = new Set(['sub808', 'bass', 'upbass', 'synthbass'])
const trackEmoji = (inst: string) => (BASS_IDS.has(inst) ? '🎸' : inst === 'strings' || inst === 'choir' ? '🎻' : inst === 'horns' ? '🎺' : '🎹')
const trackName = (beat: Beat, inst: string) => (inst.startsWith('pad:') ? `Pad: ${padLabel(beat, inst.slice(4))}` : instr(inst).label)

/**
 * Clean Track Strip (🥁 Drums · 🎸 Bass · 🎹 Chords) with 1-tap Mute, Solo, Volume & Quick Add.
 */
export function TrackStrip({
  beat, setBeat, onTip,
}: {
  beat: Beat
  setBeat: SetBeatFn
  onTip: (tip: string) => void
}) {
  const drumsMuted = beat.rows.length > 0 && beat.rows.every(r => r.mute)
  const hasBass = beat.tracks.some(t => BASS_IDS.has(t.inst))
  const hasChords = beat.tracks.some(t => !BASS_IDS.has(t.inst))
  const isDrumsSolo = !drumsMuted && beat.tracks.length > 0 && beat.tracks.every(t => t.mute)

  const toggleDrumsMute = () => {
    const nextMute = !drumsMuted
    setBeat(b => ({ ...b, rows: b.rows.map(r => ({ ...r, mute: nextMute })) }))
  }

  const soloDrums = () => {
    if (isDrumsSolo) {
      setBeat(b => ({
        ...b,
        rows: b.rows.map(r => ({ ...r, mute: false })),
        tracks: b.tracks.map(t => ({ ...t, mute: false })),
      }))
    } else {
      setBeat(b => ({
        ...b,
        rows: b.rows.map(r => ({ ...r, mute: false })),
        tracks: b.tracks.map(t => ({ ...t, mute: true })),
      }))
    }
  }

  const soloTrack = (id: string) => {
    const target = beat.tracks.find(t => t.id === id)
    if (!target) return
    const alreadySolo = !target.mute && drumsMuted && beat.tracks.every(t => t.id === id || t.mute)
    if (alreadySolo) {
      setBeat(b => ({
        ...b,
        rows: b.rows.map(r => ({ ...r, mute: false })),
        tracks: b.tracks.map(t => ({ ...t, mute: false })),
      }))
    } else {
      setBeat(b => ({
        ...b,
        rows: b.rows.map(r => ({ ...r, mute: true })),
        tracks: b.tracks.map(t => ({ ...t, mute: t.id !== id })),
      }))
    }
  }

  const quickAdd = (fn: (b: Beat) => HelperResult) => {
    let tip = ''
    setBeat(b => { const r = fn(b); tip = r.tip; return r.beat })
    haptic('light')
    if (tip) onTip(tip)
  }

  return (
    <div className="ts-strip" aria-label="Beat tracks" data-testid="track-strip">
      <div className={`ts-chan${drumsMuted ? ' muted' : ''}`}>
        <span className="ts-name">🥁 Drums</span>
        <input
          type="range"
          min={0}
          max={1.4}
          step={0.05}
          value={beat.drumVol}
          onChange={e => setBeat(b => ({ ...b, drumVol: Number(e.target.value) }), false)}
          aria-label="Drums volume"
        />
        <button className={`ts-btn${drumsMuted ? ' on' : ''}`} aria-pressed={drumsMuted} onClick={toggleDrumsMute} title="Mute drums">M</button>
        <button className={`ts-btn${isDrumsSolo ? ' solo' : ''}`} aria-pressed={isDrumsSolo} onClick={soloDrums} title="Solo drums">S</button>
      </div>
      {beat.tracks.map(tr => {
        const isSolo = !tr.mute && drumsMuted && beat.tracks.every(t => t.id === tr.id || t.mute)
        return (
          <div key={tr.id} className={`ts-chan${tr.mute ? ' muted' : ''}`} data-testid={`ts-track-${tr.inst}`}>
            <span className="ts-name">{trackEmoji(tr.inst)} {trackName(beat, tr.inst)}</span>
            <input
              type="range"
              min={0}
              max={1.4}
              step={0.05}
              value={tr.vol}
              onChange={e => setBeat(b => ({ ...b, tracks: b.tracks.map(x => (x.id === tr.id ? { ...x, vol: Number(e.target.value) } : x)) }), false)}
              aria-label={`${trackName(beat, tr.inst)} volume`}
            />
            <button
              className={`ts-btn${tr.mute ? ' on' : ''}`}
              aria-pressed={!!tr.mute}
              onClick={() => setBeat(b => ({ ...b, tracks: b.tracks.map(x => (x.id === tr.id ? { ...x, mute: !x.mute } : x)) }))}
              title={`Mute ${trackName(beat, tr.inst)}`}
            >
              M
            </button>
            <button
              className={`ts-btn${isSolo ? ' solo' : ''}`}
              aria-pressed={isSolo}
              onClick={() => soloTrack(tr.id)}
              title={`Solo ${trackName(beat, tr.inst)}`}
            >
              S
            </button>
            <button
              className="ts-btn"
              onClick={() => setBeat(b => ({ ...b, tracks: b.tracks.filter(x => x.id !== tr.id) }))}
              aria-label={`Remove ${trackName(beat, tr.inst)}`}
              title="Remove track"
            >
              ✕
            </button>
          </div>
        )
      })}
      {!hasBass && (
        <button className="ts-add" onClick={() => quickAdd(applyAutoBassline)} data-testid="ts-add-bass">
          + 🎸 Bass
        </button>
      )}
      {!hasChords && (
        <button className="ts-add" onClick={() => quickAdd(applyAutoChords)} data-testid="ts-add-chords">
          + 🎹 Chords
        </button>
      )}
    </div>
  )
}
