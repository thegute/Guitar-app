import './test-env'
import { strict as assert } from 'node:assert'
import { LICKS } from '../src/licks/library'
import { CLASSIC_LICKS } from '../src/licks/classicLicks'
import { parseLick } from '../src/licks/notation'
import {
  WORKS_OVER_TAGS,
  worksOverForLick,
  worksOverForExercise,
  worksOverSummary,
  jamProfile,
  lickMatchScore,
  matchingLicksForJam,
  exerciseMatchesWorksOver,
} from '../src/licks/worksOver'
import { exerciseCatalog } from '../src/exercises/catalog'
import { current } from '../src/instrument'
import {
  startSession,
  next,
  jumpTo,
  stopSession,
  running,
  sessionSummary,
  clearSummary,
  type Session,
} from '../src/sessions/session'
import { openExercisesFiltered, openLicksInKey, openSongsInKey, playAction, takePlayAction } from '../src/nav'
import { spell, type ProgChord } from '../src/theory/progressions'
import { voicingFromFrets, progressionFromTrack, progressionFromChords } from '../src/components/ProgressionDiagrams'
import { formatKeyBadge, songKeyGuess } from '../src/tabs/keyDetect'
import { detectJamKeyMismatch, keyOptionId, shiftChord, shiftKeyName, transposeJamProg, transposeSong, transposeTrack } from '../src/tabs/transpose'
import { cueStateFromBeats } from '../src/play/cueState'
import { lickInKey } from '../src/licks/generator'
import { jamBandForSong } from '../src/tabs/fromProgression'
import {
  EMPTY_CHAIN,
  addToChain,
  chainable,
  chainSong,
  checkChainAdd,
  flowNext,
  lickMatchesChain,
  lickMinor,
  loadChain,
  matchChainTranspose,
  placeChain,
  saveChain,
  startNewChain,
} from '../src/licks/chain'

const inst = current()
const validTagIds = new Set(WORKS_OVER_TAGS.map(t => t.id))

// 1. Classic guitarist Must-Know Licks
{
  assert.ok(CLASSIC_LICKS.length >= 170, `Expected >= 170 classic licks, got ${CLASSIC_LICKS.length}`)
  const baseIds = new Set(LICKS.filter(l => !l.id.startsWith('cl-')).map(l => l.id))
  const clIds = new Set(CLASSIC_LICKS.map(l => l.id))
  assert.equal(clIds.size, CLASSIC_LICKS.length, 'Every classic lick cl-* ID must be unique')
  for (const id of clIds) assert.ok(!baseIds.has(id), `Classic lick ID ${id} must not collide with base library`)
  for (const cl of CLASSIC_LICKS) {
    assert.ok(cl.id.startsWith('cl-'), `${cl.id} starts with cl-`)
    assert.ok(cl.must.about.length > 20, `${cl.id} has rich must.about`)
    assert.ok(cl.must.steps.length >= 2, `${cl.id} has >= 2 steps`)
    assert.ok(cl.must.tip.length > 5, `${cl.id} has tip`)
    assert.ok(cl.must.use.length > 5, `${cl.id} has use`)
    assert.ok(cl.must.goal >= 40, `${cl.id} has goal BPM`)
    const parsed = parseLick(cl.tab)
    assert.ok(parsed.bars.length >= 1 && parsed.events.length >= 2, `${cl.id} tab parses cleanly`)
    const meter = cl.meter ?? 4
    parsed.bars.forEach((barLen, bi) => {
      assert.ok(
        Math.abs(barLen - meter) < 1e-4,
        `${cl.id} bar ${bi + 1} duration is ${barLen}, expected ${meter}`
      )
    })
  }
  const bluegrassCount = LICKS.filter(l => l.style === 'bluegrass').length
  assert.ok(bluegrassCount < 40, `bluegrass lick count (${bluegrassCount}) stays < 40 for catalog test`)
  const ex = exerciseCatalog(inst)
  const bb = ex.find(e => e.lick === 'cl-bl-bb-sting')
  assert.ok(bb, 'B.B. King lick present in exercise catalog')
  assert.ok(bb!.about.includes('B.B. King') && bb!.about.length > 20, `B.B. King about does not truncate at "B.": ${bb!.about}`)
  for (const id of ['cl-mt-buckethead-sooth', 'cl-bs-dust-baggie', 'cl-bl-bb-thrill', 'cl-rk-money', 'cl-rk-smoke']) {
    const foundEx = ex.find(e => e.lick === id)
    assert.ok(foundEx, `${id} present in exercise catalog`)
    assert.ok(foundEx!.about.length > 20, `${id} about is not truncated: ${foundEx!.about}`)
    const lick = CLASSIC_LICKS.find(l => l.id === id)!
    assert.ok(worksOverForLick(lick).length >= 1, `${id} has valid worksOver tags`)
  }
  const moneyLick = CLASSIC_LICKS.find(l => l.id === 'cl-rk-money')
  assert.equal(moneyLick?.meter, 7, 'cl-rk-money uses 7/4 meter')
  console.log(`classic licks: ${CLASSIC_LICKS.length} checked, total licks ${LICKS.length}`)
}

