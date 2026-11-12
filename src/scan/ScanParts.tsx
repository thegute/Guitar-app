// Riff Scanner pieces: the progress timeline (with Cancel), the crop box over a picture, and the result card with
// its one-tap actions (Open in Play, Practise it today, Use in Jam, keep / fix it).
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import { Capacitor } from '@capacitor/core'
import { Ico } from '../components/Icon'
import type { Box } from './pictures'
import type { SongDoc } from '../tabs/library'
import { saveSong } from '../tabs/library'
import { openInPlay } from '../nav'
import { ScanPlayer } from './ScanPlayer'
import { Fold } from '../components/Fold'
import { VoiceLeadNeck } from '../components/VoiceLeadNeck'
import { adaptTrack } from '../hand/adapt'
import { saveMyLick } from '../licks/mine'
import { addToChain } from '../licks/chain'
import { pc } from '../theory/notes'
import { strumPattern } from '../play/strumCoach'
import { riffToPad } from './toPad'
import { totalMB } from '../ml/models'
import type { Pass } from './soundScan'
import { TempoBadge, TempoSheet } from '../components/TempoSheet'
import { guessBarChords } from '../tabs/harmony'
import { detectKey } from '../tabs/keyDetect'
import { flatten } from '../tabs/model'
import { useInstrument } from '../instrument'

export type StageState = 'wait' | 'run' | 'done' | 'skip' | 'fail'
export interface Stage { id: string; label: string; state: StageState; note?: string; pct?: number }

export function setStage(list: Stage[], id: string, p: Partial<Stage>): Stage[] {
  return list.map(s => (s.id === id ? { ...s, ...p } : s))
}

/** The steps of a scan as they happen. */
export function ScanProgress({ stages, onCancel }: { stages: Stage[]; onCancel?: () => void }) {
  return (
    <div className="scan-progress" role="status" aria-live="polite" data-testid="scan-progress">
      <ol>
        {stages.map(s => (
          <li key={s.id} className={`st-${s.state}`}>
            <span className="scan-dot" aria-hidden>{s.state === 'done' ? '✓' : s.state === 'fail' ? '!' : s.state === 'skip' ? '–' : ''}</span>
            <span className="scan-label">{s.label}{s.note ? <span className="small muted"> · {s.note}</span> : null}</span>
            {s.state === 'run' && typeof s.pct === 'number' && <i className="scan-bar"><b style={{ width: `${Math.round(s.pct * 100)}%` }} /></i>}
          </li>
        ))}
      </ol>
      {onCancel && <button className="btn sm ghost" onClick={onCancel} data-testid="scan-cancel">Cancel</button>}
    </div>
  )
}

/** A picture with a box you can drag (move it, or pull a corner) around the tab. */
export function CropBox({ url, box, onBox }: { url: string; box: Box | null; onBox: (b: Box) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const b = box ?? { x: 0.05, y: 0.55, w: 0.9, h: 0.35 }
  const drag = (e: RPE, mode: 'move' | 'tl' | 'br') => {
    e.preventDefault(); e.stopPropagation()
    const r = wrap.current!.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY, b0 = { ...b }
    const mv = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / r.width, dy = (ev.clientY - sy) / r.height
      let n: Box
      if (mode === 'move') n = { ...b0, x: Math.min(1 - b0.w, Math.max(0, b0.x + dx)), y: Math.min(1 - b0.h, Math.max(0, b0.y + dy)) }
      else if (mode === 'tl') { const x = Math.min(b0.x + b0.w - 0.05, Math.max(0, b0.x + dx)), y = Math.min(b0.y + b0.h - 0.05, Math.max(0, b0.y + dy)); n = { x, y, w: b0.x + b0.w - x, h: b0.y + b0.h - y } }
      else n = { ...b0, w: Math.max(0.05, Math.min(1 - b0.x, b0.w + dx)), h: Math.max(0.05, Math.min(1 - b0.y, b0.h + dy)) }
      onBox(n)
    }
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up) }
    addEventListener('pointermove', mv); addEventListener('pointerup', up)
  }
  return (
    <div className="crop-wrap" ref={wrap} data-testid="crop-box">
      <img src={url} alt="The picture to read" draggable={false} />
      <div className="crop-rect" style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} onPointerDown={e => drag(e, 'move')}>
        <span className="crop-h tl" onPointerDown={e => drag(e, 'tl')} aria-label="Drag the top-left corner" />
        <span className="crop-h br" onPointerDown={e => drag(e, 'br')} aria-label="Drag the bottom-right corner" />
      </div>
    </div>
  )
}

