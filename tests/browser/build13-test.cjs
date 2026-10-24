// Build 13 in the browser, tapped through like a person would on the Fold cover screen:
//   lessons    every theory lesson: Read / Watch / Play steps, the video card, and every exercise opens something to play
//   technique  every technique: the video link and the drill
//   songbook   every part of every songbook song opens a tab with notes (and Hear it with the band plays)
//   plan       every step of today's plan and every goal on the path goes somewhere
//   play       song check, retune warning, 1 & 2 & counts, strum arrows, rests, record yourself, chord help, pinch zoom
//   intime     a songbook strum-along In time with the band: the count-in, the playhead, strums marked, a score
//   finder     Jam → Find the chords listens to strummed chords (fake mic) and writes them down; Use in Jam
//   melody     the same in Notes mode with a plucked melody (Ode to Joy) as the mic, then Open as a tab
//   learnmisc  bends trainer, About you, Progress with skill trends, the wrong-string hint in a quiz
//   sizes      the new screens on a small phone, the Fold cover and inner screens and a 12" tablet, day and night: no
//              sideways overflow, screenshots to look at
// Run with the preview server on :4173 (node tests/browser/gen-chords.cjs first):
//   node tests/browser/build13-test.cjs [section ...]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })
const ALL = ['lessons', 'technique', 'songbook', 'plan', 'play', 'intime', 'finder', 'melody', 'learnmisc', 'sizes']
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL
const problems = []
const bad = (m) => { problems.push(m); console.log('  PROBLEM', m) }

