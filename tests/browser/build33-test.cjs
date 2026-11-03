// Build 33 browser checks: PDF tabs in Add a song (text tab, Guitar Pro style staff, scanned → picture reader),
// and the newer build 33 work. Needs `vite preview` on :4173 and CHROME_PATH.
// Usage: node tests/browser/build33-test.cjs [part,part]
const { chromium } = require('playwright')
const path = require('path')
const DIR = path.join(__dirname)
const FIX = path.join(DIR, '..', 'fixtures')
const only = process.argv[2] ? process.argv[2].split(',') : null
const want = p => !only || only.includes(p)
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }

async function newPage(browser, seed = {}, viewport = { width: 840, height: 757 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource/i.test(m.text())) page.errors.push('console: ' + m.text()) })
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:askBubble', 'false'); localStorage.setItem('kg:getReady', '0')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  return page
}
const nav = (page, label) => page.locator(`nav.nav button:has-text("${label}")`).click()
const sub = (page, label) => page.locator(`.subtabs [role=tab]:has-text("${label}")`).first().click()
const errs = (page, where) => { if (page.errors.length) bad(`${where} page errors: ${page.errors.join(' | ')}`); page.errors = [] }

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
  if (want('pdf')) {
    for (const [file, check] of [['text-tab.pdf', 'tab'], ['staff-tab.pdf', 'tab'], ['chord-sheet.pdf', 'chords'], ['scanned.pdf', 'scanned']]) {
      const page = await newPage(browser)
      await nav(page, 'Songs'); await sub(page, 'Add a song')
      const input = page.locator('input[type=file][multiple]:not([accept])')
      await input.setInputFiles(path.join(FIX, file))
      if (check === 'scanned') {
        await page.waitForSelector('.pic-strip img', { timeout: 15000 }).catch(() => bad('scanned PDF: pages not shown in the picture reader'))
        const n = await page.locator('.pic-strip img').count()
        console.log(`${file}: ${n} page picture(s) in the reader`)
      } else {
        await page.waitForSelector('.play-head', { timeout: 15000 }).catch(() => bad(`${file}: didn't open in Play`))
        const notes = await page.locator('.tab-view text, .tab-note').count()
        const title = await page.locator('.play-head').innerText().catch(() => '')
        console.log(`${file}: opened in Play (${title.split('\n')[0]}), ${notes} tab marks`)
        if (!notes) bad(`${file}: empty tab`)
      }
      errs(page, file)
      await page.context().close()
    }
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall good')
  process.exit(problems.length ? 1 : 0)
})()