// 2. 100% "Works over…" coverage across ALL licks & ALL exercises + Jam matching
{
  for (const l of LICKS) {
    const tags = worksOverForLick(l)
    assert.ok(tags.length >= 1 && tags.length <= 4, `${l.id} has ${tags.length} works-over tags`)
    for (const t of tags) assert.ok(validTagIds.has(t), `${l.id} invalid tag ${t}`)
    assert.ok(worksOverSummary(tags).length > 0, `${l.id} has non-empty worksOver summary`)
  }
  const exercises = exerciseCatalog(inst)
  assert.ok(exercises.length >= 1000, `Expected >= 1000 exercises, got ${exercises.length}`)
  for (const ex of exercises) {
    const tags = worksOverForExercise(ex)
    assert.ok(tags.length >= 1, `${ex.code} has works-over tags`)
    for (const t of tags) assert.ok(validTagIds.has(t), `${ex.code} invalid tag ${t}`)
    assert.ok(exerciseMatchesWorksOver(ex, 'all', null))
    assert.ok(exerciseMatchesWorksOver(ex, tags[0], null))
  }

  const mkProg = (syms: string[]): ProgChord[] =>
    syms.map(s => ({ degree: 1, roman: s, root: s[0], symbol: s, label: s }))

  const bluesJam = jamProfile(mkProg(['A7', 'D7', 'E7', 'A7']), 'A', 'major', 'blues')
  assert.ok(bluesJam.tags.includes('blues12') && bluesJam.tags.includes('dominant'))
  const bluesMatches = matchingLicksForJam(LICKS, bluesJam, 12)
  assert.equal(bluesMatches.length, 12)
  assert.ok(bluesMatches.some(l => l.style === 'blues'), 'blues Jam matches blues licks')

  const jazzJam = jamProfile(mkProg(['Dm7', 'G7', 'Cmaj7']), 'C', 'major', 'jazz')
  assert.ok(jazzJam.tags.includes('iiVI'))
  const jazzMatches = matchingLicksForJam(LICKS, jazzJam, 12)
  assert.ok(jazzMatches.some(l => l.style === 'jazz'), 'jazz Jam matches jazz licks')

  const metalJam = jamProfile(mkProg(['E5', 'G5', 'A5']), 'E', 'minor', 'metal')
  assert.ok(metalJam.tags.includes('heavy') && metalJam.tags.includes('minor'))
  const metalMatches = matchingLicksForJam(LICKS, metalJam, 12)
  assert.ok(metalMatches.some(l => l.style === 'metal' || l.style === 'progmetal'), 'metal Jam matches metal licks')

  const reggaeJam = jamProfile(mkProg(['Am', 'G', 'F']), 'A', 'minor', 'reggaerock')
  assert.ok(reggaeJam.tags.includes('island') && reggaeJam.tags.includes('minor'))
  const islandMatches = matchingLicksForJam(LICKS, reggaeJam, 12)
  assert.ok(islandMatches.length >= 4 && islandMatches.every(l => lickMatchScore(l, reggaeJam) > 0))
  console.log(`works over: ${LICKS.length} licks + ${exercises.length} exercises tagged & Jam-matched`)
}

