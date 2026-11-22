// Four creative & reference floating cards:
//   #5 LicksCardBody   — Live Licks & Fills That Fit (Must-Know Licks + Fills Workshop, auto-transposed, Hear + Open in Play)
//   #6 CircleCardBody  — Mini Circle of Fifths & Key Cheat-Sheet (tap to hear + light up 5-Layer Fretboard + "+ Band")
//   #7 StickyNoteBody  — Per-Song / Per-Lesson Sticky Note (quick tags + 🎤 Voice Dictate)
//   #8 BookRefBody     — Mini Book & Tab Reference Card (My Books PDF pages or uploaded image, zoom/pan, bookmarks, Scan page)
import { useEffect, useMemo, useRef, useState } from 'react'
import { Ico } from '../components/Icon'
import { CircleOfFifths } from '../components/CircleOfFifths'
import { useInstrument } from '../instrument'
import { audio } from '../audio/engine'
import { activeSound, strum } from '../audio/pluck'
import { TabPlayer } from '../audio/tabPlayer'
import { flatten, type Song } from '../tabs/model'
import { newId, saveSong, type SongDoc } from '../tabs/library'
import { chordInfo } from '../tabs/harmony'
import { parseSymbol } from '../theory/chords'
import { KEYS, pc, SHARPS } from '../theory/notes'
import { LICKS } from '../licks/library'
import { lickInKey, licksForChord } from '../licks/generator'
import { workshop, type FillStyle } from '../fills/make'
import { songTabText } from '../scan/tabReadSong'
import { stringNames } from '../tabs/importer'
import { listBooks, bookPdf, type BookMeta } from '../books/store'
import { openInPlay, openScanner } from '../nav'
import { emitBandAddChord, publishFloat, useFloatScreen, type FloatCtx } from './bus'

