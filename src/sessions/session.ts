// Practice sessions: a few timed steps ("5 min warm-up, 10 min triads, 10 min jam over a beat in G"). Starting a
// step opens the right screen already set up; a bar at the top counts down and moves you on. Made by the
// assistant, the built-in planner, Zero to Hero's daily routine, or by you.
import type { Target } from '../search/types'
import { STARTERS, pushBeat, loadBeat, setBars, patternLayer, PATTERNS } from '../studio/beat'
import { launch } from '../search/launch'

export interface Step {
  title: string
  minutes: number
  target: Target
  /** what to do in this step, one or two sentences */
  tip?: string
  /** the beat maker: start from this style first */
  beat?: { starter?: string; bpm?: number; key?: string; minor?: boolean; patterns?: string[] }
}
export interface Session { id: string; title: string; steps: Step[] }
export interface Running { session: Session; index: number; /** ms left in this step */ left: number; paused: boolean; at: number }

const KEY = 'kg:session'
const SAVED = 'kg:sessions'
const listeners = new Set<() => void>()
let state: Running | null = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') as Running | null } catch { return null } })()
const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full */ } listeners.forEach(f => f()) }
export const running = () => state
export function onSession(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }

/** Open a step's screen, set up (and a beat if it asks for one). */
export function openStep(s: Step) {
  if (s.beat) {
    const base = s.beat.starter ? STARTERS.find(x => x.id === s.beat!.starter)?.make() ?? loadBeat() : loadBeat()
    let b = { ...base, ...(s.beat.bpm ? { bpm: s.beat.bpm } : {}), ...(s.beat.key ? { key: s.beat.key } : {}), ...(s.beat.minor !== undefined ? { minor: s.beat.minor } : {}) }
    if (b.bars < 2) b = setBars(b, 2)
    for (const id of s.beat.patterns ?? []) { const p = PATTERNS.find(x => x.id === id); if (p && !(b.layers ?? []).some(l => l.label === p.label)) b = { ...b, layers: [...(b.layers ?? []), patternLayer(p, b.bars)] } }
    pushBeat(b)
  }
  launch(s.target)
}
export function startSession(session: Session, at = 0) {
  state = { session, index: at, left: session.steps[at].minutes * 60000, paused: false, at: Date.now() }
  emit()
  openStep(session.steps[at])
}
/** Time passes only while the session isn't paused. */
export function tick() {
  if (!state || state.paused) return
  const now = Date.now()
  state = { ...state, left: Math.max(0, state.left - (now - state.at)), at: now }
  emit()
}
export function pause(p: boolean) { if (!state) return; tick(); state = { ...state, paused: p, at: Date.now() }; emit() }
export function next() {
  if (!state) return
  const i = state.index + 1
  if (i >= state.session.steps.length) { finish(); return }
  state = { ...state, index: i, left: state.session.steps[i].minutes * 60000, paused: false, at: Date.now() }
  emit()
  openStep(state.session.steps[i])
}
export function prev() {
  if (!state || state.index === 0) return
  const i = state.index - 1
  state = { ...state, index: i, left: state.session.steps[i].minutes * 60000, paused: false, at: Date.now() }
  emit()
  openStep(state.session.steps[i])
}
export function addTime(min: number) { if (!state) return; tick(); state = { ...state, left: state.left + min * 60000 }; emit() }
export function finish() { state = null; emit() }

export function savedSessions(): Session[] { try { return JSON.parse(localStorage.getItem(SAVED) ?? '[]') as Session[] } catch { return [] } }
export function saveSession(s: Session) { try { localStorage.setItem(SAVED, JSON.stringify([...savedSessions().filter(x => x.id !== s.id), s].slice(-30))) } catch { /* storage full */ } }
export function deleteSession(id: string) { try { localStorage.setItem(SAVED, JSON.stringify(savedSessions().filter(x => x.id !== id))) } catch { /* noop */ } }
export const minutesOf = (s: Session) => s.steps.reduce((a, x) => a + x.minutes, 0)
