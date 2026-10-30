// The big update (builds 18–22) in the browser.
//   ready    In time and the rhythm trainer wait for the get-ready countdown; Back cancels it; the setting is in Settings
//   web      the computer browser: desktop sizes, every section, no overflow or errors, computer wording for inputs,
//            the web manifest
//   tuner    the tuner turns the mic on by itself and reads a slightly flat low E (synthesized fake mic) to the cent,
//            with frequency, advice and the string; Auto/picked strings; no errors; screenshots in three looks
// Run with the preview server on :4173:  node tests/browser/build18-test.cjs [section ...]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })
const ALL = ['ready', 'tuner', 'web']
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL
const problems = []
const bad = (m) => { problems.push(m); console.log('  PROBLEM', m) }
const SIZES = { phone: { width: 360, height: 760 }, cover: { width: 412, height: 915 }, inner: { width: 840, height: 757 }, laptop: { width: 1366, height: 768 }, desktop: { width: 1920, height: 1080 } }

/** a WAV of plucked notes (midi, cents) re-plucked every `every` seconds */
function wav(name, notes, every = 2.5) {
  const SR = 48000, total = Math.ceil(notes.length * every * SR)
  const buf = new Float32Array(total)
  notes.forEach(([m, c], i) => {
    const f = 440 * Math.pow(2, (m - 69 + c / 100) / 12)
    const t0 = Math.floor(i * every * SR)
    for (let k = 0; k < every * SR && t0 + k < total; k++) {
      const t = k / SR
      const env = Math.min(1, t / 0.004) * Math.exp(-t * 0.9)
      let v = 0
      for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * Math.sqrt(1 + 1e-4 * h * h) * t + h) * Math.exp(-t * h * 0.6) / h
      buf[t0 + k] = 0.3 * env * v + (Math.random() - 0.5) * 0.002
    }
  })
  const out = Buffer.alloc(44 + total * 2)
  out.write('RIFF', 0); out.writeUInt32LE(36 + total * 2, 4); out.write('WAVE', 8)
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22)
  out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34)
  out.write('data', 36); out.writeUInt32LE(total * 2, 40)
  for (let i = 0; i < total; i++) out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2)
  const file = path.join(DIR, name)
  fs.writeFileSync(file, out)
  return file
}

async function launch(file) {
  return chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', ...(file ? [`--use-file-for-fake-audio-capture=${file}`] : [])],
  })
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
const sub = (page, label) => page.locator(`.subtabs [role=tab]:has-text("${label}")`).first().click()

async function ready(browser) {
  const page = await newPage(browser, { 'kg:getReady': 3, 'kg:playMode': 'time' })
  await page.waitForSelector('.tab-tools')
  const close = page.locator('.song-check button:has-text("Got it")')
  if (await close.count()) await close.first().click()
  await page.locator('.play-head .btn.listen').click()
  const shown = await page.waitForSelector('.get-ready-num', { timeout: 2000 }).then(() => true).catch(() => false)
  if (!shown) bad('ready: no countdown before In time')
  const first = await page.locator('.get-ready-num').textContent().catch(() => '')
  const runningEarly = await page.locator('.play-head .btn.listen.on').count()
  if (runningEarly) bad('ready: In time started before the countdown')
  await page.waitForTimeout(3600)
  const gone = !(await page.locator('.get-ready').count())
  const running = await page.locator('.play-head .btn.listen.on').count()
  console.log(`  ready: countdown from ${first}, then running ${!!running}`)
  if (!gone || !running) bad('ready: In time did not start after the countdown')
  await page.locator('.play-head .btn.listen').click()
  // Back cancels a countdown
  await page.locator('.play-head .btn.listen').click()
  await page.waitForSelector('.get-ready-num')
  await page.goBack().catch(() => {})
  await page.waitForTimeout(1500)
  if (await page.locator('.get-ready').count()) bad('ready: Back did not cancel the countdown')
  if (await page.locator('.play-head .btn.listen.on').count()) bad('ready: In time started after the countdown was cancelled')
  // the rhythm trainer counts down too
  await nav(page, 'Learn'); await sub(page, 'Explore')
  await page.locator('button:has-text("Rhythm trainer")').first().click()
  await page.locator('button.btn.primary.big:has-text("Start")').click()
  const rt = await page.waitForSelector('.get-ready-num', { timeout: 2000 }).then(() => true).catch(() => false)
  if (!rt) bad('ready: no countdown before the rhythm trainer')
  // the setting
  await page.goBack(); await page.waitForTimeout(300)
  await page.goBack(); await page.waitForTimeout(300)
  await nav(page, 'Learn'); await sub(page, 'Today')
  await page.locator('button[aria-label=Settings]').click()
  await sub(page, 'You')
  const chips = await page.locator('[aria-label="Seconds before timed practice starts"] button').allTextContents()
  if (chips.join() !== 'Off,3 s,5 s,8 s') bad(`ready: setting shows ${chips.join()}`)
  if (page.errors.length) bad('ready: page errors ' + page.errors.join(' | '))
  await page.context().close()
}

