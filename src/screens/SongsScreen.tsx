// Songs: one library (your songs and the songbook together, owner 2026-11-11: "Learning now" first, then your songs, then
// the songbook; one search and filter chips) and Add a song (one box: a name, a link, a file, a picture or a recording).
import { stopAllSounds } from '../audio/stopAll'
import { Win, WinArea } from '../components/Win'
import { ScanVideo } from '../scan/RiffScanner'
import { Songbook } from '../components/Songbook'
import { JumpBackIn } from '../components/JumpBackIn'
import { SubTabs, useSubTab } from '../components/SubTabs'
import { PsyDog, PsyDogCard, PsyStrip } from '../components/PsyArt'
import { breedOf } from '../theme'
import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteSong, listSongs, saveSong, type SongDoc } from '../tabs/library'
import { isPdf, songFromFile, songFromPdf } from '../tabs/importer'
import { BOOK_PAGES, PdfPages } from '../components/PdfPages'
import { ago, allSongStats, songStats, troubleBars } from '../play/songStats'
import { bandStyleLabel, guessBandStyle } from '../audio/band'
import { TUNINGS, noteToMidi } from '../theory/notes'
import { SONGBOOK, songbookId } from '../tabs/songbook'
import { loadSongbookDoc } from '../tabs/songbookDocs'
import { takePendingBookPdf } from '../books/pending'
import { INSTRUMENTS, useInstrument, type Instrument, type InstrumentId } from '../instrument'
import { usePersist } from '../components/Controls'
import { go, openInPlay, setSubPage } from '../nav'
import { Ico } from '../components/Icon'
import { AddBox } from '../components/AddBox'
import { onToLearn, removeToLearn, toLearnList } from '../tabs/toLearn'


const PAGES = ['library', 'add'] as const
type Page = typeof PAGES[number]
const SHOW_HINT: Partial<Record<string, string>> = {
  plan: 'Reviews due, songs with a trouble spot, and what you\'re learning now.',
  scanned: 'Songs the Riff Scanner read from a video, picture or recording.',
  backing: 'Songs with a band to play along with: Guitar Pro band tracks, a chord band or a video.',
}
const mine = (s: SongDoc) => s.source !== 'example' && s.source !== 'lesson' && s.source !== 'songbook'

export function SongsScreen() {
  const inst = useInstrument()
  const [page, setPage] = useSubTab<Page>('songs', PAGES)
  // switching Songs pages stops an exercise or preview that was playing
  const lastPage = useRef(page)
  useEffect(() => { if (lastPage.current !== page) stopAllSounds(); lastPage.current = page }, [page])
  const [currentId] = usePersist(`playSong:${inst.id}`, '')
  const [songs, setSongs] = useState<SongDoc[] | null>(null)
  const refresh = async () => setSongs(await listSongs(inst.id))
  useEffect(() => { void listSongs(inst.id).then(setSongs) }, [inst.id])
  const open = (d: SongDoc) => openInPlay(d)
  const count = songs?.filter(mine).length ?? 0
  const [, setLibShow] = usePersist<LibShow>('libShow', 'all')

  return (
    <div className="songs-screen stack">
      <header className="screen-head">
        <PsyStrip at="0%" className="screen-art" />
        <h1>Songs</h1>
      </header>
      <SubTabs label="Songs" value={page} onChange={setPage} tabs={[
        { id: 'library', label: 'Library', badge: count || null },
        { id: 'add', label: 'Add a song' },
      ]} />
      {page === 'library' && <LibraryPage songs={songs} currentId={currentId} onOpen={open} refresh={refresh} onAdd={() => setPage('add')} />}
      {page === 'add' && <AddPage onOpen={open} onAdded={async () => { await refresh(); setLibShow('mine'); setPage('library') }} />}
    </div>
  )
}

