// The manual as a PDF (made at build time by tools/make-manual.cjs with real Day Mode screenshots: a 2-minute Quick
// Start, then every section of How to use KGuitar with why, when and how). One tap hands it to the share sheet (Android)
// or downloads it (web), to keep or to send to someone new.
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const MANUAL_URL = 'manual/KGuitar-manual.pdf'

export async function saveManual(): Promise<string> {
  const res = await fetch(MANUAL_URL)
  if (!res.ok) throw new Error('no manual')
  const blob = await res.blob()
  const name = 'KGuitar-manual.pdf'
  if (Capacitor.isNativePlatform()) {
    const b64 = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(r.error); r.readAsDataURL(blob) })
    const w = await Filesystem.writeFile({ path: name, data: b64, directory: Directory.Cache })
    await Share.share({ title: 'KGuitar manual', files: [w.uri], dialogTitle: 'Save or send the KGuitar manual' })
    return 'Manual ready: save it or send it from the share sheet.'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'Manual downloaded.'
}
