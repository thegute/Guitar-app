// Game Mode's note highway (Play → Game): the strings run across the screen (high e on top, like the tab), the notes
// slide in from the right to the hit line, coloured by the finger that plays them (1 blue, 2 green, 3 orange, 4 red,
// open white), with their length, slides / hammer-ons / pull-offs / bends / vibrato / dead notes drawn on them and chord
// boxes for strums. A big ball bounces from note to note on the hit line (Yousician-style) so you see the timing coming;
// it follows In time's clock or Hear it's playhead. Drawn on a canvas each frame.
// Zoom: pinch sideways (or − / +) shows fewer or more seconds ahead (1.5–8 s, kg:gameSecs). Size: drag the handle under it for
// taller or shorter strings (kg:gameGap). Look ahead: drag it sideways with one finger; let go and it glides back to now
// (straight away while the music moves, after a moment when stopped). A tap without dragging plays the note and shows
// "▶ Start here": tap that to play from there (a second tap on purpose, so a stray touch mid-song never moves you).
import { useEffect, useRef, useState } from 'react'
import { usePinch } from './Zoomable'
import { FINGER_COLORS, type HighwayItem, type Section, type SectionResult } from '../play/game'

export interface GameFeedback { key: number; text: string; kind: 'perfect' | 'good' | 'early' | 'late' | 'miss' | 'wrong' | 'ok' }

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
}

const css = (el: Element, name: string, fb: string) => getComputedStyle(el).getPropertyValue(name).trim() || fb

