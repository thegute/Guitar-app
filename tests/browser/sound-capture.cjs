// Records what the app actually plays (Jam styles, Hear it) by tapping the audio output, so the mix can be checked
// offline (levels, timing, spectrum). Run after `npm run build && npx vite preview --port 4173`.
// Writes tests/browser/out/sound-<name>.wav; analyse with tools/analyse-capture.py.
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const DIR = path.join(__dirname, 'out')
fs.mkdirSync(DIR, { recursive: true })

;(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const ctx = await browser.newContext({ viewport: { width: 840, height: 757 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ERR_|net::/i.test(m.text())) errors.push('console: ' + m.text()) })
  await page.addInitScript(() => {
    try { localStorage.setItem('kg:welcomed', '1') } catch { /* frame */ }
    // tap the final output as raw float samples (no codec in between, so peaks are exact)
    const orig = AudioNode.prototype.connect
    let rec = null
    AudioNode.prototype.connect = function (dest, ...rest) {
      const r = orig.call(this, dest, ...rest)
      if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode && !this.__isTap) {
        const c = this.context
        if (!c.__tap) {
          const sp = c.createScriptProcessor(4096, 2, 2)
          sp.__isTap = true
          sp.onaudioprocess = e => {
            if (!rec) return
            // interleave left/right
            const L = e.inputBuffer.getChannelData(0), R = e.inputBuffer.getChannelData(1), o = new Float32Array(L.length * 2)
            for (let i = 0; i < L.length; i++) { o[2 * i] = L[i]; o[2 * i + 1] = R[i] }
            rec.push(o)
          }
          orig.call(sp, c.destination)
          c.__tap = sp
          window.__tapRate = c.sampleRate
        }
        orig.call(this, c.__tap)
      }
      return r
    }
    window.__startRec = () => { rec = [] }
    window.__stopRec = () => {
      const chunks = rec || []
      rec = null
      const n = chunks.reduce((a, c) => a + c.length, 0)
      const all = new Int16Array(n)
      let o = 0
      for (const c of chunks) { for (let i = 0; i < c.length; i++) all[o + i] = Math.max(-32768, Math.min(32767, Math.round(c[i] * 32767))) ; o += c.length }
      const u8 = new Uint8Array(all.buffer)
      let s = ''
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000))
      return { b64: btoa(s), rate: window.__tapRate }
    }
  })
  await page.goto('http://localhost:4173/')
  await page.click('nav >> text=Jam')
  await page.waitForSelector('.prog-card')
  const save = async (name, ms) => {
    await page.evaluate(() => window.__startRec())
    await page.waitForTimeout(ms)
    const { b64, rate } = await page.evaluate(() => window.__stopRec())
    // a plain 16-bit WAV
    const pcm = Buffer.from(b64, 'base64')
    const h = Buffer.alloc(44)
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
    h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 4, 28)
    h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
    fs.writeFileSync(path.join(DIR, `sound-${name}.wav`), Buffer.concat([h, pcm]))
  }
  if (process.argv[2] === 'metronome') {
    // Tools → Tempo with a drum beat
    await page.click('nav >> text=Tools')
    await page.click('text=Tempo')
    await page.selectOption('select:near(:text("Drum beat"))', process.argv[3] || 'rock')
    await page.click('button:has-text("Start")')
    await page.waitForTimeout(2000)
    await save('metronome-' + (process.argv[3] || 'rock'), 6000)
    await page.click('button:has-text("Stop")')
    console.log(errors.length ? errors.join('\n') : 'no page errors')
    await browser.close()
    return
  }
  const styles = (process.argv[2] || 'Metal,Reggae,Folk,Jazz,Rock,Funk,Country').split(',')
  for (const st of styles) {
    if (!(await page.isVisible('.jam-options'))) await page.click('button:has-text("Options")')
    await page.click(`.jam-options >> text=${st}`)
    await page.click('.jam-options [aria-label="How many chords"] >> text=4')
    await page.click('button:has-text("New progression")')
    await page.waitForTimeout(200)
    const names = await page.$$eval('.prog-card .pc-name', e => e.map(x => x.textContent).join(' '))
    // PARTS=guitar,bass,drums: only these play (to check each part's level)
    if (process.env.PARTS) {
      for (const [chip, part] of [['Backing guitar', 'guitar'], ['Bass', 'bass'], ['Drums', 'drums']]) {
        const on = (await page.getAttribute(`button.chip:has-text("${chip}")`, 'aria-pressed')) === 'true'
        if (on !== process.env.PARTS.split(',').includes(part)) await page.click(`button.chip:has-text("${chip}")`)
      }
    }
    // first run loads the sounds, the second one is recorded
    await page.click('button:has-text("Play loop")')
    await page.waitForTimeout(2500)
    await page.click('button:has-text("Stop")')
    await page.waitForTimeout(300)
    await page.click('button:has-text("Play loop")')
    await save(st.toLowerCase() + (process.env.PARTS ? '-' + process.env.PARTS.replace(/,/g, '+') : ''), 9000)
    await page.click('button:has-text("Stop")')
    const bpm = await page.textContent('text=/Tempo \\d+ BPM/')
    console.log(st, '|', names, '|', bpm)
  }
  console.log(errors.length ? errors.join('\n') : 'no page errors')
  await browser.close()
})()
