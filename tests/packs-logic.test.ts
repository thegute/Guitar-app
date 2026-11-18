// Sound packs (Stage 3 step 2): picking the zone, velocity layers, round robins, loudness.
import { strict as assert } from 'node:assert'
import { zoneFor, layersFor, RoundRobin, normGain, takeTrim, filesFor, isPack, REF_LUFS, stemsFor, stemPath, rateFor, chordZoneFor, chordMidis, type Pack } from '../src/engine/packLogic'

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
// mic stems: close (mono-safe) + a spaced stereo pair
const stemmed: Pack = { ...pack, stems: [{ dir: '', gain: 1, mono: true }, { dir: 'ab', gain: 0.8 }] }
ok(stemsFor(stemmed, false).length === 2, 'stereo: both mics')
const m = stemsFor(stemmed, true)
ok(m.length === 1 && m[0].dir === '' && m[0].gain > 1 && m[0].gain <= 2, 'mono (pedal): only the close mic, a little louder to make up')
ok(stemsFor(pack, true).length === 1 && stemsFor(pack, false)[0].gain === 1, 'a pack without stems plays its files as they are')
ok(stemPath({ dir: 'ab', gain: 1 }, 'sustain/x.flac') === 'ab/sustain/x.flac', 'stem files sit in parallel folders')
ok(filesFor(stemmed, 'sustain', [{ midi: 40, string: 0 }]).length === 2 * 3 * 4, 'a song decodes every stem of its notes')
ok(Math.abs(rateFor(0, 0) - 1) < 1e-12 && Math.abs(rateFor(12) - 2) < 1e-12 && Math.abs(rateFor(0, -6) - Math.pow(2, -6 / 1200)) < 1e-12, 'take tuning fixes and zone shifts add up')
// whole recorded chords (re-amped strums)
const chordPack: Pack = { ...pack, tuning: [40, 45, 50, 55, 59, 64], articulations: { ...pack.articulations,
  strumDown: { zones: [
    { key: '5E3d', root: 43, lo: 43, hi: 43, frets: [3, 5, 5, -1, -1, -1], layers: [{ velocity: 100, rr: ['chord/5E3dv100.flac'] }] },
    { key: 'Gd', root: 43, lo: 43, hi: 43, frets: [3, 2, 0, 0, 0, 3], layers: [{ velocity: 100, rr: ['chord/Gd.flac'] }] },
  ] },
  strumUp: { zones: [{ key: 'Gu', root: 55, lo: 55, hi: 55, frets: [3, 2, 0, 0, 0, 3], layers: [{ velocity: 100, rr: ['chord/Gu.flac'] }] }] } } }
ok(chordMidis(chordPack, chordPack.articulations.strumDown!.zones[0]).join() === '43,50,55', 'a chord zone knows its notes from its shape')
const p5 = chordZoneFor(chordPack, false, [45, 52, 57])
ok(p5?.zone.key === '5E3d' && p5.shift === 2, 'an A5 power chord = the G5 recording two semitones up')
ok(chordZoneFor(chordPack, false, [47, 54, 59]) === null, 'too far from any recording: built from notes instead')
ok(chordZoneFor(chordPack, false, [43, 47, 50, 55, 59, 67])?.zone.key === 'Gd', 'the open G shape')
ok(chordZoneFor(chordPack, false, [43, 46, 50]) === null, 'a different chord (G minor triad) is not a G5')
ok(chordZoneFor(chordPack, true, [43, 47, 50, 55, 59, 67])?.zone.key === 'Gu', 'upstrokes use the up recordings')

