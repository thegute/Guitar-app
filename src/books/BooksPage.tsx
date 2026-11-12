// Learn → My books: the owner's own books on his phone. Import the private book pack (text + contents of every book)
// and, optionally, the PDFs (to see the real page and read a tab into Play). A shelf by kind, one search over every page,
// and a reader: contents, page text, the real page, "Read this page's tab into Play", "Ask the teacher about this page".
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Instrument } from '../instrument'
import { Ico } from '../components/Icon'
import { askAssistant } from '../assistant/bus'
import { useScreenInfo } from '../assistant/screen'
import { openSongs } from '../nav'
import { useBooks } from './useBooks'
import { KIND_LABEL, addPdf, bookPdf, bookText, chapterOf, importPack, matchPdf, removeBook, searchBooks, type BookHit, type BookKind, type BookMeta } from './store'
import { setPendingBookPdf } from './pending'

function Shelf({ books, onOpen }: { books: BookMeta[]; onOpen: (b: BookMeta) => void }) {
  const kinds = [...new Set(books.map(b => b.kind))] as BookKind[]
  return (
    <div className="stack">
      {kinds.map(k => (
        <section key={k} className="stack" style={{ gap: 6 }}>
          <h2 className="books-kind">{KIND_LABEL[k]}</h2>
          <ul className="books-list">
            {books.filter(b => b.kind === k).map(b => (
              <li key={b.id}>
                <button className="books-row" onClick={() => onOpen(b)} data-testid="book-row">
                  <span className="books-spine" aria-hidden="true"><Ico n="book" /></span>
                  <span className="books-row-text">
                    <b>{b.title}</b>
                    <span className="small muted">{[`${b.pages} pages`, b.main ? 'your theory guide' : '', b.pdf ? 'PDF added' : ''].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Hits({ hits, onOpen }: { hits: BookHit[]; onOpen: (h: BookHit) => void }) {
  return (
    <ul className="books-hits">
      {hits.map((h, i) => (
        <li key={i}>
          <button onClick={() => onOpen(h)} data-testid="book-hit">
            <b>{h.book.title}</b>
            <span className="small muted">page {h.page}{h.chapter ? ` · ${h.chapter}` : ''}</span>
            <span className="small books-snippet">{h.snippet}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Reader({ book, page: page0, onBack }: { book: BookMeta; page?: number; onBack: () => void }) {
  const [pages, setPages] = useState<string[]>([])
  const [page, setPage] = useState(Math.max(1, page0 ?? 1))
  const [real, setReal] = useState<string | null>(null)
  const [showReal, setShowReal] = useState(false)
  const [msg, setMsg] = useState('')
  const [toc, setToc] = useState(!page0)
  const top = useRef<HTMLDivElement>(null)
  useEffect(() => { void bookText(book.id).then(setPages) }, [book.id])
  useEffect(() => { setReal(null); setMsg(''); top.current?.scrollIntoView({ block: 'start' }) }, [page])
  useEffect(() => {
    if (!showReal || !book.pdf) return
    let alive = true
    void (async () => {
      const bytes = await bookPdf(book.id)
      if (!bytes || !alive) return
      const { pdfPictures } = await import('../tabs/pdfTab')
      const [pic] = await pdfPictures(bytes, 1, page, 1.6)
      if (alive) setReal(pic?.url ?? null)
    })()
    return () => { alive = false }
  }, [showReal, page, book.id, book.pdf])
  const text = pages[page - 1] ?? ''
  const chapter = chapterOf(book, page)
  useScreenInfo('books', { label: `Reading "${book.title}"`, summary: `Reading page ${page} of "${book.title}"${chapter ? ` (${chapter})` : ''}. The page says: ${text.replace(/\s+/g, ' ').slice(0, 1500)}` })
  const readTab = async () => {
    const bytes = await bookPdf(book.id)
    if (!bytes) { setMsg('Add this book\'s PDF first (My books → Add the PDFs) to read its tabs into Play.'); return }
    setPendingBookPdf({ name: `${book.title}.pdf`, bytes, page })
    openSongs('add')
  }
  return (
    <div className="stack books-reader" ref={top}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onBack}>← All books</button>
        <button className="btn sm ghost" onClick={() => setToc(v => !v)}>{toc ? 'Hide contents' : 'Contents'}</button>
      </div>
      <header>
        <h1 style={{ margin: 0 }}>{book.title}</h1>
        <p className="small muted" style={{ margin: 0 }}>{book.pages} pages</p>
      </header>
      {toc && (
        <nav className="books-toc" aria-label="Contents">
          {book.toc.length ? book.toc.map((t, i) => (
            <button key={i} className={`books-toc-row d${Math.min(2, t.depth ?? 0)}${t.page === page ? ' on' : ''}`} onClick={() => { setPage(t.page); setToc(false) }}>
              <span>{t.title}</span><span className="small muted">{t.page}</span>
            </button>
          )) : <p className="small muted" style={{ margin: 0 }}>This book has no contents list; use the page numbers or search.</p>}
        </nav>
      )}
      <div className="books-pager">
        <button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page">‹</button>
        <label className="small">Page <input className="input" type="number" min={1} max={book.pages} value={page} onChange={e => setPage(Math.max(1, Math.min(book.pages, Number(e.target.value) || 1)))} style={{ width: 72 }} /> of {book.pages}</label>
        <button className="btn sm" disabled={page >= book.pages} onClick={() => setPage(p => p + 1)} aria-label="Next page">›</button>
      </div>
      {chapter && <p className="small muted" style={{ margin: 0 }}>{chapter}</p>}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {book.pdf && <button className={`btn sm${showReal ? ' on' : ''}`} onClick={() => setShowReal(v => !v)}><Ico n="image" /> {showReal ? 'Show the text' : 'Show the real page'}</button>}
        <button className="btn sm" onClick={() => void readTab()} data-testid="book-readtab"><Ico n="guitar" /> Read this page's tab into Play</button>
        <button className="btn sm" onClick={() => askAssistant(`Be my guitar teacher. Here is page ${page} of my book "${book.title}"${chapter ? ` (${chapter})` : ''}. Explain what it teaches in plain words, show me how to practise it on my guitar today, and connect it to what I already know. The page (scanned text, may have OCR mistakes): """${text.replace(/\s+/g, ' ').slice(0, 2500)}"""`, 'general')} data-testid="book-ask"><Ico n="talk" /> Ask the teacher about this page</button>
      </div>
      {msg && <p className="notice small" role="status">{msg}</p>}
      {showReal && book.pdf
        ? (real ? <img className="books-real" src={real} alt={`Page ${page} of ${book.title}`} /> : <p className="small muted">Drawing the page…</p>)
        : <article className="books-page" data-testid="book-page">{text || <span className="muted">(This page has no text: it may be a picture or a tab. Add the PDF to see it.)</span>}</article>}
      <div className="books-pager">
        <button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Page {page - 1 || ''}</button>
        <button className="btn sm" disabled={page >= book.pages} onClick={() => setPage(p => p + 1)}>Page {page + 1} ›</button>
      </div>
    </div>
  )
}

export function BooksPage({ openId, openPage, q: q0, onExit }: { openId?: string; openPage?: number; q?: string; onExit: () => void; inst: Instrument }) {
  const books = useBooks()
  const [open, setOpen] = useState<{ id: string; page?: number } | null>(openId ? { id: openId, page: openPage } : null)
  const [q, setQ] = useState(q0 ?? '')
  const [hits, setHits] = useState<BookHit[] | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [unmatched, setUnmatched] = useState<File[]>([])
  const packIn = useRef<HTMLInputElement>(null)
  const pdfIn = useRef<HTMLInputElement>(null)
  const book = useMemo(() => (open ? books.find(b => b.id === open.id) : undefined), [open, books])
  useEffect(() => {
    const t = q.trim()
    if (t.length < 3) { setHits(null); return }
    const h = setTimeout(() => { void searchBooks(t, 12).then(setHits) }, 250)
    return () => clearTimeout(h)
  }, [q, books.length])
  useScreenInfo('books', book ? null : { label: 'My books', summary: `His own books on the phone: ${books.map(b => b.title).join('; ') || 'none imported yet'}.` })

  async function importFile(f: File) {
    setBusy(true); setMsg('')
    try { const n = await importPack(await f.text()); setMsg(`${n} books imported. They stay on this phone only.`) } catch (e) { setMsg(e instanceof Error ? e.message : 'Couldn\'t read that file.') }
    setBusy(false)
  }
  async function addPdfs(files: File[]) {
    setBusy(true); setMsg('')
    const left: File[] = []
    let ok = 0
    for (const f of files) { const b = matchPdf(f.name); if (b) { await addPdf(b.id, f); ok++ } else left.push(f) }
    setUnmatched(left)
    setMsg(`${ok} PDF${ok === 1 ? '' : 's'} added${left.length ? `; ${left.length} to match by hand below` : ''}.`)
    setBusy(false)
  }

  if (book) return <Reader key={`${book.id}:${open?.page ?? ''}`} book={book} page={open?.page} onBack={() => setOpen(null)} />
  return (
    <div className="stack books">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <span className="small muted">{books.length ? `${books.length} books` : ''}</span>
      </div>
      <h1 style={{ margin: 0 }}>My books</h1>
      {!books.length ? (
        <div className="panel stack" style={{ gap: 8 }}>
          <p style={{ margin: 0 }}>Your own guitar books, on this phone: read them here, search every page, and see the right pages next to lessons, CAGED, techniques and scales ("In your books"). The helper reads them too when it teaches you.</p>
          <p className="small muted" style={{ margin: 0 }}>Import the book pack file (kguitar-books.json) you were sent. It stays on this phone only; nothing is uploaded or shared.</p>
          <button className="btn primary" disabled={busy} onClick={() => packIn.current?.click()} data-testid="books-import">Import my book pack</button>
        </div>
      ) : (
        <>
          <input className="input" type="search" placeholder="Search every page of every book" value={q} onChange={e => setQ(e.target.value)} data-testid="books-search" aria-label="Search your books" />
          {hits && (hits.length ? <Hits hits={hits} onOpen={h => setOpen({ id: h.book.id, page: h.page })} /> : <p className="small muted" style={{ margin: 0 }}>Nothing found for "{q.trim()}".</p>)}
          {!hits && <Shelf books={books} onOpen={b => setOpen({ id: b.id })} />}
          <details className="panel books-manage">
            <summary>Add the PDFs, update the pack</summary>
            <div className="stack" style={{ gap: 8, marginTop: 8 }}>
              <p className="small muted" style={{ margin: 0 }}>Add the PDF files to see the real pages and read tabs into Play. Pick them all at once: each one is matched to its book by name.</p>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn sm" disabled={busy} onClick={() => pdfIn.current?.click()}>Add the PDFs</button>
                <button className="btn sm ghost" disabled={busy} onClick={() => packIn.current?.click()}>Import an updated book pack</button>
              </div>
              {unmatched.map((f, i) => (
                <label key={i} className="row small" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span>{f.name}</span>
                  <select className="input" defaultValue="" onChange={async e => { if (!e.target.value) return; await addPdf(e.target.value, f); setUnmatched(u => u.filter(x => x !== f)) }}>
                    <option value="">Which book is it?</option>
                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </label>
              ))}
              <details>
                <summary className="small">Remove a book</summary>
                <div className="stack" style={{ gap: 4, marginTop: 6 }}>
                  {books.map(b => <button key={b.id} className="btn sm ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { if (confirm(`Remove "${b.title}" from this phone?`)) void removeBook(b.id) }}>Remove {b.title}</button>)}
                </div>
              </details>
            </div>
          </details>
        </>
      )}
      {msg && <p className="small" role="status">{msg}</p>}
      <input ref={packIn} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importFile(f) }} />
      <input ref={pdfIn} type="file" accept=".pdf,application/pdf" multiple hidden onChange={e => { const fs = [...(e.target.files ?? [])]; e.target.value = ''; if (fs.length) void addPdfs(fs) }} />
    </div>
  )
}
