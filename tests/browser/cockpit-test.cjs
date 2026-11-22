// The beat maker cockpit (full screen): a tapped pad becomes the selected sound, its steps toggle with a tap, a drag
// sets how hard, a hold gives quick repeats and a chance, Length makes a polyrhythm, Mute mode, 16 Levels, Fill, the song
// builder, Leave / Full screen, no sideways overflow at cover / inner / tablet. node tests/browser/cockpit-test.cjs
const { chromium } = require('playwright')
let bad = 0; const fail = m => { bad++; console.log('  PROBLEM', m) }
const beat = p => p.evaluate(() => JSON.parse(localStorage.getItem('kg:studioBeat') || '{}'))
;(async () => {
  const b = await chromium.launch()
  for (const [w, h, n] of [[412, 915, 'cover'], [840, 757, 'inner'], [1280, 800, 'tablet']]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true })
    const errs = []; p.on('pageerror', e => errs.push(e.message))
    await p.addInitScript(() => { if (sessionStorage.getItem('s')) return; localStorage.clear(); for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:navHidden': '0', 'kg:getReady': '0', 'kg:askBubble': 'false', 'kg:looperBubble': 'false', 'kg:tipsMode': '"off"', 'kg:tab2': '"progressions"', 'kg:sub:jam': '"beats"' })) localStorage.setItem(k, v); sessionStorage.setItem('s', '1') })
    await p.goto('http://localhost:4173/'); await p.waitForSelector('[data-testid=cockpit]', { timeout: 10000 })
    const tapPad = async v => { const el = p.locator(`[data-testid=cockpit] .st-pad[data-voice=${v}]`).first(); await el.dispatchEvent('pointerdown', { pointerId: 3, isPrimary: true }); await el.dispatchEvent('pointerup', { pointerId: 3 }) }
    await tapPad('rim')
    if (n === 'cover') await p.locator('[data-testid=ck-steps-tab]').click()
    const sel = await p.locator('[data-testid=ck-strip] .ck-sel').innerText()
    if (!/Rim/.test(sel)) fail(`${n}: tapping Rim didn't select it (${sel})`)
    const cell = i => p.locator(`.ck-cell[data-step="${i}"]`)
    const box = async i => (await cell(i).boundingBox())
    // tap step 3 on
    let bb = await box(2); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(400)
    let row = (await beat(p)).rows.find(r => r.voice === 'rim')
    if (!row || !(row.steps[2] > 0)) fail(`${n}: tapping a step didn't turn it on`)
    // drag step 5 up: on, loud
    bb = await box(4); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 - 60, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400)
    row = (await beat(p)).rows.find(r => r.voice === 'rim')
    if (!(row.steps[4] >= 0.9)) fail(`${n}: dragging up didn't make step 5 loud (${row.steps[4]})`)
    // hold step 3: options → ×3 and 50%
    bb = await box(2); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up()
    await p.waitForSelector('[data-testid=ck-step-opts]', { timeout: 2000 }).catch(() => fail(`${n}: holding a step didn't open its options`))
    await p.locator('[data-testid=ck-rat-3]').click(); await p.locator('[data-testid=ck-prob-50]').click(); await p.waitForTimeout(400)
    row = (await beat(p)).rows.find(r => r.voice === 'rim')
    if (row.rat?.[2] !== 3 || row.prob?.[2] !== 0.5) fail(`${n}: step options not saved (${row.rat?.[2]}, ${row.prob?.[2]})`)
    const marks = await cell(2).innerText()
    if (!/×3/.test(marks) || !/50%/.test(marks)) fail(`${n}: the step doesn't show ×3 and 50% (${marks})`)
    // Length 12 = polyrhythm
    await p.locator('[data-testid=ck-len]').selectOption('12'); await p.waitForTimeout(300)
    row = (await beat(p)).rows.find(r => r.voice === 'rim')
    if (row.len !== 12) fail(`${n}: length not 12 (${row.len})`)
    if (await p.locator('.ck-cell').count() !== 12) fail(`${n}: a 12-step sound should show 12 steps (${await p.locator('.ck-cell').count()})`)
    // play, fill, stop
    await p.locator('[data-testid=ck-play]').click(); await p.waitForTimeout(500)
    const f = p.locator('[data-testid=ck-fill]'); await f.dispatchEvent('pointerdown', { pointerId: 4 }); await p.waitForTimeout(400); await f.dispatchEvent('pointerup', { pointerId: 4 })
    await p.locator('[data-testid=ck-play]').click()
    // mute mode on the pads
    if (n === 'cover') await p.locator('.ck-switch button:has-text("Pads")').click()
    await p.locator('[data-testid=ck-mute]').click(); await tapPad('kick'); await p.waitForTimeout(300)
    if (!(await beat(p)).rows.find(r => r.voice === 'kick')?.mute) fail(`${n}: Mute mode didn't mute the kick`)
    await tapPad('kick'); await p.locator('[data-testid=ck-mute]').click(); await p.waitForTimeout(300)
    if ((await beat(p)).rows.find(r => r.voice === 'kick')?.mute) fail(`${n}: Mute mode didn't unmute the kick`)
    // 16 Levels
    await p.locator('[data-testid=pads-levels]').click()
    if (await p.locator('[data-testid=levels-grid] .st-pad').count() !== 16) fail(`${n}: 16 Levels isn't 16 pads`)
    await p.locator('.ck .seg button:has-text("Drums")').first().click()
    // build a song
    await p.locator('[data-testid=ck-song]').click(); await p.locator('[data-testid=ck-build-song]').click(); await p.waitForTimeout(400)
    const bt = await beat(p)
    if ((bt.chain || []).join('') !== 'AABABCBD' || !bt.chainOn || !bt.parts?.B || !bt.parts?.D) fail(`${n}: song not built (${(bt.chain || []).join('')})`)
    await p.locator('[data-testid=ck-sheet] button:has-text("Done")').click()
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`${n}: sideways overflow`)
    // leave and come back
    await p.locator('[data-testid=ck-leave]').click(); await p.waitForSelector('[data-testid=st-cockpit]', { timeout: 3000 }).catch(() => fail(`${n}: no Full screen button after Leave`))
    await p.locator('[data-testid=st-cockpit]').click(); await p.waitForSelector('[data-testid=cockpit]', { timeout: 3000 }).catch(() => fail(`${n}: Full screen didn't bring the cockpit back`))
    if (errs.length) fail(`${n}: page errors ${errs.join(' | ')}`)
    console.log(`${n}: done`)
    await p.close()
  }
  await b.close()
  console.log(bad ? `${bad} problem(s)` : 'cockpit: all good')
  process.exit(bad ? 1 : 0)
})()
