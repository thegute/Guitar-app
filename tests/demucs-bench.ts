// Voice isolation check (needs the model and onnxruntime-node; not part of npm test):
//   KG_MODELS=/tmp/claude-0/models ORT_NODE=/tmp/claude-0/ort KG_BENCH=/tmp/claude-0/bench npm run bench:demucs
// 1 the STFT against torch.stft  2 prep → post with a pass-through network gives the input back  3 the real network on a
// mix whose voice we know: how much closer to the voice the output is than the mix (SDR), and how long it takes.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { DEMUCS, stft, spec, ispec, prep, post, vocals } from '../src/ml/demucs'
import { halfToF32 } from '../src/ml/models'
const req = createRequire(import.meta.url)
const ort = req(`${process.env.ORT_NODE}/node_modules/onnxruntime-node`)
const B = `${process.env.KG_BENCH}/demucs`, M = `${process.env.KG_MODELS}/demucs`
let fails = 0
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++ }
const f32 = (p: string) => { const b = fs.readFileSync(p); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4) }

// 1 STFT
{
  const x = f32(`${B}/stft_in.f32`), ref = f32(`${B}/stft_ref.f32`)
  const z = stft(x)
  let err = 0, big = 0
  const n = z.bins * z.frames
  for (let i = 0; i < n; i++) { err = Math.max(err, Math.abs(z.re[i] - ref[i]), Math.abs(z.im[i] - ref[n + i])); big = Math.max(big, Math.abs(ref[i])) }
  ok(ref.length === 2 * n && err < 1e-4 * big, `STFT = torch.stft (${z.bins}×${z.frames}, largest difference ${err.toExponential(2)} of ${big.toFixed(2)})`)
}
// 2 HTDemucs._spec / _ispec against the same steps done with torch (the frequency branch fades at the segment's very
// edges by design: demucs pads 2 empty frames there and the triangle overlap hides it)
{
  const S = DEMUCS.seg, F = DEMUCS.bins, T = DEMUCS.frames
  const l = new Float32Array(S)
  for (let i = 0; i < S; i++) l[i] = Math.sin(i * 0.031) * 0.3 + Math.sin(i * 0.0071) * 0.2
  const z = spec(l), zr = f32(`${B}/spec_ref.f32`)
  let e1 = 0
  for (let i = 0; i < F * T; i++) e1 = Math.max(e1, Math.abs(z.re[i] - zr[i]), Math.abs(z.im[i] - zr[F * T + i]))
  ok(zr.length === 2 * F * T && e1 < 1e-4, `_spec = demucs (2048×336, largest difference ${e1.toExponential(2)})`)
  const y = ispec(z.re, z.im, T, S), yr = f32(`${B}/ispec_ref.f32`)
  let e2 = 0
  for (let i = 0; i < S; i++) e2 = Math.max(e2, Math.abs(y[i] - yr[i]))
  ok(e2 < 1e-5, `_ispec = demucs, edges included (largest difference ${e2.toExponential(2)})`)
  const r = new Float32Array(S)
  for (let i = 0; i < S; i++) r[i] = Math.cos(i * 0.017) * 0.25
  const p = prep(l, r)
  const [a, b] = post(p.x, p.xt, p)
  let e3 = 0
  for (let i = 8192; i < S - 8192; i++) e3 = Math.max(e3, Math.abs(a[i] - 2 * l[i]), Math.abs(b[i] - 2 * r[i]))
  ok(e3 < 2e-4, `prep → post with a pass-through network gives the sound back (inside the edges; largest error ${e3.toExponential(2)})`)
}
// 3 the real network
await (async () => {
  const sess = await ort.InferenceSession.create(`${M}/htdemucs_fwd.onnx`, { executionProviders: ['cpu'], intraOpNumThreads: 4 })
  console.log('inputs', sess.inputNames, 'outputs', sess.outputNames)
  const run = async (x: Float32Array, xt: Float32Array) => {
    const o = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', x, [1, 4, DEMUCS.bins, DEMUCS.frames]), [sess.inputNames[1]]: new ort.Tensor('float32', xt, [1, 2, DEMUCS.seg]) })
    return { x: o[sess.outputNames[0]].data as Float32Array, xt: o[sess.outputNames[1]].data as Float32Array }
  }
  const mix = f32(`${B}/mix.f32`), voice = f32(`${B}/voice.f32`)
  const n = mix.length / 2
  const L = new Float32Array(n), R = new Float32Array(n), VL = new Float32Array(n), VR = new Float32Array(n)
  for (let i = 0; i < n; i++) { L[i] = mix[2 * i]; R[i] = mix[2 * i + 1]; VL[i] = voice[2 * i]; VR[i] = voice[2 * i + 1] }
  const t0 = Date.now()
  const [ol, or] = await vocals(L, R, run, { onProgress: f => process.stdout.write(`\r  ${Math.round(f * 100)}%  `) })
  const secs = (Date.now() - t0) / 1000
  console.log('')
  const sdr = (est: Float32Array[], ref: Float32Array[]) => { let s = 0, e = 0; for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) { s += ref[c][i] ** 2; e += (ref[c][i] - est[c][i]) ** 2 } return 10 * Math.log10(s / e) }
  const before = sdr([L, R], [VL, VR]), after = sdr([ol, or], [VL, VR])
  ok(after > before + 6, `the voice comes out: SDR ${before.toFixed(1)} dB for the mix → ${after.toFixed(1)} dB isolated (${(n / 44100).toFixed(0)} s in ${secs.toFixed(1)} s on this computer's CPU)`)
  // the phone sends the network's outputs back as half floats: the same run through that rounding
  const toHalf = (f: number) => { const b = new DataView(new ArrayBuffer(4)); b.setFloat32(0, f); const x = b.getUint32(0); const sign = (x >>> 16) & 0x8000, e = (x >>> 23) & 0xff; let m = x & 0x7fffff
    if (e === 0xff) return sign | 0x7c00 | (m ? 0x200 : 0); const ne = e - 112; if (ne >= 31) return sign | 0x7c00
    if (ne <= 0) { if (ne < -10) return sign; m |= 0x800000; const sh = 14 - ne; let h = m >>> sh; const rem = m & ((1 << sh) - 1), mid = 1 << (sh - 1); if (rem > mid || (rem === mid && h & 1)) h++; return sign | h }
    let h = (ne << 10) | (m >>> 13); const rem = m & 0x1fff; if (rem > 0x1000 || (rem === 0x1000 && h & 1)) h++; return sign | h }
  const halfRun = async (x: Float32Array, xt: Float32Array) => { const r = await run(x, xt); const q = (a: Float32Array) => { const u = new Uint16Array(a.length); for (let i = 0; i < a.length; i++) u[i] = toHalf(a[i]); return halfToF32(u) }; return { x: q(r.x), xt: q(r.xt) } }
  const [hl, hr] = await vocals(L.slice(0, 44100 * 8), R.slice(0, 44100 * 8), halfRun)
  const [fl, fr] = await vocals(L.slice(0, 44100 * 8), R.slice(0, 44100 * 8), run)
  let d = 0, e2 = 0
  for (let i = 0; i < hl.length; i++) { d += (hl[i] - fl[i]) ** 2 + (hr[i] - fr[i]) ** 2; e2 += fl[i] ** 2 + fr[i] ** 2 }
  ok(10 * Math.log10(e2 / d) > 40, `half-float outputs (the phone's) change the voice by ${(10 * Math.log10(e2 / d)).toFixed(0)} dB below it (inaudible)`)
  const out = new Float32Array(2 * n)
  for (let i = 0; i < n; i++) { out[2 * i] = ol[i]; out[2 * i + 1] = or[i] }
  fs.writeFileSync(`${B}/vocals_ts.f32`, Buffer.from(out.buffer))
})()
console.log(fails ? `${fails} failed` : 'voice isolation: all good')
process.exit(fails ? 1 : 0)
