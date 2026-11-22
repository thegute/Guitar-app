// Quizzes for the theory essentials course (Learn → Course → Guitar theory), one per lesson, in the order of the
// owner's chosen theory book (No Bull Music Theory for Guitarists): the musical alphabet, tones and semitones, the
// major scale, triads (the existing "Spell the triad"), intervals, chromatic intervals, major keys, chord progressions,
// pentatonic scales, the natural minor scale and minor keys. Questions and wording are our own. Every note question
// can also be answered by playing the note (mic mode).
import { LETTERS, MAJOR_KEYS, MINOR_KEYS, NAT_MINOR_SEMIS, interval, keyChords, noteAt, pcOf, relativeMajor, relativeMinor, spellScale } from '../theory/spell'
import type { Question, QuizDef } from './quiz'
import { octaveShapes } from './lessonExtras'
import { stringName } from '../instrument'
import { cagedShapes } from './caged'
import { nearestTriad, topTriads } from '../course/pentTriadTabs'

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
  {
    id: 'l4-same-ear', unit: 'Guitar theory', title: 'Hear it: same chord, new shape?', ear: true,
    desc: 'Two chords, each in a CAGED shape: the same chord moved to another shape (higher or lower), or a different chord?', length: 10, mic: false,
    items: () => ['same', 'diff', 'same', 'diff', 'diff', 'same', 'same', 'diff', 'same', 'diff'].map((k, i) => `l4-same-ear:${k}:${i}`),
    make: (item, inst, rnd) => {
      const k = item.split(':')[1]
      const key = Math.floor(rnd() * 12)
      const notes = (pcv: number, minor: boolean, avoid?: string) => {
        const sh = cagedShapes(pcv, minor, inst).filter(x => x.hi <= 15 && x.letter !== avoid)
        const one = pick(sh, rnd)
        return { letter: one.letter, midis: one.frets.map((f, s) => (f < 0 ? -1 : inst.midis[s] + f)).filter(m => m >= 0) }
      }
      const a = notes(key, false)
      let b: { letter: string; midis: number[] }, why: string
      if (k === 'same') { b = notes(key, false, a.letter); why = `the same chord: ${a.letter} shape, then the ${b.letter} shape. The notes are the same three (root, 3rd, 5th), only higher or lower and in a different order, so the colour stays the same.` }
      else {
        const [semi, minor, num] = pick([[5, false, 'IV'], [7, false, 'V'], [9, true, 'vi'], [2, true, 'ii']] as const, rnd)
        b = notes((key + semi) % 12, minor)
        why = `a different chord: the ${num} chord of the first one's key. Something moved under the shape: a new root (and with vi or ii, a minor colour too).`
      }
      return choose(item, 'Same chord in a new shape, or a different chord?', k === 'same' ? 'Same chord, new shape' : 'A different chord', ['Same chord, new shape', 'A different chord'], `${k === 'same' ? 'Same chord, new shape' : 'A different chord'}: it was ${why}`, rnd,
        { audio: { chords: [a.midis, b.midis] }, sub: 'Ignore how high or low it is. Listen for the bass and the mood: did the chord change, or just move?' })
    },
  },
  {
    id: 'l4-top-ear', unit: 'Guitar theory', title: 'Hear it: which chord tone is on top?', ear: true,
    desc: 'A major chord in one of its CAGED shapes, then its highest note alone: is the top note the root, the 3rd or the 5th?', length: 10, mic: false,
    items: () => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((k, i) => `l4-top-ear:${k}:${i}`),
    make: (item, inst, rnd) => {
      const root = Math.floor(rnd() * 12)
      const sh = pick(cagedShapes(root, false, inst).filter(x => x.hi <= 15), rnd)
      const ms = sh.frets.map((f, s) => (f < 0 ? -1 : inst.midis[s] + f)).filter(m => m >= 0)
      const top = Math.max(...ms)
      const iv = (((top - root) % 12) + 12) % 12
      const ans = iv === 0 ? 'The root' : iv === 4 ? 'The 3rd' : 'The 5th'
      const tip = iv === 0 ? 'sing down to the bass: the same note name, it sounds finished.' : iv === 4 ? 'sweet, it says "major"; from it, down a major 3rd lands on home.' : 'open and strong, a bit hanging; from it, down three scale steps (5 4 3 2 1) lands on home.'
      return choose(item, 'Which chord tone is on top?', ans, ['The root', 'The 3rd', 'The 5th'], `${ans} (the ${sh.letter} shape): ${tip} Hearing the top note is how you choose a voicing that sings the melody.`, rnd,
        { audio: { chords: [ms, [top], [iv === 0 ? top - 12 : top - iv], ms] }, sub: 'You hear the chord, its top note, the root just under it, then the chord again. Sing the top note, then sing down to home.' })
    },
  },
  {
    id: 'l4-pent-deg-ear', unit: 'Guitar theory', title: 'Hear it: which pentatonic note?', ear: true,
    desc: 'A minor chord, then one note of its minor pentatonic: the root, ♭3, 4, 5 or ♭7? This is what lets you choose where a phrase lands.', length: 10, mic: false,
    items: () => ['1', 'b3', '4', '5', 'b7', 'b3', 'b7', '4', '5', '1'].map((k, i) => `l4-pent-deg-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const semis: Record<string, number> = { '1': 12, b3: 15, '4': 17, '5': 19, b7: 22 }
      const name: Record<string, string> = { '1': 'The root (1)', b3: 'The ♭3', '4': 'The 4', '5': 'The 5', b7: 'The ♭7' }
      const why: Record<string, string> = {
        '1': 'home: it sounds finished, nothing pulls.',
        b3: 'the sad, minor colour of the chord itself. A great note to end a phrase on.',
        '4': 'it leans: it wants to fall to the ♭3 or rise to the 5. The note players bend up to the 5.',
        '5': 'strong and open, part of the chord: stable, but less final than the root.',
        b7: 'bluesy and unfinished, it wants to rise to the root. Bend it up a whole step and you land home.',
      }
      const root = 45 + Math.floor(rnd() * 8)
      const ans = name[k]
      return choose(item, 'The chord, then which note of its minor pentatonic?', ans, Object.values(name).filter(n => n !== ans), `${ans}: ${why[k]}`, rnd,
        { audio: { chords: [[root, root + 7, root + 12, root + 15], [root + semis[k]]] }, sub: 'Hold the chord in your ear, then hear where the note sits against it. Sing down to the root to check.' })
    },
  },
  {
    id: 'l4-tri-top-ear', unit: 'Guitar theory', title: 'Hear it: the top note of a small triad', ear: true,
    desc: 'A three-note chord on the top strings: is its highest note the root, the 3rd or the 5th? That tells you which inversion it is.', length: 10, mic: false,
    items: () => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((k, i) => `l4-tri-top-ear:${k}:${i}`),
    make: (item, inst, rnd) => {
      const root = Math.floor(rnd() * 12), minor = rnd() < 0.35
      const t = pick(topTriads(inst.midis, root, minor), rnd)
      const ms = t.notes.map(n => n.midi)
      const ans = t.top === 'R' ? 'The root' : t.top === '3' ? 'The 3rd' : 'The 5th'
      const inv = t.low === 'R' ? 'root position' : t.low === '3' ? '1st inversion' : '2nd inversion'
      const rootUnder = ms[2] - ((((ms[2] - root) % 12) + 12) % 12 || 12)
      return choose(item, 'Which chord tone is on top?', ans, ['The root', 'The 3rd', 'The 5th'], `${ans}: this is the ${inv} (the lowest note is the ${t.low === 'R' ? 'root' : t.low === '3' ? '3rd' : '5th'}). Root on top sounds finished, the 3rd sweet and singing, the 5th open and floating.`, rnd,
        { audio: { chords: [ms, [ms[2]], [rootUnder], ms] }, sub: 'The triad, its top note alone, the root under it, then the triad again.' })
    },
  },
  {
    id: 'l4-lead-ear', unit: 'Guitar theory', title: 'Hear it: where did the top voice go?', ear: true,
    desc: 'Two triads on the top strings, a chord change: did the highest note go up, go down, or stay on the same note? Hearing the top voice is hearing voice leading.', length: 10, mic: false,
    items: () => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((k, i) => `l4-lead-ear:${k}:${i}`),
    make: (item, inst, rnd) => {
      const key = Math.floor(rnd() * 12)
      const a = pick(topTriads(inst.midis, key, false), rnd)
      const [semi, minor] = pick([[5, false], [7, false], [9, true], [2, true]] as const, rnd)
      const r = (key + semi) % 12
      const b = rnd() < 0.6 ? nearestTriad(inst.midis, a, r, minor) : pick(topTriads(inst.midis, r, minor), rnd)
      const d = b.notes[2].midi - a.notes[2].midi
      const ans = d > 0 ? 'Up' : d < 0 ? 'Down' : 'Stayed the same'
      return choose(item, 'The top note: up, down or the same?', ans, ['Up', 'Down', 'Stayed the same'], `${ans}${d ? ` by ${Math.abs(d)} fret${Math.abs(d) === 1 ? '' : 's'}` : ': a common tone, shared by both chords'}. Smooth changes move the top voice by a step or keep it still; that's what makes chords sound connected.`, rnd,
        { audio: { chords: [a.notes.map(n => n.midi), b.notes.map(n => n.midi), [a.notes[2].midi], [b.notes[2].midi]] }, sub: 'Two chords, then just their top notes. Sing the top line.' })
    },
  },
  {
    id: 'l5-7ths-ear', unit: 'Guitar theory', title: 'Hear it: which 7th chord?', ear: true,
    desc: 'All five kinds of 7th chord: major 7, dominant 7, minor 7, half-diminished (m7♭5) and diminished 7. Each has its own colour.', length: 10, mic: false,
    items: () => ['maj7', 'dom7', 'm7', 'm7b5', 'dim7', 'dom7', 'maj7', 'm7b5', 'm7', 'dim7'].map((k, i) => `l5-7ths-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const R: Record<string, [string, number[], string]> = {
        maj7: ['Major 7', [0, 4, 7, 11], 'dreamy and soft: the 7 is a half step under the root (jazz ballads, bossa, neo-soul).'],
        dom7: ['Dominant 7', [0, 4, 7, 10], 'bluesy and restless: it wants to resolve (the V7, and every blues chord).'],
        m7: ['Minor 7', [0, 3, 7, 10], 'smooth and mellow: minor without the sadness (funk, soul, the ii chord).'],
        m7b5: ['Half-diminished (m7♭5)', [0, 3, 6, 10], 'dark but not harsh: the ii of a minor key, leaning to the V.'],
        dim7: ['Diminished 7', [0, 3, 6, 9], 'tense and spooky, every note equally far apart: the passing chord and the silent-film villain.'],
      }
      const [ans, ivs, why] = R[k]
      const base = 48 + Math.floor(rnd() * 7)
      return choose(item, 'Which 7th chord?', ans, Object.values(R).map(r => r[0]), `${ans}: ${why}`, rnd, { audio: { chords: [ivs.map(i => base + i), ivs.map(i => base + 12 + i)] }, sub: 'The chord low, then higher. Listen for the colour, not the notes.' })
    },
  },
  {
    id: 'l5-spell7', unit: 'Guitar theory', title: 'Spell the 7th chord', mic: false,
    desc: 'Stack thirds: root, 3rd, 5th, 7th. Name the four notes of a 7th chord, spelled right (every other letter).', length: 10,
    items: () => ['C:maj7', 'G:dom7', 'D:m7', 'F:maj7', 'A:m7', 'E:dom7', 'B:m7b5', 'Bb:maj7', 'Eb:dom7', 'F#:m7b5', 'C:dim7', 'G:m7', 'D:dom7', 'A:maj7', 'Ab:maj7'].map((k, i) => `l5-spell7:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, root, q] = item.split(':')
      const Q7: Record<string, [string, number[]]> = { maj7: ['maj7', [0, 4, 7, 11]], dom7: ['7', [0, 4, 7, 10]], m7: ['m7', [0, 3, 7, 10]], m7b5: ['m7♭5', [0, 3, 6, 10]], dim7: ['dim7', [0, 3, 6, 9]] }
      const [suf, semis] = Q7[q]
      const spell = (ss: number[]) => ss.map((x, i) => noteAt(root, i * 2, x)).join(' ')
      const ans = spell(semis)
      const wrong = Object.values(Q7).filter(([, ss]) => ss.join() !== semis.join()).map(([, ss]) => spell(ss))
      return choose(item, `Spell ${root}${suf}.`, ans, wrong, `${ans}: root, 3rd, 5th and 7th, every other letter (${noteAt(root, 0, 0)} ${noteAt(root, 2, 0).replace(/[#b]/g, '')} ${noteAt(root, 4, 0).replace(/[#b]/g, '')} ${noteAt(root, 6, 0).replace(/[#b]/g, '')}), then the sharps and flats that give a ${suf} its intervals.`, rnd)
    },
  },
  {
    id: 'l5-spell-colour', unit: 'Guitar theory', title: 'Spell the colour chord', mic: false,
    desc: 'Sus chords replace the 3rd (sus2 = 1 2 5, sus4 = 1 4 5); add9 and 6 keep it and add a note; a power chord is just 1 5. Name the notes.', length: 10,
    items: () => ['D:sus4', 'A:sus2', 'C:add9', 'G:six', 'A:m6', 'E:five', 'G:sus4', 'E:sus2', 'F:add9', 'D:six', 'D:m6', 'Bb:five', 'C:sus2', 'A:add9', 'F:six'].map((k, i) => `l5-spell-colour:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, root, q] = item.split(':')
      const QC: Record<string, [string, [number, number][], string]> = {
        sus2: ['sus2', [[0, 0], [1, 2], [4, 7]], 'the 3rd replaced by the 2'],
        sus4: ['sus4', [[0, 0], [3, 5], [4, 7]], 'the 3rd replaced by the 4'],
        add9: ['add9', [[0, 0], [2, 4], [4, 7], [1, 2]], 'the major triad plus the 9 (no 7th)'],
        six: ['6', [[0, 0], [2, 4], [4, 7], [5, 9]], 'the major triad plus the 6'],
        m6: ['m6', [[0, 0], [2, 3], [4, 7], [5, 9]], 'the minor triad plus the major 6'],
        five: ['5', [[0, 0], [4, 7]], 'root and 5th, no 3rd'],
      }
      const spell = (iv: [number, number][]) => iv.map(([l, x]) => noteAt(root, l, x)).join(' ')
      const [suf, iv, how] = QC[q]
      const ans = spell(iv)
      const wrong = uniq(Object.entries(QC).filter(([k]) => k !== q).map(([, [, v]]) => spell(v)).filter(w => w !== ans))
      return choose(item, `Spell ${root}${suf}.`, ans, wrong, `${ans}: ${how}.`, rnd)
    },
  },
  {
    id: 'l5-spell-ext', unit: 'Guitar theory', title: 'Spell the extended chord', mic: false,
    desc: 'Keep stacking 3rds past the 7th: 9 = the 2, 11 = the 4, 13 = the 6, an octave up. The 7th is always in it. Name the notes, in stacking order.', length: 10,
    items: () => ['G:dom9', 'C:maj9', 'D:m9', 'A:m11', 'C:dom13', 'F:maj9', 'E:dom9', 'G:m9', 'D:m11', 'G:dom13', 'Bb:maj9', 'A:dom9', 'E:m11', 'F:dom13', 'C:m9'].map((k, i) => `l5-spell-ext:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, root, q] = item.split(':')
      const QE: Record<string, [string, [number, number][], string]> = {
        dom9: ['9', [[0, 0], [2, 4], [4, 7], [6, 10], [1, 2]], 'the dominant 7th plus the 9'],
        maj9: ['maj9', [[0, 0], [2, 4], [4, 7], [6, 11], [1, 2]], 'the maj7 plus the 9'],
        m9: ['m9', [[0, 0], [2, 3], [4, 7], [6, 10], [1, 2]], 'the m7 plus the 9'],
        m11: ['m11', [[0, 0], [2, 3], [4, 7], [6, 10], [1, 2], [3, 5]], 'the m7 plus the 9 and 11'],
        dom13: ['13', [[0, 0], [2, 4], [4, 7], [6, 10], [1, 2], [5, 9]], 'the dominant 7th plus the 9 and 13 (the 11 left out)'],
      }
      const spell = (iv: [number, number][]) => iv.map(([l, x]) => noteAt(root, l, x)).join(' ')
      const [suf, iv, how] = QE[q]
      const ans = spell(iv)
      // near misses: the add9 / 6 versions (no 7th) and the other qualities
      const near = q === 'dom9' || q === 'maj9' ? [spell([[0, 0], [2, 4], [4, 7], [1, 2]])] : q === 'dom13' ? [spell([[0, 0], [2, 4], [4, 7], [5, 9]])] : []
      const wrong = uniq([...near, ...Object.entries(QE).filter(([k]) => k !== q).map(([, [, v]]) => spell(v))].filter(w => w !== ans))
      return choose(item, `Spell ${root}${suf}.`, ans, wrong, `${ans}: ${how}.${q === 'dom9' || q === 'maj9' ? ' Without the 7th it would be an add9.' : q === 'dom13' ? ' Without the ♭7 it would be a 6 chord.' : ''}`, rnd)
    },
  },
  {
    id: 'l5-spell-alt', unit: 'Guitar theory', title: 'Spell the altered dominant', mic: false,
    desc: 'A dominant 7th with its 5th or 9th bent a half step: 7♭9, 7♯9, 7♯5 and 7♭5. Name the notes, spelled right.', length: 10,
    items: () => ['G:b9', 'C:s9', 'G:s5', 'G:b5', 'A:b9', 'D:s9', 'C:s5', 'C:b5', 'E:b9', 'A:s9', 'D:s5', 'D:b5', 'D:b9', 'G:s9', 'A:s5'].map((k, i) => `l5-spell-alt:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, root, q] = item.split(':')
      const D7: [number, number][] = [[0, 0], [2, 4], [4, 7], [6, 10]]
      const QA: Record<string, [string, [number, number][], string]> = {
        b9: ['7♭9', [...D7, [1, 1]], 'the 9 lowered a half step'],
        s9: ['7♯9', [...D7, [1, 3]], 'the 9 raised a half step (it sounds like a minor 3rd)'],
        s5: ['7♯5', [[0, 0], [2, 4], [4, 8], [6, 10]], 'the 5th raised a half step'],
        b5: ['7♭5', [[0, 0], [2, 4], [4, 6], [6, 10]], 'the 5th lowered a half step'],
      }
      const spell = (iv: [number, number][]) => iv.map(([l, x]) => noteAt(root, l, x)).join(' ')
      const [suf, iv, how] = QA[q]
      const ans = spell(iv)
      const wrong = uniq([spell([...D7, [1, 2]]), ...Object.entries(QA).filter(([k]) => k !== q).map(([, [, v]]) => spell(v))].filter(w => w !== ans))
      return choose(item, `Spell ${root}${suf}.`, ans, wrong, `${ans}: ${root}7 with ${how}.`, rnd)
    },
  },
  {
    id: 'l6-tone', unit: 'Guitar theory', title: 'Which chord tone is it?', mic: false,
    desc: 'A note over a 7th chord: is it the root, 3rd, 5th or 7th, or not a chord tone at all (a 9th, 11th or 13th)? The first question of soloing on the changes.', length: 12,
    items: () => ['D:m7:3', 'G:7:10', 'C:maj7:4', 'A:m7:7', 'F:maj7:11', 'G:7:4', 'D:m7:2', 'E:m7:10', 'B:m7b5:6', 'C:maj7:9', 'A:7:4', 'F:maj7:7', 'G:7:5', 'D:m7:10', 'C:maj7:11'].map((k, i) => `l6-tone:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, root, q, ivS] = item.split(':')
      const iv = Number(ivS)
      const QT: Record<string, { name: string; tones: Record<number, string> }> = {
        maj7: { name: 'maj7', tones: { 0: 'Root', 4: '3rd', 7: '5th', 11: '7th' } },
        '7': { name: '7', tones: { 0: 'Root', 4: '3rd', 7: '5th', 10: '7th' } },
        m7: { name: 'm7', tones: { 0: 'Root', 3: '3rd', 7: '5th', 10: '7th' } },
        m7b5: { name: 'm7♭5', tones: { 0: 'Root', 3: '3rd', 6: '5th', 10: '7th' } },
      }
      const LET: Record<number, number> = { 0: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 9: 5, 10: 6, 11: 6 }
      const EXT: Record<number, string> = { 2: 'the 9th', 5: 'the 11th', 9: 'the 13th' }
      const note = noteAt(root, LET[iv], iv)
      const t = QT[q]
      const ans = t.tones[iv] ?? 'Not a chord tone'
      const why = t.tones[iv] ? `${note} is the ${t.tones[iv].toLowerCase()} of ${root}${t.name}: ${t.tones[iv] === '3rd' || t.tones[iv] === '7th' ? 'a guide tone, the strongest note to land on when the chord arrives.' : t.tones[iv] === 'Root' ? 'safe and solid.' : 'a safe chord tone, a little plain.'}` : `Not a chord tone: ${note} is ${EXT[iv]} of ${root}${t.name}, a colour note, lovely in passing, but it isn't one of the four chord tones.`
      return choose(item, `Over ${root}${t.name}, the note ${note} is the chord's…`, ans, ['Root', '3rd', '5th', '7th', 'Not a chord tone'], why, rnd)
    },
  },
  {
    id: 'l6-tone-ear', unit: 'Guitar theory', title: 'Hear it: which chord tone?', ear: true,
    desc: 'A chord, then one note over it. Root (home), 3rd (sweet, it names the chord), 5th (open, plain) or 7th (leaning)? Sing up from the root if you need to.', length: 10, mic: false,
    items: () => ['4', '0', '7', '11', '4', '10', '7', '0', '11', '3'].map((k, i) => `l6-tone-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const iv = Number(item.split(':')[1])
      const minor = iv === 3 || (iv === 10 && rnd() < 0.5)
      const chordIv = minor ? [0, 3, 7, 10] : iv === 10 ? [0, 4, 7, 10] : [0, 4, 7, 11]
      const base = 48 + Math.floor(rnd() * 7)
      const chord = chordIv.map(i => base + i)
      const NAME: Record<number, string> = { 0: 'Root', 3: '3rd', 4: '3rd', 7: '5th', 10: '7th', 11: '7th' }
      const note = base + 12 + iv
      const feel: Record<string, string> = { Root: 'home: nothing pulls', '3rd': 'sweet, and it says major or minor', '5th': 'open and plain, like the chord with no colour', '7th': 'leaning, a half or whole step from the root above' }
      const ans = NAME[iv]
      return choose(item, 'Which chord tone is the note?', ans, ['Root', '3rd', '5th', '7th'], `${ans}: ${feel[ans]}.`, rnd, { audio: { chords: [chord, [note], [...chord, note]] }, sub: 'The chord, the note, then both together.' })
    },
  },
  {
    id: 'l6-approach', unit: 'Guitar theory', title: 'Approach the target', mic: false,
    desc: 'Land on a chord tone from a half step away: from below (always works), from above (from the scale or chromatic), or enclose it (above, then below, then the target).', length: 10,
    items: () => ['E:below', 'B:below', 'F:above', 'C:below', 'G#:below', 'D:above', 'A:enclose', 'E:enclose', 'B:enclose', 'F#:below'].map((k, i) => `l6-approach:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, target, how] = item.split(':')
      // a half step below is spelled with sharps (it rises into the target: D♯→E, B→C, G→G♯), above with flats (F→E, G♭→F)
      const SH = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], FL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
      const tp = pcOf(target)
      const under = SH[(tp + 11) % 12], over = FL[(tp + 1) % 12]
      const LET = 'CDEFGAB', li = LET.indexOf(target[0])
      if (how === 'below') return choose(item, `Approach ${target} from a half step below. Which note comes just before it?`, under, uniq([over, SH[(tp + 10) % 12], FL[(tp + 2) % 12], LET[(li + 6) % 7]]).filter(x => x !== under && x !== target), `${under} → ${target}: a half step up into the target, the strongest approach there is (it works even when ${under} isn't in the key, because it resolves at once).`, rnd)
      if (how === 'above') return choose(item, `Approach ${target} from a half step above. Which note comes just before it?`, over, uniq([under, FL[(tp + 2) % 12], SH[(tp + 10) % 12], LET[(li + 1) % 7]]).filter(x => x !== over && x !== target), `${over} → ${target}: a half step down into the target.`, rnd)
      const ans = `${over} ${under} ${target}`
      return choose(item, `Enclose ${target}: which three notes, in order?`, ans, uniq([`${target} ${over} ${under}`, `${FL[(tp + 2) % 12]} ${SH[(tp + 10) % 12]} ${target}`, `${over} ${target} ${under}`]).filter(x => x !== ans), `${ans}: a half step above, a half step below, then land. The ear hears the target coming from both sides.`, rnd)
    },
  },
  {
    id: 'l6-pent-ear', unit: 'Guitar theory', title: 'Hear it: major, minor or mixed pentatonic?', ear: true,
    desc: 'A dominant 7th chord, then a pentatonic line over it. Major pentatonic (sweet, country), minor pentatonic (bluesy, rock) or the two mixed (the ♭3 slipping up to the 3)?', length: 9, mic: false,
    items: () => ['maj', 'min', 'mix', 'min', 'maj', 'mix', 'maj', 'min', 'mix'].map((k, i) => `l6-pent-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const r = 45 + Math.floor(rnd() * 5)
      const chord = [r, r + 7, r + 10, r + 16]
      const LINES: Record<string, number[]> = { maj: [0, 2, 4, 7, 9, 7, 4, 2, 0], min: [0, 3, 5, 7, 10, 7, 5, 3, 0], mix: [3, 4, 7, 10, 9, 7, 3, 4, 0] }
      const ans = k === 'maj' ? 'Major pentatonic' : k === 'min' ? 'Minor pentatonic' : 'Mixed'
      const why: Record<string, string> = { maj: 'the major 3rd and 6th: sweet and bright, it sits on the chord.', min: 'the ♭3 and ♭7: bluesy, it rubs against the chord\'s major 3rd.', mix: 'the ♭3 slides up into the 3 (and the 6 and ♭7 both appear): the blues mixture.' }
      return choose(item, 'Which pentatonic is the line?', ans, ['Major pentatonic', 'Minor pentatonic', 'Mixed'], `${ans}: ${why[k]}`, rnd, { audio: { chords: [chord], seq: LINES[k].map(i => r + 12 + i) }, sub: 'The line, then the chord it was over.' })
    },
  },
  {
    id: 'l6-phrase-ear', unit: 'Guitar theory', title: 'Hear it: same, varied or new?', ear: true,
    desc: 'Two short phrases. Is the second the same as the first, the same idea varied (same rhythm and start, new ending), or a new idea? Hearing this is the start of phrasing.', length: 9, mic: false,
    items: () => ['same', 'vary', 'new', 'vary', 'new', 'same', 'vary', 'new', 'vary'].map((k, i) => `l6-phrase-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const pent = [0, 3, 5, 7, 10, 12, 15]
      const r = 57 + Math.floor(rnd() * 5)
      const idx = [0, 1, 2, 3].map(() => Math.floor(rnd() * 5))
      const motif = idx.map(i => r + pent[i])
      const vary = [...motif.slice(0, 3), r + pent[(idx[3] + 2) % 7]]
      const other = [3, 2, 1, 0].map(i => r + pent[(idx[i] + 3) % 7])
      const second = k === 'same' ? motif : k === 'vary' ? vary : other
      const ans = k === 'same' ? 'The same' : k === 'vary' ? 'Varied' : 'A new idea'
      const why: Record<string, string> = { same: 'note for note the same: repetition makes an idea stick.', vary: 'the same start, a new ending: the strongest way to develop a phrase.', new: 'different notes and shape: contrast (use it after you\'ve repeated an idea).' }
      return choose(item, 'The second phrase is…', ans, ['The same', 'Varied', 'A new idea'], `${ans}: ${why[k]}`, rnd, { audio: { seq: [...motif, ...second] }, sub: 'Four notes, then four more.' })
    },
  },
  {
    id: 'l6-melody-ear', unit: 'Guitar theory', title: 'Hear it: which degrees?', ear: true,
    desc: 'The key\'s chord, then three notes. Name them as degrees of the key (1 is home). Once you can, you can play anything you can sing.', length: 10, mic: false,
    items: () => ['1 2 3', '3 2 1', '1 3 5', '5 4 3', '5 6 5', '3 4 5', '1 7 1', '5 3 1', '2 3 1', '6 5 3'].map((k, i) => `l6-melody-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const D: Record<string, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: -1 }
      const r = 60 + Math.floor(rnd() * 5) - 2
      const seq = k.split(' ').map(d => r + D[d])
      const all = ['1 2 3', '3 2 1', '1 3 5', '5 4 3', '5 6 5', '3 4 5', '1 7 1', '5 3 1', '2 3 1', '6 5 3']
      return choose(item, 'Which degrees were the three notes?', k, all.filter(x => x !== k), `${k}: hear each note against home (1). ${k.includes('7') ? 'The 7 sits just under home and pulls up to it.' : k.startsWith('5') ? 'Starting on 5 sounds open, like a question.' : 'Starting on 1 sounds settled.'}`, rnd, { audio: { chords: [[r - 12, r - 5, r, r + 4]], seq } , sub: 'The three notes, then the key\'s chord (home).' })
    },
  },
  {
    id: 'l7-cadence', unit: 'Guitar theory', title: 'Name the cadence', mic: false,
    desc: 'How a phrase ends: authentic (V → I, finished), plagal (IV → I, the "amen"), half (ends on V, a question) or deceptive (V → vi, a surprise).', length: 10,
    items: () => ['C:V-I', 'G:IV-I', 'D:ii-V', 'C:V-vi', 'F:V-I', 'A:IV-I', 'G:I-V', 'D:V-vi', 'E:V7-I', 'C:IV-V'].map((k, i) => `l7-cadence:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, key, prog] = item.split(':')
      const names = spellScale(key, [0, 2, 4, 5, 7, 9, 11])
      const RN: Record<string, [number, string]> = { I: [0, ''], ii: [1, 'm'], IV: [3, ''], V: [4, ''], V7: [4, '7'], vi: [5, 'm'] }
      const [a, b] = prog.split('-')
      const ch = (r: string) => names[RN[r][0]] + RN[r][1]
      const kind = b === 'I' ? (a.startsWith('V') ? 'Authentic' : 'Plagal') : b === 'V' ? 'Half' : 'Deceptive'
      const why: Record<string, string> = { Authentic: 'V to I: the strongest, most final ending.', Plagal: 'IV to I: a softer ending, the "amen" of hymns and a favourite of rock and gospel.', Half: 'it stops on V: the music asks a question and has to go on.', Deceptive: 'V goes to vi instead of I: the ear expects home and gets a surprise.' }
      return choose(item, `Key of ${key}: a phrase ends ${ch(a)} → ${ch(b)}. Which cadence?`, kind, ['Authentic', 'Plagal', 'Half', 'Deceptive'], `${kind}: ${why[kind]}`, rnd)
    },
  },
  {
    id: 'l7-secdom', unit: 'Guitar theory', title: 'Find the secondary dominant', mic: false,
    desc: 'Any chord of the key can have its own V7: the dominant 7th a 5th above it (V7/ii, V7/vi …). Which chord leads into the target?', length: 10,
    items: () => ['C:ii', 'C:vi', 'C:V', 'C:IV', 'G:ii', 'G:vi', 'G:V', 'D:ii', 'F:vi', 'C:iii'].map((k, i) => `l7-secdom:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, key, target] = item.split(':')
      const D: Record<string, [number, string]> = { ii: [1, 'm'], iii: [2, 'm'], IV: [3, ''], V: [4, ''], vi: [5, 'm'] }
      const names = spellScale(key, [0, 2, 4, 5, 7, 9, 11])
      const [d, q] = D[target]
      const tgt = names[d]
      const dom = noteAt(tgt, 4, 7)
      const ans = `${dom}7`
      const wrong = uniq([`${noteAt(tgt, 3, 5)}7`, `${noteAt(tgt, 4, 7)}m7`, `${names[(d + 4) % 7]}7`, `${noteAt(tgt, 1, 2)}7`]).filter(w => w !== ans)
      return choose(item, `Key of ${key}: which chord is V7/${target} (it leads into ${tgt}${q})?`, ans, wrong, `${ans}: ${dom} is a 5th above ${tgt}, and as a dominant 7th it has ${noteAt(tgt, 6, 11)}, the half step under ${tgt}, which pulls into it.`, rnd)
    },
  },
  {
    id: 'l7-borrowed', unit: 'Guitar theory', title: 'Borrowed or not?', mic: false,
    desc: 'Chords borrowed from the parallel minor (iv, ♭VI, ♭VII, ♭III) colour a major key. Which chord here is borrowed?', length: 10,
    items: () => ['C', 'G', 'D', 'F', 'A', 'C', 'G', 'E', 'D', 'C'].map((k, i) => `l7-borrowed:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const key = item.split(':')[1]
      const names = spellScale(key, [0, 2, 4, 5, 7, 9, 11])
      const BOR: [string, string][] = [[`${noteAt(key, 3, 5)}m`, 'iv'], [noteAt(key, 5, 8), '♭VI'], [noteAt(key, 6, 10), '♭VII'], [noteAt(key, 2, 3), '♭III']]
      const [ans, rn] = pick(BOR, rnd)
      const dia = [names[0], `${names[1]}m`, `${names[2]}m`, names[3], names[4], `${names[5]}m`]
      return choose(item, `Key of ${key} major: which of these chords is borrowed from ${key} minor?`, ans, shuffle(dia, rnd).slice(0, 3), `${ans} is ${rn}: it comes from ${key} minor. The other three are chords of ${key} major.`, rnd)
    },
  },
  {
    id: 'l7-tritone', unit: 'Guitar theory', title: 'The tritone sub', mic: false,
    desc: 'A dominant 7th can be swapped for the dominant 7th a tritone (6 frets) away: they share the same 3rd and 7th. G7 ↔ D♭7.', length: 10,
    items: () => ['G', 'D', 'A', 'E', 'C', 'F', 'B', 'Bb', 'Eb', 'Ab'].map((k, i) => `l7-tritone:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const root = item.split(':')[1]
      const SUB: Record<string, string> = { G: 'D♭', D: 'A♭', A: 'E♭', E: 'B♭', C: 'G♭', F: 'B', B: 'F', Bb: 'E', Eb: 'A', Ab: 'D' }
      const show = (n: string) => n.replace('b', '♭')
      const ans = `${SUB[root]}7`
      const wrong = uniq([`${show(noteAt(root, 3, 5))}7`, `${show(noteAt(root, 1, 1))}7`, `${show(noteAt(root, 4, 7))}7`, `${SUB[root]}m7`]).filter(w => w !== ans)
      const third = noteAt(root, 2, 4), seventh = noteAt(root, 6, 10)
      return choose(item, `What is the tritone sub for ${show(root)}7?`, ans, wrong, `${ans}: six frets from ${show(root)}. Both chords contain ${show(third)} and ${show(seventh)} (one chord's 3rd is the other's 7th), so either one pulls to the same place.`, rnd)
    },
  },
  {
    id: 'l7-colour-ear', unit: 'Guitar theory', title: 'Hear it: which chord was changed?', ear: true,
    desc: 'C, then a chord, then where it goes. Plain (a chord of the key), a secondary dominant (major where you expect minor, with a pull), or borrowed from minor (darker, a flattened note)?', length: 9, mic: false,
    items: () => ['plain', 'sec', 'bor', 'sec', 'bor', 'plain', 'bor', 'sec', 'plain'].map((k, i) => `l7-colour-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const r = 48 + Math.floor(rnd() * 5)
      const I = [r, r + 4, r + 7, r + 12]
      // plain: C – Am – Dm; secondary: C – A7 – Dm; borrowed: C – Fm – C (or C – A♭ – C)
      const prog: Record<string, number[][]> = {
        plain: [I, [r - 3, r + 4, r + 9, r + 12], [r + 2, r + 5, r + 9, r + 14]],
        sec: [I, [r - 3, r + 4, r + 7, r + 13], [r + 2, r + 5, r + 9, r + 14]],
        bor: rnd() < 0.5 ? [I, [r + 5, r + 8, r + 12, r + 17], I] : [I, [r - 4, r + 3, r + 8, r + 12], I],
      }
      const ans = k === 'plain' ? 'Plain (from the key)' : k === 'sec' ? 'Secondary dominant' : 'Borrowed from minor'
      const why: Record<string, string> = { plain: 'every chord came from the key: nothing surprising.', sec: 'the middle chord was major with a 7th where the key has a minor chord: it pulled hard into the next one.', bor: 'the middle chord had a flattened note (a ♭3 or ♭6 of the key): a darker, bittersweet colour.' }
      return choose(item, 'Three chords. What was the middle one?', ans, ['Plain (from the key)', 'Secondary dominant', 'Borrowed from minor'], `${ans}: ${why[k]}`, rnd, { audio: { chords: prog[k] }, sub: 'Home, the middle chord, where it went.' })
    },
  },
  {
    id: 'l8-parent', unit: 'Guitar theory', title: 'Which major scale is the mode from?', mic: false,
    desc: 'A mode uses the notes of a major scale, starting on a different note: Dorian from its 2nd, Phrygian 3rd, Lydian 4th, Mixolydian 5th, Aeolian 6th, Locrian 7th. Which major scale holds this mode\'s notes?', length: 10,
    items: () => ['D:dorian', 'E:phrygian', 'F:lydian', 'G:mixolydian', 'A:dorian', 'B:phrygian', 'A:mixolydian', 'Bb:lydian', 'E:dorian', 'C:mixolydian', 'F#:phrygian', 'D:lydian'].map((k, i) => `l8-parent:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, root, mode] = item.split(':')
      const DEG: Record<string, [number, number, string]> = { dorian: [1, 2, '2nd'], phrygian: [2, 4, '3rd'], lydian: [3, 5, '4th'], mixolydian: [4, 7, '5th'], aeolian: [5, 9, '6th'], locrian: [6, 11, '7th'] }
      const [steps, semis, ord] = DEG[mode]
      const parent = noteAt(root, 7 - steps, 12 - semis)
      const name = mode[0].toUpperCase() + mode.slice(1)
      const wrong = uniq([root, noteAt(parent, 4, 7), noteAt(parent, 3, 5), noteAt(root, 4, 7), noteAt(root, 3, 5)])
      return choose(item, `${root} ${name} uses the notes of which major scale?`, parent, wrong.map(w => w), `${parent}: ${name} starts on the ${ord} note of its major scale, and ${root} is the ${ord} note of ${parent} major (${spellScale(parent).join(' ')}).`, rnd)
    },
  },
  {
    id: 'l8-colour', unit: 'Guitar theory', title: 'The colour note of a mode', mic: false,
    desc: 'Every mode has one note that sets it apart from plain major or minor: Lydian ♯4, Mixolydian ♭7, Dorian ♮6, Aeolian ♭6, Phrygian ♭2, Locrian ♭5. Which note is it here?', length: 10,
    items: () => ['A:dorian', 'G:mixolydian', 'F:lydian', 'E:phrygian', 'D:dorian', 'C:lydian', 'D:mixolydian', 'B:phrygian', 'E:aeolian', 'B:locrian'].map((k, i) => `l8-colour:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [, root, mode] = item.split(':')
      const M: Record<string, [number[], number, string]> = {
        dorian: [[0, 2, 3, 5, 7, 9, 10], 5, 'the ♮6: natural minor has a ♭6, Dorian raises it, so minor sounds hopeful and funky'],
        mixolydian: [[0, 2, 4, 5, 7, 9, 10], 6, 'the ♭7: major with a flat 7th, the bluesy rock sound'],
        lydian: [[0, 2, 4, 6, 7, 9, 11], 3, 'the ♯4: major with a raised 4th, dreamy and floating'],
        phrygian: [[0, 1, 3, 5, 7, 8, 10], 1, 'the ♭2: a half step above the root, dark and Spanish-sounding'],
        aeolian: [[0, 2, 3, 5, 7, 8, 10], 5, 'the ♭6: the sad note of natural minor (Dorian has a ♮6 there)'],
        locrian: [[0, 1, 3, 5, 6, 8, 10], 4, 'the ♭5: the root chord itself is diminished, so it never feels at rest'],
      }
      const [ivs, idx, why] = M[mode]
      const notes = spellScale(root, ivs)
      const ans = notes[idx]
      const name = mode[0].toUpperCase() + mode.slice(1)
      return choose(item, `Which note gives ${root} ${name} its colour?`, ans, notes.filter((_, i) => i !== idx && i !== 0), `${ans}: ${why}. ${root} ${name}: ${notes.join(' ')}.`, rnd)
    },
  },
  {
    id: 'l8-vamp', unit: 'Guitar theory', title: 'Which mode is the vamp?', mic: false,
    desc: 'A modal song sits on two or three chords going back and forth. The first chord is home; the other chord gives away the mode (Am7 – D: the F♯ in D makes A Dorian).', length: 10,
    items: () => ['Am7 – D|A Dorian', 'G – F|G Mixolydian', 'F – G/F|F Lydian', 'Em – F|E Phrygian', 'Am – F – G|A Aeolian', 'Dm7 – G|D Dorian', 'D – C|D Mixolydian', 'C – D/C|C Lydian', 'Bm – C|B Phrygian', 'E – D|E Mixolydian'].map((k, i) => `l8-vamp:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [vamp, ans] = item.split(':')[1].split('|')
      const root = ans.split(' ')[0]
      const wrong = ['Dorian', 'Mixolydian', 'Lydian', 'Phrygian', 'Aeolian', 'Ionian (major)'].map(m => `${root} ${m}`)
      const why: Record<string, string> = { Dorian: 'a minor home chord with a MAJOR IV (the ♮6 is its 3rd)', Mixolydian: 'a major home chord with a major chord a whole step DOWN (♭VII: its root is the ♭7)', Lydian: 'a major home chord with a major chord a whole step UP (II: its 3rd is the ♯4)', Phrygian: 'a minor home chord with a major chord a half step UP (♭II: its root is the ♭2)', Aeolian: 'a minor home chord with ♭VI and ♭VII (the ♭6 is in the ♭VI)' }
      const m = ans.split(' ')[1]
      return choose(item, `A song vamps ${vamp} (the first chord is home). Which mode?`, ans, wrong, `${ans}: ${why[m]}.`, rnd)
    },
  },
  {
    id: 'l8-chordscale', unit: 'Guitar theory', title: 'What to play over the chord', mic: false,
    desc: 'The chord tells you the scale: m7 → Dorian, 7 → Mixolydian, maj7♯11 → Lydian, 7♯11 → Lydian dominant, 7alt → altered, 7♭9 to minor → Phrygian dominant, 7♯5 → whole-tone, dim7 → whole-half, m7♭5 → Locrian, m(maj7) → melodic minor.', length: 10,
    items: () => ['Dm7 (ii in C)|D Dorian', 'G7 (going to C)|G Mixolydian', 'G7alt (going to C)|G altered', 'D7♯11|D Lydian dominant', 'Fmaj7♯11|F Lydian', 'E7♭9 (going to Am)|E Phrygian dominant', 'G7♯5|G whole-tone', 'Bdim7|B whole-half diminished', 'Am(maj7)|A melodic minor', 'Bm7♭5 (vii in C)|B Locrian', 'G7♭9 (13 on top)|G half-whole diminished'].map((k, i) => `l8-chordscale:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const [chord, ans] = item.split(':')[1].split('|')
      const root = ans.split(' ')[0]
      const all = ['Dorian', 'Mixolydian', 'Lydian', 'altered', 'Lydian dominant', 'Phrygian dominant', 'whole-tone', 'whole-half diminished', 'half-whole diminished', 'melodic minor', 'Locrian', 'Aeolian', 'major (Ionian)'].map(s => `${root} ${s}`)
      const why: Record<string, string> = {
        Dorian: 'a minor 7th chord that is the ii of its key: Dorian is the key\'s notes from the 2nd degree (its ♮6 is the key\'s own note)',
        Mixolydian: 'a plain dominant 7th going to its I: Mixolydian is the key\'s notes from the 5th degree',
        altered: 'every tension altered (♭9 ♯9 ♯11 ♭13): the 7th mode of melodic minor a half step up (A♭ melodic minor for G)',
        'Lydian dominant': 'a dominant with a ♯11: Mixolydian with a raised 4th, the 4th mode of melodic minor',
        Lydian: 'a major 7th with a ♯11: the raised 4th avoids the clash of the plain 4th against the 3rd',
        'Phrygian dominant': 'a V7♭9 going to a minor chord: the 5th mode of harmonic minor (the key\'s minor scale with its 7th raised)',
        'whole-tone': 'a dominant with a ♯5: whole-tone has 9, ♯11 and ♯5 and no perfect 5th',
        'whole-half diminished': 'a dim7 chord: four chord tones plus a note a whole step above each',
        'half-whole diminished': 'a dominant with ♭9 and natural 13: the half-whole scale has ♭9 ♯9 ♯11 and 13 with a perfect 5th',
        'melodic minor': 'a minor chord with a major 7th: only melodic minor has both the ♭3 and the 7',
        Locrian: 'a half-diminished chord: Locrian is the only mode with a ♭5 and ♭7 on a minor root',
      }
      const kind = ans.slice(root.length + 1)
      return choose(item, `What scale fits ${chord}?`, ans, all, `${ans}: ${why[kind]}.`, rnd)
    },
  },
  {
    id: 'l8-mode-ear', unit: 'Guitar theory', title: 'Hear it: which mode?', ear: true,
    desc: 'The home chord, then the mode played up from its root. Bright to dark: Lydian (♯4) – Ionian – Mixolydian (♭7) – Dorian (minor, ♮6) – Aeolian (♭6) – Phrygian (♭2). First hear major or minor, then the colour note.', length: 10, mic: false,
    items: () => ['lyd', 'mix', 'dor', 'phr', 'aeo', 'ion', 'dor', 'mix', 'lyd', 'phr'].map((k, i) => `l8-mode-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const S: Record<string, [string, number[], string]> = {
        lyd: ['Lydian', [0, 2, 4, 6, 7, 9, 11, 12], 'major, with the ♯4 floating between the 3rd and 5th.'],
        ion: ['Ionian (major)', [0, 2, 4, 5, 7, 9, 11, 12], 'plain major: do re mi.'],
        mix: ['Mixolydian', [0, 2, 4, 5, 7, 9, 10, 12], 'major, but the 7th is a whole step under the top: bluesy.'],
        dor: ['Dorian', [0, 2, 3, 5, 7, 9, 10, 12], 'minor, with a bright ♮6 near the top.'],
        aeo: ['Aeolian (natural minor)', [0, 2, 3, 5, 7, 8, 10, 12], 'minor, with the sad ♭6.'],
        phr: ['Phrygian', [0, 1, 3, 5, 7, 8, 10, 12], 'minor, and the very first step is a half step: dark and Spanish.'],
      }
      const [ans, ivs, why] = S[k]
      const root = 45 + Math.floor(rnd() * 7)
      const minor = ivs[2] === 3
      return choose(item, 'Which mode?', ans, Object.values(S).map(x => x[0]), `${ans}: ${why}`, rnd, { audio: { chords: [[root, root + (minor ? 3 : 4), root + 7, root + 12]], seq: ivs.map(i => root + 12 + i) }, sub: 'Major or minor chord first? Then listen for the one note that differs.' })
    },
  },
  {
    id: 'l5-key7', unit: 'Guitar theory', title: 'The 7th chords of a key', mic: false,
    desc: 'Every major key has the same 7th-chord pattern: maj7, m7, m7, maj7, 7, m7, m7♭5. Which chord sits on this degree?', length: 10,
    items: () => ['C', 'G', 'D', 'F', 'A', 'Bb', 'E', 'Eb', 'G', 'D'].map((k, i) => `l5-key7:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const key = item.split(':')[1]
      const d = Math.floor(rnd() * 7)
      const SUF = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7♭5']
      const R = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii']
      const names = spellScale(key, [0, 2, 4, 5, 7, 9, 11])
      const ans = names[d] + SUF[d]
      const wrong = uniq([...SUF.map(sf => names[d] + sf), names[(d + 1) % 7] + SUF[d], names[(d + 6) % 7] + SUF[d]])
      return choose(item, `Key of ${key}: which 7th chord is ${R[d]}${SUF[d] === 'm7♭5' ? 'ø7' : '7'}?`, ans, wrong, `${ans}: the ${R[d]} of ${key} is ${names[d]}, and degree ${d + 1} is always a ${SUF[d]} (maj7 m7 m7 maj7 7 m7 m7♭5).`, rnd)
    },
  },
  {
    id: 'l5-sus-ear', unit: 'Guitar theory', title: 'Hear it: major, sus2, sus4, add9 or 6?', ear: true,
    desc: 'The same root, five colours: the plain major chord, sus2 and sus4 (the 3rd replaced), add9 and 6 (a note added).', length: 10, mic: false,
    items: () => ['maj', 'sus2', 'sus4', 'add9', 'six', 'sus4', 'add9', 'sus2', 'six', 'maj'].map((k, i) => `l5-sus-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const R: Record<string, [string, number[], string]> = {
        maj: ['Major', [0, 4, 7, 12], 'settled and bright: the 3rd is there.'],
        sus2: ['Sus2', [0, 2, 7, 12], 'open and airy, neither major nor minor: the 2 instead of the 3.'],
        sus4: ['Sus4', [0, 5, 7, 12], 'tense, waiting to fall to the 3: the 4 instead of the 3.'],
        add9: ['Add9', [0, 4, 7, 14], 'major with a shimmer on top: the 3rd stays and the 9 is added.'],
        six: ['6', [0, 4, 7, 9], 'sweet and a little old-fashioned (or country, or swing): the 6 added.'],
      }
      const [ans, ivs, why] = R[k]
      const base = 50 + Math.floor(rnd() * 6)
      return choose(item, 'Which chord?', ans, Object.values(R).map(r => r[0]), `${ans}: ${why}`, rnd, { audio: { chords: [ivs.map(i => base + i), [base, base + 4, base + 7, base + 12], ivs.map(i => base + i)] }, sub: 'The chord, the plain major chord, the chord again.' })
    },
  },
  {
    id: 'l5-bass-ear', unit: 'Guitar theory', title: 'Hear it: which note is in the bass?', ear: true,
    desc: 'The same C chord on top, a different bass note under it: the root (C), the 3rd (C/E), the 5th (C/G) or the ♭7 (C/B♭)?', length: 10, mic: false,
    items: () => ['0', '4', '7', '10', '4', '0', '7', '10', '4', '7'].map((k, i) => `l5-bass-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const b = Number(item.split(':')[1])
      const nm = pick(['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb'], rnd)
      const key = pcOf(nm)
      const iv: Record<number, [number, number]> = { 0: [0, 0], 4: [2, 4], 7: [4, 7], 10: [6, 10] }
      const sl = (x: number) => noteAt(nm, iv[x][0], iv[x][1])
      const opts: Record<number, string> = { 0: `${nm} (root in the bass)`, 4: `${nm}/${sl(4)} (3rd in the bass)`, 7: `${nm}/${sl(7)} (5th in the bass)`, 10: `${nm}/${sl(10)} (♭7 in the bass)` }
      const ans = opts[b]
      const why: Record<number, string> = { 0: 'solid and finished.', 4: 'lighter, as if the chord is floating: the 3rd underneath makes a smooth bass line.', 7: 'strong but unsettled: it wants to move (the classic I/5 before a V).', 10: 'leaning, wanting to go down to the IV with its 3rd in the bass.' }
      const r0 = 60 + (key > 5 ? key - 12 : key)
      const top = [r0, r0 + 4, r0 + 7]
      const bass = r0 - 24 + b
      return choose(item, 'Which bass note?', ans, Object.values(opts), `${ans}: ${why[b]}`, rnd, { audio: { chords: [[bass, ...top], [bass], [bass, ...top]] }, sub: 'Chord with its bass, the bass alone, the chord again. Sing the bass note.' })
    },
  },
  {
    id: 'l5-alt-ear', unit: 'Guitar theory', title: 'Hear it: plain or altered dominant?', ear: true,
    desc: 'A dominant 7th, or one with an altered note: ♭9 (dark, Spanish), ♯9 (the Hendrix chord), ♯5 (a rising, augmented pull)? Each then resolves home.', length: 10, mic: false,
    items: () => ['7', 'b9', 's9', 's5', '7', 's9', 'b9', 's5', 's9', '7'].map((k, i) => `l5-alt-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const R: Record<string, [string, number[], string]> = {
        '7': ['Dominant 7', [0, 4, 7, 10], 'the plain V7: bluesy, a clear pull home.'],
        b9: ['7♭9', [0, 4, 10, 13], 'dark and dramatic: the ♭9 is a half step above the root (flamenco, minor-key jazz).'],
        s9: ['7♯9', [0, 4, 10, 15], 'major and minor 3rd at once: the "Hendrix chord" (Purple Haze), funky and raw.'],
        s5: ['7♯5', [0, 4, 8, 10], 'the 5th pushed up a half step: it rises into the next chord.'],
      }
      const [ans, ivs, why] = R[k]
      const v = 43 + Math.floor(rnd() * 5)
      const home = v + 5
      return choose(item, 'Which dominant?', ans, Object.values(R).map(r => r[0]), `${ans}: ${why}`, rnd, { audio: { chords: [ivs.map(i => v + i), [home, home + 7, home + 16]] }, sub: 'The dominant, then the chord it resolves to.' })
    },
  },
  {
    id: 'l5-guide', unit: 'Guitar theory', title: 'Guide tones: where does each voice go?', mic: false,
    desc: 'In a ii – V – I, the 7th of each chord falls a half step to the 3rd of the next, and each 3rd becomes the next 7th. Follow the voices.', length: 10,
    items: () => ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'G', 'C'].map((k, i) => `l5-guide:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const key = item.split(':')[1]
      const sc = spellScale(key, [0, 2, 4, 5, 7, 9, 11])
      const ii = sc[1], V = sc[4], I = sc[0]
      const iiSev = noteAt(ii, 6, 10), vThird = noteAt(V, 2, 4), vSev = noteAt(V, 6, 10), iThird = noteAt(I, 2, 4)
      const ask = rnd() < 0.5
      const ans = ask ? vThird : iThird
      const prompt = ask ? `ii – V – I in ${key}: the 7th of ${ii}m7 (${iiSev}) falls a half step to which note of ${V}7?` : `ii – V – I in ${key}: the 7th of ${V}7 (${vSev}) falls a half step to which note of ${I}maj7?`
      return choose(item, prompt, ans, [...nearNotes(ans), ask ? vSev : noteAt(I, 6, 11)].filter(x => x !== ans && pcOf(x) !== pcOf(ans)), `${ans}: the ${ask ? `3rd of ${V}7` : `3rd of ${I}maj7`}. 7ths fall a half step to 3rds; that falling line is what makes ii – V – I sound so smooth.`, rnd)
    },
  },
  {
    id: 'l4-deg-ear', unit: 'Guitar theory', title: 'Hear it: which note of the scale?', ear: true,
    desc: 'The key\'s home chord, then one note of its major scale: which degree is it, 1 to 7? Knowing the number by ear is knowing where you are inside a scale position.', length: 10, mic: false,
    items: () => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((k, i) => `l4-deg-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const key = 48 + Math.floor(rnd() * 12)
      const MAJ = [0, 2, 4, 5, 7, 9, 11]
      const d = Math.floor(rnd() * 7)
      const NAME = ['1 (do: home)', '2 (re)', '3 (mi)', '4 (fa)', '5 (sol)', '6 (la)', '7 (ti)']
      const FEEL = ['home: nothing wants to move', 'one step above home: it wants to fall back to 1 or rise to 3', 'sweet and bright: the note that says "major"', 'a little tense: it leans down to 3', 'strong and open: home\'s partner, it can rest or lead back', 'soft and wistful: the relative minor\'s home', 'the leading note: it pulls hard up to 1']
      const ans = NAME[d]
      const note = key + 12 + MAJ[d]
      return choose(item, 'Which degree of the scale?', ans, NAME, `${ans}: ${FEEL[d]}. Sing down (or up) the scale to home and count the steps.`, rnd,
        { audio: { chords: [[key, key + 4, key + 7], [note], [key + 12], [note]] }, sub: 'The home chord, the note, home, the note again. Sing from the note to home and count.' })
    },
  },
  {
    id: 'l4-int-ear', unit: 'Guitar theory', title: 'Hear it: 3rds, 6ths, 4ths or octaves?', ear: true,
    desc: 'Two notes of a major scale played together, the way you play double stops: is it a 3rd, a 6th, a 4th or an octave?', length: 10, mic: false,
    items: () => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((k, i) => `l4-int-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const key = 52 + Math.floor(rnd() * 10)
      const MAJ = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24]
      const [steps, ans, why] = pick([[2, 'A 3rd', 'close and sweet: the sound of country, soul and Mayer double stops'], [5, 'A 6th', 'wide but still sweet: the Motown and country sound, played on strings with one skipped'], [3, 'A 4th', 'open and a little hollow: rock double stops, Chuck Berry'], [7, 'An octave', 'the same note twice: Wes Montgomery, and power without a chord']] as const, rnd)
      const d = Math.floor(rnd() * 7)
      const a = key + MAJ[d], b = key + MAJ[d + steps]
      return choose(item, 'Which interval?', ans, ['A 3rd', 'A 6th', 'A 4th', 'An octave'], `${ans}: ${why}.`, rnd,
        { audio: { chords: [[a, b], [a], [b], [a, b]] }, sub: 'Together, the low note, the high note, together again.' })
    },
  },
  {
    id: 'l4-pairs', unit: 'Guitar theory', title: '3rds and 6ths on the neck', mic: false,
    desc: 'A note on one string: where is the 3rd (or 6th) above it in the key, on the string you\'d pair it with? This is how double stops are found anywhere.', length: 10,
    items: () => ['3:0', '3:1', '6:0', '6:1', '3:0', '6:1', '3:1', '6:0', '3:0', '6:1'].map((k, i) => `l4-pairs:${k}:${i}`),
    make: (item, inst, rnd) => {
      const [kind, pair] = item.split(':').slice(1).map(Number)
      const n = inst.midis.length
      const [lo, hi] = kind === 3 ? (pair ? [n - 2, n - 1] : [n - 3, n - 2]) : (pair ? [n - 4, n - 2] : [n - 3, n - 1])
      const keyPc = pick([0, 7, 2, 9, 4, 5], rnd)
      const MAJ = [0, 2, 4, 5, 7, 9, 11]
      const pcs = MAJ.map(x => (keyPc + x) % 12)
      // a scale note on the lower string, frets 1–10
      const cands: number[] = []
      for (let f = 1; f <= 10; f++) if (pcs.includes((inst.midis[lo] + f) % 12)) cands.push(f)
      const f = pick(cands, rnd)
      const m = inst.midis[lo] + f
      const d = pcs.indexOf(m % 12)
      const up = kind === 3 ? 2 : 5
      let target = m + ((MAJ[(d + up) % 7] - MAJ[d] + 12) % 12)
      while (target - inst.midis[hi] < 0) target += 12
      while (target - inst.midis[hi] > 15) target -= 12
      const fret = target - inst.midis[hi]
      const kname = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][keyPc]
      const ans = `Fret ${fret}`
      const wrong = [fret - 2, fret - 1, fret + 1, fret + 2, fret + 3].filter(x => x >= 0 && x <= 15).map(x => `Fret ${x}`)
      return choose(item, `Key of ${kname}: on the ${stringName(inst.midis, lo)} string, fret ${f}. Where is the diatonic ${kind === 3 ? '3rd' : '6th'} above it on the ${stringName(inst.midis, hi)} string?`, ans, wrong,
        `${ans}: the ${kind === 3 ? '3rd' : '6th'} is ${up} scale notes above, so it's a major or minor ${kind === 3 ? '3rd' : '6th'} depending on where you are in the key (here ${Math.abs(target - m)} half steps).`, rnd)
    },
  },
  {
    id: 'l4-16ths-ear', unit: 'Guitar theory', title: 'Hear it: which sixteenth rhythm?', ear: true,
    desc: 'One beat\'s rhythm, repeated over a click: four sixteenths, an eighth and two sixteenths, two sixteenths and an eighth, the gallop, or the dotted "skip"?', length: 8, mic: false,
    items: () => ['all', 'ess', 'sse', 'dot', 'ses', 'all', 'ess', 'sse'].map((k, i) => `l4-16ths-ear:${k}:${i}`),
    make: (item, _inst, rnd) => {
      const k = item.split(':')[1]
      const R: Record<string, [string, number[], string]> = {
        all: ['1 e & a: four sixteenths', [0.25, 0.25, 0.25, 0.25], 'four even notes a beat: the funk motor.'],
        ess: ['1 & a: an eighth, two sixteenths', [0.5, 0.25, 0.25], 'long then two quick: "gal-lop-ing" toward the next beat.'],
        sse: ['1 e &: two sixteenths, an eighth', [0.25, 0.25, 0.5], 'two quick then long: the metal gallop turned around.'],
        dot: ['1 a: dotted eighth and a sixteenth', [0.75, 0.25], 'long-very-short: the skip of a shuffle, but tighter.'],
        ses: ['1 e a: sixteenth, eighth, sixteenth', [0.25, 0.5, 0.25], 'the syncopated "e" and "a" with the & left out: funk.'],
      }
      const [ans, cell, why] = R[k]
      const beats = [...cell, ...cell, ...cell, ...cell]
      return choose(item, 'Which rhythm is each beat?', ans, Object.values(R).map(r => r[0]), `${ans}: ${why}`, rnd, { audio: { rhythm: { beats, bpm: 72 } }, sub: 'Count "1 e & a 2 e & a" along and say which syllables are played.' })
    },
  },
  {
    id: 'l4-3nps', unit: 'Guitar theory', title: 'Three-notes-per-string: where does each pattern start?', mic: false,
    desc: 'The seven 3-notes-per-string patterns of a major scale start on each of its seven notes on the low string. Which note (and degree) starts this one?', length: 10,
    items: () => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((k, i) => `l4-3nps:${k}:${i}`),
    make: (item, inst, rnd) => {
      const keyPc = pick([0, 7, 2, 9, 4], rnd)
      const MAJ = [0, 2, 4, 5, 7, 9, 11]
      const low = inst.midis[0]
      const starts: { f: number; d: number }[] = []
      for (let f = 1; f <= 14; f++) { const d = MAJ.indexOf(((low + f - keyPc) % 12 + 12) % 12); if (d >= 0) starts.push({ f, d }) }
      const st = pick(starts, rnd)
      // (C, G, D, A, E: sharp keys, so their notes are spelled with sharps)
      const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      const kname = N[keyPc]
      const ans = `${ORD[st.d] === 'root' ? '1 (the root)' : `${st.d + 1} (the ${ORD[st.d]})`}`
      const wrong = [0, 1, 2, 3, 4, 5, 6].filter(x => x !== st.d).map(x => (x === 0 ? '1 (the root)' : `${x + 1} (the ${ORD[x]})`))
      return choose(item, `${kname} major, three notes per string: a pattern starts on the ${stringName(inst.midis, 0)} string at fret ${st.f}. Which degree is its first note?`, ans, wrong,
        `${ans}: fret ${st.f} on that string is ${N[(low + st.f) % 12]}, the ${st.d === 0 ? 'root' : ORD[st.d]} of ${kname} major. Each pattern starts on the next scale note up the string.`, rnd)
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
