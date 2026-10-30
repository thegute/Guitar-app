// Search and the Back button in the browser (build 18).
//   search   open search from the menu (cover, inner, small phone; Psychedelic, Day, Night): no sideways overflow;
//            real questions land in the right place already set up (a chord, a scale, a tuning, a tempo, a jam, Play's
//            Options at Speed, a Learn tool, a Settings page, a songbook song, a technique); / and Escape; the tab-site
//            links for a song that isn't in the app; no page errors
//   back     the Back button closes search and sheets, steps back inside Learn, returns to the section you came from,
//            and on Play asks before leaving
// Run with the preview server on :4173:  node tests/browser/search-test.cjs [section ...]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })
const ALL = ['search', 'back']
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL
const problems = []
const bad = (m) => { problems.push(m); console.log('  PROBLEM', m) }
const SIZES = { phone: { width: 360, height: 760 }, cover: { width: 412, height: 915 }, inner: { width: 840, height: 757 } }

async function launch() {
  return chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
}
async function newPage(browser, seed = {}, viewport = SIZES.cover) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource/i.test(m.text())) page.errors.push('console: ' + m.text()) })
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:getReady', '0')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('nav.nav')
  return page
}
const nav = (page, label) => page.locator(`nav.nav button:has-text("${label}")`).first().click()
const store = (page, k) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem('kg:' + k)) } catch { return null } }, k)
const tabNow = page => store(page, 'tab2')

async function ask(page, q) {
  if (!(await page.locator('.search-sheet').count())) await page.locator('nav.nav .nav-search').click()
  const input = page.locator('.search-input')
  await input.fill(q)
  await page.waitForTimeout(150)
  const titles = await page.locator('.search-hit .hit-title').allTextContents()
  return titles
}
async function pick(page, q, want) {
  const titles = await ask(page, q)
  const i = titles.findIndex(t => want.test(t))
  if (i < 0) { bad(`search "${q}": no result like ${want} (got ${titles.slice(0, 4).join(' | ')})`); await page.keyboard.press('Escape'); return false }
  if (i > 2) bad(`search "${q}": ${titles[i]} is only result ${i + 1}`)
  await page.locator('.search-hit').nth(i).click()
  await page.waitForTimeout(500)
  return true
}

