// Global always-on Mini Chord Grips preference & fast voicing cache.
// Synced across every chord screen (Chord Path, Chord Vibe Sets, Key Shifter, Strum Machine,
// Scales, Circle of Fifths, Floating Cards, Jam Famous Progressions) and persisted in localStorage
// under `kg:chordGrips` (auto-synced between Phone and Tablet via cloudSync).
import { useEffect, useState } from 'react'
import type { Instrument } from './instrument'
import {
  FLOW_VOICING_STYLES,
  voicingForFlowChord,
  type FlowVoicingResult,
  type FlowVoicingStyle,
} from './theory/flowVoicings'

export interface ChordGripsPref {
  show: boolean
  style: FlowVoicingStyle
}

const STORAGE_KEY = 'kg:chordGrips'
const VALID_STYLES = new Set<FlowVoicingStyle>(FLOW_VOICING_STYLES.map(s => s.id))

function parseStyle(raw: unknown): FlowVoicingStyle {
  if (typeof raw === 'string' && VALID_STYLES.has(raw as FlowVoicingStyle)) {
    return raw as FlowVoicingStyle
  }
  return 'open'
}

function readInitial(): ChordGripsPref {
  if (typeof localStorage === 'undefined') return { show: true, style: 'open' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ChordGripsPref> | null
      if (parsed && typeof parsed === 'object') {
        return {
          show: parsed.show !== false,
          style: parseStyle(parsed.style),
        }
      }
    }
    // Seamless one-time migration from earlier Chord Path local keys
    let show = true
    let style: FlowVoicingStyle = 'open'
    const oldShow = localStorage.getItem('kg:flowWheelDiagrams')
    if (oldShow != null) {
      const v = JSON.parse(oldShow)
      if (typeof v === 'boolean') show = v
    }
    const oldStyle = localStorage.getItem('kg:flowVoicingStyle')
    if (oldStyle != null) {
      style = parseStyle(JSON.parse(oldStyle))
    }
    return { show, style }
  } catch {
    return { show: true, style: 'open' }
  }
}

let state: ChordGripsPref = readInitial()
const listeners = new Set<() => void>()

function persistAndNotify() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* private mode / quota */
    }
  }
  listeners.forEach(fn => fn())
}

export function getChordGrips(): ChordGripsPref {
  return state
}

export function setShowChordGrips(show: boolean) {
  if (state.show === show) return
  state = { ...state, show }
  persistAndNotify()
}

export function toggleShowChordGrips() {
  setShowChordGrips(!state.show)
}

export function setChordGripStyle(style: FlowVoicingStyle) {
  const safe = parseStyle(style)
  if (state.style === safe) return
  state = { ...state, style: safe }
  persistAndNotify()
}

export function subscribeChordGrips(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useChordGrips() {
  const [pref, setPref] = useState<ChordGripsPref>(getChordGrips)
  useEffect(() => subscribeChordGrips(() => setPref(getChordGrips())), [])
  return {
    show: pref.show,
    style: pref.style,
    setShow: setShowChordGrips,
    toggleShow: toggleShowChordGrips,
    setStyle: setChordGripStyle,
  }
}

// Fast memo cache so rendering 12-24 mini chord grips on a screen is instant
const VOICING_CACHE = new Map<string, FlowVoicingResult | null>()
const MAX_CACHE = 800

export function cachedFlowVoicing(
  symbol: string,
  inst: Instrument,
  style: FlowVoicingStyle,
  anchorFret?: number,
): FlowVoicingResult | null {
  const clean = symbol.trim()
  if (!clean) return null
  const key = `${clean}|${inst.id}|${inst.midis.join(',')}|${style}|${anchorFret ?? ''}`
  if (VOICING_CACHE.has(key)) return VOICING_CACHE.get(key) ?? null
  const res = voicingForFlowChord(clean, inst, style, anchorFret)
  if (VOICING_CACHE.size >= MAX_CACHE) VOICING_CACHE.clear()
  VOICING_CACHE.set(key, res)
  return res
}
