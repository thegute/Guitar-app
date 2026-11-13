// Probe: how often the Play readout / layout changes while playing (owner: the top bar flashes at high speed).
// node tests/browser/flicker-probe.cjs [time|wait] [cover|inner]
const { chromium } = require('playwright')
const path = require('path')
const DIR = path.join(__dirname, 'out')
const mode = process.argv[2] || 'time'
const size = process.argv[3] === 'inner' ? { width: 840, height: 757 } : { width: 412, height: 915 }
;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${DIR}/ode.wav`, '--autoplay-policy=no-user-gesture-required'] })
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    try { if (sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:askBubble': 'false', 'kg:getReady': '0', 'kg:tab2': '"play"', 'kg:playBand': 'true', 'kg:sbGenre': '"folk"', 'kg:sbLevel': '1' })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  })
  await page.goto('http://localhost:4173/')
  await page.locator('nav.nav button:has-text("Songs")').click()
  await page.locator('.subtabs button:has-text("Songbook"), .lib-chip:has-text("Songbook"), button:has-text("Songbook")').first().click()
  await page.waitForSelector('.songbook-page')
  await page.locator('.sb-part:has-text("Melody")').first().click()
  await page.waitForSelector('.tab-note')
  await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2000 }).catch(() => {})
  if (mode === 'time') await page.locator('.tab-tools >> text=In time').click()
  await page.locator('button.listen').click()
  await page.waitForTimeout(1500)
  const res = await page.evaluate(async () => {
    const log = []
    const snap = () => {
      const r = [...document.querySelectorAll('.readout-box')].map(b => (b.className + '|' + (b.querySelector('.next')?.textContent ?? '')).replace(/\s+/g, ' '))
      const scr = document.querySelector('.play-screen, .play')?.className ?? ''
      return r.join(' || ') + ' ## ' + scr
    }
    let last = snap(), changes = 0
    const t0 = performance.now()
    const samples = []
    await new Promise(res => {
      const step = () => {
        const s = snap()
        if (s !== last) { changes++; if (log.length < 40) log.push(Math.round(performance.now() - t0) + 'ms: ' + s.slice(0, 220)); last = s }
        if (performance.now() - t0 < 8000) requestAnimationFrame(step); else res()
      }
      requestAnimationFrame(step)
    })
    return { changes, log }
  })
  console.log(`${mode} ${size.width}: ${res.changes} changes in 8 s`)
  for (const l of res.log) console.log('  ' + l)
  if (errors.length) console.log('errors', errors)
  await browser.close()
})()