type LibShow = 'all' | 'learning' | 'plan' | 'mine' | 'songbook' | 'learned' | 'scanned' | 'backing'
const SHOWS: { id: LibShow; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'learning', label: 'Learning now' }, { id: 'plan', label: 'Practice plan' }, { id: 'mine', label: 'Mine' },
  { id: 'songbook', label: 'Songbook' }, { id: 'learned', label: 'Learned' }, { id: 'scanned', label: 'Scanned' }, { id: 'backing', label: 'Backing tracks' },
]
/** One of his songs, by kind (the Library's chips and its Style / Tuning pickers). */
const scanned = (d: SongDoc) => d.origin === 'scan' || d.origin === 'recording'
/** a band to play with: Guitar Pro band tracks or drums, a chord band, or a video lined up with it */
const hasBacking = (d: SongDoc) => d.song.tracks.length > 1 || !!d.song.drums?.length || !!d.song.backing || !!d.youtube
function styleOf(d: SongDoc): string {
  let picked = ''
  try { picked = JSON.parse(localStorage.getItem(`kg:bandStyle:${d.id}`) ?? '""') as string } catch { /* storage */ }
  return bandStyleLabel((picked || guessBandStyle(d.song, d.title, d.artist)) as Parameters<typeof bandStyleLabel>[0])
}
function tuningOf(d: SongDoc, inst: Instrument): string {
  const t = d.song.tracks[d.track ?? 0]?.tuning ?? d.song.tracks[0]?.tuning ?? []
  const known = [...TUNINGS.map(x => ({ name: x.name, midis: x.notes.map(noteToMidi) })), ...inst.tunings.map(x => ({ name: x.name, midis: x.notes.map(noteToMidi) }))]
  const hit = known.find(k => k.midis.length === t.length && k.midis.every((m, i) => m === t[i]))
  return hit ? hit.name : t.length !== 6 ? `${t.length} strings` : 'Other tuning'
}
function inPlan(d: SongDoc, currentId: string, now = Date.now()): boolean {
  const st = songStats(d.id)
  if (!st) return d.id === currentId
  return (!!st.review && st.review.due <= now) || !!troubleBars(st) || d.id === currentId || (!st.learnedAt && now - st.lastAt < 14 * 86400000)
}

/** One row of the progress lists: a song of yours or a songbook part you've played. */
interface Progress { id: string; title: string; part?: string; best: number; lastAt: number; due: boolean; learned: boolean; open: () => void }

/** Songs → Library: "Learning now" first (in progress and reviews due), then your songs, then the songbook. One search
 *  for all of it; chips to show one kind. */
