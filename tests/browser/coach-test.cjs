// The coach on Play: after a whole run with a bar under 80% the card comes up with one fix and one drill (built-in
// rules with no key; the AI's version, with what it heard, when a Gemini key is set), the Coach button before any
// playing says to play first, and Loop sets the loop. Needs `vite preview` on :4173.
// Usage: node tests/browser/coach-test.cjs [pass,ask,ai,sizes]
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
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
  return page
}
const open = async page => {
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.tab-note', { timeout: 8000 })
  await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {})
}
async function playThrough(page) {
  await page.locator('button.listen').click()
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(500); if (await page.locator('[data-testid=report-card]').count()) return true }
  return false
}
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
const errs = (page, where) => { if (page.errors.length) bad(`${where} page errors: ${page.errors.join(' | ')}`); page.errors = [] }

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${OUT}/ode.wav`, '--autoplay-policy=no-user-gesture-required'],
  })
  const base = { 'kg:tab2': 'play', 'kg:playTidy': false }

  // ---- the Coach button before anything was played
  if (want('ask')) {
    const page = await newPage(browser, { ...base, 'kg:coach': { voice: false } })
    await open(page)
    await page.locator('[data-testid=coach-btn]').click()
    const t = await page.locator('[data-testid=coach-note]').innerText({ timeout: 3000 }).catch(() => '')
    if (!/play it through once/i.test(t)) bad(`Coach before playing should ask for a pass first: "${t}"`)
    errs(page, 'ask'); await page.context().close()
  }

  // ---- after a whole run (the fake mic plays one wrong note in bar 2): the built-in coach
  if (want('pass') || want('sizes')) for (const vp of want('sizes') ? [{ width: 840, height: 757 }, { width: 412, height: 915 }, { width: 360, height: 740 }] : [{ width: 840, height: 757 }]) {
    const page = await newPage(browser, base, vp)
    await open(page)
    if (!(await playThrough(page))) { bad(`${vp.width}: the run never finished`); await page.context().close(); continue }
    const card = page.locator('[data-testid=coach-card]')
    if (!(await card.count())) { bad(`${vp.width}: no coach card after a run with a wrong note`); await page.screenshot({ path: path.join(OUT, `coach-${vp.width}-fail.png`) }); await page.context().close(); continue }
    const fix = await page.locator('[data-testid=coach-fix]').innerText(), drill = await page.locator('[data-testid=coach-drill]').innerText()
    const bar = (/Bar (\d+)/.exec(fix) || [])[1]
    if (!bar) bad(`${vp.width}: the fix should name the bar: "${fix}"`)
    if (!/string/.test(fix) || !/(fret \d+|open)/.test(fix)) bad(`${vp.width}: the fix should name the string and fret: "${fix}"`)
    if (!/loop|slow|times/i.test(drill)) bad(`${vp.width}: no drill: "${drill}"`)
    if ((await card.getAttribute('data-from')) !== 'rules') bad(`${vp.width}: with no key the built-in coach answers`)
    if (await sideways(page)) bad(`${vp.width}: the page scrolls sideways with the coach card`)
    await page.screenshot({ path: path.join(OUT, `coach-${vp.width}.png`) })
    console.log(`  ${vp.width}: ${fix}  //  ${drill}`)
    await page.locator('button.listen').click().catch(() => {})
    const order = await page.locator('.coach-acts .btn').evaluateAll(bs => bs.map(b => b.getAttribute('data-testid')))
    if (order[0] !== 'coach-act-drill' || !order.includes('coach-act-loop') || order[order.length - 1] !== 'coach-act-keep') bad(`${vp.width}: the card's buttons: ${order.join(' ')}`)
    if (!(await page.locator('[data-testid=coach-armed]').count())) bad(`${vp.width}: the card should say the pedal / "try it" starts the first button`)
    if (vp.width === 840) {
      // Try micro-drill: a tiny looped tab of the trouble notes opens In time at 70%, and Back returns to the song
      const title0 = await page.locator('h1, .play-title').first().innerText().catch(() => '')
      await page.locator('[data-testid=coach-act-drill]').click()
      await page.waitForSelector('[data-testid=drill-bar]', { timeout: 4000 }).catch(() => {})
      const db = await page.locator('[data-testid=drill-bar]').innerText().catch(() => '')
      if (!new RegExp(`Drill from bar ${bar}`).test(db) || !/70%/.test(db)) bad(`drill bar: "${db}"`)
      const body = await page.evaluate(() => document.body.innerText)
      if (!/Drill: bar/.test(body)) bad('the drill should be the open tab')
      const nNotes = await page.locator('.tab-note').count()
      if (nNotes < 8 || nNotes > 40) bad(`the drill should be a handful of notes written out four times (${nNotes} notes)`)
      await page.screenshot({ path: path.join(OUT, 'coach-drill.png') })
      await page.locator('[data-testid=drill-back]').click()
      await page.waitForFunction(() => !document.querySelector('[data-testid=drill-bar]'), null, { timeout: 4000 }).catch(() => {})
      const body2 = await page.evaluate(() => document.body.innerText)
      if (!/Ode to Joy/.test(body2) || /Drill from bar/.test(body2)) bad('Back to the song should reopen the song')
      void title0
      errs(page, 'drill'); await page.context().close(); continue
    }
    // Hear it, then you: the tab's bars play, then your own take of them (from the listener's tape)
    if (!(await page.locator('[data-testid=coach-act-compare]').count())) bad(`${vp.width}: no "Hear it, then you" after a run`)
    else {
      await page.locator('[data-testid=coach-act-compare]').click()
      await page.waitForTimeout(400)
      const lbl = await page.locator('[data-testid=coach-act-compare]').innerText().catch(() => '')
      if (!/Stop/.test(lbl)) bad(`${vp.width}: compare should be playing (button says "${lbl}")`)
      await page.locator('[data-testid=coach-act-compare]').click()
      await page.waitForTimeout(200)
    }
    // Loop: the trouble bar is looped and the card goes
    await page.locator('[data-testid=coach-act-loop]').click()
    await page.waitForTimeout(300)
    if (await card.count()) bad(`${vp.width}: the card should close after Loop`)
    const loopOn = await page.evaluate(b => new RegExp(`bars? ${b}\\b|Loop[^\\n]*\\b${b}\\b`, 'i').test(document.body.innerText), bar)
    if (!loopOn) bad(`${vp.width}: the loop wasn't set on bar ${bar}`)
    errs(page, `pass ${vp.width}`); await page.context().close()
  }

  // ---- with a Gemini key: the AI hears the clip and its fix (and what it heard) replaces the built-in one
  if (want('ai')) {
    const page = await newPage(browser, { ...base, 'kg:coach': { voice: false }, 'kgx:ai': { provider: 'gemini', keys: { gemini: 'test-key' }, models: {} } })
    let asked = null
    await page.route('https://generativelanguage.googleapis.com/**', async r => {
      const body = r.request().postDataJSON?.() ?? {}
      const parts = body.contents?.[0]?.parts ?? []
      const audio = parts.find(p => p.inline_data)
      if (audio) {
        asked = { mime: audio.inline_data.mime_type, bytes: audio.inline_data.data.length, prompt: parts.find(p => p.text)?.text ?? '' }
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"good":"Your first bar was steady.","fix":"Bar 2: reach for the high E string, fret 3, with your ring finger a moment sooner.","drill":"Loop bar 2 slowly, five clean times.","heard":"The note before it is cut short.","spoken":"Your first bar was steady. In bar two, get your ring finger to fret three a little sooner."}' }] } }] }) })
      }
      return r.fulfill({ status: 500, body: '{}' })
    })
    await open(page)
    if (!(await playThrough(page))) bad('ai: the run never finished')
    const card = page.locator('[data-testid=coach-card]')
    await page.waitForFunction(() => document.querySelector('[data-testid=coach-card]')?.getAttribute('data-from') === 'ai', null, { timeout: 8000 }).catch(() => {})
    if ((await card.getAttribute('data-from').catch(() => null)) !== 'ai') bad('ai: the AI coach\'s answer never showed')
    else {
      const heard = await page.locator('[data-testid=coach-heard]').innerText().catch(() => '')
      if (!/cut short/.test(heard) || !/opinion/.test(heard)) bad(`ai: what it heard should show, labelled an opinion: "${heard}"`)
    }
    if (!asked) bad('ai: no clip was sent')
    else {
      if (asked.mime !== 'audio/wav' || asked.bytes < 20000) bad(`ai: the clip looks wrong (${asked.mime}, ${asked.bytes} chars)`)
      if (!/bar \d+: /.test(asked.prompt) || !/string fret/.test(asked.prompt) || !/notes right first time/.test(asked.prompt)) bad('ai: the prompt should carry the bar, the tab and the numbers')
      if (process.env.SHOW) console.log(asked.prompt)
      console.log(`  ai: clip ${Math.round(asked.bytes * 0.75 / 32000 * 10) / 10} s, prompt ${asked.prompt.length} chars`)
    }
    await page.screenshot({ path: path.join(OUT, 'coach-ai.png') })
    errs(page, 'ai'); await page.context().close()
  }

  // ---- Learn → Today: the coach's spots and the weekly check-up, which starts a 5-minute session in the song player
  if (want('today')) {
    const now = Date.now(), DAY = 864e5
    const spot = (bar, at, x = {}) => ({ song: 'ex-ode', title: 'Ode to Joy', bar, loop: { from: bar, to: bar }, kind: 'shift', at, n: 2, ...x })
    const mem = { spots: [spot(3, now - DAY, { best: 0.75 }), spot(6, now - 5 * DAY), spot(1, now - 9 * DAY, { fixedAt: now - 2 * DAY, best: 0.95 })], log: [[now - DAY, 'shift'], [now - 2 * DAY, 'shift'], [now - 3 * DAY, 'shift']], ceilings: { shift: [[now - 9 * DAY, 0.7], [now - DAY, 0.85]] } }
    const page = await newPage(browser, { ...base, 'kg:coachMemory': mem, 'kg:sub:learn': 'today' }, { width: 412, height: 915 })
    await open(page)
    await page.locator('nav >> text=Learn').first().click()
    await page.waitForSelector('[data-testid=coach-checkup]', { timeout: 6000 }).catch(() => {})
    const box = await page.locator('[data-testid=coach-checkup]').innerText().catch(() => '')
    if (!/Weekly check-up/.test(box) || !/fixed 1 trouble spot/.test(box)) bad(`today: check-up card: "${box}"`)
    if ((await page.locator('[data-testid=coach-spot]').count()) < 2) bad('today: the open spots should be listed')
    if (await sideways(page)) bad('today: sideways scroll')
    await page.screenshot({ path: path.join(OUT, 'coach-today.png') })
    await page.locator('[data-testid=coach-checkup-go]').click().catch(() => bad('today: no Start button'))
    await page.waitForSelector('.tab-note', { timeout: 6000 }).catch(() => {})
    const body = await page.evaluate(() => document.body.innerText)
    if (!/Does it hold/.test(body)) bad('today: the check-up session should be running')
    errs(page, 'today'); await page.context().close()
  }

  await browser.close()
  console.log(problems.length ? `\n${problems.length} PROBLEM(S)` : '\ncoach: all good')
  process.exit(problems.length ? 1 : 0)
})()
