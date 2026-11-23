// Game Mode's Pro Studio Note Highway (Play → Game):
//   - Left-to-right horizontal guitar fretboard stage (high e on top, matching tab)
//   - Deep obsidian studio backdrop, beat & bar gridlines, metallic wound/unwound strings with live pluck vibration
//   - Anodized glass note gems matching KGuitar's universal finger colors (Open=Pearl, 1=Blue, 2=Green, 3=Amber, 4=Red),
//     plus optional Rocksmith-style String Colors and Stealth Studio styles
//   - Precision Laser Hit Rail + tightening beat target rings + directional sparks on the exact string played
//   - Redesigned optional Timing Comet (guide ball with fading arc trail & impact ripple)
//   - Zero getComputedStyle() or O(N^2) allocations inside the 60 FPS loop
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePinch } from './Zoomable'
import {
  gemForNote,
  linkTechTargets,
  type GameColorStyle,
  type HighwayItem,
  type Section,
  type SectionResult,
} from '../play/game'

export interface GameFeedback {
  key: number
  text: string
  kind: 'perfect' | 'good' | 'early' | 'late' | 'miss' | 'wrong' | 'ok'
  /** exact string indices hit/missed so sparks & string vibration fire on the real string(s) */
  strings?: number[]
}

interface Props {
  items: HighwayItem[]
  sections: Section[]
  /** the beat each bar starts on (bar lines) */
  barBeats: number[]
  stringNames: string[]
  /** where the music is: In time = the clock; otherwise the cursor's beat */
  beatNow: () => number | null
  cursorBeat: number
  /** seconds per beat at the speed played (how fast the highway moves) */
  spb: number
  states: Uint8Array
  feedback: GameFeedback | null
  sectionStars: SectionResult[]
  onTap: (flat: number, note: number) => void
  /** start playing from this step (the "Start here" chip a tap shows) */
  onStartAt?: (flat: number) => void
  height?: number
  colorStyle?: GameColorStyle
  showComet?: boolean
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  at: number
  c: string
  size: number
}

interface Ripple {
  x: number
  y: number
  at: number
  c: string
}

const css = (el: Element, name: string, fb: string) => getComputedStyle(el).getPropertyValue(name).trim() || fb

