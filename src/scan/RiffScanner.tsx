// The Riff Scanner (Jam → Riff Scanner, and from Songs → Add a song): get a riff, a solo or a whole song into KGuitar.
//   Scan a video   a YouTube link, screenshots of a tab, or a video / audio file (a Samsung screen recording too)
//   Shorts         swipe through guitar Shorts and scan or play along with one
//   Listen         the live mic (chords or a melody as you play) and notes from a recording
// Tabs read off the screen are the most accurate; anything worked out from the sound asks "Does this look right?".
import { ReviewsWaiting } from './ReviewBox'
import type { Gray } from './image'
import { useEffect, useRef, useState } from 'react'
import { Ico } from '../components/Icon'
import { Win, WinArea } from '../components/Win'
import { usePersist } from '../components/Controls'
import { useInstrument } from '../instrument'
import { songFromText, stringNames } from '../tabs/importer'
import { newId, type SongDoc } from '../tabs/library'
import { AiSetup } from '../assistant/AiSetup'
import { AiError } from '../assistant/providers'
import { audio } from '../audio/engine'
import { analyse } from '../audio/tempo'
import { CropBox, ScanProgress, ScanResult, setStage, type ScanOut, type Stage } from './ScanParts'
import { loadPicture, piecesFromPictures, soundOf, tabBoxes, tabFromVideo, unionBox, type Box, type Piece } from './pictures'
import { canRead, readPieces, writtenTempo } from './read'
import { chartText, parseTime, watchLink } from './link'
import { canGrab, startGrab, type GrabSession } from './grab'
import { useSoundScan } from './useSoundScan'
import { VoiceOutToggle } from './VoiceOut'
import { ShortsFeed } from './ShortsFeed'
import { youtubeId } from '../tabs/library'
import { YouTubePlayer } from '../components/YouTubePlayer'
import type { VideoApi } from '../play/inTime'
import { withSig } from '../components/TempoSheet'
import { aiSettings } from '../assistant/providers'

const canAskGemini = () => !!aiSettings().keys.gemini

export type ScanMode = 'scan' | 'shorts' | 'listen'

interface Pic { name: string; url: string; img: HTMLImageElement }

/** The tab text → a song (Tempo: lines and strum lines are taken off first). */
export function songFromScan(text: string, title: string, inst: ReturnType<typeof useInstrument>, youtube?: string): SongDoc | null {
  const bpm = writtenTempo(text)
  const body = text.split('\n').filter(l => !/^\s*Tempo:/i.test(l) && !/^\s*([DUBX]\s*[-|]*\s*){2,}$/.test(l.trim())).join('\n')
  const doc = songFromText(body, title, inst, youtube)
  if (!doc) return null
  return bpm ? { ...doc, song: { ...doc.song, tempo: bpm, tempoFrom: 'file' } } : doc
}

/** the pictures for the "Check it in the picture" card; a phone that can't make them just doesn't show the card */
function safeSources(make: () => { url: string; w: number; h: number }[]) { try { return make() } catch { return undefined } }

export function RiffScanner({ listen, onUseInJam, startMode }: {
  /** the Listen page's own windows (live mic, notes from a recording) */
  listen: React.ReactNode
  onUseInJam?: (chords: string[]) => void
  startMode?: ScanMode
}) {
  const [saved, setMode] = usePersist<ScanMode>('scanMode', startMode ?? 'scan')
  const mode: ScanMode = saved === 'shorts' || saved === 'listen' ? saved : 'scan'
  useEffect(() => {
    const f = (e: Event) => {
      const d = (e as CustomEvent<{ mode?: ScanMode }>).detail
      if (d?.mode) setMode(d.mode)
    }
    addEventListener('kg-open-scanner', f)
    return () => removeEventListener('kg-open-scanner', f)
  }, [setMode])
  return (
    <div className="riff-scanner stack" style={{ gap: 10 }} data-testid="riff-scanner">
      <ReviewsWaiting />
      <div className="scan-modes" role="tablist" aria-label="Riff Scanner">
        {([['scan', 'film', 'Scan a video', 'Link, screenshots or a file'], ['shorts', 'shuffle', 'Shorts', 'Swipe through guitar Shorts'], ['listen', 'mic', 'Listen', 'The mic: chords or notes']] as const).map(([id, icon, label, sub]) => (
          <button key={id} role="tab" aria-selected={mode === id} className={`scan-mode${mode === id ? ' on' : ''}`} onClick={() => setMode(id)} data-testid={`scan-mode-${id}`}>
            <Ico n={icon} /><b>{label}</b><span className="small">{sub}</span>
          </button>
        ))}
      </div>
      {mode === 'scan' && (
        <WinArea area="scanVideo">
          <Win id="scan-video" title="Scan a video or tab" className="panel" bodyClass="stack" bodyStyle={{ gap: 10 }}>
            <ScanVideo onUseInJam={onUseInJam} links onListen={() => setMode('listen')} />
          </Win>
        </WinArea>
      )}
      {mode === 'shorts' && (
        <WinArea area="scanShorts">
          <Win id="scan-shorts" title="Guitar Shorts" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
            <ShortsFeed onListen={() => setMode('listen')} onUseInJam={onUseInJam} />
          </Win>
        </WinArea>
      )}
      {mode === 'listen' && listen}
    </div>
  )
}

