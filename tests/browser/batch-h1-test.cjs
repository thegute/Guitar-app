// Batch H1 browser verification: key badges (with spelled-out 'Capo N', never 'C2'), Must-Know Licks search/key filter/'My riffs',
// strict same-key + major/minor Lick Chainer, + Chain inline guard, Save to My Songs, Hear over my Jam band, and no overflow.
// Run after `npm run build && npx vite preview --port 4173`.
const { chromium } = require('playwright')

const problems = []
const ok = (cond, msg) => { if (!cond) { problems.push(msg); console.log('  FAIL:', msg) } }

async function newPage(browser, seed = {}, viewport = { width: 360, height: 760 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message))
  page.on('console', m => {
    if (m.type() === 'error' && !/youtube|ytimg|ERR_|net::|Failed to load resource/i.test(m.text())) {
      page.errors.push('console: ' + m.text())
    }
  })
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1')
    localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:navHidden', '0')
    localStorage.setItem('kg:getReady', '0')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('nav.nav')
  return page
}

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })

  try {
    // 1. Songs + Songbook key badges & zero sideways overflow (phone 360px)
    {
      const page = await newPage(browser, { 'kg:tab2': 'songs', 'kg:theme': 'psy' }, { width: 360, height: 760 })
      await page.waitForSelector('.songbook-list .sb-song')
      const sbTags = await page.locator('.songbook-list .sb-title .key-tag').allTextContents()
      ok(sbTags.length >= 5, `Songbook renders discreet .key-tag badges (${sbTags.length})`)
      ok(sbTags.every(t => /^[A-G][#b]?m?$/.test(t)), `Songbook key tags formatted cleanly: ${sbTags.slice(0, 5).join(', ')}`)
      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
      ok(ov <= 0, `Songs/Songbook has no horizontal overflow on 360px (${ov})`)
      ok(page.errors.length === 0, `Songs no console/page errors: ${page.errors.join(' | ')}`)
      await page.context().close()
    }

    // 2. Must-Know Licks: key badges, Search, My riffs option, Key filter, + Chain guard & Capo N spelling
    {
      const page = await newPage(browser, { 'kg:tab2': 'learn', 'kg:sub:learn': 'explore', 'kg:theme': 'night' }, { width: 360, height: 760 })
      await page.locator('button:has-text("Must-know licks")').click()
      await page.waitForSelector('.lick-library')

      // Check My riffs in Style selector
      const styleOpts = await page.locator('[data-testid="lick-style"] option').allTextContents()
      ok(styleOpts.some(o => /^My riffs/.test(o)), `Style dropdown has My riffs option (${styleOpts.slice(0, 3).join(', ')})`)

      // Check Key badges on lick cards
      const badges = await page.locator('.lick-card .key-tag').allTextContents()
      ok(badges.length >= 3, `Lick cards show key tags (${badges.length})`)

      // Search box: Buckethead across All styles
      await page.locator('[data-testid="lick-style"]').selectOption('all')
      await page.locator('[data-testid="lick-search"]').fill('Buckethead')
      const bhTitles = await page.locator('.lick-card b').allTextContents()
      ok(bhTitles.length >= 1 && bhTitles.some(t => /Soothsayer|Bucket|Chicken/i.test(t)), `Search "Buckethead" matches (${bhTitles.join(', ')})`)
      await page.locator('[data-testid="lick-search"]').fill('')

      // Filter by Em (4:1)
      await page.locator('[data-testid="lick-key-filter"]').selectOption('4:1')
      await page.waitForTimeout(100)
      const emBadges = await page.locator('.lick-card .key-tag').allTextContents()
      ok(emBadges.length >= 1 && emBadges.every(b => b === 'Em'), `Em filter shows only Em licks (${emBadges.slice(0, 5).join(', ')})`)

      // Tap + Chain on first Em lick -> adds directly without prompt
      await page.locator('.lick-card button:has-text("Chain")').first().click()
      const firstToast = await page.locator('.lick-card button').filter({ hasText: /In chain/ }).count()
      ok(firstToast === 1, 'First Em lick adds directly to empty chain')

      // Switch filter to Am (9:1) and tap + Chain -> shows mismatch prompt WITH Match to Em
      await page.locator('[data-testid="lick-key-filter"]').selectOption('9:1')
      await page.waitForTimeout(100)
      await page.locator('.lick-card button:has-text("Chain")').first().click()
      await page.waitForSelector('[data-testid="chain-mismatch-prompt"]')
      const amPromptText = await page.locator('[data-testid="chain-mismatch-prompt"]').textContent()
      ok(/locked to Em/i.test(amPromptText) && /Match to Em/.test(amPromptText) && /Start new Am chain/.test(amPromptText),
        `Am mismatch prompt shows Start new Am chain & Match to Em: ${amPromptText}`)
      await page.locator('[data-testid="chain-mismatch-prompt"] button:has-text("Match to Em")').click()
      ok(await page.locator('[data-testid="chain-mismatch-prompt"]').count() === 0, 'Match to Em closes prompt')

      // Switch filter to G major (7:0) -> prompt MUST NOT offer Match to Em (different quality: Major vs Minor)
      await page.locator('[data-testid="lick-key-filter"]').selectOption('7:0')
      await page.waitForTimeout(100)
      await page.locator('.lick-card button:has-text("Chain")').first().click()
      await page.waitForSelector('[data-testid="chain-mismatch-prompt"]')
      const matchBtnCount = await page.locator('[data-testid="chain-mismatch-prompt"] button:has-text("Match to")').count()
      ok(matchBtnCount === 0, 'Major lick G cannot Match to minor chain Em')
      await page.locator('[data-testid="chain-mismatch-prompt"] button:has-text("Start new G chain")').click()

      // Check Capo spelling ("Capo N", never "C2") on a bluegrass capo lick detail
      await page.locator('[data-testid="lick-key-filter"]').selectOption('all')
      await page.locator('[data-testid="lick-style"]').selectOption('bluegrass')
      await page.locator('.lick-card-open').first().click()
      await page.waitForSelector('.lick-detail')
      await page.locator('.lick-detail .chips button:text-is("A")').click()
      const detailTag = await page.locator('.lick-detail .key-tag').textContent()
      ok(/Capo 2/.test(detailTag) && !/\bC2\b/.test(detailTag), `Bluegrass lick transposed +2 shows "Capo 2" (got "${detailTag}")`)

      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
      ok(ov <= 0, `Must-know licks has no horizontal overflow on 360px (${ov})`)
      ok(page.errors.length === 0, `Must-know licks no errors: ${page.errors.join(' | ')}`)
      await page.context().close()
    }

    // 3. Lick Chainer: All styles chip, strict same-key lock, transpose toggle, Save to My Songs, Hear over my Jam band
    {
      const jamProg = [
        { degree: 1, roman: 'I', root: 'G', symbol: 'G', label: 'G', beats: 4 },
        { degree: 5, roman: 'V', root: 'D', symbol: 'D', label: 'D', beats: 4 },
      ]
      const page = await newPage(browser, {
        'kg:tab2': 'learn',
        'kg:sub:learn': 'explore',
        'kg:theme': 'day',
        'kg:jamProg': jamProg,
        'kg:progKey': 'G',
        'kg:progMode': 'major',
      }, { width: 1366, height: 768 })
      await page.locator('button:has-text("Lick chainer")').click()
      await page.waitForSelector('.lick-chainer')

      ok(await page.locator('[data-testid="chain-all-styles"]').count() === 1, 'Lick Chainer shows "All styles" chip')
      await page.locator('[data-testid="chain-all-styles"]').click()

      // Start empty chain with first G major lick from key filter
      await page.locator('[data-testid="chain-key-filter"]').selectOption('7:0')
      await page.waitForTimeout(100)
      await page.locator('.chain-pick-add').first().click()
      await page.waitForSelector('[data-testid="chain-lock-bar"]')

      const lockText = await page.locator('[data-testid="chain-lock-bar"]').textContent()
      ok(/G/.test(lockText), `Chain locked to G: ${lockText}`)
      const chkState = await page.locator('[data-testid="chain-allow-transpose"]').isChecked()
      ok(chkState === false, 'Include transposed licks toggle starts OFF by default')

      const strictTags = await page.locator('.chain-pick .key-tag').allTextContents()
      ok(strictTags.length >= 1 && strictTags.every(t => t === 'G'), `Strict pool only lists G licks (${strictTags.slice(0, 6).join(', ')})`)

      // Enable transpose toggle -> adds more major keys cleanly
      await page.locator('[data-testid="chain-allow-transpose"]').check()
      await page.waitForTimeout(100)
      const expandedCount = await page.locator('.chain-pick').count()
      ok(expandedCount > strictTags.length, `Allow transpose expands pool (${strictTags.length} -> ${expandedCount})`)

      // Hear over my Jam band button works
      ok(await page.locator('[data-testid="chain-hear-band"]').count() === 1, 'Hear over my Jam band button present')
      await page.locator('[data-testid="chain-hear-band"]').click()
      await page.waitForTimeout(200)
      const stopTxt = await page.locator('[data-testid="chain-hear-band"]').textContent()
      ok(/Stop band/.test(stopTxt), `Button toggles to Stop band (${stopTxt})`)
      await page.locator('[data-testid="chain-hear-band"]').click()

      // Save chain to My Songs -> verify in Songs -> Library -> Mine with key badge
      await page.locator('[data-testid="chain-save-song"]').click()
      await page.waitForTimeout(250)
      const savedTxt = await page.locator('[data-testid="chain-save-song"]').textContent()
      ok(/Saved to My Songs/.test(savedTxt), `Save button confirms save (${savedTxt})`)

      await page.locator('nav button:has-text("Songs")').click()
      await page.locator('[data-testid="lib-mine"]').click()
      await page.waitForSelector('.song-list')
      const myTitles = await page.locator('.song-title-row').allTextContents()
      ok(myTitles.some(t => /My lick chain in G/.test(t)), `Saved chain appears in My Songs with G badge (${myTitles.join(' | ')})`)

      // Exercises: key-based shows .key-tag, WU-1 omits .key-tag
      await page.locator('nav button:has-text("Learn")').click()
      await page.locator('.subtabs button:has-text("Exercises")').click()
      await page.waitForSelector('.ex-browser')
      const hasExKeyTag = await page.locator('.ex-card-head .key-tag').count()
      const exTitle = await page.locator('.ex-card-head').textContent()
      if (/WU-1/.test(exTitle)) {
        ok(hasExKeyTag === 0, 'Non-key drill WU-1 omits key badge')
      }
      await page.locator('.ex-filters select').nth(1).selectOption('lick:bluegrass')
      await page.waitForTimeout(150)
      await page.locator('.ex-settings select').first().selectOption('A')
      await page.waitForTimeout(150)
      const exBgTag = await page.locator('.ex-card-head .key-tag').textContent()
      ok(/A.*Capo 2/.test(exBgTag) && !/\bC2\b/.test(exBgTag), `Bluegrass exercise shows spelled-out Capo 2 (got "${exBgTag}")`)

      const ov = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)
      ok(ov <= 0, `Desktop 1366px has no horizontal overflow (${ov})`)
      ok(page.errors.length === 0, `Lick Chainer / Exercises no errors: ${page.errors.join(' | ')}`)
      await page.context().close()
    }
  } finally {
    await browser.close()
  }

  console.log(`Batch H1 browser verification: ${problems.length ? problems.length + ' problem(s)' : 'ALL PASSED'}`)
  if (problems.length) process.exit(1)
})()
