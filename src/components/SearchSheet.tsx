// Search: type what you want in your own words ("slow it down", "G7", "drop D", "blues jam in A", "it doesn't hear
// me") and tap a result to go straight there, already set up.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useInstrument } from '../instrument'
import { listSongs, type SongDoc } from '../tabs/library'
import { SearchIndex, searchAll } from '../search/engine'
import { FEATURES } from '../search/catalog'
import { libraryEntries } from '../search/sources'
import { launch } from '../search/launch'
import { KIND_LABEL, type Result } from '../search/types'
import { TAB_SITES } from '../tabs/tabSites'
import { IconSearch } from './Icons'
import { plan, type Answer } from '../assistant/plan'
import { addQuestion, answerTurn, chat, clearChat, history, onChat } from '../assistant/chat'
import { canSpeak, hasGeminiVoice, isSpeaking, onSpeaking, speak, stopSpeaking } from '../assistant/speak'
import { usePersist } from './Controls'
import type { AskContext } from '../assistant/bus'
import { minutesOf, saveSession, startSession } from '../sessions/session'
import { applyBeatChange } from '../studio/beat'
import { playAction } from '../nav'
import { screenInfo } from '../assistant/screen'

const TRY = ['I want to practise triads today', 'Teach me Marco Cirillo style fingerstyle', 'CAGED with little melodies in between', 'Chord tones and soloing in A minor', 'Make me a trap beat at 140', 'slow it down', 'G7 chord', 'drop D', "it doesn't hear me"]
const EXAMPLES = ['I want to practise triads today…', 'Help me learn Marco Cirillo style…', 'Chord tones and soloing in G…', 'Make a lo-fi beat at 80 BPM…', 'Why doesn\'t it hear my notes?…', 'Show me a G7 chord…', 'A 20 minute blues session in A…']
const RECENT = 'kg:searchRecent'
const recent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT) ?? '[]') } catch { return [] } }
const remember = (q: string) => {
  try { localStorage.setItem(RECENT, JSON.stringify([q, ...recent().filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, 6))) } catch { /* storage unavailable */ }
}

