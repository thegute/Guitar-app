// The floating cards that aren't the hand (the hand card is drawn by the screen that knows the hand: Play, the Riff Scanner).
// Supports MULTIPLE floating windows at once (including multiple copies of the same card via instance uids!), each with:
// - ◐ opacity meter (20%–100%), drag, resize, edge-snap, bubble shrink
// - tiny + button to open ANY feature in a brand-new floating window alongside this one
// - tiny ▾ dropdown menu to switch this card, expand 5-Layer Fretboard, or toggle cards
import { useEffect, useRef, useState } from 'react'
import { FloatCard } from '../components/FloatCard'
import { Fretboard } from '../components/Fretboard'
import { LayerNeck } from '../components/LayerNeck'
import { ChordDiagram } from '../components/ChordDiagram'
import { Ico } from '../components/Icon'
import { chordInfo } from '../tabs/harmony'
import { chordShapes, useInstrument } from '../instrument'
import { parseSymbol } from '../theory/chords'
import { youtubeId, youtubeStart } from '../tabs/library'
import { KEYS, freqToMidi, midiName, pc } from '../theory/notes'
import { PitchTracker } from '../audio/pitch'
import { running as sessionNow, onSession } from '../sessions/session'
import { busLevel, onBuses, setBusLevel, type BusName } from '../audio/engine'
import { MIX_PARTS, audible, isMuted, isSolo, onMixer, resetMixer, toggleMute, toggleSolo } from '../audio/mixer'
import {
  CARDS, addCardInstance, removeCardInstance, swapCardInstance, toggleCard,
  useCleanStage, useFloatCtx, useFloatScreen, useShownCards, useShownInstances, useFloatResting,
  type CardId, type CardInstance, type FloatCtx,
} from './bus'
import { PocketBandBody, PocketDrummerBody } from './PocketBandCard'
import { BookRefBody, CircleCardBody, LicksCardBody, StickyNoteBody } from './CreativeCards'

export function FloatLayer() {
  const screen = useFloatScreen()
  const instances = useShownInstances(screen).filter(x => x.kind !== 'hand')
  const ctx = useFloatCtx()
  const resting = useFloatResting(screen)
  const clean = useCleanStage()
  const [neckExpanded, setNeckExpanded] = useState<Record<string, boolean>>((): Record<string, boolean> => {
    try {
      const def = localStorage.getItem('kg:floatNeck5Layer') === '1'
      return def ? { neck: true, 'neck-2': true } : {}
    } catch { return {} }
  })
  const toggle5Layer = (uid: string, v?: boolean) => {
    setNeckExpanded(prev => {
      const nextVal = v !== undefined ? v : !prev[uid]
      try { if (uid === 'neck') localStorage.setItem('kg:floatNeck5Layer', nextVal ? '1' : '0') } catch { /* private */ }
      return { ...prev, [uid]: nextVal }
    })
  }

  if (!instances.length || resting || clean) return null
  return (
    <>
      {instances.map((inst, i) => {
        const id = inst.kind
        const card = CARDS.find(c => c.id === id)
        if (!card) return null
        const isExpandedNeck = id === 'neck' && (neckExpanded[inst.uid] ?? (localStorage.getItem('kg:floatNeck5Layer') === '1'))
        const copyNum = inst.uid.includes('-') ? ` #${inst.uid.split('-').pop()}` : ''
        const title = (isExpandedNeck ? '5-Layer Fretboard' : card.title) + copyNum
        const width = isExpandedNeck ? 440 : id === 'band' || id === 'book' || id === 'licks' ? 350 : id === 'drummer' || id === 'circle' || id === 'video' ? 320 : id === 'neck' ? 300 : id === 'note' || id === 'mixer' ? 280 : 230
        const minW = isExpandedNeck ? 280 : id === 'band' || id === 'book' || id === 'licks' || id === 'drummer' ? 250 : id === 'video' || id === 'circle' ? 220 : 160
        return (
          <FloatCard
            key={`${screen}:${inst.uid}`}
            id={inst.uid}
            where={screen}
            title={title}
            icon={card.icon}
            order={i + 1}
            openNarrow
            onHide={() => removeCardInstance(screen, inst.uid)}
            width={width}
            minW={minW}
            alert={id === 'chord' && ctx.beatsToChange !== undefined && ctx.beatsToChange <= 2}
            bubble={bubbleText(id, ctx)}
            headerExtra={
              <CardHeaderControls
                screen={screen}
                inst={inst}
                all={instances}
                neck5Layer={isExpandedNeck}
                onToggle5Layer={() => toggle5Layer(inst.uid, !isExpandedNeck)}
              />
            }
          >
            <Body uid={inst.uid} id={id} ctx={ctx} neck5Layer={isExpandedNeck} onToggle5Layer={() => toggle5Layer(inst.uid, !isExpandedNeck)} />
          </FloatCard>
        )
      })}
    </>
  )
}

