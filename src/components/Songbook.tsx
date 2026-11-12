// The songbook (Songs → Library → Songbook): folk, bluegrass and reggae songs by level. Each song has parts (words & chords,
// melody, rhythm parts); tapping a part opens it in Play.
import { useRef } from 'react'
import { useInstrument } from '../instrument'
import { GENRES, LEVELS, SONGBOOK, songbookId, type Genre, type Level } from '../tabs/songbook'
import type { SongDoc } from '../tabs/library'
import { loadSongbookDoc } from '../tabs/songbookDocs'
import { songStats } from '../play/songStats'
import { profile } from '../learn/profile'
import { Chips, usePersist } from './Controls'
import { Win, WinArea } from './Win'

/** `query`: the library's search; `embedded`: inside Songs → Library (its windows join the library's area) */
export function Songbook({ currentId, onOpen, query = '', embedded }: { currentId: string; onOpen: (d: SongDoc) => void; query?: string; embedded?: boolean }) {
  const inst = useInstrument()
  const me = profile()
  const [genre, setGenre] = usePersist<Genre | 'all'>('sbGenre', me?.genres.length === 1 ? me.genres[0] : 'all')
  const [level, setLevel] = usePersist<Level | 0>('sbLevel', me?.level ?? 0)
  const ref = useRef<HTMLDivElement>(null)
  const qq = query.trim().toLowerCase()
  const list = SONGBOOK.filter(s => (genre === 'all' || s.genre === genre) && (!level || s.parts.some(p => p.level === level)) && (!qq || `${s.title} ${s.credit}`.toLowerCase().includes(qq)))
  const four = inst.midis.length < 6

  async function open(songId: string, partId: string) {
    const doc = await loadSongbookDoc(songId, partId, inst)
    if (doc) onOpen(doc)
  }

  return (
      <div ref={ref} className={`songbook-page${embedded ? ' embedded' : ''}`} id="songbook">
      <Area embedded={embedded}>
        <Win id="filters" title={embedded ? 'Songbook: pick a style and level' : 'Pick a style and level'} className="panel songbook-filters" bodyClass="stack" bodyStyle={{ gap: 8 }} resizable={false}>
          <p className="small muted" style={{ margin: 0 }}>{SONGBOOK.length} songs, beginner to advanced. Each has parts: <b>Words & chords</b> to strum and sing, the <b>Melody</b> as a tab, and rhythm parts. Tap a part to play it.</p>
          <Chips label="Style" items={[{ id: 'all' as const, label: 'All' }, ...GENRES]} value={genre} onChange={setGenre} />
          <Chips label="Level" wrap items={[{ id: 0 as const, label: 'Any level' }, ...LEVELS.map(l => ({ id: l.id, label: `${l.id} ${l.label}` }))]} value={level} onChange={setLevel} />
          {level > 0 && <p className="small muted" style={{ margin: 0 }}>{LEVELS.find(l => l.id === level)?.what}</p>}
        </Win>
        <Win id="songs" title={`${embedded ? 'Songbook songs' : 'Songs'} (${list.length})`} className="panel songbook-list">
        <ul className="song-list songbook">
          {list.map(s => {
            const parts = s.parts.filter(p => !(four && p.kind === 'octaves'))
            const focusPart = parts.find(p => p.level === level) ?? parts[0]
            return (
              <li key={s.id} className={parts.some(p => songbookId(s.id, p.id, inst) === currentId) ? 'on' : ''}>
                <div className="sb-song">
                  <div className="sb-title">
                    <b>{s.title}</b>
                    <span className="small muted">{s.credit}</span>
                  </div>
                  <span className="small sb-learn">{focusPart.learn}</span>
                  <div className="sb-parts" role="group" aria-label={`${s.title} parts`}>
                    {parts.map(p => {
                      const st = songStats(songbookId(s.id, p.id, inst))
                      const dim = level > 0 && p.level !== level
                      return (
                        <button key={p.id} className={`chip sb-part${dim ? ' dim' : ''}`} onClick={() => void open(s.id, p.id)}
                          aria-label={`${p.label}, level ${p.level}${st?.best ? `, best ${st.best}%` : ''}`}>
                          <span className="sb-lv" aria-hidden="true">{'●'.repeat(p.level)}{'○'.repeat(4 - p.level)}</span>
                          {p.label}
                          {st?.learnedAt ? <span className="sb-done" aria-hidden="true"> ✓</span> : st?.best ? <span className="sb-best"> {st.best}%</span> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        {!list.length && <p className="small muted">{qq ? `No songbook song matches "${query.trim()}" here.` : 'No songs at this level in this style yet. Try another level.'}</p>}
        </Win>
      </Area>
      </div>
  )
}

/** On its own page the songbook has its own window area; inside the library its windows join the library's. */
function Area({ embedded, children }: { embedded?: boolean; children: React.ReactNode }) {
  return embedded ? <>{children}</> : <WinArea area="songbook">{children}</WinArea>
}
