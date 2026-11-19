// Settings → Sound → My sound packs (Stage 3): bring in the packs rendered from your own plugins (a folder with
// .kgpack files or pack.json subfolders, or individual .kgpack files), choose which KGuitar sound each one plays,
// try it, or remove it. Packs stay on this phone only (IndexedDB), never in a backup or the app's code.
import { useEffect, useRef, useState } from 'react'
import { importPack, privatePacks, deletePack, loadPrivatePack, ensure, playPack, setMemoryBudget } from '../engine/packs'
import type { Pack } from '../engine/packLogic'
import { SOUNDS, packFor, setPackFor, refreshPackSounds, type SoundId } from '../audio/pluck'
import { audio } from '../audio/engine'
import { parseChordSets, savePrivateSets } from '../theory/chordSets'
import { LessonFolders, lessonsAvailable, mediaUrl, type LFile } from '../lessons/folders'
import { usePersist } from './Controls'

/** If a picked folder contains BOTH `<id>.kgpack` (Studio) and `<id>-pocket.kgpack` (Pocket), keep only the chosen quality tier. */
export function filterTierDuplicates<T extends { name: string }>(items: T[], tier: 'pocket' | 'studio'): T[] {
  const byBase = new Map<string, { studio?: T; pocket?: T }>()
  for (const it of items) {
    const lower = it.name.toLowerCase()
    const m = lower.match(/^(.+?)(-pocket)?\.(kgpack|zip)$/)
    if (!m) continue
    const base = m[1]
    const entry = byBase.get(base) ?? {}
    if (m[2]) entry.pocket = it
    else entry.studio = it
    byBase.set(base, entry)
  }
  const out: T[] = []
  for (const entry of byBase.values()) {
    if (entry.pocket && entry.studio) {
      out.push(tier === 'pocket' ? entry.pocket : entry.studio)
    } else if (entry.pocket) {
      out.push(entry.pocket)
    } else if (entry.studio) {
      out.push(entry.studio)
    }
  }
  return out
}

/** Group unpacked folder files by each directory that contains a `pack.json`. */
export function groupUnpackedFolders<T extends { name: string; path: string }>(files: T[]): T[][] {
  const metas = files.filter(f => f.name === 'pack.json')
  if (!metas.length) return []
  return metas.map(meta => {
    const dir = meta.path.slice(0, meta.path.length - 'pack.json'.length)
    return files.filter(f => f.path.startsWith(dir))
  })
}

function fileWithPath(blob: Blob, name: string, relPath: string): File {
  const f = new File([blob], name, { type: blob.type || 'application/octet-stream' })
  try {
    Object.defineProperty(f, 'webkitRelativePath', { value: relPath, configurable: true })
  } catch { /* fallback */ }
  return f
}

