// Riff Scanner pieces: the progress timeline (with Cancel), the crop box over a picture, and the result card with
// its one-tap actions (Open in Play, Practise it today, Use in Jam, keep / fix it).
import { useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import { Ico } from '../components/Icon'
import type { Box } from './pictures'
import type { SongDoc } from '../tabs/library'
import { saveSong } from '../tabs/library'
import { openInPlay } from '../nav'
import { Preview } from '../components/ProgressionTabs'
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

export function ScanResult({ out, onUseInJam, onAgain }: { out: ScanOut; onUseInJam?: (chords: string[]) => void; onAgain: () => void }) {
  const inst = useInstrument()
  const [doc, setDoc] = useState(out.doc)
  const [checked, setChecked] = useState(!out.heard)
  const [tempoOpen, setTempoOpen] = useState(false)
  const [text, setText] = useState(out.text ?? '')
  const [edit, setEdit] = useState(false)
  const [note, setNote] = useState('')
  const [title, setTitle] = useState(out.doc.title)
  const chords = useMemo(() => scanChords(doc), [doc])
  const keep = async () => { const d = { ...doc, title: title.trim() || doc.title, song: { ...doc.song, title: title.trim() || doc.title } }; await saveSong(d); return d }
  const play = async () => openInPlay(await keep())
  const today = async () => {
    const d = await keep()
    try { localStorage.setItem(`kg:playSong:${inst.id}`, JSON.stringify(d.id)) } catch { /* storage */ }
    setNote(`"${d.title}" is the song in your Practice button now (Learn → Today, Songs → My songs).`)
  }
  const reread = () => {
    const d = out.reparse?.(text)
    if (!d) { setNote("That doesn't read as a tab yet: each line should start with the string name and |."); return }
    setDoc({ ...d, youtube: doc.youtube }); setEdit(false); setNote('')
  }
  return (
    <div className="scan-result stack" style={{ gap: 8 }} data-testid="scan-result">
      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: '1 1 180px' }} value={title} onChange={e => setTitle(e.target.value)} aria-label="Song title" />
        <TempoBadge song={doc.song} onOpen={() => setTempoOpen(true)} />
      </div>
      <p className="small muted" style={{ margin: 0 }}>{out.how}</p>
      {!checked ? (
        <div className="scan-check notice" data-testid="scan-check">
          <b>Does this look right?</b>
          <span className="small">It was worked out from the sound, so check it: hear it, look at the rhythm and the tempo.</span>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn sm primary" onClick={() => setChecked(true)} data-testid="scan-ok">Yes, looks right</button>
            <button className="btn sm" onClick={() => setTempoOpen(true)}>Fix the tempo</button>
            <button className="btn sm ghost" onClick={onAgain}>Scan again</button>
          </div>
        </div>
      ) : (
        <div className="scan-actions row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => void play()} data-testid="scan-play"><Ico n="play" fill /> Open in Play</button>
          <button className="btn" onClick={() => void today()} data-testid="scan-today"><Ico n="calendar" /> Practise it today</button>
          {onUseInJam && chords.length >= 2 && <button className="btn" onClick={() => onUseInJam(chords)} data-testid="scan-jam"><Ico n="guitar" /> Use the chords in Jam</button>}
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
      {note && <p className="small" role="status" style={{ margin: 0 }}>{note}</p>}
      <Preview doc={doc} minor={false} />
      {tempoOpen && <TempoSheet song={doc.song} beatsPerBar={doc.song.meter ?? 4} onChange={c => setDoc(d => ({ ...d, song: { ...d.song, ...c } }))} onClose={() => setTempoOpen(false)} />}
    </div>
  )
}
