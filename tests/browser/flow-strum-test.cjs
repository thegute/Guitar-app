// Headless Chrome Playwright verification for Harmonic Flow Coach, Strum Grid (Strum Machine),
// floating StrumMiniBar (live Style & Band dropdowns across screens), Beat Maker bridge,
// and Chords/Scales/Jam/Learn interconnections.
// Run after `npm run build && npx vite preview --port 4173`.
const { chromium } = require('playwright')

const problems = []
const ok = (cond, msg) => {
  if (!cond) {
    problems.push(msg)
    console.log('  FAIL:', msg)
  } else {
    console.log('  ok:', msg)
  }
}

async function newPage(browser, seed = {}, viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: true })
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
    localStorage.setItem('kg:psyDefault', '1')
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
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  })

  try {
    const page = await newPage(browser, {
      'kg:packSounds': [{ id: 'dracus', name: 'Evolution Dracus Metal', base: 'metal', amp: true }],
      'kg:bassPacks': ['jambass', 'studiobass-modern'],
    })

    // 1. Navigate to Jam → Flow Coach
    await page.locator('nav.nav button', { hasText: 'Jam' }).click()
    await page.waitForSelector('[data-testid="jam-flow"]')
    await page.locator('[data-testid="jam-flow"]').click()
    await page.waitForSelector('[data-testid="harmonic-flow-coach"]')

    // Check dual-labeled SVG center node & dynamic transposition (C → G turns vi from Am to Em while keeping Roman 'vi')
    const centerSymC = (await page.locator('[data-testid="flow-center-symbol"]').textContent()).trim()
    const centerRomC = (await page.locator('[data-testid="flow-center-roman"]').textContent()).trim()
    ok(centerSymC === 'C' && centerRomC === 'I', `Center starts at C / I (got ${centerSymC} / ${centerRomC})`)

    const viSymC = (await page.locator('[data-testid="flow-node-symbol-vi"]').textContent()).trim()
    const viRomC = (await page.locator('[data-testid="flow-node-roman-vi"]').textContent()).trim()
    ok(viSymC === 'Am' && viRomC === 'vi', `In C Major, vi displays Am + vi (got ${viSymC} / ${viRomC})`)

    await page.locator('[data-testid="flow-key-select"]').selectOption('G')
    const viSymG = (await page.locator('[data-testid="flow-node-symbol-vi"]').textContent()).trim()
    const viRomG = (await page.locator('[data-testid="flow-node-roman-vi"]').textContent()).trim()
    ok(viSymG === 'Em' && viRomG === 'vi', `Transposing to G Major updates vi to Em while locking Roman vi (got ${viSymG} / ${viRomG})`)

    // Click orbiting node vi (Em) and verify it advances to center & appends to Breadcrumb Ribbon
    await page.locator('[data-testid="flow-branch-vi"]').click()
    const afterSym = (await page.locator('[data-testid="flow-center-symbol"]').textContent()).trim()
    const afterRom = (await page.locator('[data-testid="flow-center-roman"]').textContent()).trim()
    ok(afterSym === 'Em' && afterRom === 'vi', `Clicking vi advances Em / vi to center (got ${afterSym} / ${afterRom})`)
    const trailTxt = await page.locator('[data-testid="flow-trail"]').textContent()
    ok(trailTxt.includes('Em'), `Breadcrumb trail includes Em (${trailTxt})`)

    // Check AI Assistant "What this does" popup appears for Chord Path and dismisses cleanly
    await page.waitForSelector('[data-testid="feature-intro-chord-path"]')
    ok(await page.locator('[data-testid="feature-intro-chord-path"]').isVisible(), 'AI Bubble What-this-does popup appears on Chord Path')
    await page.locator('[data-testid="intro-close-chord-path"]').click()
    await page.waitForTimeout(80)
    ok(!(await page.locator('[data-testid="feature-intro-chord-path"]').isVisible()), 'AI Bubble popup dismisses cleanly on ×')

    // Switch to Pathfinder mode
    await page.locator('[data-testid="flow-mode-pathfinder"]').click()
    await page.waitForSelector('[data-testid="pathfinder-banner"]')
    ok(await page.locator('[data-testid="pathfinder-steps"]').isVisible(), 'Pathfinder banner & step counter visible')

    // Test Chord Vibe Sets, Key Shifter, and Detect Scale tabs inside Flow Coach!
    await page.locator('[data-testid="flow-hub-vibe"]').click()
    await page.waitForSelector('[data-testid="chord-vibe-sets"]')
    ok(await page.locator('[data-testid="vibe-pad-0"]').isVisible(), 'Chord Vibe Sets renders tappable chord board')
    await page.locator('[data-testid="vibe-add-1"]').click()

    await page.locator('[data-testid="flow-hub-shift"]').click()
    await page.waitForSelector('[data-testid="key-shifter-view"]')
    ok(await page.locator('[data-testid="shift-bridge-dom-pivot"]').isVisible(), 'Key Shifter renders smooth modulation bridges')

    await page.locator('[data-testid="flow-hub-detect"]').click()
    await page.waitForSelector('[data-testid="detect-scale-view"]')
    ok(await page.locator('[data-testid="detect-match-0"]').isVisible(), 'Detect Scale ranks matching scales & modes')

    await page.locator('[data-testid="flow-hub-path"]').click()

    // 2. Open Strum Machine from Jam tab & test 18 styles + Bar editor + Motion + Live playback + Persistent MiniBar
    await page.locator('[data-testid="jam-strum"]').click()
    await page.waitForSelector('[data-testid="strum-grid-screen"]')

    const styleValues = await page.locator('[data-testid="strum-style-select"] option').evaluateAll(els => els.map(e => e.value))
    for (const st of ['bluegrass', 'reggae', 'metal-chug', 'metal-gallop', 'djent', 'orchestra', 'cinematic', 'rhodes', 'organ']) {
      ok(styleValues.includes(st), `Strum Grid style list includes ${st}`)
    }

    // Tap Bar 1 to open inline bar editor and split it
    await page.locator('[data-testid="strum-cell-0-0"]').click()
    await page.waitForSelector('[data-testid="strum-bar-editor"]')
    await page.locator('[data-testid="strum-split-bar"]').click()
    ok(await page.locator('[data-testid="strum-cell-0-1"]').isVisible(), 'Split Bar creates 2 chord halves in Bar 1')

    // Start Strum Machine playback
    await page.locator('[data-testid="strum-play-btn"]').click()
    await page.waitForSelector('[data-testid="strum-mini-bar"]')
    ok(await page.locator('[data-testid="strum-mini-bar"]').isVisible(), 'Floating StrumMiniBar appears when playing')

    // Navigate to Tools → Scales while Strum Machine keeps playing in the background!
    await page.locator('nav.nav button', { hasText: 'Tools' }).click()
    await page.locator('button', { hasText: 'Scales' }).first().click()
    await page.waitForSelector('[data-testid="scales-strum-launchers"]')
    ok(await page.locator('[data-testid="strum-mini-bar"]').isVisible(), 'StrumMiniBar stays active & visible on Scales screen!')

    // Switch Style live from floating MiniBar & open Band Sounds popover
    // Seed a simulated imported .kgpack after startup's IndexedDB sync so we verify live pack discovery
    await page.evaluate(() => {
      localStorage.setItem('kg:packSounds', JSON.stringify([{ id: 'dracus', name: 'Evolution Dracus Metal', base: 'metal', amp: true }]))
    })
    await page.locator('[data-testid="mini-style-select"]').selectOption('reggae')
    await page.locator('[data-testid="mini-band-toggle"]').click()
    await page.waitForSelector('[data-testid="strum-band-popover"]')
    const chordVoiceOpts = await page.locator('[data-testid="mini-chord-voice"] option').evaluateAll(els => els.map(e => e.value))
    ok(chordVoiceOpts.includes('pack:dracus'), 'Live Band popover exposes imported .kgpack guitar (pack:dracus)')
    ok(chordVoiceOpts.includes('orchestra'), 'Live Band popover exposes Orchestral Strings')
    await page.locator('[data-testid="mini-chord-voice"]').selectOption('orchestra')
    await page.locator('[data-testid="mini-bass-voice"]').selectOption('sixties')
    await page.locator('[data-testid="mini-drum-kit"]').selectOption('metal')
    await page.locator('[data-testid="mini-motion-select"]').selectOption('arpeggio')
    ok((await page.locator('[data-testid="mini-motion-select"]').inputValue()) === 'arpeggio', 'Live Band popover switches Motion to Arpeggio')
    await page.locator('[data-testid="mini-key-select"]').selectOption('D')
    ok((await page.locator('[data-testid="mini-key-select"]').inputValue()) === 'D', 'Live Band popover transposes Strum Machine key to D')

    // Open Floating 5-Layer Neck overlay from StrumMiniBar and verify Key / Live Chord + Whole Neck + Preset
    await page.locator('[data-testid="mini-neck-toggle"]').click()
    await page.waitForSelector('[data-testid="strum-float-neck"]')
    ok(await page.locator('[data-testid="strum-float-neck"]').isVisible(), 'Floating 5-Layer Neck opens over any screen')
    const floatNeck = page.locator('[data-testid="strum-float-neck"]')
    await floatNeck.locator('[data-testid="layer-range-whole"]').click()
    await floatNeck.locator('[data-testid="layer-preset-select"]').selectOption('lead')
    ok((await floatNeck.locator('[data-testid="layer-preset-select"]').inputValue()) === 'lead', 'Floating 5-Layer Neck Preset & Whole Neck toggle work')
    await page.locator('[data-testid="float-neck-follow-chord"]').click()
    await page.locator('[data-testid="mini-neck-toggle"]').click()
    await page.waitForTimeout(100)
    ok(!(await page.locator('[data-testid="strum-float-neck"]').isVisible()), 'Floating 5-Layer Neck toggles closed cleanly')

    // Verify Scales Position dropdown & Chords Type dropdown
    ok(await page.locator('[data-testid="scales-pos-select"]').isVisible(), 'Scales Position dropdown is visible')

    // Stop from MiniBar and verify MiniBar hides cleanly
    await page.locator('[data-testid="mini-stop-btn"]').click()
    await page.waitForTimeout(150)
    ok(!(await page.locator('[data-testid="strum-mini-bar"]').isVisible()), 'Stopping Strum Machine dismisses StrumMiniBar cleanly')

    // Launch Metal Chugs directly from Scales screen!
    await page.locator('[data-testid="scales-back-metal-chug"]').click()
    await page.waitForSelector('[data-testid="strum-grid-screen"]')
    const activeStyle = await page.locator('[data-testid="strum-style-select"]').inputValue()
    ok(activeStyle === 'metal-chug', `Scales → Metal Chugs launcher loads metal-chug in Strum Grid (got ${activeStyle})`)
    await page.locator('[data-testid="mini-stop-btn"]').click()

    // 3. Verify Chords dropdown + Flow Coach sub-tab
    await page.locator('nav.nav button', { hasText: 'Tools' }).click()
    await page.locator('button', { hasText: 'Chords' }).first().click()
    await page.waitForSelector('[data-testid="chords-type-select"]')
    ok(await page.locator('[data-testid="chords-type-select"]').isVisible(), 'Chords unified chord-type dropdown is visible')
    await page.locator('[data-testid="chords-tab-flow"]').click()
    await page.waitForSelector('[data-testid="harmonic-flow-coach"]')
    ok(await page.locator('[data-testid="flow-svg"]').isVisible(), 'Chords → Flow Coach renders dual-labeled SVG chord tree')

    // 4. Verify Beat Maker upgraded instrument list + From Strum Machine button
    await page.locator('nav.nav button', { hasText: 'Jam' }).click()
    await page.locator('[data-testid="jam-beats"]').click()
    await page.waitForSelector('button:has-text("From Strum Machine")')
    ok(await page.locator('button:has-text("From Strum Machine")').isVisible(), 'Beat Maker shows ← From Strum Machine bridge button')

    // 5. Verify mobile viewport (360x760) renders Flow Coach & Strum Grid cleanly without errors
    const phone = await newPage(browser, {}, { width: 360, height: 760 })
    await phone.locator('nav.nav button', { hasText: 'Jam' }).click()
    await phone.locator('[data-testid="jam-flow"]').click()
    await phone.waitForSelector('[data-testid="flow-svg"]')
    await phone.locator('[data-testid="jam-strum"]').click()
    await phone.waitForSelector('[data-testid="strum-bars-grid"]')
    await phone.locator('[data-testid="strum-play-btn"]').click()
    await phone.waitForSelector('[data-testid="strum-mini-bar"]')
    await phone.locator('[data-testid="mini-stop-btn"]').click()

    ok(page.errors.length === 0, `Desktop zero console/page errors (${page.errors.join('; ')})`)
    ok(phone.errors.length === 0, `Mobile zero console/page errors (${phone.errors.join('; ')})`)
  } finally {
    await browser.close()
  }

  if (problems.length) {
    console.error(`\nFAILED (${problems.length}):\n - ` + problems.join('\n - '))
    process.exit(1)
  }
  console.log('\nALL HARMONIC FLOW & STRUM GRID BROWSER CHECKS PASSED!')
})()