async function launch(wav = 'chords.wav') {
  return chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${DIR}/${wav}`, '--autoplay-policy=no-user-gesture-required'],
  })
}
async function newPage(browser, seed = {}, viewport = { width: 412, height: 915 }) {
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
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  return page
}
const nav = (page, label) => page.locator(`nav.nav button:has-text("${label}")`).click()
async function playHasTab(page) {
  await page.waitForSelector('.play-head', { timeout: 6000 })
  await page.waitForFunction(() => document.querySelectorAll('.tab-note').length > 0 || document.querySelectorAll('.tab-chord').length > 0, null, { timeout: 6000 })
  return page.evaluate(() => ({ title: document.querySelector('.song-name b')?.textContent ?? '', notes: document.querySelectorAll('.tab-note').length, chords: document.querySelectorAll('.tab-chord').length }))
}
const sub = (page, label) => page.locator(`.subtabs [role=tab]:has-text("${label}")`).first().click()
async function openLearnTool(page, label) {
  await nav(page, 'Learn')
  await page.waitForSelector('.learn-head')
  await sub(page, 'Explore')
  await page.locator(`.tool:has-text("${label}")`).first().click()
}
async function songsPage(page, label) { await nav(page, 'Songs'); await sub(page, label); await page.waitForTimeout(200) }
async function openSongbook(page) { await songsPage(page, 'Songbook'); await page.waitForSelector('.songbook-page') }
async function pasteTab(page, text) {
  await songsPage(page, 'Add a song')
  await page.locator('.songs-screen textarea').first().fill(text)
  await page.getByRole('button', { name: 'Load tab', exact: true }).click()
}
async function options(page) { await page.locator('.opts-btn').click(); await page.waitForSelector('.play-opts') }
async function optionsDone(page) { await page.locator('.play-opts button:has-text("Done")').click() }
async function setOption(page, label, on) {
  await options(page)
  const box = page.locator(`.play-opts label:has-text("${label}") input[type=checkbox]`).first()
  if ((await box.isChecked()) !== on) await box.click()
  await optionsDone(page)
}
const shot = (page, name) => page.screenshot({ path: `${DIR}/b13-${name}.png` })

// ---------------------------------------------------------------- lessons
async function lessons(browser) {
  const page = await newPage(browser, { 'kg:tab2': 'learn' })
  await page.waitForSelector('.today-card')
  await openLearnTool(page, 'Theory')
  const n = await page.locator('.lesson-index button').count()
  let exercises = 0
  for (let i = 0; i < n; i++) {
    if (!(await page.locator('.lesson-index button').count())) await openLearnTool(page, 'Theory')
    const btn = page.locator('.lesson-index button').nth(i)
    const name = (await btn.textContent()).replace(/^✓/, '').trim().slice(0, 40)
    await btn.click()
    await page.waitForSelector('article.lesson')
    const steps = await page.locator('.lesson-step').count()
    const video = await page.locator('.lesson-video .lv-poster').count()
    const exs = await page.locator('.lesson-ex').count()
    if (steps !== 3 || video !== 1 || exs < 1) bad(`lesson ${name}: ${steps} steps, ${video} video, ${exs} exercises`)
    if (i === 0) {
      // the video plays inside the lesson (an embed), with Open in YouTube next to it
      await page.locator('.lv-poster').click()
      const src = await page.locator('.lv-frame iframe').getAttribute('src').catch(() => null)
      if (!src || !/youtube(-nocookie)?\.com\/embed\/[\w-]{11}/.test(src)) bad(`lesson video embed: ${src}`)
      await shot(page, 'lesson')
    }
    for (let k = 0; k < exs; k++) {
      if (k > 0) {
        await openLearnTool(page, 'Theory')
        await page.locator('.lesson-index button').nth(i).click()
        await page.waitForSelector('article.lesson')
      }
      const ex = page.locator('.lesson-ex').nth(k)
      const label = (await ex.textContent()).trim()
      await ex.click()
      // a tab in Play, a Learn tool, or Jam
      try {
        await page.waitForFunction(() => document.querySelector('.play-head') || document.querySelector('.jam') || (!document.querySelector('article.lesson') && [...document.querySelectorAll('main button')].some(b => /Back/.test(b.textContent))), null, { timeout: 6000 })
        if (await page.locator('.play-head').count()) {
          const t = await playHasTab(page)
          if (!t.notes && !t.chords) bad(`lesson ${name} → "${label}": empty tab`)
        }
        exercises++
      } catch (e) { bad(`lesson ${name} → "${label}": nothing opened`) ; await shot(page, `fail-lesson-${i}-${k}`) }
    }
    await openLearnTool(page, 'Theory')
  }
  console.log(`lessons: ${n} lessons, ${exercises} exercises opened`, page.errors.length ? page.errors : '')
  if (page.errors.length) bad('lessons page errors: ' + page.errors.join(' | '))
  await page.context().close()
}

// ---------------------------------------------------------------- technique
async function technique(browser) {
  const page = await newPage(browser, { 'kg:tab2': 'learn' })
  await page.waitForSelector('.today-card')
  await openLearnTool(page, 'Technique')
  const n = await page.locator('.plan-list button').count()
  for (let i = 0; i < n; i++) {
    if (i > 0) await openLearnTool(page, 'Technique')
    await page.locator('.plan-list button').nth(i).click()
    await page.waitForSelector('article.technique')
    const title = await page.locator('article.technique h2, article.technique h1').first().textContent().catch(() => `#${i}`)
    const href = await page.locator('.tech-video').getAttribute('href')
    if (!/^https:\/\//.test(href ?? '')) bad(`technique ${title}: video link ${href}`)
    if (i === 0) await shot(page, 'technique')
    await page.locator('article.technique .btn.primary').click()
    try {
      await page.waitForFunction(() => document.querySelector('.play-head') || document.querySelector('.bend-trainer') || (!document.querySelector('article.technique') && document.querySelector('.learn, main button.btn.sm')), null, { timeout: 6000 })
      if (await page.locator('.play-head').count()) { const t = await playHasTab(page); if (!t.notes) bad(`technique ${title}: empty drill`) }
    } catch { bad(`technique ${title}: drill opened nothing`) }
  }
  console.log(`technique: ${n} techniques`)
  if (page.errors.length) bad('technique page errors: ' + page.errors.join(' | '))
  await page.context().close()
}

