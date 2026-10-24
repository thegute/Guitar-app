// Synthesize strummed guitar chords (G – C – D – G, four strums each) as a fake microphone for the chord finder and
// the strum-along chord help: makes tests/browser/out/chords.wav.
const fs = require('fs')
const SR = 48000
const CHORDS = {
  G: [43, 47, 50, 55, 59, 67],
  C: [48, 52, 55, 60, 64],
  D: [50, 57, 62, 66],
}
const prog = ['G', 'C', 'D', 'G']
const per = 2.4, lead = 0.8, strums = 4
const total = Math.ceil((lead + prog.length * per + 0.6) * SR)
const buf = new Float32Array(total)
function pluck(m, t0, gain) {
  const f = 440 * Math.pow(2, (m - 69) / 12)
  const s0 = Math.floor(t0 * SR)
  for (let k = 0; k < SR * 1.0 && s0 + k < total; k++) {
    const t = k / SR
    const env = Math.min(1, t / 0.003) * Math.exp(-t * 2.6)
    let v = 0
    for (let h = 1; h <= 7; h++) v += Math.sin(2 * Math.PI * f * h * t * (1 + 0.0004 * h * h)) * Math.exp(-t * h * 1.2) / h
    buf[s0 + k] += gain * env * v
  }
}
prog.forEach((name, ci) => {
  for (let s = 0; s < strums; s++) {
    const t = lead + ci * per + s * (per / strums)
    // the last strum's ringing notes stop when the next strum comes (fingers lift)
    const s0 = Math.floor(t * SR)
    for (let k = 0; k < 300 && s0 + k < total; k++) buf[s0 + k] *= 1 - k / 300
    for (let k = 300; s0 + k < total && k < SR; k++) buf[s0 + k] = 0
    const down = s % 2 === 0
    const notes = down ? CHORDS[name] : [...CHORDS[name]].reverse()
    notes.forEach((m, i) => pluck(m, t + i * 0.012, (down ? 0.14 : 0.1)))
  }
})
for (let i = 0; i < total; i++) buf[i] += (Math.random() - 0.5) * 0.002
const out = Buffer.alloc(44 + total * 2)
out.write('RIFF', 0); out.writeUInt32LE(36 + total * 2, 4); out.write('WAVE', 8)
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22)
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34)
out.write('data', 36); out.writeUInt32LE(total * 2, 40)
for (let i = 0; i < total; i++) out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2)
fs.mkdirSync(__dirname + '/out', { recursive: true })
fs.writeFileSync(__dirname + '/out/chords.wav', out)
console.log('chords.wav', (total / SR).toFixed(1), 's')