// 3. Guided Practice Session bar state & completion summary
{
  clearSummary()
  const ses: Session = {
    id: 'test-guided',
    title: 'Guided test',
    steps: [
      { title: 'Warm up', minutes: 5, target: { exercise: 'type:warmup' }, tip: 'Keep fingers close to the frets.' },
      { title: 'Blues licks', minutes: 10, target: { go: { licks: 'blues' } }, tip: 'Target the 3rd on beat 1.' },
    ],
  }
  startSession(ses)
  assert.equal(running()?.index, 0)
  assert.deepEqual(running()?.completed, [])
  assert.equal(sessionSummary(), null)

  next()
  assert.equal(running()?.index, 1)
  assert.deepEqual(running()?.completed, [0])

  jumpTo(0)
  assert.equal(running()?.index, 0)
  assert.deepEqual(running()?.completed, [0])

  jumpTo(1)
  next()
  assert.equal(running(), null)
  const sum = sessionSummary()
  assert.ok(sum !== null, 'Finishing last step populates sessionSummary')
  assert.equal(sum!.completedCount, 2)
  assert.equal(sum!.minutes, 15)

  clearSummary()
  assert.equal(sessionSummary(), null)

  startSession(ses)
  stopSession()
  assert.equal(running(), null)
  assert.equal(sessionSummary(), null, 'Stop the session does not set completion summary')
  console.log('guided session bar: ok')
}

// 4. Drill Lab / Exercise -> Play Loop + Speed ramp action
{
  takePlayAction()
  playAction({
    mode: 'time',
    loop: { from: 0, to: 1 },
    speed: 0.7,
    trainer: { on: true, start: 0.7, step: 0.05, target: 1, pass: 90, ramp: true },
  })
  const got = takePlayAction()
  assert.ok(got, 'playAction enqueued action')
  assert.equal(got!.mode, 'time')
  assert.deepEqual(got!.loop, { from: 0, to: 1 })
  assert.equal(got!.speed, 0.7)
  assert.equal(got!.trainer?.on, true)
  assert.equal(got!.trainer?.ramp, true)
  assert.equal(got!.trainer?.start, 0.7)
  assert.equal(got!.trainer?.step, 0.05)
  assert.equal(got!.trainer?.pass, 90)
  console.log('loop + speed ramp bridge: ok')
}

// 5. Full progression chord diagrams + fingerings + barres (e.g. CH-26 Bb to F)
{
  const bb = voicingFromFrets([-1, 1, 3, 3, 3, 1], 'Bb', inst)
  assert.ok(bb.barres.includes(1), `Bb barre shape includes barre at fret 1, got ${JSON.stringify(bb.barres)}`)
  assert.ok(bb.fingers.some(f => f > 0), `Bb voicing has finger numbers, got ${JSON.stringify(bb.fingers)}`)

  const f = voicingFromFrets([1, 3, 3, 2, 1, 1], 'F', inst)
  assert.ok(f.barres.includes(1), `F barre shape includes barre at fret 1, got ${JSON.stringify(f.barres)}`)
  assert.ok(f.fingers.some(fn => fn > 0), `F voicing has finger numbers, got ${JSON.stringify(f.fingers)}`)

  const catalog = exerciseCatalog(inst)
  const ch26 = catalog.find(e => e.code === 'CH-26')
  assert.ok(ch26, 'CH-26 exercise exists in catalog')
  const song = ch26!.make({ root: ch26!.key ?? 'C', inst, bpm: ch26!.bpm })
  assert.ok(song && song.tracks[0], 'CH-26 builds a song track')
  const diags = progressionFromTrack(song!.tracks[0], inst)
  assert.equal(diags.length, 2, `CH-26 Bb-F-Bb-F collapses cleanly to 2 diagrams (Bb & F), got ${diags.map(d => d.name).join(', ')}`)
  assert.equal(diags[0].name, 'Bb')
  assert.equal(diags[1].name, 'F')
  assert.ok(diags[0].voicing.fingers.some(fn => fn > 0), 'CH-26 Bb diagram has finger numbers')
  assert.ok(diags[1].voicing.fingers.some(fn => fn > 0), 'CH-26 F diagram has finger numbers')

  const viaNames = progressionFromChords(['G', 'Em', 'C', 'D'], inst)
  assert.equal(viaNames.length, 4)
  assert.deepEqual(viaNames.map(d => d.name), ['G', 'Em', 'C', 'D'])
  console.log('full progression chord diagrams + fingerings: ok')
}

