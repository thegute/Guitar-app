// Riff Scanner → Shorts: one guitar Short at a time, swipe (or ↑ ↓, or a footswitch's next/previous) to the next.
// Under (or beside, on a wide screen) it: Scan this Short (Gemini watches it; KGuitar's screen grab as the fallback),
// Open in YouTube, Follow this channel. A Short that can't play inside KGuitar offers "Play it out loud" for the mic.
import { useEffect, useRef, useState } from 'react'
import { Ico } from '../components/Icon'
import { usePersist } from '../components/Controls'
import { usePedals } from '../controls/pedals'
import { loadApi, type YTPlayer } from '../components/YouTubePlayer'
import { ScanVideo } from './RiffScanner'
import { SHORT_STYLES, QuotaError, channelFrom, channelShorts, curate, defaultsPending, ensureDefaultFollows, findTabChannels, followed, searchShorts, setFollowed, setYoutubeKey, unfollow, youtubeKey, type ChannelPick, type Short } from './shorts'

const FEED_KEY = 'kg:shortsFeed'
const QUOTA_KEY = 'kg:shortsQuota'
const today = () => new Date().toISOString().slice(0, 10)
/** searches made today (each costs 100 of the 10,000 free daily units) */
function searchesToday(): number { try { const q = JSON.parse(localStorage.getItem(QUOTA_KEY) ?? '{}') as { day?: string; n?: number }; return q.day === today() ? q.n ?? 0 : 0 } catch { return 0 } }
function countSearch() { try { localStorage.setItem(QUOTA_KEY, JSON.stringify({ day: today(), n: searchesToday() + 1 })) } catch { /* storage */ } }
function savedFeed(): Short[] { try { return JSON.parse(localStorage.getItem(FEED_KEY) ?? '[]') as Short[] } catch { return [] } }

