// The little ✨ helper bubble on every screen: tap it to open the helper (chat + search). Next to it, 🎤 Talk is the
// hands-free helper: tap it, say what you want ("slower", "loop bars 5 to 8 at 70 percent", "explain this hand
// position", "what does an augmented chord do?") and it answers in a small card and out loud, without covering the
// tab. Loop and speed changes happen straight away. "Keep talking" listens again after each answer.
// Drag the bubble anywhere (it snaps to the nearest side); hide it in Settings → You.
import { useEffect, useMemo, useRef, useState } from 'react'
import { askAssistant, type AskContext } from './bus'
import { usePersist } from '../components/Controls'
import { canListen, listenOnce, setTalking, stopListening } from './listen'
import { plan, type Answer } from './plan'
import { addQuestion, answerTurn, history } from './chat'
import { onSpeaking, speak, stopSpeaking } from './speak'
import { SearchIndex, searchAll } from '../search/engine'
import { FEATURES } from '../search/catalog'
import { libraryEntries } from '../search/sources'
import { useInstrument } from '../instrument'
import { playAction } from '../nav'
import { applyBeatChange } from '../studio/beat'
import { launch } from '../search/launch'
import { startSession } from '../sessions/session'

type Phase = 'idle' | 'listening' | 'thinking' | 'answer' | 'error'
const SORRY: Record<string, string> = {
  nothing: "I didn't catch anything. Tap 🎤 and talk after the beep.",
  network: 'Speech needs the internet on this phone. Check the connection.',
  permission: 'KGuitar needs the microphone to hear you. Allow it in the phone\'s settings.',
  busy: 'The phone\'s speech service is busy. Try again in a moment.',
  unavailable: 'This phone has no speech recognition. Install or update the Google app, then try again.',
  error: 'Something went wrong listening. Try again.',
}

