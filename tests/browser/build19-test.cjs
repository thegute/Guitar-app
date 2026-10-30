// Build 19 in the browser: the exercise library (Songs → Exercises).
//   exercises  700+ exercises; difficulty / type / technique filters; ‹ › and the list; favourites; key, sound, tempo;
//              Play with a count-in, metronome, loop; the tab and the neck follow; tap a note; Play along opens Play
//   videos     Your video lessons with a stand-in for the phone: pick a folder, chapters in natural order, a lesson
//              plays with speed / mirror / next, Done is kept, a tab opens in Play with the video beside it; the web
//              version (no phone) doesn't show it
//   looks      the exercise page in psy / day / night at phone, cover, inner and desktop sizes: no sideways overflow
// Run with the preview server on :4173:  node tests/browser/build19-test.cjs [section ...]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })
const ALL = ['exercises', 'looks', 'videos']
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL
const problems = []
const bad = (m) => { problems.push(m); console.log('  PROBLEM', m) }
const SIZES = { phone: { width: 360, height: 760 }, cover: { width: 412, height: 915 }, inner: { width: 840, height: 757 }, desktop: { width: 1366, height: 768 } }

async function launch() {
  return chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
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
const countText = async page => (await page.locator('.ex-count > span').first().textContent()) ?? ''
const total = async page => Number(((await countText(page)).match(/of (\d+)/) ?? [])[1])
const overflow = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth)

async function exercises(browser) {
  const page = await newPage(browser, { 'kg:tab2': 'songs', 'kg:sub:songs': 'practice' })
  await page.waitForSelector('.ex-browser')
  const n = await total(page)
  console.log(`  exercises: ${await countText(page)}`)
  if (!(n >= 700)) bad(`exercises: only ${n} exercises`)
  // filters
  const sel = i => page.locator('.ex-filters select').nth(i)
  await sel(1).selectOption('lick:bluegrass')
  const bg = await total(page)
  const first = await page.locator('.ex-pick select').inputValue()
  if (!(bg >= 8 && bg < 40) || !/^BG-/.test(first)) bad(`exercises: bluegrass filter shows ${bg}, first ${first}`)
  await sel(0).selectOption('1')
  const bg1 = await total(page)
  if (!(bg1 >= 1 && bg1 < bg)) bad(`exercises: beginner bluegrass ${bg1} of ${bg}`)
  await page.locator('button:has-text("Clear")').click()
  if ((await total(page)) !== n) bad('exercises: Clear did not show everything again')
  await sel(2).selectOption('sweep')
  const sw = await total(page)
  const swNames = await page.locator('.ex-pick select option').allTextContents()
  if (!(sw >= 5) || swNames.some(t => !/sweep/i.test(t) && !/arpeggio/i.test(t) && !/lick|run|BL|RK|MT|PG/i.test(t))) console.log('  sweep list:', swNames.slice(0, 12).join(' | '))
  if (!(sw >= 5)) bad(`exercises: technique filter (sweep) shows ${sw}`)
  await page.locator('button:has-text("Clear")').click()
  // start here
  await sel(1).selectOption('start')
  const st = await total(page)
  if (!(st >= 10 && st < 40)) bad(`exercises: "Start here" shows ${st}`)
  await page.locator('button:has-text("Clear")').click()
  // ‹ › move through the list
  const a = await page.locator('.ex-pick select').inputValue()
  await page.locator('button[aria-label="Next exercise"]').click()
  const b = await page.locator('.ex-pick select').inputValue()
  await page.locator('button[aria-label="Previous exercise"]').click()
  const c = await page.locator('.ex-pick select').inputValue()
  if (a === b || a !== c) bad(`exercises: next/previous went ${a} → ${b} → ${c}`)
  // favourites
  await page.locator('.ex-star').click()
  await page.locator('.ex-count input[type=checkbox]').check()
  if ((await total(page)) !== 1) bad(`exercises: favourites only shows ${await total(page)}`)
  await page.locator('.ex-count input[type=checkbox]').uncheck()
  // pick a lick, change key: the chord on the card follows
  await page.locator('.ex-pick select').selectOption({ label: (await page.locator('.ex-pick select option').allTextContents()).find(t => /Box 1 call/.test(t)) })
  const chordA = (await page.locator('.ex-chord').textContent()) ?? ''
  const keySel = page.locator('.ex-settings select').first()
  const keys = await keySel.locator('option').allTextContents()
  await keySel.selectOption({ label: keys.find(k => /^C/.test(k)) ?? keys[1] })
  const chordC = (await page.locator('.ex-chord').textContent()) ?? ''
  console.log(`  exercises: Box 1 call chord ${chordA} → ${chordC}; keys ${keys.length}`)
  if (!/^A7/.test(chordA) || !/^C7/.test(chordC)) bad(`exercises: the chord did not follow the key (${chordA} → ${chordC})`)
  // tempo
  await page.locator('.ex-tempo input').fill('120')
  if (!/120/.test((await page.locator('.ex-card-head').textContent()) ?? '')) bad('exercises: tempo not shown on the card')
  // play: count-in, then the playhead moves
  await page.locator('.ex-transport button.primary').click()
  const counted = await page.waitForSelector('.ex-count-in', { timeout: 2000 }).then(() => true).catch(() => false)
  if (!counted) bad('exercises: no count-in number')
  await page.waitForTimeout(3200)
  const status = (await page.locator('.ex-status').textContent()) ?? ''
  const cursorMoved = await page.locator('.ex-seek').inputValue()
  console.log(`  exercises: status "${status}", playhead at ${cursorMoved}`)
  if (!/Playing|Finished/.test(status) || Number(cursorMoved) < 1) bad('exercises: playback did not move')
  await page.locator('.ex-transport button.primary').click()
  // the neck shows numbered dots and a red root
  const dots = await page.locator('.ex-card svg text').allTextContents()
  if (!dots.includes('1') || !dots.includes('2')) bad('exercises: neck has no numbered notes')
  // a chord exercise shows the shape and the chord name
  await page.locator('.ex-filters select').nth(1).selectOption('chords')
  const chordName = (await page.locator('.ex-chord').textContent()) ?? ''
  if (!/^[A-G]/.test(chordName)) bad(`exercises: chord changes card shows "${chordName}"`)
  // melodic fingerstyle (Marco Cirillo style) is there
  await page.locator('.ex-filters select').nth(1).selectOption('melodic')
  const mf = await total(page)
  console.log(`  exercises: melodic fingerstyle ${mf}`)
  if (!(mf >= 30)) bad(`exercises: melodic fingerstyle has ${mf}`)
  await page.screenshot({ path: path.join(DIR, 'b19-ex-melodic.png'), fullPage: true })
  // play along opens Play with this exercise
  const code = await page.locator('.ex-pick select').inputValue()
  await page.locator('button:has-text("Play along (it listens)")').click()
  await page.waitForSelector('.tab-tools', { timeout: 5000 })
  const title = await page.evaluate(() => document.body.innerText)
  if (!title.includes(code)) bad(`exercises: Play did not open ${code}`)
  if (page.errors.length) bad('exercises: page errors ' + page.errors.join(' | '))
  await page.context().close()
}

