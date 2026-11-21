// Does the looper play back what you played? A real recorded riff (crunch amp samples, stereo) is the fake input; a
// free loop is recorded on track 1; then the stored take and what the looper actually plays out are saved as WAVs and
// compared with the input (tests/browser/looper-fidelity.py: spectral match frame by frame, stereo width, level).
//   npx vite --port 5179 &   then   node tests/browser/looper-fidelity.cjs <input.wav> <out dir>
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const [input, outDir] = process.argv.slice(2)
const PORT = process.env.LAB_PORT || 5179
fs.mkdirSync(outDir, { recursive: true })

function wav(file, chans, sr) {
  const n = chans[0].length, c = chans.length
  const b = Buffer.alloc(44 + n * c * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * c * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20)
  b.writeUInt16LE(c, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * c * 2, 28); b.writeUInt16LE(c * 2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(n * c * 2, 40)
  for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(chans[k][i] * 32767))), 44 + (i * c + k) * 2)
  fs.writeFileSync(file, b)
}

;(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${path.resolve(input)}`, '--autoplay-policy=no-user-gesture-required'] })
  const ctx = await b.newContext({ viewport: { width: 840, height: 757 }, permissions: ['microphone'] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    try { if (sessionStorage.getItem('seeded')) return } catch { return }
    localStorage.clear()
    for (const [k, v] of Object.entries({ 'kg:welcomed': '1', 'kg:psyDefault': '1', 'kg:askBubble': 'false', 'kg:looperBubble': 'false', 'kg:tab2': '"progressions"', 'kg:sub:jam': '"loop"' })) localStorage.setItem(k, v)
    sessionStorage.setItem('seeded', '1')
  })
  await page.goto(`http://localhost:${PORT}/`)
  await page.waitForSelector('[data-testid=looper]', { timeout: 20000 })
  await page.locator('[data-testid=lp-free]').click()
  await page.locator('[data-testid=lp-rec-0]').click()
  await page.waitForTimeout(4800)
  await page.locator('[data-testid=lp-rec-0]').click()
  const t0 = Date.now()
  while (Date.now() - t0 < 20000) { const c = await page.locator('[data-testid=lp-track-0]').getAttribute('class'); if (/ s-loop/.test(c)) break; await page.waitForTimeout(200) }
  // the beat off: only the loop is heard
  await page.locator('.lp-toggle', { hasText: 'Beat' }).locator('input').uncheck().catch(() => {})
  await page.waitForTimeout(500)
  const res = await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem('kg:looper') || 'null')
    const id = s?.tracks?.[0]?.parts?.A?.takes?.[0]
    const take = await new Promise(res => { const r = indexedDB.open('kg-looper', 1); r.onsuccess = () => { const q = r.result.transaction('takes').objectStore('takes').get(id); q.onsuccess = () => res(q.result) } })
    const E = await import('/src/audio/engine.ts')
    const { TapRecorder } = await import('/src/audio/tap.ts')
    const ac = E.audio()
    const tap = new TapRecorder()
    await tap.start(E.finalOut())
    const t = ac.currentTime + 0.3
    const secs = (s.tracks[0].parts.A.len * 240) / s.bpm
    const out = await tap.capture(t, Math.min(12, secs * 2))
    const enc = a => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }
    const ch = [out.l, out.r]
    return { bpm: s.bpm, bars: s.tracks[0].parts.A.len, sr: take?.sr, ctxSr: ac.sampleRate, take: take ? enc(take.data) : null, takeR: take?.right ? enc(take.right) : null, outL: enc(ch[0]), outR: enc(ch[1]) }
  })
  const dec = s => { const u = Buffer.from(s, 'base64'); return new Float32Array(u.buffer, u.byteOffset, u.byteLength / 4) }
  if (!res.take) { console.log('no take recorded', errors); process.exit(1) }
  const tl = dec(res.take)
  wav(path.join(outDir, 'take.wav'), [tl, res.takeR ? dec(res.takeR) : tl], res.sr)
  wav(path.join(outDir, 'out.wav'), [dec(res.outL), dec(res.outR)], res.ctxSr)
  console.log(`loop ${res.bars} bars at ${res.bpm?.toFixed?.(1)} BPM, take ${res.sr} Hz${res.takeR ? ' stereo' : ' mono'}, context ${res.ctxSr} Hz${errors.length ? ', page errors: ' + errors.join(' | ') : ''}`)
  await b.close()
})().catch(e => { console.error(e); process.exit(1) })