// ---------------------------------------------------------------- songbook
async function songbook(browser) {
  for (const inst of [{ id: 'guitar', tuning: {} }, { id: 'tenor', tuning: {} }]) {
    const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:instrument': inst, 'kg:sbLevel': 0, 'kg:sbGenre': 'all' })
    await page.waitForSelector('.play-head')
    const openSheet = () => openSongbook(page)
    await openSheet()
    await shot(page, `songbook-${inst.id}`)
    const total = await page.locator('.sb-part').count()
    let opened = 0
    for (let i = 0; i < total; i++) {
      if (i > 0) await openSheet()
      const part = page.locator('.sb-part').nth(i)
      const label = await part.getAttribute('aria-label')
      const song = await part.locator('xpath=ancestor::li').locator('.sb-title b').textContent().catch(() => '?')
      await part.scrollIntoViewIfNeeded()
      await part.click()
      try {
        const t = await playHasTab(page)
        if (!t.notes && !t.chords) bad(`songbook ${inst.id} ${song} / ${label}: empty`)
        // the song check opens by itself on a new song
        if (!(await page.locator('.song-check').count())) bad(`songbook ${inst.id} ${song} / ${label}: no song check`)
        else await page.locator('.song-check button:has-text("Got it")').click()
        opened++
      } catch (e) { bad(`songbook ${inst.id} ${song} / ${label}: ${e.message.split('\n')[0]}`); await shot(page, `fail-sb-${inst.id}-${i}`); await page.keyboard.press('Escape').catch(() => {}) }
    }
    // Hear it with the band on the last song opened
    await options(page)
    const bandBox = page.locator('.play-opts label:has-text("band") input')
    const hasBand = await bandBox.count()
    const bandOn = hasBand ? await bandBox.isChecked() : false
    await optionsDone(page)
    if (hasBand) {
      const where = () => page.evaluate(() => { const c = document.querySelector('.tab-cursor'); const bar = c?.closest('svg')?.getAttribute('data-bar'); return `${bar}:${Math.round(Number(c?.getAttribute('x') ?? -1))}` })
      const before = await where()
      await page.locator('button.hear').click()
      await page.waitForTimeout(3000)
      const playing = await page.locator('.tab-view.playing').count()
      const after = await where()
      await shot(page, `songbook-hear-${inst.id}`)
      await page.locator('button.hear').click()
      if (!playing || before === after) bad(`songbook ${inst.id}: Hear it with the band: playing ${playing}, playhead ${before} → ${after}`)
      console.log(`  band ${bandOn}, playhead ${before} → ${after}`)
    } else bad(`songbook ${inst.id}: no band option on a songbook song`)
    console.log(`songbook ${inst.id}: ${opened}/${total} parts opened`)
    if (page.errors.length) bad(`songbook ${inst.id} page errors: ` + page.errors.join(' | '))
    await page.context().close()
  }
}

