// The song's tempo and time signature: a badge on Play's top bar (♩ 92 · 4/4, "~" when it's only a guess) and the
// sheet it opens: where the tempo came from, − / +, ½× / 2× (the usual mix-ups), tap tempo, the time signature,
// ask the AI (known songs), and the Guitar Pro file's tempo changes. Changing it sets In time, the click, the band,
// Hear it and the video sync together.
import { useRef, useState } from 'react'
import type { Song } from '../tabs/model'
import { tapBpm } from '../audio/tempo'
import { askTempo, canAskTempo } from '../assistant/tempoAsk'
import { Ico } from './Icon'
import { haptic } from '../audio/tapFeel'

const SIGS: [number, number][] = [[2, 4], [3, 4], [4, 4], [5, 4], [6, 8], [7, 8], [9, 8], [12, 8]]
const FROM: Record<NonNullable<Song['tempoFrom']>, string> = {
  file: 'From the file',
  detected: 'Heard in the recording',
  ai: 'From the AI (the known recording)',
  guess: 'A guess from the rhythm: tap along to set it',
  tapped: 'Tapped by you',
  you: 'Set by you',
}

export const sigOf = (song: Song): [number, number] => song.timeSig ?? [song.meter ?? 4, 4]
export const sigText = (s: [number, number]) => `${s[0]}/${s[1]}`

/** The badge for the top bar. */
export function TempoBadge({ song, onOpen }: { song: Song; onOpen: () => void }) {
  const guess = !song.tempoFrom || song.tempoFrom === 'guess'
  const bpm = Math.round(song.tempo ?? 90)
  return (
    <button className={`btn sm tempo-badge${guess ? ' guess' : ''}`} data-find="tempo" data-testid="tempo-badge" onClick={onOpen}
      aria-label={`Tempo ${bpm} BPM, ${sigText(sigOf(song))}${guess ? ' (a guess)' : ''}: change it`} title="Tempo and time signature">
      <span className="tb-bpm">{guess ? '~' : ''}{bpm}</span><span className="tb-sig">{sigText(sigOf(song))}</span>
    </button>
  )
}

export interface TempoChange { tempo: number; tempoFrom: NonNullable<Song['tempoFrom']>; timeSig?: [number, number]; meter?: number; tempoMap?: Song['tempoMap'] }

/** Scale a song's tempo (its tempo changes move with it) and say where the new tempo came from. */
export function withTempo(song: Song, bpm: number, from: TempoChange['tempoFrom']): TempoChange {
  const r = bpm / (song.tempo ?? bpm)
  return { tempo: bpm, tempoFrom: from, ...(song.tempoMap ? { tempoMap: song.tempoMap.map(p => ({ beat: p.beat, bpm: Math.round(p.bpm * r * 10) / 10 })) } : {}) }
}
/** A new time signature: beats per bar (in quarter notes) for the click and counts when it's a whole number. */
export function withSig(sig: [number, number]): Pick<TempoChange, 'timeSig' | 'meter'> {
  const q = (sig[0] * 4) / sig[1]
  return { timeSig: sig, meter: Number.isInteger(q) ? q : undefined }
}