export function AskBubble({ context }: { context: AskContext }) {
  const read = () => { try { return JSON.parse(localStorage.getItem('kg:askBubble') ?? 'true') as boolean } catch { return true } }
  const [show, setShow] = useState(read)
  useEffect(() => { const f = () => setShow(read()); addEventListener('kg-bubble', f); return () => removeEventListener('kg-bubble', f) }, [])
  const [y, setY] = usePersist('askBubbleY', 0.72)
  const [side, setSide] = usePersist<'left' | 'right'>('askBubbleSide', 'right')
  const [x, setX] = useState<number | null>(null)
  const drag = useRef<{ x0: number; y0px: number; y0: number; moved: boolean } | null>(null)
  const dragged = useRef(false)

  // ── hands-free talk
  const inst = useInstrument()
  const index = useMemo(() => new SearchIndex([...FEATURES, ...libraryEntries(inst, [])]), [inst])
  const [phase, setPhase] = useState<Phase>('idle')
  const [words, setWords] = useState('')
  const [level, setLevel] = useState(0)
  const [card, setCard] = useState<{ q: string; a: Answer; did?: string } | null>(null)
  const [err, setErr] = useState('')
  const [soFar, setSoFar] = useState('')
  const [again, setAgain] = usePersist('talkAgain', false)
  const [voiceOn, setVoiceOn] = usePersist('talkVoice', true)
  const live = useRef({ again, voiceOn, misses: 0, alive: true, hideT: 0 })
  live.current.again = again
  live.current.voiceOn = voiceOn
  useEffect(() => () => { live.current.alive = false; stopListening(); setTalking(false); clearTimeout(live.current.hideT) }, [])

  const hideLater = (ms: number) => { clearTimeout(live.current.hideT); live.current.hideT = window.setTimeout(() => { if (!live.current.again) { setCard(null); setPhase('idle') } }, ms) }
  const close = () => { live.current.again = false; setAgain(false); stopListening(); stopSpeaking(); setTalking(false); setCard(null); setErr(''); setPhase('idle'); clearTimeout(live.current.hideT) }

  async function talk() {
    if (phase === 'listening') { stopListening(); return }
    clearTimeout(live.current.hideT)
    stopSpeaking()
    setErr('')
    setWords('')
    setPhase('listening')
    setTalking(true)
    const h = await listenOnce(setWords, v => setLevel(v))
    if (!live.current.alive) return
    if (!h.text) {
      setTalking(false)
      live.current.misses++
      if (h.error === 'nothing' && live.current.again && live.current.misses < 3) { void talk(); return }
      setErr(SORRY[h.error ?? 'nothing'] ?? SORRY.error)
      setPhase('error')
      hideLater(6000)
      return
    }
    live.current.misses = 0
    setPhase('thinking')
    const past = history()
    const id = addQuestion(h.text)
    setSoFar('')
    const a = await plan(h.text, searchAll(index, h.text, inst, 12), context, past, setSoFar)
    answerTurn(id, a)
    if (!live.current.alive) return
    // you're playing: loop / speed / beat changes happen straight away
    let did: string | undefined
    if (a.play) { playAction({ ...(a.play.loop !== undefined ? { loop: a.play.loop } : {}), ...(a.play.speed ? { speed: a.play.speed } : {}) }); did = a.play.label }
    if (a.beat && context === 'beat') { applyBeatChange(a.beat); did = 'Changed your beat' }
    setCard({ q: h.text, a, did })
    setPhase('answer')
    const text = [did && a.reply.startsWith('Okay:') ? `Done. ${did}.` : did ? `Done. ${a.reply}` : a.reply, ...(a.ideas ?? [])].join(' ')
    if (live.current.voiceOn) {
      await speak(text, { gemini: a.ai })
      // wait for the voice to finish, then (Keep talking) listen again
      await new Promise<void>(res => { const off = onSpeaking(on => { if (!on) { off(); res() } }); setTimeout(() => { off(); res() }, 60000) })
    }
    setTalking(false)
    if (!live.current.alive) return
    if (live.current.again) { void talk(); return }
    hideLater(12000)
  }

  if (!show) return null
  const talkOk = canListen()
  const top = `calc(${Math.round(y * 100)}% - 28px)`
  const placeSide = x !== null ? { left: x - 26, right: 'auto' } : side === 'left' ? { left: 10, right: 'auto' } : {}
  const busy = phase === 'listening' || phase === 'thinking'
  return (
    <>
      <button className="ask-bubble" style={{ top, ...placeSide }} aria-label="Open the helper (chat and search)"
        onPointerDown={e => { drag.current = { x0: e.clientX, y0px: e.clientY, y0: y, moved: false }; try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* fine */ } }}
        onPointerMove={e => {
          const d = drag.current
          if (!d) return
          // a tap wobbles a little: only a real drag (more than 14 px) moves the bubble
          if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0px) > 14) d.moved = true
          if (d.moved) { setY(Math.max(0.08, Math.min(0.88, d.y0 + (e.clientY - d.y0px) / innerHeight))); setX(e.clientX) }
        }}
        onPointerUp={e => { const d = drag.current; drag.current = null; dragged.current = !!d?.moved; if (d?.moved) { setSide(e.clientX < innerWidth / 2 ? 'left' : 'right'); setX(null) } }}
        onPointerCancel={() => { drag.current = null; setX(null) }}
        // open on the click (not on finger-up): opening on finger-up let the same tap land on the helper's dark
        // background a moment later and close it again, which is why it sometimes didn't open
        onClick={() => { if (dragged.current) { dragged.current = false; return } askAssistant('', context, false) }}>
        <span aria-hidden>✨</span>
      </button>
      {talkOk && (
        <button className={`talk-btn${busy ? ' on' : ''}`} style={{ top: `calc(${Math.round(y * 100)}% + 30px)`, ...(x !== null ? { left: x - 20, right: 'auto' } : side === 'left' ? { left: 16, right: 'auto' } : {}) }}
          onClick={() => void talk()} aria-label={phase === 'listening' ? 'Stop listening' : 'Talk to the helper'} aria-pressed={busy} data-testid="talk-btn">
          <span aria-hidden>{phase === 'listening' ? '■' : '🎤'}</span>
          {phase === 'listening' && <span className="talk-level" style={{ transform: `scale(${1 + Math.min(1, Math.max(0, level) / 10) * 0.5})` }} aria-hidden />}
        </button>
      )}
      {phase !== 'idle' && (
        <div className={`talk-card ${side === 'left' && x === null ? 'from-left' : 'from-right'}`} style={{ top: `max(8px, min(calc(${Math.round(y * 100)}% - 40px), calc(100% - 260px)))` }} role="status" aria-live="polite" data-testid="talk-card">
          {phase === 'listening' && <p className="talk-line"><b>🎤 Listening…</b> {words ? <span>“{words}”</span> : <span className="muted">say it now</span>}</p>}
          {phase === 'thinking' && <p className="talk-line"><b>“{words}”</b> {soFar ? <span className="talk-a">{soFar}</span> : <span className="muted">thinking…</span>}</p>}
          {phase === 'error' && <p className="talk-line">{err}</p>}
          {phase === 'answer' && card && (
            <>
              <p className="talk-q small muted">“{card.q}”</p>
              {card.did && <p className="talk-did">✓ {card.did}</p>}
              {!(card.did && card.a.reply.startsWith('Okay:')) && <p className="talk-a">{card.a.reply}</p>}
              {card.a.ideas && <ul className="talk-ideas small">{card.a.ideas.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}</ul>}
              <div className="row talk-acts">
                {card.a.session && <button className="btn sm primary" onClick={() => { close(); startSession(card.a.session!) }}>▶ Start “{card.a.session.title}”</button>}
                {card.a.open && <button className="btn sm" onClick={() => { close(); launch(card.a.open!.target) }}>Open {card.a.open.title}</button>}
              </div>
            </>
          )}
          <div className="row talk-foot">
            <label className="row small"><input type="checkbox" checked={again} onChange={e => { setAgain(e.target.checked); live.current.again = e.target.checked; if (e.target.checked && phase !== 'listening' && phase !== 'thinking') void talk() }} /> Keep talking</label>
            <label className="row small"><input type="checkbox" checked={voiceOn} onChange={e => { setVoiceOn(e.target.checked); if (!e.target.checked) stopSpeaking() }} /> Voice</label>
            <button className="btn sm ghost" onClick={() => { close(); askAssistant('', context, false) }}>Chat</button>
            <button className="btn sm ghost" onClick={close} aria-label="Close">✕</button>
          </div>
        </div>
      )}
    </>
  )
}
