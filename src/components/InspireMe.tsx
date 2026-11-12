// Jam → Inspire me: a palette of up to 8 chords that sound good together (NI Playbox's idea: one chord per key, play
// them in any order). Roll a set by mood and colour, hear each chord, keep (lock) the ones you like, shuffle, tap chords
// into your own order and play it with the band. Every chord shows its name and number in the key, so the ideas
// become something you learn. The owner's Playbox chord sets come in from a private file; KGuitar's own are always there.
import { useMemo, useRef, useState } from 'react'
import { Chips, usePersist } from './Controls'
import { IconDice, IconLock } from './Icons'
import { Ico } from './Icon'
import {
  allSets, colourOf, parseChordSets, privateSets, rollSet, savePrivateSets, setChords, shuffleChords,
  type ChordSet, type Colour,
} from '../theory/chordSets'
import type { ProgChord } from '../theory/progressions'

type Chord = ProgChord & { midis: number[] }
const MOODS = [{ id: 'any', label: 'Any mood' }, { id: 'major', label: 'Bright' }, { id: 'minor', label: 'Moody' }] as const
const COLOURS = [{ id: 'any', label: 'Any colour' }, { id: 'simple', label: 'Simple' }, { id: 'colour', label: 'Colourful' }, { id: 'lush', label: 'Lush' }] as const

export function InspireMe({ tonic, onHear, onUse }: { tonic: string; onHear: (c: Chord) => void; onUse: (chords: Chord[], mode: 'major' | 'minor') => void }) {
  const [mood, setMood] = usePersist<'any' | 'major' | 'minor'>('inspireMood', 'any')
  const [colour, setColour] = usePersist<'any' | Colour>('inspireColour', 'any')
  const [setId, setSetId] = usePersist('inspireSet', '')
  const [locked, setLocked] = useState<(Chord | null)[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [shuffled, setShuffled] = useState<number[] | null>(null)
  const [msg, setMsg] = useState('')
  const [, bump] = useState(0)
  const file = useRef<HTMLInputElement>(null)
  const sets = useMemo(() => allSets(), [msg]) // eslint-disable-line react-hooks/exhaustive-deps
  const hasPrivate = privateSets().length > 0
  const set: ChordSet | undefined = sets.find(s => s.id === setId) ?? sets[0]
  const base = useMemo(() => (set ? setChords(set, tonic) : []), [set, tonic])
  // locked chords stay where they were when a new set is rolled (Playbox's Lock Chord)
  const fresh = base.map((c, i) => locked[i] ?? c)
  const chords = shuffled ? shuffled.map(i => fresh[i]).filter(Boolean) : fresh

  function roll() {
    const s = rollSet({ mood, colour, avoid: set?.id }, Math.random, sets) ?? rollSet({ avoid: set?.id }, Math.random, sets)
    if (!s) return
    setSetId(s.id); setShuffled(null); setOrder([])
    if (!s || mood !== 'any' && s.mode !== mood || colour !== 'any' && colourOf(s) !== colour) setMsg('Nothing fits all of that: here is the closest.')
    else setMsg('')
  }
  function toggleLock(i: number) {
    const idx = shuffled ? shuffled[i] : i
    const l = [...locked]
    l[idx] = l[idx] ? null : fresh[idx]
    setLocked(l)
  }
  function shuffle() {
    const idx = fresh.map((_, i) => i)
    setShuffled(shuffleChords(idx, idx.map(i => !!locked[i])))
  }
  async function bringIn(f: File | undefined) {
    if (!f) return
    try {
      const got = parseChordSets(JSON.parse(await f.text()))
      savePrivateSets(got)
      setMsg(`${got.length} chord sets brought in. They stay on this phone.`)
      bump(n => n + 1)
    } catch (e) { setMsg(String((e as Error).message ?? e)) }
  }
  const picked = order.map(i => chords[i]).filter(Boolean)

  return (
    <div className="stack inspire" style={{ gap: 10 }} data-testid="inspire">
      <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chips label="Mood" items={MOODS as unknown as { id: 'any' | 'major' | 'minor'; label: string }[]} value={mood} onChange={setMood} />
        <Chips label="Colour" items={COLOURS as unknown as { id: 'any' | Colour; label: string }[]} value={colour} onChange={setColour} />
        <button className="btn primary" onClick={roll} data-testid="inspire-roll" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconDice /> New chord set</button>
      </div>
      {set && (
        <p className="small muted" style={{ margin: 0 }}>
          <b>{set.name}</b> in {tonic} {set.mode === 'minor' ? 'minor' : 'major'}{set.source === 'playbox' ? ' · from your Playbox' : ''}. Tap a chord to hear it,
          <b> +</b> to add it to your order, the lock to keep it when you roll again.
        </p>
      )}
      <div className="inspire-chords" data-testid="inspire-chords">
        {chords.map((c, i) => {
          const isLocked = !!locked[shuffled ? shuffled[i] : i]
          return (
            <div key={i} className={`inspire-chord${isLocked ? ' locked' : ''}`}>
              <button className="inspire-hear" onClick={() => onHear(c)} aria-label={`Hear ${c.symbol}`} data-testid="inspire-chord" data-chord={c.symbol}>
                <span className="readout">{c.symbol}</span>
                <span className="small muted">{c.roman}</span>
              </button>
              <div className="row" style={{ gap: 4, justifyContent: 'center' }}>
                <button className="btn icon-btn inspire-mini" onClick={() => setOrder(o => [...o, i].slice(-16))} aria-label={`Add ${c.symbol} to your order`} data-testid="inspire-add">+</button>
                <button className="btn icon-btn inspire-mini" onClick={() => toggleLock(i)} aria-pressed={isLocked} aria-label={isLocked ? `Unlock ${c.symbol}` : `Keep ${c.symbol}`}><IconLock locked={isLocked} /></button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center', minHeight: 32 }} data-testid="inspire-order">
          <span className="small muted">Your order:</span>
          {picked.length ? picked.map((c, k) => (
            <button key={k} className="chip" onClick={() => setOrder(o => o.filter((_, j) => j !== k))} aria-label={`Take ${c.symbol} out`} data-chord={c.symbol}>{c.symbol} ✕</button>
          )) : <span className="small muted">tap + on the chords (or use them all, in this order)</span>}
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => onUse(picked.length ? picked : chords, set?.mode ?? 'major')} data-testid="inspire-use"><Ico n="play" /> Play {picked.length ? 'my order' : 'these'} with the band</button>
          <button className="btn" onClick={shuffle} data-testid="inspire-shuffle">Shuffle</button>
          {order.length > 0 && <button className="btn ghost" onClick={() => setOrder([])}>Clear my order</button>}
        </div>
      </div>
      {!hasPrivate && (
        <p className="small muted" style={{ margin: 0 }}>
          Have Playbox? Bring in your chord sets file (<b>chordsets.json</b>, made on your Mac) for its 220+ sets.{' '}
          <button className="link-btn small" onClick={() => file.current?.click()} data-testid="inspire-import">Bring it in…</button>
        </p>
      )}
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { void bringIn(e.target.files?.[0]); e.target.value = '' }} />
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  )
}