// ---------------------------------------------------------------- plan + path
async function plan(browser) {
  for (const away of [false, true]) {
    const seed = { 'kg:tab2': 'learn', 'kg:profile': { level: 2, goals: ['songs', 'strum'], genres: ['folk', 'bluegrass'], at: Date.now() }, 'kg:fold:learnPath': true }
    if (away) seed['kg:away'] = { since: Date.now() }
    const page = await newPage(browser, seed)
    await page.waitForSelector('.today-card')
    await shot(page, `learn-home${away ? '-away' : ''}`)
    const steps = await page.locator('.today-plan .plan-list button, section[aria-label="Today\'s plan"] .plan-list button').count() || await page.locator('.plan-list button').count()
    for (let i = 0; i < steps; i++) {
      await nav(page, 'Learn'); await page.waitForSelector('.learn-head'); await sub(page, 'Today'); await page.waitForSelector('.today-card')
      const b = page.locator('.plan-list button').nth(i)
      const title = (await b.locator('b').textContent()).trim()
      await b.click()
      try {
        await page.waitForFunction(() => !document.querySelector('.today-card') || document.querySelector('.play-head') || document.querySelector('.jam'), null, { timeout: 6000 })
        if (await page.locator('.play-head').count()) { const t = await playHasTab(page); if (!t.notes && !t.chords) bad(`plan step "${title}": empty tab`) }
      } catch { bad(`plan${away ? ' (away)' : ''} step "${title}": nothing happened`) }
    }
    const toPath = async () => { await nav(page, 'Learn'); await page.waitForSelector('.learn-head'); await sub(page, 'Course'); await page.waitForSelector('.goal-list') }
    await toPath()
    const goals = await page.locator('.goal-list button').count()
    for (let i = 0; i < goals; i++) {
      await toPath()
      const g = page.locator('.goal-list button').nth(i)
      const label = (await g.textContent()).trim().slice(0, 50)
      await g.click()
      try { await page.waitForFunction(() => !document.querySelector('.goal-list'), null, { timeout: 6000 }) } catch { bad(`path goal "${label}": nothing happened`) }
    }
    await nav(page, 'Learn'); await sub(page, 'Today')
    console.log(`plan${away ? ' (away)' : ''}: ${steps} steps, ${goals} path goals`)
    if (page.errors.length) bad('plan page errors: ' + page.errors.join(' | '))
    await page.context().close()
  }
}

