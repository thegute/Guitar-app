// Build 14 in the browser: the five-tab menu, tabs across the top of screens, Play's Options panel and the three looks.
//   tour     every screen and sub-tab in Day, Night and Psychedelic on the Fold cover and inner screens (and a small phone
//            and a 12" tablet in Psychedelic): no sideways overflow, no page errors, text readable (contrast check of
//            visible text against what is really behind it), screenshots to look at
//   play     the four controls in view, everything else in Options and still working (speed, numbers, size, split,
//            sound, record), Set up input dot
//   songs    Songs tab: My songs list and empty state, Songbook opens a song in Play, Practice tabs open, Add a song
//            pastes a tab and loads it
//   psy      Psychedelic: art appears on every screen, the moving background stops when motion is switched off,
//            the beat pulse runs only while Jam plays, Day/Night show no psychedelic art
//   guide    every "Show me" in How to use KGuitar lands somewhere (a screen, a tool or a Songs page), no errors
// Run with the preview server on :4173:  node tests/browser/build14-test.cjs [section ...]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })
const ALL = ['tour', 'play', 'songs', 'psy', 'guide']
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL
const problems = []
const bad = (m) => { problems.push(m); console.log('  PROBLEM', m) }
const SIZES = { phone: { width: 360, height: 760 }, cover: { width: 412, height: 915 }, inner: { width: 840, height: 757 }, tablet: { width: 1024, height: 1366 } }

async function launch() {
  return chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
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
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1')
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === 'string' && k === 'kg:psyMotion' ? v : JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('nav.nav')
  return page
}
const nav = (page, label) => page.locator(`nav.nav button:has-text("${label}")`).first().click()
const sub = (page, label) => page.locator(`.subtabs [role=tab]:has-text("${label}")`).first().click()
async function overflow(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth
    const out = []
    for (const el of document.querySelectorAll('.main *')) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      // allowed: things inside sideways scrollers
      let p = el.parentElement, scroller = false
      while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) { scroller = true; break } ; p = p.parentElement }
      if (scroller) continue
      if (r.right > w + 1) out.push(`${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? '').toString().split(' ').slice(0, 2).join('.')} right=${Math.round(r.right)}`)
    }
    return { page: document.documentElement.scrollWidth > w + 1 || document.querySelector('.main').scrollWidth > document.querySelector('.main').clientWidth + 1, els: out.slice(0, 5) }
  })
}
// Contrast of visible text against the colour really painted behind it (screenshot pixels around the text box).
async function contrast(page, name) {
  const boxes = await page.evaluate(() => {
    const out = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode()) && out.length < 400) {
      const t = n.textContent.trim()
      if (t.length < 2) continue
      const el = n.parentElement
      if (!el || el.closest('svg, .psy-art, iframe, [aria-hidden=true], .sheet-backdrop, input, select, textarea, option')) continue
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || +s.opacity < 0.5 || s.color === 'rgba(0, 0, 0, 0)' || s.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || s.backgroundClip === 'text') continue
      const range = document.createRange(); range.selectNodeContents(n)
      const r = range.getBoundingClientRect()
      if (r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      if (top && !el.contains(top) && !top.contains(el)) continue   // covered by something
      // neighbours on the same line (other words, dots, icons) would be measured as "background": only use free sides
      const prev = !!(n.previousSibling && (n.previousSibling.nodeType !== 3 || n.previousSibling.textContent.trim())) || (!n.previousSibling && el.previousElementSibling && getComputedStyle(el).display.startsWith('inline'))
      const next = !!(n.nextSibling && (n.nextSibling.nodeType !== 3 || n.nextSibling.textContent.trim())) || (!n.nextSibling && el.nextElementSibling && getComputedStyle(el).display.startsWith('inline'))
      out.push({ t: t.slice(0, 30), x: r.left, y: r.top, w: r.width, h: r.height, color: s.color, size: parseFloat(s.fontSize), bold: +s.fontWeight >= 600, prev, next, lines: Math.round(r.height / (parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4)) })
    }
    return out
  })
  const png = await page.screenshot()
  const fails = await page.evaluate(async ({ b64, boxes, dpr }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const lum = ([r, gg, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b) }
    const parse = s => s.match(/[\d.]+/g).slice(0, 3).map(Number)
    const out = []
    for (const b of boxes) {
      const fg = parse(b.color)
      // background: thin bands just left and right of the text (and just above/below), median colour
      const lf = lum(fg)
      const ratios = []
      const band = (x0, y0, x1, y1) => {
        x0 = Math.max(0, Math.round(x0 * dpr)); y0 = Math.max(0, Math.round(y0 * dpr)); x1 = Math.min(c.width, Math.round(x1 * dpr)); y1 = Math.min(c.height, Math.round(y1 * dpr))
        if (x1 - x0 < 1 || y1 - y0 < 1) return
        const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data
        for (let i = 0; i < d.length; i += 4) {
          const px = [d[i], d[i + 1], d[i + 2]]
          if (Math.abs(px[0] - fg[0]) + Math.abs(px[1] - fg[1]) + Math.abs(px[2] - fg[2]) < 40) continue
          const lb = lum(px)
          ratios.push((Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05))
        }
      }
      const my = b.y + b.h * 0.2, mh = b.h * 0.6
      if (b.lines > 1) continue   // wrapped text: its box is not a rectangle of text
      if (!b.prev) band(b.x - 5, my, b.x - 1.5, my + mh)
      if (!b.next) band(b.x + b.w + 1.5, my, b.x + b.w + 5, my + mh)
      if (b.prev && b.next) { band(b.x, b.y - 4, b.x + b.w, b.y - 1); band(b.x, b.y + b.h + 1, b.x + b.w, b.y + b.h + 4) }
      if (!ratios.length) continue
      ratios.sort((a, b) => a - b)
      const worst = ratios[Math.floor(ratios.length * 0.3)]
      const need = b.size >= 24 || (b.size >= 18.5 && b.bold) ? 3 : 4.5
      if (worst < need) out.push(`${b.t} ${worst.toFixed(2)}<${need}`)
    }
    return out
  }, { b64: png.toString('base64'), boxes, dpr: 1.5 })
  if (fails.length) bad(`${name}: low contrast ${fails.length}: ${fails.slice(0, 4).join(' | ')}`)
  return fails
}

