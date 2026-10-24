// Runs a "play in time" session for the Play screen: the clock (own click or a synced video), the moving cursor,
// judging each note or strum, loop passes and the speed trainer.
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { SoundId } from '../audio/pluck'
import { audio, keepAwake } from '../audio/engine'
import { chordMatch } from '../audio/chroma'
import type { FlatStep } from '../tabs/model'
import {
  InternalClock, VideoClock, judge, matchTimed, nextSpeed, scoreRun, timeline,
  type Clock, type Judgement, type RunStats, type VideoApi, type VideoSync,
} from './inTime'

export interface TrainerOpts { on: boolean; start: number; step: number; target: number; pass: number }
export interface InTimeFeedback { j: Judgement | 'miss'; ms: number; key: number }

interface Args {
  flat: FlatStep[]
  /** bars to loop (inclusive), or null for the whole song from the cursor's bar */
  loop: { from: number; to: number } | null
  startFlat: number
  songBpm: number
  /** fraction of full tempo (½, ¾, 1) when the trainer is off */
  speed: number
  click: boolean
  guide: boolean
  /** the guitar sound the guide plays in */
  sound?: SoundId
  strict: boolean
  trainer: TrainerOpts
  video: MutableRefObject<VideoApi | null>
  sync: VideoSync | undefined
  /** colour states for the tab view: 1 on time, 2 early/late, 3 missed */
  states: MutableRefObject<Uint8Array>
  latencyMs: () => number
  onChange: () => void
  onHitNote?: () => void
  /** the notes due around now (and just after), so the listener can check for them first */
  onExpect?: (now: number[], next: number[]) => void
  onFinish?: (s: RunStats, passes: number) => void
  onPass?: (s: RunStats, speed: number) => void
}

