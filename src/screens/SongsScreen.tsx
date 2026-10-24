// Songs: everything you can play, on four short pages: your songs, the songbook, practice tabs and generators,
// and adding a song (find one online, upload Guitar Pro or text files, or paste a tab or chord sheet).
import { Fold, HintHead } from '../components/Fold'
import { Songbook } from '../components/Songbook'
import { ProgressionTabs } from '../components/ProgressionTabs'
import { LickMaker } from '../components/LickMaker'
import { SubTabs, useSubTab } from '../components/SubTabs'
import { PsyArt } from '../components/PsyArt'
import { STARTER_PROGS, jamProgression, starterProgression } from '../tabs/fromProgression'
import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteSong, listSongs, refreshBuiltIn, saveSong, youtubeId, type SongDoc } from '../tabs/library'
import { EXAMPLES, exampleDoc, exampleId } from '../tabs/examples'
import { songFromFile, songFromText } from '../tabs/importer'
import { ago, songStats } from '../play/songStats'
import { Clipboard } from '@capacitor/clipboard'
import { INSTRUMENTS, useInstrument, type InstrumentId } from '../instrument'
import { KeyPicker, Chips, usePersist } from '../components/Controls'
import { ESSENTIALS, EX_ARPS, EX_LICKS, EX_SCALES, EX_SEQUENCES, EX_WARMUPS, buildExercise, type ExerciseKind, type ExerciseSpec } from '../tabs/exercises'
import { openInPlay } from '../nav'

const KINDS: { id: ExerciseKind; label: string }[] = [
  { id: 'scale', label: 'Scales' }, { id: 'sequence', label: 'Sequences' }, { id: 'arpeggio', label: 'Arpeggios' },
  { id: 'lick', label: 'Licks' }, { id: 'warmup', label: 'Warm-ups' },
]

