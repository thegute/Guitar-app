// The "solo" side of the play-along screen: the song's key and scales, the chord progression,
// and the fretboard showing scales, arpeggios, triads, or the notes that connect one chord to the next.
import { useMemo, useState, type ReactNode } from 'react'
import { Fretboard, type Mark } from './Fretboard'
import { Chips, KeyPicker, usePersist } from './Controls'
import { playNote } from '../audio/pluck'
import { scaleById, scaleInfo } from '../theory/scales'
import { pc, pcName } from '../theory/notes'
import type { KeyGuess, ImproTip } from '../tabs/keyDetect'
import {
  chordInfo, chordScale, connectingWalk, handWindow, keyScalePcs, triadShapes, voiceLeading,
  type ChordInfo, type ChordSpan,
} from '../tabs/harmony'
import type { SongNote } from '../tabs/model'

export type HarmonyMode = 'hand' | 'scale' | 'arp' | 'triads' | 'connect'

interface Props {
  tuning: number[]
  keyGuess: KeyGuess
  keyIsAuto: boolean
  detected: KeyGuess
  tips: ImproTip[]
  flats: boolean
  spans: ChordSpan[]
  /** span the tab is in now */
  curSpan: number
  /** the notes the tab wants next */
  expected: SongNote[]
  /** frets around where the tab is now (for the hand position) */
  nearFrets: number[]
  /** where the fretting hand sits now (Hand shape mode) */
  hand?: { notes: { string: number; fret: number; finger: number }[]; base: number; open: boolean } | null
  compact?: boolean
  onKey: (k: { root: string; minor: boolean } | null) => void
  onEditChord: (bar: number, name: string | null) => void
}

const MODES: { id: HarmonyMode; label: string }[] = [
  { id: 'hand', label: 'Hand shape' },
  { id: 'scale', label: 'Scale' },
  { id: 'arp', label: 'Arpeggio' },
  { id: 'triads', label: 'Triads' },
  { id: 'connect', label: 'Connect' },
]

function diatonicChords(key: KeyGuess, flats: boolean): string[] {
  const s = keyScalePcs(key)
  const out = s.map((r, i) => {
    const third = (s[(i + 2) % 7] - r + 12) % 12
    const fifth = (s[(i + 4) % 7] - r + 12) % 12
    return pcName(r, flats) + (fifth === 6 ? 'dim' : third === 3 ? 'm' : '')
  })
  if (key.minor) out.push(pcName((pc(key.root) + 7) % 12, flats)) // the major V borrowed from harmonic minor
  return out
}

function stringLabel(tuning: number[], s: number, flats: boolean) {
  const n = pcName(tuning[s] % 12, flats)
  const same = tuning.filter(t => t % 12 === tuning[s] % 12).length > 1
  if (!same) return n
  return s === 0 ? `low ${n}` : s === tuning.length - 1 ? `high ${n.toLowerCase()}` : n
}

// the Hand shape view is new: show it once to people who already picked another view
try { if (!localStorage.getItem('kg:handModeShown')) { localStorage.setItem('kg:hMode', '"hand"'); localStorage.setItem('kg:handModeShown', '1') } } catch { /* storage unavailable */ }

