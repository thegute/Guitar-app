// The songbook in the Songs panel: folk, bluegrass and reggae songs by level. Each song has parts (words & chords,
// melody, rhythm parts); tapping a part opens it in Play.
import { useEffect, useRef } from 'react'
import { useInstrument } from '../instrument'
import { GENRES, LEVELS, SONGBOOK, songbookId, type Genre, type Level } from '../tabs/songbook'
import type { SongDoc } from '../tabs/library'
import { loadSongbookDoc } from '../tabs/songbookDocs'
import { songStats } from '../play/songStats'
import { profile } from '../learn/profile'
import { Chips, usePersist } from './Controls'
import { Fold } from './Fold'

export function Songbook({ currentId, onOpen, focus }: { currentId: string; onOpen: (d: SongDoc) => void; focus?: boolean }) {
  const inst = useInstrument()
  const me = profile()
  const [genre, setGenre] = usePersist<Genre | 'all'>('sbGenre', me?.genres.length === 1 ? me.genres[0] : 'all')
  const [level, setLevel] = usePersist<Level | 0>('sbLevel', me?.level ?? 0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focus) setTimeout(() => document.getElementById('fold-songsBook')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [focus])
  const list = SONGBOOK.filter(s => (genre === 'all' || s.genre === genre) && (!level || s.parts.some(p => p.level === level)))
  const four = inst.midis.length < 6

  async function open(songId: string, partId: string) {
    const doc = await loadSongbookDoc(songId, partId, inst)
    if (doc) onOpen(doc)
  }

  return (
    <Fold id="songsBook" title="Songbook" summary={`${SONGBOOK.length} folk, bluegrass & reggae songs`} defaultOpen forceOpen={focus}
      hint={<>Songs to learn, from beginner to advanced. Each song has parts: <b>Words & chords</b> to strum and sing, the <b>Melody</b> as a tab, and rhythm parts like boom-chick, crosspicking or reggae chops. Folk and bluegrass songs are traditional; the reggae riddims are written for KGuitar.</>}>
      <div ref={ref} className="stack" style={{ gap: 8 }}>
        <Chips label="Style" items={[{ id: 'all' as const, label: 'All' }, ...GENRES]} value={genre} onChange={setGenre} />
        <Chips label="Level" wrap items={[{ id: 0 as const, label: 'Any level' }, ...LEVELS.map(l => ({ id: l.id, label: `${l.id} ${l.label}` }))]} value={level} onChange={setLevel} />
        {level > 0 && <p className="small muted" style={{ margin: 0 }}>{LEVELS.find(l => l.id === level)?.what}</p>}
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
        {!list.length && <p className="small muted">No songs at this level in this style yet. Try another level.</p>}
      </div>
    </Fold>
  )
}
