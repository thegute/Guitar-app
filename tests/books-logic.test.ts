// My books: a PDF finds its book by file name (the pack remembers the file it was made from; phones rename downloads),
// and "book + chapter" references find their page from the book's contents. Made-up books only (never the owner's).
import './test-env'
import { strict as assert } from 'node:assert'
import { matchPdf, chapterOf, type BookMeta } from '../src/books/store'
import { junkLine, pageView } from '../src/books/pageText'

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

// scanned pages: music / tab / diagrams read as letters are hidden, real sentences and chord names stay (lines like the
// ones the owner saw, made up here, not copied from a book)
const junk = ['Ty { i [', 'e v y @ oe id oe', '7 2 6 a 6 5 3', '= = + 2 5 = 4 :', 'Vv v wv v', '| ra £. & 1. [ T yy', '— — 2 4 5 =', 'Ma mi mi Ma mi mi mi Ma', 'Q 4 4 4 4 4 4']
const keep = ['We start by stacking thirds on every note of the scale (Fig. 2A).', '1. Down by the river, the water is', 'C major scale', 'Fig. 3B',
  'Dm Em F G Am', 'Harmonized in 3rds', 'call - ing, from hill to hill, and', 'Chapter 4', 'The 12th Fret!']
check('junk lines are spotted', () => { for (const l of junk) assert.equal(junkLine(l), true, l) })
check('real lines are kept', () => { for (const l of keep) assert.equal(junkLine(l), false, l) })
check('a text page with one figure', () => {
  const v = pageView('We start by stacking thirds on every note of the scale.\nEach chord gets a name from its root.\n\nFig. 2A\n= = + 2 5 = 4 :\n7 2 6 a 6 5 3\nTy { i [\nC major scale\nThat is the whole idea, and it works in every key you will meet.')
  assert.equal(v.picture, false)
  assert.equal(v.parts.filter(p => p.kind === 'figure').length, 1)
  assert.equal((v.parts.find(p => p.kind === 'figure') as { lines: number }).lines, 3)
})
check('a page of printed music is a picture page', () => {
  const v = pageView('Moderately C7\np 2\n. Z = === pf\nTy { i [\ne v y @ oe id oe\n7 2 6 a 6 5 3\n— +— : 3 4 a\nVv v wv v\nF Cc\nA | ene :<\n1. Down by the river, the water is')
  assert.equal(v.picture, true)
})
check('a page with only a heading is a picture page', () => assert.equal(pageView('Chapter 4').picture, true))
check('an empty page is a picture page', () => assert.equal(pageView('').picture, true))
console.log(`books: ${n} checks, ${failed} failed`)
if (failed) process.exit(1)
