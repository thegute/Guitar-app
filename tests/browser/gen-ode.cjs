// Synthesize a guitar-like plucked melody (Ode to Joy, with one wrong note) as the fake microphone input.
const fs = require('fs')
const SR = 48000
const E4 = 64, F4 = 65, G4 = 67, D4 = 62, C4 = 60, WRONG = 69
const notes = [E4, E4, F4, G4, G4, WRONG, F4, E4, D4, C4, C4, D4, E4, E4, D4, D4, E4, E4, F4, G4, G4, F4, E4, D4, C4, C4, D4, E4, D4, C4, C4]
const gap = 0.45, lead = 1.2, tail = 2
const total = Math.ceil((lead + notes.length * gap + tail) * SR)
const buf = new Float32Array(total)
notes.forEach((m, i) => {
  const f = 440 * Math.pow(2, (m - 69) / 12)
  const t0 = Math.floor((lead + i * gap) * SR)
  for (let k = 0; k < SR * 1.2 && t0 + k < total; k++) {
    const t = k / SR
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 3.2)
    let v = 0
    for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * t) * Math.exp(-t * h * 1.5) / h
    // previous note gets damped when the next one is picked
    buf[t0 + k] = buf[t0 + k] * (k < 400 ? 1 - k / 400 : 0) + 0.32 * env * v
  }
})
// a little room noise
for (let i = 0; i < total; i++) buf[i] += (Math.random() - 0.5) * 0.002
const out = Buffer.alloc(44 + total * 2)
out.write('RIFF', 0); out.writeUInt32LE(36 + total * 2, 4); out.write('WAVE', 8)
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22)
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34)
out.write('data', 36); out.writeUInt32LE(total * 2, 40)
for (let i = 0; i < total; i++) out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2)
fs.mkdirSync(__dirname + '/out', { recursive: true })
fs.writeFileSync(__dirname + '/out/ode.wav', out)
console.log('wrote', notes.length, 'notes,', (total / SR).toFixed(1), 's')
