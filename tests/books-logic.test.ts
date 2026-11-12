// My books: a PDF finds its book by file name (the pack remembers the file it was made from; phones rename downloads),
// and "book + chapter" references find their page from the book's contents. Made-up books only (never the owner's).
import './test-env'
import { strict as assert } from 'node:assert'
import { matchPdf, chapterOf, type BookMeta } from '../src/books/store'

let n = 0, failed = 0
const check = (name: string, f: () => void) => { n++; try { f() } catch (e) { failed++; console.log('  FAIL', name, (e as Error).message) } }
const book = (id: string, title: string, file: string, toc: BookMeta['toc'] = []): BookMeta => ({ id, title, kind: 'theory', file, pages: 100, toc })
const shelf = [
  book('nb', 'No Bull Music Theory for Guitarists', 'c5a72518-No_Bull_Music_Theory_for_Gu__Z-Library.pdf', [{ title: 'Chapter 1: The Musical Alphabet', page: 10 }, { title: 'Chapter 2: Tones and Semitones', page: 17 }]),
  book('mt', 'Music Theory for Guitarists', 'Music_Theory_for_Guitarists_Everything_You_Ever_Wanted.pdf'),
  book('fw', 'Guitar Fretboard Workbook', 'Guitar_Fretboard_Workbook__Barrett_Tagliarino.pdf'),
  book('fm', 'Guitar Fretboard Mastery', '27a113e6-Guitar_Fretboard_Mastery_N__Z-Library-1.pdf'),
]
check('exact file name (with the upload prefix)', () => assert.equal(matchPdf('c5a72518-No_Bull_Music_Theory_for_Gu__Z-Library.pdf', shelf)?.id, 'nb'))
check('file name without the prefix', () => assert.equal(matchPdf('No_Bull_Music_Theory_for_Gu__Z-Library.pdf', shelf)?.id, 'nb'))
check('a renamed download, by title words', () => assert.equal(matchPdf('No Bull Music Theory for Guitarists (2019).pdf', shelf)?.id, 'nb'))
check('workbook vs mastery are told apart', () => { assert.equal(matchPdf('Guitar Fretboard Workbook.pdf', shelf)?.id, 'fw'); assert.equal(matchPdf('Guitar Fretboard Mastery.pdf', shelf)?.id, 'fm') })
check('an unknown PDF matches nothing', () => assert.equal(matchPdf('Jazz Cookbook.pdf', shelf), null))
check('the chapter a page is in', () => { assert.equal(chapterOf(shelf[0], 12), 'Chapter 1: The Musical Alphabet'); assert.equal(chapterOf(shelf[0], 17), 'Chapter 2: Tones and Semitones'); assert.equal(chapterOf(shelf[0], 3), undefined) })
console.log(`books: ${n} checks, ${failed} failed`)
if (failed) process.exit(1)
