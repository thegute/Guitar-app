// A PDF book (more than 8 pages): pick the pages that hold the tab you want. Shows small pictures of the chosen
// pages so you can check before reading. Reads at most 8 pages at a time (the picture reader takes up to 6).
import { useEffect, useState } from 'react'

export const BOOK_PAGES = 8

export function PdfPages({ name, bytes, pages, busy, onRead, onCancel }: {
  name: string; bytes: Uint8Array; pages: number; busy?: boolean
  onRead: (from: number, to: number) => void; onCancel: () => void
}) {
  const key = `kg:pdfPage:${name}`
  const [from, setFrom] = useState(() => { try { const v = Number(localStorage.getItem(key)); return v >= 1 && v <= pages ? v : 1 } catch { return 1 } })
  const [to, setTo] = useState(() => Math.min(pages, from + 1))
  const [thumbs, setThumbs] = useState<{ n: number; url: string }[]>([])
  const a = Math.max(1, Math.min(pages, from || 1)), b = Math.max(a, Math.min(pages, to || a, a + BOOK_PAGES - 1))

  useEffect(() => {
    let live = true
    const t = setTimeout(async () => {
      const { pdfPictures } = await import('../tabs/pdfTab')
      try {
        const pics = await pdfPictures(bytes, b - a + 1, a, 0.35)
        if (live) setThumbs(pics.map((p, i) => ({ n: a + i, url: p.url })))
      } catch { if (live) setThumbs([]) }
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [bytes, a, b])

  const read = () => { try { localStorage.setItem(key, String(a)) } catch { /* private */ } onRead(a, b) }
  const num = (v: string) => Math.max(1, Math.min(pages, Math.round(Number(v) || 1)))

  return (
    <div className="pdf-pages panel stack" style={{ gap: 8 }} data-testid="pdf-pages" role="group" aria-label="Pick the pages to read">
      <p className="small" style={{ margin: 0 }}><b>"{name.replace(/\.[^.]+$/, '')}"</b> has {pages} pages. Which pages hold the tab you want? (Up to {BOOK_PAGES} at a time; the book's own page numbers may be a few off.)</p>
      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="row small" style={{ gap: 4, alignItems: 'center' }}>Page
          <input className="input tabular" type="number" inputMode="numeric" min={1} max={pages} value={from} style={{ width: 76 }}
            onChange={e => { const v = num(e.target.value); setFrom(v); if (to < v || to > v + BOOK_PAGES - 1) setTo(Math.min(pages, v + 1)) }} data-testid="pdf-from" />
        </label>
        <label className="row small" style={{ gap: 4, alignItems: 'center' }}>to
          <input className="input tabular" type="number" inputMode="numeric" min={a} max={Math.min(pages, a + BOOK_PAGES - 1)} value={to} style={{ width: 76 }}
            onChange={e => setTo(num(e.target.value))} data-testid="pdf-to" />
        </label>
        <button className="btn sm" onClick={() => { setFrom(Math.max(1, a - (b - a + 1))); setTo(Math.max(1, a - 1)) }} disabled={a <= 1} aria-label="Earlier pages">‹</button>
        <button className="btn sm" onClick={() => { const n = b - a + 1; setFrom(Math.min(pages, b + 1)); setTo(Math.min(pages, b + n)) }} disabled={b >= pages} aria-label="Later pages">›</button>
      </div>
      <div className="pdf-thumbs" aria-label={`Pages ${a} to ${b}`}>
        {thumbs.length ? thumbs.map(t => (
          <figure key={t.n} className="pdf-thumb"><img src={t.url} alt={`Page ${t.n}`} loading="lazy" /><figcaption className="small tabular">{t.n}</figcaption></figure>
        )) : <span className="small muted">Getting the pages…</span>}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary" onClick={read} disabled={busy} data-testid="pdf-read">{busy ? 'Reading…' : `Read page${b > a ? `s ${a}–${b}` : ` ${a}`}`}</button>
        <button className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  )
}
