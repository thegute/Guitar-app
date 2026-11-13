// My books: import a book pack (a made-up test pack, never the owner's books), the shelf, search every page, the reader
// (contents, page, ‹ ›), add a PDF (matched by name) and show the real page, "In your books" in the CAGED explorer and in
// the sample course lesson, "Ask the teacher about this page", books in search. Cover and inner; no overflow, no errors.
// node tests/browser/books-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const PACK = path.join(__dirname, '..', 'fixtures', 'book-pack.json')
const PDF = path.join(__dirname, '..', 'fixtures', 'book.pdf')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)

async function newPage(browser, vp, seed) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:getReady': '0', 'kg:tab2': '"learn"', 'kg:tipsMode': '"off"', ...s })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.today-card', { timeout: 10000 })
  return page
}
const explore = page => page.locator('.subtabs [role=tab]:has-text("Explore")').first().click()

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
  for (const [vp, theme] of [[{ width: 412, height: 915, n: 'cover' }, 'psy'], [{ width: 840, height: 757, n: 'inner' }, 'day']]) {
    const page = await newPage(browser, vp, { 'kg:theme': JSON.stringify(theme) })
    // no books yet: the tool says to import the pack
    await explore(page)
    const sub = await page.locator('.tool:has-text("My books")').innerText().catch(() => '')
    if (!/Import your book pack/.test(sub)) bad(`${vp.n}: My books tool before import says "${sub.replace(/\n/g, ' ')}"`)
    await page.click('.tool:has-text("My books")')
    await page.waitForSelector('[data-testid=books-import]', { timeout: 5000 }).catch(() => bad(`${vp.n}: My books (empty) didn't open`))
    await page.locator('input[type=file][accept*=json]').setInputFiles(PACK)
    await page.waitForSelector('[data-testid=book-row]', { timeout: 6000 }).catch(() => bad(`${vp.n}: importing the pack showed no books`))
    const rows = await page.locator('[data-testid=book-row]').allInnerTexts()
    if (rows.length !== 2 || !/Test Theory Book/.test(rows[0])) bad(`${vp.n}: shelf shows ${rows.map(r => r.split('\n')[0]).join(', ')}`)
    // search every page
    await page.locator('[data-testid=books-search]').fill('octave shapes')
    await page.waitForSelector('[data-testid=book-hit]', { timeout: 4000 }).catch(() => bad(`${vp.n}: search found nothing`))
    const hit = await page.locator('[data-testid=book-hit]').first().innerText()
    if (!/page 2/.test(hit)) bad(`${vp.n}: best hit for "octave shapes" is "${hit.replace(/\n/g, ' ')}"`)
    await page.locator('[data-testid=book-hit]').first().click()
    await page.waitForSelector('[data-testid=book-page]')
    const txt = await page.locator('[data-testid=book-page]').innerText()
    if (!/Crossing the B string/.test(txt)) bad(`${vp.n}: the reader didn't open page 2`)
    if (await sideways(page)) bad(`${vp.n}: reader sideways overflow`)
    await page.screenshot({ path: path.join(OUT, `books-reader-${vp.n}.png`) })
    // contents → chapter 3
    await page.locator('button:has-text("Contents")').click()
    await page.locator('.books-toc-row:has-text("Pentatonic")').click()
    if (!/minor pentatonic/.test(await page.locator('[data-testid=book-page]').innerText())) bad(`${vp.n}: contents didn't jump to the chapter`)
    // ask the teacher
    await page.locator('[data-testid=book-ask]').click()
    await page.waitForSelector('.search-sheet', { timeout: 4000 }).catch(() => bad(`${vp.n}: Ask the teacher didn't open the helper`))
    await page.keyboard.press('Escape').catch(() => {})
    await page.locator('.search-sheet button[aria-label*="lose"], .search-sheet .sheet-close').first().click({ timeout: 2000 }).catch(() => {})
    // add the PDF (matched by its name) and show the real page
    await page.locator('button:has-text("← All books")').click()
    await page.locator('[data-testid=books-search]').fill('')
    await page.locator('.books-manage > summary').click()
    await page.locator('input[type=file][accept*=pdf]').setInputFiles(PDF)
    await page.waitForSelector('text=1 PDF added', { timeout: 5000 }).catch(() => bad(`${vp.n}: the PDF wasn't matched to its book`))
    await page.locator('[data-testid=book-row]').first().click()
    // with the PDF in, the real page shows first; the text is one tap away
    await page.waitForSelector('.books-real', { timeout: 8000 }).catch(() => bad(`${vp.n}: the real page didn't show first once the PDF was added`))
    await page.locator('[data-testid=book-toggle-real]').click()
    await page.waitForSelector('[data-testid=book-page]', { timeout: 3000 }).catch(() => bad(`${vp.n}: "Show the text" didn't show the text`))
    await page.locator('[data-testid=book-toggle-real]').click()
    await page.waitForSelector('.books-real', { timeout: 8000 }).catch(() => bad(`${vp.n}: back to the real page failed`))
    // Read this page's tab into Play: Songs → Add a song opens at this page, Read goes to the picture reader right there
    await page.locator('[data-testid=book-readtab]').click()
    await page.waitForSelector('[data-testid=pdf-pages]', { timeout: 5000 }).catch(() => bad(`${vp.n}: Read this page's tab didn't open the page picker`))
    await page.locator('[data-testid=pdf-read]').click()
    await page.waitForSelector('[data-testid=book-scan], .song-name', { timeout: 15000 }).catch(() => bad(`${vp.n}: reading the book pages did nothing`))
    await page.locator('nav.nav button:has-text("Learn")').click()
    await explore(page)
    await page.click('.tool:has-text("My books")')
    await page.locator('[data-testid=book-row]').first().click()
    // In your books: the CAGED explorer and the sample lesson
    await page.locator('button:has-text("← All books")').click()
    await page.locator('button:has-text("← Back")').first().click()
    await explore(page)
    if (!/2 books/.test(await page.locator('.tool:has-text("My books")').innerText())) bad(`${vp.n}: My books tool doesn't count the books`)
    await page.click('.tool:has-text("explorer")')
    await page.waitForSelector('[data-testid=in-books]', { timeout: 5000 }).catch(() => bad(`${vp.n}: CAGED explorer has no "In your books"`))
    const cagedHit = await page.locator('[data-testid=in-books]').innerText().catch(() => '')
    if (!/page 3/.test(cagedHit)) bad(`${vp.n}: CAGED "In your books" doesn't point to the CAGED page: ${cagedHit.replace(/\n/g, ' ').slice(0, 120)}`)
    await page.locator('button:has-text("← Back")').first().click()
    await explore(page)
    await page.click('.tool:has-text("Theory")')
    await page.locator('[data-testid=course-lesson-c1-octaves]').click()
    await page.locator('.deep-rail-step:has-text("Go deeper")').click()
    await page.waitForSelector('[data-testid=in-books]', { timeout: 5000 }).catch(() => bad(`${vp.n}: the lesson's Go deeper has no "In your books"`))
    await page.locator('[data-testid=in-books] button').first().click()
    await page.waitForSelector('[data-testid=book-page], .books-real', { timeout: 8000 }).catch(() => bad(`${vp.n}: an "In your books" page didn't open`))
    if (page.errors.length) bad(`${vp.n}: page errors: ${page.errors.join(' | ')}`)
    console.log(`${vp.n} ${theme}: import, shelf, search, reader, contents, teacher, PDF page, In your books (CAGED, lesson)`)
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problems` : '\nbooks: all good')
  process.exit(problems.length ? 1 : 0)
})()
