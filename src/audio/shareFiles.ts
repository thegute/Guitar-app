// Hand files to the phone's share sheet (Drive, Files, a message…) on Android, or download them in a browser.
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const safe = (n: string) => n.replace(/[^\w .()-]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'KGuitar'
const b64 = (blob: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] ?? ''); r.onerror = rej; r.readAsDataURL(blob) })

export async function shareFiles(files: { name: string; blob: Blob }[], title = 'Save from KGuitar') {
  if (Capacitor.isNativePlatform()) {
    const uris: string[] = []
    for (const f of files) {
      const w = await Filesystem.writeFile({ path: safe(f.name), data: await b64(f.blob), directory: Directory.Cache })
      uris.push(w.uri)
    }
    await Share.share({ title, files: uris, dialogTitle: title })
    return
  }
  for (const f of files) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f.blob)
    a.download = safe(f.name)
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    await new Promise(r => setTimeout(r, 300))
  }
}