export function SoundPacks() {
  const [packs, setPacks] = useState<Pack[]>([])
  const [tier, setTier] = usePersist<'pocket' | 'studio'>('packQualityTier', 'pocket')
  const [busy, setBusy] = useState('')
  const [, bump] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const refresh = (imported?: string) => { void privatePacks().then(setPacks); void refreshPackSounds(imported) }
  useEffect(() => refresh(), [])
  useEffect(() => { setMemoryBudget(tier === 'studio' ? 288 : 144) }, [tier])
  useEffect(() => { input.current?.setAttribute('webkitdirectory', ''); input.current?.setAttribute('directory', '') }, [])

  const onFiles = async (fl: FileList | null, fromFolder = false) => {
    if (!fl?.length) return
    const all = [...fl]
    // a chord sets file (Playbox's chords, for Jam → Inspire me) can come in the same way
    const cs = all.find(f => /^chordsets.*\.json$/i.test(f.name))
    if (cs) {
      try {
        const sets = parseChordSets(JSON.parse(await cs.text()))
        savePrivateSets(sets)
        setBusy(`${sets.length} chord sets are ready in Jam → Inspire me.`)
      } catch (e) {
        setBusy(String((e as Error).message ?? e))
      }
      if (!all.some(f => f.name === 'pack.json' || /\.(kgpack|zip)$/i.test(f.name))) return
    }

    // 1) Collect .kgpack / .zip bundles (filter Studio/Pocket duplicates when importing a whole folder)
    const rawKgs = all.filter(f => /\.(kgpack|zip)$/i.test(f.name))
    const kgs = fromFolder ? filterTierDuplicates(rawKgs, tier) : rawKgs

    // 2) Or collect unpacked pack.json folders (supports picking a parent folder of multiple packs!)
    let groups: File[][] = []
    if (kgs.length) {
      groups = kgs.map(f => [f])
    } else {
      const withPaths = all.map(f => ({
        file: f,
        name: f.name,
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      }))
      const unpacked = groupUnpackedFolders(withPaths)
      if (unpacked.length) {
        groups = unpacked.map(g => g.map(x => x.file))
      }
    }

    if (!groups.length) {
      setBusy(`No .kgpack files or pack.json folders found in "${all[0].name}".`)
      return
    }

    const done: string[] = []
    const failed: string[] = []
    for (const [i, g] of groups.entries()) {
      try {
        const n = groups.length > 1 ? ` (${i + 1} of ${groups.length})` : ''
        setBusy(`Bringing the pack in${n}…`)
        const p = await importPack(g, (d, t) => setBusy(`Bringing the pack in${n}… ${d} of ${t} recordings`))
        done.push(p.name)
        refresh(p.id)
      } catch (e) {
        failed.push(`${g[0]?.name ?? 'pack'}: ${String((e as Error).message ?? e)}`)
      }
    }

    if (done.length === 0 && failed.length) {
      setBusy(failed[0])
    } else if (failed.length) {
      setBusy(`${done.length} pack${done.length === 1 ? '' : 's'} imported (${failed.length} skipped: ${failed[0]}).`)
    } else {
      setBusy(
        done.length === 1
          ? `"${done[0]}" is ready: pick it by name in any sound picker.`
          : `${done.length} packs are ready: pick them by name in any sound picker.`,
      )
    }
  }

  /** Native Android folder picker (uses SAF LessonFolders plugin because Android WebView ignores webkitdirectory). */
  const pickFolderNative = async () => {
    try {
      setBusy('Opening folder picker…')
      const picked = await LessonFolders.pick()
      if (picked.cancelled || !picked.tree) {
        setBusy('')
        return
      }
      setBusy(`Scanning "${picked.name ?? 'folder'}"…`)
      const { files } = await LessonFolders.list({ tree: picked.tree })

      // Optional chordsets*.json in the same folder
      const csFile = files.find(f => /^chordsets.*\.json$/i.test(f.name))
      if (csFile) {
        try {
          const res = await fetch(mediaUrl(csFile.uri))
          if (res.ok) {
            const sets = parseChordSets(await res.json())
            savePrivateSets(sets)
          }
        } catch { /* ignore */ }
      }

      // Prefer .kgpack / .zip files if present in the folder (filtered to chosen Pocket/Studio tier when both exist)
      const rawKgs = files.filter(f => /\.(kgpack|zip)$/i.test(f.name))
      const kgs = filterTierDuplicates(rawKgs, tier)

      const done: string[] = []
      const failed: string[] = []

      if (kgs.length) {
        for (const [i, lf] of kgs.entries()) {
          try {
            const n = kgs.length > 1 ? ` (${i + 1} of ${kgs.length})` : ''
            setBusy(`Reading ${lf.name}${n}…`)
            const resp = await fetch(mediaUrl(lf.uri))
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
            const blob = await resp.blob()
            const f = new File([blob], lf.name, { type: blob.type || 'application/octet-stream' })
            const p = await importPack([f], (d, t) => setBusy(`Importing ${lf.name}${n}… ${d} of ${t}`))
            done.push(p.name)
            refresh(p.id)
          } catch (e) {
            failed.push(`${lf.name}: ${String((e as Error).message ?? e)}`)
          }
        }
      } else {
        // Fallback: unpacked subfolders containing pack.json
        const unpacked: LFile[][] = groupUnpackedFolders(files)
        if (!unpacked.length) {
          setBusy(`No .kgpack files or pack.json folders found in "${picked.name ?? 'that folder'}".`)
          return
        }
        for (const [i, grp] of unpacked.entries()) {
          try {
            const n = unpacked.length > 1 ? ` (${i + 1} of ${unpacked.length})` : ''
            setBusy(`Reading pack folder${n}…`)
            const loaded: File[] = []
            for (const lf of grp) {
              const resp = await fetch(mediaUrl(lf.uri))
              if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
              loaded.push(fileWithPath(await resp.blob(), lf.name, lf.path))
            }
            const p = await importPack(loaded, (d, t) => setBusy(`Importing pack${n}… ${d} of ${t}`))
            done.push(p.name)
            refresh(p.id)
          } catch (e) {
            failed.push(`Folder ${i + 1}: ${String((e as Error).message ?? e)}`)
          }
        }
      }

      if (done.length === 0 && failed.length) {
        setBusy(failed[0])
      } else if (failed.length) {
        setBusy(`${done.length} pack${done.length === 1 ? '' : 's'} imported (${failed.length} skipped: ${failed[0]}).`)
      } else {
        setBusy(
          done.length === 1
            ? `"${done[0]}" is ready: pick it by name in any sound picker.`
            : `${done.length} packs imported from "${picked.name ?? 'folder'}"! Pick them by name in any sound picker.`,
        )
      }
    } catch (e) {
      setBusy(String((e as Error).message ?? e))
    }
  }

  const handleFolderClick = () => {
    if (lessonsAvailable()) {
      void pickFolderNative()
    } else {
      input.current?.click()
    }
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
        Sound packs rendered from your own instruments (Orange Tree, Ample, Kontakt, Archetypes …) make every guitar &amp; bass in KGuitar sound real.
        They stay on this device only. Pick a whole folder of <b>.kgpack</b> files at once, or bring in individual files.
      </p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={handleFolderClick} data-testid="pack-folder">Add a folder of packs…</button>
        <button className="btn" onClick={() => file.current?.click()} data-testid="pack-file">Bring in .kgpack files…</button>
        <label className="row small" style={{ gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
          <span className="muted">Quality</span>
          <select className="select sm" value={tier} onChange={e => setTier(e.target.value as 'pocket' | 'studio')} data-testid="pack-quality-tier" aria-label="Pack memory and quality tier">
            <option value="pocket">Pocket (phone, 144 MB)</option>
            <option value="studio">Studio (tablet / full layers, 288 MB)</option>
          </select>
        </label>
        {/* no "accept" filter: Android doesn't know the .kgpack type and greys the files out in the picker (owner 2026-11-13) */}
        <input ref={file} type="file" multiple hidden onChange={e => { void onFiles(e.target.files, false); e.target.value = '' }} />
        <input ref={input} type="file" multiple hidden onChange={e => { void onFiles(e.target.files, true); e.target.value = '' }} />
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