async function videos(browser) {
  // a short test video in the built app (the preview serves dist/)
  const vid = path.join(__dirname, '..', '..', 'dist', 'test-lesson.webm')
  if (!fs.existsSync(vid)) require('child_process').spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=duration=12:size=320x180:rate=15', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=12', '-c:v', 'libvpx', '-b:v', '200k', '-c:a', 'libvorbis', '-shortest', vid])
  // the web version doesn't have it
  {
    const page = await newPage(browser, { 'kg:tab2': 'learn', 'kg:sub:learn': 'explore' })
    await page.waitForSelector('.explore')
    if (await page.locator('.tool:has-text("Your video lessons")').count()) bad('videos: shown in the web version')
    await page.context().close()
  }
  const tab = Buffer.from('e|-----0-----0---|\nB|---1---1-------|\nG|-0-------0-----|\nD|---------------|\nA|---------------|\nE|---------------|\n').toString('base64')
  const ctx = await browser.newContext({ viewport: SIZES.cover, deviceScaleFactor: 1.5, hasTouch: true })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  await page.addInitScript(tab => {
    const f = (path, uri) => ({ path, name: path.split('/').pop(), mime: /mp4$/.test(path) ? 'video/mp4' : 'text/plain', size: 1, modified: 0, uri: 'content://test/tree/1/document/' + uri })
    window.__kgLessonsMock = {
      pick: async () => ({ tree: 'content://test/tree/1', name: 'Speed course' }),
      list: async () => ({ files: [f('1. Warm up/01 Intro.mp4', 'a'), f('1. Warm up/02 Spider.mp4', 'b'), f('1. Warm up/Spider tab.txt', 'c'), f('10. Licks/01 Lick.mp4', 'd'), f('2. Picking/01 Alternate.mp4', 'e')] }),
      read: async () => ({ data: tab }), openExternal: async () => {}, forget: async () => {}, granted: async () => ({ trees: [] }),
      media: () => '/test-lesson.webm',
    }
    if (sessionStorage.getItem('seeded')) return
    localStorage.clear()
    localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1'); localStorage.setItem('kg:getReady', '0')
    localStorage.setItem('kg:tab2', JSON.stringify('learn')); localStorage.setItem('kg:sub:learn', JSON.stringify('explore'))
    sessionStorage.setItem('seeded', '1')
  }, tab)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.explore')
  await page.locator('.tool:has-text("Your video lessons")').click()
  await page.locator('button:has-text("Find my lessons")').click()
  await page.waitForSelector('.course')
  const chs = await page.locator('.course-ch b').allTextContents()
  console.log('  videos: chapters', chs.join(' | '))
  if (chs.join('|') !== '1. Warm up|2. Picking|10. Licks') bad(`videos: chapter order ${chs.join(' | ')}`)
  await page.locator('.course .btn.primary').click()
  await page.waitForSelector('.lesson-player video')
  const title = await page.locator('.lesson-player h1').textContent()
  if (title !== '01 Intro') bad(`videos: first lesson is "${title}"`)
  await page.waitForFunction(() => document.querySelector('.lesson-player video').readyState >= 1, null, { timeout: 5000 }).catch(() => bad('videos: the video did not load'))
  await page.locator('.lesson-bar button:has-text("½×")').click()
  const rate = await page.evaluate(() => document.querySelector('.lesson-player video').playbackRate)
  if (rate !== 0.5) bad(`videos: speed is ${rate}`)
  await page.locator('.lesson-bar button:has-text("Mirror")').click()
  if (!(await page.locator('.lesson-player video.mirrored').count())) bad('videos: mirror did not flip the picture')
  await page.locator('.lesson-player input[type=checkbox]').check()
  await page.locator('button:has-text("Next ›")').click()
  const t2 = await page.locator('.lesson-player h1').textContent()
  if (t2 !== '02 Spider') bad(`videos: next lesson is "${t2}"`)
  await page.screenshot({ path: path.join(DIR, 'b19-video-lesson.png') })
  await page.locator('button:has-text("← Lessons")').click()
  const marks = await page.locator('.course-video .cv-mark').allTextContents()
  if (marks[0] !== '✓') bad(`videos: Done not kept (${marks.join(' ')})`)
  // a tab from the lesson opens in Play with the video beside it
  await page.locator('.course .btn.primary').click()
  await page.waitForSelector('.lesson-player')
  await page.locator('.tab-file:has-text("Spider tab")').click()
  await page.waitForSelector('.tab-tools', { timeout: 6000 })
  let lv = await page.waitForSelector('.local-video video', { timeout: 3000 }).then(() => true).catch(() => false)
  if (!lv) { const v = page.locator('[data-find=video]'); if (await v.count()) { await v.first().click(); lv = await page.waitForSelector('.local-video video', { timeout: 3000 }).then(() => true).catch(() => false) } }
  if (!lv) bad('videos: Play did not show the lesson video beside the tab')
  await page.screenshot({ path: path.join(DIR, 'b19-video-play.png') })
  if (page.errors.length) bad('videos: page errors ' + page.errors.join(' | '))
  await ctx.close()
}

