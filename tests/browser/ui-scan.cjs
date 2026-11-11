// UI scan: walks every screen, page and Learn tool (and every Zero to Hero phase) at phone, Fold cover, Fold inner and
// tablet sizes, and flags squashed text (a long line crammed into a thin column, a word or two per line), page
// sideways scrolling, words cut off inside buttons, and page errors. Needs `vite preview` on :4173 and CHROME_PATH.
// Usage: node tests/browser/ui-scan.cjs [phone,cover,inner,tablet]
const { chromium } = require('playwright')
const path = require('path')
const SIZES = { phone: { width: 360, height: 760 }, cover: { width: 412, height: 915 }, inner: { width: 840, height: 757 }, tablet: { width: 1024, height: 1366 } }
const want = (process.argv[2] || 'phone,cover,inner,tablet').split(',')
const OUT = path.join(__dirname, 'out')
const problems = new Map()
const bad = (where, m) => { const k = m; if (!problems.has(k)) problems.set(k, new Set()); problems.get(k).add(where) }

async function scan(page, where) {
  const r = await page.evaluate(() => {
    const out = []
    const W = document.documentElement.clientWidth
    if (document.documentElement.scrollWidth > W + 1) out.push('page scrolls sideways')
    const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 }
    for (const el of document.querySelectorAll('main *, .sheet *, .search-sheet *, .talk-card *')) {
      if (!vis(el)) continue
      if (el.closest('svg, .tab-view, .fretboard, .chips, .chain-strip, .prog-strip, [aria-hidden="true"]')) continue
      // own text (not children's)
      let own = ''
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent
      own = own.trim()
      const b = el.getBoundingClientRect()
      const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3
      // squashed: a sentence crammed into a thin column
      const lines = Math.round(b.height / lh)
      if (own.length >= 18 && own.split(/\s+/).length >= 4 && lines >= 3 && b.width < 150 && own.length / lines < 14) {
        out.push(`squashed text "${own.slice(0, 40)}" (${Math.round(b.width)} px wide, ${lines} lines) in ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`)
      }
      // words cut off inside a button or label
      if ((el.tagName === 'BUTTON' || el.tagName === 'LABEL') && own.length > 2) {
        const s = getComputedStyle(el)
        if ((s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.whiteSpace === 'nowrap') && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== 'ellipsis') out.push(`cut-off text "${own.slice(0, 30)}" in ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`)
      }
      // something poking out past the right edge of the screen
      if (b.right > W + 2 && b.width < W && !el.closest('.chips, .chain-strip, .tab-view, .fb-scroll, [style*="overflow"]')) {
        const s = getComputedStyle(el.parentElement || el)
        if (!/auto|scroll|hidden/.test(s.overflowX)) out.push(`off the right edge: ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} (${Math.round(b.right)} > ${W})`)
      }
    }
    return [...new Set(out)].slice(0, 12)
  })
  for (const m of r) bad(where, m)
  if (page.errors.length) { for (const e of page.errors) bad(where, 'page error: ' + e.slice(0, 160)); page.errors = [] }
}

