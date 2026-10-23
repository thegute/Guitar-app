// Theory lessons: the chapter list and the lesson reader with playable examples.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Fretboard } from '../components/Fretboard'
import { CircleOfFifths } from '../components/CircleOfFifths'
import { playNote, strum } from '../audio/pluck'
import { playClick } from '../audio/metronome'
import { audio } from '../audio/engine'
import { INTERVAL_LABELS, SHARPS, FLATS, pc } from '../theory/notes'
import type { Instrument } from '../instrument'
import { CHAPTERS, LESSONS, lessonById, type Block, type Lesson } from './lessons'
import { addXp, bump, logDone, usePracticeTimer } from './progress'
import type { Go } from './path'

const READ = 'kg:lessonsRead'
export function lessonsRead(): string[] {
  try { return JSON.parse(localStorage.getItem(READ) ?? '[]') as string[] } catch { return [] }
}
function markRead(id: string) {
  const r = lessonsRead()
  const first = !r.includes(id)
  if (first) {
    r.push(id)
    try { localStorage.setItem(READ, JSON.stringify(r)) } catch { /* storage unavailable */ }
    addXp(20)
  }
  bump('lessonsRead')
  logDone('lesson:' + id)
  return first
}
export function nextLesson(): Lesson {
  const r = new Set(lessonsRead())
  return LESSONS.find(l => !r.has(l.id)) ?? LESSONS[0]
}

/** **bold** inside lesson text */
function rich(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))
}

function blockGo(b: Extract<Block, { practice: unknown }>['practice']): Go | null {
  if (b.quiz) return { quiz: b.quiz }
  if (b.tool === 'jam') return { tab: 'progressions' }
  if (b.tool === 'play') return { tab: 'play' }
  if (b.tool) return { tool: b.tool }
  return null
}

// ---------- sound helpers ----------
function start() {
  const ctx = audio()
  void ctx.resume()
  return ctx.currentTime + 0.06
}
function playExample(seq: number[] = [], chord: number[] = [], gap = 0.35) {
  let t = start()
  seq.forEach((m, i) => playNote(m, t + i * gap, 0.75))
  t += seq.length * gap + (seq.length ? 0.25 : 0)
  if (chord.length) strum(chord, t, { spread: 0.03 })
}
function playProg(chords: number[][], gap = 0.9) {
  const t = start()
  chords.forEach((c, i) => strum(c, t + i * gap, { spread: 0.025 }))
}