const SITES = [
  { id: 'songsterr', label: 'Songsterr', url: (q: string) => `https://www.songsterr.com/?pattern=${encodeURIComponent(q)}` },
  { id: 'ug', label: 'Ultimate Guitar', url: (q: string) => `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}` },
  { id: 'gp', label: 'Guitar Pro files', url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`${q} guitar pro tab gp5 OR gpx OR gp download`)}` },
]

const PAGES = ['mine', 'songbook', 'practice', 'add'] as const
type Page = typeof PAGES[number]
const mine = (s: SongDoc) => s.source !== 'example' && s.source !== 'lesson' && s.source !== 'songbook'

export function SongsScreen() {
  const inst = useInstrument()
  const [page, setPage] = useSubTab<Page>('songs', PAGES)
  const [currentId] = usePersist(`playSong:${inst.id}`, '')
  const [songs, setSongs] = useState<SongDoc[] | null>(null)
  const refresh = async () => setSongs(await listSongs(inst.id))
  useEffect(() => { void listSongs(inst.id).then(setSongs) }, [inst.id])
  const open = (d: SongDoc) => openInPlay(d)
  const count = songs?.filter(mine).length ?? 0

  return (
    <div className="songs-screen stack">
      <header className="screen-head">
        <PsyArt kind="pop" className="screen-art" />
        <h1>Songs</h1>
      </header>
      <SubTabs label="Songs" value={page} onChange={setPage} tabs={[
        { id: 'mine', label: 'My songs', badge: count || null },
        { id: 'songbook', label: 'Songbook' },
        { id: 'practice', label: 'Practice' },
        { id: 'add', label: 'Add a song' },
      ]} />
      {page === 'mine' && <MySongs songs={songs} currentId={currentId} onOpen={open} refresh={refresh} onAdd={() => setPage('add')} onSongbook={() => setPage('songbook')} />}
      {page === 'songbook' && <Songbook currentId={currentId} onOpen={open} />}
      {page === 'practice' && <PracticePage currentId={currentId} onOpen={open} />}
      {page === 'add' && <AddPage onOpen={open} onAdded={async () => { await refresh(); setPage('mine') }} />}
    </div>
  )
}

function MySongs({ songs, currentId, onOpen, refresh, onAdd, onSongbook }: {
  songs: SongDoc[] | null; currentId: string; onOpen: (d: SongDoc) => void; refresh: () => Promise<void>; onAdd: () => void; onSongbook: () => void
}) {
  const inst = useInstrument()
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [moved, setMoved] = useState('')
  const [filter, setFilter] = useState('')
  if (!songs) return null
  const list = songs.filter(mine)
  const shown = list.filter(s => !filter.trim() || `${s.title} ${s.artist ?? ''}`.toLowerCase().includes(filter.trim().toLowerCase()))
  if (!list.length) {
    return (
      <section className="panel empty-state">
        <PsyArt kind="face" className="empty-art" />
        <h2>No songs of your own yet</h2>
        <p className="small muted">Add a Guitar Pro file or paste a tab you found online, or start with a song from the songbook. Songs you add in {inst.label.toLowerCase()} mode stay in {inst.label.toLowerCase()} mode.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={onAdd}>Add a song</button>
          <button className="btn" onClick={onSongbook}>Open the songbook</button>
        </div>
        {moved && <p className="small muted" role="status">{moved}</p>}
      </section>
    )
  }
  return (
    <section className="stack" style={{ gap: 8 }}>
      {moved && <p className="small muted" role="status">{moved}</p>}
      {list.length > 4 && (
        <input className="input" type="search" placeholder="Search your songs" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Search your songs" />
      )}
      <ul className="song-list">
        {shown.map(s => (
          <li key={s.id} className={s.id === currentId ? 'on' : ''}>
            <button className="song-open" onClick={() => onOpen(s)}>
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
      {!shown.length && <p className="small muted">No song matches "{filter}".</p>}
    </section>
  )
}

function PracticePage({ currentId, onOpen }: { currentId: string; onOpen: (d: SongDoc) => void }) {
  const inst = useInstrument()
  const [error, setError] = useState('')
  const [exKind, setExKind] = usePersist<ExerciseKind>('exKind', 'scale')
  const [exRoot, setExRoot] = usePersist('exRoot', 'A')
  const [exType, setExType] = usePersist<Record<ExerciseKind, string>>('exType', { scale: 'minor pentatonic', sequence: 'threes', arpeggio: 'maj', lick: 'box-desc', warmup: 'spider' })
  const [exScale, setExScale] = usePersist('exScale', 'minor pentatonic')
  const [exPos, setExPos] = usePersist('exPos', 0)
  const typeOptions = exKind === 'scale' ? EX_SCALES.map(x => ({ id: x.id, label: x.label }))
    : exKind === 'sequence' ? EX_SEQUENCES : exKind === 'arpeggio' ? EX_ARPS.map(x => ({ id: x.id, label: x.label }))
      : exKind === 'lick' ? EX_LICKS.map(x => ({ id: x.id, label: x.label })) : EX_WARMUPS
  const posCount = exKind === 'warmup' || exKind === 'lick' ? 0 : exKind === 'scale' && !/pentatonic|blues/.test(exType.scale) ? 7 : 5

  async function openExercise(spec: ExerciseSpec) {
    const song = buildExercise(spec, inst.midis)
    if (!song.tracks[0].bars.length) { setError("That exercise doesn't fit this instrument. Try another position."); return }
    const id = `lib:${inst.id}:${inst.tuning.id}:${spec.kind}:${spec.root}:${spec.type}:${spec.position}:${spec.scale ?? ''}`
    const doc: SongDoc = { id, title: song.title, source: 'lesson', inst: inst.id, song, updated: Date.now() }
    await saveSong(doc)
    onOpen(doc)
  }
  const saveOpen = async (d: SongDoc) => { await saveSong(d); onOpen(d) }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <section className="stack" style={{ gap: 6 }}>
        <HintHead level={2} title="Practice tabs" hint="They play along like any song: the mic follows you, Hear it plays them, and you can loop any part." />
        <ul className="song-list">
          {ESSENTIALS.map(e => (
            <li key={e.title}>
              <button className="song-open" onClick={() => void openExercise(e.spec)}>
                <b>{e.title}</b>
                <span className="small muted">{e.why}</span>
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="notice small" role="alert">{error}</p>}
      </section>
      <Fold id="songsBuild" title="Build your own practice tab" summary="scales, sequences, arpeggios, licks, warm-ups">
        <Chips label="Kind" items={KINDS} value={exKind} onChange={setExKind} />
        {exKind !== 'warmup' && <KeyPicker value={exRoot} onChange={setExRoot} />}
        <Chips label="Type" wrap items={typeOptions} value={exType[exKind]} onChange={v => setExType({ ...exType, [exKind]: v })} />
        {exKind === 'sequence' && (
          <Chips label="Scale" items={EX_SCALES.map(x => ({ id: x.id, label: x.label }))} value={exScale} onChange={setExScale} />
        )}
        {posCount > 0 && (
          <Chips label="Position" items={[...Array.from({ length: posCount }, (_, i) => ({ id: i, label: `Position ${i + 1}` })), { id: -1, label: 'All positions' }]} value={exPos >= posCount ? 0 : exPos} onChange={setExPos} />
        )}
        {exKind === 'lick' && <p className="small muted" style={{ margin: 0 }}>{EX_LICKS.find(l => l.id === exType.lick)?.feel}</p>}
        <div className="row">
          <button className="btn primary" onClick={() => void openExercise({ kind: exKind, root: exRoot, type: exType[exKind], position: posCount ? (exPos >= posCount ? 0 : exPos) : 0, scale: exScale })}>Open in Play</button>
        </div>
      </Fold>
      <PickingSection onOpen={saveOpen} />
      <Fold id="songsLicks" title="Lick generator" summary="bluegrass to metal"
        hint="New practice licks in bluegrass, rock, prog metal, metal, folk or country. Roll until you like one, then open it and play along.">
        <LickMaker onOpen={saveOpen} />
      </Fold>
      <section className="stack" style={{ gap: 6 }}>
        <h2 className="sec-title">Examples</h2>
        <ul className="song-list">
          {EXAMPLES.filter(e => e.for === inst.id || e.for === 'any').map(e => (
            <li key={e.id} className={exampleId(e.id, inst.id) === currentId ? 'on' : ''}>
              <button className="song-open" onClick={() => void refreshBuiltIn(exampleDoc(e.id, inst.tuning.notes)).then(onOpen)}><b>{e.title}</b></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function AddPage({ onOpen, onAdded }: { onOpen: (d: SongDoc) => void; onAdded: () => Promise<void> }) {
  const inst = useInstrument()
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [yt, setYt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [clipNote, setClipNote] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const link = yt.trim() && youtubeId(yt) ? yt.trim() : undefined

  async function pasteClipboard() {
    setClipNote('')
    try {
      const { value } = await Clipboard.read()
      const v = (value ?? '').trim()
      if (!v) { setClipNote('The clipboard is empty. Copy the tab on the website first.'); return }
      if (youtubeId(v) && v.length < 200) { setYt(v); setClipNote('Pasted a YouTube link.'); return }
      setText(v)
      setClipNote(songFromText(v, '', inst) ? 'Pasted. Check the title, then tap Load tab.' : "Pasted, but I can't see tab lines or chords in it yet. Copy the lines that look like  e|---0---|, or a chord sheet with the chords above the words.")
    } catch {
      setClipNote('Could not read the clipboard here: long-press in the box below and choose Paste.')
    }
  }

  /** Import one or many files (from the phone or straight from Google Drive). One file opens right away. */
  async function openFiles(files: File[]) {
    setError('')
    setBusy(true)
    const ok: SongDoc[] = []
    const failed: string[] = []
    for (const f of files) {
      try {
        ok.push(await songFromFile(f.name, new Uint8Array(await f.arrayBuffer()), inst, link))
      } catch {
        failed.push(f.name)
      }
    }
    setBusy(false)
    if (failed.length) setError(`Couldn't read ${failed.length === 1 ? `"${failed[0]}"` : `${failed.length} files (${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''})`}. KGuitar opens Guitar Pro files (.gp, .gp5, .gpx, .gp4, .gp3) and text tabs.`)
    if (files.length === 1 && ok.length === 1) { onOpen(ok[0]); return }
    if (ok.length && !failed.length) await onAdded()
  }

  async function loadText() {
    setError('')
    const doc = songFromText(text, title.trim(), inst, link)
    if (!doc) {
      setError(`No tab or chords found. Paste tab lines that look like  e|---0---3---|  (all ${inst.strings} strings), or a chord sheet with chord names above the lyrics.`)
      return
    }
    await saveSong(doc)
    onOpen(doc)
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <section className="panel stack" style={{ gap: 8 }}>
        <HintHead level={2} title="1. Find a tab" hint={<>Opens the site in your browser. Then either download the Guitar Pro file and come back to <b>Upload tab files</b>, or copy the tab text and tap <b>Paste from clipboard</b>.</>} />
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
      </section>

      <section className="panel stack" style={{ gap: 10 }}>
        <HintHead level={2} title="2. Bring it in" hint={<>Guitar Pro (.gp .gp5 .gpx .gp4 .gp3) or text tabs (.txt). <b>From Google Drive:</b> in the picker, tap ☰ and choose Drive (or your Google account), then open your tabs folder. Long-press a file to select several and import them all at once.</>} />
        <div className="row">
          <button className="btn primary" disabled={busy} onClick={() => file.current?.click()}>{busy ? 'Importing…' : 'Upload tab files'}</button>
          <button className="btn" onClick={() => void pasteClipboard()}>Paste from clipboard</button>
          <input ref={file} type="file" multiple hidden onChange={e => { const fs = [...(e.target.files ?? [])]; e.target.value = ''; if (fs.length) void openFiles(fs) }} />
        </div>
        <label className="field">
          <span>…or paste a text tab or a chord sheet (chords above the words)</span>
          <textarea className="input mono" rows={6} value={text} onChange={e => setText(e.target.value)} placeholder={inst.strings === 4 ? `${[...inst.tuning.notes].reverse().map(n => n[0]).join('|-----------|\n')}|-----------|` : 'e|-----0-----|\nB|---1---1---|\nG|-2-------2-|\nD|-----------|\nA|-----------|\nE|-----------|'} spellCheck={false} />
        </label>
        <div className="row">
          <input className="input" style={{ flex: '1 1 160px' }} placeholder="Song title (optional)" value={title} onChange={e => setTitle(e.target.value)} aria-label="Song title" />
          <input className="input" style={{ flex: '2 1 220px' }} placeholder="YouTube link (optional)" inputMode="url" value={yt} onChange={e => setYt(e.target.value)} aria-label="YouTube link" />
          <button className="btn primary" disabled={!text.trim()} onClick={() => void loadText()}>Load tab</button>
        </div>
        {clipNote && <span className="small muted" role="status">{clipNote}</span>}
        {yt.trim() && !link && <span className="small" style={{ color: 'var(--coral)' }}>That YouTube link doesn't look right.</span>}
        {error && <p className="notice small" role="alert">{error}</p>}
      </section>
    </div>
  )
}

