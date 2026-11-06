// The Riff Scanner (Jam → Riff Scanner, and from Songs → Add a song): get a riff, a solo or a whole song into KGuitar.
//   Scan a video   a YouTube link, screenshots of a tab, or a video / audio file (a Samsung screen recording too)
//   Shorts         swipe through guitar Shorts and scan or play along with one
//   Listen         the live mic (chords or a melody as you play) and notes from a recording
// Tabs read off the screen are the most accurate; anything worked out from the sound asks "Does this look right?".
import { useEffect, useRef, useState } from 'react'
import { Ico } from '../components/Icon'
import { usePersist } from '../components/Controls'
import { useInstrument } from '../instrument'
import { songFromText } from '../tabs/importer'
import { newId, type SongDoc } from '../tabs/library'
import { AiSetup } from '../assistant/AiSetup'
import { AiError } from '../assistant/providers'
import { audio } from '../audio/engine'
import { analyse } from '../audio/tempo'
import { CropBox, ScanProgress, ScanResult, setStage, type ScanOut, type Stage } from './ScanParts'
import { loadPicture, piecesFromPictures, soundOf, tabBoxes, tabFromVideo, unionBox, type Box, type Piece } from './pictures'
import { canRead, readPieces, writtenTempo } from './read'

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

export function RiffScanner({ listen, onUseInJam, startMode }: {
  /** the Listen page's own windows (live mic, notes from a recording) */
  listen: React.ReactNode
  onUseInJam?: (chords: string[]) => void
  startMode?: ScanMode
}) {
  const [saved, setMode] = usePersist<ScanMode>('scanMode', startMode ?? 'scan')
  const mode: ScanMode = saved === 'shorts' || saved === 'listen' ? saved : 'scan'
  return (
    <div className="riff-scanner stack" style={{ gap: 10 }} data-testid="riff-scanner">
      <div className="scan-modes" role="tablist" aria-label="Riff Scanner">
        {([['scan', 'film', 'Scan a video', 'Link, screenshots or a file'], ['shorts', 'shuffle', 'Shorts', 'Swipe through guitar Shorts'], ['listen', 'mic', 'Listen', 'The mic: chords or notes']] as const).map(([id, icon, label, sub]) => (
          <button key={id} role="tab" aria-selected={mode === id} className={`scan-mode${mode === id ? ' on' : ''}`} onClick={() => setMode(id)} data-testid={`scan-mode-${id}`}>
            <Ico n={icon} /><b>{label}</b><span className="small">{sub}</span>
          </button>
        ))}
      </div>
      {mode === 'scan' && <ScanVideo onUseInJam={onUseInJam} />}
      {mode === 'shorts' && <p className="small muted">Shorts arrive in the next part of this build.</p>}
      {mode === 'listen' && listen}
    </div>
  )
}

