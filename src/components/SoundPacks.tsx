// Settings → Sound → My sound packs (Stage 3): bring in the packs rendered from your own plugins (a folder with
// pack.json and its recordings), choose which KGuitar sound each one plays, try it, or remove it. Packs stay on this
// phone only (IndexedDB), never in a backup or the app's code.
import { useEffect, useRef, useState } from 'react'
import { importPack, privatePacks, deletePack, loadPrivatePack, ensure, playPack } from '../engine/packs'
import type { Pack } from '../engine/packLogic'
import { SOUNDS, packFor, setPackFor, refreshPackSounds, type SoundId } from '../audio/pluck'
import { audio } from '../audio/engine'
import { parseChordSets, savePrivateSets } from '../theory/chordSets'

export function SoundPacks() {
  const [packs, setPacks] = useState<Pack[]>([])
  const [busy, setBusy] = useState('')
  const [, bump] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const refresh = (imported?: string) => { void privatePacks().then(setPacks); void refreshPackSounds(imported) }
  useEffect(() => refresh(), [])
  useEffect(() => { input.current?.setAttribute('webkitdirectory', ''); input.current?.setAttribute('directory', '') }, [])

  const onFiles = async (fl: FileList | null) => {
    if (!fl?.length) return
    // a chord sets file (Playbox's chords, for Jam → Inspire me) can come in the same way
    const cs = [...fl].find(f => f.name === 'chordsets.json')
    if (cs) {
      try { const sets = parseChordSets(JSON.parse(await cs.text())); savePrivateSets(sets); setBusy(`${sets.length} chord sets are ready in Jam → Inspire me.`) } catch (e) { setBusy(String((e as Error).message ?? e)) }
      if (![...fl].some(f => f.name === 'pack.json')) return
    }
    // several .kgpack files picked at once come in one after another
    const kgs = [...fl].filter(f => /\.(kgpack|zip)$/i.test(f.name))
    const groups = kgs.length ? kgs.map(f => [f]) : [[...fl]]
    const done: string[] = []
    for (const [i, g] of groups.entries()) {
      try {
        const n = groups.length > 1 ? ` (${i + 1} of ${groups.length})` : ''
        setBusy(`Bringing the pack in${n}…`)
        const p = await importPack(g, (d, t) => setBusy(`Bringing the pack in${n}… ${d} of ${t} recordings`))
        done.push(p.name)
        refresh(p.id)
      } catch (e) { setBusy(`${g[0]?.name ?? 'That file'}: ${String((e as Error).message ?? e)}`); return }
    }
    setBusy(done.length === 1 ? `"${done[0]}" is ready: pick it by name in any sound picker.` : `${done.length} packs are ready: pick them by name in any sound picker.`)
  }
  const tryIt = async (p: Pack) => {
    await loadPrivatePack(p.id)
    const notes = p.tuning ? p.tuning.map((m, s) => ({ midi: m, string: s })) : [48, 52, 55, 60].map(m => ({ midi: m }))
    setBusy(`Loading "${p.name}"…`)
    await ensure(p.id, 'sustain', notes)
    setBusy('')
    const t = audio().currentTime + 0.1
    notes.forEach((n, i) => playPack(p.id, { ...n, vel: 90, when: t + i * 0.35, dur: 2 }))
  }
  const usedBy = (id: string) => SOUNDS.filter(s => packFor(s.id) === id).map(s => s.id)
  const assign = (packId: string, sound: SoundId | '') => {
    for (const s of SOUNDS) if (packFor(s.id) === packId) setPackFor(s.id, null)
    if (sound) setPackFor(sound, packId)
    bump(n => n + 1)
  }
  const remove = async (p: Pack) => {
    if (!confirm(`Remove "${p.name}" from this phone? You can bring it in again from its folder.`)) return
    for (const s of SOUNDS) if (packFor(s.id) === p.id) setPackFor(s.id, null)
    await deletePack(p.id)
    refresh()
  }

  return (
    <div className="stack" data-testid="sound-packs">
      <p className="small muted" style={{ margin: 0 }}>
        Sound packs rendered from your own instruments (Orange Tree, Ample, Archetypes …) make every guitar in KGuitar sound real.
        They stay on this phone only. Bring in the pack's <b>.kgpack</b> file (one file, made on your Mac), or on a computer its folder (the one with <b>pack.json</b>).
      </p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => file.current?.click()} data-testid="pack-file">Bring in .kgpack files…</button>
        <button className="btn ghost" onClick={() => input.current?.click()}>…or a pack folder</button>
        <input ref={file} type="file" accept=".kgpack,.zip" multiple hidden onChange={e => { void onFiles(e.target.files); e.target.value = '' }} />
        <input ref={input} type="file" multiple hidden onChange={e => { void onFiles(e.target.files); e.target.value = '' }} />
      </div>
      {busy && <p className="small" role="status" style={{ margin: 0 }}>{busy}</p>}
      {packs.length === 0 && <p className="small muted" style={{ margin: 0 }}>No sound packs yet.</p>}
      {packs.map(p => (
        <div key={p.id} className="card stack" style={{ gap: 6 }} data-testid="sound-pack">
          <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b>{p.name}</b>
            <span className="small muted">{Object.keys(p.articulations).join(' · ')}</span>
          </div>
          <label className="row small" style={{ gap: 8, alignItems: 'center' }}>
            Plays as
            <select value={usedBy(p.id)[0] ?? ''} onChange={e => assign(p.id, e.target.value as SoundId | '')}>
              <option value="">Not used yet</option>
              {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn small" onClick={() => void tryIt(p)}>Try it</button>
            <button className="btn small ghost" onClick={() => void remove(p)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  )
}
