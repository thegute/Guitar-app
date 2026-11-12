// Quizzes for the theory essentials course (Learn → Course → Guitar theory), one per lesson, in the order of the
// owner's chosen theory book (No Bull Music Theory for Guitarists): the musical alphabet, tones and semitones, the
// major scale, triads (the existing "Spell the triad"), intervals, chromatic intervals, major keys, chord progressions,
// pentatonic scales, the natural minor scale and minor keys. Questions and wording are our own. Every note question
// can also be answered by playing the note (mic mode).
import { LETTERS, MAJOR_KEYS, MINOR_KEYS, NAT_MINOR_SEMIS, interval, keyChords, noteAt, pcOf, relativeMajor, relativeMinor, spellScale } from '../theory/spell'
import type { Question, QuizDef } from './quiz'
import { octaveShapes } from './lessonExtras'
import { stringName } from '../instrument'

const pick = <T,>(a: readonly T[], rnd: () => number) => a[Math.floor(rnd() * a.length)]
function shuffle<T>(a: T[], rnd: () => number) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const uniq = <T,>(a: T[]) => [...new Set(a)]

/** A multiple-choice question: the answer plus three different wrong ones (as plausible as possible). */
function choose(item: string, prompt: string, ans: string, wrong: string[], explain: string, rnd: () => number, extra: Partial<Question> = {}): Question {
  const opts = shuffle([ans, ...shuffle(uniq(wrong.filter(w => w !== ans)), rnd).slice(0, 3)], rnd)
  return {
    item, prompt, explain, ...extra,
    input: { type: 'choices', options: opts.map(o => ({ id: o, label: o })) },
    check: a => 'choice' in a && a.choice === ans,
  }
}
/** Wrong answers next to a note: the same letter with other accidentals, and the letters either side. */
function nearNotes(n: string): string[] {
  const L = LETTERS.indexOf(n[0] as typeof LETTERS[number])
  const base = n[0]
  return [base, `${base}#`, `${base}b`, LETTERS[(L + 1) % 7], LETTERS[(L + 6) % 7], `${LETTERS[(L + 1) % 7]}b`, `${LETTERS[(L + 6) % 7]}#`].filter(x => x !== n)
}
/** play the note to answer (mic mode): any octave of the right pitch */
const playNote = (n: string) => ({ kind: 'note' as const, ok: (m: number) => ((m % 12) + 12) % 12 === pcOf(n), want: n })
const ORD = ['root', '2nd', '3rd', '4th', '5th', '6th', '7th']