function activeKeyOf(c: FloatCtx): { root: string; minor: boolean } {
  if (c.keyName) {
    const m = /^([A-G][#b]?)\s*(m(?!aj)|min)?/i.exec(c.keyName)
    if (m) return { root: m[1], minor: !!m[2] }
  }
  try {
    const r = JSON.parse(localStorage.getItem('kg:progKey') ?? '"G"') as string
    const md = JSON.parse(localStorage.getItem('kg:progMode') ?? '"major"') as string
    return { root: r || 'G', minor: /min|aeolian|dorian|phrygian/i.test(md) }
  } catch { return { root: 'G', minor: false } }
}

// ---------- #5: Live "Licks & Fills That Fit" Floating Card ----------
export function LicksCardBody({ ctx }: { ctx: FloatCtx }) {
  const inst = useInstrument()
  const [source, setSource] = useState<'licks' | 'fills'>('licks')
  const [scope, setScope] = useState<'chord' | 'key'>('key')
  const [fillStyle, setFillStyle] = useState<FillStyle>('mayer')
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const player = useRef<TabPlayer | null>(null)
  useEffect(() => () => player.current?.stop(), [])

  const key = activeKeyOf(ctx)
  const bpm = ctx.bpm ?? 92
  const activeChord = ctx.chordNow || `${key.root}${key.minor ? 'm' : ''}`

  const items = useMemo<{ title: string; sub: string; song: Song }[]>(() => {
    if (source === 'fills') {
      const baseProg = ctx.chordNow && ctx.chordNext && ctx.chordNext !== ctx.chordNow
        ? [ctx.chordNow, ctx.chordNext]
        : [activeChord, SHARPS[(pc(key.root) + 5) % 12]]
      try {
        const w = workshop({ chords: baseProg, key: key.root, bpm, style: fillStyle, tuning: inst.midis })
        return w.steps.map(st => ({ title: st.title, sub: `${fillStyle} fill · ${key.root}`, song: st.song }))
      } catch { return [] }
    }
    // Must-Know Licks
    if (scope === 'chord' && ctx.chordNow) {
      try {
        const parsed = parseSymbol(ctx.chordNow.split('/')[0])
        const hits = licksForChord(parsed.root, parsed.suffix).slice(0, 20)
        return hits.map(h => {
          const built = lickInKey(h.l, parsed.root, inst.midis, bpm, h.from)
          return built ? { title: h.l.name, sub: `${h.l.style} · over ${ctx.chordNow}`, song: built.song } : null
        }).filter((x): x is { title: string; sub: string; song: Song } => !!x)
      } catch { /* fall through to key */ }
    }
    const pool = LICKS.filter(l => l.must).slice(0, 40)
    return pool.map(l => {
      const built = lickInKey(l, key.root, inst.midis, bpm)
      return built ? { title: l.name, sub: `${l.style} · in ${key.root}${key.minor ? 'm' : ''}`, song: built.song } : null
    }).filter((x): x is { title: string; sub: string; song: Song } => !!x)
  }, [source, scope, fillStyle, ctx.chordNow, ctx.chordNext, activeChord, key.root, key.minor, bpm, inst.midis])

  const cur = items.length ? items[((idx % items.length) + items.length) % items.length] : null
  const tabPreview = useMemo(() => {
    if (!cur) return ''
    try {
      const mini: Song = { ...cur.song, tracks: [{ ...cur.song.tracks[0], bars: cur.song.tracks[0].bars.slice(0, 2) }] }
      return songTabText(mini, stringNames(inst))
    } catch { return '' }
  }, [cur, inst])

  const hear = () => {
    if (!cur) return
    if (playing) { player.current?.stop(); setPlaying(false); return }
    const p = (player.current ??= new TabPlayer())
    p.sound = activeSound()
    p.onEnd = () => setPlaying(false)
    p.play(flatten(cur.song.tracks[0]), 0, bpm)
    setPlaying(true)
  }

  const sendToPlay = async () => {
    if (!cur) return
    const doc: SongDoc = { id: newId(), title: cur.title, source: 'text', inst: inst.id, song: cur.song, updated: Date.now() }
    await saveSong(doc)
    openInPlay(doc)
  }

  return (
    <div className="stack small" style={{ gap: 6 }} data-testid="fc-licks">
      <div className="row" style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="seg" role="group" aria-label="Idea source">
          <button className="btn sm" aria-pressed={source === 'licks'} onClick={() => { setSource('licks'); setIdx(0) }}>Licks</button>
          <button className="btn sm" aria-pressed={source === 'fills'} onClick={() => { setSource('fills'); setIdx(0) }}>Fills</button>
        </div>
        {source === 'licks' ? (
          <div className="seg" role="group" aria-label="Lick scope">
            <button className="btn sm" aria-pressed={scope === 'key'} onClick={() => { setScope('key'); setIdx(0) }}>Key ({key.root}{key.minor ? 'm' : ''})</button>
            <button className="btn sm" aria-pressed={scope === 'chord'} onClick={() => { setScope('chord'); setIdx(0) }}>Chord ({activeChord})</button>
          </div>
        ) : (
          <select className="select sm" style={{ width: 'auto' }} value={fillStyle} onChange={e => { setFillStyle(e.target.value as FillStyle); setIdx(0) }}>
            <option value="mayer">John Mayer</option>
            <option value="asato">Mateus Asato</option>
            <option value="metal">Metal Fills</option>
          </select>
        )}
      </div>
      {cur ? (
        <>
          <div className="row" style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ minWidth: 0 }}><b>{cur.title}</b> <span className="muted">· {cur.sub}</span></span>
            <span className="row" style={{ gap: 3, flexWrap: 'nowrap' }}>
              <button className="btn sm ghost" onClick={() => setIdx(i => i - 1)} aria-label="Previous idea">◀</button>
              <button className="btn sm ghost" onClick={() => setIdx(i => i + 1)} aria-label="Next idea">▶</button>
            </span>
          </div>
          {tabPreview && <pre className="mono fc-mini-tab">{tabPreview}</pre>}
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm${playing ? ' on' : ' primary'}`} onClick={hear}><Ico n={playing ? 'stop' : 'play'} fill /> {playing ? 'Stop' : 'Hear it'}</button>
            <button className="btn sm" onClick={() => void sendToPlay()}>Open in Play</button>
          </div>
        </>
      ) : (
        <span className="muted">No matching ideas for this chord yet — switch to Key mode.</span>
      )}
    </div>
  )
}

// ---------- #6: Mini Circle of Fifths & Key Cheat-Sheet Floating Card ----------
export function CircleCardBody({ ctx }: { ctx: FloatCtx }) {
  const [view, setView] = useState<'strip' | 'wheel'>('strip')
  const detected = activeKeyOf(ctx)
  const [root, setRoot] = useState(detected.root)
  const [minor, setMinor] = useState(detected.minor)
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    if (ctx.keyName) {
      const k = activeKeyOf(ctx)
      setRoot(k.root); setMinor(k.minor)
    }
  }, [ctx.keyName])

  const p = pc(root)
  const diatonic = minor
    ? [
        { deg: 'i', ch: `${SHARPS[p]}m` },
        { deg: 'ii°', ch: `${SHARPS[(p + 2) % 12]}dim` },
        { deg: '♭III', ch: SHARPS[(p + 3) % 12] },
        { deg: 'iv', ch: `${SHARPS[(p + 5) % 12]}m` },
        { deg: 'v', ch: `${SHARPS[(p + 7) % 12]}m` },
        { deg: '♭VI', ch: SHARPS[(p + 8) % 12] },
        { deg: '♭VII', ch: SHARPS[(p + 10) % 12] },
      ]
    : [
        { deg: 'I', ch: SHARPS[p] },
        { deg: 'ii', ch: `${SHARPS[(p + 2) % 12]}m` },
        { deg: 'iii', ch: `${SHARPS[(p + 4) % 12]}m` },
        { deg: 'IV', ch: SHARPS[(p + 5) % 12] },
        { deg: 'V', ch: SHARPS[(p + 7) % 12] },
        { deg: 'vi', ch: `${SHARPS[(p + 9) % 12]}m` },
        { deg: 'vii°', ch: `${SHARPS[(p + 11) % 12]}dim` },
      ]

  const borrowed = minor
    ? [
        { deg: 'V7', ch: `${SHARPS[(p + 7) % 12]}7` },
        { deg: 'IV', ch: SHARPS[(p + 5) % 12] },
        { deg: '♭II', ch: SHARPS[(p + 1) % 12] },
      ]
    : [
        { deg: 'iv', ch: `${SHARPS[(p + 5) % 12]}m` },
        { deg: '♭VII', ch: SHARPS[(p + 10) % 12] },
        { deg: 'V7/V', ch: `${SHARPS[(p + 2) % 12]}7` },
        { deg: 'V7/vi', ch: `${SHARPS[(p + 4) % 12]}7` },
      ]

  const hitChord = (ch: string) => {
    setPicked(ch)
    const info = chordInfo(ch)
    if (info) {
      const cAudio = audio()
      void cAudio.resume()
      const base = 48 + info.root
      const midis = info.pcs.map(x => base + ((x - info.root + 12) % 12)).sort((a, b) => a - b)
      strum([...midis, base + 12], cAudio.currentTime + 0.02, { gain: 0.72, sound: activeSound() })
      // Light up this chord on your floating 5-Layer Fretboard too!
      const scaleSteps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
      publishFloat('circle', {
        chordNow: ch,
        keyName: `${root}${minor ? 'm' : ''}`,
        keyPcs: scaleSteps.map(s => (p + s) % 12),
      })
    }
  }

  return (
    <div className="stack small" style={{ gap: 6 }} data-testid="fc-circle">
      <div className="row" style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span className="row" style={{ gap: 4 }}>
          <select className="select sm" style={{ width: 60 }} value={root} onChange={e => setRoot(e.target.value)} aria-label="Key">
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div className="seg" role="group" aria-label="Major or minor">
            <button className="btn sm" aria-pressed={!minor} onClick={() => setMinor(false)}>Maj</button>
            <button className="btn sm" aria-pressed={minor} onClick={() => setMinor(true)}>Min</button>
          </div>
        </span>
        <div className="seg" role="group" aria-label="View">
          <button className="btn sm" aria-pressed={view === 'strip'} onClick={() => setView('strip')}>Key Strip</button>
          <button className="btn sm" aria-pressed={view === 'wheel'} onClick={() => setView('wheel')}>Wheel</button>
        </div>
      </div>

      {view === 'strip' ? (
        <div className="stack" style={{ gap: 5 }}>
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {diatonic.map(d => (
              <button key={d.deg} className={`btn sm${picked === d.ch ? ' primary' : ''}`} onClick={() => hitChord(d.ch)} style={{ padding: '2px 8px' }}>
                <span className="muted" style={{ fontSize: 10, marginRight: 3 }}>{d.deg}</span><b>{d.ch}</b>
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 11 }}>Color:</span>
            {borrowed.map(d => (
              <button key={d.deg} className={`btn sm${picked === d.ch ? ' primary' : ' ghost'}`} onClick={() => hitChord(d.ch)} style={{ padding: '2px 7px' }}>
                <span className="muted" style={{ fontSize: 10, marginRight: 3 }}>{d.deg}</span><b>{d.ch}</b>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CircleOfFifths
            tonic={root}
            minor={minor}
            active={picked ? (() => { const m = /^([A-G][#b]?)(m(?!aj)|dim)?/.exec(picked); return m ? { root: m[1], minor: m[2] === 'm', dim: m[2] === 'dim' } : null })() : null}
            size={220}
            onPick={(r, m) => hitChord(`${r}${m ? 'm' : ''}`)}
          />
        </div>
      )}

      {picked && (
        <div className="row" style={{ gap: 6, alignItems: 'center', justifyContent: 'space-between', paddingTop: 3, borderTop: '1px solid var(--hairline)' }}>
          <span>Picked <b>{picked}</b> (lit on 5-Layer Neck)</span>
          <button className="btn sm primary" onClick={() => emitBandAddChord(picked)} data-testid="circle-add-band">+ Add to Band</button>
        </div>
      )}
    </div>
  )
}

// ---------- #7: Per-Song / Per-Lesson Sticky Note Floating Card (+ 🎤 Dictate) ----------
export function StickyNoteBody({ ctx }: { ctx: FloatCtx }) {
  const screen = useFloatScreen()
  const [scope, setScope] = useState<'item' | 'general'>('item')
  const itemKey = ctx.title ? `song:${ctx.title}` : `screen:${screen}`
  const storeKey = `kg:stickyNote:${scope === 'item' ? itemKey : 'general'}`

  const [text, setText] = useState(() => { try { return localStorage.getItem(storeKey) ?? '' } catch { return '' } })
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('')
  const recRef = useRef<{ stop(): void } | null>(null)

  useEffect(() => {
    try { setText(localStorage.getItem(storeKey) ?? '') } catch { setText('') }
  }, [storeKey])

  const save = (v: string) => {
    setText(v)
    try { localStorage.setItem(storeKey, v) } catch { /* full */ }
  }

  const addTag = (tag: string) => {
    const sep = text && !text.endsWith('\n') ? '\n' : ''
    save(`${text}${sep}${tag} `)
  }

  const toggleDictate = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const W = window as unknown as { SpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void }; webkitSpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void } }
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition
    if (!SR) { setStatus('Voice dictation uses the keyboard mic on this device.'); return }
    try {
      const r = new SR()
      r.continuous = false; r.interimResults = false; r.lang = 'en-US'
      r.onresult = e => {
        const last = e.results[e.results.length - 1]
        const words = last?.[0]?.transcript?.trim()
        if (words) save(text ? `${text.trimEnd()}\n${words}` : words)
      }
      r.onerror = () => { setListening(false); setStatus('Mic permission needed for dictation.') }
      r.onend = () => setListening(false)
      recRef.current = r
      r.start()
      setListening(true); setStatus('')
    } catch { setStatus('Dictation unavailable here — use keyboard mic.') }
  }

  return (
    <div className="stack small" style={{ gap: 6 }} data-testid="fc-note">
      <div className="row" style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="seg" role="group" aria-label="Note scope">
          <button className="btn sm" aria-pressed={scope === 'item'} onClick={() => setScope('item')}>{ctx.title ? ctx.title.slice(0, 16) : `This (${screen})`}</button>
          <button className="btn sm" aria-pressed={scope === 'general'} onClick={() => setScope('general')}>General</button>
        </div>
        <button className={`btn sm${listening ? ' on' : ' ghost'}`} onClick={toggleDictate} data-testid="note-dictate">
          <Ico n="mic" /> {listening ? 'Listening…' : 'Dictate'}
        </button>
      </div>
      <div className="row" style={{ gap: 3, flexWrap: 'wrap' }}>
        {['Capo:', 'Pickup:', 'Goal BPM:', 'Watch bar:'].map(tag => (
          <button key={tag} className="btn sm ghost" style={{ padding: '1px 6px', fontSize: 11 }} onClick={() => addTag(tag)}>+ {tag}</button>
        ))}
      </div>
      <textarea
        className="input"
        rows={5}
        value={text}
        onChange={e => save(e.target.value)}
        placeholder="Jot notes for this song or lesson (capo, fingerings, pickup, trouble bars…)"
        aria-label="Sticky note"
        data-testid="note-textarea"
      />
      {status && <span className="muted" style={{ fontSize: 11 }}>{status}</span>}
    </div>
  )
}

// ---------- #8: Mini Book & Tab Reference Floating Card ----------
interface BookMark { bookId: string; title: string; page: number }
const BM_KEY = 'kg:floatBookMarks'
function loadBookmarks(): BookMark[] {
  try { const v = JSON.parse(localStorage.getItem(BM_KEY) ?? '[]') as BookMark[]; return Array.isArray(v) ? v : [] } catch { return [] }
}

export function BookRefBody() {
  const [books, setBooks] = useState<BookMeta[]>([])
  const [bookId, setBookId] = useState('')
  const [page, setPage] = useState(1)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [zoom, setZoom] = useState(1)
  const [marks, setMarks] = useState<BookMark[]>(loadBookmarks)
  const view = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; l: number; t: number } | null>(null)

  useEffect(() => {
    void listBooks().then(list => {
      setBooks(list)
      const withPdf = list.find(b => b.pdf)
      if (withPdf && !bookId) setBookId(withPdf.id)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeBook = books.find(b => b.id === bookId) ?? null

  useEffect(() => {
    if (!activeBook?.pdf) return
    let alive = true
    setBusy(true); setMsg('')
    void (async () => {
      try {
        const bytes = await bookPdf(activeBook.id)
        if (!bytes) { if (alive) { setMsg('PDF file not attached yet (attach in Learn → My books).'); setBusy(false) } return }
        const { pdfPictures } = await import('../tabs/pdfTab')
        const pics = await pdfPictures(bytes, 1, page)
        if (alive) {
          setImgUrl(pics[0]?.url ?? null)
          setBusy(false)
        }
      } catch {
        if (alive) { setMsg('Could not render that page.'); setBusy(false) }
      }
    })()
    return () => { alive = false }
  }, [activeBook?.id, activeBook?.pdf, page])

  const pinBookmark = () => {
    if (!activeBook) return
    const next = [{ bookId: activeBook.id, title: activeBook.title.slice(0, 18), page }, ...marks.filter(m => !(m.bookId === activeBook.id && m.page === page))].slice(0, 6)
    setMarks(next)
    try { localStorage.setItem(BM_KEY, JSON.stringify(next)) } catch { /* full */ }
  }

  const pickImage = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setBookId('')
    setImgUrl(URL.createObjectURL(f))
    setMsg('')
  }

  const scanThisPage = () => {
    openScanner({ mode: 'scan' })
  }

  return (
    <div className="stack small" style={{ gap: 6 }} data-testid="fc-book">
      <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        {books.length > 0 && (
          <select className="select sm" style={{ flex: 1 }} value={bookId} onChange={e => { setBookId(e.target.value); setPage(1) }} aria-label="Choose book">
            <option value="">Custom image…</option>
            {books.map(b => <option key={b.id} value={b.id}>{b.title}{b.pdf ? '' : ' (no PDF)'}</option>)}
          </select>
        )}
        <label className="btn sm">
          <input type="file" accept="image/*" hidden onChange={e => { pickImage(e.target.files); e.target.value = '' }} />
          <Ico n="camera" /> Image
        </label>
      </div>

      {activeBook && (
        <div className="row" style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="row" style={{ gap: 3, alignItems: 'center' }}>
            <button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
            <input className="input" type="number" min={1} max={activeBook.pages || 999} value={page} onChange={e => setPage(Math.max(1, Number(e.target.value) || 1))} style={{ width: 54, minHeight: 28, padding: '0 6px' }} aria-label="Page number" />
            <span className="muted">/ {activeBook.pages}</span>
            <button className="btn sm" disabled={activeBook.pages > 0 && page >= activeBook.pages} onClick={() => setPage(p => p + 1)}>›</button>
          </span>
          <span className="row" style={{ gap: 3 }}>
            <button className="btn sm ghost" onClick={pinBookmark} title="Bookmark this page">★ Pin</button>
            <button className="btn sm ghost" onClick={() => setZoom(z => Math.max(0.6, z / 1.2))}>−</button>
            <button className="btn sm ghost" onClick={() => setZoom(1)}>1×</button>
            <button className="btn sm ghost" onClick={() => setZoom(z => Math.min(3, z * 1.2))}>+</button>
          </span>
        </div>
      )}

      {marks.length > 0 && (
        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
          {marks.map((m, i) => (
            <button key={`${m.bookId}:${m.page}:${i}`} className="btn sm ghost" style={{ padding: '1px 6px', fontSize: 11 }} onClick={() => { setBookId(m.bookId); setPage(m.page) }}>
              ★ {m.title} p.{m.page}
            </button>
          ))}
        </div>
      )}

      {busy && <span className="muted">Rendering page {page}…</span>}
      {msg && <span className="muted">{msg}</span>}

      {imgUrl ? (
        <div
          ref={view}
          className="scan-src-view"
          style={{ height: 240, maxHeight: '45vh' }}
          onMouseDown={e => { const v = view.current; if (v) drag.current = { x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop } }}
          onMouseMove={e => { const d = drag.current, v = view.current; if (d && v) { v.scrollLeft = d.l - (e.clientX - d.x); v.scrollTop = d.t - (e.clientY - d.y) } }}
          onMouseUp={() => { drag.current = null }} onMouseLeave={() => { drag.current = null }}
        >
          <img src={imgUrl} alt={`Reference page ${page}`} draggable={false} style={{ width: `${Math.round(zoom * 100)}%`, display: 'block' }} />
        </div>
      ) : !busy && (
        <span className="muted">Pick one of your imported books above, or tap <b>Image</b> to float any tab screenshot or chord chart!</span>
      )}

      {imgUrl && (
        <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={scanThisPage}>
          <Ico n="scan" /> Open Riff Scanner
        </button>
      )}
    </div>
  )
}
