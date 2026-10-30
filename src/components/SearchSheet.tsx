// Search: type what you want in your own words ("slow it down", "G7", "drop D", "blues jam in A", "it doesn't hear
// me") and tap a result to go straight there, already set up.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useInstrument } from '../instrument'
import { listSongs, type SongDoc } from '../tabs/library'
import { SearchIndex, searchAll } from '../search/engine'
import { FEATURES } from '../search/catalog'
import { libraryEntries } from '../search/sources'
import { launch } from '../search/launch'
import { KIND_LABEL, type Result } from '../search/types'
import { TAB_SITES } from '../tabs/tabSites'
import { IconSearch } from './Icons'

const TRY = ['slow it down', 'loop a hard part', 'G7 chord', 'A minor pentatonic', 'drop D', 'metronome 90', 'blues jam in A', 'record myself', "it doesn't hear me", 'bigger tab']
const RECENT = 'kg:searchRecent'
const recent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT) ?? '[]') } catch { return [] } }
const remember = (q: string) => {
  try { localStorage.setItem(RECENT, JSON.stringify([q, ...recent().filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, 6))) } catch { /* storage unavailable */ }
}

export function SearchSheet({ onClose, initial = '' }: { onClose: () => void; initial?: string }) {
  const inst = useInstrument()
  const [q, setQ] = useState(initial)
  const [songs, setSongs] = useState<SongDoc[]>([])
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    let alive = true
    void listSongs(inst.id).then(s => { if (alive) setSongs(s) }).catch(() => {})
    return () => { alive = false }
  }, [inst.id])
  const index = useMemo(() => new SearchIndex([...FEATURES, ...libraryEntries(inst, songs)]), [inst, songs])
  const results = useMemo(() => (q.trim() ? searchAll(index, q, inst, 12) : []), [index, q, inst])
  useEffect(() => setActive(0), [q])
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 40)
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', k)
    return () => { clearTimeout(t); removeEventListener('keydown', k) }
  }, [onClose])
  useEffect(() => { list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active])

  const open = (r: Result) => {
    remember(q.trim())
    onClose()
    launch(r.target)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); open(results[active]) }
  }
  const strong = results.length > 0 && results[0].score >= 60
  const wantsTab = /\b(tab|tabs|chords? (for|to)|song by|by the)\b/i.test(q)
  const past = recent()

  return (
    <div className="sheet-backdrop search-backdrop" onClick={onClose}>
      <div className="sheet search-sheet" role="dialog" aria-modal="true" aria-label="Search KGuitar" onClick={e => e.stopPropagation()}>
        <div className="search-bar">
          <span className="search-icon" aria-hidden><IconSearch /></span>
          <input ref={input} className="input search-input" type="search" enterKeyHint="go" value={q} autoComplete="off" spellCheck={false}
            placeholder="What do you want to do?" aria-label="Search KGuitar" aria-controls="search-results" aria-activedescendant={results[active] ? `sr-${active}` : undefined}
            onChange={e => setQ(e.target.value)} onKeyDown={onKey} />
          {q && <button className="btn sm ghost search-clear" onClick={() => { setQ(''); input.current?.focus() }} aria-label="Clear">✕</button>}
          <button className="btn sm" onClick={onClose}>Close</button>
        </div>

        {!q.trim() && (
          <div className="search-start stack">
            <p className="small muted" style={{ margin: 0 }}>Ask in your own words: a feature, a problem, a chord, a scale, a tuning, a tempo, a song or a lesson.</p>
            {past.length > 0 && (
              <div className="stack" style={{ gap: 6 }}>
                <h3 className="search-h">Recent</h3>
                <div className="search-chips">{past.map(p => <button key={p} className="chip" onClick={() => setQ(p)}>{p}</button>)}</div>
              </div>
            )}
            <div className="stack" style={{ gap: 6 }}>
              <h3 className="search-h">Try</h3>
              <div className="search-chips">{TRY.map(p => <button key={p} className="chip" onClick={() => setQ(p)}>{p}</button>)}</div>
            </div>
          </div>
        )}

        {q.trim() && results.length > 0 && (
          <ul ref={list} id="search-results" className="search-results" role="listbox" aria-label="Results">
            {results.map((r, i) => (
              <li key={r.id} role="presentation">
                <button id={`sr-${i}`} data-i={i} role="option" aria-selected={i === active} className={`search-hit${i === active ? ' on' : ''}`}
                  onClick={() => open(r)} onMouseEnter={() => setActive(i)}>
                  <span className="hit-top"><b className="hit-title">{r.title}</b><span className={`hit-kind k-${r.kind}`}>{KIND_LABEL[r.kind]}</span></span>
                  <span className="hit-where">{r.where}</span>
                  <span className="hit-text">{r.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {q.trim() && !results.length && (
          <div className="search-none stack">
            <p style={{ margin: 0 }}>Nothing in KGuitar matches “{q.trim()}”.</p>
            <p className="small muted" style={{ margin: 0 }}>Try other words (“slower”, “tuner”, “chords”), or read the guide.</p>
            <button className="btn sm" onClick={() => { onClose(); launch({ go: { tool: 'guide' } }) }}>Open How to use KGuitar</button>
          </div>
        )}

        {q.trim().length > 1 && (!strong || wantsTab) && (
          <div className="search-web">
            <span className="small muted">Looking for a song's tab? Search for “{q.trim()}” on</span>
            <div className="search-chips">
              {TAB_SITES.map(s => <a key={s.id} className="chip" href={s.url(q.trim())} target="_blank" rel="noreferrer">{s.label}</a>)}
            </div>
            <span className="small muted">then share it to KGuitar, or paste it in Songs → Add a song.</span>
          </div>
        )}
      </div>
    </div>
  )
}