async function check(page, name, { shot = true, contrastCheck = true } = {}) {
  await page.waitForTimeout(350)
  const o = await overflow(page)
  if (o.page) bad(`${name}: page scrolls sideways ${o.els.join(', ')}`)
  if (contrastCheck) await contrast(page, name)
  if (shot) await page.screenshot({ path: `${DIR}/b14-${name}.png` })
  if (page.errors.length) { bad(`${name}: errors ${page.errors.slice(0, 3).join(' / ')}`); page.errors.length = 0 }
}

async function tour(browser, theme, sizeName, { contrastCheck = true } = {}) {
  const page = await newPage(browser, { 'kg:theme': theme, 'kg:psyMotion': '0' }, SIZES[sizeName])
  const tag = `${theme}-${sizeName}`
  await page.waitForSelector('.tab-note', { timeout: 8000 })
  await check(page, `${tag}-play`, { contrastCheck })
  await page.locator('.opts-btn').click()
  await page.waitForSelector('.play-opts')
  await check(page, `${tag}-play-options`, { contrastCheck })
  await page.keyboard.press('Escape')
  await page.locator('.sheet-backdrop').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await page.waitForTimeout(200)
  await nav(page, 'Songs')
  for (const s of ['My songs', 'Songbook', 'Practice', 'Add a song']) { await sub(page, s); await check(page, `${tag}-songs-${s.split(' ')[0].toLowerCase()}`, { contrastCheck }) }
  await nav(page, 'Learn')
  for (const s of ['Today', 'Course', 'Explore']) { await sub(page, s); await check(page, `${tag}-learn-${s.toLowerCase()}`, { contrastCheck }) }
  await sub(page, 'Today')
  await page.locator('button[aria-label=Settings]').click()
  for (const s of ['You', 'Sound', 'Look', 'Backup']) { await sub(page, s); await check(page, `${tag}-settings-${s.toLowerCase()}`, { contrastCheck }) }
  await nav(page, 'Jam')
  await page.waitForTimeout(300)
  for (const s of ['Jam', 'Solo over it', 'Make a tab', 'Find chords']) { await sub(page, s); await check(page, `${tag}-jam-${s.split(' ')[0].toLowerCase()}`, { contrastCheck }) }
  await nav(page, 'Tools')
  for (const s of ['Tuner', 'Tempo', 'Chords', 'Scales']) { await sub(page, s); await check(page, `${tag}-tools-${s.toLowerCase()}`, { contrastCheck }) }
  await page.context().close()
}

