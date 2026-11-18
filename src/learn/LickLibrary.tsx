// Must-know licks: the licks every player of a style should have under their fingers, each with a breakdown (what it
// is, how to play it step by step, the secret to making it sound right, where to use it and a tempo to aim for).
// Pick a key (open-string styles use a capo), hear it, and open it in Play so the app follows you.
import { useBack } from '../back'
import { useEffect, useMemo, useState } from 'react'
import { useInstrument } from '../instrument'
import { LICKS, type LickDef } from '../licks/library'
import { findLick, myLicks, onMyLicks } from '../licks/mine'
import { LICK_STYLES, lickStyle, type LickStyleId } from '../licks/styles'
import { keyLabel, lickInKey, placeFor } from '../licks/generator'
import { Chips, usePersist } from '../components/Controls'
import { Preview } from '../components/ProgressionTabs'
import { openExercise, openExercisesFiltered, openInPlay, openSongsInKey } from '../nav'
import { KEYS, pc } from '../theory/notes'
import { useScreenInfo } from '../assistant/screen'
import { addToChain, chainable, checkChainAdd, lickMinor, matchChainTranspose, startNewChain, type ChainAddCheck } from '../licks/chain'
import { Win, WinArea } from '../components/Win'
import { WORKS_OVER_TAGS, currentJamProfile, lickMatchScore, worksOverForExercise, worksOverForLick, worksOverSummary, type WorksOverId } from '../licks/worksOver'
import { formatKeyBadge } from '../tabs/keyDetect'
import { keyOptionId } from '../tabs/transpose'
import { exerciseCatalog } from '../exercises/catalog'

const LEVEL = ['', 'Easy', 'Medium', 'Hard']
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t)

