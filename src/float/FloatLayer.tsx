// The floating cards that aren't the hand (the hand card is drawn by the screen that knows the hand: Play, the Riff Scanner).
// Shown per screen (float/bus.ts shownCards), each a FloatCard: chord now & next, mini neck, what you played, bar & beat,
// tempo, quick tuner, mini video, practice timer. With nothing playing they say what they'll show.
import { useEffect, useRef, useState } from 'react'
import { FloatCard } from '../components/FloatCard'
import { Fretboard } from '../components/Fretboard'
import { ChordDiagram } from '../components/ChordDiagram'
import { Ico } from '../components/Icon'
import { chordInfo } from '../tabs/harmony'
import { chordShapes } from '../instrument'
import { parseSymbol } from '../theory/chords'
import { youtubeId, youtubeStart } from '../tabs/library'
import { freqToMidi, midiName } from '../theory/notes'
import { PitchTracker } from '../audio/pitch'
import { running as sessionNow, onSession } from '../sessions/session'
import { CARDS, toggleCard, useFloatCtx, useFloatScreen, useShownCards, type CardId, type FloatCtx } from './bus'

export function FloatLayer() {
  const screen = useFloatScreen()
  const shown = useShownCards(screen).filter(id => id !== 'hand')
  const ctx = useFloatCtx()
  if (!shown.length) return null
  return (
    <>
      {shown.map((id, i) => {
        const card = CARDS.find(c => c.id === id)!
        const hide = () => toggleCard(screen, id)
        return (
          <FloatCard key={`${screen}:${id}`} id={id} where={screen} title={card.title} icon={card.icon} order={i + 1} onHide={hide}
            width={id === 'video' ? 300 : id === 'neck' ? 280 : 220} minW={id === 'video' ? 200 : 150}
            alert={id === 'chord' && ctx.beatsToChange !== undefined && ctx.beatsToChange <= 2}
            bubble={bubbleText(id, ctx)}>
            <Body id={id} ctx={ctx} />
          </FloatCard>
        )
      })}
    </>
  )
}

function bubbleText(id: CardId, c: FloatCtx): string {
  switch (id) {
    case 'chord': return c.chordNow ? `${c.chordNow}${c.chordNext ? ` → ${c.chordNext}` : ''}` : 'Chord'
    case 'bar': return c.bar ? `Bar ${c.bar}` : 'Bar'
    case 'tempo': return c.bpm ? `${Math.round(c.bpm * (c.speed ?? 1))} BPM` : 'Tempo'
    case 'feedback': return c.feedback ? c.feedback.heard : 'Played'
    default: return CARDS.find(x => x.id === id)!.title
  }
}

const empty = (t: string) => <div className="fc-empty">{t}</div>

