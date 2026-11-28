// The technique course (shown with kg:previewPaths until its videos are in): listed under the theory course, every lesson
// opens, every step renders without sideways scroll, an exercise task opens that exercise in Learn → Exercises, a songbook
// tune task opens Play. Cover + inner. node tests/browser/technique-test.cjs
const { chromium } = require('playwright')
const innerHeightOf = n => (n === 'cover' ? 915 : 757)
let bad = 0; const fail = m => { bad++; console.log('  PROBLEM', m) }
;(async () => {
  const b = await chromium.launch()
  for (const [w, h, n, theme] of [[412, 915, 'cover', 'psy'], [840, 757, 'inner', 'day']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true })
    const errs = []; p.on('pageerror', e => errs.push(e.message))
    await p.addInitScript(t => {
      window.__kgTest = true
      if (sessionStorage.getItem('s')) return
      localStorage.clear()
      for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:navHidden': '0', 'kg:getReady': '0', 'kg:askBubble': 'false', 'kg:looperBubble': 'false', 'kg:tipsMode': '"off"', 'kg:tab2': '"learn"', 'kg:theme': JSON.stringify(t), 'kg:previewPaths': '1' })) localStorage.setItem(k, v)
      sessionStorage.setItem('s', '1')
    }, theme)
    const toList = async () => {
      for (let k = 0; k < 3 && await p.locator('[data-testid=deep-step]').count(); k++) { await p.locator('button:has-text("← Back")').first().click().catch(() => {}); await p.waitForTimeout(300) }
      if (!await p.locator('[data-testid=path-technique]').count()) {
        await p.locator('nav button:has-text("Learn"), .rail button:has-text("Learn"), [data-tab=learn]').first().click().catch(() => {})
        await p.waitForTimeout(400)
        await p.locator('.subtabs [role=tab]:has-text("Explore")').first().click().catch(() => {})
        await p.locator('.tool:has-text("Theory")').first().click().catch(() => {})
      }
      await p.waitForSelector('[data-testid=path-technique]', { timeout: 6000 })
    }
    await p.goto('http://localhost:4173/'); await p.waitForTimeout(1500)
    await toList()
    const ids = await p.locator('[data-testid=path-technique] [data-testid^=course-lesson-]').evaluateAll(es => es.map(e => e.dataset.testid.replace('course-lesson-', '')))
    if (ids.length < 7) fail(`${n}: only ${ids.length} technique lessons listed`)
    for (const id of ids) {
      await toList()
      await p.locator(`[data-testid=course-lesson-${id}]`).first().click()
      await p.waitForSelector('[data-testid=deep-step]')
      const head = await p.locator('.deep').first().innerText()
      if (!/Technique · Unit \d+ · Lesson \d+/.test(head)) fail(`${n} ${id}: no "Technique · Unit · Lesson" label`)
      const steps = await p.locator('.deep-rail-step').count()
      for (let i = 0; i < steps; i++) {
        await p.locator('.deep-rail-step').nth(i).click(); await p.waitForTimeout(120)
        if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`${n} ${id}: step ${i + 1} scrolls sideways`)
      }
      if (id === 't1-grip') {
        // practice: an exercise task opens that exercise
        const pi = await p.locator('.deep-rail-step').evaluateAll(es => es.findIndex(e => /Practice/.test(e.textContent || '')))
        await p.locator('.deep-rail-step').nth(pi).click(); await p.waitForTimeout(200)
        await p.screenshot({ path: `tests/browser/out/technique-practice-${n}.png` })
        await p.locator('[data-testid=deep-task]:has-text("Open strings, down-up")').first().click(); await p.waitForTimeout(2500)
        const txt = await p.locator('body').innerText()
        if (!/Open strings, down-up/.test(txt) || !/PK-1/.test(txt)) fail(`${n}: the exercise task didn't open PK-1 in Exercises`)
        const top = await p.evaluate(() => { const h = [...document.querySelectorAll('.ex-card-head')].find(e => /\bPK-1\b/.test(e.textContent || '')); return h ? h.getBoundingClientRect().top : -9999 })
        if (top < -5 || top > innerHeightOf(n)) fail(`${n}: the PK-1 card isn't on screen (top ${Math.round(top)})`)
        await p.screenshot({ path: `tests/browser/out/technique-exercise-${n}.png` })
        await p.goBack().catch(() => {}); await p.waitForTimeout(800)
        await toList()
        await p.locator('[data-testid=course-lesson-t1-grip]').first().click()
        await p.waitForSelector('[data-testid=deep-step]')
        const ui = await p.locator('.deep-rail-step').evaluateAll(es => es.findIndex(e => /Use it/.test(e.textContent || '')))
        await p.locator('.deep-rail-step').nth(ui).click(); await p.waitForTimeout(200)
        if (!await p.locator('[data-testid=lesson-songs]').count()) fail(`${n}: no Songs for this lesson on the Use-it step`)
        await p.locator('[data-testid=deep-task]:has-text("Eighth of January")').first().click(); await p.waitForTimeout(1800)
        if (!await p.locator('.tab-view, svg.tab, [data-testid=tab-view]').count()) fail(`${n}: the songbook tune didn't open Play`)
        await p.goBack().catch(() => {}); await p.waitForTimeout(800)
      } else {
        await p.locator('button:has-text("← Back")').first().click().catch(() => {}); await p.waitForTimeout(300)
      }
    }
    if (errs.length) fail(`${n}: page errors ${errs.join(' | ')}`)
    console.log(`${n}: ${ids.length} lessons walked`)
    await p.close()
  }
  await b.close()
  console.log(bad ? `${bad} problem(s)` : 'technique course: all good')
  process.exit(bad ? 1 : 0)
})()
