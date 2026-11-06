// Voice leading on the neck: the chord you're on (gold), the next one (teal rings), the notes both share (held:
// keep that finger down), and arrows for the fingers that move, gold for the 3rds and 7ths (the guide tones). Step
// through the progression, hear each change, pick where on the neck to play it, or turn the whole thing into a
// "Practise the changes" tab in Play (Wait for me listens for each chord).
import { useMemo, useState } from 'react'
import { Fretboard, type Mark } from './Fretboard'
import { Chips, usePersist } from './Controls'
import { Ico } from './Icon'
import { chordInfo, type ChordInfo } from '../tabs/harmony'
import { voiceLead, describeChange } from '../theory/voicelead'
import { strum } from '../audio/pluck'
import { audio } from '../audio/engine'
import { pcName } from '../theory/notes'
import { openInPlay } from '../nav'
import type { SongDoc } from '../tabs/library'
import type { Song } from '../tabs/model'

const ZONES: { id: string; label: string; z: [number, number] }[] = [
  { id: 'low', label: 'Low (frets 0–5)', z: [0, 5] },
  { id: 'mid', label: 'Middle (4–9)', z: [4, 9] },
  { id: 'high', label: 'High (8–13)', z: [8, 13] },
]

interface Props {
  /** the progression, by name */
  chords: string[]
  /** which one you're on (follows playback when given) */
  at?: number
  tuning: number[]
  where: string
  flats?: boolean
  compact?: boolean
  /** shows ‹ › to step through it yourself */
  steppable?: boolean
  bpm?: number
}

export function VoiceLeadNeck({ chords, at, tuning, where, flats = false, compact, steppable = true, bpm = 70 }: Props) {
  const [zone, setZone] = usePersist(`vlZone:${where}`, 'mid')
  const [size, setSize] = usePersist<'3' | '4'>(`vlSize:${where}`, '3')
  const [own, setOwn] = useState(0)
  const infos = useMemo(() => chords.map(c => chordInfo(c)).filter((c): c is ChordInfo => !!c), [chords])
  const z = ZONES.find(x => x.id === zone)?.z ?? ZONES[1].z
  const steps = useMemo(() => (infos.length >= 2 ? voiceLead(infos, tuning, z, size === '4' ? 4 : 3) : []), [infos, tuning, z, size])
  if (infos.length < 2) return <p className="small muted" style={{ margin: 0 }}>Voice leading needs at least two chords.</p>
  if (!steps.length) return <p className="small muted" style={{ margin: 0 }}>No compact shapes for these chords here: try another part of the neck.</p>
  const i = ((at ?? own) % steps.length + steps.length) % steps.length
  const st = steps[i], nxt = steps[(i + 1) % steps.length]
  const cur = infos[i], next = infos[(i + 1) % infos.length]
  const name = (m: number) => pcName(m % 12, flats)
  const curAt = new Map(st.voicing.notes.map(n => [`${n.s}-${n.f}`, n]))
  const nextAt = new Map(nxt.voicing.notes.map(n => [`${n.s}-${n.f}`, n]))
  const markFor = (_m: number, s: number, f: number): Mark | null => {
    const k = `${s}-${f}`
    const a = curAt.get(k), b = nextAt.get(k)
    if (a && b) return { label: a.label, role: 'common' }
    if (a) return { label: a.label, role: a.midi % 12 === cur.root ? 'root' : 'chord' }
    if (b) return { label: b.label, role: 'next' }
    return null
  }
  const arrows = st.moves.map(m => ({ s1: m.from.s, f1: m.from.f, s2: m.to.s, f2: m.to.f, kind: (m.guide ? 'guide' : 'move') as 'guide' | 'move' }))
  const lo = Math.max(0, Math.min(st.voicing.lo, nxt.voicing.lo) - 1), hi = Math.max(st.voicing.hi, nxt.voicing.hi) + 2
  const hear = () => {
    const ctx = audio(); void ctx.resume()
    strum(st.voicing.notes.map(n => n.midi), ctx.currentTime + 0.02)
    strum(nxt.voicing.notes.map(n => n.midi), ctx.currentTime + 1.1)
  }
  return (
    <div className={`voice-lead stack${compact ? ' compact' : ''}`} style={{ gap: 8 }} data-testid="voice-lead">
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {steppable && at === undefined && <button className="btn sm" onClick={() => setOwn(i - 1)} aria-label="Previous chord">‹</button>}
        <b className="vl-change">{cur.name} → {next.name}</b>
        {steppable && at === undefined && <button className="btn sm" onClick={() => setOwn(i + 1)} aria-label="Next chord">›</button>}
        <button className="btn sm" onClick={hear}><Ico n="play" /> Hear the change</button>
      </div>
      <Fretboard tuning={tuning} fromFret={lo} toFret={Math.max(hi, lo + 5)} markFor={markFor} arrows={arrows} zoomId={`vl-${where}`} compact={compact}
        onTap={(m) => { const ctx = audio(); void ctx.resume(); strum([m], ctx.currentTime + 0.01) }} />
      <p className="small" style={{ margin: 0 }} role="status">{describeChange(st, name) || 'Same shape: nothing moves.'}</p>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <Chips label="Where" items={ZONES.map(x => ({ id: x.id, label: x.label }))} value={zone} onChange={setZone} />
        <Chips label="Notes" items={[{ id: '3', label: '3 strings' }, { id: '4', label: '4 strings' }]} value={size} onChange={setSize} />
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <button className="btn sm primary" onClick={() => openInPlay(transitionsDoc(chords, steps.map(x => x.voicing.notes), tuning, bpm))} data-testid="vl-drill"><Ico n="target" /> Practise the changes</button>
        <span className="small muted">Gold ring = keep that finger down. Gold arrows = the 3rds and 7ths moving; dashed = other fingers.</span>
      </div>
    </div>
  )
}

/** A tab of the progression in these voicings, each chord for two bars, four times round: Play's Wait for me listens for each one. */
export function transitionsDoc(chords: string[], shapes: { s: number; f: number; midi: number }[][], tuning: number[], bpm: number): SongDoc {
  const bars = []
  for (let r = 0; r < 4; r++) for (let i = 0; i < shapes.length; i++) {
    const notes = shapes[i].map(n => ({ string: n.s, fret: n.f, midi: n.midi })).sort((a, b) => a.string - b.string)
    bars.push({ steps: [{ dur: 2, chord: chords[i], notes }, { dur: 2, notes }] })
  }
  const song: Song = { title: `Chord changes: ${chords.join(' ')}`, tempo: bpm, tracks: [{ name: 'Changes', tuning, capo: 0, bars }] }
  return { id: `vl:${chords.join('-')}:${shapes.map(s => s.map(n => n.f).join('')).join('.')}`, title: song.title, source: 'lesson', song, updated: Date.now() }
}
