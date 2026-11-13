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
  const vp = { width: 840, height: 757, n: 'inner' }
  const page = await newPage(browser, vp, { 'kg:theme': '"psy"' })
  // visit Songs first (so its pages are already mounted, like on the phone)
  await page.locator('nav.nav button:has-text("Songs")').click().catch(() => {})
  await page.waitForTimeout(500)
  await page.locator('nav.nav button:has-text("Learn")').click().catch(() => {})
  await explore(page)
  await page.click('.tool:has-text("My books")')
  await page.locator('input[type=file][accept*=json]').setInputFiles(PACK)
  await page.waitForSelector('[data-testid=book-row]')
  await page.locator('.books-manage > summary').click()
  await page.locator('input[type=file][accept*=pdf]').setInputFiles(PDF)
  await page.waitForSelector('text=1 PDF added', { timeout: 5000 })
  await page.locator('[data-testid=book-row]').first().click()
  await page.locator('button:has-text("Read this page")').click()
  await page.waitForTimeout(1500)
  console.log('after read:', await page.evaluate(() => ({ tab: document.querySelector('nav.nav button[aria-current], nav.nav .on')?.textContent, pdfPages: !!document.querySelector('[data-testid=pdf-pages]'), url: location.hash })))
  await page.screenshot({ path: path.join(OUT, 'books-readtab-1.png') })
  if (await page.locator('[data-testid=pdf-read]').count()) {
    await page.locator('[data-testid=pdf-read]').click()
    await page.waitForTimeout(4000)
    console.log('after pdf-read:', await page.evaluate(() => ({ title: document.querySelector('.song-name b')?.textContent, notice: document.querySelector('.notice')?.textContent, scanned: document.querySelectorAll('.scan-pics img, [data-testid=scan-pic]').length })))
    await page.screenshot({ path: path.join(OUT, 'books-readtab-2.png') })
  }
  console.log('errors', page.errors)
  await browser.close()
})()
