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
  if (want('maketab')) {
    for (const vp of [{ width: 840, height: 757 }, { width: 412, height: 915 }]) {
      const page = await newPage(browser, { 'kg:tab2': 'jam', 'kg:sub:jam': 'tab' }, vp)
      await nav(page, 'Jam')
      await sub(page, 'Make a tab').catch(() => {})
      for (const [label, part] of [['Licks & solos', 'lead'], ['Chord melody', 'melody'], ['Riffs', 'riff']]) {
        await page.locator(`.seg button:has-text("${label}")`).click()
        const box = page.locator(`[data-testid=tm-${part}]`)
        await box.waitFor({ timeout: 5000 }).catch(() => bad(`${vp.width} ${part}: tab maker not shown`))
        for (const st of ['slackkey', 'progclean', 'classical']) {
          await box.locator('select[aria-label=Style]').selectOption(st)
          await box.locator('[data-testid=tm-make]').click()
          await page.waitForTimeout(150)
          const marks = await box.locator('.tab-view text, .tab-note').count()
          const title = await box.locator('.tab-preview').innerText().catch(() => '')
          if (!marks) bad(`${vp.width} ${part} ${st}: empty preview`)
          if (st === 'slackkey' && part !== 'riff' && !(await box.locator('.notice:has-text("Tune to")').count())) bad(`${vp.width} ${part}: no open G tuning note`)
          console.log(`${vp.width} ${part} ${st}: ${marks} marks`)
          void title
        }
        if (vp.width === 412) await page.screenshot({ path: `tests/browser/out/maketab-${part}.png`, fullPage: false })
      }
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      if (sideways) bad(`${vp.width}: sideways scroll on Make a tab`)
      errs(page, `make a tab ${vp.width}`)
      await page.context().close()
    }
  }
  if (want('transcribe')) {
    const page = await newPage(browser, {}, { width: 840, height: 757 })
    await nav(page, 'Jam'); await sub(page, 'Find chords')
    const box = page.locator('[data-testid=transcriber]')
    await box.locator('[data-testid=tx-file]').setInputFiles(path.join(DIR, 'out', 'ode.wav'))
    await box.locator('[data-testid=tx-open]').waitFor({ timeout: 90000 }).catch(() => bad('transcribe: no tab after 90 s'))
    const heard = await box.innerText()
    const n = /(\d+) notes heard/.exec(heard)?.[1]
    console.log(`transcribe ode.wav: ${n} notes heard (31 played)`)
    if (!n || Math.abs(Number(n) - 31) > 4) bad(`transcribe: ${n} notes heard, expected about 31`)
    await box.locator('[data-testid=tx-open]').click()
    await page.waitForSelector('.play-head', { timeout: 8000 }).catch(() => bad('transcribe: tab did not open in Play'))
    errs(page, 'transcribe')
    await page.context().close()
  }
  if (want('z2h')) {
    for (const vp of [{ width: 412, height: 915 }, { width: 840, height: 757 }]) {
      const page = await newPage(browser, { 'kg:z2h': { phase: 2, since: Date.now(), placed: true, ticks: [], paths: ['slackkey', 'flatpick'] }, 'kg:sub:learn': 'course' }, vp)
      await nav(page, 'Learn'); await sub(page, 'Course')
      const btns = page.locator('[data-testid=z2h-watch]')
      await btns.first().waitFor({ timeout: 8000 }).catch(() => bad(`${vp.width}: no Watch buttons in Zero to Hero`))
      const n = await btns.count()
      await btns.first().click()
      await page.locator('.z2h-watch .lv-poster').first().click().catch(() => bad('no video poster'))
      await page.waitForTimeout(300)
      const ticked = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:z2h')).ticks.filter(t => t.startsWith('w:')).length)
      console.log(`${vp.width}: ${n} Watch buttons, ${ticked} ticked after playing one`)
      if (!ticked) bad(`${vp.width}: playing a video didn't tick it`)
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      if (sideways) bad(`${vp.width}: sideways scroll in Zero to Hero`)
      if (vp.width === 412) await page.screenshot({ path: 'tests/browser/out/z2h-watch.png' })
      errs(page, 'z2h')
      await page.context().close()
    }
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall good')
  process.exit(problems.length ? 1 : 0)
})()
