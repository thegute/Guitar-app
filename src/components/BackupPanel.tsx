// Back up / restore + Phone ↔ Tablet Private GitHub Sync, for Settings (and a gentle reminder on Learn).
import { useEffect, useRef, useState } from 'react'
import { backupSummary, lastBackup, readBackup, restoreBackup, saveBackup, type Backup } from '../backup'
import { applyMergedBackup, loadSyncConfig, saveSyncConfig, syncNow, type SyncConfig } from '../sync/cloudSync'

export function ago(t: number | null) {
  if (!t) return 'never'
  const diff = Date.now() - t
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  const d = Math.floor(diff / 864e5)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

export function BackupPanel() {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Backup | null>(null)
  const [last, setLast] = useState(lastBackup())
  const file = useRef<HTMLInputElement>(null)

  // Phone ↔ Tablet Sync state
  const [cfg, setCfg] = useState<SyncConfig>(loadSyncConfig)
  const [tokenDraft, setTokenDraft] = useState(() => loadSyncConfig().token)
  const [showTok, setShowTok] = useState(false)
  const [showHow, setShowHow] = useState(() => !loadSyncConfig().token)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    const onSynced = () => setCfg(loadSyncConfig())
    window.addEventListener('kg-synced', onSynced)
    return () => window.removeEventListener('kg-synced', onSynced)
  }, [])

  async function doSync() {
    const clean = tokenDraft.trim()
    if (!clean) { setSyncMsg('Paste your private GitHub token first.'); return }
    saveSyncConfig({ token: clean })
    setCfg(loadSyncConfig())
    setSyncBusy(true)
    setSyncMsg('')
    try {
      const r = await syncNow()
      setCfg(loadSyncConfig())
      setSyncMsg(
        r.pulled
          ? `Synced! ${r.songsMerged} songs${r.songsAdded ? ` (+${r.songsAdded} new)` : ''} & all lesson progress merged.`
          : `Synced! Created your private backup (${r.songsMerged} songs + all progress). Paste the same token on your other device to connect it.`,
      )
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Sync failed.'
      saveSyncConfig({ lastError: err })
      setCfg(loadSyncConfig())
      setSyncMsg(err)
    } finally {
      setSyncBusy(false)
    }
  }

  function disconnectSync() {
    saveSyncConfig({ token: '', gistId: '', lastSync: null, lastError: undefined })
    setTokenDraft('')
    setCfg(loadSyncConfig())
    setSyncMsg('Disconnected. Your data stays on this device.')
  }

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
  const connected = !!cfg.token.trim()

  return (
    <div className="stack" style={{ gap: 12 }}>
      <section className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>Phone ↔ Tablet Sync (Private)</strong>
          <span className="pill" style={{ fontSize: 11 }}>
            {connected ? `Last sync: ${ago(cfg.lastSync)}` : 'Not connected'}
          </span>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Smart-merges your <b>Theory Course (Levels 1–8)</b>, <b>Circle mastery</b>, <b>video lesson ticks, pins &amp; notes</b>,
          {' '}<b>streaks</b>, <b>songs &amp; scanned riffs</b>, <b>saved beats</b>, <b>sticky notes</b> and <b>presets</b> via a private
          {' '}GitHub Gist only you can see. Phone &amp; tablet window layouts, local folders and gear calibration stay separate on each device.
        </p>

        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <input
            type={showTok ? 'text' : 'password'}
            className="input"
            style={{ flex: '1 1 190px', minWidth: 0 }}
            value={tokenDraft}
            onChange={e => setTokenDraft(e.target.value)}
            placeholder="Paste GitHub token (ghp_…)"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="GitHub sync token"
          />
          <button type="button" className="btn" onClick={() => setShowTok(v => !v)}>
            {showTok ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="btn primary"
            data-testid="sync-now"
            disabled={syncBusy || !tokenDraft.trim()}
            onClick={() => void doSync()}
          >
            {syncBusy ? 'Syncing…' : 'Sync now'}
          </button>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={cfg.auto}
              onChange={e => { saveSyncConfig({ auto: e.target.checked }); setCfg(loadSyncConfig()) }}
            />
            Auto-sync when opening KGuitar
          </label>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowHow(v => !v)}>
              {showHow ? 'Hide setup' : 'How to get a token'}
            </button>
            {connected && (
              <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={disconnectSync}>
                Disconnect
              </button>
            )}
          </div>
        </div>

        {showHow && (
          <div className="small muted" style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', lineHeight: 1.55 }}>
            <b>One-time 30-second setup (free &amp; private):</b>
            <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              <li>Go to <b>github.com/settings/tokens</b> while signed in to your GitHub account.</li>
              <li>Tap <b>Generate new token → Tokens (classic)</b>, name it <code>KGuitar</code>, and tick <b>ONLY <code>gist</code></b>.</li>
              <li>Copy the token and paste the <b>same token</b> here on both your Fold and your Tab S10+, then tap <b>Sync now</b>.</li>
            </ol>
          </div>
        )}

        {(syncMsg || cfg.lastError) && (
          <p className="small" role="status" style={{ margin: 0, color: cfg.lastError && !syncMsg ? 'var(--bad)' : undefined }}>
            {syncMsg || cfg.lastError}
          </p>
        )}
      </section>

      <section className="panel stack" style={{ gap: 10 }}>
        <strong style={{ fontSize: 15 }}>Backup file (manual)</strong>
        <p className="small muted" style={{ margin: 0 }}>
          Save a backup file to Google Drive or restore one from another device. Last backup: <b>{ago(last)}</b>.
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => void backup()} disabled={busy}>Back up now</button>
          <button className="btn" onClick={() => file.current?.click()} disabled={busy}>Restore from a backup</button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      </section>

      {pending && sum && (
        <div className="sheet-backdrop" onClick={() => setPending(null)}>
          <div className="sheet confirm" role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0 }}>Restore this backup?</h2>
            <p className="small" style={{ margin: 0 }}>
              Backup from {sum.date.toLocaleDateString()}: {sum.songs} songs and {sum.days} practice days.
              {' '}<b>Smart merge</b> combines lessons, songs &amp; streaks without erasing newer progress or changing this device&apos;s window layout.
            </p>
            <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
              <button
                className="btn"
                onClick={async () => { await restoreBackup(pending); location.reload() }}
              >
                Replace all
              </button>
              <button
                className="btn primary"
                onClick={async () => { await applyMergedBackup(pending); location.reload() }}
              >
                Smart merge (Recommended)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