async function looks(browser) {
  for (const [theme, size] of [['psy', 'phone'], ['psy', 'cover'], ['day', 'inner'], ['night', 'cover'], ['day', 'desktop']]) {
    const page = await newPage(browser, { 'kg:theme': theme, 'kg:tab2': 'songs', 'kg:sub:songs': 'practice' }, SIZES[size])
    await page.waitForSelector('.ex-browser')
    await page.waitForTimeout(400)
    const o = await overflow(page)
    if (o > 1) bad(`looks ${theme} ${size}: page is ${o}px wider than the screen`)
    await page.screenshot({ path: path.join(DIR, `b19-ex-${theme}-${size}.png`), fullPage: false })
    if (page.errors.length) bad(`looks ${theme} ${size}: ` + page.errors.join(' | '))
    await page.context().close()
  }
}

;(async () => {
  const browser = await launch()
  for (const w of want) {
    console.log(`— ${w}`)
    try {
      if (w === 'exercises') await exercises(browser)
      if (w === 'looks') await looks(browser)
      if (w === 'videos') await videos(browser)
    } catch (e) { bad(`${w}: ${e.message.split('\n')[0]}`) }
  }
  await browser.close()
  console.log(problems.length ? `${problems.length} problem(s)` : 'build19 browser: all good')
  process.exit(problems.length ? 1 : 0)
})()