async function tuner() {
  const file = wav('tuner-e2.wav', [[40, -12], [40, -12], [40, -12], [40, -12]])
  const browser = await launch(file)
  for (const [theme, size] of [['psy', 'cover'], ['day', 'inner'], ['night', 'phone']]) {
    const page = await newPage(browser, { 'kg:theme': theme, 'kg:tab2': 'tools', 'kg:toolPage': 'tuner' }, SIZES[size])
    // no Start needed: the mic turns on by itself
    const on = await page.waitForSelector('button:has-text("Pause tuner")', { timeout: 4000 }).then(() => true).catch(() => false)
    if (!on) bad(`tuner ${theme}: the mic did not turn on by itself`)
    let read = null
    for (let i = 0; i < 30 && !read; i++) {
      await page.waitForTimeout(250)
      const name = (await page.locator('.tuner-name').textContent().catch(() => '')) ?? ''
      const cents = (await page.locator('.tuner-cents').textContent().catch(() => '')) ?? ''
      if (/^E/.test(name) && cents) read = { name, cents }
    }
    await page.waitForTimeout(1200)
    const name = await page.locator('.tuner-name').textContent().catch(() => '')
    const cents = await page.locator('.tuner-cents').textContent().catch(() => '')
    const advice = await page.locator('.tuner-advice').textContent().catch(() => '')
    const hz = await page.locator('.tuner-hz').textContent().catch(() => '')
    console.log(`  tuner ${theme}: ${name} ${cents} | ${advice} | ${hz}`)
    const c = parseFloat((cents ?? '').replace('−', '-').replace('±', ''))
    if (!/^E2/.test(name ?? '') || !(c <= -10 && c >= -14)) bad(`tuner ${theme}: read ${name} ${cents} for a low E 12 cents flat`)
    if (!/flat/.test(advice ?? '')) bad(`tuner ${theme}: advice "${advice}"`)
    if (!/Hz/.test(hz ?? '') || !/target 82\.41/.test(hz ?? '')) bad(`tuner ${theme}: frequency line "${hz}"`)
    const heard = await page.locator('.tuner-string.heard').textContent().catch(() => '')
    if (!/^E/.test(heard ?? '')) bad(`tuner ${theme}: the low E string not highlighted (${heard})`)
    const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    if (ov) bad(`tuner ${theme}: sideways overflow`)
    await page.screenshot({ path: path.join(DIR, `tuner-${theme}-${size}.png`) })
    // pick the A string: the same note now reads as far below A
    if (theme === 'psy') {
      await page.locator('.tuner-strings button[aria-label^="String 5,"]').click()
      await page.waitForTimeout(1500)
      const adv = await page.locator('.tuner-advice').textContent().catch(() => '')
      console.log('  tuner with A picked:', adv)
      if (!/semitones low/.test(adv ?? '')) bad(`tuner: with A picked, a low E should read as semitones low (${adv})`)
      await page.locator('.tuner-strings button:has-text("Auto")').click()
    }
    if (page.errors.length) bad(`tuner ${theme}: page errors ${page.errors.join(' | ')}`)
    await page.context().close()
  }
  await browser.close()
}

async function web(browser) {
  for (const size of ['laptop', 'desktop']) {
    const ctx = await browser.newContext({ viewport: SIZES[size], deviceScaleFactor: 1, permissions: ['microphone'] })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; localStorage.clear(); localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:getReady', '0'); sessionStorage.setItem('seeded', '1') })
    await page.goto('http://localhost:4173/')
    await page.waitForSelector('nav.nav')
    for (const t of ['Play', 'Songs', 'Learn', 'Jam', 'Tools']) {
      await nav(page, t)
      await page.waitForTimeout(500)
      const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      if (ov) bad(`web ${size}: sideways overflow on ${t}`)
      await page.screenshot({ path: path.join(DIR, `web-${size}-${t.toLowerCase()}.png`) })
    }
    // computer wording for the input
    await nav(page, 'Play')
    const close = page.locator('.song-check button:has-text("Got it")')
    if (await close.count()) await close.first().click()
    await page.locator('.play .input-btn').first().click()
    const txt = await page.locator('.sheet').first().textContent().catch(() => '')
    if (!/Computer microphone/.test(txt ?? '')) bad(`web ${size}: the input list still talks about a phone`)
    const man = await page.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); if (!l) return null; const r = await fetch(l.href); return r.ok ? (await r.json()).name : null })
    if (man !== 'KGuitar') bad(`web ${size}: no web manifest (${man})`)
    if (errors.length) bad(`web ${size}: page errors ${errors.join(' | ')}`)
    await ctx.close()
  }
}

;(async () => {
  const browser = await launch()
  const fns = { ready: () => ready(browser), tuner, web: () => web(browser) }
  for (const w of want) await fns[w]().catch(e => bad(`${w}: crashed: ${e.message.split('\n')[0]}`))
  await browser.close()
  console.log(problems.length ? `${problems.length} problems` : 'build 18: all good')
  process.exit(problems.length ? 1 : 0)
})()