async function newPage(browser, vp, seed = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource|AudioContext/i.test(m.text())) page.errors.push('console: ' + m.text()) })
  await page.addInitScript(s => {
    try { if (sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:askBubble', 'false'); localStorage.setItem('kg:getReady', '0')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  if (process.env.INJECT_CSS) await page.addStyleTag({ content: process.env.INJECT_CSS })
  await page.waitForTimeout(800)
  return page
}
// Play has no menu button any more (songs open in the song player): the Now playing bar goes back to it
const nav = (page, label) => label === 'Play' ? page.locator('[data-testid=now-playing]').count().then(c => (c ? page.locator('[data-testid=now-playing]').click() : null)) : page.locator(`nav.nav button:has-text("${label}")`).first().click()
const subs = async page => page.locator('.subtabs [role=tab]').allTextContents()
// Jam's pages are three big choices now (+ the Riff Scanner link); old names still work here
const JAM_ALIAS = { 'Jam': 'Play with a band', 'Looper': 'Loop myself', 'Beat maker': 'Make a beat' }
const sub = (page, label) => label === 'Riff Scanner' ? page.locator('[data-testid=jam-scan-link]').click() : page.locator(`.subtabs [role=tab]:has-text("${JAM_ALIAS[label] ?? label}")`).first().click()

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
  for (const sz of want) {
    const vp = SIZES[sz]
    // every tab and sub-page
    const page = await newPage(browser, vp)
    for (const tab of ['Play', 'Songs', 'Learn', 'Jam', 'Tools']) {
      await nav(page, tab); await page.waitForTimeout(500)
      await scan(page, `${sz} ${tab}`)
      const names = (await subs(page)).map(t => t.replace(/\d+$/, '').trim()).filter(Boolean)
      for (const n of names) { await sub(page, n); await page.waitForTimeout(450); await scan(page, `${sz} ${tab} → ${n}`) }
    }
    // Play options sheet and music stand
    await page.locator('[data-testid=now-playing]').click(); await page.waitForTimeout(400)
    await page.locator('.song-check button:has-text("Got it")').click({ timeout: 1500 }).catch(() => {})
    await page.locator('button.opts-btn').click().catch(() => {}); await page.waitForTimeout(400); await scan(page, `${sz} Play → Options`)
    await page.keyboard.press('Escape').catch(() => {}); await page.locator('.play-opts button:has-text("Done"), .sheet button:has-text("Close")').first().click({ timeout: 800 }).catch(() => {})
    await page.goBack().catch(() => {}); await page.waitForTimeout(300)
    // Learn tools
    await nav(page, 'Learn'); await sub(page, 'Explore'); await page.waitForTimeout(300)
    const tools = await page.locator('.tool b').allTextContents()
    for (const t of tools) {
      await nav(page, 'Learn'); await sub(page, 'Explore'); await page.waitForTimeout(250)
      await page.locator(`.tool:has-text("${t}")`).first().click().catch(() => {})
      await page.waitForTimeout(700)
      await scan(page, `${sz} Learn → ${t}`)
      // open the first item inside lists (a lesson, a lick, a technique) one level deep
      const inner = page.locator('.lesson-list button, .lick-list button, .tech-list button, .lick-row').first()
      if (await inner.count()) { await inner.click().catch(() => {}); await page.waitForTimeout(500); await scan(page, `${sz} Learn → ${t} → first item`) }
    }
    // Settings pages
    await nav(page, 'Learn'); await page.locator('button[aria-label="Settings"]').first().click().catch(() => {}); await page.waitForTimeout(400)
    for (const n of (await subs(page)).map(t => t.trim())) { await sub(page, n); await page.waitForTimeout(350); await scan(page, `${sz} Settings → ${n}`) }
    await page.screenshot({ path: path.join(OUT, `scan-${sz}-settings.png`) }).catch(() => {})
    await page.context().close()
    // Zero to Hero: the start check, then every phase with a style path followed and the whole plan open
    {
      const p0 = await newPage(browser, vp, { 'kg:sub:learn': '"course"' })
      await nav(p0, 'Learn'); await p0.waitForTimeout(500); await scan(p0, `${sz} Zero to Hero start check`)
      await p0.context().close()
    }
    for (const phase of [1, 2, 3, 4, 5]) {
      const p = await newPage(browser, vp, { 'kg:sub:learn': '"course"', 'kg:z2h': { phase, since: Date.now() - 40 * 864e5, lastGate: Date.now() - 40 * 864e5, placed: true, ticks: [], paths: ['flatpick', 'songwriter'] } })
      await nav(p, 'Learn'); await p.waitForTimeout(600)
      await p.locator('.z2h button:has-text("See the whole plan")').click().catch(() => {})
      await p.waitForTimeout(300)
      await scan(p, `${sz} Zero to Hero phase ${phase}`)
      if (phase === 2) await p.screenshot({ path: path.join(OUT, `scan-${sz}-z2h.png`), fullPage: true }).catch(() => {})
      await p.context().close()
    }
    console.log(`${sz}: scanned`)
  }
  await browser.close()
  if (!problems.size) { console.log('\nUI scan: all good'); process.exit(0) }
  for (const [m, where] of problems) console.log(`  ${m}\n      at ${[...where].slice(0, 6).join(' | ')}${where.size > 6 ? ` (+${where.size - 6} more)` : ''}`)
  console.log(`\n${problems.size} kind(s) of problem`)
  process.exit(1)
})()