async function searchSection(browser) {
  // looks and sizes: the menu fits, the sheet fits
  for (const [size, theme] of [['cover', 'psy'], ['inner', 'day'], ['phone', 'night'], ['cover', 'night'], ['inner', 'psy']]) {
    const page = await newPage(browser, { 'kg:theme': theme }, SIZES[size])
    await page.locator('nav.nav .nav-search').click()
    await page.waitForSelector('.search-sheet')
    const focused = await page.evaluate(() => document.activeElement?.classList.contains('search-input'))
    if (!focused) bad(`search ${size}/${theme}: the box isn't ready to type in`)
    await page.locator('.search-input').fill('slow down')
    await page.waitForTimeout(150)
    const ov = await page.evaluate(() => {
      const w = document.documentElement.clientWidth
      return [...document.querySelectorAll('.search-sheet *, nav.nav *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > w + 1 }).map(e => e.className).slice(0, 3)
    })
    if (ov.length) bad(`search ${size}/${theme}: sideways overflow ${ov.join(', ')}`)
    await page.screenshot({ path: path.join(DIR, `search-${size}-${theme}.png`) })
    if (page.errors.length) bad(`search ${size}/${theme}: page errors ${page.errors.join(' | ')}`)
    await page.context().close()
  }

  const page = await newPage(browser, {}, SIZES.cover)
  // a chord
  if (await pick(page, 'how do i play a G7 chord', /^G7 chord$/)) {
    const r = { tab: await tabNow(page), page: await store(page, 'toolPage'), root: await store(page, 'chordRoot'), suf: await store(page, 'chordSuffix'), shown: await page.locator('.tools .readout').first().textContent() }
    console.log('  G7:', JSON.stringify(r))
    if (r.tab !== 'tools' || r.page !== 'chords' || r.shown?.trim() !== 'G7') bad('search G7: Chords did not open on G7')
  }
  // a scale
  if (await pick(page, 'a minor pentatonic', /^A minor pentatonic scale$/)) {
    const r = { page: await store(page, 'toolPage'), root: await store(page, 'scaleRoot'), id: await store(page, 'scaleId') }
    console.log('  scale:', JSON.stringify(r))
    if (r.page !== 'scales' || r.root !== 'A' || r.id !== 'minor pentatonic') bad('search scale: Scales not on A minor pentatonic')
  }
  // a tempo, while already on Tools (the page must open afresh)
  if (await pick(page, 'metronome at 90', /Metronome at 90 bpm/)) {
    const shown = (await page.locator('.tools .readout').first().textContent())?.trim()
    console.log('  metronome shows', shown)
    if (shown !== '90') bad(`search metronome 90: shows ${shown}`)
  }
  // a tuning (put back afterwards)
  if (await pick(page, 'drop d', /Tune to Drop D/)) {
    const sel = await page.locator('.tools select').first().inputValue().catch(() => '')
    const tuner = await store(page, 'toolPage')
    console.log('  tuning:', tuner, sel)
    if (tuner !== 'tuner' || sel !== 'dropd') bad('search drop d: tuner not in Drop D')
    await pick(page, 'standard tuning', /Tune to Standard/)
  }
  // Play's Options at Speed, flashing
  if (await pick(page, 'how do i slow down the song', /Slow the tab down/)) {
    await page.waitForSelector('.play-opts', { timeout: 4000 }).catch(() => {})
    const flash = await page.waitForSelector('[data-find="speed"].find-flash', { timeout: 4000 }).then(() => true).catch(() => false)
    console.log('  speed: options open', !!(await page.locator('.play-opts').count()), 'flash', flash)
    if (!flash) bad('search slow down: Speed in Options not shown')
    await page.locator('.play-opts .sheet-head button').click()
  }
  // a jam in a key and style
  if (await pick(page, 'blues jam in A', /Jam: blues progression in A/)) {
    await page.waitForTimeout(800)
    const r = { tab: await tabNow(page), key: await store(page, 'progKey'), style: await store(page, 'progStyle'), prog: (await store(page, 'jamProg'))?.length }
    console.log('  jam:', JSON.stringify(r))
    if (r.tab !== 'progressions' || r.key !== 'A' || r.style !== 'blues' || !r.prog) bad('search blues jam: Jam not set to a new blues progression in A')
  }
  // Learn tools and Settings pages
  if (await pick(page, 'ear training', /^Ear training$/)) {
    const ok = await page.locator('text=/drone|home note/i').first().isVisible().catch(() => false)
    console.log('  ear training open', ok)
    if (!ok) bad('search ear training: the ear trainer did not open')
  }
  if (await pick(page, 'back up my songs to a new phone', /Back up/)) {
    const ok = await page.locator('.subtabs [role=tab][aria-selected=true]:has-text("Backup")').count()
    if (!ok) bad('search back up: Settings → Backup not open')
  }
  if (await pick(page, 'hammer ons', /Hammer-ons/)) {
    const ok = await page.locator('h1, h2').filter({ hasText: /Hammer-ons/ }).count()
    if (!ok) bad('search hammer ons: technique not open')
  }
  // a songbook song opens in Play
  if (await pick(page, 'down in the valley', /Down in the Valley/)) {
    await page.waitForTimeout(800)
    const title = await page.locator('.song-name b').textContent().catch(() => '')
    console.log('  song:', title)
    if (!/Down in the Valley/.test(title ?? '')) bad('search song: Down in the Valley not in Play')
  }
  // keyboard: / opens, Escape closes; a song that isn't in the app offers tab sites
  await page.locator('.main').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await page.keyboard.press('/')
  const opened = await page.waitForSelector('.search-sheet', { timeout: 2000 }).then(() => true).catch(() => false)
  if (!opened) bad('search: / did not open search')
  await ask(page, 'wonderwall tab')
  const sites = await page.locator('.search-web a').count()
  if (sites < 3) bad('search: no tab-site links for a song that is not in the app')
  await page.keyboard.press('Escape')
  if (await page.locator('.search-sheet').count()) bad('search: Escape did not close')
  if (page.errors.length) bad('search: page errors ' + page.errors.join(' | '))
  await page.context().close()
}

async function backSection(browser) {
  const page = await newPage(browser, {}, SIZES.cover)
  // search closes with Back
  await page.locator('nav.nav .nav-search').click()
  await page.goBack().catch(() => {})
  await page.waitForTimeout(300)
  if (await page.locator('.search-sheet').count()) bad('back: search still open')
  // Learn → Ear training → Back → Learn home → Back → Play
  await nav(page, 'Learn')
  await page.locator('.subtabs [role=tab]:has-text("Explore")').first().click()
  await page.locator('button:has-text("Ear training")').first().click()
  await page.waitForTimeout(300)
  await page.goBack().catch(() => {})
  await page.waitForTimeout(300)
  const home = await page.locator('.subtabs [role=tab]:has-text("Explore")').count()
  if (!home) bad('back: Learn did not step back from Ear training')
  await page.goBack().catch(() => {})
  await page.waitForTimeout(300)
  if ((await tabNow(page)) !== 'play') bad(`back: from Learn went to ${await tabNow(page)}, not Play`)
  // sections picked in the menu: Back goes to Play
  await nav(page, 'Jam'); await nav(page, 'Tools')
  await page.goBack().catch(() => {})
  await page.waitForTimeout(300)
  if ((await tabNow(page)) !== 'play') bad(`back: from Tools went to ${await tabNow(page)}, not Play`)
  // a link (search) from Tools to a Learn tool: Back steps out of the tool, then returns to Tools
  await nav(page, 'Tools')
  await pick(page, 'circle of fifths', /^Circle of fifths$/)
  await page.goBack().catch(() => {}); await page.waitForTimeout(300)
  await page.goBack().catch(() => {}); await page.waitForTimeout(300)
  if ((await tabNow(page)) !== 'tools') bad(`back: after a search link, went to ${await tabNow(page)}, not back to Tools`)
  // Play's Options sheet closes with Back
  await nav(page, 'Play')
  await page.locator('.opts-btn').click()
  await page.goBack().catch(() => {})
  await page.waitForTimeout(300)
  if (await page.locator('.play-opts').count()) bad('back: Options sheet still open')
  // on Play with nothing open (the song check may still be open: Back closes it first): a note asks for a second press
  let hint = 0
  for (let i = 0; i < 3 && !hint; i++) {
    await page.goBack().catch(() => {})
    await page.waitForTimeout(200)
    hint = await page.locator('.pedal-toast:has-text("Press Back again")').count()
  }
  if (!hint) bad('back: no "press again" note on Play')
  if (page.url().indexOf('localhost:4173') < 0) bad('back: the page was left')
  if (page.errors.length) bad('back: page errors ' + page.errors.join(' | '))
  await page.context().close()
}

;(async () => {
  const browser = await launch()
  const fns = { search: searchSection, back: backSection }
  for (const w of want) await fns[w](browser).catch(e => bad(`${w}: crashed: ${e.message.split('\n')[0]}`))
  await browser.close()
  console.log(problems.length ? `${problems.length} problems` : 'search: all good')
  process.exit(problems.length ? 1 : 0)
})()