export interface ScanOut {
  doc: SongDoc
  /** worked out from the sound (not read off the screen): ask "Does this look right?" before keeping it */
  heard: boolean
  /** how it was found, in words */
  how: string
  /** the tab text the AI read (can be fixed and read again) */
  text?: string
  /** read the text again into a song */
  reparse?: (text: string) => SongDoc | null
  /** the sound it came from (for "Sample to a pad"), from its first note */
  sound?: { x: Float32Array; sr: number; from?: number }
  /** bars where the chord and the notes disagree (0-based) */
  check?: number[]
}

/** A scan from sound still working in the background: the better version, the AI's second opinion, downloads. */
export interface LiveScan {
  better: SongDoc | null
  betterPass: Pass
  betterPct: number
  betterNote: string
  betterCheck: number[]
  needModels: boolean
  askLong: number | null
  aiNote: string
  ai: Pass
  onLong: (go: boolean) => void
  onGetModels: () => void
  download: { pct: number; error: string } | null
}

/** The chords of a scanned song, one per bar (written ones, else guessed from the notes). */
export function scanChords(doc: SongDoc): string[] {
  const t = doc.song.tracks[0]
  const written = t.bars.map(b => b.steps.find(s => s.chord)?.chord ?? '')
  if (written.filter(Boolean).length >= 2) { const out: string[] = []; let last = ''; for (const c of written) { const x = c || last; if (x) out.push(x); last = x } return out }
  try {
    const w = new Array(12).fill(0)
    for (const f of flatten(t)) for (const n of f.step.notes) w[n.midi % 12] += f.step.dur
    return guessBarChords(t, detectKey(w)[0] ?? null, false).filter((c): c is string => !!c)
  } catch { return [] }
}

