// The lick chainer: tap licks to line them up like train cars, drag (or ‹ ›) to reorder, and hear or play the whole
// chain as one phrase. Every lick is moved to one key and placed near the last one on the neck.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Ico } from './Icon'
import { useInstrument } from '../instrument'
import { LICKS, type LickDef } from '../licks/library'
import { deleteMyLick, myLicks, onMyLicks } from '../licks/mine'
import { LICK_STYLES, lickStyle, type LickStyleId } from '../licks/styles'
import { lickInKey, keyLabel, placeFor } from '../licks/generator'
import {
  chainMinor,
  chainSong,
  chainTempo,
  chainable,
  flowNext,
  lickBars,
  lickDots,
  lickMatchesChain,
  lickMinor,
  loadChain,
  newUid,
  onChain,
  placeChain,
  saveChain,
  type Chain,
} from '../licks/chain'
import { KEYS, pc } from '../theory/notes'
import { TabPlayer } from '../audio/tabPlayer'
import { activeSound, soundForProgram } from '../audio/pluck'
import { flatten } from '../tabs/model'
import { saveSong, type SongDoc } from '../tabs/library'
import { formatKeyBadge } from '../tabs/keyDetect'
import { jamBandForSong, jamProgression } from '../tabs/fromProgression'
import { Chips, usePersist } from './Controls'
import { Preview } from './ProgressionTabs'
import { Win, WinArea } from './Win'

