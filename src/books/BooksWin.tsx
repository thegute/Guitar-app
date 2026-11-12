// "In your books" as a window (screens built from windows: CAGED, Scales). Hidden until his book pack is imported.
import { Win } from '../components/Win'
import { InYourBooks } from './InYourBooks'
import { useBooks } from './useBooks'

export function BooksWin({ topics }: { topics: string[] }) {
  const books = useBooks()
  if (!books.length) return null
  return (
    <Win id="books" title="In your books" className="panel" bodyClass="stack">
      <InYourBooks topics={topics} title="" max={5} />
    </Win>
  )
}