export function ScanResult({ out, live, onUseInJam, onAgain }: { out: ScanOut; live?: LiveScan; onUseInJam?: (chords: string[]) => void; onAgain: () => void }) {
  const inst = useInstrument()
  const [which, setWhich] = useState<'first' | 'better'>('first')
  // your own changes stay when a better version or the AI's labels arrive: title, tempo / time, a fixed tab text
  const [userSong, setUserSong] = useState<Partial<SongDoc['song']>>({})
  const [fixed, setFixed] = useState<SongDoc | null>(null)
  const [adapt, setAdapt] = useState(false)
  const [checked, setChecked] = useState(!out.heard)
  const [tempoOpen, setTempoOpen] = useState(false)
  const [text, setText] = useState(out.text ?? '')
  const [edit, setEdit] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [title, setTitle] = useState(out.doc.title)
  const titleEdited = useRef(false)
  useEffect(() => { if (!titleEdited.current) setTitle(out.doc.title) }, [out.doc.title])
  const base = fixed ?? (which === 'better' && live?.better ? live.better : out.doc)
  const check = fixed ? [] : which === 'better' && live?.better ? live.betterCheck : out.check ?? []
  const track0 = base.song.tracks[0]
  const otherTuning = track0.tuning.length === inst.midis.length && track0.tuning.some((t, i) => t !== inst.midis[i])
  const doc = useMemo<SongDoc>(() => {
    const t = title.trim() || base.title
    let song = { ...base.song, ...userSong, title: t }
    if (adapt && otherTuning) song = { ...song, tracks: [adaptTrack(song.tracks[0], inst.midis, true).track, ...song.tracks.slice(1)] }
    return { ...base, title: t, song }
  }, [base, userSong, title, adapt, otherTuning, inst.midis])
  const chords = useMemo(() => scanChords(doc), [doc])
  const uniq = useMemo(() => chords.filter((c, i) => c !== chords[i - 1]).slice(0, 8), [chords])
  const keep = async () => { await saveSong(doc); return doc }
  const play = async (mode: 'wait' | 'time') => {
    try { localStorage.setItem('kg:playMode', JSON.stringify(mode)) } catch { /* storage */ }
    openInPlay(await keep())
  }
  const today = async () => {
    const d = await keep()
    try { localStorage.setItem(`kg:playSong:${inst.id}`, JSON.stringify(d.id)) } catch { /* storage */ }
    setNote(`"${d.title}" is the song in your Practice button now (Learn → Today, Songs → Library).`)
  }
  const toChain = () => {
    const w = new Array(12).fill(0)
    for (const f of flatten(doc.song.tracks[0])) for (const n of f.step.notes) w[n.midi % 12] += f.step.dur
    const k = detectKey(w)[0]
    const id = saveMyLick(doc.title, doc.song.tracks[0], doc.song.tempo ?? 90, { root: k ? pc(k.root) : 0, minor: !!k?.minor })
    if (!id) { setNote("This one can't go in the lick chain (it needs a 6-string part in 4/4)."); return }
    addToChain(id, k?.root)
    setNote('Added to your lick chain (Learn → Explore → Lick chainer, under "My riffs").')
  }
  const toPad = async () => {
    setBusy('pad')
    try { setNote(await riffToPad(doc, out.sound, setNote)) } catch (e) { setNote(e instanceof Error ? e.message : 'It could not go on a pad.') }
    setBusy('')
  }
  const reread = () => {
    const d = out.reparse?.(text)
    if (!d) { setNote("That doesn't read as a tab yet: each line should start with the string name and |."); return }
    setFixed({ ...d, id: base.id, youtube: base.youtube }); setEdit(false); setNote('')
  }
  const strum = strumPattern(doc.song.strum)
  return (
    <div className="scan-result stack" style={{ gap: 8 }} data-testid="scan-result">
      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: '1 1 180px' }} value={title} onChange={e => { titleEdited.current = true; setTitle(e.target.value) }} aria-label="Song title" />
        <TempoBadge song={doc.song} onOpen={() => setTempoOpen(true)} />
      </div>
      <p className="small muted" style={{ margin: 0 }}>{out.how}{which === 'better' && live?.better ? ' Now showing the better version.' : ''}</p>
      {live && <LiveCards live={live} which={which} onUse={() => { setWhich('better'); setFixed(null) }} onBack={() => setWhich('first')} />}
      {!checked ? (
        <div className="scan-check notice" data-testid="scan-check">
          <b>Does this look right?</b>
          <span className="small">It was worked out from the sound, so check it: play it below, look at the rhythm and the tempo.</span>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn sm primary" onClick={() => setChecked(true)} data-testid="scan-ok">Yes, looks right</button>
            <button className="btn sm" onClick={() => setTempoOpen(true)}>Fix the tempo</button>
            <button className="btn sm ghost" onClick={onAgain}>Scan again</button>
          </div>
        </div>
      ) : (
        <div className="scan-actions row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => void play('wait')} data-testid="scan-play"><Ico n="play" fill /> Open in Play</button>
          <button className="btn" onClick={() => void play('time')} data-testid="scan-play-time"><Ico n="target" /> Play it in time</button>
          <button className="btn" onClick={() => void today()} data-testid="scan-today"><Ico n="calendar" /> Practise it today</button>
          {onUseInJam && chords.length >= 2 && <button className="btn" onClick={() => onUseInJam(chords)} data-testid="scan-jam"><Ico n="guitar" /> Use the chords in Jam</button>}
          <button className="btn" onClick={toChain} data-testid="scan-chain"><Ico n="plus" /> Add to my lick chain</button>
          <button className="btn" disabled={busy === 'pad'} onClick={() => void toPad()} data-testid="scan-pad"><Ico n="drum" /> {busy === 'pad' ? 'Putting it on a pad…' : 'Sample to a pad'}</button>
          {otherTuning && <button className={`btn${adapt ? ' on' : ''}`} aria-pressed={adapt} onClick={() => setAdapt(!adapt)} data-testid="scan-adapt">{adapt ? 'Back to its own tuning' : 'Play it in my tuning'}</button>}
          {out.text !== undefined && <button className="btn ghost" onClick={() => setEdit(!edit)} aria-expanded={edit}>Fix the tab text</button>}
          <button className="btn ghost" onClick={onAgain}>Scan something else</button>
        </div>
      )}
      {edit && (
        <>
          <textarea className="input tab-text mono" value={text} onChange={e => setText(e.target.value)} rows={Math.min(24, text.split('\n').length + 1)} spellCheck={false} aria-label="The tab it read" />
          <button className="btn sm primary" style={{ alignSelf: 'flex-start' }} onClick={reread}>Read it again</button>
        </>
      )}
      {note && <p className="small" role="status" style={{ margin: 0 }} data-testid="scan-note">{note}</p>}
      {check.length > 0 && <p className="small" style={{ margin: 0 }} data-testid="scan-checkbars"><b>Check bar{check.length > 1 ? 's' : ''} {check.map(b => b + 1).join(', ')}</b> (dashed): the chord heard there and the notes don't agree.</p>}
      {strum && <p className="small" style={{ margin: 0 }}>Strum heard: <b>{strum.label.replace(/^As heard /, '')}</b> (shown over the chords in Play).</p>}
      <ScanPlayer doc={doc} marks={check} />
      {uniq.length >= 2 && (
        <Fold id="scanChords" title={`The chords (${uniq.join(' ')})`} hint="Each chord's shape and how to move between them with the least hand movement (voice leading).">
          <VoiceLeadNeck chords={uniq} tuning={inst.midis} where="scan" compact />
        </Fold>
      )}
      {tempoOpen && <TempoSheet song={doc.song} fileTempo={base.song.tempo} beatsPerBar={doc.song.meter ?? 4} onChange={c => setUserSong(u => ({ ...u, ...c }))} onClose={() => setTempoOpen(false)} />}
    </div>
  )
}

