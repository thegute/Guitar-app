// The player under a scan result: the tab with a moving playhead, Play / Pause / Back to the start, a speed slider
// (shows the BPM it plays at), tap a note to start from there, and the floating "Where your fingers go" box following
// the playhead (with Loop this shift). The full practice tools are one tap away in Play.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SongDoc } from '../tabs/library'
import { flatten, type Song, type SongNote } from '../tabs/model'
import { TabPlayer } from '../audio/tabPlayer'
import { activeSound, playNote, soundForProgram } from '../audio/pluck'
import { audio } from '../audio/engine'
import { TabView } from '../components/TabView'
import { FingerBox } from '../components/FingerBox'
import { groupAt, handGroups } from '../play/handShape'
import { songTempo } from '../play/tempoMap'
import { useInstrument } from '../instrument'
import { pcName } from '../theory/notes'
import { Ico } from '../components/Icon'
import { chordTimeline } from '../tabs/harmony'
import { strumPattern } from '../play/strumCoach'
import { SourcePeek, type ScanSource } from './SourcePeek'

const TWIN_HINTS: Record<number, number[]> = {
  0: [9, 8, 6], 1: [7, 4], 2: [3, 7], 3: [8, 5, 2], 4: [1, 9], 5: [6, 8, 3],
  6: [8, 5, 0], 7: [1, 2], 8: [6, 3, 0, 9], 9: [0, 8], 10: [12, 18], 11: [14, 17],
  12: [10, 13, 15], 13: [15, 12], 14: [11, 19], 15: [16, 13], 16: [18, 15], 17: [11, 19],
}
const TECHS = ['h', 'p', '/', '\\', 'b', '~', 'x'] as const