export function useInTime(a: Args) {
  const [running, setRunning] = useState(false)
  const [cursor, setCursor] = useState(-1)
  const [feedback, setFeedback] = useState<InTimeFeedback | null>(null)
  const [stats, setStats] = useState<RunStats | null>(null)
  const [pass, setPass] = useState<{ n: number; last: RunStats | null; speed: number }>({ n: 0, last: null, speed: 1 })
  const [usingVideo, setUsingVideo] = useState(false)
  const args = useRef(a)
  args.current = a
  const run = useRef<{
    clock: Clock; steps: ReturnType<typeof timeline>['steps']; inRange: number[]; fromBeat: number; toBeat: number; loop: boolean
    results: (Judgement | 'miss' | undefined)[]; errs: number[]; taken: Set<number>; lastBeat: number; speed: number; raf: number; video: boolean; passes: number; expectKey?: string
  } | null>(null)

  const stop = useCallback((finished = false) => {
    const r = run.current
    if (!r) return
    cancelAnimationFrame(r.raf)
    r.clock.stop()
    if (r.video) args.current.video.current?.pause()
    run.current = null
    setRunning(false)
    setCursor(-1)
    void keepAwake(false)
    if (finished) {
      const s = scoreRun(r.inRange.map(i => r.results[i]), r.errs)
      setStats(s)
      args.current.onFinish?.(s, r.passes)
    }
  }, [])

  const start = useCallback(() => {
    const A = args.current
    stop()
    const tl = timeline(A.flat)
    if (!tl.steps.length) return
    const barStart = (bar: number) => { const i = A.flat.findIndex(f => f.bar >= bar); return i < 0 ? tl.total : tl.beatOf[i] }
    const startBar = A.flat[Math.max(0, A.startFlat)]?.bar ?? 0
    const fromBeat = A.loop ? barStart(A.loop.from) : barStart(startBar)
    const toBeat = A.loop ? barStart(A.loop.to + 1) : tl.total
    const inRange = tl.steps.map((s, i) => (s.beat >= fromBeat - 1e-6 && s.beat < toBeat - 1e-6 ? i : -1)).filter(i => i >= 0)
    const useVideo = !!(A.sync && A.video.current)
    const speed = A.trainer.on && A.loop && !useVideo ? A.trainer.start : A.speed
    A.states.current.fill(0)
    let clock: Clock
    if (useVideo) {
      const v = A.video.current!
      clock = new VideoClock(v, A.sync!)
      v.seek(A.sync!.offset + (fromBeat * 60) / A.sync!.bpm - 2)
      v.play()
    } else {
      clock = new InternalClock(fromBeat, toBeat, A.songBpm * speed, {
        loop: !!A.loop, click: A.click, countIn: 4,
        guide: A.guide ? { steps: tl.steps, flat: A.flat, sound: A.sound } : undefined,
        onWrap: () => {
          // end of a pass (decided just before the loop restarts): score it, maybe speed up
          const r = run.current
          if (!r) return
          const lastBeat = r.toBeat - 0.35
          const counted = r.inRange.filter(i => r.steps[i].beat < lastBeat || r.results[i] !== undefined)
          const s = scoreRun(counted.map(i => r.results[i]), r.errs)
          const T = args.current.trainer
          const nsp = T.on ? nextSpeed(r.speed, s.score, T) : r.speed
          r.passes++
          setPass({ n: r.passes, last: s, speed: nsp })
          args.current.onPass?.(s, r.speed)
          r.speed = nsp
          return args.current.songBpm * nsp
        },
      })
    }
    run.current = { clock, steps: tl.steps, inRange, fromBeat, toBeat, loop: !!A.loop, results: [], errs: [], taken: new Set(), lastBeat: -Infinity, speed, raf: 0, video: useVideo, passes: 0 }
    setUsingVideo(useVideo)
    setPass({ n: 0, last: null, speed })
    setStats(null)
    setFeedback(null)
    setRunning(true)
    void keepAwake(true)
    void audio().resume()

    const tick = () => {
      const r = run.current
      if (!r) return
      const ctx = audio()
      const b = r.clock.beatAt(ctx.currentTime)
      if (b !== null) {
        // a new pass started: clear the marks of the old one
        if (r.loop && b < r.lastBeat - 0.5) {
          for (const i of r.inRange) { r.results[i] = undefined; r.taken.delete(i); args.current.states.current[r.steps[i].flat] = 0 }
          r.errs = []
          args.current.onChange()
        }
        // video loop: jump back at the end of the section
        if (r.video && r.loop && b >= r.toBeat) {
          const S = args.current.sync!
          args.current.video.current?.seek(S.offset + (r.fromBeat * 60) / S.bpm - 1)
          r.passes++
          const s = scoreRun(r.inRange.map(i => r.results[i]), r.errs)
          setPass(p => ({ n: p.n + 1, last: s, speed: p.speed }))
          args.current.onPass?.(s, args.current.video.current?.rate() ?? 1)
        }
        r.lastBeat = b
        // tell the listener which notes are due: anything not yet played within half a beat either side
        if (args.current.onExpect) {
          const nowM: number[] = [], nextM: number[] = []
          for (const i of r.inRange) {
            const s = r.steps[i]
            if (r.taken.has(i)) continue
            if (Math.abs(s.beat - b) <= 0.6) nowM.push(...s.midis)
            else if (s.beat > b && s.beat - b <= 1.6) nextM.push(...s.midis)
          }
          const key = nowM.join(',') + '|' + nextM.join(',')
          if (key !== r.expectKey) { r.expectKey = key; args.current.onExpect(nowM, nextM) }
        }
        // cursor: the step being played now
        let cur = -1
        for (let k = 0; k < r.steps.length && r.steps[k].beat <= b + 0.02; k++) cur = r.steps[k].flat
        setCursor(c => (c === cur ? c : cur))
        // steps that went by without being played are missed
        const late = 0.35 + 0.22 / r.clock.spb()
        let changed = false
        for (const i of r.inRange) {
          const s = r.steps[i]
          if (s.beat + late < b && r.results[i] === undefined) {
            r.results[i] = 'miss'
            r.taken.add(i)
            args.current.states.current[s.flat] = 3
            changed = true
          }
        }
        if (changed) { setFeedback(f => ({ j: 'miss', ms: 0, key: (f?.key ?? 0) + 1 })); args.current.onChange() }
        if (!r.loop && b > r.toBeat + 1) { stop(true); return }
      }
      r.raf = requestAnimationFrame(tick)
    }
    run.current.raf = requestAnimationFrame(tick)
  }, [stop])

  /** A note or strum was heard at `time` (audio clock, before latency correction). */
  const played = useCallback((time: number, p: { midi?: number; chroma?: number[] }) => {
    const r = run.current
    if (!r) return
    const t = time - args.current.latencyMs() / 1000 - 0.01
    const b = r.clock.beatAt(t)
    if (b === null) return
    const m = matchTimed(r.steps, b, r.clock.spb(),
      { midi: p.midi, chordOk: p.chroma ? (midis => chordMatch(p.chroma!, [...new Set(midis.map(x => x % 12))]).ok) : undefined },
      r.taken, args.current.strict)
    if (!m) return
    const j = judge(m.errMs, r.video ? 30 : 0)
    r.taken.add(m.step)
    r.results[m.step] = j
    r.errs.push(m.errMs)
    args.current.states.current[r.steps[m.step].flat] = j === 'perfect' || j === 'good' ? 1 : 2
    setFeedback(f => ({ j, ms: Math.round(m.errMs), key: (f?.key ?? 0) + 1 }))
    args.current.onHitNote?.()
    args.current.onChange()
  }, [])

  useEffect(() => () => stop(), [stop])
  return { running, cursor, feedback, stats, pass, usingVideo, start, stop, played }
}
