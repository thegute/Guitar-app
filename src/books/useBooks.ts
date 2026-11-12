import { useEffect, useState } from 'react'
import { listBooks, onBooks, shelfNow, type BookMeta } from './store'

/** The books on the shelf (empty until he imports his book pack). */
export function useBooks(): BookMeta[] {
  const [b, setB] = useState<BookMeta[]>(shelfNow)
  useEffect(() => { void listBooks().then(setB); return onBooks(() => setB([...shelfNow()])) }, [])
  return b
}