const keyOptionId = (root: string, minor: boolean) => `${pc(root)}:${minor ? 1 : 0}`

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
  const [style, setStyle] = usePersist<'all' | LickStyleId>('chainStyle', 'blues')
  const [mustOnly, setMustOnly] = useState(true)
  const [keyFilter, setKeyFilter] = useState('all')
  const [savedSong, setSavedSong] = useState(false)
  const minor = chainMinor(chain)
  const allowTranspose = !!chain.allowTranspose
  const placed = useMemo(() => placeChain({ ...chain, minor }), [chain, minor])
  const made = useMemo(() => chainSong({ ...chain, minor }, inst.midis), [chain, minor, inst.midis])
  const tempo = chainTempo(chain)
  const doc: SongDoc | null = made ? {
    id: `jam:chain:${inst.id}:${chain.key}:${minor ? 'm' : 'M'}:${chain.links.map(l => l.lick).join('.')}:${tempo}:${chain.gap}`.slice(0, 200),
    title: made.song.title, source: 'jam', inst: inst.id, key: { root: chain.key, minor }, song: made.song, updated: Date.now(),
  } : null
  const [mine, setMine] = useState(myLicks)
  useEffect(() => onMyLicks(() => setMine(myLicks())), [])
  useEffect(() => { setSavedSong(false) }, [doc?.id])

  const keyOptions = useMemo(() => {
    const map = new Map<string, { id: string; pc: number; minor: boolean; label: string }>()
    for (const l of [...LICKS, ...mine]) {
      if (!chainable(l)) continue
      const m = lickMinor(l)
      const p = pc(l.ref)
      const id = keyOptionId(l.ref, m)
      if (!map.has(id)) map.set(id, { id, pc: p, minor: m, label: formatKeyBadge(l.ref, m) })
    }
    return [...map.values()].sort((a, b) => a.pc - b.pc || Number(a.minor) - Number(b.minor))
  }, [mine])

  const pool = useMemo(() => {
    const base = style === 'mine'
      ? mine.filter(chainable)
      : style === 'all'
        ? [...LICKS, ...mine].filter(l => chainable(l) && (!mustOnly || l.style === 'mine' || !!l.must))
        : LICKS.filter(l => l.style === style && chainable(l) && (!mustOnly || !!l.must))
    const filtered = base.filter(l => {
      if (chain.links.length > 0) return lickMatchesChain(l, chain.key, minor, allowTranspose)
      if (keyFilter !== 'all') return keyOptionId(l.ref, lickMinor(l)) === keyFilter
      return true
    })
    return filtered.sort((a, b) => a.level - b.level)
  }, [style, mustOnly, mine, chain.links.length, chain.key, minor, allowTranspose, keyFilter])

  // hearing one lick or the chain over Jam band (shares one TabPlayer)
  const player = useRef<TabPlayer | null>(null)
  const [hearing, setHearing] = useState<string | null>(null)
  const [hearingBand, setHearingBand] = useState(false)
  useEffect(() => () => player.current?.stop(), [])
  const jam = useMemo(() => jamProgression(), [])

  const hear = (l: LickDef) => {
    const p = (player.current ??= new TabPlayer())
    if (hearing === l.id) { p.stop(); setHearing(null); return }
    const s = lickInKey(l, chain.links.length && placeFor(l, chain.key) ? chain.key : l.ref, inst.midis, tempo)
    if (!s) return
    p.stop()
    setHearingBand(false)
    p.band = undefined
    p.sound = activeSound(soundForProgram(s.song.tracks[0].program))
    p.onEnd = () => setHearing(null)
    p.play(flatten(s.song.tracks[0]), 0, tempo)
    setHearing(l.id)
  }

  const hearOverBand = () => {
    if (!doc) return
    const p = (player.current ??= new TabPlayer())
    if (hearingBand) { p.stop(); setHearingBand(false); return }
    const trk = doc.song.tracks[0]
    if (!trk) return
    p.stop()
    setHearing(null)
    p.band = jamBandForSong(doc.song, inst) ?? undefined
    p.sound = activeSound(soundForProgram(trk.program))
    p.onEnd = () => setHearingBand(false)
    p.play(flatten(trk), 0, tempo)
    setHearingBand(true)
  }

  const saveToSongs = async () => {
    if (!doc) return
    await saveSong({ ...doc, updated: Date.now() })
    setSavedSong(true)
  }

  const add = (l: LickDef) => {
    const lMin = lickMinor(l)
    if (chain.links.length === 0) {
      set({ ...chain, key: l.ref, minor: lMin, allowTranspose: false, links: [{ lick: l.id, uid: newUid() }] })
    } else {
      set({ ...chain, minor, links: [...chain.links, { lick: l.id, uid: newUid() }] })
    }
  }
  const remove = (i: number) => set({ ...chain, links: chain.links.filter((_, k) => k !== i) })
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= chain.links.length) return
    const links = [...chain.links]; [links[i], links[j]] = [links[j], links[i]]
    set({ ...chain, links })
  }
  const again = (i: number) => { const links = [...chain.links]; links.splice(i + 1, 0, { lick: links[i].lick, uid: newUid() }); set({ ...chain, links }) }
  const flow = () => {
    const l = flowNext({ ...chain, minor }, chain.links.length ? undefined : style)
    if (l) add(l)
  }

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
  const chainBadge = formatKeyBadge(chain.key, minor)
  const jamMinor = jam ? ['minor', 'dorian', 'phrygian', 'harmonic'].includes(jam.mode) : false

  return (
    <div className="stack lick-chainer" style={{ gap: 10 }}>
      <p className="small muted" style={{ margin: 0 }}>Tap licks below to line them up in the same key. The first lick locks the key and major/minor sound; each lick sits near where the last one ended so your hand stays put. Drag ⠿ to reorder.</p>
      <WinArea area="lickChain">
        <Win id="lc-chain" title="Your lick chain" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
          <div className="chain-strip" role="list" aria-label="Your lick chain">
            {chain.links.length === 0 && <div className="chain-empty">Your chain is empty. Tap a lick below, or <button className="link-btn" onClick={flow}>add one for me</button>.</div>}
            {placed.map((p, i) => (
              <div key={p.link.uid} className={`chain-car${p.fits ? '' : ' nofit'}${drag === i ? ' dragging' : ''}`} role="listitem" data-chain-i={i}>
                <div className="chain-car-top">
                  <span className="chain-n">{i + 1}</span>
                  <span className="key-tag">{formatKeyBadge(p.lick.ref, lickMinor(p.lick))}</span>
                  <button className="chain-grip" aria-label={`Drag ${p.lick.name} to move it`} onPointerDown={e => dragStart(i, e)}>⠿</button>
                  <button className="btn sm ghost chain-x" onClick={() => remove(i)} aria-label={`Remove ${p.lick.name}`}>✕</button>
                </div>
                <button className="chain-car-body" onClick={() => hear(p.lick)} aria-label={`Hear ${p.lick.name}`}>
                  <LickPic l={p.lick} />
                  <b>{p.lick.name}</b>
                  <span className="small muted">{lickStyle(p.lick.style).label.replace(/ \(.*\)$/, '')} · {lickBars(p.lick)} bar{lickBars(p.lick) > 1 ? 's' : ''}{hearing === p.lick.id ? ' · playing' : ''}</span>
                  {!p.fits && <span className="small chain-warn">Skipped ({formatKeyBadge(p.lick.ref, lickMinor(p.lick))} ≠ {chainBadge})</span>}
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
        </Win>

        {chain.links.length > 0 && (
          <Win id="lc-settings" title="Key, tempo & preview" className="panel chain-settings" bodyClass="stack" bodyStyle={{ gap: 8 }}>
            <Chips
              label="Key"
              wrap
              keyStyle
              items={KEYS.map(k => ({ id: k, label: keyLabel(k, minor) }))}
              value={chain.key}
              onChange={k => set({ ...chain, key: k, minor, allowTranspose: true })}
            />
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <label className="field" style={{ flex: '1 1 180px' }}>
                <span>Tempo: <b>{tempo}</b> BPM</span>
                <input type="range" min={40} max={200} value={tempo} onChange={e => set({ ...chain, tempo: Number(e.target.value) })} aria-label="Tempo" />
              </label>
              <Chips label="Space between licks" items={[{ id: 0, label: 'Straight on' }, { id: 0.5, label: 'Half a bar' }, { id: 1, label: 'A bar' }]} value={chain.gap} onChange={g => set({ ...chain, gap: g as Chain['gap'] })} />
            </div>
            <span className="small muted">{placed.length} lick{placed.length > 1 ? 's' : ''} · about {Math.round(bars)} bars{made?.skipped ? ` · ${made.skipped} skipped (not in ${chainBadge})` : ''}{made && made.capo ? ` · Capo ${made.capo}` : ''}</span>
            {doc && <Preview doc={doc} minor={minor} />}
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {doc && <button className="btn primary" onClick={() => onOpen(doc)}>Play along (it listens)</button>}
              {doc && jam && jam.chords.length > 0 && (
                <button className={`btn sm${hearingBand ? ' on' : ''}`} data-testid="chain-hear-band" onClick={hearOverBand}>
                  {hearingBand ? '■ Stop band' : `▶ Hear over my Jam band (${formatKeyBadge(jam.tonic, jamMinor)})`}
                </button>
              )}
              {doc && (
                <button className="btn sm" data-testid="chain-save-song" onClick={() => void saveToSongs()}>
                  {savedSong ? '✓ Saved to My Songs' : 'Save to My Songs'}
                </button>
              )}
              <button className="btn sm ghost" onClick={() => set({ ...chain, allowTranspose: false, links: [] })}>Clear the chain</button>
            </div>
          </Win>
        )}

        <Win id="lc-pool" title="Add licks" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
          <div className="chips" role="group" aria-label="Lick style">
            <button className="chip" aria-pressed={style === 'all'} onClick={() => setStyle('all')} data-testid="chain-all-styles">All styles</button>
            {mine.length > 0 && <button className="chip" aria-pressed={style === 'mine'} onClick={() => setStyle('mine')} data-testid="chain-mine">My riffs ({mine.length})</button>}
            {LICK_STYLES.map(s => <button key={s.id} className="chip" aria-pressed={s.id === style} onClick={() => setStyle(s.id)}>{s.label.replace(/ \(.*\)$/, '')}</button>)}
          </div>
          {chain.links.length > 0 ? (
            <div className="chain-lock-bar small" data-testid="chain-lock-bar">
              <span>Same-key lock: <span className="key-tag">{chainBadge}</span></span>
              <label>
                <input
                  type="checkbox"
                  checked={allowTranspose}
                  onChange={e => set({ ...chain, minor, allowTranspose: e.target.checked })}
                  data-testid="chain-allow-transpose"
                />
                <span>Include licks transposed to {chainBadge}</span>
              </label>
            </div>
          ) : (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="field" style={{ flex: '1 1 200px' }}>
                <span>Key</span>
                <select className="select" value={keyFilter} onChange={e => setKeyFilter(e.target.value)} data-testid="chain-key-filter">
                  <option value="all">Any key (first lick sets key)</option>
                  {keyOptions.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </label>
            </div>
          )}
          {style === 'mine' ? <p className="small muted" style={{ margin: 0 }}>Riffs you scanned in the Riff Scanner and kept with "Add to my lick chain".</p>
            : <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={mustOnly} onChange={e => setMustOnly(e.target.checked)} /> Must-know licks only</label>}
          {!pool.length && (
            <div className="row small notice" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>No licks here match {chain.links.length ? chainBadge : 'that key'}.</span>
              {style !== 'all' && <button className="btn sm" onClick={() => setStyle('all')}>Show all styles</button>}
              {chain.links.length > 0 && !allowTranspose && <button className="btn sm" onClick={() => set({ ...chain, minor, allowTranspose: true })}>Include transposed licks</button>}
              {mustOnly && style !== 'mine' && <button className="btn sm ghost" onClick={() => setMustOnly(false)}>Show every lick</button>}
              {!chain.links.length && keyFilter !== 'all' && <button className="btn sm ghost" onClick={() => setKeyFilter('all')}>Any key</button>}
            </div>
          )}
          <div className="chain-pool">
            {pool.map(l => {
              const lMin = lickMinor(l)
              const fits = !chain.links.length || lickMatchesChain(l, chain.key, minor, allowTranspose)
              const transposed = chain.links.length > 0 && pc(l.ref) !== pc(chain.key)
              return (
                <div key={l.id} className={`chain-pick${fits ? '' : ' nofit'}`}>
                  <button className="chain-pick-add" onClick={() => add(l)} aria-label={`Add ${l.name} to the chain`}>
                    <LickPic l={l} w={96} h={28} />
                    <span>
                      <b>{l.name}</b> <span className="key-tag">{formatKeyBadge(l.ref, lMin)}</span>
                      <span className="small muted"> · {lickBars(l)} bar{lickBars(l) > 1 ? 's' : ''}{transposed ? ` → ${chainBadge}` : ''}</span>
                    </span>
                    <span className="chain-plus" aria-hidden>＋</span>
                  </button>
                  <button className="btn sm ghost" onClick={() => hear(l)} aria-label={`Hear ${l.name}`}>{hearing === l.id ? <Ico n="stop" fill /> : <Ico n="sound" />}</button>
                  {l.style === 'mine' && <button className="btn sm ghost" onClick={() => deleteMyLick(l.id)} aria-label={`Delete ${l.name}`}><Ico n="trash" /></button>}
                </div>
              )
            })}
          </div>
        </Win>
      </WinArea>
    </div>
  )
}
