// The coach on the Play screen. It never talks while you play: it comes up after a pass with a bar under 80%, when you
// stop after missing the same bar three times, or when you ask (the Coach button, "coach me"). It shows the built-in
// coach's advice at once and, with a Gemini key, lets the AI listen to those few seconds and say it better.
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { FlatStep } from '../tabs/model'
import type { HandGroup } from '../play/handShape'
import type { NoteListener } from '../tabs/follow'
import { aiSettings } from '../assistant/providers'
import { speak, stopSpeaking } from '../assistant/speak'
import { barFacts, explain, findTrouble, MissStreak, type PassData, type Trouble } from './trouble'
import { coachPrefs, ruleAdvice, type Advice } from './advice'
import { aiAdvice, type CoachContext } from './listen'
import { activeLens } from './lens'
import { habitLine, loadMemory, noteClean, noteTrouble, saveMemory } from './memory'

export interface CoachState {
  advice: Advice
  trouble: Trouble
  /** the AI is listening to the clip */
  listening: boolean
  /** why it came up */
  why: 'pass' | 'stuck' | 'asked'
}

export interface CoachArgs {
  flat: FlatStep[]
  groups: HandGroup[]
  states: MutableRefObject<Uint8Array | number[]>
  mode: 'wait' | 'time'
  speed: number
  tuning: number[]
  title: string
  inst: string
  listener: MutableRefObject<NoteListener | null>
  /** In time: each played step's timing error */
  errOf: () => Map<number, number> | undefined
  /** changes whenever a note's state does (PlayScreen's version counter) */
  version: number
  /** a short loop is being drilled: the AI isn't asked by itself */
  drilling: boolean
  /** the song (or the song a drill was cut from), for the coach's memory */
  song?: { id: string; title: string; inst?: string }
}

