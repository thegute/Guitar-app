// Songs → Add a song: one box (owner 2026-11-11). Type a song name, paste a link (YouTube, Songsterr, Ultimate Guitar)
// or paste a tab / chord sheet, or choose a file (Guitar Pro, PDF, text, a picture of a tab, a recording); it works out
// what you gave it and shows what fits:
// - a name: search Songsterr / Ultimate Guitar (straight in on the phone) or open the sites
// - a YouTube link: Find a tab (by the video's title, the video attached) · Scan it (Riff Scanner) · Save for later
// - a Songsterr / Ultimate Guitar page: bring it in (phone) or open it
// - a tab or chord sheet: a title, then Load it
import { useEffect, useRef, useState } from 'react'
import { useInstrument } from '../instrument'
import { songFromText } from '../tabs/importer'
import { newId, saveSong, youtubeId, type SongDoc } from '../tabs/library'
import { canImportFromSites } from '../tabs/siteImport'
import { TAB_SITES } from '../tabs/tabSites'
import { SiteSearch } from './SiteSearch'
import { Ico } from './Icon'
import { saveForLater } from '../tabs/toLearn'

export type BoxKind = 'empty' | 'name' | 'youtube' | 'site' | 'tab' | 'other'

/** What did he type or paste? Pure: tested. */
export function boxKind(v: string): BoxKind {
  const t = v.trim()
  if (!t) return 'empty'
  const oneLine = !/\n/.test(t)
  if (oneLine && youtubeId(t) && /youtu\.?be|youtube\.com/i.test(t)) return 'youtube'
  if (oneLine && /(songsterr\.com|ultimate-guitar\.com)\//i.test(t)) return 'site'
  if (oneLine && /^https?:\/\//i.test(t)) return 'other'
  // tab lines (e|--3--|) or a chord sheet (a line of chord names above words), or several lines of either
  const lines = t.split('\n')
  const tabLines = lines.filter(l => /^\s*[A-Ga-g][#b]?\s*[|:]?[-0-9xhpbr/\\~|]{6,}/.test(l)).length
  const chordLine = lines.some(l => /^\s*([A-G][#b]?(m|maj|min|dim|aug|sus|add)?\d*(\/[A-G][#b]?)?\s+){1,}[A-G][#b]?(m|maj|min|dim|aug|sus|add)?\d*(\/[A-G][#b]?)?\s*$/.test(l))
  if (tabLines >= 3 || (lines.length >= 2 && chordLine)) return 'tab'
  if (oneLine && t.length <= 80) return 'name'
  return 'tab'
}

/** The video's title from YouTube's oEmbed (no key needed; the web may be blocked by CORS: then null). */
async function videoTitle(url: string): Promise<string | null> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)
    if (!r.ok) return null
    const j = await r.json() as { title?: string; author_name?: string }
    // "Song Name - Artist (Official Video)" → "Song Name Artist"
    return (j.title ?? '').replace(/\((official|lyric|music|audio|live)[^)]*\)|\[(official|lyric|music|audio)[^\]]*\]/gi, '').replace(/[|•]/g, ' ').replace(/\s+/g, ' ').trim() || null
  } catch { return null }
}

export function AddBox({ onOpen, onFiles, onScan, onSavedForLater }: {
  onOpen: (d: SongDoc) => void
  /** files chosen or dropped: the page imports them (GP, PDF books, text, pictures, recordings) */
  onFiles: (files: File[]) => void
  /** scan this YouTube link with the Riff Scanner */
  onScan: (url: string) => void
  onSavedForLater?: () => void
}) {
  const inst = useInstrument()
  // Library → Saved for later → Find a tab: start with that name or video in the box
  const [v, setV] = useState(() => { try { const p = sessionStorage.getItem('kg:addPrefill'); sessionStorage.removeItem('kg:addPrefill'); return p ?? '' } catch { return '' } })
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [video, setVideo] = useState<string | undefined>()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const kind = boxKind(v)

  // a YouTube link: work out the video's title once (for Find a tab and Save for later)
  const [vidTitle, setVidTitle] = useState<string | null>(null)
  useEffect(() => {
    setVidTitle(null)
    if (kind !== 'youtube') return
    let live = true
    void videoTitle(v.trim()).then(t => { if (live) setVidTitle(t) })
    return () => { live = false }
  }, [v, kind])

  const load = async () => {
    setMsg('')
    const doc = songFromText(v, title.trim(), inst, video)
    if (!doc) { setMsg(`No tab or chords found. Paste tab lines that look like  e|---0---3---|  (all ${inst.strings} strings), or a chord sheet with chord names above the words.`); return }
    await saveSong(doc); onOpen(doc)
  }
  const fromSite = async () => {
    setMsg(''); setBusy(true)
    try {
      const { importFromUrl } = await import('../tabs/siteImport')
      const got = await importFromUrl(v.trim())
      const d = !got ? null : 'song' in got
        ? { id: newId(), title: got.song.title, source: 'gp' as const, inst: inst.id, song: got.song, updated: Date.now(), youtube: video }
        : songFromText(got.text, got.title, inst, video)
      if (!d) throw new Error('nothing readable on that page')
      await saveSong(d); onOpen(d)
    } catch (e) { setMsg(`Couldn't bring that page in: ${e instanceof Error ? e.message : 'error'}.`) }
    setBusy(false)
  }
  const paste = async () => {
    try {
      const { Clipboard } = await import('@capacitor/clipboard')
      const { value } = await Clipboard.read()
      if (value?.trim()) setV(value.trim()); else setMsg('The clipboard is empty.')
    } catch { setMsg('Long-press in the box and choose Paste.') }
  }

  return (
    <div className="add-box stack" style={{ gap: 10 }} data-testid="add-box">
      <textarea className={`input add-input${kind === 'tab' ? ' mono' : ''}`} rows={kind === 'tab' ? 8 : 2} value={v} onChange={e => { setV(e.target.value); setMsg('') }}
        placeholder="Type a song name, or paste a link (YouTube, Songsterr, Ultimate Guitar) or a tab or chord sheet" spellCheck={kind !== 'tab'}
        aria-label="A song name, a link, or a tab" data-testid="add-input"
        onDragOver={e => e.preventDefault()} onDrop={e => { const fs = [...e.dataTransfer.files]; if (fs.length) { e.preventDefault(); onFiles(fs) } }} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={() => file.current?.click()} data-testid="add-file"><Ico n="upload" /> Choose a file</button>
        <button className="btn" onClick={() => void paste()}>Paste</button>
        {v && <button className="btn ghost" onClick={() => { setV(''); setTitle(''); setQuery(''); setMsg('') }}>Clear</button>}
        <input ref={file} type="file" multiple hidden onChange={e => { const fs = [...(e.target.files ?? [])]; e.target.value = ''; if (fs.length) onFiles(fs) }} data-testid="add-file-input" />
      </div>
      {kind === 'empty' && <p className="small muted" style={{ margin: 0 }}>Files: Guitar Pro (.gp .gp5 .gpx .gp4 .gp3), PDF (a whole book too: pick the pages), text tabs, a picture or screenshot of a tab, or a recording to scan.</p>}

      {kind === 'name' && (
        <div className="stack" style={{ gap: 8 }} data-testid="add-name">
          {canImportFromSites()
            ? <SiteSearch query={v.trim()} youtube={video} onOpen={onOpen} />
            : <p className="small muted" style={{ margin: 0 }}>In the phone app the search brings Songsterr and Ultimate Guitar tabs straight in. Here, open a site, download the Guitar Pro file (or copy the tab) and bring it back.</p>}
          <div className="row">
            {TAB_SITES.map(site => <a key={site.id} className="btn sm" href={site.url(v.trim())} target="_blank" rel="noreferrer">{site.label} ↗</a>)}
            <button className="btn sm ghost" onClick={() => { saveForLater({ title: v.trim() }); setMsg(`"${v.trim()}" is in Library → Saved for later.`); onSavedForLater?.() }}>Save for later</button>
          </div>
        </div>
      )}

      {kind === 'youtube' && (
        <div className="stack" style={{ gap: 8 }} data-testid="add-youtube">
          <p className="small" style={{ margin: 0 }}>{vidTitle ? <>A video: <b>{vidTitle}</b>. What next?</> : 'A YouTube video. What next?'}</p>
          <div className="row">
            <button className="btn primary" onClick={() => { setVideo(v.trim()); setQuery(vidTitle ?? '') }} data-testid="yt-find"><Ico n="eye" /> Find a tab</button>
            <button className="btn" onClick={() => onScan(v.trim())} data-testid="yt-scan"><Ico n="scan" /> Scan it</button>
            <button className="btn ghost" onClick={() => { saveForLater({ title: vidTitle ?? 'A video to learn', youtube: v.trim() }); setMsg('Saved: it\'s in Library → Saved for later.'); onSavedForLater?.() }} data-testid="yt-save">Save for later</button>
          </div>
          {video && (
            <div className="stack" style={{ gap: 6 }}>
              <input className="input" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Song and artist" aria-label="Search for this song's tab" data-testid="yt-query" />
              <p className="small muted" style={{ margin: 0 }}>The tab you pick gets this video attached (sync it in the song player).</p>
              {canImportFromSites() ? <SiteSearch query={query} youtube={video} onOpen={onOpen} />
                : <div className="row">{TAB_SITES.map(site => <a key={site.id} className={`btn sm${query.trim() ? '' : ' disabled'}`} href={query.trim() ? site.url(query.trim()) : undefined} target="_blank" rel="noreferrer">{site.label} ↗</a>)}</div>}
            </div>
          )}
        </div>
      )}

      {kind === 'site' && (
        <div className="row" data-testid="add-site">
          {canImportFromSites()
            ? <button className="btn primary" disabled={busy} onClick={() => void fromSite()}>{busy ? 'Bringing it in…' : 'Bring this tab in'}</button>
            : <><a className="btn" href={v.trim()} target="_blank" rel="noreferrer">Open the page ↗</a><span className="small muted">Download the Guitar Pro file there (or copy the tab), then choose the file or paste it here.</span></>}
        </div>
      )}

      {kind === 'tab' && (
        <div className="row" data-testid="add-tab">
          <input className="input" style={{ flex: '1 1 160px' }} placeholder="Song title (optional)" value={title} onChange={e => setTitle(e.target.value)} aria-label="Song title" />
          <input className="input" style={{ flex: '2 1 200px' }} placeholder="YouTube link (optional)" inputMode="url" value={video ?? ''} onChange={e => setVideo(e.target.value.trim() && youtubeId(e.target.value) ? e.target.value.trim() : e.target.value || undefined)} aria-label="YouTube link" />
          <button className="btn primary" onClick={() => void load()} data-testid="add-load">Load tab</button>
        </div>
      )}

      {kind === 'other' && <p className="small muted" style={{ margin: 0 }}>That's a link KGuitar can't read. Copy the tab from the page and paste it here, or download its file.</p>}
      {msg && <p className="notice small" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  )
}