export function GameHighway(p: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const props = useRef(p)
  props.current = p

  const techTargets = useMemo(() => linkTechTargets(p.items), [p.items])
  const techTargetsRef = useRef(techTargets)
  techTargetsRef.current = techTargets

  const shown = useRef<number | null>(null)
  const fx = useRef<{ key: number; at: number; text: string; kind: GameFeedback['kind']; y: number }[]>([])
  const sparks = useRef<Spark[]>([])
  const ripples = useRef<Ripple[]>([])
  const stringVib = useRef<number[]>([])
  const cometTrail = useRef<{ y: number; at: number }[]>([])
  const lastCometLand = useRef(-1)
  const lastFb = useRef(0)
  const theme = useRef({ ink: '#f1f5f9', ink3: '#94a3b8', accent: '#f43f5e', gold: '#fbbf24' })
  const lay = useRef({ W: 600, H: 260, hitX: 120, ppb: 120, top: 44, gap: 30 })

  // how many seconds of music fit between the hit line and the right edge, and the string spacing you chose
  const [secs, setSecs] = useState(() => { const v = Number(localStorage.getItem('kg:gameSecs')); return v >= 1.5 && v <= 8 ? v : 3.5 })
  const [gapPick, setGapPick] = useState(() => { const v = Number(localStorage.getItem('kg:gameGap')); return v >= 18 && v <= 160 ? v : 0 })
  const [widthPick, setWidthPick] = useState(() => { const v = Number(localStorage.getItem('kg:gameW')); return v >= 0.35 && v < 1 ? v : 0 })
  const view = useRef({ secs, gapPick })
  view.current = { secs, gapPick }
  const saveSecs = (v: number) => {
    const z = Math.round(Math.max(1.5, Math.min(8, v)) * 10) / 10
    setSecs(z)
    try { localStorage.setItem('kg:gameSecs', String(z)) } catch { /* full */ }
  }

  usePinch(wrap, () => 3.5 / view.current.secs, z => saveSecs(3.5 / z), { min: 3.5 / 8, max: 3.5 / 1.5 })
  const look = useRef({ off: 0, dragging: false, from: 0, off0: 0, moved: false, back: 0, fingers: 0 })
  const [looking, setLooking] = useState(false)
  const [startChip, setStartChip] = useState<{ flat: number; x: number; y: number; key: number } | null>(null)
  useEffect(() => { if (!startChip) return; const id = setTimeout(() => setStartChip(null), 3500); return () => clearTimeout(id) }, [startChip])
  const resize = useRef<() => void>(() => {})
  useEffect(() => { resize.current() }, [gapPick, widthPick])

  useEffect(() => {
    const c = cv.current, w = wrap.current
    if (!c || !w) return
    let raf = 0

    function refreshTheme() {
      theme.current = {
        ink: css(c!, '--ink', '#f1f5f9'),
        ink3: css(c!, '--ink-3', '#94a3b8'),
        accent: css(c!, '--accent', '#f43f5e'),
        gold: css(c!, '--gold', '#fbbf24'),
      }
    }

    resize.current = () => size()
    const ro = new ResizeObserver(() => size())
    ro.observe(w)
    const host = w.closest('.play-tab') as HTMLElement | null
    const watched = new Set<Element>()
    const watch = () => {
      if (!host) return
      for (const el of [host, ...host.children]) if (!watched.has(el)) { watched.add(el); ro.observe(el) }
    }
    watch()
    const mo = host ? new MutationObserver(() => { watch(); size() }) : null
    mo?.observe(host!, { childList: true })

    function fitGap(n0: number): number {
      const fallback = Math.max(24, Math.min(36, Math.round((window.innerHeight * 0.34) / Math.max(1, n0 - 1))))
      if (!host || getComputedStyle(host).overflowY === 'visible') return fallback
      const cs = getComputedStyle(host)
      const gapY = parseFloat(cs.rowGap || '0') || 0
      let sum = 0, n = 0
      for (const el of host.children) { const r = el.getBoundingClientRect(); if (r.height) { sum += r.height; n++ } }
      const pads = parseFloat(cs.paddingTop || '0') + parseFloat(cs.paddingBottom || '0')
      const others = sum + gapY * Math.max(0, n - 1) + pads - c!.offsetHeight
      const free = host.clientHeight - others - 4
      const most = host.closest('.play.stand') ? 58 : 48
      return Math.max(24, Math.min(most, Math.floor((free - 70) / Math.max(1, n0 - 1))))
    }

    function size() {
      refreshTheme()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const n0 = props.current.stringNames.length
      const gap0 = view.current.gapPick || fitGap(n0)
      const top = 46, bottom = 26
      const W = Math.max(280, w!.clientWidth), H = props.current.height ?? top + bottom + gap0 * Math.max(1, n0 - 1)
      if (Math.abs(W - lay.current.W) < 1 && Math.abs(H - lay.current.H) < 1 && c!.width === Math.round(W * dpr)) return
      c!.width = W * dpr; c!.height = H * dpr
      c!.style.width = `${W}px`; c!.style.height = `${H}px`
      c!.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
      lay.current = {
        W,
        H,
        hitX: Math.max(76, Math.round(W * 0.19)),
        ppb: 0,
        top,
        gap: (H - top - bottom) / Math.max(1, n0 - 1),
      }
    }
    size()

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      const P = props.current
      const g = c.getContext('2d')
      if (!g) return
      const L = lay.current
      const { W, H, hitX, top, gap } = L
      const nStr = P.stringNames.length
      const colorStyle: GameColorStyle = P.colorStyle ?? 'finger'
      const showComet = !!P.showComet
      const { ink, accent, gold } = theme.current

      const ppb = Math.max(30, ((W - hitX) * P.spb) / view.current.secs)
      L.ppb = ppb
      const live = P.beatNow()
      const target = live ?? P.cursorBeat
      shown.current = live !== null || shown.current === null ? target : shown.current + (target - shown.current) * 0.18
      const now = shown.current

      const lk = look.current
      if (!lk.dragging && lk.off !== 0 && (live !== null || t > lk.back)) {
        lk.off *= 0.86
        if (Math.abs(lk.off) < 0.02) { lk.off = 0; setLooking(false) }
      }
      const viewAt = now + lk.off
      const xOf = (beat: number) => hitX + (beat - viewAt) * ppb
      const yOf = (s: number) => top + (nStr - 1 - s) * gap
      const deckTop = top - 16
      const deckBot = top + gap * (nStr - 1) + 16

      // 1. Deep Obsidian Dark-Studio Stage Backdrop
      const bgGrad = g.createLinearGradient(0, 0, 0, H)
      bgGrad.addColorStop(0, '#0a0d16')
      bgGrad.addColorStop(0.5, '#111726')
      bgGrad.addColorStop(1, '#080b12')
      g.fillStyle = bgGrad
      g.fillRect(0, 0, W, H)

      // Subtle recessed fretboard deck panel
      g.fillStyle = 'rgba(255, 255, 255, 0.022)'
      g.fillRect(28, deckTop, W - 28, deckBot - deckTop)
      g.strokeStyle = 'rgba(255, 255, 255, 0.07)'
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(28, deckTop); g.lineTo(W, deckTop)
      g.moveTo(28, deckBot); g.lineTo(W, deckBot)
      g.stroke()

      // Subtle atmospheric bloom behind the hit rail
      const railGlow = g.createLinearGradient(hitX - 46, 0, hitX + 46, 0)
      railGlow.addColorStop(0, 'rgba(251, 191, 36, 0)')
      railGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.075)')
      railGlow.addColorStop(1, 'rgba(251, 191, 36, 0)')
      g.fillStyle = railGlow
      g.fillRect(hitX - 46, deckTop, 92, deckBot - deckTop)

      // 2. Beat & Bar Gridlines (so you visually feel the groove approaching!)
      const minBeat = Math.floor(viewAt - (hitX + 20) / ppb)
      const maxBeat = Math.ceil(viewAt + (W - hitX + 20) / ppb)
      g.strokeStyle = 'rgba(255, 255, 255, 0.045)'
      g.lineWidth = 1
      g.beginPath()
      for (let b = Math.max(0, minBeat); b <= maxBeat; b++) {
        const x = xOf(b)
        if (x < 28 || x > W) continue
        g.moveTo(x, deckTop); g.lineTo(x, deckBot)
      }
      g.stroke()

      // Stronger bar lines + crisp bar numbers along the bottom rail
      g.font = '600 10px "Barlow Semi Condensed", sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'alphabetic'
      for (let bi = 0; bi < P.barBeats.length; bi++) {
        const x = xOf(P.barBeats[bi])
        if (x < 28 || x > W + 2) continue
        g.strokeStyle = 'rgba(255, 255, 255, 0.16)'
        g.lineWidth = 1.25
        g.beginPath(); g.moveTo(x, deckTop); g.lineTo(x, deckBot); g.stroke()
        g.fillStyle = 'rgba(148, 163, 184, 0.55)'
        g.fillText(String(bi + 1), x, H - 5)
      }

      // Clean non-overlapping in-canvas section markers (never clamped to x=4 so they never pile up!)
      g.font = '700 11px "Barlow Semi Condensed", sans-serif'
      g.textAlign = 'left'
      for (let si = 0; si < P.sections.length; si++) {
        const first = P.items.find(it => it.section === si)
        if (!first) continue
        const x = xOf(first.beat)
        if (x < 34 || x > W - 125) continue
        g.fillStyle = 'rgba(226, 232, 240, 0.72)'
        g.fillText(P.sections[si].name.toUpperCase(), x + 4, 15)
      }

      // 3. Metallic Guitar Strings (warm bronze bass, brushed silver treble) + live pluck vibration!
      for (let s = 0; s < nStr; s++) {
        const y = yOf(s)
        const vibAt = stringVib.current[s] ?? 0
        const vibAge = vibAt ? (t - vibAt) / 280 : 1
        const vibrating = vibAge >= 0 && vibAge < 1
        const isBass = s < Math.ceil(nStr / 2)
        const baseW = 0.85 + (nStr - 1 - s) * 0.34

        if (vibrating) {
          const amp = (1 - vibAge) * 2.6 * Math.sin(vibAge * Math.PI * 10)
          g.strokeStyle = isBass ? 'rgba(251, 191, 36, 0.85)' : 'rgba(226, 232, 240, 0.92)'
          g.lineWidth = baseW + 0.9
          g.shadowColor = isBass ? '#f59e0b' : '#38bdf8'
          g.shadowBlur = 10 * (1 - vibAge)
          g.beginPath()
          g.moveTo(28, y)
          g.quadraticCurveTo((28 + W) * 0.35, y + amp, W, y)
          g.stroke()
          g.shadowBlur = 0
        } else {
          const sGrad = g.createLinearGradient(0, y - 1, 0, y + 1.5)
          if (isBass) {
            sGrad.addColorStop(0, 'rgba(217, 169, 114, 0.62)')
            sGrad.addColorStop(1, 'rgba(120, 88, 56, 0.42)')
          } else {
            sGrad.addColorStop(0, 'rgba(226, 232, 240, 0.55)')
            sGrad.addColorStop(1, 'rgba(100, 116, 139, 0.35)')
          }
          g.strokeStyle = sGrad
          g.lineWidth = baseW
          g.beginPath(); g.moveTo(28, y); g.lineTo(W, y); g.stroke()
        }
      }

      // 4. Precision Laser Hit Rail (behind notes so fret numbers stay razor sharp)
      g.save()
      g.strokeStyle = 'rgba(251, 191, 36, 0.92)'
      g.lineWidth = 2.5
      g.shadowColor = '#f59e0b'
      g.shadowBlur = 14
      g.beginPath(); g.moveTo(hitX, deckTop - 4); g.lineTo(hitX, deckBot + 4); g.stroke()
      g.shadowBlur = 0
      // Crisp bright inner core line
      g.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      g.lineWidth = 1
      g.beginPath(); g.moveTo(hitX, deckTop - 2); g.lineTo(hitX, deckBot + 2); g.stroke()
      // Subtle precision target notches on every string at the hit rail
      for (let s = 0; s < nStr; s++) {
        const y = yOf(s)
        g.fillStyle = 'rgba(251, 191, 36, 0.45)'
        g.beginPath(); g.arc(hitX, y, 2.4, 0, Math.PI * 2); g.fill()
      }
      g.restore()

      // 5. Note Gems, Sustain Tails, Technique Rails & Tightening Beat Rings
      const head = Math.max(22, Math.min(46, gap <= 32 ? gap * 0.92 : 30 + (gap - 32) * 0.32, Math.max(22, ppb * 0.44)))
      const targets = techTargetsRef.current

      for (let k = 0; k < P.items.length; k++) {
        const it = P.items[k]
        const x = xOf(it.beat)
        const tail = it.dur * ppb
        if (x + tail < -40 || x > W + 44) continue
        const state = P.states[it.flat] ?? 0
        const past = it.beat < now - 0.05
        const distBeats = it.beat - now

        // Approaching precision beat target rings on the hit rail (0..0.65 beats ahead)
        if (!showComet && distBeats > 0 && distBeats <= 0.65 && Math.abs(lk.off) < 0.05) {
          const pFrac = distBeats / 0.65 // 1 -> 0 as note arrives
          for (const n of it.notes) {
            const gem = gemForNote(n, colorStyle)
            const y = yOf(n.string)
            g.strokeStyle = gem.border
            g.globalAlpha = (1 - pFrac) * 0.65
            g.lineWidth = 1.8
            g.beginPath()
            g.arc(hitX, y, head * 0.45 + pFrac * (head * 0.55), 0, Math.PI * 2)
            g.stroke()
          }
          g.globalAlpha = 1
        }

        // Sleek frosted Chord Bracket & Pill for 3+ note strums (clamped safely below top edge!)
        if (it.chord && it.notes.length >= 3) {
          const ys = it.notes.map(n => yOf(n.string))
          const y0 = Math.min(...ys) - head / 2 - 4, y1 = Math.max(...ys) + head / 2 + 4
          g.save()
          g.globalAlpha = past ? 0.32 : 0.92
          g.fillStyle = 'rgba(251, 191, 36, 0.06)'
          roundRect(g, x - head / 2 - 5, y0, head + 10, y1 - y0, 8)
          g.fill()
          g.strokeStyle = 'rgba(251, 191, 36, 0.65)'
          g.lineWidth = 1.6
          g.stroke()
          // Chord name pill safely clamped inside top margin
          g.font = '700 11px "Barlow Condensed", sans-serif'
          const tw = Math.max(26, g.measureText(it.chord).width + 10)
          const pillY = Math.max(4, y0 - 18)
          g.fillStyle = 'rgba(15, 23, 42, 0.92)'
          roundRect(g, x - tw / 2, pillY, tw, 15, 4)
          g.fill()
          g.strokeStyle = 'rgba(251, 191, 36, 0.7)'
          g.lineWidth = 1
          g.stroke()
          g.fillStyle = '#fde68a'
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillText(it.chord, x, pillY + 8)
          g.restore()
        }

        for (const n of it.notes) {
          const y = yOf(n.string)
          const gem = gemForNote(n, colorStyle)

          // Glowing tapered sustain tail
          if (tail > head * 0.85) {
            const tailLen = Math.max(4, tail - 6)
            const tGrad = g.createLinearGradient(x, 0, x + tailLen, 0)
            tGrad.addColorStop(0, gem.border)
            tGrad.addColorStop(1, 'rgba(15, 23, 42, 0)')
            g.fillStyle = tGrad
            g.globalAlpha = past ? 0.16 : 0.38
            roundRect(g, x, y - head * 0.17, tailLen, head * 0.34, head * 0.17)
            g.fill()
            if (n.tech === '~') {
              g.strokeStyle = gem.border
              g.globalAlpha = past ? 0.3 : 0.85
              g.lineWidth = 1.8
              g.beginPath()
              for (let d = 0; d < tailLen - 8; d += 2.5) g.lineTo(x + head / 2 + d, y + Math.sin(d / 3.2) * 3.2)
              g.stroke()
            }
            g.globalAlpha = 1
          }

          // Slides, hammer-ons, pull-offs (O(1) precomputed target lookup!)
          if (n.tech === '/' || n.tech === '\\' || n.tech === 'h' || n.tech === 'p') {
            const targetBeat = targets.get(`${k}:${n.string}`)
            if (targetBeat !== undefined) {
              const x2 = xOf(targetBeat)
              g.strokeStyle = gem.border
              g.lineWidth = 1.8
              g.globalAlpha = past ? 0.25 : 0.85
              g.beginPath()
              if (n.tech === 'h' || n.tech === 'p') {
                g.moveTo(x + head / 2, y - head / 2)
                g.quadraticCurveTo((x + x2) / 2, y - head * 1.1, x2 - head / 2, y - head / 2)
                g.stroke()
                g.fillStyle = ink
                g.font = '700 10px "Barlow Semi Condensed", sans-serif'
                g.textAlign = 'center'
                g.textBaseline = 'alphabetic'
                g.fillText(n.tech.toUpperCase(), (x + x2) / 2, y - head * 0.86)
              } else {
                g.moveTo(x + head / 2, y + (n.tech === '/' ? 5 : -5))
                g.lineTo(x2 - head / 2, y + (n.tech === '/' ? -5 : 5))
                g.stroke()
              }
              g.globalAlpha = 1
            }
          }

          // Anodized Glass Note Gem
          const bx = x - head / 2, by = y - head / 2
          const rad = Math.max(5, Math.round(head * 0.24))
          const hot = !past && Math.abs(distBeats) <= 0.22
          g.save()
          g.globalAlpha = past && state === 0 ? 0.36 : 1

          if (hot) {
            g.shadowColor = gem.glow
            g.shadowBlur = 14
          }
          // Deep studio metallic body gradient
          const bodyGrad = g.createLinearGradient(0, by, 0, by + head)
          bodyGrad.addColorStop(0, gem.top)
          bodyGrad.addColorStop(1, gem.bot)
          g.fillStyle = bodyGrad
          roundRect(g, bx, by, head, head, rad)
          g.fill()
          g.shadowBlur = 0

          // Top subtle specular glass sheen
          const sheen = g.createLinearGradient(0, by + 1, 0, by + head * 0.48)
          sheen.addColorStop(0, 'rgba(255, 255, 255, 0.26)')
          sheen.addColorStop(1, 'rgba(255, 255, 255, 0)')
          g.fillStyle = sheen
          roundRect(g, bx + 1.5, by + 1.5, head - 3, head * 0.44, Math.max(3, rad - 1))
          g.fill()

          // Crisp LED edge rim
          g.strokeStyle = gem.border
          g.lineWidth = n.finger === 0 && n.tech !== 'x' ? 2.1 : 1.5
          roundRect(g, bx, by, head, head, rad)
          g.stroke()

          // Judged state halo (green perfect/good, amber early/late, red miss)
          if (state) {
            const stCol = state === 1 ? '#4ade80' : state === 2 ? '#fbbf24' : '#f87171'
            g.strokeStyle = stCol
            g.lineWidth = 2.4
            roundRect(g, bx - 2.5, by - 2.5, head + 5, head + 5, rad + 2)
            g.stroke()
          }

          // Razor-sharp fret number
          g.font = `700 ${Math.round(head * 0.58)}px "Barlow Condensed", sans-serif`
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillStyle = 'rgba(0, 0, 0, 0.45)'
          g.fillText(n.tech === 'x' ? '×' : String(n.fret), x, y + 1.5)
          g.fillStyle = gem.ink
          g.fillText(n.tech === 'x' ? '×' : String(n.fret), x, y + 0.5)

          // Bend arrow
          if (n.tech === 'b') {
            g.strokeStyle = gold
            g.lineWidth = 2.2
            g.beginPath()
            g.moveTo(x + head / 2 + 3, y)
            g.lineTo(x + head / 2 + 3, y - head * 0.85)
            g.lineTo(x + head / 2 - 1.5, y - head * 0.58)
            g.moveTo(x + head / 2 + 3, y - head * 0.85)
            g.lineTo(x + head / 2 + 7.5, y - head * 0.58)
            g.stroke()
          }
          g.restore()
        }
      }

      // 6. Left-Edge Dark Nut Gutter (always crisp on top of scrolling past notes!)
      const nutGrad = g.createLinearGradient(0, 0, 30, 0)
      nutGrad.addColorStop(0, '#070a11')
      nutGrad.addColorStop(0.85, 'rgba(10, 14, 24, 0.96)')
      nutGrad.addColorStop(1, 'rgba(10, 14, 24, 0)')
      g.fillStyle = nutGrad
      g.fillRect(0, 0, 30, H)
      g.strokeStyle = 'rgba(255, 255, 255, 0.14)'
      g.lineWidth = 1.5
      g.beginPath(); g.moveTo(27, deckTop); g.lineTo(27, deckBot); g.stroke()

      g.font = '700 11px "Barlow Semi Condensed", sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      for (let s = 0; s < nStr; s++) {
        const y = yOf(s)
        g.fillStyle = s < Math.ceil(nStr / 2) ? '#d9a972' : '#cbd5e1'
        g.fillText(P.stringNames[s] ?? '', 13, y)
      }

      // 7. Optional Redesigned Guide Ball → "Timing Comet" (sleek plasma orb + fading arc trail + impact ripple)
      if (showComet) {
        const R = Math.max(7, Math.min(11, head * 0.3))
        const landY = (k: number) => Math.min(...P.items[k].notes.map(n => yOf(n.string))) - head / 2 - R + 1
        let prev = -1, next = -1
        for (let k = 0; k < P.items.length; k++) {
          if (P.items[k].beat <= now + 1e-6) prev = k
          else { next = k; break }
        }
        let ballY: number | null = null
        if (live === null) {
          const k = P.items.findIndex(it => it.beat >= now - 0.02)
          if (k >= 0 && Math.abs(xOf(P.items[k].beat) - hitX) < 40) {
            ballY = landY(k) - Math.abs(Math.sin(t / 320)) * 3
          }
        } else if (next >= 0) {
          if (prev >= 0 && prev !== lastCometLand.current) {
            lastCometLand.current = prev
            ripples.current.push({ x: hitX, y: landY(prev) + R, at: t, c: '#fde68a' })
          }
          const b0 = prev >= 0 ? P.items[prev].beat : Math.min(now, P.items[next].beat - 1), b1 = P.items[next].beat
          const y0 = prev >= 0 ? landY(prev) : landY(next), y1 = landY(next)
          const marks = [b0]
          if (b1 - b0 > 1.25) for (let q = Math.floor(b0) + 1; q < b1 - 0.5; q++) marks.push(q)
          marks.push(b1)
          let j = 0
          while (j < marks.length - 2 && now >= marks[j + 1]) j++
          const s0 = marks[j], s1 = marks[j + 1]
          const f = Math.max(0, Math.min(1, (now - s0) / Math.max(0.04, s1 - s0)))
          const ya = j === 0 ? y0 : y1, yb = y1
          const hop = Math.max(8, Math.min(gap * 2.2, 18 + (s1 - s0) * P.spb * 62, Math.min(ya, yb) - R - 4))
          ballY = ya + (yb - ya) * f - 4 * f * (1 - f) * hop
        } else if (prev >= 0 && now - P.items[prev].beat < 0.6) {
          ballY = landY(prev)
        }

        if (ballY !== null && Math.abs(lk.off) < 0.05) {
          cometTrail.current.push({ y: ballY, at: t })
          cometTrail.current = cometTrail.current.filter(pt => t - pt.at < 170).slice(-14)
          // Fading luminous arc trail
          for (let ti = 0; ti < cometTrail.current.length; ti++) {
            const pt = cometTrail.current[ti]
            const frac = (ti + 1) / cometTrail.current.length
            g.fillStyle = 'rgba(251, 191, 36, 0.35)'
            g.globalAlpha = frac * 0.55
            g.beginPath(); g.arc(hitX, pt.y, R * (0.35 + frac * 0.55), 0, Math.PI * 2); g.fill()
          }
          g.globalAlpha = 1
          // Crisp plasma orb core + warm halo
          const orbGrad = g.createRadialGradient(hitX, ballY, 1, hitX, ballY, R * 1.45)
          orbGrad.addColorStop(0, '#ffffff')
          orbGrad.addColorStop(0.42, '#fde68a')
          orbGrad.addColorStop(0.8, 'rgba(245, 158, 11, 0.45)')
          orbGrad.addColorStop(1, 'rgba(245, 158, 11, 0)')
          g.fillStyle = orbGrad
          g.beginPath(); g.arc(hitX, ballY, R * 1.45, 0, Math.PI * 2); g.fill()
        }
      } else {
        cometTrail.current = []
      }

      // 8. Directional Sparks, Expanding Hit Ripples & Sleek Feedback Pill on the ACTUAL String(s) Hit!
      const fb = P.feedback
      if (fb && fb.key !== lastFb.current) {
        lastFb.current = fb.key
        const hitStrs = fb.strings?.length
          ? fb.strings
          : (() => {
              const near = P.items.find(it => Math.abs(it.beat - now) < 0.45)
              return near ? near.notes.map(n => n.string) : [Math.floor(nStr / 2)]
            })()
        const avgY = hitStrs.reduce((acc, s) => acc + yOf(s), 0) / hitStrs.length
        fx.current.push({ key: fb.key, at: t, text: fb.text, kind: fb.kind, y: Math.max(26, Math.min(H - 22, avgY - 12)) })

        if (fb.kind === 'perfect' || fb.kind === 'good' || fb.kind === 'ok') {
          const sparkCol = fb.kind === 'perfect' ? '#fde68a' : '#4ade80'
          for (const s of hitStrs) {
            stringVib.current[s] = t
            const sy = yOf(s)
            ripples.current.push({ x: hitX, y: sy, at: t, c: sparkCol })
            for (let i = 0; i < 7; i++) {
              const ang = (Math.PI * 2 * i) / 7 + (t % 1) * 0.8
              const spd = 45 + (i % 3) * 26
              sparks.current.push({ x: hitX, y: sy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, at: t, c: sparkCol, size: 2.1 + (i % 2) })
            }
          }
        }
      }

      ripples.current = ripples.current.filter(rp => t - rp.at < 360)
      for (const rp of ripples.current) {
        const age = (t - rp.at) / 360
        g.strokeStyle = rp.c
        g.globalAlpha = (1 - age) * 0.8
        g.lineWidth = 2 * (1 - age) + 0.5
        g.beginPath(); g.arc(rp.x, rp.y, head * 0.42 + age * (head * 0.9), 0, Math.PI * 2); g.stroke()
      }

      sparks.current = sparks.current.filter(sp => t - sp.at < 380)
      for (const sp of sparks.current) {
        const age = (t - sp.at) / 380
        const px = sp.x + sp.vx * age
        const py = sp.y + sp.vy * age
        g.globalAlpha = (1 - age) * 0.92
        g.fillStyle = sp.c
        g.beginPath(); g.arc(px, py, sp.size * (1 - age * 0.5), 0, Math.PI * 2); g.fill()
      }
      g.globalAlpha = 1

      fx.current = fx.current.filter(e => t - e.at < 720).slice(-2)
      for (const e of fx.current) {
        const a = 1 - (t - e.at) / 720
        const col = e.kind === 'perfect' ? gold : e.kind === 'good' || e.kind === 'ok' ? '#4ade80' : e.kind === 'miss' || e.kind === 'wrong' ? '#f87171' : '#fbbf24'
        const fy = e.y - (1 - a) * 16
        g.save()
        g.globalAlpha = Math.min(1, a * 1.25)
        g.font = '800 14px "Barlow Condensed", sans-serif'
        const tw = g.measureText(e.text).width + 14
        g.fillStyle = 'rgba(9, 12, 20, 0.84)'
        roundRect(g, hitX + 12, fy - 11, tw, 20, 5)
        g.fill()
        g.strokeStyle = col
        g.lineWidth = 1.2
        g.stroke()
        g.fillStyle = col
        g.textAlign = 'left'
        g.textBaseline = 'middle'
        g.fillText(e.text, hitX + 19, fy)
        g.restore()
      }
      g.globalAlpha = 1
      g.textBaseline = 'alphabetic'
    }

    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo?.disconnect() }
  }, [])

  // one finger: a tap plays the note under it; a sideways drag looks ahead (or back)
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const lk = look.current
    lk.fingers++
    if (lk.fingers > 1) { if (lk.dragging) { lk.dragging = false; lk.off = lk.off0; lk.moved = true } return }
    lk.dragging = true; lk.moved = false; lk.from = e.clientX; lk.off0 = lk.off
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const lk = look.current
    if (!lk.dragging) return
    const dx = e.clientX - lk.from
    if (!lk.moved && Math.abs(dx) < 8) return
    if (!lk.moved) { lk.moved = true; setLooking(true) }
    lk.off = Math.max(-64, Math.min(64, lk.off0 - dx / Math.max(1, lay.current.ppb)))
  }
  const up = (e: React.PointerEvent) => {
    const lk = look.current
    lk.fingers = Math.max(0, lk.fingers - 1)
    if (!lk.dragging) return
    lk.dragging = false
    lk.back = performance.now() + 1500
    if (!lk.moved) tap(e)
  }
  const backToNow = () => { look.current.off = 0; look.current.back = 0; setLooking(false) }
  const fitBox = () => {
    setGapPick(0); setWidthPick(0)
    try { localStorage.removeItem('kg:gameGap'); localStorage.removeItem('kg:gameW') } catch { /* private */ }
  }
  const sizeDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    const w = wrap.current, room = w?.parentElement?.clientWidth || 0
    const x0 = e.clientX, y0 = e.clientY, g0 = lay.current.gap, n = Math.max(1, props.current.stringNames.length - 1)
    const w0 = w?.offsetWidth || room
    let gap = g0, frac = widthPick, sideways = false
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0
      if (Math.abs(dy) > 4 || !sideways) { gap = Math.round(Math.max(18, Math.min(160, g0 + dy / n))); setGapPick(gap) }
      if (room > 0 && (sideways || Math.abs(dx) > 10)) {
        sideways = true
        const f = Math.max(0.35, Math.min(1, (w0 + 2 * dx) / room))
        frac = f >= 0.985 ? 0 : Math.round(f * 1000) / 1000
        setWidthPick(frac)
      }
    }
    const done = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', done); removeEventListener('pointercancel', done)
      try { localStorage.setItem('kg:gameGap', String(gap)); if (frac) localStorage.setItem('kg:gameW', String(frac)); else localStorage.removeItem('kg:gameW') } catch { /* full */ }
    }
    addEventListener('pointermove', mv); addEventListener('pointerup', done); addEventListener('pointercancel', done)
  }

  // Dynamic hit-box tap (scales with head size in full screen!)
  const tap = (e: React.PointerEvent) => {
    const P = props.current, L = lay.current, c = cv.current
    if (!c) return
    const r = c.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const now = (shown.current ?? P.cursorBeat) + look.current.off
    const nStr = P.stringNames.length
    const hitR = Math.max(34, L.gap * 0.9)
    let best: { flat: number; note: number; d: number } | null = null
    for (const it of P.items) {
      const nx = L.hitX + (it.beat - now) * L.ppb
      if (Math.abs(nx - x) > hitR) continue
      it.notes.forEach((n, ni) => {
        const ny = L.top + (nStr - 1 - n.string) * L.gap
        const d = Math.hypot(nx - x, ny - y)
        if (d < hitR && (!best || d < best.d)) best = { flat: it.flat, note: ni, d }
      })
    }
    if (best) P.onTap((best as { flat: number }).flat, (best as { note: number }).note)
    if (P.onStartAt) {
      const beat = now + (x - L.hitX) / Math.max(1, L.ppb)
      const at = best ? (best as { flat: number }).flat : (P.items.find(it => it.beat >= beat - 0.25) ?? P.items[P.items.length - 1])?.flat
      if (at !== undefined) setStartChip({ flat: at, x: Math.max(70, Math.min(r.width - 70, x)), y: Math.max(26, Math.min(r.height - 26, y)), key: Date.now() })
    }
  }

  return (
    <div ref={wrap} className="game-highway" data-testid="game-highway" style={widthPick ? { width: `${widthPick * 100}%` } : undefined}>
      <canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img"
        aria-label="Note highway: notes slide to the precision rail on the left; play each one as it reaches the rail. Drag sideways to look ahead, pinch to zoom." />
      <div className="gh-zoom" role="group" aria-label="Highway zoom">
        {looking && <button className="gh-btn now" onClick={backToNow} data-testid="game-now">⟲ Now</button>}
        <button className="gh-btn" onClick={() => saveSecs(secs * 1.25)} aria-label="Zoom out: see further ahead" data-testid="game-zoom-out">−</button>
        <span className="gh-secs tabular" title="Seconds of music on screen">{secs.toFixed(1)} s</span>
        <button className="gh-btn" onClick={() => saveSecs(secs / 1.25)} aria-label="Zoom in: bigger notes" data-testid="game-zoom-in">+</button>
      </div>
      {startChip && props.current.onStartAt && (
        <button key={startChip.key} className="gh-start" style={{ left: startChip.x, top: startChip.y }} data-testid="game-start-here"
          onClick={() => { const f = startChip.flat; setStartChip(null); backToNow(); props.current.onStartAt?.(f) }}>
          ▶ Start here
        </button>
      )}
      <div className="gh-size" onPointerDown={sizeDrag} onDoubleClick={fitBox} role="separator" aria-label="Drag down or up for taller or shorter strings, sideways for wider or narrower; double tap to fit the box again" title="Drag to resize (up/down and sideways) · double tap: fit the box" data-testid="game-size"><span aria-hidden>⇕</span><span className="gh-grip" aria-hidden>◢</span></div>
    </div>
  )
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  g.beginPath()
  g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr)
  g.closePath()
}