/** The better version, the AI's note, model downloads and "keep going?". */
function LiveCards({ live, which, onUse, onBack }: { live: LiveScan; which: 'first' | 'better'; onUse: () => void; onBack: () => void }) {
  return (
    <div className="scan-live stack" style={{ gap: 6 }} data-testid="scan-live">
      {live.askLong !== null && (
        <div className="notice small row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }} data-testid="scan-long">
          <span>The better version would take about <b>{live.askLong < 90 ? `${live.askLong} s` : `${Math.round(live.askLong / 60)} min`}</b> on this {Capacitor.isNativePlatform() ? 'phone' : 'device'}.</span>
          <button className="btn sm primary" onClick={() => live.onLong(true)}>Keep going</button>
          <button className="btn sm" onClick={() => live.onLong(false)}>Keep the quick version</button>
        </div>
      )}
      {live.needModels && !live.download && (
        <div className="notice small row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }} data-testid="scan-getmodels">
          <span>This is the quick version. For much more exact notes and beats, get the guitar-note and beat models once ({totalMB()} MB, Wi-Fi is best). They stay on the {Capacitor.isNativePlatform() ? 'phone' : 'browser'} and work offline.</span>
          <button className="btn sm primary" onClick={live.onGetModels} data-testid="scan-download">Download them</button>
        </div>
      )}
      {live.download && (
        <div className="small" role="status">
          {live.download.error ? <span>{live.download.error} <button className="btn sm" onClick={live.onGetModels}>Try again</button></span>
            : <>Downloading the models… {Math.round(live.download.pct * 100)}%<i className="scan-bar"><b style={{ width: `${Math.round(live.download.pct * 100)}%` }} /></i></>}
        </div>
      )}
      {live.betterPass === 'running' && (
        <div className="small" role="status" data-testid="scan-better-run">
          Making a better version with the guitar-note model… {Math.round(live.betterPct * 100)}%{live.betterNote ? ` · ${live.betterNote}` : ''}
          <i className="scan-bar"><b style={{ width: `${Math.round(live.betterPct * 100)}%` }} /></i>
        </div>
      )}
      {live.better && which === 'first' && (live.betterPass === 'ready' || live.betterPass === 'failed') && (
        <div className="notice small row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }} data-testid="scan-better-ready">
          <span><b>Better version ready</b>{live.betterNote ? ` (${live.betterNote})` : ''}.</span>
          <button className="btn sm primary" onClick={onUse} data-testid="scan-use-better">Use it</button>
        </div>
      )}
      {which === 'better' && <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={onBack}>Back to the quick version</button>}
      {live.betterPass !== 'running' && live.betterNote && !live.better && <p className="small muted" style={{ margin: 0 }}>{live.betterNote}</p>}
      {live.aiNote && <p className="small muted" style={{ margin: 0 }} data-testid="scan-ai-note">{live.ai === 'running' ? '⋯ ' : ''}{live.aiNote}</p>}
    </div>
  )
}
