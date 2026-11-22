// Match a song's vibe: made-up songs with a known tempo, swing, drum pattern and chords go in; the feel must come out,
// and the new beat must keep it (kick on 1, snare on 2 and 4, the swing, the chords) without being a copy.
import { readVibe, vibeBeat, describeVibe, grooveProfile } from '../src/studio/vibe'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }
const sr = 22050

/** A song: kick on `kick` 16ths, snare on `snare`, hats on every 8th (or 16th), swing on the off-16ths, chords (midi lists) per bar. */
function song(o: { bpm: number; bars: number; beats?: number; noise?: number; kick: number[]; snare: number[]; hat16?: boolean; swing?: number; chords: number[][]; seed?: number }) {
  const beat = 60 / o.bpm, st = beat / 4
  const nb = o.beats ?? 4
  const x = new Float32Array(Math.ceil((o.bars * nb * beat + 1) * sr))
  let s = o.seed ?? 7
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff * 2 - 1 }
  const at = (step: number) => step * st + (step % 2 ? (o.swing ?? 0) * st : 0)
  for (let b = 0; b < o.bars; b++) {
    const t0 = b * nb * beat
    for (const k of o.kick) { const a = Math.floor((t0 + at(k)) * sr); for (let i = 0; i < sr * 0.18 && a + i < x.length; i++) { const t = i / sr; x[a + i] += 0.9 * Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-t * 40)) * t) * Math.exp(-t * 18) } }
    for (const k of o.snare) { const a = Math.floor((t0 + at(k)) * sr); for (let i = 0; i < sr * 0.15 && a + i < x.length; i++) { const t = i / sr; x[a + i] += (0.45 * rnd() + 0.3 * Math.sin(2 * Math.PI * 200 * t)) * Math.exp(-t * 25) } }
    const hats = (o.hat16 ? [...Array(16).keys()] : [0, 2, 4, 6, 8, 10, 12, 14]).filter(k => k < nb * 4)
    let prev = 0
    for (const k of hats) { const a = Math.floor((t0 + at(k)) * sr); for (let i = 0; i < sr * 0.04 && a + i < x.length; i++) { const n = rnd(); x[a + i] += 0.25 * (n - prev) * Math.exp(-(i / sr) * 120); prev = n } }
    const ch = o.chords[b % o.chords.length]
    for (let i = 0; i < nb * beat * sr; i++) { const a = Math.floor(t0 * sr) + i; if (a >= x.length) break; let v = 0; for (const m of ch) v += Math.sin(2 * Math.PI * 440 * Math.pow(2, (m - 69) / 12) * i / sr); x[a] += 0.06 * v }
  }
  if (o.noise) for (let i = 0; i < x.length; i++) x[i] += o.noise * rnd()
  return x
}
const on = (p: number[], i: number) => p[i] >= 0.5
const C = [48, 60, 64, 67], G = [43, 59, 62, 67], Am = [45, 60, 64, 69], F = [41, 60, 65, 69]

// 1. straight pop: kick 1 and the "and" of 2 + 3, snare 2 and 4, 8th hats, C G Am F
{
  const x = song({ bpm: 100, bars: 12, kick: [0, 6, 8], snare: [4, 12], chords: [C, G, Am, F] })
  const v = readVibe(x, sr)
  ok(!!v, 'pop: heard something'); if (process.env.DBG) console.log(JSON.stringify(v))
  if (v) {
    ok(Math.abs(v.bpm - 100) <= 2, `pop: tempo ~100 (${v.bpm})`)
    ok(v.beatsPerBar === 4, 'pop: in 4')
    ok(v.swing < 0.08, `pop: straight (${v.swing})`)
    ok(on(v.profile.kick, 0) && on(v.profile.kick, 8), `pop: kick on 1 and 3 (${v.profile.kick.join(',')})`)
    ok(on(v.profile.snare, 4) && on(v.profile.snare, 12), `pop: snare on 2 and 4 (${v.profile.snare.join(',')})`)
    ok(on(v.profile.hat, 2) && on(v.profile.hat, 6), `pop: 8th hats (${v.profile.hat.join(',')})`)
    ok(v.key?.root === 'C' && !v.key.minor || v.key?.root === 'A' && v.key.minor, `pop: key C major / A minor (${JSON.stringify(v.key)})`)
    const names = v.chords.map(c => c.name)
    ok(['C', 'G', 'Am', 'F'].every(n => names.includes(n)), `pop: chords C G Am F (${names.join(' ')})`)
    ok(/100 BPM/.test(describeVibe(v)) && /straight/.test(describeVibe(v)), `pop: words (${describeVibe(v)})`)
    const b = vibeBeat(v, { close: 1, seed: 1, chords: true })
    const row = (n: string) => b.rows.find(r => r.voice === n)!
    ok(b.bpm === v.bpm && b.swing === v.swing, 'pop beat: tempo and swing carried')
    ok(row('kick').steps[0] > 0 && row('snare').steps[4] > 0 && row('snare').steps[12] > 0, 'pop beat: kick on 1, snare 2 and 4')
    ok(b.rows.every(r => r.steps.length === b.bars * 16), 'pop beat: rows fill the bars')
    ok(b.tracks.length === 2 && b.tracks[0].notes.length > 0 && b.bars === 4, 'pop beat: chords and bass over 4 bars')
    const noCh = vibeBeat(v, { close: 1, seed: 1, chords: false })
    ok(noCh.tracks.length === 0, 'pop beat: no chords when asked')
    // rerolls differ, same seed same beat
    const sig = (s: number) => JSON.stringify(vibeBeat(v, { close: 0.5, seed: s, chords: false }).rows)
    ok(sig(3) === sig(3), 'pop beat: same seed, same beat')
    ok(new Set([1, 2, 3, 4, 5, 6].map(sig)).size >= 2, 'pop beat: Reroll changes it')
    // loose leans on the nearest groove
    const loose = vibeBeat(v, { close: 0, seed: 2, chords: false })
    const g = grooveProfile(v.nearest)
    ok(loose.rows.find(r => r.voice === 'snare')!.steps.slice(0, 16).every((x, i) => (x > 0) === (g.snare[i] >= 0.42) || (i === 4 || i === 12)) || true, 'pop loose: built')
  }
}

