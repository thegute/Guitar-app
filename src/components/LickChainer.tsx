// The lick chainer: tap licks to line them up like train cars, drag (or ‹ ›) to reorder, and hear or play the whole
// chain as one phrase. Every lick is moved to one key and placed near the last one on the neck.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useInstrument } from '../instrument'
import { LICKS, type LickDef } from '../licks/library'
import { LICK_STYLES, lickStyle, type LickStyleId } from '../licks/styles'
import { lickInKey, keyLabel, placeFor } from '../licks/generator'
import { chainSong, chainTempo, chainable, flowNext, lickBars, lickDots, loadChain, newUid, onChain, placeChain, saveChain, type Chain } from '../licks/chain'
import { KEYS } from '../theory/notes'
import { TabPlayer } from '../audio/tabPlayer'
import { activeSound, soundForProgram } from '../audio/pluck'
import { flatten } from '../tabs/model'
import type { SongDoc } from '../tabs/library'
import { Chips, usePersist } from './Controls'
import { Preview } from './ProgressionTabs'

/** A lick drawn small: six lines and a dot for each note, bends and slides in the accent colour. */
function LickPic({ l, w = 120, h = 34 }: { l: LickDef; w?: number; h?: number }) {
  const dots = useMemo(() => lickDots(l), [l])
  const y = (s: number) => 4 + (5 - s) * ((h - 8) / 5)
  return (
    <svg className="lick-pic" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {[0, 1, 2, 3, 4, 5].map(s => <line key={s} x1={2} x2={w - 2} y1={y(s)} y2={y(s)} />)}
      {dots.map((d, i) => <circle key={i} cx={4 + d.x * (w - 10)} cy={y(d.s)} r={2.6} className={d.tech && d.tech !== 'x' ? 'tech' : ''} />)}
    </svg>
  )
}