function RhythmBlock({ label, beats, bpm = 80 }: { label: string; beats: number[]; bpm?: number }) {
  const [at, setAt] = useState(-1)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const total = beats.reduce((a, b) => a + b, 0)
  function play() {
    cancelAnimationFrame(raf.current)
    const spb = 60 / bpm
    const t0 = start() + 4 * spb // one bar count-in
    for (let i = 0; i < 4; i++) playClick(t0 - (4 - i) * spb, 'wood', i === 0 ? 'accent' : 'beat', 0.7)
    for (let b = 0; b < Math.ceil(total); b++) playClick(t0 + b * spb, 'wood', b % 4 === 0 ? 'accent' : 'beat', 0.45)
    const onsets: number[] = []
    let x = 0
    for (const b of beats) { onsets.push(x); playNote(57, t0 + x * spb, 0.8); x += b }
    const ctx = audio()
    const tick = () => {
      const beat = (ctx.currentTime - t0) / spb
      if (beat > total + 0.3) { setAt(-1); return }
      let i = -1
      onsets.forEach((o, k) => { if (beat >= o - 0.02) i = k })
      setAt(i)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }
  return (
    <div className="lesson-rhythm">
      <button className="btn sm" onClick={play}>▶ {label}</button>
      <div className="rhythm-strip" aria-hidden>
        {beats.map((b, i) => <span key={i} className={i === at ? 'on' : ''} style={{ flexGrow: b }} />)}
      </div>
    </div>
  )
}

function BlockView({ b, inst, onGo }: { b: Block; inst: Instrument; onGo: (g: Go) => void }) {
  if ('p' in b) return <p>{rich(b.p)}</p>
  if ('list' in b) return <ul className="lesson-list">{b.list.map((x, i) => <li key={i}>{rich(x)}</li>)}</ul>
  if ('tip' in b) return <p className="notice small">{rich(b.tip)}</p>
  if ('play' in b) return <button className="btn sm lesson-play" onClick={() => playExample(b.play.seq, b.play.chord, b.play.gap)}>▶ {b.play.label}</button>
  if ('prog' in b) return <button className="btn sm lesson-play" onClick={() => playProg(b.prog.chords, b.prog.gap)}>▶ {b.prog.label}</button>
  if ('rhythm' in b) return <RhythmBlock {...b.rhythm} />
  if ('circle' in b) {
    return (
      <div className="cof-wrap">
        <CircleOfFifths tonic={b.circle.tonic} minor={b.circle.minor} size={300} onPick={(root, minor) => {
          const r = 48 + pc(root)
          playExample([], [r, r + (minor ? 3 : 4), r + 7, r + 12])
        }} />
      </div>
    )
  }
  if ('neck' in b) {
    const r = pc(b.neck.root)
    const flats = /b/.test(b.neck.root) || b.neck.root === 'F'
    return (
      <Fretboard tuning={inst.midis} fromFret={0} toFret={b.neck.to ?? 12} compact
        markFor={m => {
          const iv = ((m % 12) - r + 12) % 12
          if (!b.neck.ivs.includes(iv)) return null
          const label = b.neck.labels === 'note' ? (flats ? FLATS : SHARPS)[m % 12] : INTERVAL_LABELS[iv]
          return { label, role: iv === 0 ? 'root' : [3, 4, 7].includes(iv) ? 'chord' : 'scale' }
        }}
        onTap={m => playNote(m, 0, 0.8)} />
    )
  }
  const go = blockGo(b.practice)
  return go ? <button className="btn lesson-practice" onClick={() => onGo(go)}>{b.practice.label}</button> : null
}

export function LessonView({ id, inst, onExit, onOpen, onGo }: { id: string; inst: Instrument; onExit: () => void; onOpen: (id: string) => void; onGo: (g: Go) => void }) {
  const lesson = lessonById(id) ?? LESSONS[0]
  const [done, setDone] = useState(() => lessonsRead().includes(lesson.id))
  const [first, setFirst] = useState(false)
  usePracticeTimer('theory', true, false)
  useEffect(() => { setDone(lessonsRead().includes(lesson.id)); setFirst(false); document.getElementById('main')?.scrollTo({ top: 0 }) }, [lesson.id])
  const i = LESSONS.indexOf(lesson)
  const next = LESSONS[i + 1]
  const prev = LESSONS[i - 1]
  const chapter = CHAPTERS.find(c => c.id === lesson.chapter)
  return (
    <article className="lesson stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← All lessons</button>
        <span className="small muted">{lesson.minutes} min read</span>
      </div>
      <header>
        <p className="small muted" style={{ margin: 0 }}>{chapter?.title}</p>
        <h1 style={{ margin: '2px 0 0' }}>{lesson.title}</h1>
      </header>
      <div className="lesson-body">
        {lesson.blocks.map((b, k) => <BlockView key={k} b={b} inst={inst} onGo={onGo} />)}
      </div>
      {lesson.offtonic && (
        <a className="lesson-source" href={lesson.offtonic} target="_blank" rel="noreferrer">
          Read the full chapter on Offtonic Theory
        </a>
      )}
      <div className="lesson-end">
        {done ? (
          <p className="small" style={{ margin: 0 }}>{first ? '✓ Lesson done. +20 XP' : '✓ You have read this lesson.'}</p>
        ) : (
          <button className="btn primary big" onClick={() => { setFirst(markRead(lesson.id)); setDone(true) }}>I've read it ✓</button>
        )}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {prev ? <button className="btn sm ghost" onClick={() => onOpen(prev.id)}>← {prev.title}</button> : <span />}
          {next && <button className={`btn sm${done ? ' primary' : ''}`} onClick={() => onOpen(next.id)}>Next: {next.title}</button>}
        </div>
      </div>
    </article>
  )
}

export function LessonList({ onOpen, onExit }: { onOpen: (id: string) => void; onExit: () => void }) {
  const read = useMemo(() => new Set(lessonsRead()), [])
  const nxt = nextLesson()
  let part = ''
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <span className="small muted">{read.size} of {LESSONS.length} read</span>
      </div>
      <h1 style={{ margin: 0 }}>Theory</h1>
      <p className="small muted" style={{ margin: 0 }}>
        Short lessons written for guitar and ukulele, following the chapters of Offtonic Theory, a free online textbook (each lesson links to
        its chapter if you want the full version). Every lesson has sounds to tap and something to try.
      </p>
      <button className="continue-card" onClick={() => onOpen(nxt.id)}>
        <span className="small muted">{read.size ? 'Continue with' : 'Start with'}</span>
        <b>{nxt.title}</b>
        <span className="small muted">{CHAPTERS.find(c => c.id === nxt.chapter)?.title} · {nxt.minutes} min</span>
      </button>
      {CHAPTERS.map(ch => {
        const list = LESSONS.filter(l => l.chapter === ch.id)
        const head = ch.part !== part
        part = ch.part
        const n = list.filter(l => read.has(l.id)).length
        return (
          <section key={ch.id} className="chapter">
            {head && <p className="small muted chapter-part">{ch.part}</p>}
            <h2>{ch.title} <span className="small muted">{n}/{list.length}</span></h2>
            <ul className="lesson-index">
              {list.map(l => (
                <li key={l.id}>
                  <button onClick={() => onOpen(l.id)} className={read.has(l.id) ? 'read' : ''}>
                    <span className="tick" aria-label={read.has(l.id) ? 'read' : 'not read'}>{read.has(l.id) ? '✓' : ''}</span>
                    <span>{l.title}</span>
                    <span className="small muted">{l.minutes} min</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