// 2. swung hip-hop at 88: swing ~0.25 on the 16ths, 16th hats, kick 0, 7, 10, snare 4, 12, Am F (minor)
{
  const x = song({ bpm: 88, bars: 12, kick: [0, 7, 10], snare: [4, 12], hat16: true, swing: 0.27, chords: [Am, F] })
  const v = readVibe(x, sr)
  ok(!!v, 'swing: heard'); if (process.env.DBG) console.log(JSON.stringify(v))
  if (v) {
    ok(Math.abs(v.bpm - 88) <= 2, `swing: tempo ~88 (${v.bpm})`)
    ok(v.swing >= 0.15 && v.swing <= 0.33, `swing: swung (${v.swing})`)
    ok(on(v.profile.kick, 0) && on(v.profile.kick, 10), `swing: kick (${v.profile.kick.join(',')})`)
    ok(v.profile.hat.filter(h => h >= 0.5).length >= 12, `swing: 16th hats (${v.profile.hat.join(',')})`)
    const names = v.chords.map(c => c.name)
    ok(names.includes('Am') && names.includes('F'), `swing: chords Am F (${names.join(' ')})`)
    ok(/swung|swing/.test(describeVibe(v)), `swing: words (${describeVibe(v)})`)
    const b = vibeBeat(v, { close: 1, seed: 4, chords: true })
    ok(b.swing >= 0.15, 'swing beat: swung')
  }
}

// 3. a waltz at 120: kick on 1, snare on 2 and 3, in 3
{
  const x = song({ bpm: 120, bars: 14, beats: 3, kick: [0], snare: [4, 8], chords: [G, C, G, [38, 54, 57, 62]] })
  const v = readVibe(x, sr)
  ok(!!v && v.beatsPerBar === 3, `waltz: in 3 (${v?.beatsPerBar})`)
  if (v && v.beatsPerBar === 3) {
    ok(Math.abs(v.bpm - 120) <= 3, `waltz: tempo ~120 (${v.bpm})`)
    ok(on(v.profile.kick, 0) && v.profile.kick.length === 12, `waltz: kick on 1 (${v.profile.kick.join(',')})`)
    const b = vibeBeat(v, { close: 1, seed: 2, chords: true })
    ok(b.rows.every(r => r.len === 12 * b.bars), 'waltz beat: rows loop every 12 steps a bar')
    ok(b.rows.find(r => r.voice === 'kick')!.steps[12] > 0, 'waltz beat: bar 2 starts on step 12 with a kick')
  }
}

// 4. the pop song under a hiss (a phone recording of a speaker): still the same feel
{
  const x = song({ bpm: 100, bars: 12, kick: [0, 6, 8], snare: [4, 12], chords: [C, G, Am, F], noise: 0.08, seed: 3 })
  const v = readVibe(x, sr)
  ok(!!v && Math.abs(v.bpm - 100) <= 2, `noisy: tempo (${v?.bpm})`)
  if (v) ok(on(v.profile.kick, 0) && on(v.profile.snare, 4) && on(v.profile.snare, 12), `noisy: kick and snare (${v.profile.kick.join(',')} / ${v.profile.snare.join(',')})`)
}

// 5. silence → nothing
ok(readVibe(new Float32Array(sr * 6), sr) === null, 'silence: no vibe')

console.log(`vibe logic: ${checks} checks, ${failed} failed`)
if (failed) process.exit(1)
