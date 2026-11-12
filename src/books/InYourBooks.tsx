// "In your books": the pages of the owner's own books about what this screen teaches (from his private book pack).
// Shows nothing until the pack is imported. Tapping a page opens it in Learn → My books.
import { useEffect, useState } from 'react'
import { Ico } from '../components/Icon'
import { learnGo } from '../nav'
import { useBooks } from './useBooks'
import { findRef, topicPages, type BookHit } from './store'

export function InYourBooks({ topics, refs, max = 4, title = 'In your books', onOpen }: {
  topics: string[]
  /** named spots first (a lesson's "book + chapter"), then pages found by topic */
  refs?: { book: string; where?: string }[]
  max?: number; title?: string
  onOpen?: (id: string, page?: number) => void
}) {
  const books = useBooks()
  const [hits, setHits] = useState<BookHit[]>([])
  const key = topics.join(',')
  useEffect(() => { if (books.length) void topicPages(topics, max).then(setHits); else setHits([]) }, [key, books.length, max]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!books.length) return null
  const named = (refs ?? []).map(r => ({ r, f: findRef(r.book, r.where) })).filter(x => x.f)
  if (!named.length && !hits.length) return null
  const open = onOpen ?? ((id: string, page?: number) => learnGo({ books: { id, page } }))
  return (
    <section className="in-books" data-testid="in-books">
      {title && <h3 className="in-books-head"><Ico n="book" /> {title}</h3>}
      <ul>
        {named.map(({ r, f }, i) => (
          <li key={`n${i}`}><button onClick={() => open(f!.book.id, f!.page)}>
            <b>{f!.book.title}</b><span className="small muted">{r.where ?? ''}{f!.page ? ` · page ${f!.page}` : ''}</span>
          </button></li>
        ))}
        {hits.filter(h => !named.some(n => n.f!.book.id === h.book.id && n.f!.page === h.page)).slice(0, Math.max(0, max - named.length)).map((h, i) => (
          <li key={i}><button onClick={() => open(h.book.id, h.page)}>
            <b>{h.book.title}</b><span className="small muted">page {h.page}{h.chapter ? ` · ${h.chapter}` : ''}</span>
            <span className="small in-books-snip">{h.snippet}</span>
          </button></li>
        ))}
      </ul>
    </section>
  )
}
