// Sound packs (Stage 3 step 2): picking the zone, velocity layers, round robins, loudness.
import { strict as assert } from 'node:assert'
import { zoneFor, layersFor, RoundRobin, normGain, takeTrim, filesFor, isPack, REF_LUFS, type Pack } from '../src/engine/packLogic'

let n = 0
const ok = (c: unknown, m: string) => { n++; assert.ok(c, m) }
const tuning = [40, 45, 50, 55, 59, 64]
const zones = tuning.flatMap((o, s) => [0, 2, 5, 7].map(f => ({ key: `s${s}f${f}`, string: s, fret: f, root: o + f, lo: o + f, hi: o + f,
  layers: [40, 80, 112].map(v => ({ velocity: v, rr: [0, 1, 2, 3].map(k => `sustain/s${s}f${f}v${v}r${k}.flac`), ms: [1, 1.2, 0.9, 1] })) })))
const pack: Pack = { format: 'kguitar-pack', version: 1, id: 't', name: 'Test', kind: 'guitar', sampleRate: 48000, tuning, loudness: { lufs: -26 }, articulations: { sustain: { zones } } }

ok(isPack(pack) && !isPack({ format: 'x' }), 'recognises a pack')
// zone: exact string + pitch
let z = zoneFor(pack, 'sustain', 52, 1)!
ok(z.zone.string === 1 && z.zone.fret === 7 && z.shift === 0, 'E on the A string (fret 7) is its own recording')
z = zoneFor(pack, 'sustain', 57, 2)!
ok(z.zone.string === 2 && z.shift === 0 && z.zone.fret === 7, 'A on the D string: D string fret 7')
// a fret that wasn't recorded: the nearest on the same string, re-pitched a little
z = zoneFor(pack, 'sustain', 41, 0)!
ok(z.zone.string === 0 && Math.abs(z.shift) <= 2, `fret 1 on the low E: nearest recording on that string (shift ${z.shift})`)
// a pitch the asked string can't reach: another string, never a big stretch
z = zoneFor(pack, 'sustain', 71, 0)!
ok(z && Math.abs(z.shift) <= 2, 'out of the string\'s range: another string close by')
ok(zoneFor(pack, 'pm', 50) === null, 'no palm-mute recordings: none')
// layers
let L = layersFor(zones[0], 80)
ok(L.length === 1 && L[0].layer.velocity === 80, 'an exact layer plays alone')
L = layersFor(zones[0], 96)
ok(L.length === 2 && Math.abs(L[0].weight ** 2 + L[1].weight ** 2 - 1) < 1e-9, 'between two layers: an equal-power crossfade')
L = layersFor(zones[0], 20)
ok(L.length === 1 && L[0].layer.velocity === 40 && L[0].weight < 1, 'softer than the softest layer: that layer, quieter')
// round robin: never the same take twice in a row, all takes used
const r = new RoundRobin()
let last = -1; const seen = new Set<number>()
for (let i = 0; i < 200; i++) { const k = r.pick('a', 4); ok(k !== last, 'no back-to-back repeat'); last = k; seen.add(k) }
ok(seen.size === 4, 'every take gets played')
ok(new RoundRobin().pick('b', 1) === 0, 'one take: always it')
// loudness
ok(Math.abs(20 * Math.log10(normGain(pack)) - (REF_LUFS + 26)) < 1e-9, 'a quiet pack (−26 LUFS) is lifted to the reference')
ok(takeTrim(zones[0].layers[0], 1) < 1 && takeTrim(zones[0].layers[0], 2) > 1, 'a hot take is trimmed down, a soft one up (half way)')
// files a song needs
const files = filesFor(pack, 'sustain', [{ midi: 40, string: 0 }, { midi: 45, string: 1 }])
ok(files.length === 2 * 3 * 4, 'all layers and takes of the two notes')
console.log(`packs logic: ${n} checks, 0 failed`)
