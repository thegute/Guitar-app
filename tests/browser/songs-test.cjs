// Songs: the one Library (Learning now first, chips, one search over your songs and the songbook, Saved for later) and
// the one Add a song box (a name, a YouTube link → Find a tab / Scan it / Save for later, a pasted tab, a chord sheet
// with its chord band in Play). Cover and inner, day and psy; no sideways overflow, no page errors.
// node tests/browser/songs-test.cjs
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, 'out')
const problems = []
const bad = m => { problems.push(m); console.log('  PROBLEM', m) }
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.querySelector('.main').scrollWidth > document.querySelector('.main').clientWidth + 1)

async function newPage(browser, vp, seed) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, permissions: ['microphone'] })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message))
  await page.addInitScript(s => {
    window.__kgTest = true
    try { if (window.top !== window || sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:getReady': '0', 'kg:tab2': '"songs"', 'kg:tipsMode': '"off"', 'kg:floatCards:play': '[]', ...s })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  }, seed)
  await page.goto('http://localhost:4173/')
  await page.waitForSelector('.songs-screen', { timeout: 10000 })
  return page
}

const now = Date.now()
const stats = {
  // a songbook part in progress (Learning now) and one learned with its review due
  'sb:valley:words:guitar:standard': { title: 'Down in the Valley', inst: 'guitar', runs: [], best: 64, lastAt: now - 3600e3, barMiss: {}, barHit: {} },
  'sb:valley:waltz:guitar:standard': { title: 'Down in the Valley', inst: 'guitar', runs: [], best: 95, lastAt: now - 9 * 864e5, barMiss: {}, barHit: {}, learnedAt: now - 9 * 864e5, review: { box: 1, due: now - 864e5 } },
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
  for (const [vp, theme] of [[{ width: 412, height: 915, n: 'cover' }, 'psy'], [{ width: 840, height: 757, n: 'inner' }, 'day']]) {
    const page = await newPage(browser, vp, { 'kg:theme': JSON.stringify(theme), 'kg:songStats': JSON.stringify(stats) })
    // Library: Learning now first, the review due on top
    await page.waitForSelector('[data-win="learning"]', { timeout: 5000 }).catch(() => bad(`${vp.n}: no Learning now`))
    const order = await page.$$eval('.win[data-win]', ws => ws.map(w => w.getAttribute('data-win')))
    if (order.indexOf('learning') > order.indexOf('songs')) bad(`${vp.n}: Learning now isn't above the songbook (${order.join(',')})`)
    const first = await page.locator('[data-win="learning"] .song-list li').first().innerText()
    if (!/review due/i.test(first)) bad(`${vp.n}: the review due isn't first in Learning now ("${first.replace(/\n/g, ' ')}")`)
    // one search over both
    await page.fill('[data-testid=lib-search]', 'down in the valley')
    await page.waitForTimeout(200)
    const sbHits = await page.locator('[data-win="songs"] .song-list li').count()
    if (sbHits !== 1) bad(`${vp.n}: search "down in the valley" shows ${sbHits} songbook songs`)
    await page.fill('[data-testid=lib-search]', '')
    // chips
    await page.click('[data-testid=lib-songbook]')
    if (await page.locator('[data-win="learning"]').count()) bad(`${vp.n}: Songbook chip still shows Learning now`)
    await page.click('[data-testid=lib-learned]')
    await page.click('[data-testid=lib-all]')
    if (await sideways(page)) bad(`${vp.n}: Library scrolls sideways`)
    await page.screenshot({ path: path.join(OUT, `songs-library-${vp.n}.png`) })

    // Add a song: a name → sites (Save for later); a YouTube link → three choices; save → Library → Saved for later
    await page.click('.subtabs [role=tab]:has-text("Add a song")')
    await page.fill('[data-testid=add-input]', 'Shady Grove')
    await page.waitForSelector('[data-testid=add-name]', { timeout: 2000 }).catch(() => bad(`${vp.n}: a song name didn't offer the search`))
    await page.fill('[data-testid=add-input]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.waitForSelector('[data-testid=add-youtube]', { timeout: 2000 }).catch(() => bad(`${vp.n}: a YouTube link didn't offer Find / Scan / Save`))
    await page.click('[data-testid=yt-find]')
    await page.waitForSelector('[data-testid=yt-query]', { timeout: 2000 }).catch(() => bad(`${vp.n}: Find a tab didn't open the search`))
    await page.click('[data-testid=yt-scan]')
    await page.waitForSelector('[data-win="picture"] input[value*="youtube"], [data-win="picture"] [value*="dQw4w9WgXcQ"]', { timeout: 3000 }).catch(() => bad(`${vp.n}: Scan it didn't put the link in the Riff Scanner`))
    await page.click('[data-testid=yt-save]')
    if (await sideways(page)) bad(`${vp.n}: Add a song scrolls sideways`)
    await page.screenshot({ path: path.join(OUT, `songs-add-${vp.n}.png`) })
    await page.click('.subtabs [role=tab]:has-text("Library")')
    await page.waitForSelector('[data-testid=saved-later] li', { timeout: 3000 }).catch(() => bad(`${vp.n}: Save for later didn't land in the Library`))

    // a chord sheet → Play with a chord band (Mixer card: parts + style; changing style is kept per song)
    await page.click('.subtabs [role=tab]:has-text("Add a song")')
    await page.fill('[data-testid=add-input]', 'G              C\nAmazing grace, how sweet the sound\nG             D\nThat saved a wretch like me\nG       C\nI once was lost but now am found\nG        D       G\nWas blind but now I see')
    await page.waitForSelector('[data-testid=add-tab]', { timeout: 2000 }).catch(() => bad(`${vp.n}: a chord sheet wasn't recognised`))
    await page.fill('.songs-screen input[aria-label="Song title"]', 'Amazing Grace test')
    await page.click('[data-testid=add-load]')
    await page.waitForSelector('.play-head', { timeout: 8000 })
    await page.locator('.song-check button:has-text("Got it")').click({ timeout: 2500 }).catch(() => {})
    await page.locator('[data-find="opts"], button[aria-label^="Options"]').first().click()
    await page.waitForSelector('.play-opts')
    const bandTxt = await page.locator('.play-opts [data-find="band"]').innerText().catch(() => '')
    if (!/gospel band/i.test(bandTxt)) bad(`${vp.n}: the chord band should be a gospel band for Amazing Grace: "${bandTxt.replace(/\n/g, ' ')}"`)
    await page.click('[data-testid=open-mixer]')
    await page.waitForSelector('[data-testid=fc-mixer]', { timeout: 4000 }).catch(() => bad(`${vp.n}: the Mixer card didn't open`))
    for (const p of ['me', 'drums', 'bass']) if (!(await page.locator(`[data-testid=mix-${p}]`).count())) bad(`${vp.n}: no ${p} slider on the Mixer`)
    await page.selectOption('[data-testid=mix-style]', 'reggae')
    await page.waitForTimeout(300)
    const kept = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kg:bandStyle:')).map(k => localStorage.getItem(k)))
    if (!kept.includes('"reggae"')) bad(`${vp.n}: the band style wasn't kept for the song (${kept})`)
    await page.click('[data-testid=mute-drums]')
    const muted = await page.locator('[data-testid=mute-drums][aria-pressed=true]').count()
    if (!muted) bad(`${vp.n}: drums mute didn't stick`)
    await page.click('[data-testid=solo-bass]')
    const dim = await page.$$eval('.fc-mix-row.off', r => r.length)
    if (dim < 2) bad(`${vp.n}: solo bass should dim the others (${dim})`)
    await page.screenshot({ path: path.join(OUT, `songs-mixer-${vp.n}.png`) })
    if (await sideways(page)) bad(`${vp.n}: Play with the Mixer scrolls sideways`)
    console.log(`${vp.n} ${theme}: library (${order.join(' > ')}), add box, saved for later, chord band + mixer`)
    if (page.errors.length) bad(`${vp.n}: page errors: ${page.errors.join(' | ')}`)
    await page.context().close()
  }
  // the PDF's filters: Practice plan, Scanned, Backing tracks, Style and Tuning
  {
    const page = await newPage(browser, { width: 412, height: 915 }, { 'kg:theme': '"psy"' })
    await page.evaluate(async () => {
      const track = (tuning, title) => ({ name: title, tuning, capo: 0, program: 25, bars: [{ steps: [{ dur: 1, notes: [{ string: 0, fret: 3, midi: tuning[0] + 3 }] }] }] })
      const std = [40, 45, 50, 55, 59, 64], dropd = [38, 45, 50, 55, 59, 64]
      const docs = [
        { id: 't-scan', title: 'Scanned riff A', source: 'text', origin: 'scan', inst: 'guitar', updated: Date.now(), song: { title: 'Scanned riff A', tempo: 100, tracks: [track(std, 'g')] } },
        { id: 't-video', title: 'Video song B', source: 'chords', inst: 'guitar', youtube: 'https://youtu.be/abcdefghijk', updated: Date.now(), song: { title: 'Video song B', tempo: 140, tracks: [track(std, 'g')] } },
        { id: 't-dropd', title: 'Drop D riff C', source: 'gp', inst: 'guitar', updated: Date.now(), song: { title: 'Drop D riff C', tempo: 70, tracks: [track(dropd, 'g')] } },
      ]
      await new Promise((res, rej) => { const r = indexedDB.open('kguitar', 1); r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id' }); r.onsuccess = () => { const tx = r.result.transaction('songs', 'readwrite'); docs.forEach(d => tx.objectStore('songs').put(d)); tx.oncomplete = res; tx.onerror = rej }; r.onerror = rej })
    })
    await page.reload()
    await page.waitForSelector('.songs-screen')
    const listed = async () => (await page.locator('[data-win="list"] .song-open b, .song-list .song-open b').allInnerTexts()).filter(t => /riff|song B/.test(t))
    await page.locator('[data-testid=lib-scanned]').click()
    let names = await listed()
    if (names.join() !== 'Scanned riff A') bad(`Scanned shows ${names.join(', ') || 'nothing'}`)
    await page.locator('[data-testid=lib-backing]').click()
    names = await listed()
    if (names.join() !== 'Video song B') bad(`Backing tracks shows ${names.join(', ') || 'nothing'}`)
    await page.locator('[data-testid=lib-mine]').click()
    const tun = page.locator('[data-testid=lib-tuning]')
    if (!(await tun.count())) bad('no Tuning picker with songs in two tunings')
    else {
      await tun.selectOption('Drop D')
      names = await listed()
      if (names.join() !== 'Drop D riff C') bad(`Tuning Drop D shows ${names.join(', ') || 'nothing'}`)
      await tun.selectOption('')
    }
    const sty = page.locator('[data-testid=lib-style]')
    if (!(await sty.count())) bad('no Style picker with songs in different styles')
    await page.locator('[data-testid=lib-plan]').click()
    await page.screenshot({ path: path.join(OUT, 'songs-filters.png'), fullPage: true })
    if (await sideways(page)) bad('filters: sideways overflow')
    if (page.errors.length) bad(`filters: page errors: ${page.errors.join(' | ')}`)
    console.log('filters: scanned, backing, tuning, style, plan checked')
    await page.context().close()
  }
  await browser.close()
  console.log(problems.length ? `${problems.length} problem(s)` : 'songs: all good')
  process.exit(problems.length ? 1 : 0)
})()