// ---------------------------------------------------------------- play
async function play(browser) {
  const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:tabCounts': false })
  await page.waitForSelector('.tab-note')
  await page.locator('.song-check button:has-text("Got it")').click().catch(() => {})
  // counts under the tab
  await setOption(page, 'Count it', true)
  const counts = await page.locator('.tab-count').count()
  if (counts < 8) bad(`counts: ${counts} labels`)
  const first = await page.locator('.tab-count').allTextContents()
  if (first.slice(0, 4).join(' ') !== '1 2 3 4') bad(`Ode to Joy counts start ${first.slice(0, 6).join(' ')}`)
  await shot(page, 'play-counts')
  // song check from the title
  await page.locator('.song-name').click()
  if (!(await page.locator('.song-check').count())) bad('song check does not open from the title')
  await page.locator('.song-check button:has-text("Got it")').click()

  // a pasted tab in drop D with two empty bars at the start: retune warning + rest block
  const dropD = ['Riff in drop D', 'e|--------|--------|-----------|-----------|', 'B|--------|--------|-----------|-----------|', 'G|--------|--------|-----------|-----------|',
    'D|--------|--------|-----------|-----------|', 'A|--------|--------|-----------|-----------|', 'D|--------|--------|-0-0-3-0-5-|-0-0-3-5-0-|'].join('\n')
  await pasteTab(page, dropD)
  await page.waitForSelector('.play-head', { timeout: 5000 }).catch(() => bad('pasted tab did not open'))
  await page.waitForSelector('.tab-note')
  await page.locator('.song-check button:has-text("Got it")').click().catch(() => {})
  if (!(await page.locator('.notice.retune').count())) bad('no retune warning for a drop D tab')
  // empty bars at the start of a text tab are left out altogether
  const firstBarNotes = await page.locator('.tab-bar').first().locator('.tab-note').count().catch(() => -1)
  if (firstBarNotes === 0) bad('text tab starts with an empty bar')
  await shot(page, 'play-dropd')
  await page.locator('.notice.retune button.primary').click()
  await page.waitForTimeout(500)
  const tuner = await page.evaluate(() => ({ tools: !!document.querySelector('.tuner, [aria-label*="uner"]'), inst: localStorage.getItem('kg:instrument') }))
  if (!/dropd/.test(tuner.inst ?? '')) bad(`retune did not set drop D: ${tuner.inst}`)
  // back to standard for the rest
  await page.evaluate(() => { localStorage.setItem('kg:instrument', JSON.stringify({ id: 'guitar', tuning: {} })); localStorage.setItem('kg:tab2', '"play"') })
  await page.reload()
  await page.waitForSelector('.tab-note')

  // a Guitar Pro file whose part comes in late: the empty bars become one rest block
  if (fs.existsSync(`${DIR}/late.gp`)) {
    await songsPage(page, 'Add a song')
    await page.locator('.songs-screen input[type=file]').setInputFiles(`${DIR}/late.gp`)
    await page.waitForSelector('.play-head', { timeout: 8000 }).catch(() => {})
    await page.waitForSelector('.tab-note', { timeout: 8000 })
    await page.locator('.song-check button:has-text("Got it")').click().catch(() => {})
    const rest = await page.locator('.tab-lead-rest').textContent().catch(() => '')
    if (!/rest/i.test(rest)) bad(`late GP part: no rest block (${rest})`)
    else console.log('  rest block:', rest.trim())
    await shot(page, 'play-late')
  } else console.log('  (no late.gp: skipped the rest block check)')

  // a chord sheet: strum pattern arrows; the fake mic strums G / C / D, so an Am asks for help with the chord
  const sheet = 'Help test\n\nAm        Am\nOne two three four\nAm        Am\nFive six seven eight'
  await pasteTab(page, sheet)
  await page.waitForSelector('.tab-chord')
  await page.locator('.song-check button:has-text("Got it")').click().catch(() => {})
  await options(page)
  await page.selectOption('.play-opts select[aria-label="Strum pattern"]', { index: 2 }).catch(() => bad('no strum menu on a chord sheet'))
  await optionsDone(page)
  await page.waitForTimeout(300)
  const arrows = await page.locator('.strum-arrow').count()
  if (arrows < 4) bad(`strum arrows: ${arrows}`)
  await shot(page, 'play-strum')
  await page.locator('button.listen').click()
  let help = ''
  for (let i = 0; i < 24 && !help; i++) { await page.waitForTimeout(500); help = (await page.locator('.fb.bad').first().textContent().catch(() => '')) ?? '' }
  await page.locator('button.listen').click()
  if (!/ringing|rang out|needs/.test(help)) bad(`chord help: "${help}"`)
  else console.log('  chord help:', help)
  await shot(page, 'play-chordhelp')

  // record yourself (the fake mic), then the take bar
  await options(page)
  await page.locator('.play-opts button.rec').click()
  await page.waitForTimeout(2200)
  await page.locator('.tab-tools button.rec').click()
  try { await page.waitForSelector('.take-bar audio', { timeout: 4000 }) } catch { bad('no recording after Record') }
  await shot(page, 'play-take')
  await page.locator('.take-bar button[aria-label="Delete this recording"]').click().catch(() => {})

  // pinch the tab
  const cdp = await page.context().newCDPSession(page)
  const box = await page.locator('.tab-view').boundingBox()
  const cy = Math.min(box.y + 120, 800), cx = box.x + 150
  const pts = d => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(40) })
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(40 + i * 8) }); await page.waitForTimeout(16) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const z = await page.evaluate(() => localStorage.getItem('kg:tabZoom'))
  if (!(Number(z) > 1.2)) bad(`pinch on the tab: zoom ${z}`)
  console.log(`play: counts ${counts}, arrows ${arrows}, zoom ${z}`)
  if (page.errors.length) bad('play page errors: ' + page.errors.join(' | '))
  await page.context().close()
}

