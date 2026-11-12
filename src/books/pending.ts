// A page of one of his books handed to Songs → Add a song: the PDF opens at that page so its tab (or chords) goes to Play.
let pending: { name: string; bytes: Uint8Array; page: number } | null = null
export function setPendingBookPdf(p: { name: string; bytes: Uint8Array; page: number }) {
  pending = p
  try { localStorage.setItem(`kg:pdfPage:${p.name}`, JSON.stringify(p.page)) } catch { /* storage */ }
}
export function takePendingBookPdf() { const p = pending; pending = null; return p }