// 6. Batch H1: key badges (Capo N, never C2), songKeyGuess, strict same-key + major/minor chainer, jamBandForSong
{
  assert.equal(formatKeyBadge('E', true, 0), 'Em')
  assert.equal(formatKeyBadge('G', false, 0), 'G')
  assert.equal(formatKeyBadge('G', false, 2), 'G · Capo 2')
  assert.ok(!formatKeyBadge('G', false, 2).includes('C2'), 'never use C2 abbreviation')
  assert.equal(formatKeyBadge('G#', true, 0), 'G#m')

  // songKeyGuess returns null on an empty/mute-only song and estimates pitch classes accurately
  assert.equal(songKeyGuess({ title: 'Empty', tracks: [{ name: 'Gtr', tuning: inst.midis, capo: 0, bars: [{ steps: [{ notes: [], dur: 4 }] }] }] }), null)
  const emLick = LICKS.find(l => chainable(l) && l.ref === 'E' && lickMinor(l) === true)!
  const amLick = LICKS.find(l => chainable(l) && l.ref === 'A' && lickMinor(l) === true)!
  const gMajLick = LICKS.find(l => chainable(l) && l.ref === 'G' && lickMinor(l) === false)!
  const eMajLick = LICKS.find(l => chainable(l) && l.ref === 'E' && lickMinor(l) === false)!
  assert.ok(emLick && amLick && gMajLick && eMajLick, 'sample Em, Am, G, E licks exist')

  const gSong = lickInKey(gMajLick, 'G', inst.midis)!.song
  const gGuess = songKeyGuess(gSong)
  assert.ok(gGuess !== null, 'songKeyGuess detects a key on pitched lick')

  // strict matching rules: Em != Am (different root), Em != E (different quality), Em != G (relative major kept separate)
  assert.ok(lickMatchesChain(emLick, 'E', true, false))
  assert.ok(!lickMatchesChain(amLick, 'E', true, false))
  assert.ok(lickMatchesChain(amLick, 'E', true, true), 'allowTranspose lets Am transpose into Em')
  assert.ok(!lickMatchesChain(eMajLick, 'E', true, true), 'same root E major cannot join Em chain even with transpose')
  assert.ok(!lickMatchesChain(gMajLick, 'E', true, true), 'relative major G cannot join Em chain')

  // interactive chain state transitions
  saveChain({ ...EMPTY_CHAIN, links: [] })
  const chk0 = checkChainAdd(emLick.id)!
  assert.equal(chk0.ok, true)
  assert.equal(chk0.reason, 'empty')
  addToChain(emLick.id)
  const c1 = loadChain()
  assert.equal(c1.key, 'E')
  assert.equal(c1.minor, true)
  assert.equal(c1.allowTranspose, false)

  const chkAm = checkChainAdd(amLick.id)!
  assert.equal(chkAm.ok, false)
  assert.equal(chkAm.reason, 'different-key')
  assert.equal(chkAm.canTranspose, true)
  assert.equal(chkAm.chainLabel, 'Em')
  assert.equal(chkAm.lickLabel, 'Am')

  const chkG = checkChainAdd(gMajLick.id)!
  assert.equal(chkG.ok, false)
  assert.equal(chkG.reason, 'different-quality')
  assert.equal(chkG.canTranspose, false)

  matchChainTranspose(amLick.id)
  const c2 = loadChain()
  assert.equal(c2.links.length, 2)
  assert.equal(c2.allowTranspose, true)
  assert.equal(c2.minor, true)
  assert.equal(placeChain(c2).filter(p => p.fits).length, 2)

  // flowNext stays within same key + quality
  const nextEm = flowNext({ ...EMPTY_CHAIN, key: 'E', minor: true, allowTranspose: false, links: [{ lick: emLick.id, uid: 'u1' }] })
  assert.ok(!nextEm || (nextEm.ref === 'E' && lickMinor(nextEm) === true), 'strict flowNext picks only native Em lick')

  // startNewChain resets lock cleanly to G major
  startNewChain(gMajLick.id)
  const c3 = loadChain()
  assert.equal(c3.links.length, 1)
  assert.equal(c3.key, 'G')
  assert.equal(c3.minor, false)
  assert.equal(c3.allowTranspose, false)

  // jamBandForSong attaches aligned events when Jam progression is present
  localStorage.setItem('kg:jamProg', JSON.stringify([{ degree: 1, roman: 'I', root: 'G', symbol: 'G', label: 'G', beats: 4 }, { degree: 5, roman: 'V', root: 'D', symbol: 'D', label: 'D', beats: 4 }]))
  localStorage.setItem('kg:progKey', JSON.stringify('G'))
  localStorage.setItem('kg:progMode', JSON.stringify('major'))
  const built = chainSong(c3, inst.midis)!
  const band = jamBandForSong(built.song, inst)
  assert.ok(band && band.some(stepEvents => stepEvents.some(e => e.e.kind === 'gtr' || e.e.kind === 'drum' || e.e.kind === 'bass')), 'jamBandForSong attaches backing events')

  saveChain({ ...EMPTY_CHAIN, links: [] })
  console.log('Batch H1 unit checks: ok')
}