// ---------------------------------------------------------------- finder
async function finder(browser) {
  const page = await newPage(browser, { 'kg:tab2': 'progressions', 'kg:sub:jam': 'find' })
  await page.waitForSelector('.song-finder')
  await page.locator('.song-finder button.listen').click()
  let chips = []
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500)
    chips = await page.locator('.finder-chip select').evaluateAll(els => els.map(e => e.options[e.selectedIndex].text))
    if (chips.length >= 6 && i > 24) break
  }
  const heard = await page.locator('.finder-heard').textContent().catch(() => '')
  await shot(page, 'finder')
  await page.locator('.song-finder button.listen').click()
  const names = [...new Set(chips)]
  console.log(`finder: heard "${heard}", chords ${chips.join(' ')}`)
  for (const c of ['G', 'C', 'D']) if (!names.includes(c)) bad(`finder missed ${c}: ${chips.join(' ')}`)
  if (names.some(c => !['G', 'C', 'D'].includes(c))) bad(`finder wrote extra chords: ${chips.join(' ')}`)
  const key = await page.locator('.song-finder').textContent()
  if (!/Key:\s*G major/.test(key)) bad('finder key is not G major')
  await page.locator('.song-finder button:has-text("Use in Jam")').click()
  await page.waitForTimeout(500)
  const jamChords = await page.evaluate(() => [...document.querySelectorAll('.prog-card .pc-name')].map(e => e.textContent.trim()))
  console.log('  Jam chords after Use in Jam:', jamChords.join(' '))
  if (jamChords.join(' ') !== 'G C D') bad(`Use in Jam loaded ${jamChords.join(' ')}`)
  await shot(page, 'finder-jam')
  // and as a chord sheet in Play (the chords found are still there on Find chords)
  await sub(page, 'Find chords')
  await page.locator('.song-finder button:has-text("Open as a chord sheet")').click()
  try { const t = await playHasTab(page); if (!t.chords) bad('finder chord sheet has no chords') } catch { bad('finder: Open as a chord sheet did nothing') }
  if (page.errors.length) bad('finder page errors: ' + page.errors.join(' | '))
  await page.context().close()
}

// ---------------------------------------------------------------- learn misc
async function learnmisc(browser) {
  const day = 86400e3, now = Date.now()
  const skills = [1, 2, 3, 4, 5].flatMap(d => [{ at: now - (6 - d) * day, kind: 'changes', value: 20 + d * 3 }, { at: now - (6 - d) * day, kind: 'rhythm', value: 60 + d * 5 }])
  const page = await newPage(browser, { 'kg:tab2': 'learn', 'kg:skillLog': skills })
  await page.waitForSelector('.today-card')
  // bends
  await sub(page, 'Explore')
  await page.locator('.tool:has-text("Bends")').click()
  await page.waitForSelector('.bend-trainer')
  await page.locator('.bend-trainer button:has-text("Start listening")').click()
  await page.waitForTimeout(1500)
  await shot(page, 'bends')
  await page.locator('.bend-trainer button:has-text("Vibrato")').click()
  await page.waitForTimeout(800)
  await page.locator('.bend-trainer button:has-text("Stop listening")').click().catch(() => {})
  await page.locator('.bend-trainer button:has-text("Back")').click()
  // progress + trends
  await page.locator('.tool:has-text("Progress")').click()
  await page.waitForTimeout(400)
  await shot(page, 'progress')
  const trends = await page.locator('.trend-head').count()
  console.log(`learnmisc: ${trends} trend graphs`)
  await page.locator('button:has-text("Back")').first().click()
  // About you in Settings
  await page.locator('[aria-label="Settings"]').click()
  await page.waitForTimeout(300)
  const about = await page.locator('text=About you').count()
  if (!about) bad('Settings has no About you')
  await shot(page, 'settings-about')
  await page.locator('button:has-text("Back")').first().click()
  // a quiz on the neck: a tap on the wrong string says which string to use
  await page.waitForSelector('.learn-head')
  await sub(page, 'Course')
  await page.locator('.unit-head').first().click()
  await page.locator('.unit.open .quiz-list button').first().click()
  await page.waitForSelector('.quiz-card')
  let hinted = false
  for (let i = 0; i < 12 && !hinted; i++) {
    const q = await page.evaluate(() => { const q = window.__kgQuestion; return q && q.input.type === 'neck' && q.input.strings ? q.input.strings : null })
    if (q) {
      const other = q[0] === 0 ? 1 : 0
      const hit = page.locator(`.quiz-card .fb-hit[data-string="${other}"][data-fret="3"]`)
      await hit.scrollIntoViewIfNeeded()
      const b = await hit.boundingBox()
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
      const t = await page.locator('.quiz-input .fb.bad').textContent().catch(() => '')
      if (!/Tap on the/.test(t)) bad(`wrong-string tap: "${t}"`)
      else { hinted = true; console.log('  wrong-string hint:', t) }
      await shot(page, 'quiz-hint')
    } else {
      // answer this one and move on
      await page.locator('.quiz-input button').first().click().catch(() => {})
      await page.locator('.quiz-feedback button:has-text("Next")').click({ timeout: 2500 }).catch(() => {})
      await page.waitForTimeout(1300)
    }
  }
  if (!hinted) console.log('  (no single-string neck question came up)')
  if (page.errors.length) bad('learnmisc page errors: ' + page.errors.join(' | '))
  await page.context().close()
}

