// Singing Practice Tracker ("The Vocal Studio Mirror"):
// - Zoomed piano ladder locked to the singer's vocal range with Chest / Passaggio Break / Head color zones
// - Target melody ribbons (and silver ghost Lead + glowing teal Harmony ribbons in Harmony Mode!)
// - Smooth live voice ink trail (green = locked, shimmer wave = natural vibrato bonus!, amber/coral = flat/sharp)
// - Smart diagnostic tags (↗ scoop, ↘ sag), Timeline Coach Pins popping up 1 beat early,
//   🙈 Ear-First Blind Mode with instant phrase reveal, and Lyrics + Chords/Capo footer!
import { useEffect, useRef } from 'react'
import { midiToNoteName, type MelodyNote, type SongChord, type VocalFrame } from './vocalEngine'
import type { CoachPin, SyncedLyricLine } from './songStore'

export interface TrailPoint {
  t: number
  midi: number | null
  level: number
  errCents: number | null
  vibrato: boolean
  scoop: boolean
  sag: boolean
}

interface Props {
  /** current playback/timeline seconds */
  time: number
  /** active target notes (already shifted by shiftSemis if in Lead mode, or harmony notes in Harmony mode) */
  targets: MelodyNote[]
  /** optional original lead melody shown as a silver ghost line in Harmony Mode */
  ghostLead?: MelodyNote[]
  /** live vocal frame from mic */
  frame: VocalFrame | null
  /** rolling trail of recent voice points (song-time or free-time aligned) */
  trail: TrailPoint[]
  /** singer profile range markers */
  lowMidi: number
  highMidi: number
  passaggioMidi: number
  /** Timeline coach pins */
  pins?: CoachPin[]
  /** optional chords (already shifted) */
  chords?: SongChord[]
  /** optional lyrics */
  lyrics?: SyncedLyricLine[]
  /** Ear-First Blind Mode: hide live trail while singing; reveal after silent pause */
  blindMode?: boolean
  /** highlight A-B loop region */
  loopA?: number | null
  loopB?: number | null
  /** visible horizontal span in seconds (default 6.5s) */
  windowSec?: number
  /** compact mode for lesson drills */
  height?: number
}

const PIN_ICON: Record<CoachPin['kind'], string> = {
  breath: '💨',
  head: '🪶',
  vowel: '😮',
  belt: '🔥',
  custom: '🏷️',
}