export const THEORY_QUIZZES: QuizDef[] = [
  {
    id: 'nb-alpha', unit: 'Guitar theory', title: 'The musical alphabet', desc: 'Seven letters, round and round: count up and down them, and know where there is no sharp.', length: 10, mic: true,
    items: () => [...LETTERS.flatMap(l => [`up:${l}:2`, `up:${l}:3`, `down:${l}:2`]), 'gap:EF', 'gap:BC', 'gap:CD', 'gap:GA', 'gap:FG'],
    make: (item, _i, rnd) => {
      const [k, a, b] = item.split(':')
      if (k === 'gap') {
        const none = a === 'EF' || a === 'BC'
        return choose(item, `Is there a sharp/flat note between ${a[0]} and ${a[1]}?`, none ? 'No: they are a semitone apart' : 'Yes: they are a tone apart', ['No: they are a semitone apart', 'Yes: they are a tone apart'],
          'E–F and B–C are the only neighbours with nothing in between. Every other pair of letters has a sharp/flat note between them.', rnd)
      }
      const L = LETTERS.indexOf(a as typeof LETTERS[number]), n = Number(b)
      const ans = LETTERS[(L + (k === 'up' ? n : 7 - n)) % 7]
      return choose(item, `Count ${n} letters ${k === 'up' ? 'up' : 'down'} from ${a}: which letter?`, ans, [...LETTERS].filter(x => x !== ans && x !== a),
        `${k === 'up' ? 'Up' : 'Down'} from ${a}: ${Array.from({ length: n + 1 }, (_, j) => LETTERS[(L + (k === 'up' ? j : 7 * 3 - j)) % 7]).join(' → ')}. After G it starts again at A.`, rnd, { mic: playNote(ans) })
    },
  },
  {
    id: 'nb-steps', unit: 'Guitar theory', title: 'Tones and semitones', desc: 'A semitone is one fret, a tone is two: name the note a step up or down.', length: 10, mic: true,
    items: () => ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'F#', 'Bb', 'Eb'].flatMap(n => [`tone-up:${n}`, `semi-up:${n}`, `semi-down:${n}`]),
    make: (item, _i, rnd) => {
      const [k, n] = item.split(':')
      const semis = k === 'tone-up' ? 2 : k === 'semi-up' ? 1 : -1
      const p = (pcOf(n) + semis + 12) % 12
      // name it with the next letter going up (or the same letter raised), the previous going down
      const up = semis > 0
      const cands = [noteAt(n, up ? 1 : 6, (semis + 12) % 12), noteAt(n, 0, (semis + 12) % 12)].filter(x => x.length <= 2)
      const ans = cands.find(x => pcOf(x) === p) ?? cands[0]
      const what = k === 'tone-up' ? 'a tone (2 frets) above' : k === 'semi-up' ? 'a semitone (1 fret) above' : 'a semitone (1 fret) below'
      return choose(item, `What note is ${what} ${n}?`, ans, nearNotes(ans).filter(x => pcOf(x) !== p),
        `${n} ${up ? '+' : '−'} ${Math.abs(semis)} fret${Math.abs(semis) > 1 ? 's' : ''} = ${ans}${cands.length > 1 && cands[1] !== ans && pcOf(cands[1]) === p ? ` (the same sound as ${cands[1]})` : ''}. Remember E–F and B–C are only a semitone apart.`, rnd, { mic: playNote(ans) })
    },
  },
  {
    id: 'nb-major', unit: 'Guitar theory', title: 'The major scale', desc: 'Tone, tone, semitone, tone, tone, tone, semitone: spell any major scale.', length: 10, mic: true,
    items: () => MAJOR_KEYS.flatMap(k => [2, 3, 4, 6, 7].map(d => `${k}:${d}`)),
    make: (item, _i, rnd) => {
      const [k, d] = item.split(':'), deg = Number(d)
      const notes = spellScale(k), ans = notes[deg - 1]
      return choose(item, `What is note ${deg} of the ${k} major scale?`, ans, [...nearNotes(ans), ...notes].filter(x => x !== ans),
        `${k} major: ${notes.join(' ')}. Each letter once, built with T T S T T T S.`, rnd, { mic: playNote(ans) })
    },
  },
  {
    id: 'nb-int', unit: 'Guitar theory', title: 'Intervals: the 2nd to the 7th', desc: 'Number the major scale from its root: "the 5th of D" is the 5th note of D major.', length: 10, mic: true,
    items: () => ['C', 'G', 'D', 'A', 'E', 'F', 'Bb'].flatMap(k => ['2', '3', '4', '5', '6', '7'].map(i => `${k}:${i}`)),
    make: (item, _i, rnd) => {
      const [k, i] = item.split(':')
      const ans = interval(k, i)
      return choose(item, `What is the ${ORD[Number(i) - 1]} of ${k}?`, ans, [...spellScale(k), ...nearNotes(ans)].filter(x => x !== ans),
        `${k} major is ${spellScale(k).join(' ')}: number it root, 2nd, 3rd … The ${ORD[Number(i) - 1]} is ${ans}.`, rnd, { mic: playNote(ans) })
    },
  },
  {
    id: 'nb-chrom', unit: 'Guitar theory', title: 'Flat and sharp intervals', desc: 'b3, b7, #4, b5, #5, b6: move a major-scale interval a fret down or up.', length: 10, mic: true,
    items: () => ['C', 'G', 'D', 'A', 'E', 'F'].flatMap(k => ['b2', 'b3', '#4', 'b5', '#5', 'b6', 'b7', '#2'].map(i => `${k}:${i}`)),
    make: (item, _i, rnd) => {
      const [k, i] = item.split(':')
      const ans = interval(k, i), plain = interval(k, i.replace(/[b#]/g, ''))
      const twin = i === '#4' ? 'b5' : i === 'b5' ? '#4' : i === '#5' ? 'b6' : i === 'b6' ? '#5' : i === '#2' ? 'b3' : i === 'b3' ? '#2' : null
      return choose(item, `What is the ${i} of ${k}?`, ans, [plain, ...nearNotes(ans), ...(twin ? [interval(k, twin)] : [])].filter(x => x !== ans),
        `The ${i.replace(/[b#]/, '')} of ${k} is ${plain}; ${i[0] === 'b' ? 'flatten it (a fret lower)' : 'sharpen it (a fret higher)'} and keep the letter: ${ans}.${twin ? ` It sounds the same as the ${twin} (${interval(k, twin)}), but it is written from a different letter.` : ''}`, rnd, { mic: playNote(ans) })
    },
  },
  {
    id: 'nb-keys', unit: 'Guitar theory', title: 'Chords in a major key', desc: 'I, IV and V are major; ii, iii and vi are minor; vii is diminished.', length: 10, mic: false,
    items: () => ['C', 'G', 'D', 'A', 'E', 'F', 'Bb'].flatMap(k => [1, 2, 3, 4, 5, 6, 7].map(n => `${k}:${n}`)),
    make: (item, _i, rnd) => {
      const [k, n] = item.split(':'), deg = Number(n)
      const chords = keyChords(k), c = chords[deg - 1]
      const root = c.chord.replace(/m$|dim$/, '')
      return choose(item, `In the key of ${k} major, what is chord ${c.numeral}?`, c.chord, [root, `${root}m`, `${root}dim`, ...chords.map(x => x.chord)].filter(x => x !== c.chord),
        `The chords of ${k} major: ${chords.map(x => `${x.numeral} ${x.chord}`).join(', ')}.`, rnd)
    },
  },
  {
    id: 'nb-prog', unit: 'Guitar theory', title: 'Progressions in any key', desc: 'Turn numbers into chords: I–IV–V, I–vi–IV–V, ii–V–I in every key.', length: 8, mic: false,
    items: () => ['C', 'G', 'D', 'A', 'E', 'F'].flatMap(k => ['1-4-5', '1-6-4-5', '2-5-1', '1-5-6-4', '6-4-1-5'].map(p => `${k}:${p}`)),
    make: (item, _i, rnd) => {
      const [k, p] = item.split(':')
      const chords = keyChords(k)
      const seq = (ds: number[]) => ds.map(d => chords[d - 1].chord).join(' – ')
      const ds = p.split('-').map(Number)
      const ans = seq(ds)
      const wrong = [
        seq(ds.map(d => (d % 7) + 1)),
        ds.map(d => chords[d - 1].chord.replace(/m$/, '')).join(' – '),
        seq([...ds].reverse()),
        seq(ds.map(d => ((d + 2) % 7) + 1)),
      ]
      return choose(item, `Play ${ds.map(d => chords[d - 1].numeral).join(' – ')} in ${k} major. Which chords?`, ans, wrong,
        `In ${k}: ${chords.map(x => `${x.numeral} = ${x.chord}`).join(', ')}. So ${ds.map(d => chords[d - 1].numeral).join('–')} is ${ans}.`, rnd)
    },
  },
  {
    id: 'nb-pent', unit: 'Guitar theory', title: 'Pentatonic scales', desc: 'Major pentatonic: leave out the 4th and 7th. Minor pentatonic: root, b3, 4, 5, b7.', length: 10, mic: true,
    items: () => [...['C', 'G', 'D', 'A', 'E', 'F'].map(k => `maj:${k}`), ...['A', 'E', 'D', 'G', 'B', 'C'].map(k => `min:${k}`), ...['C', 'G', 'D', 'A'].map(k => `out:${k}`)],
    make: (item, _i, rnd) => {
      const [k, t] = item.split(':')
      if (k === 'out') {
        const s = spellScale(t), ans = `${s[3]} and ${s[6]}`
        return choose(item, `Which two notes of ${t} major are left out of ${t} major pentatonic?`, ans, [`${s[1]} and ${s[5]}`, `${s[2]} and ${s[6]}`, `${s[3]} and ${s[4]}`, `${s[0]} and ${s[4]}`],
          `${t} major is ${s.join(' ')}; drop the 4th (${s[3]}) and 7th (${s[6]}) and you get ${[s[0], s[1], s[2], s[4], s[5]].join(' ')}: no semitones left to clash.`, rnd)
      }
      const notes = k === 'maj' ? [0, 1, 2, 4, 5].map(i => spellScale(t)[i]) : ['1', 'b3', '4', '5', 'b7'].map(i => interval(t, i))
      const deg = Math.floor(rnd() * 4) + 1
      const ans = notes[deg]
      return choose(item, `${t} ${k === 'maj' ? 'major' : 'minor'} pentatonic: what is its note number ${deg + 1}?`, ans, [...nearNotes(ans), ...notes].filter(x => x !== ans),
        `${t} ${k === 'maj' ? 'major' : 'minor'} pentatonic is ${notes.join(' ')}${k === 'min' ? ' (root, b3, 4, 5, b7)' : ' (root, 2, 3, 5, 6)'}.`, rnd, { mic: playNote(ans) })
    },
  },
  {
    id: 'nb-minor', unit: 'Guitar theory', title: 'The natural minor scale', desc: 'Root, 2, b3, 4, 5, b6, b7: the major scale with three notes lowered.', length: 10, mic: true,
    items: () => MINOR_KEYS.slice(0, 8).flatMap(k => [3, 6, 7, 2].map(d => `${k}:${d}`)),
    make: (item, _i, rnd) => {
      const [k, d] = item.split(':'), deg = Number(d)
      const notes = spellScale(k, NAT_MINOR_SEMIS), ans = notes[deg - 1]
      return choose(item, `What is note ${deg} of ${k} natural minor?`, ans, [spellScale(k)[deg - 1], ...nearNotes(ans), ...notes].filter(x => x !== ans),
        `${k} natural minor: ${notes.join(' ')} (R 2 b3 4 5 b6 b7). It has the same notes as ${relativeMajor(k)} major.`, rnd, { mic: playNote(ans) })
    },
  },
  {
    id: 'nb-minorkey', unit: 'Guitar theory', title: 'Minor keys and relative minors', desc: 'i, iv and v are minor; III, VI and VII are major; every major key shares its notes with a minor key.', length: 10, mic: false,
    items: () => [...MINOR_KEYS.slice(0, 8).flatMap(k => [3, 4, 5, 6, 7].map(n => `chord:${k}:${n}`)), ...MAJOR_KEYS.slice(0, 8).map(k => `rel:${k}`)],
    make: (item, _i, rnd) => {
      const [k, a, b] = item.split(':')
      if (k === 'rel') {
        const ans = `${relativeMinor(a)}m`
        return choose(item, `What is the relative minor of ${a} major?`, ans, [`${noteAt(a, 2, 4)}m`, `${noteAt(a, 4, 7)}m`, `${a}m`, `${noteAt(a, 1, 2)}m`],
          `Count to the 6th note of ${a} major (${spellScale(a).join(' ')}): ${relativeMinor(a)}. ${ans} uses exactly the same notes and chords as ${a} major, it just feels at home on ${relativeMinor(a)}.`, rnd)
      }
      const deg = Number(b), chords = keyChords(a, true), c = chords[deg - 1]
      const root = c.chord.replace(/m$|dim$/, '')
      return choose(item, `In ${a} minor, what is chord ${c.numeral}?`, c.chord, [root, `${root}m`, `${root}dim`, ...chords.map(x => x.chord)].filter(x => x !== c.chord),
        `${a} minor: ${chords.map(x => `${x.numeral} ${x.chord}`).join(', ')}: the same chords as ${relativeMajor(a)} major, starting from ${a}m.`, rnd)
    },
  },
  // ---------------- Theory course, Level 1: octave shapes ----------------
  {
    id: 'oc-hear', unit: 'Guitar theory', title: 'Hear it: octave or not?', ear: true,
    desc: 'Two notes: the same, an octave apart, or a different note? An octave sounds like the same note, higher.', length: 10, mic: false,
    items: () => ['same', 'octave', 'octave', 'down', 'down', 'near7', 'near9', 'fifth'].map((k, i) => `oc-hear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const kind = item.split(':')[1]
      const lo = 43 + Math.floor(rnd() * 12)
      const second = { same: lo, octave: lo + 12, down: lo - 12, near7: lo + 11, near9: lo + 13, fifth: lo + 7 }[kind] ?? lo + 12
      const ans = kind === 'same' ? 'The same note' : kind === 'octave' || kind === 'down' ? 'An octave apart' : 'A different note'
      const why = {
        same: 'Both notes are exactly the same pitch (a unison): no jump at all.',
        octave: 'The second note is the same note one octave higher: it blends with the first as if it were the same note, just brighter.',
        down: 'The second note is the same note one octave lower: same name, deeper.',
        near7: 'Close, but one fret short of an octave (a major 7th): it sounds tense and wants to move up one more fret.',
        near9: 'One fret past the octave (a minor 9th): it clashes. An octave never clashes.',
        fifth: 'A 5th (the power chord sound): strong, but clearly two different notes.',
      }[kind] ?? ''
      return {
        item, prompt: 'Same note, an octave apart, or a different note?', sub: 'Listen to both. Tap ▶ to hear them again.',
        audio: { seq: [lo, second] },
        input: { type: 'choices', options: ['The same note', 'An octave apart', 'A different note'].map(o => ({ id: o, label: o })) },
        check: a => 'choice' in a && a.choice === ans, explain: `${ans}. ${why}`,
      }
    },
  },
  {
    id: 'oc-move', unit: 'Guitar theory', title: 'Octave shapes on every string pair',
    desc: 'From a note on one string, find the same note an octave higher on another string, without counting frets.', length: 12, mic: true,
    items: inst => octaveShapes(inst.midis).filter(x => inst.midis[x.t] > inst.midis[x.s]).flatMap(x => [1, 3, 5, 7].map(f => `oc-move:${x.s}:${x.t}:${f}`)),
    make: (item, inst, rnd) => {
      const [, ss, tt, ff] = item.split(':')
      const s2 = +ss, t = +tt, f0 = +ff
      const move = 12 - (inst.midis[t] - inst.midis[s2])
      const f = Math.max(0, Math.min(f0 + (move < 0 ? -move : 0), 15 - Math.max(0, move)))
      const ans = f + move
      const target = inst.midis[s2] + f + 12
      const S = stringName(inst.midis, s2), T = stringName(inst.midis, t)
      const wrong = [ans - 1, ans + 1, ans - 2, ans + 2, ans + 12].filter(x => x >= 0 && x <= 15 && x !== ans).map(String)
      const way = move === 0 ? 'the same fret' : move > 0 ? `${move} fret${move > 1 ? 's' : ''} higher` : `${-move} fret${move < -1 ? 's' : ''} lower`
      const crossesB = inst.id === 'guitar' && s2 <= 3 && t >= 4 && inst.midis[4] - inst.midis[3] === 4
      return choose(item, `Fret ${f} on the ${S} string: where is the same note an octave higher on the ${T} string?`, String(ans), wrong,
        `Fret ${ans} (${way}). The ${S} and ${T} strings are ${inst.midis[t] - inst.midis[s2]} frets apart in pitch, so the octave (12) lands ${way}.` +
        (crossesB ? ' Crossing the B string adds one fret, because G to B is one fret closer than the other strings.' : ''), rnd, {
          neck: { from: 0, to: 15, marks: [{ s: s2, f, label: '1', role: 'root' }] },
          mic: { kind: 'note', ok: (m: number) => m === target, want: `the octave on the ${T} string` },
        })
    },
  },
  // ---------------- Theory course, Level 1: hearing pitch, steps and tuning; reading tab and chord boxes ----------------
  {
    id: 'l1-pitch', unit: 'Guitar theory', title: 'Hear it: higher, lower or the same?', ear: true,
    desc: 'Two notes: is the second higher, lower or the same? The first skill of every musical ear.', length: 10, mic: false,
    items: () => ['up', 'down', 'same', 'up-small', 'down-small', 'up', 'down', 'same', 'up-small', 'down-small'].map((k, i) => `l1-pitch:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const kind = item.split(':')[1]
      const a = 45 + Math.floor(rnd() * 15)
      const step = kind.endsWith('small') ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 8)
      const b = kind === 'same' ? a : kind.startsWith('up') ? a + step : a - step
      const ans = kind === 'same' ? 'The same' : kind.startsWith('up') ? 'Higher' : 'Lower'
      const why = kind === 'same' ? 'Both notes are exactly the same pitch.' : `The second note is ${step} fret${step > 1 ? 's' : ''} ${kind.startsWith('up') ? 'higher' : 'lower'}.${step <= 2 ? ' Small steps are the hardest to hear: sing both notes and feel whether your voice goes up or down.' : ''}`
      return {
        item, prompt: 'Is the second note higher, lower or the same?', sub: 'Tap ▶ to hear them again. Try humming both.',
        audio: { seq: [a, b] },
        input: { type: 'choices', options: ['Higher', 'Lower', 'The same'].map(o => ({ id: o, label: o })) },
        check: x => 'choice' in x && x.choice === ans, explain: `${ans}. ${why}`,
      }
    },
  },
  {
    id: 'l1-step-ear', unit: 'Guitar theory', title: 'Hear it: semitone or tone?', ear: true,
    desc: 'One fret (a semitone) sounds tight and close; two frets (a tone) sounds like the first steps of do-re-mi.', length: 10, mic: false,
    items: () => ['semi', 'tone', 'semi', 'tone', 'bigger', 'semi', 'tone', 'semi', 'tone', 'bigger'].map((k, i) => `l1-step-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const kind = item.split(':')[1]
      const a = 45 + Math.floor(rnd() * 15)
      const n = kind === 'semi' ? 1 : kind === 'tone' ? 2 : 3 + Math.floor(rnd() * 2)
      const down = rnd() < 0.3
      const ans = kind === 'semi' ? 'A semitone (1 fret)' : kind === 'tone' ? 'A tone (2 frets)' : 'Bigger than a tone'
      const why = kind === 'semi' ? 'One fret apart: the tightest step there is (like the "Jaws" theme, or ti to do).' : kind === 'tone' ? 'Two frets apart: the step from do to re.' : `${n} frets apart: a bigger jump than a tone.`
      return {
        item, prompt: `How far apart are these two notes?${down ? ' (the second is lower)' : ''}`, sub: 'Tap ▶ to hear them again.',
        audio: { seq: down ? [a + n, a] : [a, a + n] },
        input: { type: 'choices', options: ['A semitone (1 fret)', 'A tone (2 frets)', 'Bigger than a tone'].map(o => ({ id: o, label: o })) },
        check: x => 'choice' in x && x.choice === ans, explain: `${ans}. ${why}`,
      }
    },
  },
  {
    id: 'l1-tune-ear', unit: 'Guitar theory', title: 'Hear it: in tune or out of tune?', ear: true,
    desc: 'Two strings playing the same note: in tune they blend into one steady sound; out of tune you hear a wobble (beats).', length: 10, mic: false,
    items: () => ['in', 'out1', 'in', 'out2', 'out3', 'in', 'out1', 'out2', 'in', 'out3'].map((k, i) => `l1-tune-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const kind = item.split(':')[1]
      const a = 50 + Math.floor(rnd() * 12)
      const off = { in: 0, out1: 0.3, out2: 0.18, out3: 0.1 }[kind] ?? 0
      const sign = rnd() < 0.5 ? -1 : 1
      const ans = kind === 'in' ? 'In tune (steady)' : 'Out of tune (it wobbles)'
      const why = kind === 'in' ? 'The two notes match exactly, so they blend into one smooth, steady sound.' : `One note is ${Math.round(off * 100)} cents ${sign > 0 ? 'sharp' : 'flat'}: the two waves drift in and out of step, which you hear as a slow wobble. The slower the wobble, the closer you are; when it stops, you're in tune.`
      return {
        item, prompt: 'Same note on two strings: in tune or out of tune?', sub: 'Listen for a wobble (a slow wah-wah-wah). Tap ▶ to hear it again.',
        audio: { chord: [a, a + sign * off] },
        input: { type: 'choices', options: ['In tune (steady)', 'Out of tune (it wobbles)'].map(o => ({ id: o, label: o })) },
        check: x => 'choice' in x && x.choice === ans, explain: `${ans}. ${why}`,
      }
    },
  },
  {
    id: 'l1-read', unit: 'Guitar theory', title: 'Reading tab and chord boxes',
    desc: 'The signs on tabs, chord boxes and neck pictures: what each one tells your hands.', length: 10, mic: false,
    items: () => READ.map((_, i) => `l1-read:${i}`),
    make: (item, _inst, rnd) => {
      const r = READ[Number(item.split(':')[1])]
      return choose(item, r[0], r[1], r[2], `${r[1]}. ${r[3]}`, rnd)
    },
  },
  // ---------------- Theory course, Level 2: hearing the major scale and its intervals ----------------
  {
    id: 'l2-major-ear', unit: 'Guitar theory', title: 'Hear it: a major scale, or is something off?', ear: true,
    desc: 'A scale plays up from its root: is it the major scale, or has one step been changed?', length: 8, mic: false,
    items: () => ['ok', 'b3', 'ok', 'b7', '#4', 'ok', 'b6', 'b2'].map((k, i) => `l2-major-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const root = 45 + Math.floor(rnd() * 8)
      const steps = [0, 2, 4, 5, 7, 9, 11, 12]
      const change: Record<string, [number, number]> = { b3: [2, 3], b7: [6, 10], '#4': [3, 6], b6: [5, 8], b2: [1, 1] }
      const ch = change[k]
      const seq = steps.map((x, i) => root + (ch && ch[0] === i ? ch[1] : x))
      const ans = k === 'ok' ? 'The major scale' : 'Something\'s off'
      const why = k === 'ok' ? 'Tone, tone, semitone, tone, tone, tone, semitone: the "do re mi" you know.'
        : { b3: 'The 3rd was lowered (a b3): it sounds instantly minor and darker.', b7: 'The 7th was lowered (a b7): no pull up to the top note, a bluesy, folky sound.', '#4': 'The 4th was raised (a #4): a dreamy, floating sound (that\'s the Lydian mode).', b6: 'The 6th was lowered (a b6): a sad, exotic turn near the top.', b2: 'The 2nd was lowered (a b2): a dark, Spanish-sounding step at the start.' }[k] ?? ''
      return {
        item, prompt: 'Is this the major scale, or has one note been changed?', sub: 'Sing "do re mi fa so la ti do" along with it.',
        audio: { seq },
        input: { type: 'choices', options: ['The major scale', 'Something\'s off'].map(o => ({ id: o, label: o })) },
        check: x => 'choice' in x && x.choice === ans, explain: `${ans}. ${why}`,
      }
    },
  },
  {
    id: 'l2-int-ear', unit: 'Guitar theory', title: 'Hear it: intervals of the major scale', ear: true,
    desc: 'The root, then another note of its major scale: which interval is it? Each comes with a song opening to remember it by.', length: 10, mic: false,
    items: () => ['2', '3', '4', '5', '6', '7', '8', '3', '5', '4'].map((k, i) => `l2-int-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const semis: Record<string, number> = { '2': 2, '3': 4, '4': 5, '5': 7, '6': 9, '7': 11, '8': 12 }
      const name: Record<string, string> = { '2': 'Major 2nd', '3': 'Major 3rd', '4': 'Perfect 4th', '5': 'Perfect 5th', '6': 'Major 6th', '7': 'Major 7th', '8': 'Octave' }
      const tag: Record<string, string> = {
        '2': 'the first two notes of "Happy Birthday" sung on "hap-py BIRTH"… or simply do → re.',
        '3': 'do → mi: the first two notes of "Oh! When the Saints".',
        '4': 'the opening leap of "Here Comes the Bride".',
        '5': 'the leap in "Twinkle, Twinkle, Little Star" (twinkle → TWIN-kle).',
        '6': 'the opening of "My Bonnie Lies Over the Ocean".',
        '7': 'one fret short of the octave: tense, wanting to go up a step.',
        '8': 'the same note higher: "Some-where" in "Somewhere Over the Rainbow".',
      }
      const root = 45 + Math.floor(rnd() * 10)
      const ans = name[k]
      const pool = Object.values(name).filter(n => n !== ans)
      return choose(item, 'Root, then which interval?', ans, pool, `${ans}: ${tag[k]}`, rnd, { audio: { seq: [root, root + semis[k]] }, sub: 'Tap ▶ to hear it again. Sing it.' })
    },
  },
  {
    id: 'l2-chrom-ear', unit: 'Guitar theory', title: 'Hear it: major, minor or perfect?', ear: true,
    desc: 'The root, then a second note: name the interval. The choices are its close neighbours (major or minor, the 4th, tritone or 5th), so you learn to hear the one-fret difference.', length: 10, mic: false,
    items: () => ['m3', 'M3', 'm7', 'M7', 'm6', 'M6', 'tt', 'm2', 'm3', 'm7'].map((k, i) => `l2-chrom-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const semis: Record<string, number> = { m2: 1, M2: 2, m3: 3, M3: 4, P4: 5, tt: 6, P5: 7, m6: 8, M6: 9, m7: 10, M7: 11 }
      const name: Record<string, string> = { m2: 'Minor 2nd', M2: 'Major 2nd', m3: 'Minor 3rd', M3: 'Major 3rd', P4: 'Perfect 4th', tt: 'Tritone', P5: 'Perfect 5th', m6: 'Minor 6th', M6: 'Major 6th', m7: 'Minor 7th', M7: 'Major 7th' }
      const near: Record<string, string[]> = { m2: ['M2', 'm3'], m3: ['M3', 'M2', 'P4'], M3: ['m3', 'P4', 'M2'], tt: ['P4', 'P5', 'm6'], m6: ['M6', 'P5', 'm7'], M6: ['m6', 'm7', 'P5'], m7: ['M7', 'M6', 'm6'], M7: ['m7', 'M6'] }
      const tag: Record<string, string> = {
        m2: 'one fret: the creeping shark theme from "Jaws". Tense, rubbing.',
        m3: 'the opening of "Greensleeves" (A → C): the sound of a minor chord\'s bottom two notes.',
        M3: 'do → mi, "Oh! When the Saints": bright, the bottom of a major chord.',
        tt: 'three whole tones, halfway to the octave: the unsettled first leap of "Maria" (West Side Story); the clash inside every dominant 7th chord.',
        m6: 'the leap after the little run-up in "The Entertainer" (E → C): bittersweet.',
        M6: 'the opening of "My Bonnie Lies Over the Ocean": warm and open.',
        m7: 'the bluesy 7th of a dominant 7th chord: the first leap of the original "Star Trek" theme.',
        M7: 'one fret below the octave: dreamy and tense (the 7th of a maj7 chord).',
      }
      const root = 45 + Math.floor(rnd() * 10)
      const ans = name[k]
      return choose(item, 'Root, then which interval?', ans, near[k].map(x => name[x]), `${ans}: ${tag[k]}`, rnd, { audio: { seq: [root, root + semis[k]] }, sub: 'One fret makes the difference: major vs minor, perfect vs tritone.' })
    },
  },
  {
    id: 'l2-home-ear', unit: 'Guitar theory', title: 'Hear it: home, or not home yet?', ear: true,
    desc: 'A few chords in a key. Does the last one feel like home (finished), or does the music want to keep going?', length: 10, mic: false,
    items: () => ['I', 'V', 'I', 'IV', 'I', 'vi', 'I', 'ii', 'V', 'I'].map((k, i) => `l2-home-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const root = 43 + Math.floor(rnd() * 7) // G2 … C#3 area: comfortable guitar voicings
      const tri = (deg: number, minor: boolean) => { const b = root + [0, 2, 4, 5, 7, 9, 11][deg]; return [b, b + 7, b + 12, b + (minor ? 15 : 16)] }
      const I = tri(0, false), ii = tri(1, true), IV = tri(3, false), V = tri(4, false), vi = tri(5, true)
      const lead: Record<string, number[][]> = { I: pick([[I, IV, V], [I, vi, IV, V], [IV, V]], rnd), V: [I, IV], IV: [I, V], vi: [I, IV, V], ii: [I, vi] }
      const end: Record<string, number[]> = { I, V, IV, vi, ii }
      const ans = k === 'I' ? 'Home: it sounds finished' : 'Not home yet: it wants to go on'
      const why: Record<string, string> = {
        I: 'It ended on the I chord, the key\'s home: everything else in the key pulls towards it.',
        V: 'It stopped on the V chord: the most "unfinished" chord, leaning hard back to I.',
        IV: 'It stopped on the IV chord: open and lifted, but not resting.',
        vi: 'It stopped on vi, the sad relative of home: close, but not home (the "deceptive" ending).',
        ii: 'It stopped on ii: a soft minor chord that wants to move on, usually to V.',
      }
      return {
        item, prompt: 'Does the last chord sound like home?', sub: 'Hum the note that feels like home; is the last chord built on it?',
        audio: { chords: [...lead[k], end[k]] },
        input: { type: 'choices', options: ['Home: it sounds finished', 'Not home yet: it wants to go on'].map(o => ({ id: o, label: o })) },
        check: x => 'choice' in x && x.choice === ans, explain: `${ans}. ${why[k]}`,
      }
    },
  },
  {
    id: 'l2-num-ear', unit: 'Guitar theory', title: 'Hear it: which chord of the key?', ear: true,
    desc: 'The home chord (I), then another chord of the key. Is it IV, V, vi or ii? Hearing chords as numbers is how players learn songs by ear.', length: 10, mic: false,
    items: () => ['V', 'IV', 'vi', 'V', 'IV', 'ii', 'vi', 'V', 'IV', 'vi'].map((k, i) => `l2-num-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const root = 43 + Math.floor(rnd() * 7)
      const tri = (deg: number, minor: boolean) => { const b = root + [0, 2, 4, 5, 7, 9, 11][deg]; return [b, b + 7, b + 12, b + (minor ? 15 : 16)] }
      const chords: Record<string, number[]> = { I: tri(0, false), ii: tri(1, true), IV: tri(3, false), V: tri(4, false), vi: tri(5, true) }
      const feel: Record<string, string> = {
        IV: 'IV: major, a lift, a step away from home (the "A-men" chord at the end of hymns).',
        V: 'V: major and tense, it leans straight back to I.',
        vi: 'vi: minor, the sad relative of home; it shares two notes with I.',
        ii: 'ii: minor and soft, a step above home; it likes moving on to V.',
      }
      const ans = k
      return choose(item, 'Home (I), then which chord?', ans, ['IV', 'V', 'vi', 'ii'], feel[k], rnd, { audio: { chords: [chords.I, chords[k]] }, sub: 'Major or minor first; then: does it lean back home (V) or lift away (IV)?' })
    },
  },
  {
    id: 'l2-rhythm-ear', unit: 'Guitar theory', title: 'Hear it: which rhythm?', ear: true,
    desc: 'Four clicks count you in, then one bar of strums over a quiet click. Which count matches what you heard? (_ = a held or tied beat: no new strum.)', length: 8, mic: false,
    items: () => ['q', 'e', 'push', 'faith', 'dot', 'rest', 'syn', 'faith'].map((k, i) => `l2-rhythm-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const R: Record<string, [string, number[]]> = {
        q: ['1 2 3 4', [1, 1, 1, 1]],
        e: ['1 & 2 & 3 & 4 &', [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]],
        faith: ['1 2 & _ & 4 &', [1, 0.5, 1, 0.5, 0.5, 0.5]],
        dot: ['1 _ & 3 _ &', [1.5, 0.5, 1.5, 0.5]],
        push: ['1 2 3 & _', [1, 1, 0.5, 1.5]],
        rest: ['1 (2) 3 (4)', [1, -1, 1, -1]],
        syn: ['1 & _ & _ & 4', [0.5, 1, 1, 0.5, 1]],
      }
      const [ans, beats] = R[k]
      const why: Record<string, string> = {
        q: 'One strum on every beat: quarter notes.',
        e: 'Two even strums per beat: eighth notes, down-up all the way.',
        faith: 'The "old faithful" strum: the up on the & of 2 is tied over beat 3, so there\'s no strum on 3.',
        dot: 'Dotted quarters: each long note lasts a beat and a half, then a quick & before the next beat.',
        push: 'A push: the chord comes early, on the & of 3, and is held through 4.',
        rest: 'Strums on 1 and 3, silent beats on 2 and 4 (count them!).',
        syn: 'Syncopation: strums on the &s, held over the beats, until it lands on 4.',
      }
      return choose(item, 'Which count matches the strums?', ans, Object.values(R).map(r => r[0]), `${ans}: ${why[k]}`, rnd, { audio: { rhythm: { beats, bpm: 76 } }, sub: 'Count along out loud with the clicks.' })
    },
  },
  {
    id: 'l2-findkey', unit: 'Guitar theory', title: 'Name the key from the chords',
    desc: 'A song\'s chords: find the major key that holds them all (and where home is). The way you\'ll work out keys from any chord sheet.', length: 10, mic: false,
    items: () => ['G', 'C', 'D', 'A', 'E', 'F', 'G', 'D', 'Bb', 'A'].map((k, i) => `l2-findkey:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const ch = keyChords(k).map(c => c.chord)
      // always I, IV and V (they pin the key down), plus one or two of ii, iii, vi, in a song-like order
      const extra = shuffle([1, 2, 5], rnd).slice(0, 1 + Math.floor(rnd() * 2))
      const order = pick([[0, ...extra, 3, 4], [0, 3, ...extra, 4], [0, 4, ...extra, 3], [...extra, 3, 0, 4]], rnd)
      const chords = order.map(i => ch[i])
      const keyAt = (deg: number) => spellScale(k)[deg]
      const ans = `${k} major`
      const wrong = [`${keyAt(3)} major`, `${keyAt(4)} major`, `${keyAt(1)} major`, `${keyAt(5)} major`]
      return choose(item, `The chords are ${chords.join(', ')}. What key?`, ans, wrong,
        `${ans}: its chords are ${ch.join(' ')}. ${ch[0]}, ${ch[3]} and ${ch[4]} (I, IV and V) are its three major chords, and only ${k} major has all three.`, rnd)
    },
  },
  // ---------- Level 3 ear drills ----------
  {
    id: 'l3-prog-ear', unit: 'Guitar theory', title: 'Hear it: which progression?', ear: true,
    desc: 'Four chords in a key: which number pattern is it? The progressions that run through thousands of songs.', length: 10, mic: false,
    items: () => ['145', '1564', '1645', '6415', '251', '1564', '145', '1645', '6415', '1564'].map((k, i) => `l3-prog-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const root = 43 + Math.floor(rnd() * 7)
      const tri = (deg: number, minor: boolean) => { const b = root + [0, 2, 4, 5, 7, 9, 11][deg]; return [b, b + 7, b + 12, b + (minor ? 15 : 16)] }
      const C: Record<string, number[]> = { I: tri(0, false), ii: tri(1, true), IV: tri(3, false), V: tri(4, false), vi: tri(5, true) }
      const P: Record<string, [string, string[], string]> = {
        '145': ['I – IV – V – I', ['I', 'IV', 'V', 'I'], 'the folk, country and rock\'n\'roll backbone: away (IV), tension (V), home.'],
        '1564': ['I – V – vi – IV', ['I', 'V', 'vi', 'IV'], 'the pop progression: home, lean, the sad vi, then the lift of IV.'],
        '1645': ['I – vi – IV – V', ['I', 'vi', 'IV', 'V'], 'the 1950s doo-wop progression: the minor chord comes second.'],
        '6415': ['vi – IV – I – V', ['vi', 'IV', 'I', 'V'], 'the pop four starting on the minor chord, so it feels darker.'],
        '251': ['ii – V – I', ['ii', 'V', 'I'], 'jazz\'s favourite way home: minor ii, tense V, rest on I.'],
      }
      const [ans, seq, why] = P[k]
      return choose(item, 'Which progression?', ans, Object.values(P).map(p => p[0]), `${ans}: ${why}`, rnd, { audio: { chords: seq.map(n => C[n]) }, sub: 'Is the first chord major or minor? Where does the minor chord come?' })
    },
  },
  {
    id: 'l3-cadence-ear', unit: 'Guitar theory', title: 'Hear it: how does it end?', ear: true,
    desc: 'The last two chords of a phrase: a strong homecoming, a gentle "amen", left hanging, or a surprise? (Level 7 gives them their official names.)', length: 10, mic: false,
    items: () => ['VI', 'IVI', 'half', 'VI', 'dec', 'IVI', 'half', 'VI', 'dec', 'half'].map((k, i) => `l3-cadence-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const root = 43 + Math.floor(rnd() * 7)
      const tri = (deg: number, minor: boolean) => { const b = root + [0, 2, 4, 5, 7, 9, 11][deg]; return [b, b + 7, b + 12, b + (minor ? 15 : 16)] }
      const I = tri(0, false), IV = tri(3, false), V = tri(4, false), vi = tri(5, true), ii = tri(1, true)
      const E: Record<string, [string, number[][], string]> = {
        VI: ['Home: V → I', [I, IV, V, I], 'V to I: the strongest homecoming (the 7th of the scale rises to home).'],
        IVI: ['Amen: IV → I', [I, V, IV, I], 'IV to I: a softer, warmer way home, the "A-men" at the end of hymns.'],
        half: ['Left hanging: stops on V', [I, ii, IV, V], 'It stops on V: a question waiting for its answer.'],
        dec: ['Surprise: V → vi', [I, IV, V, vi], 'V goes to vi instead of I: you expected home and got its sad twin.'],
      }
      const [ans, seq, why] = E[k]
      return choose(item, 'How does the phrase end?', ans, Object.values(E).map(e => e[0]), `${ans}. ${why}`, rnd, { audio: { chords: seq }, sub: 'Listen to the last two chords: does it land, and where?' })
    },
  },
  {
    id: 'l3-scale-ear', unit: 'Guitar theory', title: 'Hear it: which scale?', ear: true,
    desc: 'A scale played up from its root: major, natural minor, minor pentatonic, major pentatonic or the blues scale?', length: 10, mic: false,
    items: () => ['mp', 'Mp', 'blues', 'nat', 'maj', 'mp', 'blues', 'Mp', 'nat', 'mp'].map((k, i) => `l3-scale-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const S: Record<string, [string, number[], string]> = {
        maj: ['Major scale', [0, 2, 4, 5, 7, 9, 11, 12], 'seven notes, bright: do re mi.'],
        nat: ['Natural minor', [0, 2, 3, 5, 7, 8, 10, 12], 'seven notes with ♭3, ♭6 and ♭7: sad, serious.'],
        mp: ['Minor pentatonic', [0, 3, 5, 7, 10, 12], 'five notes, 1 ♭3 4 5 ♭7: the rock and blues sound, with gaps.'],
        Mp: ['Major pentatonic', [0, 2, 4, 7, 9, 12], 'five notes, 1 2 3 5 6: sweet, open, country and folk.'],
        blues: ['Blues scale', [0, 3, 5, 6, 7, 10, 12], 'the minor pentatonic plus the ♭5 "blue note" squeezed between 4 and 5.'],
      }
      const [ans, ivs, why] = S[k]
      const root = 45 + Math.floor(rnd() * 8)
      return choose(item, 'Which scale?', ans, Object.values(S).map(x => x[0]), `${ans}: ${why}`, rnd, { audio: { seq: ivs.map(i => root + i) }, sub: 'Count the notes (five or seven?), then listen for the 3rd.' })
    },
  },
  {
    id: 'l3-mood-ear', unit: 'Guitar theory', title: 'Hear it: major key or minor key?', ear: true,
    desc: 'A short progression: is home a major chord or a minor one? The first thing to hear when you work out a song.', length: 10, mic: false,
    items: () => ['M1', 'm1', 'M2', 'm2', 'm3', 'M3', 'm1', 'M2', 'm3', 'M1'].map((k, i) => `l3-mood-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const root = 43 + Math.floor(rnd() * 7)
      const ch = (semi: number, minor: boolean) => { const b = root + semi; return [b, b + 7, b + 12, b + (minor ? 15 : 16)] }
      const P: Record<string, number[][]> = {
        M1: [ch(0, false), ch(9, true), ch(5, false), ch(7, false), ch(0, false)],
        M2: [ch(0, false), ch(5, false), ch(7, false), ch(0, false)],
        M3: [ch(0, false), ch(7, false), ch(9, true), ch(5, false), ch(0, false)],
        m1: [ch(0, true), ch(8, false), ch(10, false), ch(0, true)],
        m2: [ch(0, true), ch(5, true), ch(7, true), ch(0, true)],
        m3: [ch(0, true), ch(5, true), ch(7, false), ch(0, true)],
      }
      const minor = k.startsWith('m')
      const ans = minor ? 'Minor key' : 'Major key'
      const why = minor ? 'Home is a minor chord (i): the music rests on the darker sound.' : 'Home is a major chord (I): even with a minor chord on the way, it rests on the bright one.'
      return {
        item, prompt: 'Major key or minor key?', sub: 'Listen to the first and last chord: that\'s home.',
        audio: { chords: P[k] },
        input: { type: 'choices', options: ['Major key', 'Minor key'].map(o => ({ id: o, label: o })) },
        check: x => 'choice' in x && x.choice === ans, explain: `${ans}. ${why}`,
      }
    },
  },
  {
    id: 'l3-blues-ear', unit: 'Guitar theory', title: 'Hear it: where is the blues going?', ear: true,
    desc: 'A blues on the I7 chord, then a change: up to the IV7, up to the V7, or staying on I7?', length: 10, mic: false,
    items: () => ['IV', 'V', 'I', 'IV', 'V', 'IV', 'I', 'V', 'IV', 'V'].map((k, i) => `l3-blues-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const root = 40 + Math.floor(rnd() * 6)
      const d7 = (semi: number) => { const b = root + semi; return [b, b + 7, b + 10, b + 16] }
      const to: Record<string, number> = { I: 0, IV: 5, V: 7 }
      const ans = `${k}7`
      const why: Record<string, string> = { I: 'It stayed on I7: home, but restless (the ♭7 keeps it moving).', IV: 'IV7: a lift away from home, the change in bar 5 (and bar 2 in a quick change).', V: 'V7: the high point of the blues, bar 9, before falling back home.' }
      return choose(item, 'I7, then…?', ans, ['I7', 'IV7', 'V7'], `${ans}. ${why[k]}`, rnd, { audio: { chords: [d7(0), d7(0), d7(to[k])] }, sub: 'Does the bass go up a little (IV) or further (V)?' })
    },
  },
  {
    id: 'l3-feel-ear', unit: 'Guitar theory', title: 'Hear it: straight, swung or triplets?', ear: true,
    desc: 'A bar of strums over a click: straight eighths, swung (shuffle) eighths, triplets, or quarter notes?', length: 8, mic: false,
    items: () => ['swing', 'straight', 'trip', 'swing', 'q', 'trip', 'straight', 'swing'].map((k, i) => `l3-feel-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const t = 1 / 3
      const R: Record<string, [string, number[], string]> = {
        straight: ['Straight eighths', Array(8).fill(0.5), 'two even strums per beat: 1 & 2 &.'],
        swing: ['Swung eighths (shuffle)', [2 * t, t, 2 * t, t, 2 * t, t, 2 * t, t], 'long-short pairs: the & comes late, on the last third of the beat ("doo-ba doo-ba").'],
        trip: ['Triplets', Array(12).fill(t), 'three even strums per beat: "trip-uh-let".'],
        q: ['Quarter notes', [1, 1, 1, 1], 'one strum per beat.'],
      }
      const [ans, beats, why] = R[k]
      return choose(item, 'What\'s the feel?', ans, Object.values(R).map(r => r[0]), `${ans}: ${why}`, rnd, { audio: { rhythm: { beats, bpm: 84 } }, sub: 'Count "1 & 2 &" along: do the &s land halfway, or late?' })
    },
  },
  {
    id: 'l3-12bar', unit: 'Guitar theory', title: 'The 12-bar blues: which chord?',
    desc: 'A 12-bar blues in a key: which chord is in this bar? Standard form, or the quick change (IV in bar 2).', length: 10, mic: false,
    items: () => [['A', 5], ['E', 9], ['G', 2], ['A', 2, 'q'], ['E', 10], ['D', 12], ['A', 7], ['C', 4], ['E', 2, 'q'], ['G', 11]].map(([k, b, q], i) => `l3-12bar:${k}:${b}:${q ?? 's'}:${i}`),
    make: (item, _inst, rnd) => {
      const [, k, bs, form] = item.split(':')
      const bar = Number(bs)
      const quick = form === 'q'
      const form12 = ['I', quick ? 'IV' : 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V']
      const sc = spellScale(k)
      const name: Record<string, string> = { I: `${sc[0]}7`, IV: `${sc[3]}7`, V: `${sc[4]}7` }
      const deg = form12[bar - 1]
      const ans = `${name[deg]} (${deg}7)`
      const why = `${ans}. The 12 bars: I I I I · IV IV I I · V IV I V${quick ? ' (quick change: IV in bar 2)' : ''}; in ${k} that's ${name.I}, ${name.IV} and ${name.V}.`
      return choose(item, `A ${quick ? 'quick-change ' : ''}12-bar blues in ${k}: which chord is bar ${bar}?`, ans, ['I', 'IV', 'V'].map(d => `${name[d]} (${d}7)`), why, rnd)
    },
  },
]
/** [question, answer, wrong answers, why] */
const READ: [string, string, string[], string][] = [
  ['In tab, the TOP line is…', 'The high e string (the thinnest)', ['The low E string (the thickest)', 'The A string', 'The B string'], 'Tab is drawn as if you looked down at the guitar on your lap: the thinnest, highest string is on top.'],
  ['A 0 on a tab line means…', 'Play that string open', ['Don\'t play that string', 'Play fret 10', 'Mute that string'], 'Numbers are frets; 0 means no fret: let the open string ring.'],
  ['Numbers stacked straight on top of each other in tab mean…', 'Play them together (a chord)', ['Play them one after another', 'Slide between them', 'Pick either one'], 'Notes in the same column sound at the same time; notes further right come later.'],
  ['An x on a tab line means…', 'A muted, dead note (a scratch)', ['Play it open', 'A harmonic', 'Fret 10'], 'x is a percussive "chuck": the string is touched but not pressed down, so no pitch rings.'],
  ['"5h7" in tab means…', 'Pick fret 5, then hammer on to fret 7', ['Pick fret 5, then pull off to fret 7', 'Slide from 5 to 7', 'Play 5 and 7 together'], 'h = hammer-on: only the first note is picked; a fretting finger slams down for the second.'],
  ['"7p5" in tab means…', 'Pick fret 7, then pull off to fret 5', ['Pick 7, then hammer on to 5', 'Slide down from 7 to 5', 'Pick both notes'], 'p = pull-off: flick the finger off fret 7 so fret 5 (already held down) sounds.'],
  ['"5/7" in tab means…', 'Slide up from fret 5 to fret 7', ['Hammer on from 5 to 7', 'Bend fret 5 up to sound like 7', 'Play fret 5 or 7'], '/ is a slide up, \\ a slide down: keep the finger pressed and glide.'],
  ['"7b9" in tab means…', 'Pick fret 7 and bend it up until it sounds like fret 9', ['Slide from 7 to 9', 'Hammer on from 7 to 9', 'Play 7 then 9'], 'b = bend: push the string sideways until the pitch rises to the target (here a whole tone).'],
  ['In a chord box, the vertical lines are…', 'The strings, low E on the left', ['The frets', 'The strings, high e on the left', 'Your fingers'], 'A chord box is the neck standing upright facing you: strings run down, low E on the left; the thick line on top is the nut.'],
  ['In a chord box, an o above a string means…', 'Play that string open', ['Don\'t play that string', 'Use your first finger', 'Fret 1'], 'o = open string, x = don\'t play it.'],
  ['In a chord box, the numbers on (or under) the dots are…', 'Which finger to use', ['Which fret to press', 'Which string it is', 'The order to strum'], '1 = index, 2 = middle, 3 = ring, 4 = little finger (T = thumb).'],
  ['In KGuitar\'s neck pictures, the bottom line is…', 'The low E string, like looking down at your guitar', ['The high e string', 'The nut', 'Fret 12'], 'The neck lies on its side with the low E nearest you at the bottom, the same way round as tab.'],
]