function Body({ id, ctx: c }: { id: CardId; ctx: FloatCtx }) {
  switch (id) {
    case 'chord': {
      if (!c.chordNow) return empty('Open a song with chords: the chord to play now and the next one show here.')
      return (
        <div className="stack" style={{ gap: 4 }} data-testid="fc-chord">
          <div className="fc-row">
            <span className="fc-big">{c.chordNow}</span>
            {c.chordNext && c.chordNext !== c.chordNow && <span className="fc-next">then <b>{c.chordNext}</b></span>}
            {c.beatsToChange !== undefined && c.beatsToChange <= 4 && c.chordNext && <span className="fc-count">{Math.max(1, Math.ceil(c.beatsToChange))}</span>}
          </div>
          <ChordShape name={c.chordNow} />
        </div>
      )
    }
    case 'neck': {
      const tuning = c.tuning ?? [40, 45, 50, 55, 59, 64]
      const info = c.chordNow ? chordInfo(c.chordNow) : null
      const pcs = c.keyPcs
      if (!pcs && !info) return empty('Open a song: the key’s notes around your hand show here, with the chord’s notes lit.')
      const base = Math.max(0, (c.handBase ?? 1) - 1)
      const tones = new Set(info?.pcs ?? [])
      return (
        <div data-testid="fc-neck">
          <div className="small muted">{c.keyName ? `${c.keyName}` : ''}{info ? `${c.keyName ? ' · ' : ''}${c.chordNow} notes lit` : ''}</div>
          <Fretboard tuning={tuning} fromFret={base} toFret={base + 5} compact
            markFor={m => {
              const p = ((m % 12) + 12) % 12
              if (info && p === info.root) return { label: midiName(m, !!c.flats).replace(/\d+$/, ''), role: 'root' }
              if (tones.has(p)) return { label: midiName(m, !!c.flats).replace(/\d+$/, ''), role: 'chord' }
              if (pcs?.includes(p)) return { label: '', role: 'scale' }
              return null
            }} />
        </div>
      )
    }
    case 'feedback': {
      const f = c.feedback
      if (!f) return empty('Start listening: what the mic hears shows here next to what the tab wants.')
      return (
        <div className="fc-row" data-testid="fc-feedback" role="status">
          <span className={`fc-big ${f.ok ? 'fc-ok' : 'fc-bad'}`}>{f.heard}</span>
          <span>{f.ok ? 'Right!' : f.want ? <>tab wants <b>{f.want}</b></> : 'not that one'}</span>
        </div>
      )
    }
    case 'bar':
      if (!c.bar) return empty('Play or listen: the bar and beat you’re on show here.')
      return (
        <div className="fc-row" data-testid="fc-bar">
          <span className="fc-big">{c.bar}</span><span className="muted">of {c.bars ?? '?'}</span>
          {c.beat !== undefined && <span>beat <b>{c.beat}</b></span>}
          {c.loop && <span className="small"><Ico n="loop" /> {c.loop}</span>}
        </div>
      )
    case 'tempo': return <TempoBody c={c} />
    case 'tuner': return <TunerBody />
    case 'video': return <VideoBody c={c} />
    case 'timer': return <TimerBody />
  }
}

/** The chord's easiest shape (the lowest on the neck), or just its name when there's no shape for it. */
function ChordShape({ name }: { name: string }) {
  let v = null
  try { const { root, suffix } = parseSymbol(name.split('/')[0]); v = chordShapes(root, suffix)[0] ?? null } catch { v = null }
  return v ? <ChordDiagram name={name} voicing={v} size={0.55} /> : null
}

function TempoBody({ c }: { c: FloatCtx }) {
  const [on, setOn] = useState(false)
  const bpm = c.bpm ? Math.round(c.bpm * (c.speed ?? 1)) : null
  useEffect(() => {
    if (!bpm) return
    const t = setInterval(() => { setOn(true); setTimeout(() => setOn(false), 90) }, 60000 / bpm)
    return () => clearInterval(t)
  }, [bpm])
  if (!bpm) return empty('Open a song: its tempo shows here, and you can change the speed.')
  const sp = c.speed ?? 1
  return (
    <div className="stack" style={{ gap: 6 }} data-testid="fc-tempo">
      <div className="fc-row"><i className={`fc-flash${on ? ' on' : ''}`} aria-hidden /><span className="fc-big tabular">{bpm}</span><span className="muted">BPM · {Math.round(sp * 100)}%</span></div>
      {c.setSpeed && (
        <div className="fc-row">
          <button className="btn sm" onClick={() => c.setSpeed!(Math.max(0.25, Math.round((sp - 0.05) * 100) / 100))} aria-label="Slower"><Ico n="minus" /></button>
          <button className="btn sm" onClick={() => c.setSpeed!(1)}>100%</button>
          <button className="btn sm" onClick={() => c.setSpeed!(Math.min(1.5, Math.round((sp + 0.05) * 100) / 100))} aria-label="Faster"><Ico n="plus" /></button>
        </div>
      )}
    </div>
  )
}

