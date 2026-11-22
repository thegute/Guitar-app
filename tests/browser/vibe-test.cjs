// Match a song's vibe: a made-up song (100 BPM, kick 1 + "and of 2" + 3, snare 2 and 4, C G Am F) goes in as a file;
// the beat maker gets a new beat at 100 BPM with kick on 1 and snare on 2 and 4, Reroll / How close change it, chords on
// and off, Put my beat back restores the old one. Cockpit (cover + tablet) and the windows layout.
// node tests/browser/vibe-test.cjs
const { chromium } = require('playwright')
const fs = require('fs'), path = require('path')
let bad = 0; const fail = m => { bad++; console.log('  PROBLEM', m) }
const sr = 22050
function wav() {
  const bpm = 100, beat = 60 / bpm, st = beat / 4, bars = 12
  const x = new Float32Array(Math.ceil((bars * 4 * beat + 1) * sr)); let s = 7
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff * 2 - 1 }
  const chords = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]]
  for (let b = 0; b < bars; b++) {
    const t0 = b * 4 * beat
    for (const k of [0, 6, 8]) { const a = Math.floor((t0 + k * st) * sr); for (let i = 0; i < sr * 0.18; i++) { const t = i / sr; x[a + i] += 0.9 * Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-t * 40)) * t) * Math.exp(-t * 18) } }
    for (const k of [4, 12]) { const a = Math.floor((t0 + k * st) * sr); for (let i = 0; i < sr * 0.15; i++) { const t = i / sr; x[a + i] += (0.45 * rnd() + 0.3 * Math.sin(2 * Math.PI * 200 * t)) * Math.exp(-t * 25) } }
    let prev = 0
    for (const k of [0, 2, 4, 6, 8, 10, 12, 14]) { const a = Math.floor((t0 + k * st) * sr); for (let i = 0; i < sr * 0.04; i++) { const n = rnd(); x[a + i] += 0.25 * (n - prev) * Math.exp(-(i / sr) * 120); prev = n } }
    const ch = chords[b % 4]
    for (let i = 0; i < 4 * beat * sr; i++) { const a = Math.floor(t0 * sr) + i; if (a >= x.length) break; let v = 0; for (const m of ch) v += Math.sin(2 * Math.PI * 440 * Math.pow(2, (m - 69) / 12) * i / sr); x[a] += 0.06 * v }
  }
  const pcm = Buffer.alloc(x.length * 2)
  for (let i = 0; i < x.length; i++) pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 0.7 * 32767))), i * 2)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  const f = path.join(__dirname, 'out', 'vibe-pop.wav'); fs.writeFileSync(f, Buffer.concat([h, pcm])); return f
}
const beatOf = p => p.evaluate(() => JSON.parse(localStorage.getItem('kg:studioBeat') || '{}'))
;(async () => {
  const file = wav()
  const b = await chromium.launch()
  for (const [w, h, n, ck] of [[412, 915, 'cover', true], [1280, 800, 'tablet', true], [840, 757, 'windows', false]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true })
    const errs = []; p.on('pageerror', e => errs.push(e.message))
    await p.addInitScript(c => { if (sessionStorage.getItem('s')) return; localStorage.clear(); for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:navHidden': '0', 'kg:getReady': '0', 'kg:askBubble': 'false', 'kg:looperBubble': 'false', 'kg:tipsMode': '"off"', 'kg:tab2': '"progressions"', 'kg:sub:jam': '"beats"', 'kg:studioCockpit': String(c) })) localStorage.setItem(k, v); sessionStorage.setItem('s', '1') }, ck)
    await p.goto('http://localhost:4173/')
    await p.waitForSelector(ck ? '[data-testid=cockpit]' : '[data-testid=st-vibe]', { timeout: 10000 })
    await p.waitForTimeout(600)
    const oldBpm = (await beatOf(p)).bpm
    await p.locator(ck ? '[data-testid=ck-vibe]' : '[data-testid=st-vibe]').click()
    await p.locator('[data-testid=vibe-from-file]').click()
    await p.locator('[data-testid=vibe-file]').setInputFiles(file)
    await p.waitForSelector('[data-testid=vibe-card]', { timeout: 20000 }).catch(async () => fail(`${n}: no result (${await p.locator('[data-testid=vibe] [role=status]').textContent().catch(() => '')})`))
    const desc = await p.locator('[data-testid=vibe-desc]').textContent().catch(() => '')
    if (!/\b(99|100|101) BPM/.test(desc) || !/straight/.test(desc)) fail(`${n}: description ${desc}`)
    const chordsTxt = await p.locator('[data-testid=vibe-card]').innerText()
    for (const c of ['C', 'G', 'Am', 'F']) if (!new RegExp(`\\b${c}\\b`).test(chordsTxt)) fail(`${n}: chord ${c} missing (${chordsTxt})`)
    await p.waitForTimeout(500)
    let bt = await beatOf(p)
    const row = v => bt.rows.find(r => r.voice === v)
    if (Math.abs(bt.bpm - 100) > 1) fail(`${n}: beat tempo ${bt.bpm}`)
    if (!(row('kick')?.steps[0] > 0) || !(row('snare')?.steps[4] > 0) || !(row('snare')?.steps[12] > 0)) fail(`${n}: kick 1 / snare 2 and 4 missing`)
    if (!(bt.tracks?.length >= 2)) fail(`${n}: no chord tracks`)
    // reroll: some take differs
    const sig = JSON.stringify(bt.rows); let changed = false
    for (let i = 0; i < 6 && !changed; i++) { await p.locator('[data-testid=vibe-reroll]').click(); await p.waitForTimeout(350); changed = JSON.stringify((await beatOf(p)).rows) !== sig }
    if (!changed) fail(`${n}: Reroll never changed the beat`)
    await p.locator('[data-testid=vibe-close]').fill('0'); await p.waitForTimeout(350)
    await p.locator('[data-testid=vibe-chords]').uncheck(); await p.waitForTimeout(350)
    bt = await beatOf(p)
    if (bt.tracks?.length) fail(`${n}: chords still there after unticking`)
    await p.locator('[data-testid=vibe-play]').click(); await p.waitForTimeout(600); await p.locator('[data-testid=vibe-play]').click()
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`${n}: sideways overflow`)
    if (n === 'cover') await p.screenshot({ path: 'tests/browser/out/vibe-cover.png' })
    await p.locator('[data-testid=vibe-back]').click(); await p.waitForTimeout(400)
    if ((await beatOf(p)).bpm !== oldBpm) fail(`${n}: Put my beat back didn't restore the tempo (${(await beatOf(p)).bpm} vs ${oldBpm})`)
    if (errs.length) fail(`${n}: page errors ${errs.join(' | ')}`)
    console.log(`${n}: ${desc}`)
    await p.close()
  }
  await b.close()
  console.log(bad ? `${bad} problem(s)` : 'vibe: all good')
  process.exit(bad ? 1 : 0)
})()
