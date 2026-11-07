// Game Mode's rules: sections, highway blocks with fingers, the multiplier, stars, best of each section, Perfect it.
import './test-env'
import { strict as assert } from 'node:assert'
import { Scorer, highway, mergeBest, sectionResult, sectionsOf, toPerfect, type SectionResult } from '../src/play/game'
import { flatten, type SongTrack } from '../src/tabs/model'
import { handGroups } from '../src/play/handShape'
import { timeline } from '../src/play/inTime'
import { nextSpeed } from '../src/play/inTime'

let checks = 0
const ok = (c: boolean, m: string) => { checks++; assert.ok(c, m) }

// 9 bars of eighth notes up and down the G string region, a chord in bar 5
const bars = Array.from({ length: 9 }, (_, b) => ({ steps: Array.from({ length: 8 }, (_, i) => ({ dur: 0.5, notes: b === 4 && i === 0 ? [{ string: 3, fret: 2, midi: 57 }, { string: 2, fret: 2, midi: 62 }, { string: 1, fret: 1, midi: 66 }] : [{ string: 2, fret: 2 + (i % 4), midi: 52 + 2 + (i % 4) }] })) }))
bars[4].steps[0].chord = 'D'
const track: SongTrack = { name: 'g', tuning: [40, 45, 50, 55, 59, 64], capo: 0, bars }
const flat = flatten(track)
const secs = sectionsOf(flat)
ok(secs.length === 3 && secs[0].fromBar === 0 && secs[0].toBar === 3 && secs[2].toBar === 8, `every 4 bars: ${secs.map(s => `${s.fromBar}-${s.toBar}`).join(', ')}`)
const named = flatten({ ...track, bars: track.bars.map((b, i) => ({ steps: b.steps.map((s, k) => (k === 0 && (i === 0 || i === 5) ? { ...s, section: i ? 'Chorus' : 'Verse' } : s)) })) })
ok(sectionsOf(named).map(s => s.name).join() === 'Verse,Chorus', 'named sections are used')
const tl = timeline(flat)
const hands = handGroups(flat, {})
const items = highway(flat, tl.beatOf, hands, secs, () => undefined)
ok(items.length === flat.length && items[1].beat === 0.5, 'a block per step at its beat')
ok(items.every(it => it.notes.every(n => n.finger >= 1 && n.finger <= 4)), 'every fretted note has a finger')
const fr = items.slice(0, 4).map(it => it.notes[0].finger)
ok(new Set(fr).size === 4, `one finger per fret (frets 2–5 → fingers ${fr.join(' ')})`)
ok(items[32].chord === 'D' && items[32].section === 1, 'the strum is a chord box in part 2')

// multiplier: 3× to start, +1 every 8 clean, max 5×, back to 3× on a miss
const sc = new Scorer()
for (let i = 0; i < 7; i++) sc.add('perfect')
ok(sc.mult === 3 && sc.points === 2100, '3× for the first 7')
sc.add('good')
ok(sc.mult === 4, '8 clean in a row: 4×')
for (let i = 0; i < 8; i++) sc.add('perfect')
ok(sc.mult === 5, '16: 5×')
for (let i = 0; i < 20; i++) sc.add('perfect')
ok(sc.mult === 5, 'never above 5×')
sc.add('late')
ok(sc.mult === 3 && sc.streak === 0 && sc.best === 36, 'a sloppy note: back to 3×, best streak kept')

// stars
const S = (r: ('perfect' | 'good' | 'early' | 'late' | 'miss' | undefined)[]) => sectionResult(r)
ok(S(Array(10).fill('perfect')).stars === 3 && S(Array(10).fill('perfect')).gold, 'all on time: 3 stars and gold')
ok(S([...Array(9).fill('perfect'), 'late']).stars === 3 && !S([...Array(9).fill('perfect'), 'late']).gold, '95%: 3 stars, not gold')
ok(S([...Array(8).fill('good'), 'miss', 'miss']).stars === 2, '80%: 2 stars')
ok(S([...Array(5).fill('good'), ...Array(5).fill(undefined)]).stars === 1, '50% (rest not reached): 1 star')

// best of each section
const a: SectionResult[] = [{ stars: 3, gold: false, pct: 92, points: 900 }, { stars: 1, gold: false, pct: 55, points: 400 }]
const b: SectionResult[] = [{ stars: 2, gold: false, pct: 80, points: 800 }, { stars: 3, gold: true, pct: 100, points: 1000 }]
const best1 = mergeBest(null, a, [true, true])
const best2 = mergeBest(best1, b, [true, true])
ok(best2.sections[0].pct === 92 && best2.sections[1].pct === 100 && best2.total === 1900, 'the best run of each part, added up')
const best3 = mergeBest(best2, [{ stars: 0, gold: false, pct: 0, points: 0 }, { stars: 0, gold: false, pct: 0, points: 0 }], [false, false])
ok(best3.total === 1900, 'parts not played leave the best alone')
ok(toPerfect(best1, a).join() === '1', 'Perfect it picks the part that lost stars')

// auto speed: +5 % at 90 %, −5 % under 60 %, 25–125 %
const T = { step: 0.05, target: 1.25, pass: 90, down: 60, min: 0.25 }
ok(nextSpeed(1, 95, T) === 1.05 && nextSpeed(1.25, 99, T) === 1.25, 'auto speed up to 125 %')
ok(nextSpeed(0.6, 40, T) === 0.55 && nextSpeed(0.25, 10, T) === 0.25 && nextSpeed(0.8, 75, T) === 0.8, 'down under 60 %, never below 25 %, stays in between')
console.log(`game mode: ${checks} checks, 0 failed`)
