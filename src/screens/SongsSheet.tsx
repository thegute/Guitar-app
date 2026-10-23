// Your songs: open a Guitar Pro file, paste a text tab, or pick a saved song or an example.
import { useEffect, useRef, useState } from 'react'
import { deleteSong, listSongs, newId, saveSong, youtubeId, type SongDoc } from '../tabs/library'
import { EXAMPLES, exampleDoc } from '../tabs/examples'
import { parseTextTab } from '../tabs/textTab'
import { fromTextTab } from '../tabs/model'
import { Clipboard } from '@capacitor/clipboard'

const SITES = [
  { id: 'songsterr', label: 'Songsterr', url: (q: string) => `https://www.songsterr.com/?pattern=${encodeURIComponent(q)}` },
  { id: 'ug', label: 'Ultimate Guitar', url: (q: string) => `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}` },
  { id: 'gp', label: 'Guitar Pro files', url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`${q} guitar pro tab gp5 OR gpx OR gp download`)}` },
]

interface Props {
  currentId: string
  onClose: () => void
  onOpen: (d: SongDoc) => void
}

export function SongsSheet({ currentId, onClose, onOpen }: Props) {
  const [songs, setSongs] = useState<SongDoc[]>([])
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [yt, setYt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [clipNote, setClipNote] = useState('')
  const file = useRef<HTMLInputElement>(null)

  async function pasteClipboard() {
    setClipNote('')
    try {
      const { value } = await Clipboard.read()
      const v = (value ?? '').trim()
      if (!v) { setClipNote('The clipboard is empty. Copy the tab on the website first.'); return }
      if (youtubeId(v) && v.length < 200) { setYt(v); setClipNote('Pasted a YouTube link.'); return }
      setText(v)
      setClipNote(parseTextTab(v) ? 'Tab pasted. Check the title, then tap Load tab.' : "Pasted, but I can't see tab lines in it yet. Make sure you copied the lines that look like  e|---0---|.")
    } catch {
      setClipNote('Could not read the clipboard here: long-press in the box below and choose Paste.')
    }
  }

  useEffect(() => { void listSongs().then(setSongs) }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const link = yt.trim() && youtubeId(yt) ? yt.trim() : undefined

  async function openFile(f: File) {
    setError('')
    setBusy(true)
    try {
      const bytes = new Uint8Array(await f.arrayBuffer())
      const isText = /\.(txt|tab|text)$/i.test(f.name) || bytes.slice(0, 200).every(b => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127))
      let doc: SongDoc
      if (isText) {
        const parsed = parseTextTab(new TextDecoder().decode(bytes), f.name.replace(/\.[^.]+$/, ''))
        if (!parsed) throw new Error('No tab found in that text file.')
        const song = fromTextTab(parsed)
        doc = { id: newId(), title: song.title, source: 'text', song, youtube: link, updated: Date.now() }
      } else {
        const { importGuitarPro } = await import('../tabs/gpImport')
        const song = importGuitarPro(bytes, f.name)
        doc = { id: newId(), title: song.title, artist: song.artist, source: 'gp', song, youtube: link, updated: Date.now() }
      }
      await saveSong(doc)
      onOpen(doc)
    } catch (e) {
      setError(`Couldn't open "${f.name}". ${e instanceof Error && e.message.length < 120 ? e.message : 'Is it a Guitar Pro file (.gp, .gp5, .gpx, .gp4, .gp3)?'}`)
    } finally {
      setBusy(false)
    }
  }

  async function loadText() {
    setError('')
    const parsed = parseTextTab(text, title.trim() || 'Pasted tab')
    if (!parsed) {
      setError('No tab found. Paste the lines that look like  e|---0---3---|  (all six strings).')
      return
    }
    const song = fromTextTab(parsed)
    if (title.trim()) song.title = title.trim()
    const doc: SongDoc = { id: newId(), title: song.title, source: 'text', song, youtube: link, updated: Date.now() }
    await saveSong(doc)
    onOpen(doc)
  }

  async function openExample(id: string) {
    const existing = songs.find(s => s.id === 'ex-' + id)
    const doc = existing ?? exampleDoc(id)
    if (!existing) await saveSong(doc)
    onOpen(doc)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Songs" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Songs</h2>
          <button className="btn sm" onClick={onClose}>Close</button>
        </div>

        <section className="panel stack" style={{ gap: 8 }}>
          <h3 style={{ margin: 0 }}>Find a tab</h3>
          <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={e => { e.preventDefault(); if (query.trim()) window.open(SITES[0].url(query.trim()), '_blank') }}>
            <input className="input" type="search" placeholder="Song or artist" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search for a tab" />
          </form>
          <div className="row">
            {SITES.map(site => (
              <a key={site.id} className={`btn sm${query.trim() ? '' : ' disabled'}`} href={query.trim() ? site.url(query.trim()) : undefined} target="_blank" rel="noreferrer" aria-disabled={!query.trim()}>
                {site.label} ↗
              </a>
            ))}
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Opens the site in your browser. Then either download the Guitar Pro file and come back to <b>Upload a tab file</b>,
            or copy the tab text and tap <b>Paste from clipboard</b>.
          </p>
        </section>

        <section className="panel stack" style={{ gap: 10 }}>
          <h3 style={{ margin: 0 }}>Add a song</h3>
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => file.current?.click()}>{busy ? 'Opening…' : 'Upload a tab file'}</button>
            <button className="btn" onClick={() => void pasteClipboard()}>Paste from clipboard</button>
            <span className="small muted">Guitar Pro (.gp .gp5 .gpx .gp4 .gp3) or a text tab (.txt)</span>
            <input ref={file} type="file" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void openFile(f) }} />
          </div>
          <label className="field">
            <span>…or paste a text tab (from Ultimate Guitar or any tab site)</span>
            <textarea className="input mono" rows={6} value={text} onChange={e => setText(e.target.value)} placeholder={'e|-----0-----|\nB|---1---1---|\nG|-2-------2-|\nD|-----------|\nA|-----------|\nE|-----------|'} spellCheck={false} />
          </label>
          <div className="row">
            <input className="input" style={{ flex: '1 1 160px' }} placeholder="Song title (optional)" value={title} onChange={e => setTitle(e.target.value)} aria-label="Song title" />
            <input className="input" style={{ flex: '2 1 220px' }} placeholder="YouTube link (optional)" inputMode="url" value={yt} onChange={e => setYt(e.target.value)} aria-label="YouTube link" />
            <button className="btn primary" disabled={!text.trim()} onClick={() => void loadText()}>Load tab</button>
          </div>
          {clipNote && <span className="small muted" role="status">{clipNote}</span>}
          {yt.trim() && !link && <span className="small" style={{ color: 'var(--jewel)' }}>That YouTube link doesn't look right.</span>}
          {error && <p className="notice small" role="alert">{error}</p>}
        </section>

        <section>
          <h3>Your songs</h3>
          {songs.filter(s => s.source !== 'example').length === 0 && <p className="small muted">Songs you add are saved on this phone.</p>}
          {songs.filter(s => s.source !== 'example').length > 4 && (
            <input className="input" type="search" style={{ width: '100%', marginBottom: 6 }} placeholder="Search your songs" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Search your songs" />
          )}
          <ul className="song-list">
            {songs.filter(s => s.source !== 'example' && (!filter.trim() || `${s.title} ${s.artist ?? ''}`.toLowerCase().includes(filter.trim().toLowerCase()))).map(s => (
              <li key={s.id} className={s.id === currentId ? 'on' : ''}>
                <button className="song-open" onClick={() => onOpen(s)}>
                  <b>{s.title}</b>
                  <span className="small muted">
                    {[s.artist, s.source === 'gp' ? 'Guitar Pro' : 'Text tab', s.youtube ? 'video' : null, s.song.tracks.length > 1 ? `${s.song.tracks.length} tracks` : null].filter(Boolean).join(' · ')}
                  </span>
                </button>
                {confirmDel === s.id ? (
                  <span className="row" style={{ flexWrap: 'nowrap' }}>
                    <button className="btn sm danger" onClick={async () => { await deleteSong(s.id); setConfirmDel(null); setSongs(await listSongs()) }}>Delete</button>
                    <button className="btn sm" onClick={() => setConfirmDel(null)}>Keep</button>
                  </span>
                ) : (
                  <button className="btn sm ghost" onClick={() => setConfirmDel(s.id)} aria-label={`Delete ${s.title}`}>Remove</button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Practice examples</h3>
          <ul className="song-list">
            {EXAMPLES.map(e => (
              <li key={e.id} className={'ex-' + e.id === currentId ? 'on' : ''}>
                <button className="song-open" onClick={() => void openExample(e.id)}><b>{e.title}</b></button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