async function playSection(browser) {
  const page = await newPage(browser, {}, SIZES.cover)
  await page.waitForSelector('.tab-note')
  const row = await page.evaluate(() => {
    const t = document.querySelector('.tab-tools')
    return { scroll: t.scrollWidth > t.clientWidth + 1, buttons: [...t.querySelectorAll('button')].map(b => b.textContent.trim()) }
  })
  console.log('  toolbar:', row.buttons.join(' | '))
  if (row.scroll) bad('play: toolbar scrolls sideways on the cover screen')
  if (row.buttons.length > 6) bad(`play: ${row.buttons.length} buttons in the toolbar`)
  if (!(await page.locator('.setup-dot').count())) bad('play: no set-up dot before input is set up')
  await page.locator('.opts-btn').click()
  const sh = page.locator('.play-opts')
  await sh.waitFor()
  // speed
  await sh.locator('button:has-text("½")').click()
  const speedOk = await page.evaluate(() => JSON.parse(localStorage.getItem('kg:playSpeed') ?? 'null'))
  console.log('  speed after ½:', speedOk)
  if (speedOk !== 0.5) bad('play: ½ speed not kept')
  // numbers → both
  await sh.locator('button:has-text("Both")').first().click()
  await page.waitForTimeout(200)
  if (!(await page.locator('.tab-notename').count())) bad('play: Numbers → Both shows no note names')
  // size
  const before = await page.locator('.zoom-val').textContent()
  await sh.locator('button[aria-label="Bigger tab"], button:has-text("A+")').first().click()
  const after = await page.locator('.zoom-val').textContent()
  if (before === after) bad(`play: A+ did not change size (${before})`)
  // split
  const split = sh.locator('label:has-text("Split")')
  if (await split.count()) { await split.click(); await page.waitForTimeout(200) }
  // sound list
  if (!(await sh.locator('select').count())) bad('play: no Sound picker in Options')
  if (!(await sh.locator('button:has-text("Record")').count())) bad('play: no Record yourself in Options')
  await page.screenshot({ path: `${DIR}/b14-play-options-used.png` })
  if (page.errors.length) bad('play errors ' + page.errors.join(' / '))
  await page.context().close()
}

async function songsSection(browser) {
  const page = await newPage(browser, {}, SIZES.cover)
  await page.waitForSelector('.tab-note')
  await nav(page, 'Songs')
  await sub(page, 'Songbook')
  await page.waitForSelector('.songbook-page')
  await page.locator('.songbook-page .sb-part').first().click()
  try { await page.waitForSelector('.play-head', { timeout: 5000 }); console.log('  songbook → Play:', await page.locator('.song-name b').textContent()) } catch { bad('songs: songbook did not open Play') }
  await nav(page, 'Songs')
  await sub(page, 'Practice')
  await page.locator('.songs-screen .song-list li button, .songs-screen .song-list li').first().click()
  try { await page.waitForSelector('.play-head', { timeout: 5000 }); console.log('  practice → Play:', await page.locator('.song-name b').textContent()) } catch { bad('songs: practice tab did not open Play') }
  await nav(page, 'Songs')
  await sub(page, 'My songs')
  if (!(await page.locator('.empty-state').count())) bad('songs: My songs not empty before adding (songbook/practice should stay out)')
  await page.locator('.empty-state button:has-text("Add a song")').click()
  await page.locator('.songs-screen textarea').fill('e|-----0-----|\nB|---1---1---|\nG|-0-------0-|\nD|-----------|\nA|-----------|\nE|-----------|')
  const title = page.locator('.songs-screen input[placeholder*="itle"], .songs-screen input[aria-label*="itle"]').first()
  if (await title.count()) await title.fill('Test riff 14')
  await page.getByRole('button', { name: 'Load tab', exact: true }).click()
  try { await page.waitForSelector('.play-head', { timeout: 5000 }); console.log('  pasted tab →', await page.locator('.song-name b').textContent()) } catch { bad('songs: pasted tab did not load') }
  await nav(page, 'Songs')
  await sub(page, 'My songs')
  const mine = await page.locator('.songs-screen .song-list li').count()
  console.log('  my songs after paste:', mine)
  if (mine !== 1) bad(`songs: My songs shows ${mine} after one paste`)
  await page.screenshot({ path: `${DIR}/b14-songs-mine-one.png` })
  if (page.errors.length) bad('songs errors ' + page.errors.join(' / '))
  await page.context().close()
}