// ---- Engine Week Part 4: Per-string Sampler, Legato (~35ms zero-crossing + 8ms crossfade), Decay Inheritance & Slides ----
import {
  FINGER_LIFT_DAMP_SEC,
  LEGATO_CROSSFADE_SEC,
  LEGATO_SKIP_SEC,
  legatoOffsetOf,
  prepareStringVoice,
  registerStringVoice,
  renderSamplerOffline,
  setUseWorkletEngine,
  stopStringVoices,
  useWorkletEngine,
} from '../src/engine/sampler'
import {
  BODY_CAB_IRS,
  activeBodyCabIr,
  irMonoCorrelation,
  setActiveBodyCabIr,
  sympatheticOpenStrings,
  synthesizeBodyCabIr,
} from '../src/engine/bodyCabIr'
import {
  GUITAR_PARTS,
  partForSound,
  partsForStyle,
  soundForPart,
} from '../src/engine/parts'
{
  const sr = 48000
  // Synthetic guitar sample: loud pick transient in the first 20 ms, then steady 220 Hz sine sustain
  const makePluckSample = () => {
    const buf = new Float32Array(sr)
    for (let i = 0; i < buf.length; i++) {
      const t = i / sr
      const transient = t < 0.02 ? 0.9 * Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t / 0.006) : 0
      const body = 0.35 * Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t / 1.2)
      buf[i] = transient + body
    }
    return buf
  }
  const sample = makePluckSample()

  // 1. Safeguard #4: legatoOffsetOf skips ~35 ms past baseOff and lands on a zero-crossing
  const off0 = legatoOffsetOf(sample, 0.005, sr, LEGATO_SKIP_SEC)
  ok(Math.abs(off0 - (0.005 + LEGATO_SKIP_SEC)) <= 0.004, `legato offset ~35ms past onset: ${off0.toFixed(4)}s`)
  const zIdx = Math.round(off0 * sr)
  ok(sample[zIdx - 1] * sample[zIdx] <= 1e-6 || Math.abs(sample[zIdx]) < 0.03, 'legato offset snaps to a zero-crossing')

  // 2. Per-string voice stealing (~12 ms finger-lift damping on the same string, independent across strings)
  stopStringVoices()
  let dampedString2At: number | null = null
  const p1 = prepareStringVoice({ namespace: 'test', string: 2, midi: 50, when: 1.0, gain: 0.8, buf: sample, sampleRate: sr })
  registerStringVoice(p1, { midi: 50, when: 1.0, gain: 0.8, stop: at => { dampedString2At = at } })
  ok(!p1.dampedPrev && p1.sampleOffsetSec === 0, 'first note on string 2 starts at onset 0')

  // Note on a DIFFERENT string (string 3) does NOT steal string 2
  const pOther = prepareStringVoice({ namespace: 'test', string: 3, midi: 55, when: 1.1, gain: 0.8, buf: sample, sampleRate: sr })
  registerStringVoice(pOther, { midi: 55, when: 1.1, gain: 0.8, stop: () => {} })
  ok(!pOther.dampedPrev && dampedString2At === null, 'note on string 3 leaves string 2 ringing')

  // Second picked note on string 2 steals string 2 with 12 ms finger-lift damping
  const p2 = prepareStringVoice({ namespace: 'test', string: 2, midi: 52, when: 1.15, gain: 0.8, buf: sample, sampleRate: sr })
  registerStringVoice(p2, { midi: 52, when: 1.15, gain: 0.8, stop: () => {} })
  ok(p2.dampedPrev && p2.dampSec === FINGER_LIFT_DAMP_SEC && dampedString2At === 1.15, 'new note on string 2 damps previous voice (12 ms)')

  // 3. Safeguard #4 + Upgrade #7: Hammer-on ('h') and Pull-off ('p') inherit real-time string decay + finger-fret thud
  const pFastH = prepareStringVoice({ namespace: 'test', string: 2, midi: 54, when: 1.21, gain: 0.8, tech: 'h', buf: sample, sampleRate: sr })
  registerStringVoice(pFastH, { midi: 54, when: 1.21, gain: 0.8, stop: () => {} })
  ok(
    pFastH.legato === 'h' &&
      pFastH.fadeInSec === LEGATO_CROSSFADE_SEC &&
      pFastH.sampleOffsetSec > 0.03 &&
      pFastH.gainScale > 0.85 &&
      pFastH.thudGain > 0,
    `fast hammer-on (60ms after pluck) keeps strong level (${pFastH.gainScale.toFixed(2)}) & adds fret thud`,
  )

  // Hammer-on onto a dying string (1.25s after last note) inherits decayed amplitude instead of jumping back to 100%
  const pLateH = prepareStringVoice({ namespace: 'test', string: 2, midi: 55, when: 2.46, gain: 0.8, tech: 'h', buf: sample, sampleRate: sr })
  ok(pLateH.gainScale < pFastH.gainScale * 0.6 && pLateH.gainScale >= 0.22, `late hammer-on inherits decayed string amplitude (${pLateH.gainScale.toFixed(2)})`)

  // Pull-off ('p') at the same decay point is slightly softer than hammer-on ('h')
  const pLateP = prepareStringVoice({ namespace: 'test', string: 3, midi: 53, when: 1.16, gain: 0.8, tech: 'p', buf: sample, sampleRate: sr })
  ok(pLateP.legato === 'p' && pLateP.gainScale < pFastH.gainScale && pLateP.thudGain > 0, 'pull-off is slightly softer than hammer-on at same elapsed time')

  // 4. Safeguard #4: Slide ('/' and '\\') computes semitone glide from the ringing string's pitch
  registerStringVoice(pLateH, { midi: 55, when: 2.5, gain: 0.8, stop: () => {} })
  const pSlide = prepareStringVoice({ namespace: 'test', string: 2, midi: 57, when: 2.65, gain: 0.8, tech: '/', slideTime: 0.07, buf: sample, sampleRate: sr })
  ok(pSlide.legato === '/' && pSlide.slideSemitones === -2 && Math.abs(pSlide.slideTimeSec - 0.07) < 1e-6, 'slide up 2 frets starts -2 semitones from target and glides over 70ms')

  // 5. Offline worklet PCM rendering: verify pick + hammer-on + slide produces clean audio with transient skipped on hammer-on
  const rendered = renderSamplerOffline(
    [
      { sample, sampleRate: sr, string: 2, midi: 50, whenSec: 0.02, gain: 0.8 },
      { sample, sampleRate: sr, string: 2, midi: 52, whenSec: 0.18, gain: 0.8, tech: 'h' },
      { sample, sampleRate: sr, string: 2, midi: 54, whenSec: 0.34, gain: 0.8, tech: '/', slideFrom: 52, slideTimeSec: 0.06 },
    ],
    0.55,
    sr,
  )
  let peakPick = 0
  let peakHammerAttack = 0
  for (let i = Math.round(0.02 * sr); i < Math.round(0.04 * sr); i++) peakPick = Math.max(peakPick, Math.abs(rendered.buffer[i]))
  for (let i = Math.round(0.18 * sr); i < Math.round(0.20 * sr); i++) peakHammerAttack = Math.max(peakHammerAttack, Math.abs(rendered.buffer[i]))
  ok(peakPick > 0.4 && peakHammerAttack > 0.05 && peakHammerAttack < peakPick * 0.75, `offline worklet skips harsh pick transient on hammer-on (pick=${peakPick.toFixed(2)}, hammer=${peakHammerAttack.toFixed(2)})`)
  stopStringVoices()

  // 6. Argon Step 1/2/5/8: Worklet engine switch, Body/Cab IR mono-safety & unity energy, Sympathetic resonance, and Parts registry
  ok(useWorkletEngine() === true, 'AudioWorklet engine enabled by default')
  setUseWorkletEngine(false)
  ok(useWorkletEngine() === false, 'A/B compare switch can toggle to fallback node engine')
  setUseWorkletEngine(true)

  for (const ir of BODY_CAB_IRS) {
    const [L, R] = synthesizeBodyCabIr(sr, ir.id)
    const corr = irMonoCorrelation(L, R)
    let eL = 0
    for (let i = 0; i < L.length; i++) eL += L[i] * L[i]
    ok(corr >= 0.94, `${ir.id} IR is mono-safe for Pocket Master fold (corr=${corr.toFixed(3)})`)
    ok(Math.abs(eL - 1) < 1e-4, `${ir.id} IR is normalized to unity energy (eL=${eL.toFixed(4)})`)
  }
  setActiveBodyCabIr('j45')
  ok(activeBodyCabIr() === 'j45', 'Active Body/Cab IR persists')
  setActiveBodyCabIr('off')

  const sympG = sympatheticOpenStrings([43, 47, 50, 55, 59, 67]) // G major chord (D3=50, G3=55, B3=59 are played; E2=40, A2=45, E4=64 are unplayed)
  ok(sympG.some(s => s.midi === 40 || s.midi === 45 || s.midi === 64), `G major chord excites unplayed open strings sympathetically (${sympG.map(s => s.midi).join(',')})`)

  ok(GUITAR_PARTS.length >= 15, 'Guitar parts registry covers acoustic, 12-string, nylon, sunburst, storm, dracus')
  ok(partForSound('pack:sunburst-deluxe') === 'guitar.sunburst', 'Sunburst Deluxe pack maps to guitar.sunburst')
  ok(partForSound('pack:dracus-metal') === 'guitar.dracus', 'Dracus pack maps to guitar.dracus')
  ok(partForSound('pack:strummed-12') === 'guitar.12string', '12-string pack maps to guitar.12string')
  ok(soundForPart('guitar.nylon') === 'nylon', 'guitar.nylon resolves to nylon base when no pack override set')
  const bgParts = partsForStyle('bluegrass')
  ok(bgParts.lead === 'guitar.flatpick' && bgParts.bass === 'bass.upright' && bgParts.ir === 'j45', 'Bluegrass auto-pairs Flatpick 6 + Upright Bass + J-45 IR')
  const metalParts = partsForStyle('progmetal')
  ok(metalParts.lead === 'guitar.dracus' && metalParts.ir === 'yorkMesa412', 'Prog metal auto-pairs Dracus + York Mesa 4x12 IR')
}

console.log(`packs logic: ${n} checks, 0 failed`)