export function LickLibrary({ initial, onExit }: { initial?: string; onExit: () => void }) {
  const first = initial ? findLick(initial) : undefined
  const [mine, setMine] = useState(myLicks)
  useEffect(() => onMyLicks(() => setMine(myLicks())), [])
  const [styleSaved, setStyle] = usePersist<string>('mustStyle', 'blues')
  const styleRaw = styleSaved === 'jawaiian' ? 'reggaerock' : styleSaved
  const [style, setStyleNow] = useState<'all' | LickStyleId>(
    first?.style ?? ((styleRaw === 'all' || styleRaw === 'mine' || LICK_STYLES.some(s => s.id === (initial || styleRaw))) ? ((initial || styleRaw) as 'all' | LickStyleId) : 'blues'),
  )
  const [worksOver, setWorksOver] = usePersist<'all' | 'jam' | WorksOverId>('mustWorksOver', 'all')
  const [keyFilter, setKeyFilter] = usePersist<string>('mustKey', 'all')
  const [search, setSearch] = useState('')
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState<string | null>(first?.id ?? null)
  // "Licks over Gm" from a chord or scale neck: the licks that fit (minor or major), shown in that key
  const [want, setWant] = usePersist<{ root: string; minor: boolean } | null>('lickWantKey', null)
  const [prompt, setPrompt] = useState<{ lickId: string; check: ChainAddCheck } | null>(null)
  const [addedToast, setAddedToast] = useState<{ lickId: string; text: string } | null>(null)
  const pick = (s: 'all' | LickStyleId) => { setStyleNow(s); setStyle(s); setOpen(null); setPrompt(null) }
  const st = style === 'all' ? null : lickStyle(style)
  const jam = useMemo(() => currentJamProfile(), [])

  const keyOptions = useMemo(() => {
    const map = new Map<string, { id: string; pc: number; minor: boolean; label: string }>()
    for (const l of [...LICKS, ...mine]) {
      const m = lickMinor(l)
      const p = pc(l.ref)
      const id = keyOptionId(l.ref, m)
      if (!map.has(id)) map.set(id, { id, pc: p, minor: m, label: formatKeyBadge(l.ref, m) })
    }
    return [...map.values()].sort((a, b) => a.pc - b.pc || Number(a.minor) - Number(b.minor))
  }, [mine])

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    const source = style === 'mine' ? mine : style === 'all' ? [...LICKS, ...mine] : LICKS
    return source.filter(l => {
      if (style !== 'all' && style !== 'mine' && l.style !== style) return false
      if (style !== 'mine' && !all && !l.must) return false
      const lMin = lickMinor(l)
      if (want && lMin !== want.minor) return false
      if (keyFilter === 'jam' && jam) {
        if (pc(l.ref) !== pc(jam.tonic) || lMin !== jam.minor) return false
      } else if (keyFilter !== 'all' && keyFilter !== 'jam') {
        if (keyOptionId(l.ref, lMin) !== keyFilter) return false
      }
      if (worksOver !== 'all') {
        if (worksOver === 'jam') { if (jam && lickMatchScore(l, jam) <= 0) return false }
        else if (!worksOverForLick(l).includes(worksOver)) return false
      }
      if (q) {
        const lst = lickStyle(l.style)
        const hay = `${l.name} ${l.chord ?? ''} ${lst.label} ${lst.listen} ${l.must?.about ?? ''} ${l.must?.use ?? ''} ${l.must?.tip ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => (worksOver === 'jam' && jam ? lickMatchScore(b, jam) - lickMatchScore(a, jam) : 0) || a.level - b.level)
  }, [style, all, want, worksOver, keyFilter, search, jam, mine])

  const tapChain = (l: LickDef) => {
    const chk = checkChainAdd(l.id)
    if (!chk) return
    if (chk.ok) {
      addToChain(l.id, l.ref, lickMinor(l))
      setPrompt(null)
      setAddedToast({ lickId: l.id, text: '✓ In chain' })
    } else {
      setPrompt({ lickId: l.id, check: chk })
    }
  }

  const cur = open ? findLick(open) ?? null : null
  // the phone's Back button steps back inside the licks (a lick → the list → must-know) before leaving
  useBack(!!open, () => setOpen(null))
  useBack(all && !open, () => setAll(false))
  if (cur) return <LickDetail lick={cur} wantKey={want?.root} onBack={() => (first && open === first.id && initial === first.id ? onExit() : setOpen(null))} />
  const counts = (s: LickStyleId) => LICKS.filter(l => l.style === s && l.must).length
  const totalMust = LICKS.filter(l => l.must).length + mine.length
  return (
    <div className="stack lick-library">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
      </div>
      <h1 style={{ margin: 0 }}>Must-know licks</h1>
      <p className="small muted" style={{ margin: 0 }}>The licks every player of a style should know, each explained step by step. Tap one to learn it, hear it in any key and play along.</p>
      <input
        className="input"
        type="search"
        placeholder="Search licks by name, artist, chord or tip"
        aria-label="Search licks"
        value={search}
        onChange={e => setSearch(e.target.value)}
        data-testid="lick-search"
      />
      <div className="ex-filters" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))' }}>
        <label className="field">
          <span>Style</span>
          <select className="select" value={style} onChange={e => pick(e.target.value as 'all' | LickStyleId)} data-testid="lick-style">
            <option value="all">All styles ({totalMust})</option>
            <option value="mine">My riffs ({mine.length})</option>
            {[...new Set(LICK_STYLES.map(s => s.group))].map(g => (
              <optgroup key={g} label={g}>{LICK_STYLES.filter(s => s.group === g).map(s => <option key={s.id} value={s.id}>{s.label} ({counts(s.id)})</option>)}</optgroup>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Key</span>
          <select className="select" value={keyFilter} onChange={e => setKeyFilter(e.target.value)} data-testid="lick-key-filter">
            <option value="all">Any key</option>
            {jam && <option value="jam">Jam key ({formatKeyBadge(jam.tonic, jam.minor)})</option>}
            {keyOptions.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Works over…</span>
          <select className="select" value={worksOver} onChange={e => setWorksOver(e.target.value as 'all' | 'jam' | WorksOverId)} data-testid="lick-works-over">
            <option value="all">Any chords / groove</option>
            {jam && jam.chordSymbols.length > 0 && (
              <option value="jam">Fits my Jam ({jam.chordSymbols.slice(0, 4).join('–')} in {jam.tonic}{jam.minor ? 'm' : ''})</option>
            )}
            {WORKS_OVER_TAGS.filter(t => t.id !== 'warmup').map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>
      {st ? (
        <p className="small muted" style={{ margin: 0 }}>{st.feel}{st.listen ? <> <i>Listen to: {st.listen}.</i></> : null}</p>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>Showing all {list.length} matching licks across every style.</p>
      )}
      {want && (
        <div className="row small notice" style={{ gap: 8, alignItems: 'center' }} data-testid="lick-want">
          <span>Licks that fit <b>{want.root}{want.minor ? ' minor' : ' major'}</b>, shown in that key.</span>
          <button className="btn sm ghost" onClick={() => setWant(null)}>Show all</button>
        </div>
      )}
      {!list.length && (
        <div className="row small notice" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>No matching licks in this filter.</span>
          {search && <button className="btn sm" onClick={() => setSearch('')}>Clear search</button>}
          {style !== 'all' && <button className="btn sm" onClick={() => pick('all')}>Search all styles</button>}
          {keyFilter !== 'all' && <button className="btn sm ghost" onClick={() => setKeyFilter('all')}>Any key</button>}
          {worksOver !== 'all' && <button className="btn sm ghost" onClick={() => setWorksOver('all')}>Clear groove filter</button>}
        </div>
      )}
      {st && st.id !== 'mine' && LICKS.some(l => l.style === style && !l.must) && <Chips label="Which licks" items={[{ id: 'must', label: 'Must-know' }, { id: 'all', label: `Every ${st.label.replace(/ \(.*\)$/, '').toLowerCase()} lick` }]} value={all ? 'all' : 'must'} onChange={v => setAll(v === 'all')} />}
      <ul className="lick-list">
        {list.map(l => {
          const lst = lickStyle(l.style)
          const lMinor = lickMinor(l)
          const wo = worksOverSummary(worksOverForLick(l))
          const showPrompt = prompt?.lickId === l.id ? prompt.check : null
          const toast = addedToast?.lickId === l.id ? addedToast.text : null
          return (
            <li key={l.id}>
              <div className="lick-card">
                <button className="lick-card-open" onClick={() => setOpen(l.id)}>
                  <span className="lick-top">
                    <b>{l.name}</b>
                    <span className="lick-badges">
                      <span className="key-tag">{formatKeyBadge(l.ref, lMinor)}</span>
                      <span className={`lvl lvl-${l.level}`}>{LEVEL[l.level]}</span>
                    </span>
                  </span>
                  <span className="small muted">{style === 'all' ? `${lst.label} · ` : ''}{kindLabel(l)}{l.chord ? ` · over ${l.chord}` : ''}</span>
                  {l.must && <span className="small">{clip(l.must.about, 130)}</span>}
                </button>
                <div className="lick-card-foot">
                  <span className="lick-works small">Works over: {wo}</span>
                  {chainable(l) && (
                    <button className="btn sm ghost" data-testid={`lick-chain-${l.id}`} onClick={() => tapChain(l)}>
                      {toast ?? '＋ Chain'}
                    </button>
                  )}
                </div>
                {showPrompt && (
                  <div className="chain-prompt small" data-testid="chain-mismatch-prompt">
                    <span>Chain is locked to <b>{showPrompt.chainLabel}</b> ({l.name} is <b>{showPrompt.lickLabel}</b>).</span>
                    <div className="chain-prompt-acts">
                      <button className="btn sm" onClick={() => { startNewChain(l.id); setPrompt(null); setAddedToast({ lickId: l.id, text: `✓ New ${showPrompt.lickLabel} chain` }) }}>
                        Start new {showPrompt.lickLabel} chain
                      </button>
                      {showPrompt.canTranspose && (
                        <button className="btn sm primary" onClick={() => { matchChainTranspose(l.id); setPrompt(null); setAddedToast({ lickId: l.id, text: `✓ Matched to ${showPrompt.chainLabel}` }) }}>
                          Match to {showPrompt.chainLabel}
                        </button>
                      )}
                      <button className="btn sm ghost" onClick={() => setPrompt(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const kindLabel = (l: LickDef) => ({ lick: 'Lick', arpeggio: 'Arpeggio', run: 'Run', riff: 'Riff', ending: 'Ending', 'double-stop': 'Double stops', turnaround: 'Turnaround' } as Record<string, string>)[l.kind]

function LickDetail({ lick, onBack, wantKey }: { lick: LickDef; onBack: () => void; wantKey?: string }) {
  const inst = useInstrument()
  const st = lickStyle(lick.style)
  const minor = lickMinor(lick)
  const [key, setKey] = useState(wantKey && placeFor(lick, wantKey) ? wantKey : lick.ref)
  useScreenInfo('lick', { label: `Lick "${lick.name}" (${st.label}) in ${key}${minor ? ' minor' : ''}`, summary: `In Must-know licks, looking at "${lick.name}", a ${st.label} lick (level ${lick.level}${lick.chord ? `, over ${lick.chord} in the written key` : ''}), shown in ${key}${minor ? ' minor' : ''}.${lick.must ? ` What it is: ${lick.must.about}` : ''}` })
  const [slow, setSlow] = useState(false)
  const [chained, setChained] = useState(0)
  const [chainPrompt, setChainPrompt] = useState<ChainAddCheck | null>(null)
  const keys = KEYS.filter(k => !!placeFor(lick, k))
  const tempo = Math.round((lick.bpm ?? st.bpm) * (slow ? 0.6 : 1))
  const placed = useMemo(() => lickInKey(lick, key, inst.midis, tempo), [lick, key, inst.midis, tempo])
  const doc = placed ? { id: `lick:${lick.id}:${key}:${inst.id}:${tempo}`, title: placed.song.title, source: 'lesson' as const, inst: inst.id, key: { root: key, minor }, song: placed.song, updated: Date.now() } : null
  const b = lick.must
  const worksTags = useMemo(() => worksOverForLick(lick), [lick])
  const relatedEx = useMemo(() => {
    const cat = exerciseCatalog(inst)
    return cat.find(e => e.lick === lick.id)
      ?? cat.find(e => worksOverForExercise(e).some(t => worksTags.includes(t)) && (!!e.minor === minor || !e.key))
      ?? cat[0]
  }, [inst, lick.id, worksTags, minor])

  const onChainClick = () => {
    const chk = checkChainAdd(lick.id, undefined, key)
    if (!chk) return
    if (chk.ok) {
      addToChain(lick.id, key, minor)
      setChainPrompt(null)
      setChained(n => n + 1)
    } else {
      setChainPrompt(chk)
    }
  }

  return (
    <div className="stack lick-detail">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onBack}>← Licks</button>
        <div className="lick-badges">
          <span className="key-tag">{formatKeyBadge(key, minor, placed?.capo ?? 0)}</span>
          <span className={`lvl lvl-${lick.level}`}>{LEVEL[lick.level]}</span>
        </div>
      </div>
      <h1 style={{ margin: 0 }}>{lick.name}</h1>
      <p className="small muted" style={{ margin: 0 }}>{st.label} · {kindLabel(lick)}{placed?.chord ?? lick.chord ? ` · over ${placed?.chord ?? lick.chord}` : ''}</p>
      <p className="lick-works small" style={{ margin: 0 }}>Works over: {worksOverSummary(worksTags, 3)}</p>
      {b && <p style={{ margin: 0 }}>{b.about}</p>}
      <WinArea area="lick">
      <Win id="tab" title="The tab" bodyClass="stack" bodyStyle={{ gap: 8 }}>
        <Chips label="Key" wrap keyStyle items={keys.map(k => ({ id: k, label: keyLabel(k, minor) }))} value={key} onChange={k => { setKey(k); setChainPrompt(null) }} />
        <Chips label="Speed" items={[{ id: 'full', label: `Full speed (${lick.bpm ?? st.bpm} bpm)` }, { id: 'slow', label: 'Slow (60%)' }]} value={slow ? 'slow' : 'full'} onChange={v => setSlow(v === 'slow')} />
        {placed && placed.capo > 0 && <p className="notice small" style={{ margin: 0 }}>Capo on the {placed.capo}{['st', 'nd', 'rd'][placed.capo - 1] ?? 'th'} fret. Fret numbers count from the capo.</p>}
        {doc && <Preview doc={doc} minor={minor} />}
        {doc && <button className="btn primary" onClick={() => openInPlay(doc)}>Play along (it listens to you)</button>}
        {(lick.meter ?? 4) === 4 && (
          <button className="btn sm" data-testid="lick-detail-chain" onClick={onChainClick}>
            {chained ? `✓ Added to your lick chain${chained > 1 ? ` (×${chained})` : ''}` : '＋ Add to my lick chain'}
          </button>
        )}
        {chainPrompt && (
          <div className="chain-prompt small" data-testid="chain-detail-prompt">
            <span>Your active chain is locked to <b>{chainPrompt.chainLabel}</b> ({lick.name} is <b>{chainPrompt.lickLabel}</b>).</span>
            <div className="chain-prompt-acts">
              <button className="btn sm" onClick={() => { startNewChain(lick.id, key, minor); setChainPrompt(null); setChained(1) }}>
                Start new {chainPrompt.lickLabel} chain
              </button>
              {chainPrompt.canTranspose && (
                <button className="btn sm primary" onClick={() => { matchChainTranspose(lick.id); setChainPrompt(null); setChained(n => n + 1) }}>
                  Match to {chainPrompt.chainLabel}
                </button>
              )}
              <button className="btn sm ghost" onClick={() => setChainPrompt(null)}>Cancel</button>
            </div>
          </div>
        )}
        {chained > 0 && <span className="small muted">Find it in Learn → Explore → Lick chainer, or Learn → Exercises → Make your own.</span>}
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {relatedEx && (
            <button className="btn sm" data-testid="lick-to-exercise" onClick={() => {
              if (relatedEx.key) {
                try {
                  const cur = JSON.parse(localStorage.getItem('kg:exKeys') ?? '{}') as Record<string, string>
                  localStorage.setItem('kg:exKeys', JSON.stringify({ ...cur, [relatedEx.code]: key }))
                } catch { /* private */ }
              }
              openExercise(relatedEx.code)
            }}>Practice {relatedEx.code}: {relatedEx.name} →</button>
          )}
          <button className="btn sm ghost" data-testid="lick-to-exercises" onClick={() => openExercisesFiltered({ worksOver: worksTags[0] ?? 'all' })}>
            Matching exercises →
          </button>
          <button className="btn sm ghost" data-testid="lick-to-songs" onClick={() => openSongsInKey(keyOptionId(key, minor))}>
            Songs in {formatKeyBadge(key, minor)} →
          </button>
        </div>
      </Win>
      {b && (
        <>
          <Win id="how-to-play-it" title="How to play it" bodyClass="stack" bodyStyle={{ gap: 6 }}>
            <ol className="lick-steps">{b.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </Win>
          <Win id="the-secret" title="The secret" bodyClass="stack" bodyStyle={{ gap: 6 }}>
            <p style={{ margin: 0 }}>{b.tip}</p>
          </Win>
          <Win id="where-to-use-it" title="Where to use it" bodyClass="stack" bodyStyle={{ gap: 6 }}>
            <p style={{ margin: 0 }}>{b.use}</p>
            <p className="small muted" style={{ margin: 0 }}>Goal: {b.goal} bpm, clean. Start slow (60%), then In time with the speed trainer.</p>
          </Win>
        </>
      )}
      </WinArea>
    </div>
  )
}
