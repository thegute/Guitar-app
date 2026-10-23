// Backup and restore: everything KGuitar keeps on the phone (songs, practice history, streak, settings) in one file.
// On Android the file goes to the share sheet, so you can save it to Google Drive; restore by picking that file.
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { listSongs, saveSong, deleteSong, type SongDoc } from './tabs/library'

export interface Backup {
  app: 'KGuitar'
  version: 1
  createdAt: number
  /** every kg:* setting and record from local storage, as stored */
  storage: Record<string, string>
  songs: SongDoc[]
}
const LAST = 'kg:lastBackup'

function day(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function makeBackup(): Promise<Backup> {
  const storage: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('kg:') && k !== LAST) storage[k] = localStorage.getItem(k) ?? ''
  }
  return { app: 'KGuitar', version: 1, createdAt: Date.now(), storage, songs: await listSongs() }
}

/** Make the backup file and hand it to the share sheet (Android) or download it (web). */
export async function saveBackup(): Promise<{ name: string; songs: number }> {
  const b = await makeBackup()
  const json = JSON.stringify(b)
  const name = `KGuitar-backup-${day()}.json`
  if (Capacitor.isNativePlatform()) {
    const r = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: 'KGuitar backup', files: [r.uri], dialogTitle: 'Save your KGuitar backup (pick Drive)' })
  } else {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  try { localStorage.setItem(LAST, String(Date.now())) } catch { /* storage unavailable */ }
  return { name, songs: b.songs.length }
}

export function readBackup(text: string): Backup | null {
  try {
    const b = JSON.parse(text) as Backup
    if (b?.app !== 'KGuitar' || typeof b.storage !== 'object' || !Array.isArray(b.songs)) return null
    return b
  } catch {
    return null
  }
}

export function backupSummary(b: Backup) {
  let days = 0
  try {
    const logs = JSON.parse(b.storage['kg:practiceLog'] ?? '{}') as Record<string, { guitar: number; study: number }>
    days = Object.values(logs).filter(d => d.guitar + d.study >= 300).length
  } catch { /* no practice log */ }
  return { date: new Date(b.createdAt), songs: b.songs.filter(s => s.source !== 'example' && s.source !== 'lesson').length, days }
}

/** Replace what's on this phone with the backup, then reload the app. */
export async function restoreBackup(b: Backup) {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('kg:') && k !== LAST) keys.push(k) }
  keys.forEach(k => localStorage.removeItem(k))
  for (const [k, v] of Object.entries(b.storage)) localStorage.setItem(k, v)
  for (const s of await listSongs()) await deleteSong(s.id)
  for (const s of b.songs) await saveSong(s)
  localStorage.setItem(LAST, String(b.createdAt))
}

export function lastBackup(): number | null {
  try { const v = Number(localStorage.getItem(LAST)); return v > 0 ? v : null } catch { return null }
}
