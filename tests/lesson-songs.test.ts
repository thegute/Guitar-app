// Songs for a lesson: which skill a lesson looks for (lessonFocus) and the bars of a song that use it (focusSpots).
import './test-env'
import { focusSpots, lessonFocus } from '../src/course/songFocus'
import { COURSE } from '../src/course/index'
import type { Song, SongStep } from '../src/tabs/model'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }
const TUNING = [40, 45, 50, 55, 59, 64]
const n = (s: number, f: number, tech?: string) => ({ string: s, fret: f, midi: TUNING[s] + f, tech })
const st = (notes: ReturnType<typeof n>[], dur = 0.5): SongStep => ({ notes, dur })
const song = (bars: SongStep[][]): Song => ({ title: 't', tracks: [{ name: 'g', tuning: TUNING, capo: 0, bars: bars.map(steps => ({ steps })) }] })
// A minor pentatonic box at fret 5 (string 0 = low E)
const penta = [[0, 5], [0, 8], [1, 5], [1, 7], [2, 5], [2, 7], [3, 5], [3, 7]]
const lineBar = () => penta.map(([s, f]) => st([n(s, f)]))
const chordBar = () => [st([n(1, 0), n(2, 2), n(3, 2), n(4, 1), n(5, 0)], 2), st([n(1, 0), n(2, 2), n(3, 2), n(4, 1), n(5, 0)], 2)]
const hammerBar = () => [st([n(3, 5)]), st([n(3, 7, 'h')]), st([n(2, 7)]), st([n(2, 5, 'p')]), st([n(3, 5)]), st([n(3, 7, 'h')]), st([n(2, 5)]), st([n(2, 7)])]
const dsBar = () => [st([n(3, 5), n(5, 5)]), st([n(3, 7), n(5, 7)]), st([n(3, 5), n(5, 5)]), st([n(3, 4), n(5, 5)])]
const s = song([chordBar(), chordBar(), hammerBar(), hammerBar(), lineBar(), lineBar(), lineBar(), dsBar(), dsBar(), chordBar()])

const legato = focusSpots(s, ['legato'])
ok(legato.length === 1 && legato[0].from === 2 && legato[0].to === 3, `hammer-ons found in bars 3-4 (${JSON.stringify(legato)})`)
const ds = focusSpots(s, ['doubleStops'])
ok(ds.some(x => x.from === 7 && x.to === 8), `double stops in bars 8-9 (${JSON.stringify(ds)})`)
const ch = focusSpots(s, ['chords'])
ok(ch.some(x => x.from === 0 && x.to === 1) && ch.some(x => x.from === 9), `chords in bars 1-2 and 10 (${JSON.stringify(ch)})`)
const pent = focusSpots(s, ['scaleLines'], ['minor pentatonic'])
ok(pent.some(x => x.from <= 4 && x.to >= 5) && pent.every(x => x.to < 7), `pentatonic lines in bars 3-7, not the double stops (${JSON.stringify(pent)})`)
ok(focusSpots(s, ['bends']).length === 0, 'no bends in this tab')
ok(JSON.stringify(focusSpots(s, ['bends', 'legato'])) === JSON.stringify(legato), 'falls through to the next skill the song has')

// every course lesson gets a sensible skill to look for
const f = (id: string) => lessonFocus(COURSE.find(l => l.id === id)!)
ok(f('c3-minorpent')[0] === 'scaleLines', `minor pentatonic lesson looks for lines (${f('c3-minorpent')})`)
ok(f('c6-doublestops').includes('doubleStops'), `double-stop lesson looks for double stops (${f('c6-doublestops')})`)
ok(f('c4-toptriads')[0] === 'triads', `top-string triads lesson looks for three-note chords (${f('c4-toptriads')})`)
ok(f('c4-caged').includes('chords'), `CAGED lesson looks for chords (${f('c4-caged')})`)
const none = COURSE.filter(l => !lessonFocus(l).length).map(l => l.id)
ok(none.length <= 9, `most lessons have a skill to look for (without: ${none.join(' ')})`)
console.log(`lesson songs: ${checks} checks, ${failed} failed`)
if (failed) process.exit(1)