// 7. Batch H2: Song/Exercise transposition, Capo N sync, Jam key mismatch + transpose, and Licks<->Exercises<->Songs deep links
{
  assert.equal(shiftKeyName('G', 2, false), 'A')
  assert.equal(shiftKeyName('G', 1, false), 'Ab')
  assert.equal(shiftKeyName('A', -2, true), 'G')
  assert.equal(shiftChord('G/B', 2), 'A/C#')
  assert.equal(shiftChord('Am7', -2), 'Gm7')
  assert.equal(keyOptionId('E', true), '4:1')

  // Tabbed riff transposition & chord-sheet transposition + Capo N sync
  const riffTrack = {
    name: 'Guitar',
    tuning: inst.midis,
    capo: 0,
    bars: [{
      steps: [
        { dur: 2, notes: [{ string: 0, fret: 3, midi: inst.midis[0] + 3 }] },
        { dur: 2, notes: [{ string: 1, fret: 3, midi: inst.midis[1] + 3 }] },
      ],
    }],
  }
  const shiftedRiff = transposeTrack(riffTrack, 2, { inst })
  assert.equal(shiftedRiff.capo, 0)
  assert.equal(shiftedRiff.bars[0].steps[0].notes[0].midi, inst.midis[0] + 5)
  assert.equal(shiftedRiff.bars[0].steps[0].notes[0].fret, 5)

  const chordTrack = {
    name: 'Guitar',
    tuning: inst.midis,
    capo: 0,
    bars: [{
      steps: [
        { dur: 2, chord: 'G', notes: [{ string: 0, fret: 3, midi: inst.midis[0] + 3 }, { string: 5, fret: 3, midi: inst.midis[5] + 3 }] },
        { dur: 2, chord: 'C', notes: [{ string: 1, fret: 3, midi: inst.midis[1] + 3 }] },
      ],
    }],
  }
  const shiftedChords = transposeTrack(chordTrack, 2, { inst })
  assert.equal(shiftedChords.capo, 0)
  assert.equal(shiftedChords.bars[0].steps[0].chord, 'A')
  assert.equal(shiftedChords.bars[0].steps[1].chord, 'D')
  assert.ok(shiftedChords.bars[0].steps[0].notes.some(n => n.midi % 12 === 9), 'A chord voicing includes A')

  // Capo N sync with transpose (+2 semitones + Capo 2 keeps frets and chord shapes identical)
  const capoSynced = transposeTrack(chordTrack, 2, { targetCapo: 2, inst })
  assert.equal(capoSynced.capo, 2)
  assert.equal(capoSynced.bars[0].steps[0].chord, 'G')
  assert.equal(capoSynced.bars[0].steps[0].notes[0].fret, 3)
  assert.equal(capoSynced.bars[0].steps[0].notes[0].midi, inst.midis[0] + 5)

  // Capo N without changing sounding pitch (Capo 2 on G -> F shapes, same MIDI)
  const capoOnly = transposeTrack(chordTrack, 0, { targetCapo: 2, inst })
  assert.equal(capoOnly.capo, 2)
  assert.equal(capoOnly.bars[0].steps[0].chord, 'F')
  assert.ok(capoOnly.bars[0].steps[0].notes.some(n => n.midi % 12 === 7), 'Capo 2 F-shape sounds as G')

  // Downward shift below open E stays playable (no negative frets)
  const openETrack = {
    name: 'Guitar',
    tuning: inst.midis,
    capo: 0,
    bars: [{ steps: [{ dur: 4, notes: [{ string: 0, fret: 0, midi: inst.midis[0] }] }] }],
  }
  const downTwo = transposeSong({ title: 'Open E', tracks: [openETrack] }, -2, { inst })
  assert.ok(downTwo.tracks[0].bars[0].steps[0].notes.every(n => n.fret >= 0), 'downward transpose never produces negative frets')

  // Jam key mismatch detection and mode-aware progression transposition
  const gProg: ProgChord[] = [
    spell('G', 'major', { semi: 0, type: '' }),
    spell('G', 'major', { semi: 7, type: '' }),
    spell('G', 'major', { semi: 9, type: 'm' }),
    spell('G', 'major', { semi: 5, type: '' }),
  ]
  assert.equal(detectJamKeyMismatch(gProg, 'G', 'major'), null, 'matching G major progression has no mismatch')
  const mm = detectJamKeyMismatch(gProg, 'A', 'minor')
  assert.ok(mm !== null && mm.progKey.root === 'G' && mm.progKey.minor === false, 'G major chords in Am Jam trigger mismatch')
  const fixedProg = transposeJamProg(gProg, mm!.progKey.root, 'A', 'minor', mm!.progKey.minor)
  assert.equal(fixedProg[0].symbol, 'Am')
  assert.equal(detectJamKeyMismatch(fixedProg, 'A', 'minor'), null, 'transposed progression resolves mismatch cleanly')

  // Deep-link helpers set target filters
  openSongsInKey('7:0')
  assert.equal(JSON.parse(localStorage.getItem('kg:libKey')!), '7:0')
  openExercisesFiltered({ worksOver: 'blues12' })
  assert.equal((JSON.parse(localStorage.getItem('kg:exFilter')!) as { worksOver: string }).worksOver, 'blues12')

  console.log('Batch H2 unit checks: ok')
}

