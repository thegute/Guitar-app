// Game Mode's note highway (Play → Game): the strings run across the screen (high e on top, like the tab), the notes
// slide in from the right to the hit line, coloured by the finger that plays them (1 blue, 2 green, 3 orange, 4 red,
// open white), with their length, slides / hammer-ons / pull-offs / bends / vibrato / dead notes drawn on them and chord
// boxes for strums. A ball bounces from note to note so you see the timing coming. Drawn on a canvas each frame.
import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    const c = cv.current, w = wrap.current
    if (!c || !w) return
    let raf = 0
    const ro = new ResizeObserver(() => size())
    ro.observe(w)
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const n0 = props.current.stringNames.length
      // a string every 22–34 px (whatever fits a third of the screen's height)
      const gap0 = Math.max(22, Math.min(34, Math.round((window.innerHeight * 0.32) / Math.max(1, n0 - 1))))
      const W = Math.max(280, w!.clientWidth), H = props.current.height ?? 40 + 22 + gap0 * Math.max(1, n0 - 1)
      c!.width = W * dpr; c!.height = H * dpr
      c!.style.width = `${W}px`; c!.style.height = `${H}px`
      c!.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = props.current.stringNames.length
      const top = 40, bottom = 22
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
      // ~3.5 s of music between the hit line and the right edge
      const ppb = Math.max(60, ((W - hitX) * P.spb) / 3.5)
      L.ppb = ppb
      const live = P.beatNow()
      const target = live ?? P.cursorBeat
      // the cursor glides to the next note; the clock is followed exactly
      shown.current = live !== null || shown.current === null ? target : shown.current + (target - shown.current) * 0.18
      const now = shown.current
      const xOf = (beat: number) => hitX + (beat - now) * ppb
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
      const head = Math.min(30, Math.max(20, gap * 0.95))
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
      // the bouncing ball: lands on the hit line exactly as each note arrives
      let prev = -1, next = -1
      for (let k = 0; k < P.items.length; k++) { if (P.items[k].beat <= now + 1e-6) prev = k; else { next = k; break } }
      if (next >= 0) {
        const b0 = prev >= 0 ? P.items[prev].beat : now - 1, b1 = P.items[next].beat
        const f = Math.max(0, Math.min(1, (now - b0) / Math.max(0.05, b1 - b0)))
        const lane = Math.min(...P.items[next].notes.map(n => yOf(n.string))) - head / 2 - 6
        const hgt = Math.min(60, 22 + (b1 - b0) * 18)
        const y = lane - 4 * f * (1 - f) * hgt
        g.fillStyle = gold; g.shadowColor = gold; g.shadowBlur = 10
        g.beginPath(); g.arc(hitX, y, 7, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0
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
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  // tap a note: hear it (Play for me)
  const tap = (e: React.PointerEvent) => {
    const P = props.current, L = lay.current, c = cv.current
    if (!c) return
    const r = c.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const now = shown.current ?? P.cursorBeat
    const nStr = P.stringNames.length
    let best: { flat: number; note: number; d: number } | null = null
    for (const it of P.items) {
      const nx = L.hitX + (it.beat - now) * L.ppb
      if (Math.abs(nx - x) > 30) continue
      it.notes.forEach((n, ni) => { const ny = L.top + (nStr - 1 - n.string) * L.gap; const d = Math.hypot(nx - x, ny - y); if (d < 34 && (!best || d < best.d)) best = { flat: it.flat, note: ni, d } })
    }
    if (best) P.onTap((best as { flat: number }).flat, (best as { note: number }).note)
  }
  return (
    <div ref={wrap} className="game-highway" data-testid="game-highway">
      <canvas ref={cv} onPointerDown={tap} role="img" aria-label="Note highway: notes slide to the line on the left; play each one as it reaches the line" />
    </div>
  )
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  g.beginPath()
  g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr); g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr)
  g.closePath()
}