export function GameHighway(p: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const props = useRef(p)
  props.current = p
  const shown = useRef<number | null>(null)
  const fx = useRef<{ key: number; at: number; text: string; kind: GameFeedback['kind'] }[]>([])
  const bursts = useRef<{ x: number; y: number; at: number; c: string }[]>([])
  const lastFb = useRef(0)
  const lay = useRef({ W: 600, H: 260, hitX: 120, ppb: 120, top: 34, gap: 30 })
  // how many seconds of music fit between the hit line and the right edge, and the string spacing you chose
  const [secs, setSecs] = useState(() => { const v = Number(localStorage.getItem('kg:gameSecs')); return v >= 1.5 && v <= 8 ? v : 3.5 })
  const [gapPick, setGapPick] = useState(() => { const v = Number(localStorage.getItem('kg:gameGap')); return v >= 18 && v <= 160 ? v : 0 })
  // how wide (a share of the space it has; 0 = all of it): drag the corner sideways. Remembered (kg:gameW).
  const [widthPick, setWidthPick] = useState(() => { const v = Number(localStorage.getItem('kg:gameW')); return v >= 0.35 && v < 1 ? v : 0 })
  const view = useRef({ secs, gapPick })
  view.current = { secs, gapPick }
  const saveSecs = (v: number) => { const z = Math.round(Math.max(1.5, Math.min(8, v)) * 10) / 10; setSecs(z); try { localStorage.setItem('kg:gameSecs', String(z)) } catch { /* full */ } }
  // pinch: zoom 1 = 3.5 s; spreading the fingers shows fewer seconds (bigger notes)
  usePinch(wrap, () => 3.5 / view.current.secs, z => saveSecs(3.5 / z), { min: 3.5 / 8, max: 3.5 / 1.5 })
  // looking ahead (or back): beats the view is moved from now; it glides back when you let go
  const look = useRef({ off: 0, dragging: false, from: 0, off0: 0, moved: false, back: 0, fingers: 0 })
  const [looking, setLooking] = useState(false)
  // a tap shows "Start here" at that spot for a few seconds (one more tap jumps there: an accidental touch while playing
  // never moves you)
  const [startChip, setStartChip] = useState<{ flat: number; x: number; y: number; key: number } | null>(null)
  useEffect(() => { if (!startChip) return; const id = setTimeout(() => setStartChip(null), 3500); return () => clearTimeout(id) }, [startChip])
  const resize = useRef<() => void>(() => {})
  useEffect(() => { resize.current() }, [gapPick, widthPick])

  useEffect(() => {
    const c = cv.current, w = wrap.current
    if (!c || !w) return
    let raf = 0
    resize.current = () => size()
    const ro = new ResizeObserver(() => size())
    ro.observe(w)
    // the box it sits in (Play's tab box has its own height, set by the bars between boxes): fit what's left of it
    const host = w.closest('.play-tab') as HTMLElement | null
    const watched = new Set<Element>()
    const watch = () => { if (!host) return; for (const el of [host, ...host.children]) if (!watched.has(el)) { watched.add(el); ro.observe(el) } }
    watch()
    const mo = host ? new MutationObserver(() => { watch(); size() }) : null
    mo?.observe(host!, { childList: true })
    function fitGap(n0: number): number {
      const fallback = Math.max(22, Math.min(34, Math.round((window.innerHeight * 0.32) / Math.max(1, n0 - 1))))
      if (!host || getComputedStyle(host).overflowY === 'visible') return fallback
      // how tall everything else in the box is: the heights of its parts (not where they sit: in full screen the control
      // bar is pushed to the bottom, which would count the free space as taken)
      const cs = getComputedStyle(host)
      const gapY = parseFloat(cs.rowGap || '0') || 0
      let sum = 0, n = 0
      for (const el of host.children) { const r = el.getBoundingClientRect(); if (r.height) { sum += r.height; n++ } }
      const pads = parseFloat(cs.paddingTop || '0') + parseFloat(cs.paddingBottom || '0')
      const others = sum + gapY * Math.max(0, n - 1) + pads - c!.offsetHeight
      const free = host.clientHeight - others - 4
      // fit the box, up to a comfortable spacing: bigger is your call (drag the corner), never stretched for you
      const most = host.closest('.play.stand') ? 56 : 48
      return Math.max(22, Math.min(most, Math.floor((free - 74) / Math.max(1, n0 - 1))))
    }
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const n0 = props.current.stringNames.length
      // the strings' spacing: your pick (⇕), else whatever fits the box (22–96 px)
      const gap0 = view.current.gapPick || fitGap(n0)
      const W = Math.max(280, w!.clientWidth), H = props.current.height ?? 54 + 20 + gap0 * Math.max(1, n0 - 1)
      if (Math.abs(W - lay.current.W) < 1 && Math.abs(H - lay.current.H) < 1 && c!.width === Math.round(W * dpr)) return
      c!.width = W * dpr; c!.height = H * dpr
      c!.style.width = `${W}px`; c!.style.height = `${H}px`
      c!.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = props.current.stringNames.length
      const top = 54, bottom = 20
      lay.current = { W, H, hitX: Math.round(W * 0.2), ppb: 0, top, gap: (H - top - bottom) / Math.max(1, n - 1) }
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
      // the chosen seconds of music between the hit line and the right edge
      const ppb = Math.max(30, ((W - hitX) * P.spb) / view.current.secs)
      L.ppb = ppb
      const live = P.beatNow()
      const target = live ?? P.cursorBeat
      // the cursor glides to the next note; the clock is followed exactly
      shown.current = live !== null || shown.current === null ? target : shown.current + (target - shown.current) * 0.18
      const now = shown.current
      // looking ahead: the view moves, the music doesn't; let go and it glides back to now
      const lk = look.current
      if (!lk.dragging && lk.off !== 0 && (live !== null || t > lk.back)) { lk.off *= 0.86; if (Math.abs(lk.off) < 0.02) { lk.off = 0; setLooking(false) } }
      const viewAt = now + lk.off
      const xOf = (beat: number) => hitX + (beat - viewAt) * ppb
      const yOf = (s: number) => top + (nStr - 1 - s) * gap
      const ink = css(c, '--ink', '#eee'), ink3 = css(c, '--ink-3', '#999'), accent = css(c, '--accent', '#f0a'), gold = css(c, '--gold', '#fc3')
      g.clearRect(0, 0, W, H)
      // panel
      g.fillStyle = css(c, '--surface', '#1a1030'); g.globalAlpha = 0.92; g.fillRect(0, 0, W, H); g.globalAlpha = 1
      // bar lines and sections
      g.lineWidth = 1
      for (const b of P.barBeats) { const x = xOf(b); if (x < -2 || x > W + 2) continue; g.strokeStyle = ink3; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(x, top - 8); g.lineTo(x, top + gap * (nStr - 1) + 8); g.stroke() }
      g.globalAlpha = 1
      // strings (thicker toward the low ones) and their names
      for (let s = 0; s < nStr; s++) {
        const y = yOf(s)
        g.strokeStyle = ink3; g.globalAlpha = 0.55; g.lineWidth = 0.8 + (nStr - 1 - s) * 0.3
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke()
        g.globalAlpha = 1; g.fillStyle = ink3; g.font = '600 12px "Barlow Semi Condensed", sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'
        g.fillText(P.stringNames[s] ?? '', 4, y)
      }
      // section names with their stars (from this run)
      g.font = '600 12px "Barlow Semi Condensed", sans-serif'; g.textBaseline = 'alphabetic'
      for (let si = 0; si < P.sections.length; si++) {
        const sec = P.sections[si]
        const first = P.items.find(it => it.section === si)
        if (!first) continue
        const x = xOf(first.beat) - 10
        if (x > W || x < -160) continue
        const st = P.sectionStars[si]
        g.fillStyle = ink; g.fillText(sec.name, Math.max(4, x), 14)
        if (st) { g.fillStyle = st.gold ? gold : accent; g.fillText('★'.repeat(st.stars) + '☆'.repeat(3 - st.stars), Math.max(4, x) + g.measureText(sec.name).width + 6, 14) }
      }
      // notes
      // note size follows the string spacing (bigger in full screen), but stays narrow enough that quick notes don't overlap
      const head = Math.max(20, Math.min(48, gap <= 32 ? gap * 0.95 : 30 + (gap - 32) * 0.3, Math.max(20, ppb * 0.42)))
      for (let k = 0; k < P.items.length; k++) {
        const it = P.items[k]
        const x = xOf(it.beat)
        const tail = it.dur * ppb
        if (x + tail < -40 || x > W + 40) continue
        const state = P.states[it.flat] ?? 0
        const past = it.beat < now - 0.05
        // chord box for strums
        if (it.chord && it.notes.length >= 3) {
          const ys = it.notes.map(n => yOf(n.string))
          const y0 = Math.min(...ys) - head / 2 - 4, y1 = Math.max(...ys) + head / 2 + 4
          g.strokeStyle = accent; g.lineWidth = 2; g.globalAlpha = past ? 0.35 : 0.9
          roundRect(g, x - head / 2 - 5, y0, head + 10, y1 - y0, 8); g.stroke()
          g.fillStyle = accent; g.font = '700 13px "Barlow Condensed", sans-serif'; g.textAlign = 'center'
          g.fillText(it.chord, x, y0 - 5)
          g.globalAlpha = 1
        }
        for (const n of it.notes) {
          const y = yOf(n.string)
          const col = n.tech === 'x' ? '#8a8a8a' : FINGER_COLORS[Math.max(0, Math.min(4, n.finger))]
          // sustain tail
          if (tail > head * 0.8) {
            g.fillStyle = col; g.globalAlpha = past ? 0.15 : 0.32
            roundRect(g, x, y - head * 0.22, tail - 4, head * 0.44, head * 0.22); g.fill()
            if (n.tech === '~') { g.strokeStyle = col; g.globalAlpha = 0.9; g.lineWidth = 2; g.beginPath(); for (let d = 0; d < tail - 8; d += 2) g.lineTo(x + head / 2 + d, y + Math.sin(d / 3) * 3); g.stroke() }
            g.globalAlpha = 1
          }
          // slides, hammer-ons, pull-offs: to this string's next note
          if (n.tech === '/' || n.tech === '\\' || n.tech === 'h' || n.tech === 'p') {
            const nx = P.items.slice(k + 1).find(o => o.notes.some(m => m.string === n.string))
            if (nx) {
              const x2 = xOf(nx.beat)
              g.strokeStyle = ink; g.lineWidth = 2; g.globalAlpha = past ? 0.3 : 0.85; g.beginPath()
              if (n.tech === 'h' || n.tech === 'p') { g.moveTo(x + head / 2, y - head / 2); g.quadraticCurveTo((x + x2) / 2, y - head * 1.15, x2 - head / 2, y - head / 2); g.stroke(); g.fillStyle = ink; g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.fillText(n.tech.toUpperCase(), (x + x2) / 2, y - head * 0.95) }
              else { g.moveTo(x + head / 2, y + (n.tech === '/' ? 6 : -6)); g.lineTo(x2 - head / 2, y + (n.tech === '/' ? -6 : 6)); g.stroke() }
              g.globalAlpha = 1
            }
          }
          // the note head: the fret, in the finger's colour
          g.globalAlpha = past && state === 0 ? 0.45 : 1
          if (n.finger === 0 && n.tech !== 'x') { g.fillStyle = 'rgba(0,0,0,.55)'; roundRect(g, x - head / 2, y - head / 2, head, head, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke() }
          else { g.fillStyle = col; roundRect(g, x - head / 2, y - head / 2, head, head, 7); g.fill() }
          if (state) { g.strokeStyle = state === 1 ? '#4ade80' : state === 2 ? '#facc15' : '#f87171'; g.lineWidth = 3; roundRect(g, x - head / 2 - 3, y - head / 2 - 3, head + 6, head + 6, 9); g.stroke() }
          g.font = `700 ${Math.round(head * 0.6)}px "Barlow Condensed", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
          g.fillStyle = n.finger === 3 ? '#1a1030' : '#fff'
          g.fillText(n.tech === 'x' ? '×' : String(n.fret), x, y + 1)
          if (n.tech === 'b') { g.strokeStyle = gold; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + head / 2 + 3, y); g.lineTo(x + head / 2 + 3, y - head * 0.9); g.lineTo(x + head / 2 - 2, y - head * 0.6); g.moveTo(x + head / 2 + 3, y - head * 0.9); g.lineTo(x + head / 2 + 8, y - head * 0.6); g.stroke() }
          g.globalAlpha = 1; g.textBaseline = 'alphabetic'
        }
      }
      // the hit line
      g.strokeStyle = accent; g.lineWidth = 3; g.shadowColor = accent; g.shadowBlur = 12
      g.beginPath(); g.moveTo(hitX, top - 16); g.lineTo(hitX, top + gap * (nStr - 1) + 14); g.stroke()
      g.shadowBlur = 0
      // THE BALL (like Yousician): it stays on the hit line while the notes slide under it, arcs up between notes and lands ON
      // the next note's head (the top note of a chord) exactly as it reaches the line, so it never leaves the screen. Long gaps
      // become one hop per beat; a short gap is a small hop, a long one a big hop. Stopped (Wait for me / paused), it sits on
      // the note it's waiting for.
      const R = Math.max(9, Math.min(15, head * 0.42))
      const landY = (k: number) => Math.min(...P.items[k].notes.map(n => yOf(n.string))) - head / 2 - R + 1
      let prev = -1, next = -1
      for (let k = 0; k < P.items.length; k++) { if (P.items[k].beat <= now + 1e-6) prev = k; else { next = k; break } }
      let ballY: number | null = null, squash = 0
      if (live === null) {
        // waiting: on the note at the line (or the next one)
        const k = P.items.findIndex(it => it.beat >= now - 0.02)
        if (k >= 0 && Math.abs(xOf(P.items[k].beat) - hitX) < 40) { ballY = landY(k); squash = 0.12 + 0.06 * Math.sin(t / 260) }
      } else if (next >= 0) {
        const b0 = prev >= 0 ? P.items[prev].beat : Math.min(now, P.items[next].beat - 1), b1 = P.items[next].beat
        const y0 = prev >= 0 ? landY(prev) : landY(next), y1 = landY(next)
        // whole beats inside a long gap get their own hops
        const marks = [b0]
        if (b1 - b0 > 1.25) for (let q = Math.floor(b0) + 1; q < b1 - 0.5; q++) marks.push(q)
        marks.push(b1)
        let j = 0
        while (j < marks.length - 2 && now >= marks[j + 1]) j++
        const s0 = marks[j], s1 = marks[j + 1]
        const f = Math.max(0, Math.min(1, (now - s0) / Math.max(0.04, s1 - s0)))
        const ya = j === 0 ? y0 : y1, yb = y1
        // never above the top of the highway
        const hop = Math.max(6, Math.min(gap * 2.6, 18 + (s1 - s0) * P.spb * 70, Math.min(ya, yb) - R - 3))
        ballY = ya + (yb - ya) * f - 4 * f * (1 - f) * hop
        // a little squash just after it lands
        const since = (now - s0) * P.spb
        squash = since < 0.09 ? 0.3 * (1 - since / 0.09) : 0
      } else if (prev >= 0 && now - P.items[prev].beat < 0.6) {
        ballY = landY(prev)
      }
      // (while you look ahead the ball waits at now, off this view)
      if (ballY !== null && Math.abs(lk.off) < 0.05) {
        // its shadow on the line below it, then the ball with a soft glow
        g.globalAlpha = 0.25; g.fillStyle = '#000'
        g.beginPath(); g.ellipse(hitX, top + gap * (nStr - 1) + 8, R * 0.9, R * 0.28, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1
        g.fillStyle = gold; g.shadowColor = gold; g.shadowBlur = 16
        g.beginPath(); g.ellipse(hitX, ballY + R * squash * 0.5, R * (1 + squash * 0.5), R * (1 - squash * 0.5), 0, 0, Math.PI * 2); g.fill()
        g.shadowBlur = 0
        g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(hitX - R * 0.32, ballY - R * 0.35, R * 0.28, 0, Math.PI * 2); g.fill()
      }
      // feedback words and sparks at the hit line
      const fb = P.feedback
      if (fb && fb.key !== lastFb.current) {
        lastFb.current = fb.key
        fx.current.push({ key: fb.key, at: t, text: fb.text, kind: fb.kind })
        if (fb.kind === 'perfect' || fb.kind === 'good' || fb.kind === 'ok') for (let i = 0; i < 10; i++) bursts.current.push({ x: hitX, y: top + gap * (nStr - 1) / 2, at: t + i * 7, c: fb.kind === 'perfect' ? gold : '#4ade80' })
      }
      fx.current = fx.current.filter(e => t - e.at < 800).slice(-3)
      for (const e of fx.current) {
        const a = 1 - (t - e.at) / 800
        g.globalAlpha = a; g.textAlign = 'left'
        g.font = '800 22px "Barlow Condensed", sans-serif'
        g.fillStyle = e.kind === 'perfect' ? gold : e.kind === 'good' || e.kind === 'ok' ? '#4ade80' : e.kind === 'miss' || e.kind === 'wrong' ? '#f87171' : '#facc15'
        g.fillText(e.text, hitX + 14, top + gap * 1.5 - (1 - a) * 18)
        g.globalAlpha = 1
      }
      bursts.current = bursts.current.filter(b => t - b.at < 450)
      for (const b of bursts.current) {
        const age = (t - b.at) / 450
        if (age < 0) continue
        const ang = (b.at % 360) * (Math.PI / 180) * 7
        g.globalAlpha = 1 - age; g.fillStyle = b.c
        g.beginPath(); g.arc(b.x + Math.cos(ang) * age * 50, b.y + Math.sin(ang) * age * 50, 3.2, 0, Math.PI * 2); g.fill()
      }
      g.globalAlpha = 1
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo?.disconnect() }
  }, [])

  // one finger: a tap plays the note under it; a sideways drag looks ahead (or back)
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const lk = look.current
    lk.fingers++
    // a second finger means a pinch (zoom): no look-ahead drag, and the view goes back where it was
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
    // drag left = further ahead; up to 64 beats either way
    lk.off = Math.max(-64, Math.min(64, lk.off0 - dx / Math.max(1, lay.current.ppb)))
  }
  const up = (e: React.PointerEvent) => {
    const lk = look.current
    lk.fingers = Math.max(0, lk.fingers - 1)
    if (!lk.dragging) return
    lk.dragging = false
    // stopped: stay a moment so you can read it, then glide back
    lk.back = performance.now() + 1500
    if (!lk.moved) tap(e)
  }
  const backToNow = () => { look.current.off = 0; look.current.back = 0; setLooking(false) }
  // double tap the handle: back to fitting the box (full width, string spacing to fit)
  const fitBox = () => {
    setGapPick(0); setWidthPick(0)
    try { localStorage.removeItem('kg:gameGap'); localStorage.removeItem('kg:gameW') } catch { /* private */ }
  }
  // the handle under the highway: drag down for taller strings, sideways for wider or narrower (it stays centred, so
  // the edge follows your finger)
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

  // tap a note: hear it (Play for me)
  const tap = (e: React.PointerEvent) => {
    const P = props.current, L = lay.current, c = cv.current
    if (!c) return
    const r = c.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const now = (shown.current ?? P.cursorBeat) + look.current.off
    const nStr = P.stringNames.length
    let best: { flat: number; note: number; d: number } | null = null
    for (const it of P.items) {
      const nx = L.hitX + (it.beat - now) * L.ppb
      if (Math.abs(nx - x) > 30) continue
      it.notes.forEach((n, ni) => { const ny = L.top + (nStr - 1 - n.string) * L.gap; const d = Math.hypot(nx - x, ny - y); if (d < 34 && (!best || d < best.d)) best = { flat: it.flat, note: ni, d } })
    }
    if (best) P.onTap((best as { flat: number }).flat, (best as { note: number }).note)
    // where to start: the note tapped, or the first one at or after the tapped spot
    if (P.onStartAt) {
      const beat = now + (x - L.hitX) / Math.max(1, L.ppb)
      const at = best ? (best as { flat: number }).flat : (P.items.find(it => it.beat >= beat - 0.25) ?? P.items[P.items.length - 1])?.flat
      if (at !== undefined) setStartChip({ flat: at, x: Math.max(70, Math.min(r.width - 70, x)), y: Math.max(26, Math.min(r.height - 26, y)), key: Date.now() })
    }
  }
  return (
    <div ref={wrap} className="game-highway" data-testid="game-highway" style={widthPick ? { width: `${widthPick * 100}%` } : undefined}>
      <canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img"
        aria-label="Note highway: notes slide to the line on the left; play each one as it reaches the line. Drag sideways to look ahead, pinch to zoom." />
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