/** Screenshots, or a video / audio file → a tab. */
export function ScanVideo({ onUseInJam, youtube, initialPics }: { onUseInJam?: (chords: string[]) => void; youtube?: string; initialPics?: { name: string; url: string }[] }) {
  const inst = useInstrument()
  const [pics, setPics] = useState<Pic[]>([])
  const [box, setBox] = useState<Box | null>(null)
  const [stages, setStages] = useState<Stage[] | null>(null)
  const [out, setOut] = useState<ScanOut | null>(null)
  const [msg, setMsg] = useState('')
  const [setup, setSetup] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const ready = canRead()
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => { if (initialPics?.length) void addUrls(initialPics) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function addUrls(list: { name: string; url: string }[]) {
    const add: Pic[] = []
    for (const p of list) { try { add.push({ ...p, img: await loadPicture(p.url) }) } catch { /* skip */ } }
    const all = [...pics, ...add].slice(0, 12)
    setPics(all); setOut(null); setMsg('')
    // the tab area on the first picture that has staff lines: shown as a box you can adjust
    if (!box) for (const p of all) { const b = unionBox(tabBoxes(p.img)); if (b) { setBox(b); break } }
  }
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files]
    const media = list.find(f => /^(video|audio)\//.test(f.type) || /\.(mp4|m4a|mp3|wav|webm|mov|3gp|ogg|flac|aac)$/i.test(f.name))
    if (media) { void scanFile(media); return }
    await addUrls(list.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic)$/i.test(f.name)).map(f => ({ name: f.name, url: URL.createObjectURL(f) })))
  }

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
    setOut({ doc: { ...doc, id: newId() }, heard: false, how, text, reparse: t => songFromScan(t, title, inst, youtube) })
    setStages(null)
  }

  async function scanPictures() {
    if (!pics.length) return
    const signal = begin([
      { id: 'frames', label: 'Finding the tab', state: 'run' },
      { id: 'sharpen', label: 'Enlarging and sharpening', state: 'wait' },
      { id: 'ai', label: 'Reading it (Gemini + Groq race)', state: 'wait' },
      { id: 'hand', label: 'Placing it on the neck', state: 'wait' },
      { id: 'tempo', label: 'Tempo', state: 'wait' },
    ])
    try {
      await new Promise(r => setTimeout(r, 30))
      const { pieces, found } = piecesFromPictures(pics.map(p => p.img), box)
      step('frames', { state: 'done', note: found ? `${found} staff${found === 1 ? '' : 's'}` : 'no staff lines: reading the box' })
      step('sharpen', { state: 'done', note: `${pieces.length} strip${pieces.length === 1 ? '' : 's'}` })
      await readOut(pieces, signal, pics.length === 1 ? 'Scanned tab' : 'Scanned tab', `Read from ${pics.length} picture${pics.length === 1 ? '' : 's'}${found ? '' : ' (no staff lines found, so the box you set was read)'}.`)
    } catch (e) { fail(e) }
  }

  async function scanFile(f: File) {
    const isVideo = /^video\//.test(f.type) || /\.(mp4|webm|mov|3gp)$/i.test(f.name)
    const title = f.name.replace(/\.[^.]+$/, '') || 'Scanned riff'
    const signal = begin([
      ...(isVideo ? [{ id: 'frames', label: 'Looking through the video for a tab', state: 'run' as const }] : []),
      { id: 'sound', label: 'Listening to the sound (tempo)', state: isVideo ? 'wait' : 'run' },
      ...(isVideo ? [{ id: 'ai', label: 'Reading the tab (Gemini + Groq race)', state: 'wait' as const }] : []),
      { id: 'notes', label: 'Writing down the notes', state: 'wait' },
      { id: 'hand', label: 'Placing it on the neck', state: 'wait' },
      { id: 'tempo', label: 'Tempo', state: 'wait' },
    ])
    try {
      let pieces: Piece[] = []
      if (isVideo) {
        const v = await tabFromVideo(f, { signal, box, onProgress: (p, note) => step('frames', { pct: p, note }) })
        pieces = v.pieces
        step('frames', { state: 'done', note: pieces.length ? `${pieces.length} strip${pieces.length === 1 ? '' : 's'}${v.scrolled ? ', scrolling tab stitched' : ''}` : 'no tab on screen' })
      }
      step('sound', { state: 'run' })
      const snd = await soundOf(f, audio())
      const a = snd ? analyse(snd.x, snd.sr) : null
      step('sound', { state: snd ? 'done' : 'skip', note: a ? `${Math.round(a.bpm)} BPM, ${a.meter.num}/${a.meter.den}` : snd ? 'no clear beat' : 'no sound track' })
      if (signal.aborted) throw new Error('Cancelled.')
      if (pieces.length && ready) {
        step('notes', { state: 'skip', note: 'read from the screen instead' })
        await readOut(pieces, signal, title, `Read from the tab on screen in "${f.name}"${a ? `, tempo from its sound` : ''}.`, a ? Math.round(a.bpm) : undefined)
        return
      }
      if (isVideo) step('ai', { state: 'skip', note: pieces.length ? 'needs an AI key' : 'no tab on screen' })
      if (!snd) throw new Error("This file has no sound I can open, and no tab on screen to read.")
      step('notes', { state: 'run', pct: 0 })
      const { transcribe, notesToTab } = await import('../audio/transcribe')
      const notes = await transcribe(snd.x.slice(0, snd.sr * 120), snd.sr, p => step('notes', { pct: p }))
      if (signal.aborted) throw new Error('Cancelled.')
      step('notes', { state: 'done', note: `${notes.length} notes` })
      step('hand', { state: 'run' })
      const bpm = a ? Math.round(a.bpm) : 90
      const song = notesToTab(notes, bpm, inst.midis, title, false)
      if (!song) throw new Error("I didn't hear clear guitar notes in it. A solo guitar part works best.")
      step('hand', { state: 'done' }); step('tempo', { state: 'done', note: `${bpm} BPM` })
      setOut({ doc: { id: newId(), title, source: 'text', inst: inst.id, song: { ...song, tempoFrom: a ? 'detected' : 'guess', ...(a && (a.meter.num !== 4 || a.meter.den !== 4) ? { timeSig: [a.meter.num, a.meter.den] as [number, number] } : {}) }, ...(youtube ? { youtube } : {}), updated: Date.now() }, heard: true, how: `Worked out from the sound of "${f.name}" (a note detector on the phone): good for one guitar, rough with a full band.` })
      setStages(null)
    } catch (e) { fail(e) }
  }

  const again = () => { setOut(null); setPics([]); setBox(null); setMsg('') }
  if (out) return <ScanResult out={out} onUseInJam={onUseInJam} onAgain={again} />
  return (
    <div className="scan-video stack" style={{ gap: 10 }}>
      {!ready && (
        <div className="notice small">Reading tabs off the screen needs a free Google Gemini key (a minute to set up, no card). Sound-only files work without it. <button className="btn sm" onClick={() => setSetup(!setup)}>{setup ? 'Close' : 'Set it up'}</button></div>
      )}
      {setup && !ready && <AiSetup compact />}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <label className="btn primary"><Ico n="camera" /> Screenshots<input type="file" accept="image/*" multiple hidden onChange={e => { void addFiles(e.target.files); e.target.value = '' }} data-testid="scan-pics" /></label>
        <label className="btn"><Ico n="upload" /> Video or audio file<input type="file" accept="video/*,audio/*" hidden onChange={e => { void addFiles(e.target.files); e.target.value = '' }} data-testid="scan-file" /></label>
      </div>
      <p className="small muted" style={{ margin: 0 }}>A tab shown on screen is read exactly (pause on it and screenshot, a few in order if it scrolls). A screen recording of the video also works: KGuitar finds the tab, follows it as it scrolls, and takes the tempo from the sound.</p>
      {pics.length > 0 && !stages && (
        <div className="stack" style={{ gap: 8 }}>
          <CropBox url={pics[0].url} box={box} onBox={setBox} />
          <span className="small muted">{box ? 'The box is where the tab was found: drag it or its corners if it missed some.' : 'No staff lines found: drag the box around the tab.'}{pics.length > 1 ? ` The same box is used on all ${pics.length} pictures.` : ''}</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" disabled={!ready} onClick={() => void scanPictures()} data-testid="scan-read">Read the tab</button>
            <button className="btn ghost sm" onClick={again}>Clear</button>
            <span className="small muted">{pics.length} picture{pics.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}
      {stages && <ScanProgress stages={stages} onCancel={() => abort.current?.abort()} />}
      {msg && <p className="small" role="status" style={{ margin: 0 }} data-testid="scan-msg">{msg}</p>}
    </div>
  )
}
