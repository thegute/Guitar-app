// Lick generator panel: pick a style, key, length and level, roll a lick, hear it, open it in Play.
import { useState } from 'react'
import { useInstrument } from '../instrument'
import { LICK_GENRES, lickGenre, makeLick, type LickGenre, type LickLevel } from '../tabs/licks'
import type { SongDoc } from '../tabs/library'
import { Chips, KeyPicker, usePersist } from './Controls'
import { Preview } from './ProgressionTabs'

export function LickMaker({ onOpen, fixedKey }: { onOpen: (d: SongDoc) => void; fixedKey?: string }) {
  const inst = useInstrument()
  const [genre, setGenre] = usePersist<LickGenre>('lickGenre', 'rock')
  const [keyPref, setKey] = usePersist('lickKey', 'A')
  const [bars, setBars] = usePersist<1 | 2 | 4>('lickBars', 2)
  const [level, setLevel] = usePersist<LickLevel>('lickLevel', 2)
  const [doc, setDoc] = useState<SongDoc | null>(null)
  const key = fixedKey ?? keyPref
  const g = lickGenre(genre)
  const roll = (over?: Partial<{ genre: LickGenre; bars: 1 | 2 | 4; level: LickLevel; key: string }>) => {
    const seed = Math.floor(Math.random() * 1e9)
    const o = { genre: over?.genre ?? genre, root: over?.key ?? key, bars: over?.bars ?? bars, level: over?.level ?? level, seed }
    const song = makeLick(o, inst.midis)
    setDoc({ id: `jam:lick:${inst.id}:${o.genre}:${o.root}:${seed.toString(36)}`, title: song.title, source: 'jam', inst: inst.id, key: { root: o.root, minor: lickGenre(o.genre).minor }, song, updated: Date.now() })
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <Chips label="Style" wrap items={LICK_GENRES.map(x => ({ id: x.id, label: x.label }))} value={genre} onChange={v => { setGenre(v); if (doc) roll({ genre: v }) }} />
      <p className="small muted" style={{ margin: 0 }}>{g.feel}</p>
      {!fixedKey && <KeyPicker value={keyPref} onChange={v => { setKey(v); if (doc) roll({ key: v }) }} />}
      <div className="row" style={{ gap: 8 }}>
        <Chips label="Length" items={[{ id: 1, label: '1 bar' }, { id: 2, label: '2 bars' }, { id: 4, label: '4 bars' }]} value={bars} onChange={v => { setBars(v); if (doc) roll({ bars: v }) }} />
        <Chips label="Level" items={[{ id: 1, label: 'Easy' }, { id: 2, label: 'Medium' }, { id: 3, label: 'Hard' }]} value={level} onChange={v => { setLevel(v); if (doc) roll({ level: v }) }} />
      </div>
      <div className="row">
        <button className="btn" onClick={() => roll()}>🎲 {doc ? 'Another lick' : 'Make a lick'}</button>
        {doc && <button className="btn primary" onClick={() => onOpen(doc)}>Open in Play</button>}
      </div>
      {doc && <Preview doc={doc} minor={g.minor} />}
    </div>
  )
}