export function TempoSheet({ song, fileTempo, beatsPerBar, onChange, onClose }: {
  song: Song
  /** the tempo the file came with (to go back to it) */
  fileTempo?: number
  /** for listing tempo changes by bar */
  beatsPerBar: number
  onChange: (c: Partial<TempoChange>) => void
  onClose: () => void
}) {
  const bpm = Math.round(song.tempo ?? 90)
  const taps = useRef<number[]>([])
  const [tapped, setTapped] = useState<number | null>(null)
  const [asking, setAsking] = useState<'' | 'busy' | 'none'>('')
  const set = (b: number, from: TempoChange['tempoFrom'] = 'you') => onChange(withTempo(song, Math.max(30, Math.min(300, Math.round(b))), from))
  const tap = () => {
    const t = performance.now()
    taps.current = [...taps.current.filter(x => t - x < 2500), t]
    if (taps.current.length > 1 && t - taps.current[taps.current.length - 2] > 2000) taps.current = [t]
    haptic('light')
    setTapped(tapBpm(taps.current))
  }
  const ai = async () => {
    setAsking('busy')
    const a = await askTempo(song.title, song.artist)
    if (!a) { setAsking('none'); return }
    setAsking('')
    onChange({ ...withTempo(song, a.bpm, 'ai'), ...(a.timeSig ? withSig(a.timeSig) : {}) })
  }
  const sig = sigOf(song)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tempo-sheet" role="dialog" aria-modal="true" aria-label="Tempo and time signature" onClick={e => e.stopPropagation()} data-testid="tempo-sheet">
        <div className="sheet-head">
          <h2>Tempo</h2>
          <button className="btn sm" onClick={onClose}>Done</button>
        </div>
        <div className="tempo-now">
          <button className="btn icon-btn" onClick={() => set(bpm - 1)} aria-label="Slower by 1"><Ico n="minus" /></button>
          <div className="tempo-big"><b data-testid="tempo-value">{bpm}</b><span className="small muted">BPM</span></div>
          <button className="btn icon-btn" onClick={() => set(bpm + 1)} aria-label="Faster by 1"><Ico n="plus" /></button>
        </div>
        <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>{FROM[song.tempoFrom ?? 'guess']}</p>
        <div className="row" style={{ gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn sm" onClick={() => set(bpm / 2)} title="Twice as slow (the beat is every other note)">½× · {Math.round(bpm / 2)}</button>
          <button className="btn sm" onClick={() => set(bpm * 2)} title="Twice as fast">2× · {Math.round(bpm * 2)}</button>
          {fileTempo && Math.round(fileTempo) !== bpm && <button className="btn sm ghost" onClick={() => set(fileTempo, 'file')}>Back to {Math.round(fileTempo)}</button>}
        </div>

        <section className="opt-group" aria-label="Tap tempo">
          <h3>Tap along</h3>
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn tap-pad" onPointerDown={tap} data-testid="tap-tempo">Tap</button>
            <span className="small">{tapped ? <><b>{tapped}</b> BPM</> : 'Tap on each beat (4 or more taps)'}</span>
            {tapped && <button className="btn sm primary" onClick={() => { set(tapped, 'tapped'); taps.current = []; setTapped(null) }} data-testid="tap-use">Use {tapped}</button>}
          </div>
        </section>

        <section className="opt-group" aria-label="Time signature">
          <h3>Time signature</h3>
          <div className="chips" role="group" aria-label="Time signature" style={{ flexWrap: 'wrap' }}>
            {SIGS.map(s => (
              <button key={sigText(s)} className="chip" aria-pressed={s[0] === sig[0] && s[1] === sig[1]} onClick={() => onChange(withSig(s))}>{sigText(s)}</button>
            ))}
          </div>
        </section>

        {song.tempoMap && song.tempoMap.length > 0 && (
          <section className="opt-group" aria-label="Tempo changes">
            <h3>Tempo changes</h3>
            <p className="small" style={{ margin: 0 }}>
              {song.tempoMap.slice(0, 8).map(p => `bar ${Math.floor(p.beat / beatsPerBar) + 1}: ${Math.round(p.bpm)}`).join(' · ')}{song.tempoMap.length > 8 ? ' …' : ''}
            </p>
            <p className="small muted" style={{ margin: 0 }}>In time, the click, Hear it and the band follow them.</p>
          </section>
        )}

        {canAskTempo() && song.tempoFrom !== 'file' && (
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn sm" disabled={asking === 'busy'} onClick={() => void ai()} data-testid="tempo-ai">{asking === 'busy' ? 'Asking…' : 'Ask the AI'}</button>
            <span className="small muted">{asking === 'none' ? "It doesn't know this song for sure: tap along instead." : 'For a known song: the tempo of the recording.'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