/** Fingerpicking (Travis / arpeggio) and chord melody tabs from your Jam progression or a starter progression. */
function PickingSection({ onOpen }: { onOpen: (d: SongDoc) => void }) {
  const jam = useMemo(() => jamProgression(), [])
  const [src, setSrc] = usePersist('pickSource', jam ? 'jam' : 'pop')
  const [key, setKey] = usePersist('pickKey', 'G')
  const useJam = src === 'jam' && !!jam
  const prog = useMemo(() => (useJam ? { mode: jam!.mode, chords: jam!.chords } : starterProgression(src === 'jam' ? 'pop' : src, key)), [useJam, jam, src, key])
  return (
    <Fold id="songsPicking" title="Fingerpicking & chord melody" summary="over a progression"
      hint="Travis picking, arpeggios or a chord melody over a progression: the one you made in Jam, or a classic one.">
      <label className="field">
        <span>Progression</span>
        <select className="select" value={useJam ? 'jam' : src === 'jam' ? 'pop' : src} onChange={e => setSrc(e.target.value)}>
          {jam && <option value="jam">My Jam progression: {jam.chords.map(c => c.symbol).join(' – ')}</option>}
          {STARTER_PROGS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      {!useJam && <KeyPicker value={key} onChange={setKey} />}
      <ProgressionTabs chords={prog.chords} tonic={useJam ? jam!.tonic : key} mode={prog.mode} bpm={useJam ? jam!.bpm : 80} onOpen={onOpen} />
    </Fold>
  )
}