function TunerBody() {
  const [on, setOn] = useState(false)
  const [r, setR] = useState<{ name: string; cents: number } | null>(null)
  const tr = useRef<PitchTracker | null>(null)
  useEffect(() => () => tr.current?.stop(), [])
  const toggle = async () => {
    if (on) { tr.current?.stop(); tr.current = null; setOn(false); setR(null); return }
    const t = new PitchTracker({ filter: true })
    // only clear notes (freq 0 = sound but no clear pitch), steadied by the middle of the last five readings
    const last: number[] = []
    t.onReading = rd => {
      if (!rd || rd.freq <= 0 || rd.clarity < 0.88) return
      const m0 = freqToMidi(rd.freq)
      if (!Number.isFinite(m0)) return
      last.push(m0); if (last.length > 5) last.shift()
      const m = [...last].sort((a, b) => a - b)[Math.floor(last.length / 2)], n = Math.round(m)
      setR({ name: midiName(n), cents: Math.round((m - n) * 100) })
    }
    try { await t.start(); tr.current = t; setOn(true) } catch { setOn(false) }
  }
  const inTune = r && Math.abs(r.cents) <= 5
  return (
    <div className="stack" style={{ gap: 6 }} data-testid="fc-tuner">
      <div className="fc-row"><span className="fc-big">{r?.name ?? '–'}</span>{r && <span className={inTune ? 'fc-ok' : ''}>{r.cents > 0 ? '+' : ''}{r.cents} cents{inTune ? ' · in tune' : ''}</span>}</div>
      <div className="fc-needle" aria-hidden>{r && <i className={inTune ? 'in' : ''} style={{ left: `${50 + Math.max(-50, Math.min(50, r.cents))}%` }} />}</div>
      <button className={`btn sm${on ? ' primary' : ''}`} onClick={() => void toggle()}><Ico n="mic" /> {on ? 'Stop' : 'Start the tuner'}</button>
    </div>
  )
}

function VideoBody({ c }: { c: FloatCtx }) {
  const [url, setUrl] = useState('')
  const src = c.video || url
  const id = src ? youtubeId(src) : null
  if (!id) {
    return (
      <form className="stack" style={{ gap: 6 }} onSubmit={e => { e.preventDefault(); setUrl((e.currentTarget.elements.namedItem('u') as HTMLInputElement).value) }}>
        <span className="fc-empty">This song has no video. Paste a YouTube link:</span>
        <input name="u" className="input" placeholder="https://youtube.com/…" />
      </form>
    )
  }
  const start = src ? youtubeStart(src) : 0
  return <iframe className="fc-video" data-testid="fc-video" title={c.title ? `${c.title}: video` : 'Video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
    src={`https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0${start ? `&start=${start}` : ''}`} />
}

function TimerBody() {
  const [, bump] = useState(0)
  useEffect(() => { const off = onSession(() => bump(n => n + 1)); const t = setInterval(() => bump(n => n + 1), 1000); return () => { off(); clearInterval(t) } }, [])
  const [start, setStart] = useState<number | null>(null)
  const s = sessionNow()
  const mmss = (ms: number) => { const t = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
  if (s) {
    const left = s.paused ? s.left : s.left - (Date.now() - s.at)
    return (
      <div className="stack" style={{ gap: 4 }} data-testid="fc-timer">
        <span className="small muted">Step {s.index + 1} of {s.session.steps.length}: {s.session.steps[s.index]?.title}</span>
        <span className="fc-big tabular">{mmss(left)}</span>
      </div>
    )
  }
  return (
    <div className="fc-row" data-testid="fc-timer">
      <span className="fc-big tabular">{start ? mmss(Date.now() - start) : '0:00'}</span>
      <button className="btn sm" onClick={() => setStart(start ? null : Date.now())}>{start ? 'Reset' : 'Start'}</button>
    </div>
  )
}

/** Choose the floating cards for a screen (Play's Options, the gear's Floating cards). */
/** screens that know where your hand is (the hand card needs a tab): the song player and Learn's exercises */
const HAND_SCREENS = ['play', 'learn']
export function FloatPicker({ screen }: { screen: string }) {
  const shown = useShownCards(screen)
  return (
    <div className="float-picker" role="group" aria-label="Floating cards" data-testid="float-picker">
      {CARDS.filter(c => c.id !== 'hand' || HAND_SCREENS.includes(screen)).map(c => (
        <button key={c.id} className="chip" aria-pressed={shown.includes(c.id)} onClick={() => toggleCard(screen, c.id)} title={c.hint} data-card={c.id}>
          <Ico n={c.icon} /> {c.title}
        </button>
      ))}
    </div>
  )
}
