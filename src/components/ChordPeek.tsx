// Chord peek: press a chord name (on the tab or in the Scales & chords strip) and a big chord box pops up next to
// your finger. It stays while you hold, and fades 1.5 seconds after you let go. The tab, the loop and the listening
// carry on underneath: nothing is stopped or moved. Big enough to read from a music stand (~1.5 in on the Fold's
// inner screen), small enough not to hide much of the tab.
import { useEffect, useRef, useState, type RefObject } from 'react'
import { ChordDiagram } from './ChordDiagram'
import { shapesFor } from '../theory/shapes'
import type { Voicing } from '../theory/chords'
import type { Instrument } from '../instrument'

const TYPES: [RegExp, string][] = [
  [/^(maj7|M7|Maj7|Δ7?)$/, 'maj7'], [/^(m7b5|ø7?|-7b5|min7b5)$/, 'm7b5'], [/^(dim7|°7|o7)$/, 'dim7'], [/^(dim|°|o)$/, 'dim'],
  [/^(aug|\+)$/, 'aug'], [/^(m|min|-)$/, 'm'], [/^(m7|min7|-7)$/, 'm7'], [/^(mmaj7|m\(maj7\)|mM7)$/, 'mmaj7'], [/^(sus)$/, 'sus4'],
  [/^(maj|M)?$/, ''],
]
/** "F#m7/A" → { root: 'F#', type: 'm7' } in the shape engine's words ('' = major, 'm' = minor). */
export function readChordName(name: string): { root: string; type: string } | null {
  const m = /^([A-G][#b]?)(.*)$/.exec(name.split('/')[0].trim())
  if (!m) return null
  const rest = m[2].replace(/[()]/g, '')
  for (const [re, t] of TYPES) if (re.test(rest)) return { root: m[1], type: t }
  return { root: m[1], type: rest }
}

/** The shape to show: the one the tab actually uses (3+ notes on that step), else the usual shape for the name. */
export function peekVoicing(name: string, inst: Instrument, tabFrets: number[] | null): { voicing: Voicing; fromTab: boolean } | null {
  if (tabFrets && tabFrets.filter(f => f >= 0).length >= 3) {
    const played = tabFrets.filter(f => f > 0)
    return { voicing: { frets: tabFrets, fingers: tabFrets.map(() => 0), barres: [], baseFret: played.length ? Math.min(...played) : 1, midi: [] }, fromTab: true }
  }
  const c = readChordName(name)
  if (!c) return null
  const v = shapesFor(c, inst)[0]
  return v ? { voicing: v, fromTab: false } : null
}

interface Shown { name: string; voicing: Voicing; fromTab: boolean; x: number; y: number; below: boolean }

/**
 * Watch `root` for presses on anything with data-chord (and data-flat = the tab step it starts on).
 * `frets(flat)` gives the tab's frets at that step. Returns the bubble to render.
 */
export function useChordPeek(root: RefObject<HTMLElement | null>, inst: Instrument, frets: (flat: number) => number[] | null, on = true) {
  const [shown, setShown] = useState<Shown | null>(null)
  const [fading, setFading] = useState(false)
  const timer = useRef(0)
  const holding = useRef(false)
  const args = useRef({ inst, frets })
  args.current = { inst, frets }

  useEffect(() => {
    const el = root.current
    if (!el) return
    const release = () => {
      if (!holding.current) return
      holding.current = false
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => { setFading(true); timer.current = window.setTimeout(() => { setShown(null); setFading(false) }, 250) }, 1500)
    }
    const down = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.('[data-chord]') as HTMLElement | SVGElement | null
      if (!t || !el.contains(t)) return
      const name = t.getAttribute('data-chord') ?? ''
      const flat = Number(t.getAttribute('data-flat') ?? -1)
      const pv = peekVoicing(name, args.current.inst, flat >= 0 ? args.current.frets(flat) : null)
      if (!pv) return
      const r = t.getBoundingClientRect()
      const W = window.innerWidth, H = window.innerHeight
      const big = W >= 700
      const bw = big ? 236 : 172, bh = big ? 290 : 216
      const below = r.top - bh - 10 < 8
      const x = Math.max(8, Math.min(W - bw - 8, r.left + r.width / 2 - bw / 2))
      const y = below ? Math.min(H - bh - 8, r.bottom + 10) : r.top - bh - 10
      clearTimeout(timer.current)
      holding.current = true
      setFading(false)
      setShown({ name, ...pv, x, y, below })
    }
    const noMenu = (e: Event) => { if ((e.target as Element | null)?.closest?.('[data-chord]')) e.preventDefault() }
    el.addEventListener('pointerdown', down)
    el.addEventListener('contextmenu', noMenu)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('contextmenu', noMenu)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      clearTimeout(timer.current)
    }
  }, [root, on])

  const big = typeof window !== 'undefined' && window.innerWidth >= 700
  const bubble = shown ? (
    <div className={`chord-peek${fading ? ' fading' : ''}${shown.below ? ' below' : ''}`} style={{ left: shown.x, top: shown.y }} role="status" aria-live="polite" data-testid="chord-peek">
      <ChordDiagram name={shown.name} voicing={shown.voicing} size={big ? 1.75 : 1.28} />
      <span className="chord-peek-note">{shown.fromTab ? 'as in the tab' : 'a common shape'}</span>
    </div>
  ) : null
  return { bubble, shown: !!shown }
}