/** Tiny `+` (Open New Card) and `▾` (Switch / Expand / Remove) buttons in every floating card's title bar. */
function CardHeaderControls({ screen, inst, all, neck5Layer, onToggle5Layer }: {
  screen: string
  inst: CardInstance
  all: CardInstance[]
  neck5Layer: boolean
  onToggle5Layer: () => void
}) {
  const [menu, setMenu] = useState<null | 'add' | 'swap'>(null)
  const wrap = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!menu) return
    const close = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(null)
    }
    addEventListener('pointerdown', close)
    return () => removeEventListener('pointerdown', close)
  }, [menu])

  const options = CARDS.filter(c => c.id !== 'hand')
  return (
    <span className="fc-menu-wrap row" ref={wrap} style={{ gap: 2, flexWrap: 'nowrap' }} data-no-drag>
      <button
        className={`fc-btn${menu === 'add' ? ' on' : ''}`}
        onClick={() => setMenu(m => (m === 'add' ? null : 'add'))}
        aria-label="Open another floating card"
        aria-expanded={menu === 'add'}
        title="Open another floating card alongside this one"
        data-testid={`fc-add-btn-${inst.uid}`}
      >
        +
      </button>
      <button
        className={`fc-btn${menu === 'swap' ? ' on' : ''}`}
        onClick={() => setMenu(m => (m === 'swap' ? null : 'swap'))}
        aria-label="Switch or customize this floating card"
        aria-expanded={menu === 'swap'}
        title="Switch feature or expand 5-Layer Fretboard"
        data-testid={`fc-menu-btn-${inst.uid}`}
      >
        ▾
      </button>

      {menu === 'add' && (
        <div className="fc-menu-pop fc-menu-scroll" role="menu" data-testid={`fc-add-pop-${inst.uid}`}>
          <span className="small muted" style={{ padding: '2px 8px', fontSize: 11 }}>Open in a new floating card</span>
          {options.map(c => {
            const count = all.filter(x => x.kind === c.id).length
            return (
              <button
                key={`add-${c.id}`}
                className="fc-menu-item"
                role="menuitem"
                onClick={() => {
                  if (c.id === 'neck') try { localStorage.setItem('kg:floatNeck5Layer', '1') } catch { /* private */ }
                  addCardInstance(screen, c.id)
                  setMenu(null)
                }}
                data-testid={`fc-new-${c.id}`}
              >
                <span style={{ width: 14, display: 'inline-block' }}>+</span>
                <Ico n={c.icon} />
                <span style={{ flex: 1 }}>{c.title}</span>
                {count > 0 && <span className="small muted">({count})</span>}
              </button>
            )
          })}
        </div>
      )}

      {menu === 'swap' && (
        <div className="fc-menu-pop fc-menu-scroll" role="menu" data-testid={`fc-menu-pop-${inst.uid}`}>
          <button
            className={`fc-menu-item${inst.kind === 'neck' && neck5Layer ? ' on' : ''}`}
            role="menuitem"
            onClick={() => {
              if (inst.kind !== 'neck') {
                try { localStorage.setItem('kg:floatNeck5Layer', '1') } catch { /* private */ }
                swapCardInstance(screen, inst.uid, 'neck')
              } else {
                onToggle5Layer()
              }
              setMenu(null)
            }}
            data-testid="fc-expand-5layer"
          >
            <Ico n="layers" /> {inst.kind === 'neck' && neck5Layer ? 'Compact mini neck' : 'Expand 5-Layer Fretboard ⤢'}
          </button>
          <div className="fc-menu-sep" />
          <span className="small muted" style={{ padding: '2px 8px', fontSize: 11 }}>Switch this card to</span>
          {options.filter(c => c.id !== inst.kind).map(c => (
            <button key={`swap-${c.id}`} className="fc-menu-item" role="menuitem" onClick={() => { swapCardInstance(screen, inst.uid, c.id); setMenu(null) }} data-testid={`fc-swap-${c.id}`}>
              <Ico n={c.icon} /> {c.title}
            </button>
          ))}
        </div>
      )}
    </span>
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

function Body({ uid, id, ctx: c, neck5Layer, onToggle5Layer }: { uid: string; id: CardId; ctx: FloatCtx; neck5Layer: boolean; onToggle5Layer: () => void }) {
  switch (id) {
    case 'drummer': return <PocketDrummerBody ctx={c} />
    case 'band': return <PocketBandBody />
    case 'licks': return <LicksCardBody ctx={c} />
    case 'circle': return <CircleCardBody ctx={c} />
    case 'note': return <StickyNoteBody ctx={c} />
    case 'book': return <BookRefBody />
    case 'chord': {
      if (!c.chordNow) return empty('Open a song with chords (or start Pocket Band): the chord to play now and the next one show here.')
      return (
        <div className="stack" style={{ gap: 4 }} data-testid="fc-chord">
          <div className="fc-row">
            <span className="fc-big" data-chord={c.chordNow}>{c.chordNow}</span>
            {c.chordNext && c.chordNext !== c.chordNow && <span className="fc-next">then <b data-chord={c.chordNext}>{c.chordNext}</b></span>}
            {c.beatsToChange !== undefined && c.beatsToChange <= 4 && c.chordNext && <span className="fc-count">{Math.max(1, Math.ceil(c.beatsToChange))}</span>}
          </div>
          <ChordShape name={c.chordNow} />
        </div>
      )
    }
    case 'neck':
      return <NeckBody uid={uid} c={c} expanded={neck5Layer} onToggle={onToggle5Layer} />
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
    case 'mixer': return <MixerBody band={c.band} />
  }
}

/** Floating Fretboard: compact live mini-neck OR expanded full 5-Layer Fretboard (Shape · Triads · Pentatonic · Mode · Free fingers). */
function NeckBody({ uid, c, expanded, onToggle }: { uid: string; c: FloatCtx; expanded: boolean; onToggle: () => void }) {
  const inst = useInstrument()
  const [manualRoot, setManualRoot] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kg:progKey') ?? '"G"') as string } catch { return 'G' }
  })
  const [manualMinor, setManualMinor] = useState(false)
  // Second fretboard defaults to Whole Key while first follows live Chord!
  const [followChord, setFollowChord] = useState(() => !uid.includes('-'))

  const info = c.chordNow ? chordInfo(c.chordNow) : null
  const keyMatch = c.keyName ? /^([A-G][#b]?)\s*(m|min)/i.exec(c.keyName) : null
  const keyRootMatch = c.keyName ? /^([A-G][#b]?)/.exec(c.keyName) : null

  if (expanded) {
    const activeRootPc = followChord && info
      ? info.root
      : keyRootMatch
        ? pc(keyRootMatch[1])
        : pc(manualRoot)
    const chordMinor = !!info && info.pcs.includes((info.root + 3) % 12) && !info.pcs.includes((info.root + 4) % 12)
    const activeMinor = followChord && info
      ? chordMinor
      : keyRootMatch
        ? !!keyMatch
        : manualMinor
    return (
      <div className="stack" style={{ gap: 4 }} data-testid="fc-neck-5layer">
        <div className="ln-float-bar" style={{ justifyContent: 'space-between' }}>
          <span className="row" style={{ gap: 4, alignItems: 'center' }}>
            {(info || keyRootMatch) ? (
              <div className="seg ln-seg" role="group" aria-label="Fretboard lock">
                {info && <button aria-pressed={followChord} onClick={() => setFollowChord(true)}>{c.chordNow}</button>}
                <button aria-pressed={!followChord || !info} onClick={() => setFollowChord(false)}>{c.keyName || `${manualRoot}${manualMinor ? 'm' : ''}`}</button>
              </div>
            ) : (
              <>
                <select className="select sm ln-sel" value={manualRoot} onChange={e => setManualRoot(e.target.value)} aria-label="Fretboard key">
                  {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <div className="seg ln-seg" role="group" aria-label="Major or minor">
                  <button aria-pressed={!manualMinor} onClick={() => setManualMinor(false)}>Maj</button>
                  <button aria-pressed={manualMinor} onClick={() => setManualMinor(true)}>Min</button>
                </div>
              </>
            )}
          </span>
          <button className="btn sm ghost ln-btn" onClick={onToggle} data-testid="fc-neck-collapse">Compact</button>
        </div>
        <LayerNeck rootPc={activeRootPc} minor={activeMinor} inst={inst} where={`float5layer:${uid}`} compact floating />
      </div>
    )
  }

  const tuning = c.tuning ?? inst.midis
  const pcs = c.keyPcs
  if (!pcs && !info) {
    return (
      <div className="stack" style={{ gap: 6 }} data-testid="fc-neck">
        <div className="fc-empty">Open a song, Jam, or Pocket Band to follow live chords — or expand the full 5-layer fretboard anytime.</div>
        <button className="btn sm primary" onClick={onToggle} data-testid="fc-neck-expand"><Ico n="layers" /> Open 5-Layer Fretboard</button>
      </div>
    )
  }
  const base = Math.max(0, (c.handBase ?? 1) - 1)
  const tones = new Set(info?.pcs ?? [])
  const nextInfo = c.chordNext && c.beatsToChange !== undefined && c.beatsToChange <= 2 ? chordInfo(c.chordNext) : null
  const look = new Set<number>()
  if (nextInfo) {
    look.add(nextInfo.root)
    const third = nextInfo.pcs.find(p => [3, 4].includes((p - nextInfo.root + 12) % 12))
    if (third !== undefined) look.add(third)
  }
  return (
    <div className="stack" style={{ gap: 4 }} data-testid="fc-neck">
      <div className="row small" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
        <span className="muted">{c.keyName ? `${c.keyName}` : ''}{info ? `${c.keyName ? ' · ' : ''}${c.chordNow} lit` : ''}{nextInfo ? <b className="fc-look"> · → {c.chordNext}</b> : null}</span>
        <button className="btn sm ghost" onClick={onToggle} data-testid="fc-neck-expand" title="Expand to full 5-Layer Fretboard">5-Layer ⤢</button>
      </div>
      <Fretboard tuning={tuning} fromFret={base} toFret={base + 5} compact
        markFor={m => {
          const p = ((m % 12) + 12) % 12
          if (look.has(p) && !(info && p === info.root)) return { label: midiName(m, !!c.flats).replace(/\d+$/, ''), role: 'look' }
          if (info && p === info.root) return { label: midiName(m, !!c.flats).replace(/\d+$/, ''), role: 'root' }
          if (tones.has(p)) return { label: midiName(m, !!c.flats).replace(/\d+$/, ''), role: 'chord' }
          if (pcs?.includes(p)) return { label: '', role: 'scale' }
          return null
        }} />
    </div>
  )
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

/** Band behind me's mixer: a slider per part (your part, drums, bass, other parts) with mute (M) and solo (S), and the
 *  chord band's style. Levels stay (kg:bus:*); mute and solo are for now. */
function MixerBody({ band }: { band?: FloatCtx['band'] }) {
  const [, bump] = useState(0)
  useEffect(() => { const f = () => bump(n => n + 1); const a = onBuses(f), b = onMixer(f); return () => { a(); b() } }, [])
  const parts = MIX_PARTS.filter(p => p.id === 'me' || band?.parts.includes(p.id as 'drums' | 'bass' | 'other'))
  const anyOff = MIX_PARTS.some(p => isMuted(p.id) || isSolo(p.id))
  return (
    <div className="fc-mixer stack" style={{ gap: 6 }} data-testid="fc-mixer">
      {!band && <p className="small muted" style={{ margin: 0 }}>This song has no band: only your part (the guide) plays along.</p>}
      {parts.map(p => (
        <div key={p.id} className={`fc-mix-row${audible(p.id) ? '' : ' off'}`}>
          <span className="small fc-mix-name">{p.label}</span>
          <input type="range" min={0} max={150} value={Math.round(busLevel(p.id as BusName) * 100)} aria-label={`${p.label} volume`}
            onChange={e => setBusLevel(p.id as BusName, Number(e.target.value) / 100)} onDoubleClick={() => setBusLevel(p.id as BusName, 1)} data-testid={`mix-${p.id}`} />
          <button className={`fc-mix-b${isMuted(p.id) ? ' on' : ''}`} aria-pressed={isMuted(p.id)} onClick={() => toggleMute(p.id)} aria-label={`Mute ${p.label}`} data-testid={`mute-${p.id}`}>M</button>
          <button className={`fc-mix-b${isSolo(p.id) ? ' on solo' : ''}`} aria-pressed={isSolo(p.id)} onClick={() => toggleSolo(p.id)} aria-label={`Solo ${p.label}`} data-testid={`solo-${p.id}`}>S</button>
        </div>
      ))}
      {band?.styles && band.setStyle && (
        <label className="row small" style={{ gap: 6, alignItems: 'center' }}>Band style
          <select className="select" value={band.style} onChange={e => band.setStyle!(e.target.value)} data-testid="mix-style">
            {band.styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      )}
      {anyOff && <button className="link-btn small" style={{ alignSelf: 'flex-start' }} onClick={resetMixer}>Unmute everything</button>}
    </div>
  )
}