async function psySection(browser) {
  const page = await newPage(browser, { 'kg:theme': 'psy' }, SIZES.cover)
  await page.waitForSelector('.tab-note')
  const back = await page.evaluate(() => { const l = document.querySelector('.psy-liquid'); return l ? getComputedStyle(l).animationName : null })
  console.log('  backdrop animation:', back)
  if (!back || back === 'none') bad('psy: backdrop not moving with motion on')
  const art = {}
  await nav(page, 'Songs'); art.songs = await page.locator('.psy-art').count()
  await nav(page, 'Learn'); art.learn = await page.locator('.psy-art').count()
  await nav(page, 'Jam'); art.jam = await page.locator('.psy-art').count()
  await nav(page, 'Tools'); art.tools = await page.locator('.psy-art').count()
  console.log('  art per screen:', JSON.stringify(art))
  for (const [k, v] of Object.entries(art)) if (!v) bad(`psy: no art on ${k}`)
  // Jam beat pulse only while playing
  await nav(page, 'Jam'); await sub(page, 'Jam')
  const idle = await page.evaluate(() => getComputedStyle(document.querySelector('.beat-art')).animationName)
  await page.locator('.jam button:has-text("Play")').first().click()
  await page.waitForTimeout(1500)
  const playing = await page.evaluate(() => ({ anim: getComputedStyle(document.querySelector('.beat-art')).animationName, beat: getComputedStyle(document.querySelector('.jam')).getPropertyValue('--beat') }))
  console.log('  beat pulse idle/playing:', idle, JSON.stringify(playing))
  if (idle !== 'none' || playing.anim === 'none') bad('psy: beat pulse wrong')
  await page.screenshot({ path: `${DIR}/b14-psy-jam-playing.png` })
  await page.locator('.jam button:has-text("Stop")').first().click().catch(() => {})
  // the default look is Psychedelic (no theme saved)
  const fresh = await newPage(browser, {}, SIZES.cover)
  const def = await fresh.evaluate(() => document.documentElement.dataset.theme)
  if (def !== 'psy') bad(`psy: default look is ${def}`)
  await fresh.context().close()
  // motion off
  await nav(page, 'Learn'); await sub(page, 'Today')
  await page.locator('button[aria-label=Settings]').click()
  await sub(page, 'Look')
  await page.locator('label:has-text("Moving colours"), label:has-text("moving")').first().click()
  const off = await page.evaluate(() => ({ m: document.documentElement.dataset.motion, a: getComputedStyle(document.querySelector('.psy-liquid')).animationName }))
  console.log('  motion off:', JSON.stringify(off))
  if (off.m !== 'off' || off.a !== 'none') bad('psy: motion switch does not stop the background')
  // your samurai: pick the pug, it greets you on the empty My songs page; every dog has a guitar
  const cards = await page.locator('.dog-card').count()
  if (cards !== 12) bad(`psy: ${cards} samurai choices (want 12)`)
  await page.locator('.dog-card:has-text("Pug")').click()
  await nav(page, 'Songs'); await sub(page, 'My songs')
  if (!(await page.locator('.empty-art .dog-pug').count())) bad('psy: chosen samurai not on the empty My songs page')
  const guitars = await page.locator('.psy-dog .dog-guitar').count(), dogs = await page.locator('.psy-dog').count()
  console.log(`  dogs on Songs: ${dogs}, with guitars: ${guitars}`)
  if (!dogs || guitars !== dogs) bad('psy: a samurai dog without a guitar')
  await page.screenshot({ path: `${DIR}/b14-psy-chosen-pug.png` })
  await nav(page, 'Learn'); await sub(page, 'Today')
  await page.locator('button[aria-label=Settings]').click()
  await sub(page, 'Look')
  // back to Day: no psy art anywhere
  await page.locator('.theme-card.t-day').click()
  await page.waitForTimeout(200)
  const left = await page.locator('.psy-art, .psy-backdrop').count()
  if (left) bad(`psy: ${left} psychedelic pieces still showing in Day`)
  if (page.errors.length) bad('psy errors ' + page.errors.join(' / '))
  await page.context().close()
}