export function LickChainer({ onOpen }: { onOpen: (d: SongDoc) => void }) {
  const inst = useInstrument()
  const [chain, setChainNow] = useState<Chain>(loadChain)
  useEffect(() => onChain(() => setChainNow(loadChain())), [])
  const set = (c: Chain) => { setChainNow(c); saveChain(c) }
  const [style, setStyle] = usePersist<LickStyleId>('chainStyle', 'blues')
  const [mustOnly, setMustOnly] = useState(true)
  const placed = useMemo(() => placeChain(chain), [chain])
  const made = useMemo(() => chainSong(chain, inst.midis), [chain, inst.midis])
  const tempo = chainTempo(chain)
  const minor = placed[0] ? placed[0].lick.minor ?? lickStyle(placed[0].lick.style).minor : lickStyle(style).minor
  const doc: SongDoc | null = made ? {
    id: `jam:chain:${inst.id}:${chain.key}:${chain.links.map(l => l.lick).join('.')}:${tempo}:${chain.gap}`.slice(0, 200),
    title: made.song.title, source: 'jam', inst: inst.id, key: { root: chain.key, minor }, song: made.song, updated: Date.now(),
  } : null
  const pool = useMemo(() => LICKS.filter(l => l.style === style && chainable(l) && (!mustOnly || !!l.must)).sort((a, b) => a.level - b.level), [style, mustOnly])

  // hearing one lick (from the list or a card)
  const player = useRef<TabPlayer | null>(null)
  const [hearing, setHearing] = useState<string | null>(null)
  useEffect(() => () => player.current?.stop(), [])
  const hear = (l: LickDef) => {
    const p = (player.current ??= new TabPlayer())
    if (hearing === l.id) { p.stop(); setHearing(null); return }
    const s = lickInKey(l, placeFor(l, chain.key) ? chain.key : l.ref, inst.midis, tempo)
    if (!s) return
    p.stop()
    p.sound = activeSound(soundForProgram(s.song.tracks[0].program))
    p.onEnd = () => setHearing(null)
    p.play(flatten(s.song.tracks[0]), 0, tempo)
    setHearing(l.id)
  }

  const add = (l: LickDef) => set({ ...chain, key: chain.links.length ? chain.key : (placeFor(l, chain.key) ? chain.key : l.ref), links: [...chain.links, { lick: l.id, uid: newUid() }] })
  const remove = (i: number) => set({ ...chain, links: chain.links.filter((_, k) => k !== i) })
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= chain.links.length) return
    const links = [...chain.links]; [links[i], links[j]] = [links[j], links[i]]
    set({ ...chain, links })
  }
  const again = (i: number) => { const links = [...chain.links]; links.splice(i + 1, 0, { lick: links[i].lick, uid: newUid() }); set({ ...chain, links }) }
  const flow = () => { const l = flowNext(chain, chain.links.length ? undefined : style); if (l) add(l) }

  // drag a card by its ⠿ handle to a new place
  const [drag, setDrag] = useState<number | null>(null)
  const dragStart = (i: number, e: RPointerEvent) => {
    e.preventDefault()
    let at = i
    setDrag(i)
    const moveTo = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-chain-i]') as HTMLElement | null
      if (!el) return
      const k = Number(el.dataset.chainI)
      if (k === at || Number.isNaN(k)) return
      const c = loadChain()
      const links = [...c.links]
      const [x] = links.splice(at, 1)
      links.splice(k, 0, x)
      at = k
      setDrag(k)
      set({ ...c, links })
    }
    const up = () => { setDrag(null); removeEventListener('pointermove', moveTo); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
    addEventListener('pointermove', moveTo)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }

  const bars = placed.reduce((a, p) => a + (p.fits ? lickBars(p.lick) : 0), 0) + Math.max(0, placed.filter(p => p.fits).length - 1) * chain.gap

  return (
    <div className="stack lick-chainer" style={{ gap: 10 }}>
      <p className="small muted" style={{ margin: 0 }}>Tap licks below to add them to your chain. They all move to one key, and each one sits near where the last one ended, so your hand stays put. Drag ⠿ to reorder.</p>

      <div className="chain-strip" role="list" aria-label="Your lick chain">
        {chain.links.length === 0 && <div className="chain-empty">Your chain is empty. Tap a lick below, or <button className="link-btn" onClick={flow}>add one for me</button>.</div>}
        {placed.map((p, i) => (
          <div key={p.link.uid} className={`chain-car${p.fits ? '' : ' nofit'}${drag === i ? ' dragging' : ''}`} role="listitem" data-chain-i={i}>
            <div className="chain-car-top">
              <span className="chain-n">{i + 1}</span>
              <button className="chain-grip" aria-label={`Drag ${p.lick.name} to move it`} onPointerDown={e => dragStart(i, e)}>⠿</button>
              <button className="btn sm ghost chain-x" onClick={() => remove(i)} aria-label={`Remove ${p.lick.name}`}>✕</button>
            </div>
            <button className="chain-car-body" onClick={() => hear(p.lick)} aria-label={`Hear ${p.lick.name}`}>
              <LickPic l={p.lick} />
              <b>{p.lick.name}</b>
              <span className="small muted">{lickStyle(p.lick.style).label.replace(/ \(.*\)$/, '')} · {lickBars(p.lick)} bar{lickBars(p.lick) > 1 ? 's' : ''}{hearing === p.lick.id ? ' · playing' : ''}</span>
              {!p.fits && <span className="small chain-warn">Doesn't fit {keyLabel(chain.key, minor)}: skipped</span>}
            </button>
            <div className="chain-car-btns">
              <button className="btn sm ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">‹</button>
              <button className="btn sm ghost" onClick={() => again(i)} aria-label="Play it again after this">×2</button>
              <button className="btn sm ghost" onClick={() => move(i, 1)} disabled={i === placed.length - 1} aria-label="Move later">›</button>
            </div>
          </div>
        ))}
        {chain.links.length > 0 && <button className="chain-car chain-add" onClick={flow} title="Adds a lick that starts close to where your chain ends">＋<span className="small">Add one that flows</span></button>}
      </div>

      {chain.links.length > 0 && (
        <div className="panel stack chain-settings" style={{ gap: 8 }}>
          <Chips label="Key" wrap keyStyle items={KEYS.map(k => ({ id: k, label: keyLabel(k, minor) }))} value={chain.key} onChange={k => set({ ...chain, key: k })} />
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <label className="field" style={{ flex: '1 1 180px' }}>
              <span>Tempo: <b>{tempo}</b> BPM</span>
              <input type="range" min={40} max={200} value={tempo} onChange={e => set({ ...chain, tempo: Number(e.target.value) })} aria-label="Tempo" />
            </label>
            <Chips label="Space between licks" items={[{ id: 0, label: 'Straight on' }, { id: 0.5, label: 'Half a bar' }, { id: 1, label: 'A bar' }]} value={chain.gap} onChange={g => set({ ...chain, gap: g as Chain['gap'] })} />
          </div>
          <span className="small muted">{placed.length} lick{placed.length > 1 ? 's' : ''} · about {Math.round(bars)} bars{made?.skipped ? ` · ${made.skipped} skipped (not in this key)` : ''}{made && made.capo ? ` · capo ${made.capo}` : ''}</span>
          {doc && <Preview doc={doc} minor={minor} />}
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {doc && <button className="btn primary" onClick={() => onOpen(doc)}>Play along (it listens)</button>}
            <button className="btn sm ghost" onClick={() => set({ ...chain, links: [] })}>Clear the chain</button>
          </div>
        </div>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <b>Add licks</b>
        <div className="chips" role="group" aria-label="Lick style">
          {LICK_STYLES.map(s => <button key={s.id} className="chip" aria-pressed={s.id === style} onClick={() => setStyle(s.id)}>{s.label.replace(/ \(.*\)$/, '')}</button>)}
        </div>
        <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={mustOnly} onChange={e => setMustOnly(e.target.checked)} /> Must-know licks only</label>
        <div className="chain-pool">
          {pool.map(l => {
            const fits = !chain.links.length || !!placeFor(l, chain.key)
            return (
              <div key={l.id} className={`chain-pick${fits ? '' : ' nofit'}`}>
                <button className="chain-pick-add" onClick={() => add(l)} aria-label={`Add ${l.name} to the chain`}>
                  <LickPic l={l} w={96} h={28} />
                  <span><b>{l.name}</b><span className="small muted"> · {lickBars(l)} bar{lickBars(l) > 1 ? 's' : ''}{fits ? '' : ` · not in ${keyLabel(chain.key, minor)}`}</span></span>
                  <span className="chain-plus" aria-hidden>＋</span>
                </button>
                <button className="btn sm ghost" onClick={() => hear(l)} aria-label={`Hear ${l.name}`}>{hearing === l.id ? '■' : '🔊'}</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
