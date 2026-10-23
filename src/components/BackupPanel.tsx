// Back up / restore, for Settings (and a gentle reminder on Learn).
import { useRef, useState } from 'react'
import { backupSummary, lastBackup, readBackup, restoreBackup, saveBackup, type Backup } from '../backup'

export function ago(t: number | null) {
  if (!t) return 'never'
  const d = Math.floor((Date.now() - t) / 864e5)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

export function BackupPanel() {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Backup | null>(null)
  const [last, setLast] = useState(lastBackup())
  const file = useRef<HTMLInputElement>(null)

  async function backup() {
    setBusy(true); setMsg('')
    try {
      const r = await saveBackup()
      setLast(lastBackup())
      setMsg(`Backup made (${r.songs} songs plus all your progress). Pick Google Drive in the share menu to keep it safe.`)
    } catch {
      setMsg("Couldn't make the backup. Try again.")
    } finally { setBusy(false) }
  }
  async function pick(f: File | undefined) {
    if (!f) return
    const b = readBackup(await f.text())
    if (!b) { setMsg("That file isn't a KGuitar backup."); return }
    setPending(b)
  }

  const sum = pending ? backupSummary(pending) : null
  return (
    <section className="panel stack" style={{ gap: 10 }}>
      <h2 style={{ margin: 0 }}>Backup</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Your songs, streak, practice history and settings live on this phone only. A backup file keeps them safe (save it to Google Drive)
        and moves them to a new phone or tablet. Last backup: <b>{ago(last)}</b>.
      </p>
      <div className="row">
        <button className="btn primary" onClick={() => void backup()} disabled={busy}>Back up now</button>
        <button className="btn" onClick={() => file.current?.click()} disabled={busy}>Restore from a backup</button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      {pending && sum && (
        <div className="sheet-backdrop" onClick={() => setPending(null)}>
          <div className="sheet confirm" role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0 }}>Restore this backup?</h2>
            <p className="small" style={{ margin: 0 }}>
              Backup from {sum.date.toLocaleDateString()}: {sum.songs} songs and {sum.days} practice days. It replaces everything on this
              {' '}device (songs, progress and settings) with what's in the backup.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn primary" onClick={async () => { await restoreBackup(pending); location.reload() }}>Restore</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