async function guideSection(browser) {
  const page = await newPage(browser, { 'kg:tab2': 'learn' }, SIZES.cover)
  const openGuide = async () => {
    await nav(page, 'Learn'); await page.waitForSelector('.learn-head')
    await sub(page, 'Explore')
    await page.locator('.tool:has-text("How to use KGuitar")').click()
    await page.waitForSelector('.guide')
  }
  await openGuide()
  const secs = await page.locator('.guide-head').count()
  let links = 0
  for (let si = 0; si < secs; si++) {
    await openGuide()
    const head = page.locator('.guide-head').nth(si)
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
    const n = await page.locator('.guide-sec.open .guide-items button:has-text("Show me")').count()
    for (let k = 0; k < n; k++) {
      if (k > 0) { await openGuide(); const h = page.locator('.guide-head').nth(si); if ((await h.getAttribute('aria-expanded')) !== 'true') await h.click() }
      const btn = page.locator('.guide-sec.open .guide-items button:has-text("Show me")').nth(k)
      const title = (await btn.locator('xpath=ancestor::li').locator('b').first().textContent().catch(() => '?')).trim()
      await btn.click()
      try {
        await page.waitForFunction(() => !document.querySelector('.guide'), null, { timeout: 4000 })
        const where = await page.evaluate(() => document.querySelector('nav.nav button[aria-current=page]')?.textContent.trim() + ' / ' + (document.querySelector('.subtabs [aria-selected=true]')?.textContent.trim() ?? '') + ' / ' + (document.querySelector('h1, h2')?.textContent.trim().slice(0, 30) ?? ''))
        console.log(`  ${title} → ${where}`)
        links++
      } catch { bad(`guide: "${title}" Show me did nothing`) }
    }
  }
  console.log(`guide: ${links} links followed`)
  if (page.errors.length) bad('guide errors ' + page.errors.join(' / '))
  await page.context().close()
}

;(async () => {
  const browser = await launch()
  try {
    if (want.includes('tour')) {
      // TOUR=psy:cover,day:inner limits the tour
      const runs = process.env.TOUR ? process.env.TOUR.split(',').map(x => x.split(':'))
        : [...['day', 'night', 'psy'].flatMap(t => ['cover', 'inner'].map(s => [t, s])), ['psy', 'phone'], ['psy', 'tablet']]
      for (const [theme, size] of runs) { console.log('tour', theme, size); await tour(browser, theme, size, { contrastCheck: size === 'cover' || size === 'inner' }) }
    }
    if (want.includes('play')) { console.log('play'); await playSection(browser) }
    if (want.includes('songs')) { console.log('songs'); await songsSection(browser) }
    if (want.includes('psy')) { console.log('psy'); await psySection(browser) }
    if (want.includes('guide')) { console.log('guide'); await guideSection(browser) }
  } catch (e) { bad('crash: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' ')) }
  await browser.close()
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall good')
  process.exit(problems.length ? 1 : 0)
})()