/** Screenshots, or a video / audio file → a tab. */
export function ScanVideo({ onUseInJam, youtube, initialPics, links = false, onListen, initialLink, autoRead = false, autoLink = false, compactShort = false, title }: {
  onUseInJam?: (chords: string[]) => void
  youtube?: string
  initialPics?: { name: string; url: string }[]
  /** read initialPics straight away (pages picked from a book: one tap, not two) */
  autoRead?: boolean
  /** scan initialLink straight away (tapped "Scan this Short" in the Shorts feed) */
  autoLink?: boolean
  /** launched from ShortsFeed: hide unrelated upload/link clutter and put Deep Scan right at the top */
  compactShort?: boolean
  /** the song's name when it's read (e.g. the book and its pages) */
  title?: string
  /** offer a YouTube link (Full-Screen Deep Scan → screen recording → optional Quick cloud scan) */
  links?: boolean
  /** "Play it out loud": go to the mic */
  onListen?: () => void
  /** start with this link in the box (a Short from the feed) */
  initialLink?: string
}) {
  const inst = useInstrument()
  const [link, setLink] = usePersist('scanLink', '')
  const [deepMode, setDeepMode] = usePersist('scanDeepMode', true)
  useEffect(() => {
    const f = (e: Event) => {
      const d = (e as CustomEvent<{ link?: string }>).detail
      if (d?.link) {
        setLink(d.link)
        setShortLayout(/\/shorts\//.test(d.link))
      }
    }
    addEventListener('kg-open-scanner', f)
    return () => removeEventListener('kg-open-scanner', f)
  }, [setLink])
  useEffect(() => {
    if (initialLink) {
      setLink(initialLink)
      setShortLayout(/\/shorts\//.test(initialLink))
    }
  }, [initialLink]) // eslint-disable-line react-hooks/exhaustive-deps
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [phase, setPhase] = useState<null | 'grab' | 'record'>(null)
  const [why, setWhy] = useState('')
  const [grabbing, setGrabbing] = useState(0)
  const [theater, setTheater] = useState(false)
  const [shortLayout, setShortLayout] = useState(() => /\/shorts\//.test(initialLink ?? ''))
  const [grabAudio, setGrabAudio] = useState<{ ok: boolean; err?: string } | null>(null)
  const ytApi = useRef<VideoApi | null>(null)
  const ytFrameRef = useRef<HTMLDivElement | null>(null)
  const grabCardRef = useRef<HTMLDivElement | null>(null)
  const session = useRef<GrabSession | null>(null)
  useEffect(() => {
    if (phase === 'grab' && !theater) setTimeout(() => grabCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }, [phase, theater])
  const [pics, setPics] = useState<Pic[]>([])
  const [box, setBox] = useState<Box | null>(null)
  const [userCropped, setUserCropped] = useState(false)
  const [stages, setStages] = useState<Stage[] | null>(null)
  const [out, setOut] = useState<ScanOut | null>(null)
  // a scan from sound keeps working after the first result: the better version, the AI's second opinion
  const sound = useSoundScan(youtube)
  const [msg, setMsg] = useState('')
  const [setup, setSetup] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const ready = canRead()
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => { if (initialPics?.length) void addUrls(initialPics) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // pages from a book: once they're loaded, read them (KGuitar's own reader needs no AI)
  const autoDone = useRef(false)
  useEffect(() => {
    if (!autoRead || autoDone.current || !initialPics?.length || pics.length < initialPics.length) return
    autoDone.current = true
    void scanPictures()
  }, [autoRead, ready, pics.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // tapped "Scan this Short": in Deep Mode use KGuitar's 99% pixel tab_crnn + Audio Engine screen grabber FIRST;
  // in Quick Mode (or if screen grab isn't supported) use Gemini link watching directly.
  const autoLinkDone = useRef('')
  useEffect(() => {
    const u = initialLink?.trim()
    if (!autoLink || !u || autoLinkDone.current === u || !youtubeId(u)) return
    autoLinkDone.current = u
    if ((deepMode || compactShort) && canGrab()) {
      setWhy('Captures crisp full-screen frames + sound so every unsure note pops up in "Check it in the picture".')
      setPhase('grab')
    } else if (canAskGemini()) {
      void scanLink(u)
    } else {
      setWhy('Set up a free Gemini key for quick watching, or let KGuitar grab the tab right from the screen.')
      setPhase('grab')
    }
  }, [autoLink, initialLink, deepMode, compactShort]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addUrls(list: { name: string; url: string }[]) {
    const add: Pic[] = []
    for (const p of list) { try { add.push({ ...p, img: await loadPicture(p.url) }) } catch { /* skip */ } }
    const all = [...pics, ...add].slice(0, 12)
    setPics(all); setOut(null); setMsg('')
    // the tab area on the first picture that has staff lines: shown as a box you can adjust
    if (!box) {
      setUserCropped(false)
      for (const p of all) { const b = unionBox(tabBoxes(p.img)); if (b) { setBox(b); break } }
    }
  }
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files]
    const media = list.find(f => /^(video|audio)\//.test(f.type) || /\.(mp4|m4a|mp3|wav|webm|mov|3gp|ogg|flac|aac)$/i.test(f.name))
    if (media) { void scanFile(media); return }
    await addUrls(list.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic)$/i.test(f.name)).map(f => ({ name: f.name, url: URL.createObjectURL(f) })))
  }

  // KGuitar's own reading of the pictures, kept when the AI reads them instead: its picture spots go on the AI's notes
  const ownTry = useRef<{ song: import('../tabs/model').Song; sources: { url: string; w: number; h: number }[] } | null>(null)
  const begin = (list: Stage[]) => { abort.current?.abort(); abort.current = new AbortController(); setStages(list); setOut(null); setMsg(''); return abort.current.signal }
  const step = (id: string, p: Partial<Stage>) => setStages(s => (s ? setStage(s, id, p) : s))
  const fail = (e: unknown) => {
    const m = e instanceof Error ? e.message : 'Something went wrong.'
    setMsg(/Cancelled/.test(m) ? 'Cancelled.' : m)
    setStages(s => s?.map(x => (x.state === 'run' ? { ...x, state: 'fail' } : x)) ?? null)
  }
  const readOut = async (pieces: Piece[], signal: AbortSignal, title: string, how: string, tempoGuess?: number) => {
    step('ai', { state: 'run', note: `${pieces.length} strip${pieces.length === 1 ? '' : 's'}`, pct: 0 })
    const { text } = await readPieces(pieces, { signal, onDone: (d, t) => step('ai', { pct: d / t, note: `${d} of ${t}` }) })
    step('ai', { state: 'done' })
    step('hand', { state: 'run' })
    let doc = songFromScan(text, title, inst, youtube)
    if (!doc) throw new AiError("The AI's answer didn't read as a tab: open Fix the tab text below to see it.")
    if (tempoGuess && doc.song.tempoFrom !== 'file') doc = { ...doc, song: { ...doc.song, tempo: tempoGuess, tempoFrom: 'detected' } }
    step('hand', { state: 'done' }); step('tempo', { state: 'done', note: `${Math.round(doc.song.tempo ?? 90)} BPM${doc.song.tempoFrom === 'guess' ? ' (a guess)' : ''}` })
    const own = ownTry.current
    ownTry.current = null
    let sources: { url: string; w: number; h: number }[] | undefined
    if (own?.sources.length) {
      try {
        const { borrowSources, attachFallbackSources } = await import('./tabReadSong')
        doc = { ...doc, song: borrowSources(doc.song, own.song) }
        sources = own.sources
        // Ensure notes that didn't match ownTry still get a strip spot so Visual Checker always opens
        doc = { ...doc, song: attachFallbackSources(doc.song, sources.length) }
      } catch { /* no pictures */ }
    } else if (pieces.length) {
      try {
        const { attachFallbackSources } = await import('./tabReadSong')
        sources = pieces.map(p => ({ url: p.url, w: p.w, h: p.h }))
        doc = { ...doc, song: attachFallbackSources(doc.song, sources.length) }
      } catch { /* no pictures */ }
    }
    setOut({ doc: { ...doc, id: newId() }, heard: false, how, text, reparse: t => songFromScan(t, title, inst, youtube), strips: pieces.map(p => ({ url: p.url, w: p.w, h: p.h })), ...(sources ? { sources } : {}) })
    setStages(null)
  }

  /** Tab strips taken from a video (stitched across its frames), read by KGuitar itself (used when no AI reader is set up).
   *  True when it read a tab; the video's own tempo goes on the song. */
  /** the trained picture reader is in the app: it goes before the AI (the AI is the fallback when it can't read it) */
  async function ownFirst() {
    try { await (await import('../ml/models')).tabCrnnRunner(); return true } catch { return false }
  }

  async function readOwnPieces(pieces: Piece[], name: string, how: string, bpm?: number, strips?: Gray[], hear?: import('./tabReadSong').VideoSound, signal?: AbortSignal): Promise<boolean> {
    const { readTabPicturesBest, trustReading, grayOf, songTabText, grayPicture } = await import('./tabReadSong')
    // the whole strips when we have them (cut pieces would split bars), else the pieces
    const grays = strips?.length ? strips : (await Promise.all(pieces.map(pc => loadPicture(pc.url)))).map(im => grayOf(im))
    const r = await readTabPicturesBest(grays, inst.midis, name, { video: !!strips?.length, deep: deepMode, ...(hear && strips?.length ? { hear } : {}) })
    ownTry.current = r ? { song: r.song, sources: safeSources(() => grays.map(grayPicture)) ?? [] } : null
    if (!r || !(trustReading(r) || !ready)) return false
    ownTry.current = null
    let cropSummary: import('./cropReferee').CropRefSummary | null = null
    if (deepMode && ready && r.unsure > 0) {
      try {
        step('ai', { state: 'run', note: `double-checking ${Math.min(12, r.unsure)} tricky spot${r.unsure === 1 ? '' : 's'}` })
        const { refineUnsureWithCropAi } = await import('./cropReferee')
        cropSummary = await refineUnsureWithCropAi(r.song, grays, { signal })
        // Recount remaining unsure notes after Zoom-Crop AI check
        let rem = 0
        for (const tr of r.song.tracks) for (const b of tr.bars) for (const st of b.steps) for (const n of st.notes as { unsure?: boolean }[]) if (n.unsure) rem++
        r.unsure = rem
        step('ai', { state: 'done', note: cropSummary.checked ? `checked ${cropSummary.checked} spot${cropSummary.checked === 1 ? '' : 's'}` : undefined })
      } catch { /* keep local read */ }
    }
    const song = bpm ? { ...r.song, tempo: bpm, tempoFrom: 'file' as const } : r.song
    const doc: SongDoc = { id: newId(), title: name, source: 'text', inst: inst.id, song, youtube, updated: Date.now() }
    const pol = r.polish
    const polBits = pol
      ? [
          `${Math.round(pol.meanMatch * 100)}% audio match`,
          pol.tuningChanged ? `${pol.tuningLabel}${pol.capo ? ` (Capo ${pol.capo})` : ''} detected` : '',
          pol.notesCorrected ? `${pol.notesCorrected} fixed by ear` : '',
          pol.notesConfirmed ? `${pol.notesConfirmed} confirmed by ear` : '',
          pol.notesFlagged ? `${pol.notesFlagged} flagged by audio` : '',
        ].filter(Boolean)
      : []
    const cropBits = cropSummary && (cropSummary.confirmed || cropSummary.corrected)
      ? [`AI crop check: ${[cropSummary.confirmed ? `${cropSummary.confirmed} confirmed` : '', cropSummary.corrected ? `${cropSummary.corrected} fixed` : ''].filter(Boolean).join(', ')}`]
      : []
    const extraBits = [...polBits, ...cropBits]
    setOut({
      doc, heard: false, text: songTabText(song, stringNames(inst)), reparse: t => songFromScan(t, name, inst, youtube),
      strips: pieces.map(p => ({ url: p.url, w: p.w, h: p.h })),
      sources: safeSources(() => grays.map(grayPicture)),
      ...(pol?.barTimes && Object.keys(pol.barTimes).length ? { barTimes: pol.barTimes } : {}),
      how: `${how} Read ${r.notes} note${r.notes === 1 ? '' : 's'}${extraBits.length ? ` · ${extraBits.join(' · ')}` : ''}.${r.unsure ? ` ${r.unsure} unsure spot${r.unsure === 1 ? '' : 's'} ready to verify in the picture.` : ' All notes look clean!'}`,
    })
    setStages(null)
    return true
  }

  async function scanPictures() {
    if (!pics.length) return
    // 1 KGuitar reads the numbers itself (no AI, no key): exact strings, every number checked against the page's own font
    const name = title || 'Scanned tab'
    const sig = begin([{ id: 'own', label: deepMode ? 'Reading the tab on screen (Accurate)' : 'Reading the numbers on the tab lines', state: 'run' }])
    await new Promise(r => setTimeout(r, 30))
    try {
      const { readTabPicturesBest, trustReading, grayOf, songTabText, grayPicture } = await import('./tabReadSong')
      const minW = deepMode ? 2200 : 1600
      // Multi-page PDF books / screenshot sets: don't blindly apply Page 1's auto-crop (which starts below a title header)
      // to Pages 2–6 unless the user explicitly dragged the crop box!
      const applyBox = pics.length === 1 || userCropped ? box : null
      let grays = pics.map(p => grayOf(p.img, minW, applyBox))
      let r = await readTabPicturesBest(grays, inst.midis, name, { deep: deepMode })
      if (!r && applyBox) { grays = pics.map(p => grayOf(p.img, minW)); r = await readTabPicturesBest(grays, inst.midis, name, { deep: deepMode }) }
      ownTry.current = r ? { song: r.song, sources: safeSources(() => grays.map(grayPicture)) ?? [] } : null
      if (r && (trustReading(r) || !ready)) {
        ownTry.current = null
        if (deepMode && ready && r.unsure > 0) {
          try {
            const { refineUnsureWithCropAi } = await import('./cropReferee')
            await refineUnsureWithCropAi(r.song, grays, { signal: sig })
            let rem = 0
            for (const tr of r.song.tracks) for (const b of tr.bars) for (const st of b.steps) for (const n of st.notes as { unsure?: boolean }[]) if (n.unsure) rem++
            r.unsure = rem
          } catch { /* non-fatal */ }
        }
        const doc: SongDoc = { id: newId(), title: name, source: 'text', inst: inst.id, song: r.song, youtube, updated: Date.now() }
        const names = stringNames(inst)
        setOut({
          doc, heard: false, text: songTabText(r.song, names), reparse: t => songFromScan(t, name, inst, youtube),
          strips: pics.map(p => ({ url: p.url, w: p.img.naturalWidth || p.img.width, h: p.img.naturalHeight || p.img.height })),
          sources: safeSources(() => grays.map(grayPicture)),
          how: `Read ${r.notes} note${r.notes === 1 ? '' : 's'} on ${r.staves} staff${r.staves === 1 ? '' : 's'}${r.meter !== 4 ? ` (${r.meter}/4)` : ''}.${r.unsure ? ` ${r.unsure} unsure spot${r.unsure === 1 ? '' : 's'} ready to verify in the picture.` : ' All notes look clean!'}`,
        })
        setStages(null)
        return
      }
      if (!ready) throw new Error("No tab staff with numbers was found in the picture. Drag the box round the tab, or set up the free AI reader for pictures like this.")
    } catch (e) { if (!ready) { fail(e); return } }
    // 2 the AI reader (handwriting, photos at an angle, tabs KGuitar couldn't read itself)
    const signal = begin([
      { id: 'frames', label: 'Finding the tab', state: 'run' },
      { id: 'sharpen', label: 'Enlarging and sharpening', state: 'wait' },
      { id: 'ai', label: 'Reading tricky tab with AI', state: 'wait' },
      { id: 'hand', label: 'Placing it on the neck', state: 'wait' },
      { id: 'tempo', label: 'Tempo', state: 'wait' },
    ])
    try {
      await new Promise(r => setTimeout(r, 30))
      const { pieces, found } = piecesFromPictures(pics.map(p => p.img), box)
      step('frames', { state: 'done', note: found ? `${found} staff${found === 1 ? '' : 's'}` : 'no staff lines: reading the box' })
      step('sharpen', { state: 'done', note: `${pieces.length} strip${pieces.length === 1 ? '' : 's'}` })
      await readOut(pieces, signal, title || 'Scanned tab', `Read from ${pics.length} picture${pics.length === 1 ? '' : 's'}${found ? '' : ' (no staff lines found, so the box you set was read)'}.`)
    } catch (e) { fail(e) }
  }

  async function scanFile(f: File) {
    const isVideo = /^video\//.test(f.type) || /\.(mp4|webm|mov|3gp)$/i.test(f.name)
    const title = f.name.replace(/\.[^.]+$/, '') || 'Scanned riff'
    const signal = begin([
      ...(isVideo ? [{ id: 'frames', label: 'Looking through the video for a tab', state: 'run' as const }] : []),
      { id: 'sound', label: 'Checking tempo & audio', state: isVideo ? 'wait' : 'run' },
      ...(isVideo ? [{ id: 'ai', label: 'Reading tab & checking tricky spots', state: 'wait' as const }] : []),
      { id: 'notes', label: 'Writing down the notes', state: 'wait' },
      { id: 'hand', label: 'Placing it on the neck', state: 'wait' },
      { id: 'tempo', label: 'Tempo', state: 'wait' },
    ])
    try {
      let pieces: Piece[] = []
      let strips: Gray[] | undefined
      let timelines: { x: number; t: number }[][] | undefined
      let views: { x0: number; w: number; t: number }[][] | undefined
      if (isVideo) {
        const v = await tabFromVideo(f, { signal, box, from: parseTime(from), to: parseTime(to), onProgress: (p, note) => step('frames', { pct: p, note }) })
        pieces = v.pieces
        strips = v.strips
        timelines = v.timelines
        views = v.views
        step('frames', { state: 'done', note: pieces.length ? `${pieces.length} strip${pieces.length === 1 ? '' : 's'}${v.scrolled ? ', scrolling tab stitched' : ''}` : 'no tab on screen' })
      }
      step('sound', { state: 'run' })
      const snd = await soundOf(f, audio())
      const a = snd ? analyse(snd.x, snd.sr) : null
      step('sound', { state: snd ? 'done' : 'skip', note: a ? `${Math.round(a.bpm)} BPM, ${a.meter.num}/${a.meter.den}` : snd ? 'no clear beat' : 'no sound track' })
      if (signal.aborted) throw new Error('Cancelled.')
      if (pieces.length && (!ready || await ownFirst()) && await readOwnPieces(pieces, title, `Read from the tab on screen in "${f.name}"${a ? ', tempo from its sound' : ''}.`, a ? Math.round(a.bpm) : undefined, strips, snd && timelines ? { x: snd.x, sr: snd.sr, timelines, views } : undefined, signal)) return
      if (pieces.length && ready) {
        step('notes', { state: 'skip', note: 'read from the screen instead' })
        await readOut(pieces, signal, title, `Read from the tab on screen in "${f.name}"${a ? `, tempo from its sound` : ''}.`, a ? Math.round(a.bpm) : undefined)
        return
      }
      if (isVideo) step('ai', { state: 'skip', note: pieces.length ? 'needs an AI key' : 'no tab on screen' })
      if (!snd) throw new Error("This file has no sound I can open, and no tab on screen to read.")
      await scanSound(snd.x, snd.sr, title, `the sound of "${f.name}"`, isVideo ? [{ id: 'frames', label: 'Looking through the video for a tab', state: 'done', note: 'no tab on screen' }] : [])
    } catch (e) { fail(e) }
  }

  /** Notes from sound: quick draft at once, then the better version and the AI's second opinion (soundScan.ts). */
  async function scanSound(x: Float32Array, sr: number, title: string, source: string, done: Stage[] = [], yt?: string) {
    // the shared engine shows its own steps from here
    abort.current?.abort(); setStages(null); setOut(null); setMsg('')
    await sound.run(x, sr, title, source, done, yt)
  }

  const linkUrl = youtubeId(link) ? link.trim() : ''
  const strNames = [...inst.tuning.notes].reverse().map((n, i) => { const x = n.replace(/-?\d+$/, ''); return i === 0 && inst.strings === 6 ? 'e' : x }).map(x => `${x}|`).join(', ')
  // 1 Gemini watches the link
  async function scanLink(targetUrl = linkUrl) {
    if (!targetUrl) return
    setPhase(null); setWhy('')
    const signal = begin([
      { id: 'watch', label: 'Gemini is watching the video', state: 'run' },
      { id: 'hand', label: 'Placing it on the neck', state: 'wait' },
      { id: 'tempo', label: 'Tempo and time signature', state: 'wait' },
    ])
    const t0 = Date.now()
    const tick = setInterval(() => step('watch', { note: `${Math.round((Date.now() - t0) / 1000)} s (a whole song can take a minute or two)` }), 1000)
    try {
      if (!canAskGemini()) throw new AiError('Gemini needs its free key to watch videos.')
      const w = await watchLink(targetUrl, { inst: inst.isUke ? 'ukulele' : 'guitar', strings: strNames, from: parseTime(from), to: parseTime(to), signal })
      clearInterval(tick)
      if (w.source === 'none' || (!w.tab && w.chords.length < 2)) throw new AiError("Gemini watched it but found no guitar part it could write down.")
      step('watch', { state: 'done', note: w.source === 'screen' ? 'read the tab on screen' : 'worked it out from the sound' })
      step('hand', { state: 'run' })
      const title = 'Scanned riff'
      let doc = w.tab ? songFromScan(w.tab, title, inst, targetUrl) : null
      const chordsOnly = !doc
      if (!doc) doc = songFromText(chartText(w.chords), title, inst, targetUrl)
      if (!doc) throw new AiError("Gemini's answer didn't read as a tab or chords.")
      doc = { ...doc, id: newId(), youtube: targetUrl, song: { ...doc.song, ...(w.tempo ? { tempo: w.tempo, tempoFrom: 'ai' as const } : {}), ...(w.timeSig ? withSig(w.timeSig) : {}) } }
      step('hand', { state: 'done' }); step('tempo', { state: 'done', note: `${Math.round(doc.song.tempo ?? 90)} BPM${w.timeSig ? `, ${w.timeSig.join('/')}` : ''}` })
      setOut({
        doc, heard: w.source !== 'screen' || chordsOnly, text: w.tab || undefined, reparse: t => songFromScan(t, title, inst, targetUrl),
        how: w.source === 'screen' ? 'Gemini watched the video and read the tab on screen.' : chordsOnly ? 'Gemini watched the video and wrote down the chords it heard.' : 'Gemini watched the video and worked the part out from the sound.',
      })
      setStages(null)
    } catch (e) {
      clearInterval(tick)
      if (signal.aborted) { fail(e); return }
      // 2 next: KGuitar watches it here and grabs the screen
      setStages(null)
      setWhy(e instanceof Error ? e.message : 'Gemini could not watch it.')
      setPhase('grab')
    }
  }
  // 2 KGuitar expands the video to a full-screen theater stage, crops ONLY the crisp video player rect, and captures internal audio
  async function startGrabbing() {
    const f = parseTime(from) ?? 0, t = parseTime(to)
    const isShort = shortLayout || /\/shorts\//.test(linkUrl)
    // Deep Mode captures at 5 FPS on Shorts & 4 FPS on full YouTube videos (up to 8 minutes) so moving playheads are cleanly erased
    const secs = Math.min(480, Math.max(10, t !== undefined ? t - f + 2 : isShort ? 90 : 360))
    const fps = deepMode ? (isShort ? 5 : 4) : 3
    try {
      // Expand video player to full-screen theater FIRST so YouTube switches to crisp HD and we measure its exact full-screen DOM rect!
      setTheater(true)
      await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())))
      let crop: Box | undefined
      const el = ytFrameRef.current
      if (el && typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
        const r = el.getBoundingClientRect()
        if (r.width >= 60 && r.height >= 60) {
          crop = {
            x: Math.max(0, Math.min(1, r.left / window.innerWidth)),
            y: Math.max(0, Math.min(1, r.top / window.innerHeight)),
            w: Math.max(0.05, Math.min(1, r.width / window.innerWidth)),
            h: Math.max(0.05, Math.min(1, r.height / window.innerHeight)),
          }
        }
      }
      const sess = await startGrab({ seconds: secs, fps, crop })
      session.current = sess
      setGrabAudio({ ok: sess.audioOk, err: sess.audioError })
      sess.onStopped(() => void stopGrabbing())
      ytApi.current?.seek(f); ytApi.current?.play()
      const t0 = Date.now()
      setGrabbing(1)
      const id = setInterval(() => {
        if (!session.current) { clearInterval(id); return }
        setGrabbing(Math.max(1, Math.round((Date.now() - t0) / 1000)))
        if (t !== undefined && ytApi.current && ytApi.current.time() >= t) {
          clearInterval(id)
          void stopGrabbing()
        }
      }, 400)
    } catch (e) {
      setTheater(false)
      setGrabAudio(null)
      setWhy(e instanceof Error ? e.message : 'Screen capture could not start.')
      session.current = null
    }
  }
  async function stopGrabbing() {
    const sess = session.current
    if (!sess) return
    session.current = null
    setGrabbing(0)
    setTheater(false)
    setGrabAudio(null)
    ytApi.current?.pause()
    const scanName = title?.trim() || 'Scanned riff'
    const signal = begin([
      { id: 'frames', label: 'Capturing video frames & tab strips', state: 'run', pct: 0 },
      { id: 'sound', label: 'Checking tempo & audio', state: 'wait' },
      { id: 'ai', label: 'Reading tab & checking tricky spots', state: 'wait' },
      { id: 'hand', label: 'Placing it on the neck', state: 'wait' },
      { id: 'tempo', label: 'Tempo', state: 'wait' },
    ])
    try {
      const g = await sess.stop(p => step('frames', { pct: p }))
      step('frames', { state: g.pieces.length ? 'done' : 'fail', note: g.pieces.length ? `${g.pieces.length} strip${g.pieces.length === 1 ? '' : 's'} from ${g.frames} frames${g.scrolled ? ', scrolling tab stitched' : ''}` : 'no tab on screen' })
      const a = g.sound ? analyse(g.sound.x, g.sound.sr) : null
      step('sound', { state: a ? 'done' : 'skip', note: a ? `${Math.round(a.bpm)} BPM` : g.sound ? 'no clear beat' : g.audioError ? `no audio (${g.audioError})` : 'no sound captured' })
      if (!g.pieces.length) {
        if (!g.sound) throw new Error(`No tab showed on screen while it played, and no sound came through${g.audioError ? ` (${g.audioError})` : ''}. Try a screen recording with Media sounds, Quick Cloud Guess, or Play it out loud.`)
        // no tab on screen: work it out from the sound that played inside the phone
        await scanSound(g.sound.x, g.sound.sr, scanName, 'the sound of the video (inside the phone)', [{ id: 'frames', label: 'Capturing video frames & tab strips', state: 'done', note: 'no tab on screen' }], linkUrl)
        setPhase(null)
        return
      }
      if ((!ready || await ownFirst()) && await readOwnPieces(g.pieces, scanName, `Scanned full-screen${a ? '; tempo from its sound' : ''}.`, a ? Math.round(a.bpm) : undefined, g.strips, g.sound && g.timelines ? { x: g.sound.x, sr: g.sound.sr, timelines: g.timelines, views: g.views } : undefined, signal)) { setOut(o => (o ? { ...o, doc: { ...o.doc, youtube: linkUrl || o.doc.youtube } } : o)); setPhase(null); return }
      if (!ready) throw new Error('KGuitar couldn\'t find a tab staff with numbers in the video. Set up the free AI reader for videos like this.')
      await readOut(g.pieces, signal, scanName, `Scanned full-screen and read with AI${a ? '; tempo from its sound' : ''}.`, a ? Math.round(a.bpm) : undefined)
      setOut(o => (o ? { ...o, doc: { ...o.doc, youtube: linkUrl || o.doc.youtube } } : o))
      setPhase(null)
    } catch (e) { fail(e); setPhase('record') }
  }

  const again = () => { ownTry.current = null; sound.reset(); setOut(null); setPics([]); setBox(null); setUserCropped(false); setMsg(''); setPhase(null); setWhy(''); setTheater(false); setGrabAudio(null) }
  // a video Gemini read in the cloud: offer to read it here so each note can be checked against its frame
  const framesFor = out && !out.sources?.length && linkUrl && out.doc.youtube && /Gemini watched/.test(out.how) ? () => { setOut(null); setWhy('Reading it here, so each note you tap shows the video frame it came from.'); setPhase('grab') } : undefined
  if (out) return <ScanResult out={out} onUseInJam={onUseInJam} onAgain={again} onFrames={framesFor} />
  const heardView = sound.view({ onUseInJam, onAgain: again })
  if (heardView) return heardView
  return (
    <div className="scan-video stack" style={{ gap: 10 }}>
      {!ready && (
        <div className="notice small">Printed tabs (screenshots, book pages) are read by KGuitar itself. Tricky videos and zoomed AI spot-checks use a free Google Gemini key (a minute to set up, no card). <button className="btn sm" onClick={() => setSetup(!setup)}>{setup ? 'Close' : 'Set it up'}</button></div>
      )}
      {setup && !ready && <AiSetup compact />}
      {!compactShort && (
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="seg" role="group" aria-label="Scanner accuracy mode" data-testid="scan-accuracy-mode">
            <button
              className="btn sm"
              aria-pressed={deepMode}
              onClick={() => setDeepMode(true)}
              data-testid="scan-mode-deep"
              title="Reads the real tab pixels on screen, checks notes against the guitar audio, and pops up Picture Check for unsure notes"
            >
              🎯 Accurate (Picture Check)
            </button>
            <button
              className="btn sm"
              aria-pressed={!deepMode}
              onClick={() => setDeepMode(false)}
              data-testid="scan-mode-quick"
              title="Faster cloud scan without local video frames or Picture Check"
            >
              ⚡ Quick (No Picture)
            </button>
          </div>
          <span className="small muted">
            {deepMode
              ? 'Reads the real tab pixels + audio check, and opens Picture Check on any unsure notes.'
              : 'Fast cloud guess (no video frames to visually verify).'}
          </span>
        </div>
      )}
      {links && !compactShort && (
        <form
          className="scan-link stack"
          style={{ gap: 6 }}
          onSubmit={e => {
            e.preventDefault()
            if (deepMode && canGrab()) {
              setShortLayout(/\/shorts\//.test(linkUrl))
              setWhy('Captures crisp full-screen frames + internal audio so every unsure note pops up in "Check it in the picture".')
              setPhase('grab')
            } else {
              void scanLink()
            }
          }}
        >
          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            <input className="input" inputMode="url" placeholder="YouTube link (a lesson, a song, a Short)" value={link} onChange={e => setLink(e.target.value)} aria-label="YouTube link to scan" data-testid="scan-link" />
            <button className="btn primary" type="submit" disabled={!linkUrl || !!stages} data-testid="scan-link-go"><Ico n="scan" /> {deepMode ? 'Deep Scan' : 'Scan'}</button>
          </div>
          <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="small muted">Only a part?</span>
            <input className="input" style={{ width: 72, flex: 'none' }} placeholder="from 1:20" value={from} onChange={e => setFrom(e.target.value)} aria-label="From (minutes:seconds)" />
            <input className="input" style={{ width: 72, flex: 'none' }} placeholder="to 2:05" value={to} onChange={e => setTo(e.target.value)} aria-label="To (minutes:seconds)" />
          </div>
          {link.trim() && !linkUrl && <span className="small" style={{ color: 'var(--coral)' }}>That doesn't look like a YouTube link.</span>}
        </form>
      )}
      {phase === 'grab' && linkUrl && (
        <div ref={grabCardRef} className={`scan-grab stack${theater ? ' grabbing-fs' : ' panel'}${shortLayout ? ' is-short' : ' is-wide'}`} style={{ gap: theater ? 0 : 8 }} data-testid="scan-grab">
          {!theater && (
            <>
              <div className="row" style={{ gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {canGrab() ? (
                  <button className="btn primary" onClick={() => void startGrabbing()} data-testid="grab-start">
                    <Ico n="screen" /> Start Full-Screen Deep Scan
                  </button>
                ) : (
                  <p className="small muted" style={{ margin: 0 }}>Screen grab needs the Android app or desktop browser: use a screen recording below.</p>
                )}
                <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="seg" role="group" aria-label="Video shape">
                    <button className="btn sm" aria-pressed={shortLayout} onClick={() => setShortLayout(true)}>9:16 Short</button>
                    <button className="btn sm" aria-pressed={!shortLayout} onClick={() => setShortLayout(false)}>16:9 Wide</button>
                  </div>
                  <button className="btn sm ghost" onClick={() => setPhase('record')}>Screen recording</button>
                  {canAskGemini() && (
                    <button className="btn sm ghost" onClick={() => void scanLink(linkUrl)} data-testid="grab-quick-gemini" title="Faster cloud read, but no Picture Check">
                      ⚡ Quick (no picture)
                    </button>
                  )}
                </div>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                <b>🎯 Full-Screen Deep Scan (Picture Check):</b> {why || 'Expands full-screen for sharp tab pixels + internal audio, auto-stops at the end, and pops up Picture Check for any unsure notes.'}
              </p>
              {compactShort && (
                <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="small muted">Only a part?</span>
                  <input className="input" style={{ width: 72, flex: 'none' }} placeholder="from 0:05" value={from} onChange={e => setFrom(e.target.value)} aria-label="From (minutes:seconds)" />
                  <input className="input" style={{ width: 72, flex: 'none' }} placeholder="to 0:45" value={to} onChange={e => setTo(e.target.value)} aria-label="To (minutes:seconds)" />
                </div>
              )}
            </>
          )}
          <YouTubePlayer
            url={linkUrl}
            onUrl={u => { setLink(u ?? ''); if (!u) { setPhase(null); setTheater(false) } }}
            onApi={a => { ytApi.current = a }}
            onError={code => { if ([101, 150, 152, 153].includes(code)) { setTheater(false); setWhy("This video's owner doesn't let it play inside other apps."); setPhase('record') } }}
            onStateChange={st => { if (st === 0 && session.current) void stopGrabbing() }}
            frameClass={shortLayout ? 'is-short' : 'is-wide'}
            frameRef={ytFrameRef}
            hideBar={theater}
            note=""
          />
          {canGrab() && theater && (
            <div className="scan-fs-bar" data-testid="scan-fs-bar">
              <span className="scan-rec-dot" aria-hidden />
              <b className="tabular">{grabbing ? `${grabbing} s` : 'Starting…'}</b>
              <span className="small muted" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {grabAudio ? (grabAudio.ok ? '🔊 Internal audio · auto-stops at end' : `🔇 Video only (${grabAudio.err ?? 'no audio'})`) : 'Allow screen capture to begin'}
              </span>
              <button
                className="btn primary on"
                onClick={() => { if (session.current) void stopGrabbing(); else { setTheater(false); setGrabbing(0) } }}
                data-testid="grab-stop"
              >
                <Ico n="stop" fill /> {session.current ? 'Stop & Read Tab' : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      )}
      {phase === 'record' && (
        <div className="scan-record stack panel" style={{ gap: 6 }} data-testid="scan-record">
          {why && <p className="small" style={{ margin: 0 }}>{why}</p>}
          <b>Record it with your phone, then pick the recording</b>
          <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Swipe down from the top of the screen twice and tap <b>Screen recorder</b> (on Samsung it's in Quick settings).</li>
            <li>Under sound, choose <b>Media sounds</b> (not the mic), then Start.</li>
            <li>Open the video in YouTube{linkUrl ? <> (<a href={linkUrl} target="_blank" rel="noreferrer">open it</a>)</> : null}, play the part with the tab on screen, then stop the recording.</li>
            <li>Come back here and tap <b>Pick the screen recording</b>.</li>
          </ol>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <label className="btn primary"><input type="file" accept="video/*" hidden onChange={e => { void addFiles(e.target.files); e.target.value = '' }} /><Ico n="upload" /> Pick the screen recording</label>
            {onListen && <button className="btn ghost" onClick={onListen} data-testid="scan-loud">Play it out loud (mic)</button>}
          </div>
        </div>
      )}
      {!compactShort && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <label className="btn primary"><input type="file" accept="image/*" multiple hidden onChange={e => { void addFiles(e.target.files); e.target.value = '' }} data-testid="scan-pics" /><Ico n="camera" /> Screenshots</label>
            <label className="btn"><input type="file" accept="video/*,audio/*" hidden onChange={e => { void addFiles(e.target.files); e.target.value = '' }} data-testid="scan-file" /><Ico n="upload" /> Video or audio file</label>
          </div>
          <VoiceOutToggle />
          <p className="small muted" style={{ margin: 0 }}>A tab shown on screen is read directly (screenshots or a screen recording both work): KGuitar follows scrolling tabs, checks notes against the sound, and opens Picture Check on any unsure notes.</p>
        </>
      )}
      {pics.length > 0 && !stages && (
        <div className="stack" style={{ gap: 8 }}>
          <CropBox url={pics[0].url} box={box} onBox={b => { setBox(b); setUserCropped(true) }} />
          <span className="small muted">
            {box ? 'The box is where the tab was found: drag it or its corners if it missed some.' : 'No staff lines found: drag the box around the tab.'}
            {pics.length > 1 ? (userCropped ? ` Your manual crop box is used on all ${pics.length} pictures.` : ` All ${pics.length} pages are auto-detected individually (drag the box only if you want to crop every page).`) : ''}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" onClick={() => void scanPictures()} data-testid="scan-read">Read the tab</button>
            <button className="btn ghost sm" onClick={again}>Clear</button>
            <span className="small muted">{pics.length} picture{pics.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}
      {stages && <ScanProgress stages={stages} onCancel={() => abort.current?.abort()} />}
      {(msg || sound.msg) && <p className="small" role="status" style={{ margin: 0 }} data-testid="scan-msg">{msg || sound.msg}</p>}
    </div>
  )
}