export function ScanPlayer({ doc, marks, onChangeSong, sources }: { doc: SongDoc; marks?: number[]; onChangeSong?: (song: Song) => void; sources?: ScanSource[] }) {
  const inst = useInstrument()
  const track = doc.song.tracks[0]
  const flat = useMemo(() => flatten(track), [track])
  const states = useMemo(() => new Uint8Array(flat.length), [flat])
  const [at, setAt] = useState(-1)
  const [from, setFrom] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState<{ from: number; to: number } | null>(null)
  const [sel, setSel] = useState<{ flatIdx: number; string: number } | null>(null)
  const player = useRef<TabPlayer | null>(null)
  const bpm = doc.song.tempo ?? 90
  const playing = at >= 0
  const strNames = useMemo(() => track.tuning.map((t, s) => {
    const n = pcName(t % 12, false)
    return s === track.tuning.length - 1 && track.tuning.filter(x => x % 12 === t % 12).length > 1 ? n.toLowerCase() : n
  }), [track.tuning])
  // chord names over the tab (the scan's own: written ones or the AI's)
  const spans = useMemo(() => chordTimeline(track, {}, []).spans, [track])
  const hands = useMemo(() => handGroups(flat, { inst: inst.id, stringNames: strNames }), [flat, inst.id, strNames])
  const unsureList = useMemo(() => {
    const out: { flatIdx: number; string: number }[] = []
    flat.forEach((f, fi) => f.step.notes.forEach(n => { if (n.unsure) out.push({ flatIdx: fi, string: n.string }) }))
    return out
  }, [flat])
  useEffect(() => () => player.current?.stop(), [])
  useEffect(() => { player.current?.stop(); setAt(-1); setFrom(0); setLoop(null) }, [doc.song.title])

  const audition = (midi: number, string: number) => {
    try {
      const ctx = audio()
      void ctx.resume()
      playNote(midi, ctx.currentTime, 0.7, undefined, { sound: activeSound(soundForProgram(track.program)), string })
    } catch { /* ignore in headless */ }
  }

  const start = (i: number, lp = loop) => {
    const p = (player.current ??= new TabPlayer())
    p.onStep = k => setAt(k)
    p.onEnd = () => { setAt(-1); setFrom(0) }
    p.sound = activeSound(soundForProgram(track.program))
    p.meter = doc.song.meter ?? 4
    const map = songTempo(doc.song)
    p.tempo = map.changes ? map : undefined
    if (lp) {
      const a = flat.findIndex(f => f.bar === lp.from), b = flat.findIndex(f => f.bar > lp.to)
      p.play(flat, Math.max(a, i >= a && (b < 0 || i < b) ? i : a), bpm * speed, b < 0 ? flat.length : b, a)
    } else p.play(flat, i, bpm * speed)
    setAt(i)
  }
  const pause = () => { player.current?.stop(); setFrom(Math.max(0, at)); setAt(-1) }
  const reset = () => { player.current?.stop(); setAt(-1); setFrom(0) }
  // a new speed takes effect from the note you're on
  useEffect(() => { if (playing) start(at) }, [speed]) // eslint-disable-line react-hooks/exhaustive-deps

  const cur = playing ? at : from
  const hg = groupAt(hands, cur)
  const hand = hg >= 0 ? hands[hg] : null
  const next = hg >= 0 ? hands[hg + 1] ?? null : null
  const toShift = hand && next ? flat.slice(Math.max(0, cur), next.from).reduce((t, f) => t + f.step.dur, 0) : Infinity
  const expected = flat[cur]?.step.notes ?? []

  const selFlat = sel ? flat[sel.flatIdx] : null
  const selNote = selFlat?.step.notes.find(n => n.string === sel?.string) ?? null

  const updateSelectedNote = (fn: (n: SongNote) => SongNote | null) => {
    if (!sel || !selFlat || !selNote || !onChangeSong) return
    const { bar: bi, idx: si } = selFlat
    const capo = track.capo ?? 0
    let nextSel: { flatIdx: number; string: number } | null = sel
    const bars = track.bars.map((b, bIdx) => {
      if (bIdx !== bi) return b
      return {
        ...b,
        steps: b.steps.map((st, sIdx) => {
          if (sIdx !== si) return st
          const outNotes: SongNote[] = []
          for (const n of st.notes) {
            if (n.string !== sel.string) { outNotes.push(n); continue }
            const updated = fn(n)
            if (updated) {
              const midi = (track.tuning[updated.string] ?? 40) + capo + updated.fret
              const clean: SongNote = { ...updated, midi, unsure: undefined }
              if (!clean.unsure) delete clean.unsure
              outNotes.push(clean)
              nextSel = { flatIdx: sel.flatIdx, string: clean.string }
              if (clean.tech !== 'x') audition(midi, clean.string)
            } else {
              nextSel = null
            }
          }
          // Deduplicate if string move collided
          const byStr = new Map<number, SongNote>()
          for (const n of outNotes) byStr.set(n.string, n)
          return { ...st, notes: [...byStr.values()].sort((a, b) => a.string - b.string) }
        }),
      }
    })
    setSel(nextSel)
    onChangeSong({ ...doc.song, tracks: [{ ...track, bars }, ...doc.song.tracks.slice(1)] })
  }

  const jumpNextUnsure = () => {
    if (!unsureList.length) return
    const after = sel ? unsureList.find(u => u.flatIdx > sel.flatIdx || (u.flatIdx === sel.flatIdx && u.string > sel.string)) : null
    const pick = after ?? unsureList[0]
    if (playing) pause()
    setFrom(pick.flatIdx)
    setSel(pick)
    const n = flat[pick.flatIdx]?.step.notes.find(x => x.string === pick.string)
    if (n && n.tech !== 'x') audition(n.midi, n.string)
  }

  const altFrets = useMemo(() => {
    if (!selNote) return []
    const baseAlts = selNote.alts ?? []
    const twins = TWIN_HINTS[selNote.fret] ?? []
    return [...new Set([...baseAlts, ...twins])].filter(f => f !== selNote.fret && f >= 0 && f <= 24).slice(0, 4)
  }, [selNote])

  // the one "Check it in the picture" window: the picked note, or the first unsure one when nothing is picked
  const [picOff, setPicOff] = useState(false)
  const peek = useMemo(() => {
    if (!sources?.length || !onChangeSong) return null
    if (selNote?.src && selFlat) return { src: selNote.src, label: `bar ${selFlat.bar + 1}, ${strNames[selNote.string]} string`, unsure: !!selNote.unsure }
    const u = unsureList.find(x => flat[x.flatIdx]?.step.notes.find(n => n.string === x.string)?.src)
    if (!u) return null
    const n = flat[u.flatIdx].step.notes.find(m => m.string === u.string)!
    return { src: n.src!, label: `bar ${flat[u.flatIdx].bar + 1}, ${strNames[n.string]} string`, unsure: true }
  }, [sources, onChangeSong, selNote, selFlat, unsureList, flat, strNames])

  return (
    <div className="scan-player stack" style={{ gap: 6 }} data-testid="scan-player">
      <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={`btn sm${playing ? ' on' : ' primary'}`} onClick={() => (playing ? pause() : start(from))} data-testid="sp-play">
          {playing ? <><Ico n="pause" fill /> Pause</> : <><Ico n="play" fill /> {from > 0 ? 'Go on' : 'Play'}</>}
        </button>
        <button className="btn sm ghost" onClick={reset} aria-label="Back to the start" disabled={!playing && from === 0}><Ico n="again" /></button>
        <label className="row small" style={{ gap: 6, alignItems: 'center', flex: '1 1 160px' }}>
          <span>Speed</span>
          <input type="range" min={0.25} max={1.5} step={0.05} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Speed" data-testid="sp-speed" style={{ flex: 1 }} />
          <b className="tabular" data-testid="sp-bpm">{Math.round(bpm * speed)} BPM</b>
        </label>
        {onChangeSong && unsureList.length > 0 && (
          <button className="btn sm" onClick={jumpNextUnsure} data-testid="sp-next-unsure">
            Check {unsureList.length} unsure →
          </button>
        )}
        {loop && <button className="btn sm on" onClick={() => { setLoop(null); if (playing) start(at, null) }}>Looping bars {loop.from + 1}–{loop.to + 1} ✕</button>}
      </div>
      {peek && !picOff && sources && <SourcePeek sources={sources} src={peek.src} label={peek.label} unsure={peek.unsure} onHide={() => setPicOff(true)} />}
      {peek && picOff && (
        <button className="btn sm ghost" onClick={() => setPicOff(false)} data-testid="scan-source-show" style={{ alignSelf: 'flex-start' }}>
          <Ico n="image" /> Check it in the picture
        </button>
      )}
      {onChangeSong && selNote && selFlat && (
        <div className="panel small stack" style={{ gap: 6, padding: '8px 10px' }} data-testid="scan-note-fixer">
          <div className="row" style={{ gap: 6, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span>
              <b>Bar {selFlat.bar + 1}</b> · <b>{strNames[selNote.string]}</b> string · fret <b>{selNote.tech === 'x' ? 'x' : selNote.fret}</b>{selNote.tech && selNote.tech !== 'x' ? ` (${selNote.tech})` : ''}
              {selNote.unsure ? <span className="muted"> · amber ring (unsure)</span> : null}
            </span>
            <div className="row" style={{ gap: 4 }}>
              {selNote.unsure && <button className="btn sm primary" onClick={() => updateSelectedNote(n => ({ ...n, unsure: undefined }))} data-testid="fix-ok">Looks right ✓</button>}
              {unsureList.length > 0 && <button className="btn sm" onClick={jumpNextUnsure}>Next unsure →</button>}
              <button className="btn sm ghost" onClick={() => setSel(null)} aria-label="Close note fixer">✕</button>
            </div>
          </div>
          <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {altFrets.length > 0 && (
              <>
                <span className="muted">Likely:</span>
                {altFrets.map(f => (
                  <button key={f} className="btn sm primary" onClick={() => updateSelectedNote(n => ({ ...n, fret: f, tech: n.tech === 'x' ? undefined : n.tech }))} data-testid={`fix-alt-${f}`}>
                    Fret {f}
                  </button>
                ))}
              </>
            )}
            <span className="muted">Fret:</span>
            <button className="btn sm" disabled={selNote.fret <= 0} onClick={() => updateSelectedNote(n => ({ ...n, fret: Math.max(0, n.fret - 1), tech: n.tech === 'x' ? undefined : n.tech }))} data-testid="fix-fret-dn">−1</button>
            <button className="btn sm" disabled={selNote.fret >= 24} onClick={() => updateSelectedNote(n => ({ ...n, fret: Math.min(24, n.fret + 1), tech: n.tech === 'x' ? undefined : n.tech }))} data-testid="fix-fret-up">+1</button>
            <span className="muted">String:</span>
            <button className="btn sm" disabled={selNote.string >= track.tuning.length - 1} onClick={() => updateSelectedNote(n => ({ ...n, string: Math.min(track.tuning.length - 1, n.string + 1) }))} data-testid="fix-str-up">↑ {strNames[selNote.string + 1] ?? ''}</button>
            <button className="btn sm" disabled={selNote.string <= 0} onClick={() => updateSelectedNote(n => ({ ...n, string: Math.max(0, n.string - 1) }))} data-testid="fix-str-dn">↓ {strNames[selNote.string - 1] ?? ''}</button>
            <span className="muted">Move:</span>
            {TECHS.map(tc => (
              <button key={tc} className={`btn sm${selNote.tech === tc ? ' on' : ' ghost'}`} onClick={() => updateSelectedNote(n => ({ ...n, tech: n.tech === tc ? undefined : tc }))} data-testid={`fix-tech-${tc}`}>
                {tc}
              </button>
            ))}
            <button className="btn sm ghost" onClick={() => updateSelectedNote(() => null)} data-testid="fix-del">Delete note</button>
          </div>
        </div>
      )}
      <div className={selNote?.unsure && !playing ? 'scan-sel-unsure' : undefined}>
      <TabView track={track} mode="fret" flats={false} cursor={cur} playing={playing} states={states} version={0} spans={spans} marks={marks} strum={strumPattern(doc.song.strum) ?? null} meter={doc.song.meter ?? 4}
        onTap={(i, n) => {
          if (playing) start(i)
          else {
            setFrom(i)
            if (n && onChangeSong) {
              setSel({ flatIdx: i, string: n.string })
              if (n.tech !== 'x') audition(n.midi, n.string)
            }
          }
        }} />
      </div>
      {hand && hand.notes.some(n => n.fret > 0) && (
        <FingerBox where="scan" group={hand} next={next} beatsToShift={toShift} expected={expected} nStr={track.tuning.length} stringNames={strNames}
          onLoopShift={next ? () => { const b = flat[next.from]?.bar ?? 0; const lp = { from: Math.max(0, b - 1), to: b }; setLoop(lp); start(flat.findIndex(f => f.bar === lp.from), lp) } : undefined} />
      )}
    </div>
  )
}

