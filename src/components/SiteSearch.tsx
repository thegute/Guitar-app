// Find a tab on Songsterr or Ultimate Guitar and bring it straight into KGuitar (Android app). On the web the sites
// open in the browser as before (a web page can't read other sites).
import { useState } from 'react'
import { Ico } from './Icon'
import { useInstrument } from '../instrument'
import { newId, saveSong, type SongDoc } from '../tabs/library'
import { songFromText } from '../tabs/importer'
import { guitarTrack, searchSongsterr, searchUG, songsterrSong, ugText, type SongsterrHit, type UgHit } from '../tabs/siteImport'
import { TAB_SITES } from '../tabs/tabSites'

export function SiteSearch({ query, onOpen, youtube }: { query: string; onOpen: (d: SongDoc) => void; youtube?: string }) {
  const inst = useInstrument()
  const [busy, setBusy] = useState<string | null>(null)
  const [ss, setSs] = useState<SongsterrHit[] | null>(null)
  const [ug, setUg] = useState<UgHit[] | null>(null)
  const [msg, setMsg] = useState('')
  const [track, setTrack] = useState<Record<number, number>>({})
  const search = async () => {
    const q = query.trim()
    if (!q) return
    setBusy('search'); setMsg(''); setSs(null); setUg(null)
    const [a, b] = await Promise.allSettled([searchSongsterr(q), searchUG(q)])
    setSs(a.status === 'fulfilled' ? a.value.slice(0, 8) : [])
    setUg(b.status === 'fulfilled' ? b.value.slice(0, 8) : [])
    if (a.status === 'rejected' && b.status === 'rejected') setMsg("Couldn't reach Songsterr or Ultimate Guitar. Check the internet connection, or open the sites with the buttons above.")
    setBusy(null)
  }
  const openSs = async (h: SongsterrHit) => {
    setBusy(`ss${h.songId}`); setMsg('')
    try {
      const song = await songsterrSong(h, track[h.songId] ?? guitarTrack(h, inst.strings))
      const doc: SongDoc = { id: newId(), title: song.title, artist: h.artist, source: 'gp', inst: inst.id, song, youtube, updated: Date.now() }
      await saveSong(doc)
      onOpen(doc)
    } catch (e) { setMsg(`Couldn't get that tab from Songsterr (${e instanceof Error ? e.message : 'unknown error'}). Their site may have changed: open it on Songsterr instead and download the Guitar Pro file.`) }
    setBusy(null)
  }
  const openUg = async (h: UgHit) => {
    setBusy(h.url); setMsg('')
    try {
      const { text, title } = await ugText(h.url)
      const doc = songFromText(text, title, inst, youtube)
      if (!doc) throw new Error('no tab lines or chords in it')
      await saveSong(doc)
      onOpen(doc)
    } catch (e) { setMsg(`Couldn't read that tab from Ultimate Guitar (${e instanceof Error ? e.message : 'unknown error'}). Open it on the site and copy the text instead.`) }
    setBusy(null)
  }
  return (
    <div className="stack site-search" style={{ gap: 8 }}>
      <button className="btn primary" disabled={!query.trim() || busy === 'search'} onClick={() => void search()} data-testid="site-search">
        <Ico n="eye" /> {busy === 'search' ? 'Searching…' : 'Search Songsterr and Ultimate Guitar here'}
      </button>
      {msg && <p className="notice small" role="status" style={{ margin: 0 }}>{msg}</p>}
      {ss && (
        <div className="stack" style={{ gap: 4 }}>
          <h3 className="small" style={{ margin: 0 }}>Songsterr (every note, with rhythm)</h3>
          {!ss.length && <p className="small muted" style={{ margin: 0 }}>Nothing found.</p>}
          <ul className="site-hits">
            {ss.map(h => {
              const guitars = h.tracks.filter(t => !/drum|percussion|vocal/i.test(`${t.instrument} ${t.name}`))
              return (
                <li key={h.songId}>
                  <span className="hit-name"><b>{h.title}</b> <span className="muted small">{h.artist}</span></span>
                  {guitars.length > 1 && (
                    <select className="select sm" aria-label="Track" value={track[h.songId] ?? guitarTrack(h, inst.strings)} onChange={e => setTrack({ ...track, [h.songId]: Number(e.target.value) })}>
                      {guitars.map(t => <option key={t.index} value={t.index}>{t.name}{t.instrument && t.instrument !== t.name ? ` (${t.instrument})` : ''}</option>)}
                    </select>
                  )}
                  <button className="btn sm" disabled={!!busy} onClick={() => void openSs(h)}>{busy === `ss${h.songId}` ? 'Getting it…' : 'Open'}</button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {ug && (
        <div className="stack" style={{ gap: 4 }}>
          <h3 className="small" style={{ margin: 0 }}>Ultimate Guitar (tabs and chord sheets)</h3>
          {!ug.length && <p className="small muted" style={{ margin: 0 }}>Nothing found.</p>}
          <ul className="site-hits">
            {ug.map(h => (
              <li key={h.url}>
                <span className="hit-name"><b>{h.title}</b> <span className="muted small">{h.artist} · {h.type}{h.votes ? ` · ★ ${h.rating.toFixed(1)} (${h.votes})` : ''}</span></span>
                <button className="btn sm" disabled={!!busy} onClick={() => void openUg(h)}>{busy === h.url ? 'Getting it…' : 'Open'}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="small muted" style={{ margin: 0 }}>Reads the same tab the site shows you, for your own practice. If a site changes how it works, the buttons above still open it in the browser{TAB_SITES.length ? '' : ''}.</p>
    </div>
  )
}
