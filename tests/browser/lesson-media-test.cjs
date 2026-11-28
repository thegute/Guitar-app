// Course lessons: "Watch" (teachers' videos placed in the steps, parts play their stretch) and "Songs for this lesson"
// (a song pinned to the lesson shows the bars that use the lesson's skill; Practise opens Play with them looped).
// Cover + inner, psy + day; no sideways scroll, no page errors. node tests/browser/lesson-media-test.cjs
const { chromium } = require('playwright')
let bad = 0; const fail = m => { bad++; console.log('  PROBLEM', m) }
const T = [40, 45, 50, 55, 59, 64]
const note = (s, f, tech) => ({ string: s, fret: f, midi: T[s] + f, ...(tech ? { tech } : {}) })
const line = [[0, 5], [0, 8], [1, 5], [1, 7], [2, 5], [2, 7], [3, 5], [3, 7]].map(([s, f]) => ({ notes: [note(s, f)], dur: 0.5 }))
const chord = { notes: [note(1, 0), note(2, 2), note(3, 2), note(4, 1), note(5, 0)], dur: 4 }
const doc = { id: 'test-song-1', title: 'Test Pentatonic Song', artist: 'Nobody', source: 'gp', inst: 'guitar', updated: 1,
  song: { title: 'Test Pentatonic Song', tempo: 90, tracks: [{ name: 'Guitar', tuning: T, capo: 0, bars: [{ steps: [chord] }, { steps: [chord] }, { steps: line }, { steps: line }, { steps: [chord] }] }] } }
;(async () => {
  const b = await chromium.launch()
  for (const [w, h, n, theme] of [[412, 915, 'cover', 'psy'], [840, 757, 'inner', 'day']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true })
    const errs = []; p.on('pageerror', e => errs.push(e.message))
    await p.route(/youtube\.com\/embed|ytimg\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }))
    await p.addInitScript(([t, d]) => {
      window.__kgTest = true
      if (sessionStorage.getItem('s')) return
      localStorage.clear()
      for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:navHidden': '0', 'kg:getReady': '0', 'kg:askBubble': 'false', 'kg:looperBubble': 'false', 'kg:tipsMode': '"off"', 'kg:tab2': '"learn"', 'kg:theme': JSON.stringify(t), 'kg:lessonSongs': JSON.stringify({ 'c3-minorpent': [d.id] }) })) localStorage.setItem(k, v)
      sessionStorage.setItem('s', '1')
      const r = indexedDB.open('kguitar', 1)
      r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'id' })
      r.onsuccess = () => { const tx = r.result.transaction('songs', 'readwrite'); tx.objectStore('songs').put(d) }
    }, [theme, doc])
    await p.goto('http://localhost:4173/'); await p.waitForTimeout(1500)
    if (!await p.locator('[data-testid=course-lesson-c3-minorpent]').count()) {
      await p.locator('.subtabs [role=tab]:has-text("Explore")').first().click().catch(() => {})
      await p.locator('.tool:has-text("Theory")').first().click().catch(() => {})
    }
    await p.locator('[data-testid=course-lesson-c3-minorpent]').first().click()
    await p.waitForSelector('[data-testid=deep-step]')
    const steps = await p.locator('.deep-rail-step').count()
    let watched = 0, songs = false
    for (let i = 0; i < steps; i++) {
      await p.locator('.deep-rail-step').nth(i).click(); await p.waitForTimeout(200)
      const c = await p.locator('[data-testid=watch-card]').count()
      if (c && !watched) {
        watched = c
        await p.locator('[data-testid=watch-part]').first().click()
        const src = await p.locator('[data-testid=watch-player]').getAttribute('src').catch(() => '')
        if (!/start=\d+&end=\d+/.test(src || '')) fail(`${n}: a part didn't open the player at its time (${src})`)
        await p.locator('[data-testid=watch-here]').scrollIntoViewIfNeeded()
        await p.screenshot({ path: `tests/browser/out/watch-${n}.png` })
      }
      if (await p.locator('[data-testid=lesson-songs]').count() && !songs) {
        songs = true
        await p.waitForSelector('[data-testid=ls-song]', { timeout: 4000 }).catch(() => fail(`${n}: the pinned song isn't listed`))
        const spots = await p.locator('[data-testid=ls-spot]').allInnerTexts()
        if (!spots.some(t => /bars? 3/.test(t))) fail(`${n}: the pentatonic lines (bars 3-4) weren't found (${spots.join(' | ')})`)
        await p.locator('[data-testid=lesson-songs]').scrollIntoViewIfNeeded()
        await p.screenshot({ path: `tests/browser/out/lesson-songs-${n}.png` })
        await p.locator('[data-testid=ls-add]').click()
        if (!await p.locator('[data-testid=ls-add-panel]').count()) fail(`${n}: Add a song didn't open`)
        await p.locator('[data-testid=ls-add-panel] button:has-text("Cancel")').click()
        await p.locator('[data-testid=ls-spot]').first().click(); await p.waitForTimeout(1500)
        if (!await p.locator('.tab-view, svg.tab, [data-testid=tab-view]').count()) fail(`${n}: Practise didn't open Play`)
        await p.goBack().catch(() => {})
        break
      }
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`${n}: step ${i + 1} scrolls sideways`)
    }
    if (!watched) fail(`${n}: no Watch videos in the minor pentatonic lesson`)
    if (!songs) fail(`${n}: no Songs for this lesson on the Use-it step`)
    if (errs.length) fail(`${n}: page errors ${errs.join(' | ')}`)
    console.log(`${n}: ${watched} video(s); songs ${songs}`)
    await p.close()
  }
  await b.close()
  console.log(bad ? `${bad} problem(s)` : 'lesson media: all good')
  process.exit(bad ? 1 : 0)
})()