// ---------------------------------------------------------------- sizes
const SIZES = { phone: { width: 360, height: 740 }, cover: { width: 412, height: 915 }, inner: { width: 840, height: 757 }, tabPortrait: { width: 800, height: 1280 }, tabLandscape: { width: 1280, height: 800 } }
async function overflow(page) {
  return page.evaluate(() => {
    const out = []
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page ' + document.documentElement.scrollWidth)
    for (const el of document.querySelectorAll('#main *, .sheet *')) {
      const r = el.getBoundingClientRect()
      if (r.width && r.right > innerWidth + 1 && !el.closest('.fretboard-wrap, .chips, .heat, .tab-tools, .yt-bar, .prog-strip, .scroll-x, .tab-view, .tools-switch, .zoomable, .hand-scroll, .cof-scroll')) { out.push(`${el.tagName}.${String(el.className).slice(0, 40)} ${Math.round(r.right)}`); if (out.length > 4) break }
    }
    return out
  })
}
async function sizes(browser) {
  for (const theme of ['day', 'night']) for (const [name, viewport] of Object.entries(SIZES)) {
    if (theme === 'night' && !['phone', 'cover', 'tabLandscape'].includes(name)) continue
    const page = await newPage(browser, { 'kg:tab2': 'learn', 'kg:theme': theme, 'kg:skillLog': [{ at: Date.now() - 864e5, kind: 'changes', value: 22 }, { at: Date.now(), kind: 'changes', value: 30 }] }, viewport)
    await page.waitForSelector('.today-card')
    const check = async n => {
      await page.waitForTimeout(250)
      const o = await overflow(page)
      if (o.length) bad(`${name}/${theme}/${n}: overflow ${o.join(', ')}`)
      await page.screenshot({ path: `${DIR}/b13-size-${name}-${theme}-${n}.png` })
    }
    await check('learn')
    await sub(page, 'Explore'); await check('learn-explore')
    await sub(page, 'Course'); await check('learn-course')
    await sub(page, 'Explore')
    await page.locator('.tool:has-text("Theory")').click(); await page.locator('.continue-card').click(); await page.waitForSelector('article.lesson')
    await page.locator('.lesson-video').scrollIntoViewIfNeeded(); await check('lesson-video')
    await page.locator('.lesson-ex').first().scrollIntoViewIfNeeded(); await check('lesson-play')
    await nav(page, 'Learn'); await nav(page, 'Learn'); await page.waitForSelector('.learn-head')
    await page.locator('.tool:has-text("Technique")').click(); await page.locator('.plan-list button').nth(7).click(); await page.waitForSelector('article.technique'); await check('technique')
    await nav(page, 'Learn'); await page.waitForSelector('.learn-head')
    await page.locator('.tool:has-text("Bends")').click(); await page.waitForSelector('.bend-trainer'); await check('bends')
    await nav(page, 'Learn'); await page.waitForSelector('.learn-head')
    await page.locator('.tool:has-text("Progress")').click(); await page.waitForTimeout(300); await check('progress')
    await nav(page, 'Learn'); await page.waitForSelector('.learn-head')
    await page.locator('[aria-label="Settings"]').click(); await page.locator('text=About you').first().scrollIntoViewIfNeeded(); await check('about')
    // Play: songbook sheet, a songbook song with its song check, counts
    await openSongbook(page); await check('songbook')
    await page.locator('.sb-part').nth(3).click(); await page.waitForSelector('.song-check'); await check('songcheck')
    await page.locator('.song-check button:has-text("Got it")').click()
    await options(page); await check('options')
    await optionsDone(page)
    await setOption(page, 'Count it', true)
    await check('counts')
    // Jam: the chord finder
    await nav(page, 'Jam'); await page.waitForSelector('.jam')
    await sub(page, 'Find chords'); await page.waitForSelector('.song-finder'); await check('finder')
    if (page.errors.length) bad(`sizes ${name}/${theme} page errors: ` + page.errors.join(' | '))
    console.log(`sizes ${name}/${theme} done`)
    await page.context().close()
  }
}

