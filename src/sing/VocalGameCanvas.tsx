// Brandy Vocal Game Mode ("Arcade Stage"):
// - High-energy neon melody beams flying into the Hit Rail + Glowing Voice Comet
// - Samurai Rocker Brandy right behind the Hit Rail shredding green/cyan sonic waves on hits,
//   charging golden 5× FEVER aura on streaks & smooth vibrato, and taking red-bolt zaps on misses!
// - Supports Full Song Arcade Mode AND 5 dedicated 60-second Vocal Mini-Games:
//   🎯 Pitch Sniper · 🏄 Siren Surfer · ⚔️ Interval Jumper · 🤝 Harmony Duel · 💨 Dragon Breath
import { useEffect, useRef, useState } from 'react'
import { midiToNoteName, type MelodyNote, type VocalFrame } from './vocalEngine'
import { brandySingSprite, type BrandyMood } from '../art/samurai'

export type VocalMiniGameId = 'song' | 'sniper' | 'siren' | 'jumper' | 'harmony' | 'breath'

export interface VocalGameStats {
  score: number
  streak: number
  bestStreak: number
  mult: number
  hits: number
  misses: number
  vibratoBonus: number
  callout: string
}

interface Props {
  mode: VocalMiniGameId
  time: number
  targets: MelodyNote[]
  /** optional lead line for Harmony Duel */
  leadLine?: MelodyNote[]
  frame: VocalFrame | null
  lowMidi: number
  highMidi: number
  brandyOn: boolean
  stats: VocalGameStats
  height?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

const BRANDY_MOODS: BrandyMood[] = ['idle', 'shred', 'wrong', 'hurt']

/** Generate fun 45-second procedural note patterns tailored to the user's vocal range for the 5 Arcade Mini-Games. */
export function buildMiniGameNotes(mode: VocalMiniGameId, lowMidi: number, highMidi: number, passaggioMidi: number): { targets: MelodyNote[]; lead?: MelodyNote[]; duration: number } {
  const lo = Math.max(40, lowMidi + 2)
  const hi = Math.max(lo + 7, highMidi - 1)
  const mid = Math.round((lo + hi) / 2)
  const notes: MelodyNote[] = []
  let t = 1.2

  if (mode === 'sniper') {
    // Crisp isolated single targets — nail them dead center with zero scooping!
    const offsets = [0, 2, 4, 7, 5, 4, 2, 0, 4, 7, 9, 7, 5, 2, 0]
    for (const o of offsets) {
      const m = Math.min(hi, lo + o)
      notes.push({ t0: t, t1: t + 1.3, midi: m, lyric: midiToNoteName(m) })
      t += 2.0
    }
    return { targets: notes, duration: t + 1 }
  }

  if (mode === 'siren') {
    // Smooth roller-coaster waves right across the singer's Passaggio vocal break!
    const center = Math.max(lo + 3, Math.min(hi - 3, passaggioMidi))
    const wave = [-3, -2, -1, 0, 1, 2, 3, 2, 1, 0, -1, -2, -3, -1, 1, 3, 2, 0, -2, -3]
    for (const d of wave) {
      notes.push({ t0: t, t1: t + 0.65, midi: center + d })
      t += 0.65
    }
    return { targets: notes, duration: t + 1.5 }
  }

  if (mode === 'jumper') {
    // Clean 3rd, 5th & octave platform leaps!
    const leaps = [
      [0, 4], [0, 7], [2, 7], [0, 12], [4, 7], [2, 9], [0, 7], [4, 12],
    ]
    for (const [a, b] of leaps) {
      const ma = Math.min(hi - 2, lo + a)
      const mb = Math.min(hi, lo + b)
      notes.push({ t0: t, t1: t + 1.1, midi: ma, lyric: midiToNoteName(ma) })
      t += 1.4
      notes.push({ t0: t, t1: t + 1.3, midi: mb, lyric: midiToNoteName(mb) })
      t += 2.1
    }
    return { targets: notes, duration: t + 1.5 }
  }

  if (mode === 'harmony') {
    // Harmony Duel: Brandy sings the upper lead, YOU hold the parallel lower 3rd harmony!
    const lead: MelodyNote[] = []
    const steps = [
      [0, 4], [2, 5], [4, 7], [2, 5], [0, 4], [4, 7], [5, 9], [4, 7], [2, 5], [0, 4],
    ]
    for (const [hOff, lOff] of steps) {
      const hm = Math.min(hi - 4, lo + 2 + hOff)
      const lm = hm + (lOff - hOff)
      notes.push({ t0: t, t1: t + 2.2, midi: hm, lyric: 'YOUR HARM' })
      lead.push({ t0: t, t1: t + 2.2, midi: lm, lyric: 'LEAD' })
      t += 2.6
    }
    return { targets: notes, lead, duration: t + 1.5 }
  }

  // 'breath': Dragon Breath — long sustained flame beams to test steady support with zero pitch sag!
  const holds = [mid - 2, mid, mid + 2, mid + 3, mid]
  for (const m of holds) {
    notes.push({ t0: t, t1: t + 5.5, midi: m, lyric: `HOLD ${midiToNoteName(m)}` })
    t += 7.2
  }
  return { targets: notes, duration: t + 1 }
}

export function VocalGameCanvas({
  mode,
  time,
  targets,
  leadLine,
  frame,
  lowMidi,
  highMidi,
  brandyOn,
  stats,
  height = 310,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const imgsRef = useRef<Partial<Record<BrandyMood, HTMLImageElement>>>({})
  const [imgTick, setImgTick] = useState(0)
  const partsRef = useRef<Particle[]>([])
  const brandyStateRef = useRef<{ pose: BrandyMood; until: number; shake: number; flash: number }>({
    pose: 'idle',
    until: 0,
    shake: 0,
    flash: 0,
  })
  const lastHitCount = useRef(stats.hits)
  const lastMissCount = useRef(stats.misses)

  // Preload Samurai Rocker Brandy-at-the-Mic sprites once
  useEffect(() => {
    BRANDY_MOODS.forEach(k => {
      if (imgsRef.current[k]) return
      const img = new Image()
      img.onload = () => setImgTick(n => n + 1)
      img.src = brandySingSprite(k)
      imgsRef.current[k] = img
    })
  }, [])

  // React to new hits / misses with Brandy poses + stardust / red zap particles
  useEffect(() => {
    const now = performance.now()
    if (stats.hits > lastHitCount.current) {
      brandyStateRef.current = { pose: 'shred', until: now + 380, shake: 0, flash: 0 }
      for (let i = 0; i < 8; i++) {
        partsRef.current.push({
          x: 118,
          y: height * 0.45 + (Math.random() - 0.5) * 90,
          vx: -1.8 - Math.random() * 2.8,
          vy: (Math.random() - 0.5) * 3.2,
          life: 1,
          color: stats.mult >= 4 ? '#facc15' : '#4ade80',
          size: 3 + Math.random() * 3.5,
        })
      }
    }
    if (stats.misses > lastMissCount.current) {
      brandyStateRef.current = { pose: 'hurt', until: now + 450, shake: 9, flash: 1 }
      for (let i = 0; i < 10; i++) {
        partsRef.current.push({
          x: 78,
          y: height * 0.52 + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 4.5,
          vy: (Math.random() - 0.5) * 4.5,
          life: 1,
          color: '#fb7185',
          size: 3 + Math.random() * 4,
        })
      }
    }
    lastHitCount.current = stats.hits
    lastMissCount.current = stats.misses
  }, [stats.hits, stats.misses, stats.mult, height])

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cssW = cv.clientWidth || 680
    const cssH = height
    if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) {
      cv.width = Math.round(cssW * dpr)
      cv.height = Math.round(cssH * dpr)
    }
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.scale(dpr, dpr)

    const hitX = brandyOn ? Math.min(148, cssW * 0.24) : 72
    const topPad = 34
    const botPad = 28
    const plotH = Math.max(100, cssH - topPad - botPad)
    const windowSec = 5.0
    const pxPerSec = (cssW - hitX) / windowSec
    const xOf = (t: number) => hitX + (t - time) * pxPerSec

    const minM = Math.max(36, lowMidi - 2)
    const maxM = Math.min(86, Math.max(minM + 14, highMidi + 2))
    const yOf = (m: number) => topPad + ((maxM - m) / (maxM - minM)) * plotH

    // Deep neon arcade backdrop
    const grad = ctx.createLinearGradient(0, 0, cssW, cssH)
    grad.addColorStop(0, '#090918')
    grad.addColorStop(0.55, '#11112b')
    grad.addColorStop(1, '#08111f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, cssW, cssH)

    // Subtle glowing star lanes
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 6; i++) {
      const y = topPad + (plotH * i) / 6
      ctx.beginPath()
      ctx.moveTo(hitX, y)
      ctx.lineTo(cssW, y)
      ctx.stroke()
    }

    // Golden FEVER aura behind Brandy when multiplier >= 4
    const fever = stats.mult >= 4
    if (brandyOn && fever) {
      const pulse = 0.24 + 0.1 * Math.sin(performance.now() * 0.01)
      const rad = ctx.createRadialGradient(hitX * 0.48, cssH * 0.54, 8, hitX * 0.48, cssH * 0.54, 78)
      rad.addColorStop(0, `rgba(250, 204, 21, ${pulse + 0.2})`)
      rad.addColorStop(1, 'rgba(250, 204, 21, 0)')
      ctx.fillStyle = rad
      ctx.fillRect(0, 0, hitX + 20, cssH)
    }

    // Harmony Duel lead beams (violet upper beams from Brandy!)
    if (leadLine && leadLine.length) {
      for (const n of leadLine) {
        const x0 = xOf(n.t0), x1 = xOf(n.t1)
        if (x1 < hitX - 10 || x0 > cssW) continue
        const y = yOf(n.midi)
        ctx.fillStyle = 'rgba(192, 132, 252, 0.34)'
        ctx.strokeStyle = '#d8b4fe'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.roundRect(Math.max(hitX, x0), y - 7, Math.max(8, x1 - Math.max(hitX, x0)), 14, 7)
        ctx.fill()
        ctx.stroke()
      }
    }

    // Neon Target Melody Rails
    let activeTarget: MelodyNote | null = null
    for (const n of targets) {
      const x0 = xOf(n.t0), x1 = xOf(n.t1)
      if (x1 < hitX - 18 || x0 > cssW) continue
      const y = yOf(n.midi)
      const active = time >= n.t0 - 0.05 && time <= n.t1 + 0.05
      if (active) activeTarget = n
      const drawX = Math.max(hitX, x0)
      const drawW = Math.max(10, x1 - drawX)

      const beamColor = mode === 'breath'
        ? '#f97316'
        : mode === 'harmony'
          ? '#2dd4bf'
          : fever
            ? '#facc15'
            : '#38bdf8'

      ctx.shadowColor = beamColor
      ctx.shadowBlur = active ? 18 : 8
      ctx.fillStyle = active ? beamColor : `${beamColor}66`
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = active ? 2.2 : 1.2
      ctx.beginPath()
      ctx.roundRect(drawX, y - 10, drawW, 20, 10)
      ctx.fill()
      ctx.stroke()
      ctx.shadowBlur = 0

      if (n.lyric && drawW > 22) {
        ctx.fillStyle = '#0f172a'
        ctx.font = '800 10px system-ui, sans-serif'
        ctx.fillText(n.lyric.slice(0, 14), drawX + 8, y + 3.5)
      }
    }

    // Hit Rail laser bar
    ctx.strokeStyle = fever ? '#facc15' : '#38bdf8'
    ctx.lineWidth = 3
    ctx.shadowColor = fever ? '#facc15' : '#38bdf8'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(hitX, topPad - 6)
    ctx.lineTo(hitX, cssH - botPad + 6)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Live Voice Comet on Hit Rail + Duet Lightning in Harmony Duel
    if (frame && frame.midi !== null) {
      const m = frame.centerMidi ?? frame.midi
      const cy = Math.max(topPad, Math.min(cssH - botPad, yOf(m)))
      const onTarget = activeTarget !== null && Math.abs(m - activeTarget.midi) <= 0.42
      const isVib = frame.vibrato.active && frame.vibrato.quality === 'smooth'

      // Duet lightning between your comet and Brandy's lead beam!
      if (mode === 'harmony' && onTarget && leadLine) {
        const curLead = leadLine.find(l => time >= l.t0 && time <= l.t1)
        if (curLead) {
          const ly = yOf(curLead.midi)
          ctx.strokeStyle = '#5eead4'
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.moveTo(hitX, cy)
          ctx.lineTo(hitX - 6, (cy + ly) / 2)
          ctx.lineTo(hitX + 6, (cy + ly) / 2)
          ctx.lineTo(hitX, ly)
          ctx.stroke()
        }
      }

      // Comet glow
      ctx.beginPath()
      ctx.arc(hitX, cy, onTarget ? 12 : 9, 0, Math.PI * 2)
      ctx.fillStyle = isVib ? '#facc15' : onTarget ? '#4ade80' : '#f472b6'
      ctx.shadowColor = isVib ? '#facc15' : onTarget ? '#22c55e' : '#ec4899'
      ctx.shadowBlur = 20
      ctx.fill()
      ctx.shadowBlur = 0

      // Comet ring
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(hitX, cy, onTarget ? 14 : 10, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Samurai Rocker Brandy standing at her chrome microphone right behind the Hit Rail!
    if (brandyOn) {
      const bs = brandyStateRef.current
      const now = performance.now()
      const singingLive = frame !== null && frame.midi !== null
      const liveOnPitch = singingLive && activeTarget !== null && Math.abs((frame.centerMidi ?? frame.midi!) - activeTarget.midi) <= 0.45
      const pose: BrandyMood =
        now < bs.until
          ? bs.pose
          : liveOnPitch
            ? 'shred'
            : singingLive && activeTarget !== null
              ? 'wrong'
              : 'idle'
      if (bs.shake > 0.2) bs.shake *= 0.84
      else bs.shake = 0
      if (bs.flash > 0.05) bs.flash *= 0.85
      else bs.flash = 0

      const img = imgsRef.current[pose] ?? imgsRef.current.idle
      const spSize = Math.min(hitX - 6, cssH - botPad - 22)
      const sx = Math.max(2, hitX - spSize - 8) + (bs.shake ? (Math.random() - 0.5) * bs.shake : 0)
      const sy = cssH - botPad - spSize + 2
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, sx, sy, spSize, spSize)
      } else {
        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(sx + spSize / 2, sy + spSize / 2, spSize * 0.36, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#f8fafc'
        ctx.font = '700 22px system-ui, sans-serif'
        ctx.fillText('🎤', sx + spSize / 2 - 12, sy + spSize / 2 + 8)
      }

      if (bs.flash > 0.1) {
        ctx.fillStyle = `rgba(244, 63, 94, ${bs.flash * 0.38})`
        ctx.fillRect(0, 0, hitX, cssH)
      }
    }

    // Update & render stardust / zap particles
    const nextParts: Particle[] = []
    for (const p of partsRef.current) {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.045
      if (p.life > 0) {
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
        nextParts.push(p)
      }
    }
    ctx.globalAlpha = 1
    partsRef.current = nextParts

    // Arcade Callout pop
    if (stats.callout) {
      ctx.fillStyle = stats.callout.includes('OUCH') || stats.callout.includes('FLAT') || stats.callout.includes('SHARP')
        ? '#fda4af'
        : '#bef264'
      ctx.font = '900 15px system-ui, sans-serif'
      ctx.fillText(stats.callout, hitX + 18, topPad + 14)
    }

    // Bottom arcade status strip
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'
    ctx.fillRect(0, cssH - botPad, cssW, botPad)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '700 12px system-ui, sans-serif'
    const hint = activeTarget
      ? `Target: ${midiToNoteName(activeTarget.midi)}${activeTarget.lyric ? ` · "${activeTarget.lyric}"` : ''}`
      : 'Sing into the mic to ride the neon beams!'
    ctx.fillText(hint, hitX + 10, cssH - 9)

    ctx.restore()
  }, [mode, time, targets, leadLine, frame, lowMidi, highMidi, brandyOn, stats, height, imgTick])

  return (
    <canvas
      ref={ref}
      className="sing-game-canvas"
      style={{ width: '100%', height: `${height}px`, display: 'block', borderRadius: 14 }}
      aria-label="Brandy Vocal Game Mode arcade canvas"
    />
  )
}