// 8. Batch H3: Visual Count-in & First-Beat Cue Bar state math
{
  // 1-bar 4/4 count-in
  const c1 = cueStateFromBeats({ beatNow: -4.0, fromBeat: 0, meter: 4, countInTotal: 4 })
  assert.equal(c1.phase, 'count')
  assert.equal(c1.bar, 1)
  assert.equal(c1.beat, 1)
  assert.equal(c1.countBars, 1)
  assert.equal(c1.isBeatOne, true)

  const c3 = cueStateFromBeats({ beatNow: -1.5, fromBeat: 0, meter: 4, countInTotal: 4, swung: true })
  assert.equal(c3.phase, 'count')
  assert.equal(c3.beat, 3)
  assert.equal(c3.showAnd, true, 'swung groove lights & pickup in last two beats')

  // 2-bar fast-tempo count-in (8 beats in 4/4)
  const fast2 = cueStateFromBeats({ beatNow: 4, fromBeat: 8, meter: 4, countInTotal: 8 })
  assert.equal(fast2.phase, 'count')
  assert.equal(fast2.countBars, 2)
  assert.equal(fast2.bar, 2)
  assert.equal(fast2.beat, 1)
  assert.equal(fast2.countFrac, 0.5)

  // First-beat drop cue right on Beat 1 of Bar 1
  const drop = cueStateFromBeats({ beatNow: 8.1, fromBeat: 8, meter: 4, countInTotal: 8 })
  assert.equal(drop.phase, 'drop')
  assert.equal(drop.bar, 1)
  assert.equal(drop.beat, 1)
  assert.equal(drop.isFirstDrop, true)
  assert.equal(drop.isBeatOne, true)

  // Ongoing play phase in 3/4: soft Beat 1 pulse on Bar 2 beat 1, quiet on beat 2
  const waltzB1 = cueStateFromBeats({ beatNow: 3.1, fromBeat: 0, meter: 3, countInTotal: 3 })
  assert.equal(waltzB1.phase, 'play')
  assert.equal(waltzB1.bar, 2)
  assert.equal(waltzB1.beat, 1)
  assert.equal(waltzB1.isBeatOne, true)

  const waltzB2 = cueStateFromBeats({ beatNow: 4.2, fromBeat: 0, meter: 3, countInTotal: 3 })
  assert.equal(waltzB2.phase, 'play')
  assert.equal(waltzB2.bar, 2)
  assert.equal(waltzB2.beat, 2)
  assert.equal(waltzB2.isBeatOne, false)

  // openLicksInKey: native must-know key sets strict mustKey; rare transposed key sets transposed want-key fallback
  openLicksInKey('E', true)
  assert.equal(JSON.parse(localStorage.getItem('kg:mustKey')!), '4:1', 'Em uses strict native filter')
  assert.equal(JSON.parse(localStorage.getItem('kg:lickWantKey')!), null, 'Em clears want-key')

  openLicksInKey('Bb', true)
  assert.equal(JSON.parse(localStorage.getItem('kg:mustKey')!), 'all', 'Bb minor avoids empty filter')
  assert.deepEqual(JSON.parse(localStorage.getItem('kg:lickWantKey')!), { root: 'Bb', minor: true }, 'Bb minor sets transposed want-key')

  console.log('Batch H3 unit checks: ok')
}