export function HarmonyPanel(p: Props) {
  const { tuning, keyGuess, flats, spans, expected, compact } = p
  const [mode, setMode] = usePersist<HarmonyMode>('hMode', 'hand')
  const [tipIdx, setTipIdx] = usePersist('hTip', 0)
  const [fitChord, setFitChord] = usePersist('hFit', false)
  const [labels, setLabels] = usePersist<'int' | 'note'>('hLabels', 'int')
  const [range, setRange] = usePersist<'hand' | 'neck'>('hRange', 'neck')
  const [triadLow, setTriadLow] = usePersist('hTriad', 3)
  const [pinned, setPinned] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [keyOpen, setKeyOpen] = useState(false)
  const [custom, setCustom] = useState('')

  const spanIdx = pinned !== null && pinned < spans.length ? pinned : p.curSpan
  const span = spanIdx >= 0 ? spans[spanIdx] : null
  const nextSpan = spanIdx >= 0 && spans.length > 1 ? spans[(spanIdx + 1) % spans.length] : null
  const cur = span ? chordInfo(span.name) : null
  const next = nextSpan ? chordInfo(nextSpan.name) : null
  const kPcs = useMemo(() => keyScalePcs(keyGuess), [keyGuess])
  const tip = p.tips[Math.min(tipIdx, p.tips.length - 1)]

  const nStr = tuning.length
  const [handLo, handHi] = handWindow(p.nearFrets)
  const useWindow = mode === 'connect' || range === 'hand'
  let from = useWindow ? Math.max(0, handLo - 1) : 0
  let to = useWindow ? Math.max(handHi + 1, from + 5) : 15
  if (mode === 'hand' && p.hand) { from = p.hand.open ? 0 : Math.max(0, p.hand.base - 2); to = Math.max(from + 6, (p.hand.open ? 4 : p.hand.base + 3) + 2) }
  const inWindow = (f: number) => !useWindow || (f >= handLo && f <= handHi) || (handLo === 0 && f <= 4)
  const expectedAt = new Map(expected.map(n => [`${n.string}-${n.fret}`, n]))

  // ---------- what each mode shows ----------
  let markFor: (midi: number, s: number, f: number) => Mark | null = () => null
  let caption = ''
  let extra: ReactNode = null
  const noteN = (q: number) => pcName(q, flats)

  if (mode === 'hand') {
    const at = new Map((p.hand?.notes ?? []).map(n => [`${n.string}-${n.fret}`, n]))
    markFor = (midi, s, f) => {
      const k = `${s}-${f}`
      const h = at.get(k)
      if (expectedAt.has(k)) return { label: h && h.finger ? String(h.finger) : noteN(midi % 12), role: 'target' }
      if (h) return { label: h.finger ? String(h.finger) : '0', role: 'chord' }
      return null
    }
    caption = p.hand
      ? `${p.hand.open ? 'Open position' : `Hand at fret ${p.hand.base}`}: every note of this part of the tab, with the finger that plays it (1 index, 2 middle, 3 ring, 4 pinky, 0 open string). The ring is the note you play next.`
      : 'Load a tab to see where your hand goes.'
  } else if (mode === 'scale') {
    const sc = fitChord && cur ? chordScale(cur, kPcs, flats) : null
    const root = sc ? cur!.root : tip ? pc(tip.root) : pc(keyGuess.root)
    const info = tip ? scaleInfo(tip.root, tip.scale) : null
    const set = new Set(sc ? sc.pcs : info?.pcs ?? kPcs)
    const lab = (q: number) => (labels === 'note' ? noteN(q) : sc ? intervalFrom(root, q) : info?.labels.get(q) ?? intervalFrom(root, q))
    markFor = (midi, s, f) => {
      const q = midi % 12
      if (expectedAt.has(`${s}-${f}`)) return { label: noteN(q), role: 'target' }
      if (!set.has(q) || !inWindow(f)) return null
      return { label: lab(q), role: q === root ? 'root' : cur?.pcs.includes(q) ? 'chord' : 'scale' }
    }
    caption = sc
      ? `${sc.name.replace(/^\w/, c => c.toUpperCase())}: the key's notes, fitted to ${span?.name}. Amber notes are the chord: land on them.`
      : tip
        ? `${tip.root} ${scaleById(tip.scale).label}. ${tip.why} Amber = notes of ${span?.name ?? 'the chord'}.`
        : ''
  } else if (!cur) {
    caption = spans.length ? 'No chord at this spot. Tap a chord above, or add one.' : 'This tab has no chords yet. Tap ✎ to add them.'
  } else if (mode === 'arp') {
    markFor = (midi, s, f) => {
      const q = midi % 12
      if (expectedAt.has(`${s}-${f}`)) return { label: noteN(q), role: 'target' }
      if (!cur.pcs.includes(q) || !inWindow(f)) return null
      return { label: labels === 'note' ? noteN(q) : cur.labels.get(q) ?? '', role: q === cur.root ? 'root' : 'chord' }
    }
    caption = `${cur.name} arpeggio: ${cur.pcs.map(q => `${noteN(q)} (${cur.labels.get(q)})`).join(' · ')}. Play these one at a time over the chord.`
  } else if (mode === 'triads') {
    const a = triadShapes(cur, triadLow, tuning)
    const b = next ? triadShapes(next, triadLow, tuning) : new Set<string>()
    markFor = (midi, s, f) => {
      const k = `${s}-${f}`
      const q = midi % 12
      const inA = a.has(k)
      const inB = b.has(k)
      if (!inA && !inB) return expectedAt.has(k) ? { label: noteN(q), role: 'target' } : null
      if (inA && inB) return { label: labels === 'note' ? noteN(q) : cur.labels.get(q) ?? '', role: 'common' }
      if (inA) return { label: labels === 'note' ? noteN(q) : cur.labels.get(q) ?? '', role: q === cur.root ? 'root' : 'chord' }
      return { label: labels === 'note' ? noteN(q) : next!.labels.get(q) ?? '', role: 'next' }
    }
    const sets = [0, 1, 2, 3].filter(l => l + 2 < nStr).map(l => ({ id: l, label: [l + 2, l + 1, l].map(s => stringLabel(tuning, s, flats).replace(/^(low|high) /, '')).join(' ') }))
    extra = <Chips label="Strings" items={sets.map(x => ({ id: x.id, label: x.label }))} value={triadLow} onChange={setTriadLow} />
    caption = next
      ? `${cur.name} triads (amber) and ${next.name} triads (teal rings) on these strings. Gold = notes both share: keep that finger down and move the others the shortest way.`
      : `${cur.name} triad shapes on these strings, every inversion up the neck.`
  } else if (mode === 'connect') {
    if (!next || !nextSpan) {
      caption = 'This song has only one chord, so there is nothing to connect.'
    } else {
      const walk = connectingWalk(cur, next, kPcs, tuning, handLo, handHi)
      const walkAt = new Map(walk.map((w, i) => [`${w.string}-${w.fret}`, i]))
      const vl = voiceLeading(cur, next)
      markFor = (midi, s, f) => {
        const k = `${s}-${f}`
        const q = midi % 12
        if (!inWindow(f)) return null
        const w = walkAt.get(k)
        if (w !== undefined) return { label: String(w + 1), role: w === 0 ? 'chord' : w === walk.length - 1 ? 'next' : 'pass' }
        const inA = cur.pcs.includes(q)
        const inB = next.pcs.includes(q)
        // chord tones are named by note here, so numbers only ever mean the walk order
        if (inA && inB) return { label: noteN(q), role: 'common' }
        if (inA) return { label: noteN(q), role: q === cur.root ? 'root' : 'chord' }
        if (inB) return { label: noteN(q), role: 'next' }
        return expectedAt.has(k) ? { label: noteN(q), role: 'target' } : null
      }
      const parts: string[] = []
      if (vl.common.length) parts.push(`Hold ${vl.common.map(noteN).join(' and ')}: ${vl.common.length > 1 ? 'they are' : 'it is'} in both chords.`)
      for (const m of vl.moves.slice(0, 3)) {
        const how = m.by === 0 ? 'stays' : `${m.by > 0 ? 'up' : 'down'} ${Math.abs(m.by) === 1 ? 'a half step' : Math.abs(m.by) === 2 ? 'a whole step' : `${Math.abs(m.by)} frets`}`
        parts.push(`${noteN(m.from)} (${m.fromLabel}) → ${noteN(m.to)} (${m.toLabel}), ${how}.`)
      }
      caption = `${cur.name} → ${next.name}. ` + parts.join(' ') + (walk.length ? ` Play 1 → ${walk.length} to walk into ${next.name}, landing on its ${next.labels.get(walk[walk.length - 1].midi % 12) === 'R' ? 'root' : '3rd'} as the chord changes.` : '')
    }
  }

  const chordChips = diatonicChords(keyGuess, flats)

  return (
    <div className={`harmony${compact ? ' compact' : ''}`}>
      <div className="h-top">
        <button className="key-btn" onClick={() => setKeyOpen(o => !o)} aria-expanded={keyOpen}>
          <span className="small muted">Key</span> <b>{keyGuess.label}</b>
          {p.keyIsAuto && <span className="small muted"> · auto</span>}
        </button>
        <div className="prog-strip" role="list" aria-label="Chord progression">
          {spans.length === 0 && <span className="small muted">No chords</span>}
          {spans.map((sp, i) => (
            <button
              key={i}
              role="listitem"
              className={`prog-chip${i === spanIdx ? ' on' : ''}${nextSpan && sp === nextSpan && spans.length > 1 ? ' nxt' : ''}${sp.source === 'guess' ? ' guess' : ''}`}
              onClick={() => { setPinned(i === p.curSpan && pinned === null ? null : i); setEditing(false) }}
            >
              {sp.name}
            </button>
          ))}
        </div>
        <button className="btn sm" aria-pressed={editing} onClick={() => setEditing(e => !e)} aria-label="Edit chords">✎</button>
      </div>

      {keyOpen && (
        <div className="h-sub">
          <KeyPicker value={keyGuess.root} onChange={r => p.onKey({ root: r, minor: keyGuess.minor })} />
          <div className="row">
            <Chips label="Major or minor" items={[{ id: 'maj', label: 'Major' }, { id: 'min', label: 'Minor' }]} value={keyGuess.minor ? 'min' : 'maj'} onChange={v => p.onKey({ root: keyGuess.root, minor: v === 'min' })} />
            <button className="btn sm" disabled={p.keyIsAuto} onClick={() => p.onKey(null)}>Auto: {p.detected.label}</button>
            <button className="btn sm" onClick={() => setKeyOpen(false)}>Done</button>
          </div>
        </div>
      )}

      {(editing || pinned !== null) && (
        <div className="h-sub">
          <div className="row small" style={{ justifyContent: 'space-between' }}>
            <span className="muted">
              {span ? <>Bar {span.bar + 1}: <b style={{ color: 'var(--pearl)' }}>{span.name}</b> {span.source === 'guess' ? '(my guess from the notes)' : span.source === 'you' ? '(your edit)' : '(from the tab)'}</> : 'Pick a chord to change it'}
            </span>
            {pinned !== null && <button className="btn sm" onClick={() => { setPinned(null); setEditing(false) }}>Follow the tab</button>}
          </div>
          {editing && span && (
            <>
              <div className="chips wrap" style={{ marginTop: 6 }}>
                {chordChips.map(c => (
                  <button key={c} className="chip" aria-pressed={c === span.name} onClick={() => p.onEditChord(span.bar, c)}>{c}</button>
                ))}
              </div>
              <form className="row" style={{ marginTop: 6 }} onSubmit={e => { e.preventDefault(); if (chordInfo(custom.trim())) { p.onEditChord(span.bar, custom.trim()); setCustom('') } }}>
                <input className="input" style={{ width: 120 }} placeholder="e.g. F#m7" value={custom} onChange={e => setCustom(e.target.value)} aria-label="Chord name" />
                <button className="btn sm" type="submit">Set</button>
                {span.source === 'you' && <button type="button" className="btn sm" onClick={() => p.onEditChord(span.bar, null)}>Undo my edit</button>}
              </form>
            </>
          )}
          {editing && !span && spans.length === 0 && (
            <div className="chips wrap" style={{ marginTop: 6 }}>
              {chordChips.map(c => <button key={c} className="chip" onClick={() => p.onEditChord(0, c)}>{c} in bar 1</button>)}
            </div>
          )}
        </div>
      )}

      <div className="h-modes">
        <Chips label="Show" items={MODES} value={mode} onChange={setMode} />
        {mode !== 'connect' && (
          <button className="btn sm" onClick={() => setLabels(labels === 'int' ? 'note' : 'int')} aria-label="Switch dot labels">
            Dots: {labels === 'int' ? 'R 3 5' : 'C E G'}
          </button>
        )}
      </div>
      {mode === 'scale' && (
        <div className="chips">
          {p.tips.map((t, i) => (
            <button key={i} className="chip" aria-pressed={!fitChord && i === tipIdx} onClick={() => { setTipIdx(i); setFitChord(false) }}>
              {t.root} {scaleById(t.scale).label.replace(/ \(.*\)/, '')}
            </button>
          ))}
          <button className="chip" aria-pressed={fitChord} onClick={() => setFitChord(!fitChord)} disabled={!cur}>Fit each chord</button>
        </div>
      )}
      {extra}
      {(mode === 'scale' || mode === 'arp') && (
        <Chips label="Range" items={[{ id: 'neck', label: 'Whole neck' }, { id: 'hand', label: 'Where the tab is' }]} value={range} onChange={setRange} />
      )}
      <Fretboard tuning={tuning} fromFret={from} toFret={to} markFor={markFor} onTap={m => playNote(m)} compact={compact} />
      {caption && <p className="h-caption small">{caption}</p>}
    </div>
  )
}

function intervalFrom(root: number, q: number) {
  return ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'][(q - root + 12) % 12]
}
export { stringLabel }
export type { ChordInfo }