function LibraryPage({ songs, currentId, onOpen, refresh, onAdd }: {
  songs: SongDoc[] | null; currentId: string; onOpen: (d: SongDoc) => void; refresh: () => Promise<void>; onAdd: () => void
}) {
  const inst = useInstrument()
  const [show, setShow] = usePersist<LibShow>('libShow', 'all')
  // a link elsewhere asked for one kind (My songs, the Songbook) while this page was already open
  useEffect(() => { const f = (e: Event) => setShow((e as CustomEvent<LibShow>).detail); addEventListener('kg-libshow', f); return () => removeEventListener('kg-libshow', f) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [q, setQ] = useState('')
  const [style, setStyle] = usePersist('libStyle', '')
  const [tuning, setTuning] = usePersist('libTuning', '')
  const own = useMemo(() => (songs ?? []).filter(mine), [songs])
  const styles = useMemo(() => [...new Set(own.map(styleOf))].sort(), [own])
  const tunings = useMemo(() => [...new Set(own.map(d => tuningOf(d, inst)))].sort(), [own, inst])
  const kindOk = (d: SongDoc) => show === 'plan' ? inPlan(d, currentId) : show === 'scanned' ? scanned(d) : show === 'backing' ? hasBacking(d) : true
  const pick = (d: SongDoc) => kindOk(d) && (!style || styleOf(d) === style) && (!tuning || tuningOf(d, inst) === tuning)
  const now = Date.now()
  const query = q.trim().toLowerCase()
  const progress: Progress[] = (() => {
    if (!songs) return []
    const out: Progress[] = []
    const stats = allSongStats()
    for (const d of songs.filter(mine)) {
      if (!pick(d)) continue
      const st = stats[d.id]
      if (!st) continue
      out.push({ id: d.id, title: d.title, best: st.best, lastAt: st.lastAt, due: !!st.review && st.review.due <= now, learned: !!st.learnedAt, open: () => onOpen(d) })
    }
    for (const s of SONGBOOK) for (const p of s.parts) {
      const id = songbookId(s.id, p.id, inst)
      const st = stats[id]
      if (!st) continue
      out.push({ id, title: s.title, part: p.label, best: st.best, lastAt: st.lastAt, due: !!st.review && st.review.due <= now, learned: !!st.learnedAt,
        open: () => { void loadSongbookDoc(s.id, p.id, inst).then(doc => { if (doc) onOpen(doc) }) } })
    }
    return out.filter(x => !query || `${x.title} ${x.part ?? ''}`.toLowerCase().includes(query))
  })()
  const learning = progress.filter(x => !x.learned || x.due).sort((a, b) => Number(b.due) - Number(a.due) || b.lastAt - a.lastAt)
  const learned = progress.filter(x => x.learned && !x.due).sort((a, b) => b.lastAt - a.lastAt)
  const row = (x: Progress) => (
    <li key={x.id} className={x.id === currentId ? 'on' : ''}>
      <button className="song-open" onClick={x.open}>
        <PsyDog breed={breedOf(x.id)} className="song-dog" />
        <b>{x.title}</b>
        <span className="small muted">{[x.part, x.id.startsWith('sb:') ? 'Songbook' : 'Yours'].filter(Boolean).join(' · ')}</span>
        <span className="small song-progress">
          {x.best > 0 && <span>best {x.best}%</span>}
          <span className="muted">played {ago(x.lastAt)}</span>
          {x.due ? <span className="due">review due</span> : x.learned ? <span className="learned">✓ learned</span> : null}
        </span>
      </button>
    </li>
  )
  return (
    <WinArea area="songsLibrary" prefer={['jump', 'find', 'learning', 'learned', 'later', 'list', 'filters', 'songs']}>
      <Win id="jump" title="Practice and jump back in" className="panel" resizable={false}><JumpBackIn compact /></Win>
      <Win id="find" title="Find a song" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }} resizable={false}>
        <input className="input" type="search" placeholder="Search your songs and the songbook" value={q} onChange={e => setQ(e.target.value)} aria-label="Search your songs and the songbook" data-testid="lib-search" />
        <div className="chips lib-shows" role="group" aria-label="Show">
          {SHOWS.map(o => (
            <button key={o.id} className={`chip${show === o.id ? ' on' : ''}`} aria-pressed={show === o.id} onClick={() => setShow(o.id)} data-testid={`lib-${o.id}`}>
              {o.label}{o.id === 'learning' && learning.some(x => x.due) ? <span className="lib-due" aria-label="reviews due"> •</span> : null}
            </button>
          ))}
        </div>
        {own.length > 1 && (styles.length > 1 || tunings.length > 1 || style || tuning) && (
          <div className="row lib-pickers" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(styles.length > 1 || style) && (
              <label className="lib-picker"><span className="small muted">Style</span>
                <select className="input" value={style} onChange={e => setStyle(e.target.value)} data-testid="lib-style">
                  <option value="">Any style</option>
                  {styles.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
            )}
            {(tunings.length > 1 || tuning) && (
              <label className="lib-picker"><span className="small muted">Tuning</span>
                <select className="input" value={tuning} onChange={e => setTuning(e.target.value)} data-testid="lib-tuning">
                  <option value="">Any tuning</option>
                  {tunings.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
        {SHOW_HINT[show] && <p className="small muted" style={{ margin: 0 }}>{SHOW_HINT[show]}</p>}
      </Win>
      {(show === 'all' || show === 'learning') && (learning.length > 0 || show === 'learning') && (
        <Win id="learning" title={`Learning now (${learning.length})`} className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
          {learning.length ? <ul className="song-list">{learning.slice(0, show === 'all' ? 6 : 200).map(row)}</ul>
            : <p className="small muted" style={{ margin: 0 }}>{query ? 'Nothing you\'re learning matches.' : 'Songs you\'ve started (and reviews due on songs you learned) show here.'}</p>}
          {show === 'all' && learning.length > 6 && <button className="link-btn small" style={{ alignSelf: 'flex-start' }} onClick={() => setShow('learning')}>All {learning.length} you're learning</button>}
        </Win>
      )}
      {show === 'learned' && (
        <Win id="learned" title={`Learned (${learned.length})`} className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
          {learned.length ? <ul className="song-list">{learned.map(row)}</ul>
            : <p className="small muted" style={{ margin: 0 }}>A song counts as learned after a 90%+ run all the way through at 75% speed or faster. Reviews come back after 3, 7, 14, 30 and 60 days.</p>}
        </Win>
      )}
      {(show === 'all' || show === 'mine') && <SavedForLater onAdd={onAdd} />}
      {(show === 'all' || show === 'mine' || show === 'plan' || show === 'scanned' || show === 'backing') && (
        <MySongs songs={songs} currentId={currentId} onOpen={onOpen} refresh={refresh} onAdd={onAdd} onSongbook={() => setShow('songbook')} query={q}
          only={pick} title={show === 'plan' ? 'In your practice plan' : show === 'scanned' ? 'Scanned' : show === 'backing' ? 'With backing tracks' : undefined} />
      )}
      {(show === 'all' || show === 'songbook') && <Songbook currentId={currentId} onOpen={onOpen} query={q} embedded />}
    </WinArea>
  )
}

function MySongs({ songs, currentId, onOpen, refresh, onAdd, onSongbook, query, only, title }: {
  songs: SongDoc[] | null; currentId: string; onOpen: (d: SongDoc) => void; refresh: () => Promise<void>; onAdd: () => void; onSongbook: () => void; query: string
  only?: (d: SongDoc) => boolean; title?: string
}) {
  const inst = useInstrument()
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [moved, setMoved] = useState('')
  const filter = query
  if (!songs) return null
  const list = songs.filter(mine)
  const shown = list.filter(s => (!only || only(s)) && (!filter.trim() || `${s.title} ${s.artist ?? ''}`.toLowerCase().includes(filter.trim().toLowerCase())))
  if (list.length && title && !shown.length) {
    return (
      <Win id="list" title={`${title} (0)`} className="panel">
        <p className="small muted" style={{ margin: 0 }}>{filter.trim() ? 'Nothing here matches your search.' : 'None of your songs fit this yet.'}</p>
      </Win>
    )
  }
  if (!list.length) {
    return (
      <Win id="list" title="Your songs" className="panel empty-state">
        <PsyDogCard seed="songs-empty" className="empty-card" />
        <h2>No songs of your own yet</h2>
        <p className="small muted">{`Add a Guitar Pro file or paste a tab you found online, or start with a song from the songbook. Songs you add in ${inst.label.toLowerCase()} mode stay in ${inst.label.toLowerCase()} mode.`}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={onAdd}>Add a song</button>
          <button className="btn" onClick={onSongbook}>Open the songbook</button>
        </div>
        {moved && <p className="small muted" role="status">{moved}</p>}
      </Win>
    )
  }
  return (
    <Win id="list" title={`${title ?? 'Your songs'} (${shown.length !== list.length ? `${shown.length} of ` : ''}${list.length})`} className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
      {moved && <p className="small muted" role="status">{moved}</p>}
      <ul className="song-list">
        {shown.map(s => (
          <li key={s.id} className={s.id === currentId ? 'on' : ''}>
            <button className="song-open" onClick={() => onOpen(s)}>
              <PsyDog breed={breedOf(s.id)} className="song-dog" />
              <b>{s.title}</b>
              <span className="small muted">
                {[s.artist, s.source === 'gp' ? 'Guitar Pro' : s.source === 'chords' ? 'Chord sheet' : s.source === 'jam' ? 'Made in KGuitar' : 'Text tab', s.youtube ? 'video' : null, s.song.tracks.length > 1 ? `${s.song.tracks.length} tracks` : null].filter(Boolean).join(' · ')}
              </span>
              {(() => {
                const st = songStats(s.id)
                if (!st) return null
                const due = st.review && st.review.due <= Date.now()
                return (
                  <span className="small song-progress">
                    {st.best > 0 && <span>best {st.best}%</span>}
                    <span className="muted">played {ago(st.lastAt)}</span>
                    {st.learnedAt && <span className={due ? 'due' : 'learned'}>{due ? 'review due' : '✓ learned'}</span>}
                  </span>
                )
              })()}
            </button>
            {confirmDel === s.id ? (
              <span className="row" style={{ flexWrap: 'nowrap' }}>
                <button className="btn sm danger" onClick={async () => { await deleteSong(s.id); setConfirmDel(null); await refresh() }}>Delete</button>
                <button className="btn sm" onClick={() => setConfirmDel(null)}>Keep</button>
              </span>
            ) : moving === s.id ? (
              <span className="row" style={{ flexWrap: 'nowrap' }}>
                {(Object.keys(INSTRUMENTS) as InstrumentId[]).filter(i => i !== inst.id).map(i => (
                  <button key={i} className="btn sm" onClick={async () => { await saveSong({ ...s, inst: i }); setMoving(null); setMoved(`Moved "${s.title}" to ${INSTRUMENTS[i].label} mode.`); await refresh() }}>{INSTRUMENTS[i].short}</button>
                ))}
                <button className="btn sm ghost" onClick={() => setMoving(null)} aria-label="Cancel">✕</button>
              </span>
            ) : (
              <span className="row song-actions" style={{ flexWrap: 'nowrap', gap: 2 }}>
                <button className="btn sm ghost" onClick={() => setMoving(s.id)} aria-label={`Move ${s.title} to another instrument`}>Move</button>
                <button className="btn sm ghost" onClick={() => setConfirmDel(s.id)} aria-label={`Delete ${s.title}`}>Remove</button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {!shown.length && <p className="small muted">None of your songs match "{filter}".</p>}
    </Win>
  )
}

function AddPage({ onOpen, onAdded }: { onOpen: (d: SongDoc) => void; onAdded: () => Promise<void> }) {
  const inst = useInstrument()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // a PDF book: pick its pages first
  const [book, setBook] = useState<{ name: string; bytes: Uint8Array; pages: number } | null>(null)
  // a page of one of his books sent from My books: open the PDF at that page
  useEffect(() => {
    const p = takePendingBookPdf()
    if (!p) return
    void import('../tabs/pdfTab').then(async ({ pdfPageCount }) => setBook({ name: p.name, bytes: p.bytes, pages: await pdfPageCount(p.bytes) }))
  }, [])
  const [scanned, setScanned] = useState<{ name: string; pics: { name: string; mime: string; b64: string; url: string }[]; fromBook?: boolean } | null>(null)
  const [scanLink, setScanLink] = useState<string | undefined>()
  // a PDF printed from Songsterr ("Artist - Song"): the song itself (exact notes, rhythm, every part) can come from there
  const [songsterr, setSongsterr] = useState('')
  const [boxKey, setBoxKey] = useState(0)
  const pictures = useRef<HTMLDivElement | null>(null)
  const link: string | undefined = undefined

  /** Import one or many files (from the phone or straight from Google Drive). One file opens right away. */
  /** A scanned PDF (or tab printed as pictures): hand its pages to the picture reader below. */
  async function toPictures(name: string, e: unknown, fromBook = false): Promise<boolean> {
    if (!(e instanceof Error && e.name === 'Error' && /scanned/.test(e.message) && 'bytes' in e)) return false
    const sc = e as Error & { bytes: Uint8Array; from?: number; count?: number; songsterr?: string }
    setSongsterr(sc.songsterr ?? '')
    const { pdfPictures } = await import('../tabs/pdfTab')
    try {
      setScanned({ name, pics: await pdfPictures(sc.bytes, sc.count ?? 6, sc.from ?? 1), fromBook })
      // pages picked from a book are read right where you tapped (the scanner window further down could be tucked away)
      if (!fromBook) setTimeout(() => pictures.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
      return true
    } catch { return false }
  }

  async function openFiles(files: File[]) {
    files = [...files]
    setError('')
    setBook(null)
    // one PDF book: ask which pages first
    if (files.length === 1) {
      const bytes = new Uint8Array(await files[0].arrayBuffer())
      if (isPdf(files[0].name, bytes)) {
        const { pdfPageCount } = await import('../tabs/pdfTab')
        const pages = await pdfPageCount(bytes).catch(() => 0)
        if (pages > BOOK_PAGES) { setBook({ name: files[0].name, bytes, pages }); return }
      }
    }
    // pictures of a tab → the picture reader; a recording → the Riff Scanner listens
    const pics = files.filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|webp|heic)$/i.test(f.name))
    if (pics.length) {
      const read = await Promise.all(pics.slice(0, 6).map(f => new Promise<{ name: string; mime: string; b64: string; url: string }>((res, rej) => {
        const r = new FileReader(); r.onload = () => { const url = String(r.result); res({ name: f.name, mime: f.type || 'image/jpeg', b64: url.split(',')[1] ?? '', url }) }; r.onerror = rej; r.readAsDataURL(f)
      }))).catch(() => [])
      if (read.length) { setScanned({ name: pics.length === 1 ? pics[0].name : `${pics.length} pictures`, pics: read }); setTimeout(() => pictures.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
      files = files.filter(f => !pics.includes(f))
      if (!files.length) return
    }
    const rec = files.find(f => /^(audio|video)\//.test(f.type) || /\.(mp3|wav|m4a|aac|ogg|flac|mp4|mov|webm)$/i.test(f.name))
    if (rec && files.length === 1) {
      setBusy(true)
      try {
        const { audio } = await import('../audio/engine')
        const buf = await audio().decodeAudioData(await rec.arrayBuffer())
        const { setPendingSound } = await import('../scan/pending')
        const x = buf.numberOfChannels > 1 ? (() => { const a = buf.getChannelData(0), b = buf.getChannelData(1), m = new Float32Array(a.length); for (let i = 0; i < a.length; i++) m[i] = (a[i] + b[i]) / 2; return m })() : buf.getChannelData(0).slice()
        setPendingSound({ x, sr: buf.sampleRate, title: rec.name.replace(/\.[^.]+$/, '') })
        setBusy(false)
        const { openJam } = await import('../nav'); openJam('find')
      } catch { setBusy(false); setError(`Couldn't play "${rec.name}". Try an MP3, WAV or M4A file.`) }
      return
    }
    setBusy(true)
    const ok: SongDoc[] = []
    const failed: string[] = []
    for (const f of files) {
      try {
        ok.push(await songFromFile(f.name, new Uint8Array(await f.arrayBuffer()), inst, link))
      } catch (e) {
        if (await toPictures(f.name, e)) continue
        failed.push(f.name)
      }
    }
    setBusy(false)
    if (failed.length) setError(`Couldn't read ${failed.length === 1 ? `"${failed[0]}"` : `${failed.length} files (${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''})`}. KGuitar opens Guitar Pro files (.gp, .gp5, .gpx, .gp4, .gp3), PDFs and text tabs.`)
    if (files.length === 1 && ok.length === 1) { onOpen(ok[0]); return }
    if (ok.length && !failed.length) await onAdded()
  }

  /** Read the pages picked from a PDF book. */
  async function readBook(from: number, to: number) {
    if (!book) return
    setError(''); setBusy(true)
    try {
      const doc = { ...(await songFromPdf(book.name, book.bytes, inst, link, { from, to })), origin: 'book' as const }
      await saveSong(doc)
      setBook(null); setBusy(false)
      onOpen(doc)
    } catch (e) {
      setBusy(false)
      if (await toPictures(`${book.name.replace(/\.[^.]+$/, '')} p.${from}${to > from ? `–${to}` : ''}`, e, true)) { setBook(null); return }
      setError(`No tab or chords found on pages ${from}–${to}. Try the pages either side (‹ ›): the book's page numbers can be a few off from the PDF's.`)
    }
  }

  return (
    <WinArea area="songsAdd">
      <Win id="box" title="Add a song" className="panel" bodyClass="stack" bodyStyle={{ gap: 10 }} hint={<>One box for everything: a song name searches Songsterr and Ultimate Guitar (straight in on the phone); a YouTube link offers Find a tab, Scan it or Save for later; a Songsterr or Ultimate Guitar page comes straight in; a pasted tab or chord sheet loads. <b>Files</b>: Guitar Pro, PDF (a book asks which pages), text, a picture or screenshot of a tab (the Riff Scanner reads it), or a recording (the Riff Scanner listens). <b>From Google Drive:</b> in the picker, tap ☰ and choose Drive. Long-press to pick several files.</>}>
        <AddBox key={boxKey} onOpen={onOpen} onFiles={fs => void openFiles(fs)} onScan={url => { setScanLink(url); setTimeout(() => pictures.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} />
        {busy && <p className="small muted" role="status" style={{ margin: 0 }}>Importing…</p>}
        {book && <PdfPages name={book.name} bytes={book.bytes} pages={book.pages} busy={busy} onRead={(a, b) => void readBook(a, b)} onCancel={() => setBook(null)} />}
        {busy && book && <p className="small muted" role="status" style={{ margin: 0 }}>Getting the pages ready…</p>}
        {songsterr && (
          <div className="notice small row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }} data-testid="songsterr-offer">
            <span>This PDF was printed from <b>Songsterr</b>. KGuitar reads its numbers itself (below); the song on Songsterr also has every part and the exact rhythm.</span>
            <button className="btn sm primary" onClick={() => { try { sessionStorage.setItem('kg:addPrefill', songsterr) } catch { /* private */ } setBoxKey(k => k + 1); setSongsterr('') }} data-testid="songsterr-find">Find "{songsterr}" on Songsterr</button>
          </div>
        )}
        {scanned?.fromBook && (
          <div className="stack book-scan" style={{ gap: 6 }} data-testid="book-scan">
            <p className="notice small" style={{ margin: 0 }}>KGuitar is reading the tab on <b>{scanned.name}</b>. When it shows here, check any numbers with an amber ring against the page, then tap <b>Open in Play</b>.</p>
            <ScanVideo key={scanned.name} autoRead title={scanned.name} initialPics={scanned.pics.map(p => ({ name: p.name, url: p.url }))} />
          </div>
        )}
        {error && <p className="notice small" role="alert">{error}</p>}
      </Win>
      <Win id="picture" title="Riff Scanner: a video, a picture of a tab or a scanned PDF" bodyClass="stack" bodyStyle={{ gap: 8 }}
        extra={<button className="btn sm" onClick={() => { setSubPage('jam', 'find'); go('progressions') }} data-testid="open-scanner"><Ico n="scan" /> Full scanner</button>}>
        <div ref={pictures} />
        {scanned && !scanned.fromBook && <p className="notice small" style={{ margin: 0 }}>The tab in "{scanned.name}" is printed as pictures (a scan, or numbers drawn as shapes): KGuitar reads it below by itself.</p>}
        <ScanVideo key={`${scanned && !scanned.fromBook ? scanned.name : ''}|${scanLink ?? ''}`} youtube={scanLink} links initialLink={scanLink} autoRead={!!scanned && !scanned.fromBook} title={scanned && !scanned.fromBook ? scanned.name : undefined} initialPics={scanned && !scanned.fromBook ? scanned.pics.map(p => ({ name: p.name, url: p.url })) : undefined} />
        <p className="small muted" style={{ margin: 0 }}>The full Riff Scanner (Full scanner, or the link under Jam's three buttons) also scans YouTube links and Shorts, and listens.</p>
      </Win>
    </WinArea>
  )
}


/** Library → Saved for later: names and videos saved from Add a song, with Find a tab / Scan it. */
function SavedForLater({ onAdd }: { onAdd: () => void }) {
  const [list, setList] = useState(toLearnList)
  useEffect(() => onToLearn(() => setList(toLearnList())), [])
  if (!list.length) return null
  const again = (x: { title: string; youtube?: string }) => {
    try { sessionStorage.setItem('kg:addPrefill', x.youtube ?? x.title) } catch { /* private */ }
    onAdd()
  }
  return (
    <Win id="later" title={`Saved for later (${list.length})`} className="panel" bodyClass="stack" bodyStyle={{ gap: 6 }}>
      <ul className="plain stack" style={{ gap: 6 }} data-testid="saved-later">
        {list.map(x => (
          <li key={x.id} className="row" style={{ gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ minWidth: 0 }}><b>{x.title}</b>{x.youtube && <span className="small muted"> · video</span>}</span>
            <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
              <button className="btn sm" onClick={() => again(x)}>{x.youtube ? 'Find a tab or scan' : 'Find a tab'}</button>
              <button className="btn sm ghost" onClick={() => removeToLearn(x.id)} aria-label={`Remove ${x.title}`}>✕</button>
            </span>
          </li>
        ))}
      </ul>
    </Win>
  )
}