export function VocalTrackerCanvas({
  time,
  targets,
  ghostLead,
  frame,
  trail,
  lowMidi,
  highMidi,
  passaggioMidi,
  pins = [],
  chords = [],
  lyrics = [],
  blindMode = false,
  loopA = null,
  loopB = null,
  windowSec = 6.5,
  height = 290,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cssW = cv.clientWidth || 640
    const cssH = height
    if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) {
      cv.width = Math.round(cssW * dpr)
      cv.height = Math.round(cssH * dpr)
    }
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.scale(dpr, dpr)

    const ladderW = 48
    const topPad = 26
    const botPad = 24
    const plotW = Math.max(100, cssW - ladderW)
    const plotH = Math.max(80, cssH - topPad - botPad)

    // Zoom vertical window tightly around singer's range + active nearby targets
    let minM = lowMidi - 2
    let maxM = highMidi + 2
    const visibleTargets = targets.filter(n => n.t1 >= time - 2 && n.t0 <= time + windowSec)
    if (visibleTargets.length) {
      for (const n of visibleTargets) {
        if (n.midi - 3 < minM) minM = n.midi - 3
        if (n.midi + 3 > maxM) maxM = n.midi + 3
      }
    }
    minM = Math.max(34, Math.floor(minM))
    maxM = Math.min(88, Math.ceil(maxM))
    if (maxM - minM < 14) {
      const mid = (minM + maxM) / 2
      minM = Math.floor(mid - 7)
      maxM = Math.ceil(mid + 7)
    }

    const yOf = (m: number) => topPad + ((maxM - m) / (maxM - minM)) * plotH
    const nowX = ladderW + plotW * 0.28
    const pxPerSec = plotW / windowSec
    const xOf = (t: number) => nowX + (t - time) * pxPerSec

    // 1. Background + Chest / Passaggio Break / Head Voice zones
    ctx.fillStyle = '#0c1018'
    ctx.fillRect(0, 0, cssW, cssH)

    // Head zone (above passaggio + 1.5)
    const headBotY = Math.min(topPad + plotH, Math.max(topPad, yOf(passaggioMidi + 1.5)))
    ctx.fillStyle = 'rgba(56, 189, 248, 0.065)'
    ctx.fillRect(ladderW, topPad, plotW, Math.max(0, headBotY - topPad))

    // Passaggio / Vocal Break warning band (passaggio ± 1.5 semitones)
    const passTopY = Math.max(topPad, yOf(passaggioMidi + 1.5))
    const passBotY = Math.min(topPad + plotH, yOf(passaggioMidi - 1.5))
    if (passBotY > passTopY) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.13)'
      ctx.fillRect(ladderW, passTopY, plotW, passBotY - passTopY)
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(ladderW, passTopY); ctx.lineTo(cssW, passTopY)
      ctx.moveTo(ladderW, passBotY); ctx.lineTo(cssW, passBotY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(216, 180, 254, 0.72)'
      ctx.font = '600 10px system-ui, sans-serif'
      ctx.fillText('BREAK / MIX ZONE', cssW - 104, passTopY + 11)
    }

    // Chest zone (below passaggio - 1.5)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.05)'
    ctx.fillRect(ladderW, passBotY, plotW, Math.max(0, topPad + plotH - passBotY))

    // Loop A-B shaded highlight
    if (loopA !== null && loopB !== null && loopB > loopA) {
      const lx0 = Math.max(ladderW, xOf(loopA))
      const lx1 = Math.min(cssW, xOf(loopB))
      if (lx1 > lx0) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.09)'
        ctx.fillRect(lx0, topPad, lx1 - lx0, plotH)
      }
    }

    // 2. Horizontal semitone grid + Left Piano Note Ladder
    const rowH = plotH / (maxM - minM)
    for (let m = minM; m <= maxM; m++) {
      const y = yOf(m)
      const pc = ((m % 12) + 12) % 12
      const isBlack = pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10
      const isC = pc === 0

      // Grid line
      ctx.strokeStyle = isC ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.055)'
      ctx.lineWidth = isC ? 1 : 0.75
      ctx.beginPath()
      ctx.moveTo(ladderW, y)
      ctx.lineTo(cssW, y)
      ctx.stroke()

      // Piano key cell on left
      ctx.fillStyle = isBlack ? '#171c28' : '#232a3a'
      ctx.fillRect(0, y - rowH * 0.48, ladderW - 2, Math.max(2, rowH * 0.96))
      if (isC || m % 2 === 0 || rowH >= 13) {
        ctx.fillStyle = isC ? '#f8fafc' : 'rgba(226, 232, 240, 0.65)'
        ctx.font = isC ? '700 10px system-ui, sans-serif' : '500 9px system-ui, sans-serif'
        ctx.fillText(midiToNoteName(m), 6, y + 3)
      }
    }

    // 3. Chord labels along the top rail
    for (const c of chords) {
      const x0 = xOf(c.t0)
      if (x0 < ladderW - 60 || x0 > cssW + 40) continue
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)'
      ctx.fillRect(Math.max(ladderW, x0), 4, 42, 17)
      ctx.fillStyle = '#bae6fd'
      ctx.font = '700 11px system-ui, sans-serif'
      ctx.fillText(c.name, Math.max(ladderW, x0) + 6, 16)
    }

    // 4. Ghost original lead melody (when Harmony Mode is active!)
    const ribbonH = Math.max(10, Math.min(20, rowH * 0.82))
    if (ghostLead && ghostLead.length) {
      for (const n of ghostLead) {
        const x0 = xOf(n.t0), x1 = xOf(n.t1)
        if (x1 < ladderW || x0 > cssW) continue
        const y = yOf(n.midi)
        ctx.fillStyle = 'rgba(203, 213, 225, 0.2)'
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(Math.max(ladderW, x0), y - ribbonH * 0.45, Math.max(4, x1 - Math.max(ladderW, x0)), ribbonH * 0.9, 5)
        ctx.fill()
        ctx.stroke()
      }
    }

    // 5. Target Melody (or Harmony) Ribbons
    const isHarmony = Boolean(ghostLead && ghostLead.length)
    for (const n of targets) {
      const x0 = xOf(n.t0), x1 = xOf(n.t1)
      if (x1 < ladderW || x0 > cssW) continue
      const y = yOf(n.midi)
      const active = time >= n.t0 - 0.04 && time <= n.t1 + 0.04
      const drawX = Math.max(ladderW, x0)
      const drawW = Math.max(5, x1 - drawX)

      ctx.fillStyle = isHarmony
        ? (active ? 'rgba(45, 212, 191, 0.55)' : 'rgba(45, 212, 191, 0.32)')
        : (active ? 'rgba(99, 102, 241, 0.58)' : 'rgba(99, 102, 241, 0.34)')
      ctx.strokeStyle = isHarmony
        ? (active ? '#5eead4' : 'rgba(94, 234, 212, 0.7)')
        : (active ? '#a5b4fc' : 'rgba(165, 180, 252, 0.65)')
      ctx.lineWidth = active ? 2 : 1.2
      ctx.beginPath()
      ctx.roundRect(drawX, y - ribbonH * 0.5, drawW, ribbonH, 6)
      ctx.fill()
      ctx.stroke()

      // Center reference line inside target ribbon
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(drawX + 3, y)
      ctx.lineTo(drawX + drawW - 3, y)
      ctx.stroke()

      if (n.lyric && drawW > 18) {
        ctx.fillStyle = '#f8fafc'
        ctx.font = '600 10px system-ui, sans-serif'
        ctx.fillText(n.lyric, drawX + 5, y - ribbonH * 0.5 - 3)
      }
    }

    // 6. Timeline Coach Pins (pop up brightly 1 beat before arrival!)
    for (const p of pins) {
      const px = xOf(p.t)
      if (px < ladderW || px > cssW) continue
      const approaching = p.t - time >= -0.3 && p.t - time <= 1.2
      ctx.strokeStyle = approaching ? '#fde047' : 'rgba(253, 224, 71, 0.45)'
      ctx.lineWidth = approaching ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(px, topPad)
      ctx.lineTo(px, topPad + plotH)
      ctx.stroke()

      const tag = `${PIN_ICON[p.kind]} ${p.text}`
      ctx.font = approaching ? '700 11px system-ui, sans-serif' : '600 10px system-ui, sans-serif'
      const tw = Math.min(180, ctx.measureText(tag).width + 12)
      ctx.fillStyle = approaching ? 'rgba(234, 179, 8, 0.92)' : 'rgba(30, 41, 59, 0.88)'
      ctx.beginPath()
      ctx.roundRect(Math.min(cssW - tw - 4, px + 3), topPad + 4, tw, 18, 6)
      ctx.fill()
      ctx.fillStyle = approaching ? '#0f172a' : '#fef08a'
      ctx.fillText(tag.slice(0, 26), Math.min(cssW - tw - 4, px + 3) + 6, topPad + 16)
    }

    // 7. Glowing "NOW" Playhead Line
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(nowX, topPad)
    ctx.lineTo(nowX, topPad + plotH)
    ctx.stroke()

    // 8. Live Continuous Voice Ink Trail (hidden while singing in Ear-First Blind Mode; revealed on pause!)
    const hideLive = blindMode && frame?.midi !== null
    if (!hideLive && trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i]
        if (a.midi === null || b.midi === null) continue
        if (b.t - a.t > 0.25) continue
        const x1 = xOf(a.t), x2 = xOf(b.t)
        if (x2 < ladderW || x1 > cssW) continue
        const y1 = yOf(a.midi), y2 = yOf(b.midi)
        const absErr = b.errCents === null ? null : Math.abs(b.errCents)
        let color = '#34d399' // emerald green = locked!
        if (b.vibrato) color = '#2dd4bf' // shimmering teal = smooth vibrato bonus!
        else if (absErr !== null && absErr > 42) color = '#fb7185' // coral red
        else if (absErr !== null && absErr > 20) color = '#fbbf24' // amber nudge

        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(2.2, Math.min(6.5, 2.2 + b.level * 5))
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

        // Diagnostic micro-markers
        if (b.scoop && !a.scoop) {
          ctx.fillStyle = '#fde68a'
          ctx.font = '700 9px system-ui, sans-serif'
          ctx.fillText('↗scoop', x2 - 14, y2 + 13)
        } else if (b.sag && !a.sag) {
          ctx.fillStyle = '#fda4af'
          ctx.font = '700 9px system-ui, sans-serif'
          ctx.fillText('↘sag', x2 - 12, y2 + 13)
        }
      }
    }

    // 9. Live Cursor Orb on the Playhead
    if (!hideLive && frame && frame.midi !== null) {
      const m = frame.centerMidi ?? frame.midi
      const cy = Math.max(topPad + 4, Math.min(topPad + plotH - 4, yOf(m)))
      const isVib = frame.vibrato.active && frame.vibrato.quality === 'smooth'
      ctx.beginPath()
      ctx.arc(nowX, cy, isVib ? 8 : 6.5, 0, Math.PI * 2)
      ctx.fillStyle = isVib ? '#5eead4' : '#4ade80'
      ctx.shadowColor = isVib ? '#2dd4bf' : '#22c55e'
      ctx.shadowBlur = 12
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#0f172a'
      ctx.font = '700 10px system-ui, sans-serif'
      ctx.fillText(midiToNoteName(m), nowX + 10, cy + 3)
    } else if (hideLive) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.8)'
      ctx.font = '700 12px system-ui, sans-serif'
      ctx.fillText('🙈 Ear-First Mode — trail reveals when you pause!', ladderW + 16, topPad + 22)
    }

    // 10. Bottom synced lyric strip
    const activeLyric = [...lyrics].reverse().find(l => l.t !== null && l.t <= time + 0.15)
    ctx.fillStyle = '#090d14'
    ctx.fillRect(0, cssH - botPad, cssW, botPad)
    if (activeLyric) {
      ctx.fillStyle = '#f8fafc'
      ctx.font = '600 12px system-ui, sans-serif'
      ctx.fillText(activeLyric.text, ladderW + 10, cssH - 7)
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)'
      ctx.font = '500 11px system-ui, sans-serif'
      ctx.fillText(isHarmony ? 'Silver = Original Lead · Teal = YOUR Harmony Line' : 'Sing along — emerald green = dead-on · teal shimmer = smooth vibrato!', ladderW + 10, cssH - 7)
    }

    ctx.restore()
  }, [time, targets, ghostLead, frame, trail, lowMidi, highMidi, passaggioMidi, pins, chords, lyrics, blindMode, loopA, loopB, windowSec, height])

  return (
    <canvas
      ref={ref}
      className="sing-tracker-canvas"
      style={{ width: '100%', height: `${height}px`, display: 'block', borderRadius: 12 }}
      aria-label="Live vocal pitch and melody studio tracker"
    />
  )
}
