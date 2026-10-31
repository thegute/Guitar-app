// Build 25 browser checks: chord peek (hold, then gone 1.5 s after letting go), In time's big count-in, the loop
// shading, Jump back in, Suggested for you, the lick chainer, the helper seeing Play, and no sideways scrolling.
// Needs `vite preview` on :4173 and CHROME_PATH. Usage: node tests/browser/build25-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const DIR = path.join(__dirname)
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
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${DIR}/ode.wav`, '--autoplay-policy=no-user-gesture-required'],
  })
  // ---- chord peek
  {
    const page = await newPage(browser, { 'kg:tab2': 'play' })
    await page.waitForSelector('.play-head')
    await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {})
    const hit = page.locator('.tab-chord-hit').first()
    await hit.waitFor({ timeout: 8000 })
    const box = await hit.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(400)
    const shown = await page.locator('[data-testid=chord-peek]').boundingBox()
    if (!shown) bad('chord peek did not appear on hold')
    else console.log(`peek: ${Math.round(shown.width)}×${Math.round(shown.height)} px at inner-screen size`)
    if (shown && (shown.width < 180 || shown.width > 320)) bad(`peek size off: ${shown.width}`)
    await page.waitForTimeout(1600)
    if (!(await page.locator('[data-testid=chord-peek]').count())) bad('peek went away while still held')
    await page.mouse.up()
    await page.waitForTimeout(900)
    if (!(await page.locator('[data-testid=chord-peek]').count())) bad('peek went away too soon after letting go')
    await page.waitForTimeout(1300)
    if (await page.locator('[data-testid=chord-peek]').count()) bad('peek still there 2.2 s after letting go')
    // the strip chips too
    const chip = page.locator('.prog-chip').first()
    if (await chip.count()) {
      const cb = await chip.boundingBox()
      if (cb) {
        await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await page.mouse.down(); await page.waitForTimeout(300)
        if (!(await page.locator('[data-testid=chord-peek]').count())) bad('peek did not open from the chord strip')
        await page.mouse.up()
      }
    }
    // helper sees Play
    await page.evaluate(() => { localStorage.setItem('kg:askBubble', 'true'); window.dispatchEvent(new Event('kg-bubble')) })
    await page.locator('.ask-bubble').click({ timeout: 3000 }).catch(() => bad('no helper bubble'))
    const sees = await page.locator('[data-testid=ask-sees]').textContent({ timeout: 3000 }).catch(() => '')
    console.log(`helper sees: ${sees}`)
    if (!/Play: ".+", bar \d+/.test(sees)) bad('helper does not say what it can see in Play')
    await page.locator('.search-input, input[type=search]').first().fill('loop this bar slower')
    await page.locator('.ask-btn').click()
    const btn = await page.locator('.ask-a button.primary:has-text("Loop bar")').textContent({ timeout: 5000 }).catch(() => '')
    console.log(`helper command: ${btn}`)
    if (!/Loop bar \d+ at \d+%/.test(btn)) bad('quick command did not offer a loop + speed button')
    else {
      await page.locator('.ask-a button.primary:has-text("Loop bar")').click()
      await page.waitForTimeout(600)
      const chipTxt = await page.locator('.loop-chip').textContent().catch(() => '')
      if (!/Bar \d+/.test(chipTxt)) bad('loop button did not set a loop in Play')
      const band = await page.locator('.tab-loopband').count()
      if (!band) bad('loop bars not shaded')
      console.log(`loop set: ${chipTxt.trim()} · shaded bars ${band}`)
    }
    if (await sideways(page)) bad('Play scrolls sideways')
    if (page.errors.length) bad('peek page errors: ' + page.errors.join(' | '))
    await page.context().close()
  }
  // ---- bubble opens on every tap; hands-free talk (a stand-in for the phone's speech recognition)
  {
    const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:askBubble': true, 'kg:talkVoice': false })
    await page.addInitScript(() => {
      window.SpeechRecognition = window.webkitSpeechRecognition = class {
        start() { setTimeout(() => { this.onresult?.({ results: [Object.assign([{ transcript: window.__say || 'loop section two to three and slow the tempo' }], { isFinal: true })] }); this.onend?.() }, 300) }
        stop() { this.onend?.() } abort() { this.onend?.() }
      }
    })
    await page.reload()
    await page.waitForSelector('.play-head')
    await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {})
    let opened = 0
    for (let i = 0; i < 6; i++) {
      const b = await page.locator('.ask-bubble').boundingBox()
      await page.touchscreen.tap(b.x + b.width / 2 + (i % 3) * 6, b.y + b.height / 2 + (i % 2) * 5)
      await page.waitForTimeout(700)
      if (await page.locator('.search-sheet').count()) opened++
      await page.locator('.search-sheet button:has-text("Close")').click({ timeout: 1500 }).catch(() => {})
      await page.waitForTimeout(200)
    }
    console.log(`bubble opened ${opened} of 6 taps`)
    if (opened < 6) bad(`bubble opened only ${opened} of 6 taps`)
    await page.locator('[data-testid=talk-btn]').click()
    await page.waitForSelector('.talk-did', { timeout: 6000 }).catch(() => bad('talk mode did not do the command'))
    const did = await page.locator('.talk-did').textContent().catch(() => '')
    const chipTxt = await page.locator('.loop-chip').textContent().catch(() => '')
    console.log(`talk: ${did} · loop chip ${chipTxt.trim()}`)
    if (!/Loop bars 2–3 at \d+%/.test(did)) bad('spoken loop + slower not understood')
    if (!/Bars 2–3/.test(chipTxt)) bad('spoken loop not applied in Play')
    if (await page.locator('.search-sheet').count()) bad('talk mode opened the full helper')
    if (page.errors.length) bad('talk page errors: ' + page.errors.join(' | '))
    await page.screenshot({ path: path.join(DIR, 'out', 'b25-talk.png') }).catch(() => {})
    await page.context().close()
  }
  // ---- the helper sees theory lessons and every Tools page
  {
    const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:askBubble': true })
    await page.waitForSelector('.play-head')
    const sees = async () => { await page.locator('.ask-bubble').click(); const t = await page.locator('[data-testid=ask-sees]').textContent({ timeout: 3000 }).catch(() => ''); await page.locator('.search-sheet button:has-text("Close")').click().catch(() => {}); await page.waitForTimeout(200); return t }
    await nav(page, 'Tools')
    for (const [tool, want] of [['Tuner', /Tools → Tuner: /], ['Tempo', /Tools → Tempo: \d+ BPM/], ['Chords', /Tools → Chords: /], ['Scales', /Tools → Scales: /]]) {
      await page.locator(`.subtabs [role=tab]:has-text("${tool}")`).first().click()
      await page.waitForTimeout(300)
      const t = await sees()
      console.log(`sees on ${tool}: ${t.slice(0, 80)}`)
      if (!want.test(t)) bad(`helper doesn't see Tools → ${tool}`)
    }
    await nav(page, 'Learn')
    await sub(page, 'Explore')
    await page.locator('.tool:has-text("Theory lessons")').first().click()
    await page.locator('.lesson-list button, .lesson-row, li button').first().click()
    await page.waitForTimeout(400)
    const t = await sees()
    console.log(`sees on a lesson: ${t.slice(0, 80)}`)
    if (!/Theory lesson ".+"/.test(t)) bad("helper doesn't see the open theory lesson")
    if (page.errors.length) bad('sees page errors: ' + page.errors.join(' | '))
    await page.context().close()
  }
  // ---- Gemini (stand-in): low thinking on Gemini 3, the answer streamed into the chat
  {
    const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:askBubble': true, 'kgx:ai': { provider: 'gemini', keys: { gemini: 'TEST' }, models: { gemini: 'gemini-3-flash-preview' } } })
    let sent = null, url = ''
    await page.route(/generativelanguage\.googleapis\.com/, async route => {
      url = route.request().url(); sent = JSON.parse(route.request().postData() || '{}')
      const chunk = t => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\n\n`
      await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' }, body: chunk('{"reply": "An augmented chord ') + chunk('sounds tense and dreamy') + chunk('.", "open": null}') })
    })
    await page.waitForSelector('.play-head')
    await page.locator('.ask-bubble').click()
    await page.locator('.search-input, input[type=search]').first().fill('what does an augmented chord do')
    await page.locator('.ask-btn').click()
    const ans = await page.locator('.ask-a p').first().textContent({ timeout: 6000 }).catch(() => '')
    console.log(`gemini: ${url.split('?')[0].split('/').pop()} · thinking ${JSON.stringify(sent?.generationConfig?.thinkingConfig)} · "${ans}"`)
    if (!/streamGenerateContent/.test(url)) bad('Gemini answer not streamed')
    if (sent?.generationConfig?.thinkingConfig?.thinkingLevel !== 'low') bad('Gemini 3 not set to low thinking')
    if (ans !== 'An augmented chord sounds tense and dreamy.') bad('streamed answer not shown whole')
    if (page.errors.length) bad('gemini page errors: ' + page.errors.join(' | '))
    await page.context().close()
  }
  // ---- In time count-in
  {
    const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:playMode': 'time' })
    await page.waitForSelector('.play-head')
    await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {})
    await page.locator('button.listen').click()
    const n = await page.locator('[data-testid=count-big]').textContent({ timeout: 6000 }).catch(() => '')
    console.log(`count-in shows: ${n}`)
    if (!/^[1-4]$/.test(n.trim())) bad('no big count-in number')
    await page.waitForTimeout(4000)
    if (await page.locator('[data-testid=count-big]').count()) bad('count-in number stayed after the music started')
    await page.locator('button.listen').click()
    if (page.errors.length) bad('count page errors: ' + page.errors.join(' | '))
    await page.context().close()
  }
  // ---- Jump back in, suggestions, chainer (cover screen and inner)
  for (const vp of [{ width: 412, height: 915 }, { width: 840, height: 757 }, { width: 360, height: 760 }]) {
    const page = await newPage(browser, { 'kg:tab2': 'play' }, vp)
    await page.waitForSelector('.play-head')
    await nav(page, 'Learn')
    await page.waitForSelector('[data-testid=jump-in]')
    const cont = await page.locator('.jump-continue').textContent()
    if (!/Continue/.test(cont)) bad('Jump back in has no Continue')
    await page.locator('.jump-quick').click()
    await page.waitForSelector('.session-bar, [class*=session]', { timeout: 4000 }).catch(() => bad('15-minute session did not start'))
    await page.locator('.session-bar button:has-text("Stop"), button:has-text("Stop session")').first().click({ timeout: 1500 }).catch(() => {})
    await nav(page, 'Songs')
    await sub(page, 'Exercises')
    const cards = await page.locator('.ex-sugg-card').count()
    if (cards !== 3) bad(`suggested cards: ${cards}`)
    await page.locator('.ex-sugg-card').nth(1).click()
    await page.waitForTimeout(300)
    const picked = await page.locator('.ex-sugg-card.on').count()
    if (!picked) bad('tapping a suggestion did not load it')
    // chainer
    await page.locator('.chain-pick-add').first().click()
    await page.locator('.chain-pick-add').nth(1).click()
    await page.locator('.chain-add').click()
    const cars = await page.locator('.chain-car:not(.chain-add)').count()
    if (cars !== 3) bad(`chain has ${cars} licks, want 3`)
    await page.waitForSelector('.lick-chainer .tab-view', { timeout: 4000 }).catch(() => bad('chain preview tab missing'))
    await page.locator('.chain-car .chain-car-btns button[aria-label="Move later"]').first().click()
    if (await sideways(page)) bad(`Exercises scrolls sideways at ${vp.width}`)
    if (page.errors.length) bad(`songs page errors at ${vp.width}: ` + page.errors.join(' | '))
    await page.screenshot({ path: path.join(DIR, 'out', `b25-chain-${vp.width}.png`) }).catch(() => {})
    console.log(`${vp.width}px: jump-in ok, ${cards} suggestions, chain ${cars}`)
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nbuild 25: all good')
  process.exit(problems.length ? 1 : 0)
})()