// ---------------------------------------------------------------- intime
async function intime(browser) {
  const page = await newPage(browser, { 'kg:tab2': 'play', 'kg:playBand': true, 'kg:sbGenre': 'reggae', 'kg:sbLevel': 0 })
  await page.waitForSelector('.play-head')
  await openSongbook(page)
  await page.locator('.sb-part:has-text("Words")').first().click()
  await page.waitForSelector('.tab-chord')
  await page.locator('.song-check button:has-text("Got it")').click().catch(() => {})
  const title = await page.locator('.song-name b').textContent()
  await page.locator('.tab-tools >> text=In time').click()
  await page.locator('button.listen').click()
  await page.waitForTimeout(9000)
  const s = await page.evaluate(() => ({ playing: document.querySelectorAll('.tab-view.playing').length, marked: document.querySelectorAll('.tab-note.hit, .tab-note.late, .tab-note.early, .tab-note.missed, .tab-note.miss, .tab-note.wrong').length }))
  await shot(page, 'intime')
  await page.locator('button.listen').click()
  await page.waitForTimeout(800)
  console.log(`intime: ${title}: playing ${s.playing}, notes marked ${s.marked}`)
  if (!s.playing) bad('In time did not run on a songbook song')
  if (page.errors.length) bad('intime page errors: ' + page.errors.join(' | '))
  await page.context().close()
}

// ---------------------------------------------------------------- melody
async function melody() {
  const browser = await launch('ode.wav')
  const page = await newPage(browser, { 'kg:tab2': 'progressions', 'kg:sub:jam': 'find' })
  await page.waitForSelector('.song-finder')
  await page.locator('.song-finder button:has-text("Notes (melody)")').click()
  await page.locator('.song-finder button.listen').click()
  let notes = ''
  for (let i = 0; i < 36; i++) { await page.waitForTimeout(500); notes = (await page.locator('.finder-notes').textContent().catch(() => '')) ?? '' }
  await shot(page, 'finder-melody')
  await page.locator('.song-finder button.listen').click()
  console.log(`melody: heard ${notes}`)
  // ode.wav: E E F G G A(wrong) F E D C C D E E D D …
  if (!/E E F G G A F E D C C D E E D D/.test(notes)) bad(`melody notes: ${notes}`)
  await page.locator('.song-finder button:has-text("Open as a tab")').click()
  try { const t = await playHasTab(page); if (t.notes < 10) bad(`melody tab has ${t.notes} notes`) } catch { bad('melody: Open as a tab did nothing') }
  await shot(page, 'finder-melody-tab')
  if (page.errors.length) bad('melody page errors: ' + page.errors.join(' | '))
  await browser.close()
}

;(async () => {
  const browser = await launch()
  const fns = { lessons, technique, songbook, plan, play, intime, finder, melody, learnmisc, sizes }
  await Promise.all(want.map(w => fns[w](browser).catch(e => bad(`${w}: crashed: ${e.message.split('\n')[0]}`))))
  await browser.close()
  console.log(problems.length ? `${problems.length} problems` : 'build 13: all good')
  process.exit(problems.length ? 1 : 0)
})()