export function useCoach(a: CoachArgs) {
  const [state, setState] = useState<CoachState | null>(null)
  /** "play it through once first" */
  const [note, setNote] = useState<string | null>(null)
  const args = useRef(a)
  args.current = a
  const stamps = useRef(new Map<number, number>())
  const seen = useRef<number[]>([])
  const streak = useRef(new MissStreak(3))
  const abort = useRef<AbortController | null>(null)
  const idle = useRef(0)

  // when each note was played (audio clock), so the clip can be cut around a bar
  useEffect(() => {
    const st = a.states.current, t = a.listener.current?.heardUntil
    if (t === undefined) { seen.current = Array.from(st); return }
    for (let i = 0; i < st.length; i++) if (st[i] !== (seen.current[i] ?? 0)) { if (st[i]) stamps.current.set(i, t); else stamps.current.delete(i) }
    seen.current = Array.from(st)
  }, [a.version, a.states, a.listener])
  useEffect(() => { stamps.current.clear(); seen.current = []; streak.current.clear(); setState(null); setNote(null) }, [a.flat])
  useEffect(() => () => { abort.current?.abort(); clearTimeout(idle.current); stopSpeaking() }, [])

  const pass = (range?: { from: number; to: number }): PassData => {
    const A = args.current
    return { states: A.states.current, flat: A.flat, groups: A.groups, mode: A.mode, errOf: A.errOf(), range }
  }
  const clipFor = (t: Trouble) => {
    const A = args.current, l = A.listener.current
    if (!l) return null
    let lo = Infinity, hi = -Infinity
    A.flat.forEach((f, i) => { if (f.bar >= t.loop.from && f.bar <= t.loop.to) { const s = stamps.current.get(i); if (s !== undefined) { lo = Math.min(lo, s); hi = Math.max(hi, s) } } })
    if (!isFinite(lo)) return null
    // a second before the first note to a second after the last, eight seconds at most (the end is what matters)
    const to = hi + 1, from = Math.max(lo - 1, to - 8)
    return l.clip(from, to)
  }

  const show = useCallback((t: Trouble, why: CoachState['why'], wantAi: boolean) => {
    const A = args.current, prefs = coachPrefs()
    const rules = ruleAdvice(t, { tuning: A.tuning, mode: A.mode, speed: A.speed })
    abort.current?.abort()
    setNote(null)
    // remembered across sessions (a drill's own bars aren't the song's)
    if (A.song) saveMemory(noteTrouble(loadMemory(), t, A.song))
    const say = (adv: Advice) => { if (prefs.voice) void speak(adv.spoken, { gemini: true }) }
    const clip = wantAi && aiSettings().keys.gemini && (typeof navigator === 'undefined' || navigator.onLine !== false) ? clipFor(t) : null
    if (!clip) { setState({ advice: rules, trouble: t, listening: false, why }); say(rules); return }
    const ac = new AbortController()
    abort.current = ac
    setState({ advice: rules, trouble: t, listening: true, why })
    const ctx: CoachContext = { title: A.title, inst: A.inst, tuning: A.tuning, mode: A.mode, speed: A.speed, flat: A.flat, groups: A.groups, lens: activeLens()?.listen, habits: habitLine(loadMemory()) }
    aiAdvice(t, ctx, rules, clip, ac.signal)
      .then(adv => { if (ac.signal.aborted) return; setState(s => (s && s.trouble === t ? { ...s, advice: adv, listening: false } : s)); say(adv) })
      .catch(() => { if (ac.signal.aborted) return; setState(s => (s && s.trouble === t ? { ...s, listening: false } : s)); say(rules) })
  }, [])

  /** a whole pass (or a loop's pass) just ended */
  const afterPass = useCallback((range?: { from: number; to: number }) => {
    const prefs = coachPrefs()
    if (!prefs.auto) return
    const t = findTrouble(pass(range))
    if (!t) { setState(null); return }
    streak.current.clear()
    show(t, 'pass', prefs.ai === 'auto' && !args.current.drilling)
  }, [show])

  const cur = useRef({ bar: -1, dirty: false })
  /** Wait for me: a wrong note at this flat step. After three on one bar, the coach waits for you to stop. */
  const missed = useCallback((flatIdx: number) => {
    const bar = args.current.flat[flatIdx]?.bar
    if (bar === undefined) return
    if (cur.current.bar !== bar) cur.current = { bar, dirty: true }
    else cur.current.dirty = true
    streak.current.miss(bar)
  }, [])
  /** Wait for me: this flat step was hit. Getting through a bar with no wrong note clears its count. */
  const hit = useCallback((flatIdx: number) => {
    const bar = args.current.flat[flatIdx]?.bar
    if (bar === undefined || bar === cur.current.bar) return
    if (!cur.current.dirty && cur.current.bar >= 0) streak.current.clear(cur.current.bar)
    cur.current = { bar, dirty: false }
  }, [])
  /** any note was just heard: you're still playing (and talking over you is rude) */
  const heard = useCallback(() => {
    clearTimeout(idle.current)
    if (streak.current.stuck < 0 || !coachPrefs().auto) return
    idle.current = window.setTimeout(() => {
      const bar = streak.current.stuck
      if (bar < 0) return
      streak.current.clear()
      const p = pass()
      const f = barFacts(p).find(b => b.bar === bar)
      const t = f ? explain(p, f) : null
      if (t) show(t, 'stuck', coachPrefs().ai === 'auto' && !args.current.drilling)
    }, 2500)
  }, [show])

  /** you asked: the Coach button, "coach me", "why is this bar hard?" (a bar of your choice, or the worst so far) */
  const ask = useCallback((bar?: number) => {
    const p = pass()
    const facts = barFacts(p)
    const f = bar !== undefined ? facts.find(b => b.bar === bar) : [...facts].filter(b => b.pct < 100).sort((x, y) => x.pct - y.pct || x.bar - y.bar)[0]
    const t = f ? explain(p, f) : null
    if (!t) {
      setState(null)
      const msg = facts.length ? 'That was clean. Nothing to fix: try it a little faster.' : 'Play it through once and I\'ll tell you what to work on.'
      setNote(msg)
      if (coachPrefs().voice) void speak(msg, { gemini: true })
      return
    }
    show(t, 'asked', true)
  }, [show])

  /** a clean pass over these bars at this speed (a loop pass or a whole run): the memory's spots there improve */
  const clean = useCallback((bars: { from: number; to: number }, speed: number) => {
    const A = args.current
    if (!A.song) return
    const m = loadMemory(), n = noteClean(m, A.song.id, bars, speed)
    if (n !== m) saveMemory(n)
  }, [])

  const dismiss = useCallback(() => { abort.current?.abort(); stopSpeaking(); setState(null); setNote(null) }, [])
  return { state, note, afterPass, missed, hit, heard, ask, dismiss, clean }
}
