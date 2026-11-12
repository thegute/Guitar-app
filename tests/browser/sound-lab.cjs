// Records every sound-lab scene (src/lab/soundLab.ts) exactly as the app outputs it: everything that reaches the
// speakers is tapped as 32-bit float (so peaks over 0 dBFS show), one WAV per scene, for tools/sound-report.py.
// Run against the preview server: node tests/browser/sound-lab.cjs <tag> [scene,scene…]
// → tests/browser/out/lab/<tag>/<scene>.wav
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const tag = process.argv[2] || 'now'
const only = process.argv[3] ? process.argv[3].split(',') : null
const DIR = path.join(__dirname, 'out', 'lab', tag)
fs.mkdirSync(DIR, { recursive: true })

function floatWav(f32, rate) {
  const data = Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 8, 28)
  h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = await (await browser.newContext({ viewport: { width: 840, height: 757 } })).newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    window.__kgTest = true
    try { localStorage.setItem('kg:welcomed', '1'); localStorage.setItem('kg:psyDefault', '1') } catch { /* frame */ }
    // tap the speakers: every node that connects to the destination goes through one recorder first
    const orig = AudioNode.prototype.connect
    let rec = null
    AudioNode.prototype.connect = function (dest, ...rest) {
      if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode && !this.__isTap) {
        const c = this.context
        if (!c.__tap) {
          const sp = c.createScriptProcessor(4096, 2, 2)
          sp.__isTap = true
          sp.onaudioprocess = e => {
            if (!rec) return
            const L = e.inputBuffer.getChannelData(0), R = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : L
            const o = new Float32Array(L.length * 2)
            for (let i = 0; i < L.length; i++) { o[2 * i] = L[i]; o[2 * i + 1] = R[i] }
            rec.push(o)
          }
          orig.call(sp, c.destination)
          c.__tap = sp
          window.__tapRate = c.sampleRate
        }
        return orig.call(this, c.__tap, ...rest)
      }
      return orig.call(this, dest, ...rest)
    }
    window.__startRec = () => { rec = [] }
    window.__stopRec = () => {
      const chunks = rec || []
      rec = null
      const n = chunks.reduce((a, c) => a + c.length, 0)
      const all = new Float32Array(n)
      let o = 0
      for (const c of chunks) { all.set(c, o); o += c.length }
      const u8 = new Uint8Array(all.buffer)
      let s = ''
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000))
      return { b64: btoa(s), rate: window.__tapRate }
    }
  })
  await page.goto('http://localhost:4173/')
  await page.waitForFunction(() => window.__kgLab, null, { timeout: 15000 })
  const ids = (await page.evaluate(() => window.__kgLab.sceneIds())).filter(id => !only || only.includes(id))
  for (const id of ids) {
    // the first pass loads its sounds; the second is recorded
    await page.evaluate(id => window.__kgLab.runScene(id).catch(() => null), id).catch(() => null)
    await page.evaluate(() => window.__startRec())
    const r = await page.evaluate(id => window.__kgLab.runScene(id).then(() => 'ok', e => String(e)), id)
    const { b64, rate } = await page.evaluate(() => window.__stopRec())
    const f32 = new Float32Array(new Uint8Array(Buffer.from(b64, 'base64')).buffer)
    fs.writeFileSync(path.join(DIR, `${id}.wav`), floatWav(f32, rate))
    console.log(`${id}: ${r}, ${(f32.length / 2 / rate).toFixed(1)} s`)
  }
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors')
  await browser.close()
})()