export function ShortsFeed({ onListen, onUseInJam }: { onListen: () => void; onUseInJam?: (chords: string[]) => void }) {
  const [feed, setFeed] = useState<Short[]>(savedFeed)
  const [at, setAt] = usePersist('shortsAt', 0)
  const [style, setStyle] = usePersist<string>('shortsStyle', 'all')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [scan, setScan] = useState(false)
  const [setup, setSetup] = useState(false)
  const [, bump] = useState(0)
  const hasKey = !!youtubeKey()
  const chs = followed()
  const list = style === 'all' ? feed : feed.filter(s => s.style === style)
  const i = Math.max(0, Math.min(list.length - 1, at))
  const cur = list[i]

  const load = async (more = false) => {
    const hasKey = !!youtubeKey()
    setBusy(true); setMsg('')
    const got: Short[] = []
    let note = ''
    if (hasKey && searchesToday() < 95) {
      // two of his styles per load (or the one picked), so the daily searches go a long way
      const styles = style === 'all' ? SHORT_STYLES.slice().sort(() => Math.random() - 0.5).slice(0, 2) : SHORT_STYLES.filter(s => s.id === style)
      for (const st of styles) {
        try { countSearch(); got.push(...(await searchShorts(st)).list) } catch (e) {
          if (e instanceof QuotaError) { note = "Today's YouTube searches are used up (they come back tomorrow): showing the channels you follow."; break }
          note = e instanceof Error ? `YouTube search didn't work (${e.message}): showing the channels you follow.` : ''
          break
        }
      }
    } else if (hasKey) note = "Today's YouTube searches are nearly used up: showing the channels you follow."
    if (!got.length || note) got.push(...(await channelShorts().catch(() => [])))
    const fresh = curate(got)
    if (!fresh.length) { setMsg(note || (hasKey ? 'No guitar Shorts came back: try another style.' : 'Add your YouTube key or follow some channels first.')); setBusy(false); return }
    const next = more ? [...feed, ...fresh.filter(s => !feed.some(f => f.id === s.id))] : fresh
    setFeed(next)
    try { localStorage.setItem(FEED_KEY, JSON.stringify(next.slice(-300))) } catch { /* storage */ }
    if (!more) setAt(0)
    setMsg(note)
    setBusy(false)
  }
  useEffect(() => { if (!feed.length && (hasKey || chs.length)) void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // the channels followed from the start (Mr. Tabs, Level Up Guitar Tabs, Kenneth Acoustic): found by name once
  useEffect(() => { if (defaultsPending().length) void ensureDefaultFollows().then(a => { if (a.length) bump(n => n + 1) }) }, [])

  const go = (d: number) => {
    setScan(false)
    const n = i + d
    if (n >= list.length - 2 && !busy) void load(true)
    setAt(Math.max(0, Math.min(list.length - 1, n)))
  }
  usePedals({ nextBar: () => go(1), prevBar: () => go(-1) })
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest?.('input,textarea,select')) return; if (e.key === 'ArrowDown') { e.preventDefault(); go(1) } if (e.key === 'ArrowUp') { e.preventDefault(); go(-1) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  if ((!hasKey && !chs.length) || setup) {
    return <ShortsSetup onDone={() => { setSetup(false); bump(n => n + 1); void load() }} />
  }
  return (
    <div className="shorts stack" style={{ gap: 8 }} data-testid="shorts">
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="seg shorts-styles" role="group" aria-label="Style">
          <button aria-pressed={style === 'all'} onClick={() => { setStyle('all'); setAt(0) }}>All</button>
          {SHORT_STYLES.map(s => <button key={s.id} aria-pressed={style === s.id} onClick={() => { setStyle(s.id); setAt(0); if (!feed.some(f => f.style === s.id)) void load(true) }}>{s.label}</button>)}
        </span>
        <button className="btn sm ghost" onClick={() => void load()} disabled={busy} aria-label="New Shorts"><Ico n="shuffle" /> New</button>
        <button className="btn sm ghost" onClick={() => setSetup(true)}>Key and channels</button>
      </div>
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      {busy && !cur && <p className="small muted">Finding guitar Shorts…</p>}
      {cur && (
        <div className={`shorts-stage${scan ? ' scanning' : ''}`}>
          <div className="shorts-player">
            <ShortPlayer key={cur.id} short={cur} onListen={onListen} />
            <div className="shorts-nav">
              <button className="btn" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous Short"><Ico n="up" /></button>
              <span className="small tabular">{i + 1} / {list.length}</span>
              <button className="btn" onClick={() => go(1)} aria-label="Next Short" data-testid="shorts-next"><Ico n="down" /></button>
            </div>
          </div>
          <div className="stack shorts-side" style={{ gap: 8 }}>
            <b className="shorts-title">{cur.title}</b>
            <span className="small muted">{cur.channel}{cur.secs ? ` · ${cur.secs} s` : ''}{cur.source === 'channels' ? ' · from a channel you follow' : ''}</span>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button className={`btn${scan ? ' on' : ' primary'}`} onClick={() => setScan(!scan)} data-testid="shorts-scan"><Ico n="scan" /> {scan ? 'Hide the scanner' : 'Scan this Short'}</button>
              <a className="btn ghost" href={`https://www.youtube.com/shorts/${cur.id}`} target="_blank" rel="noreferrer">Open in YouTube</a>
              {!chs.some(c => c.id === cur.channelId) && <button className="btn ghost" onClick={() => { setFollowed([...followed(), { id: cur.channelId, name: cur.channel }]); bump(n => n + 1) }}>Follow {cur.channel.slice(0, 18)}</button>}
            </div>
            {scan && <ScanVideo links initialLink={`https://www.youtube.com/shorts/${cur.id}`} youtube={`https://www.youtube.com/watch?v=${cur.id}`} onUseInJam={onUseInJam} onListen={onListen} />}
          </div>
        </div>
      )}
    </div>
  )
}

/** One Short, upright, playing on a loop inside KGuitar; blocked ones offer the mic. */
function ShortPlayer({ short, onListen }: { short: Short; onListen: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [blocked, setBlocked] = useState(false)
  const origin = typeof location !== 'undefined' && /^https?:/.test(location.origin) ? location.origin : ''
  const src = `https://www.youtube.com/embed/${short.id}?enablejsapi=1&playsinline=1&rel=0&loop=1&playlist=${short.id}${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`
  // touch swipes up/down on the frame's edges (the video itself takes its own taps)
  useEffect(() => {
    let alive = true
    let p: YTPlayer | null = null
    loadApi().then(YT => {
      if (!alive || !frame.current) return
      p = new YT.Player(frame.current, { events: { onError: (e: { data: number }) => { if (alive && [100, 101, 150, 152, 153].includes(e.data)) setBlocked(true) } } })
    }).catch(() => { /* plays with YouTube's own controls */ })
    return () => { alive = false; try { p?.destroy() } catch { /* gone */ } }
  }, [short.id])
  if (blocked) {
    return (
      <div className="short-blocked stack" style={{ gap: 8 }} role="status">
        <b>This Short can't play inside KGuitar.</b>
        <span className="small">Open it in YouTube and play it out loud near the phone: KGuitar listens and writes it down.</span>
        <a className="btn" href={`https://www.youtube.com/shorts/${short.id}`} target="_blank" rel="noreferrer">Open in YouTube</a>
        <button className="btn primary" onClick={onListen}><Ico n="mic" /> Play it out loud</button>
      </div>
    )
  }
  return <iframe ref={frame} className="short-frame" src={src} title={short.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
}

/** The YouTube key (kept on this phone only) and the channels to follow. */
export function ShortsSetup({ onDone, inSettings = false }: { onDone: () => void; inSettings?: boolean }) {
  const [key, setKey] = useState(youtubeKey())
  const [chs, setChs] = useState(followed())
  const [add, setAdd] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [picks, setPicks] = useState<ChannelPick[] | null>(null)
  const [step, setStep] = useState('')
  useEffect(() => { if (defaultsPending().length) void ensureDefaultFollows().then(a => { if (a.length) setChs(followed()) }) }, [])
  const find = async () => {
    setBusy(true); setPicks(null); setMsg('')
    try { const r = await findTabChannels(setStep); setPicks(r); if (!r.length) setMsg('No new tab channels turned up in your styles today: try again another day.') }
    catch (e) { setMsg(e instanceof QuotaError ? "Finding channels needs your YouTube key (and some of today's searches)." : `That didn't work: ${e instanceof Error ? e.message : 'error'}`) }
    setStep(''); setBusy(false)
  }
  const test = async () => {
    setBusy(true); setMsg('Checking the key…')
    try {
      const r = await searchShorts(SHORT_STYLES[1], key.trim())
      setYoutubeKey(key)
      setMsg(`The key works (${r.list.length} Shorts found).`)
    } catch (e) { setMsg(e instanceof QuotaError ? "That key is out of today's searches or isn't allowed to search: check it in Google Cloud (YouTube Data API v3 switched on)." : `That key didn't work: ${e instanceof Error ? e.message : 'error'}`) }
    setBusy(false)
  }
  const follow = async () => {
    if (!add.trim()) return
    setBusy(true); setMsg('')
    try { const c = await channelFrom(add); const next = [...chs.filter(x => x.id !== c.id), c]; setChs(next); setFollowed(next); setAdd('') } catch (e) { setMsg(e instanceof Error ? e.message : 'That channel couldn\'t be found.') }
    setBusy(false)
  }
  return (
    <div className={`stack${inSettings ? '' : ' panel'}`} style={{ gap: 10 }} data-testid="shorts-setup">
      {!inSettings && <h3 style={{ margin: 0 }}>Shorts: your YouTube key</h3>}
      <p className="small muted" style={{ margin: 0 }}>With your own free YouTube Data API key, KGuitar searches guitar Shorts in your styles (about 100 searches a day). The key stays on this phone: it's never in a backup.</p>
      <div className="row" style={{ gap: 6 }}>
        <input className="input" style={{ flex: 1 }} value={key} onChange={e => setKey(e.target.value)} placeholder="AIza…" aria-label="YouTube API key" autoComplete="off" data-testid="yt-key" />
        <button className="btn" onClick={() => void test()} disabled={busy || !key.trim()}>Save and check</button>
      </div>
      <h3 style={{ margin: '6px 0 0' }}>Channels you follow</h3>
      <p className="small muted" style={{ margin: 0 }}>Their newest videos fill the feed when there's no key or the day's searches are used up (on the phone app).</p>
      <div className="row" style={{ gap: 6 }}>
        <input className="input" style={{ flex: 1 }} value={add} onChange={e => setAdd(e.target.value)} placeholder="@channel or a channel link" aria-label="Channel to follow" />
        <button className="btn" onClick={() => void follow()} disabled={busy || !add.trim()}>Follow</button>
      </div>
      {chs.length > 0 && (
        <ul className="plain small">
          {chs.map(c => <li key={c.id} className="row" style={{ gap: 6, alignItems: 'center' }}>{c.name}<button className="btn sm ghost" onClick={() => { unfollow(c.id); setChs(followed()) }} aria-label={`Stop following ${c.name}`}>✕</button></li>)}
        </ul>
      )}
      {defaultsPending().length > 0 && <p className="small muted" style={{ margin: 0 }}>Still finding: {defaultsPending().map(d => d.name).join(', ')} ({youtubeKey() ? 'with your key' : 'in the phone app, or add your key'}).</p>}
      <h3 style={{ margin: '6px 0 0' }}>Find channels for me</h3>
      <p className="small muted" style={{ margin: 0 }}>Searches new Shorts in your styles and checks a few frames of each channel for a tab on screen, then lists the channels that really post tabs (uses about 5 of today's searches).</p>
      <div className="row"><button className="btn" onClick={() => void find()} disabled={busy || !youtubeKey()} data-testid="shorts-find">{busy && step ? step : 'Find channels for me'}</button></div>
      {picks && picks.length > 0 && (
        <ul className="plain stack shorts-picks" style={{ gap: 8 }} data-testid="shorts-picks">
          {picks.map(p => (
            <li key={p.id} className="row" style={{ gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ minWidth: 0 }}><b>{p.name}</b><span className="small muted"> · {p.shorts} Shorts{p.styles.length ? ` · ${p.styles.map(x => SHORT_STYLES.find(st => st.id === x)?.label ?? x).join(', ')}` : ''}{p.checked ? ` · tab on screen in ${p.withTab} of ${p.checked}` : ''}</span><br /><span className="small muted">“{p.sample.slice(0, 70)}”</span></span>
              {chs.some(c => c.id === p.id) ? <span className="small">Following</span>
                : <button className="btn sm" onClick={() => { const n = [...followed().filter(c => c.id !== p.id), { id: p.id, name: p.name }]; setFollowed(n); setChs(n) }}>Follow</button>}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      {!inSettings && <button className="btn primary" onClick={() => { if (key.trim() !== youtubeKey()) setYoutubeKey(key); onDone() }} disabled={!key.trim() && !chs.length}>Show the Shorts</button>}
    </div>
  )
}