export function SearchSheet({ onClose, initial = '', context = 'general', autoAsk = false }: { onClose: () => void; initial?: string; context?: AskContext; autoAsk?: boolean }) {
  const inst = useInstrument()
  const [q, setQ] = useState(initial)
  const [songs, setSongs] = useState<SongDoc[]>([])
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const [ex, setEx] = useState(0)
  useEffect(() => { const id = setInterval(() => setEx(i => (i + 1) % EXAMPLES.length), 3200); return () => clearInterval(id) }, [])
  const turns = useSyncExternalStore(onChat, chat)
  const [asking, setAsking] = useState(false)
  const [voice, setVoice] = usePersist('askVoice', false)
  const speakingNow = useSyncExternalStore(onSpeaking, isSpeaking)
  const convo = useRef<HTMLDivElement>(null)
  useEffect(() => { convo.current?.scrollTo({ top: convo.current.scrollHeight, behavior: 'smooth' }) }, [turns])
  useEffect(() => () => stopSpeaking(), [])
  const [voiceNote, setVoiceNote] = useState('')
  // AI answers are read in Gemini's voice (Settings → You → AI helper); the built-in helper keeps the phone's voice
  const say = (a: Answer) => {
    setVoiceNote(a.ai && hasGeminiVoice() ? 'Getting Gemini\'s voice…' : '')
    void speak([a.reply, ...(a.ideas ?? []), ...(a.session ? [`${a.session.title}, about ${minutesOf(a.session)} minutes.`] : [])].join(' '), { gemini: a.ai }).then(w => {
      setVoiceNote(a.ai && hasGeminiVoice() && w === 'phone' ? 'Gemini\'s voice was busy, so the phone\'s voice read it.' : '')
    })
  }
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    let alive = true
    void listSongs(inst.id).then(s => { if (alive) setSongs(s) }).catch(() => {})
    return () => { alive = false }
  }, [inst.id])
  const index = useMemo(() => new SearchIndex([...FEATURES, ...libraryEntries(inst, songs)]), [inst, songs])
  const results = useMemo(() => (q.trim() ? searchAll(index, q, inst, 12) : []), [index, q, inst])
  useEffect(() => { setActive(0) }, [q])
  const doAsk = async (text = q) => {
    const t = text.trim()
    if (!t) return
    remember(t)
    stopSpeaking()
    const past = history()
    const id = addQuestion(t)
    setQ('')
    setAsking(true)
    const rs = searchAll(index, t, inst, 12)
    const a = await plan(t, rs, context, past)
    answerTurn(id, a)
    setAsking(false)
    if (voice) say(a)
  }
  const auto = useRef(autoAsk)
  useEffect(() => { if (auto.current && initial) { auto.current = false; void doAsk(initial) } }) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 40)
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', k)
    return () => { clearTimeout(t); removeEventListener('keydown', k) }
  }, [onClose])
  useEffect(() => { list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active])

  const seen = useMemo(() => screenInfo(), [])
  // a tap that opened the helper must not also close it
  const openedAt = useRef(Date.now())
  const open = (r: Result) => {
    remember(q.trim())
    onClose()
    launch(r.target)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      // a short query that clearly matches opens it; anything else is a question for the assistant
      const words = q.trim().split(/\s+/).length
      if (results[active] && results[active].score >= 60 && words <= 3) open(results[active]); else void doAsk()
    }
  }
  const strong = results.length > 0 && results[0].score >= 60
  const wantsTab = /\b(tab|tabs|chords? (for|to)|song by|by the)\b/i.test(q)
  const past = recent()

  return (
    <div className="sheet-backdrop search-backdrop" onClick={() => { if (Date.now() - openedAt.current > 450) onClose() }}>
      <div className="sheet search-sheet" role="dialog" aria-modal="true" aria-label="Search and ask KGuitar" onClick={e => e.stopPropagation()}>
        <div className="search-bar">
          <span className="search-icon" aria-hidden><IconSearch /></span>
          <input ref={input} className="input search-input" type="search" enterKeyHint="go" value={q} autoComplete="off" spellCheck={false}
            placeholder={EXAMPLES[ex]} aria-label="Search or ask KGuitar" aria-controls="search-results" aria-activedescendant={results[active] ? `sr-${active}` : undefined}
            onChange={e => setQ(e.target.value)} onKeyDown={onKey} />
          {q && <button className="btn sm ghost search-clear" onClick={() => { setQ(''); input.current?.focus() }} aria-label="Clear">✕</button>}
          <button className="btn sm" onClick={onClose}>Close</button>
        </div>

        {seen && <p className="ask-sees small" data-testid="ask-sees">👀 I can see: {seen.label}. Ask about it ("why is this bar hard?", "loop this bar slower").</p>}
        {!q.trim() && !turns.length && (
          <div className="search-start stack">
            <p className="small muted" style={{ margin: 0 }}>Tip: tap the 🎤 on your phone's keyboard to say it instead of typing. Search or ask in your own words. Ask for a practice session ("triads today"), a beat, a chord or scale, or help with a problem: it finds it and sets it up.</p>
            {past.length > 0 && (
              <div className="stack" style={{ gap: 6 }}>
                <h3 className="search-h">Recent</h3>
                <div className="search-chips">{past.map(p => <button key={p} className="chip" onClick={() => setQ(p)}>{p}</button>)}</div>
              </div>
            )}
            <div className="stack" style={{ gap: 6 }}>
              <h3 className="search-h">Try</h3>
              <div className="search-chips">{TRY.map(p => <button key={p} className="chip" onClick={() => { setQ(p); void doAsk(p) }}>{p}</button>)}</div>
            </div>
          </div>
        )}

        {q.trim() && (
          <div className="ask-row">
            <button className="btn primary ask-btn" onClick={() => void doAsk()} disabled={asking}>{asking ? 'Thinking…' : `✨ Ask: “${q.trim().length > 40 ? q.trim().slice(0, 40) + '…' : q.trim()}”`}</button>
          </div>
        )}
        {turns.length > 0 && (
          <div className="ask-convo" ref={convo} aria-live="polite">
            {turns.map(t => (
              <div key={t.id} className="ask-turn">
                <div className="ask-q">{t.q}</div>
                {!t.answer ? <div className="ask-a thinking">Thinking…</div> : (
                  <div className="ask-a">
                    <p style={{ margin: 0 }}>{t.answer.reply}</p>
                    {t.answer.ideas && <ul className="ask-steps">{t.answer.ideas.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                    {t.answer.session && (
                      <>
                        <b>{t.answer.session.title} · about {minutesOf(t.answer.session)} min</b>
                        <ol className="ask-steps">{t.answer.session.steps.map((x, i) => <li key={i}>{x.title} <span className="muted small">({x.minutes} min)</span></li>)}</ol>
                        <div className="row" style={{ gap: 6 }}>
                          <button className="btn primary sm" onClick={() => { onClose(); startSession(t.answer!.session!) }}>▶ Start this session</button>
                          <button className="btn sm" onClick={() => { saveSession(t.answer!.session!); answerTurn(t.id, { ...t.answer!, note: 'Saved: it waits in Learn → Today → My practice sessions.' }) }}>Save it</button>
                        </div>
                      </>
                    )}
                    {t.answer.beat && <button className="btn primary sm" onClick={() => { applyBeatChange(t.answer!.beat!); onClose() }}>Apply to my beat</button>}
                    {t.answer.play && <button className="btn primary sm" onClick={() => { const c = t.answer!.play!; playAction({ ...(c.loop !== undefined ? { loop: c.loop } : {}), ...(c.speed ? { speed: c.speed } : {}) }); onClose() }}>▶ {t.answer.play.label}</button>}
                    {t.answer.open && <button className="btn sm" onClick={() => open(t.answer!.open!)}>Open {t.answer.open.title}</button>}
                    <div className="row" style={{ gap: 6, justifyContent: 'space-between' }}>
                      {t.answer.note ? <span className="small muted">{t.answer.note}</span> : <span />}
                      {canSpeak() && <button className="btn sm ghost" onClick={() => (speakingNow ? stopSpeaking() : say(t.answer!))} aria-label="Read this answer aloud">{speakingNow ? '■ Stop' : '🔊 Hear it'}</button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="row small" style={{ gap: 8, justifyContent: 'space-between' }}>
              <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={voice} onChange={e => { setVoice(e.target.checked); if (!e.target.checked) stopSpeaking() }} /> Read answers aloud</label>
              {voiceNote && <span className="small muted">{voiceNote}</span>}
              <button className="btn sm ghost" onClick={() => { stopSpeaking(); clearChat() }}>New conversation</button>
            </div>
          </div>
        )}
        {q.trim() && results.length > 0 && (
          <ul ref={list} id="search-results" className="search-results" role="listbox" aria-label="Results">
            {results.map((r, i) => (
              <li key={r.id} role="presentation">
                <button id={`sr-${i}`} data-i={i} role="option" aria-selected={i === active} className={`search-hit${i === active ? ' on' : ''}`}
                  onClick={() => open(r)} onMouseEnter={() => setActive(i)}>
                  <span className="hit-top"><b className="hit-title">{r.title}</b><span className={`hit-kind k-${r.kind}`}>{KIND_LABEL[r.kind]}</span></span>
                  <span className="hit-where">{r.where}</span>
                  <span className="hit-text">{r.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {q.trim() && !results.length && (
          <div className="search-none stack">
            <p style={{ margin: 0 }}>Nothing in KGuitar matches “{q.trim()}”.</p>
            <p className="small muted" style={{ margin: 0 }}>Try other words (“slower”, “tuner”, “chords”), or read the guide.</p>
            <button className="btn sm" onClick={() => { onClose(); launch({ go: { tool: 'guide' } }) }}>Open How to use KGuitar</button>
          </div>
        )}

        {q.trim().length > 1 && (!strong || wantsTab) && (
          <div className="search-web">
            <span className="small muted">Looking for a song's tab? Search for “{q.trim()}” on</span>
            <div className="search-chips">
              {TAB_SITES.map(s => <a key={s.id} className="chip" href={s.url(q.trim())} target="_blank" rel="noreferrer">{s.label}</a>)}
            </div>
            <span className="small muted">then share it to KGuitar, or paste it in Songs → Add a song.</span>
          </div>
        )}
      </div>
    </div>
  )
}
