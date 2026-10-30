// The path to mastery: seven stages, each a handful of concrete goals the app can check by itself.
// Every goal links to the thing that trains it.
import type { Instrument } from '../instrument'
import { allLogs, stars, streak, dayCounts } from './progress'
import { course, learningOrder } from './quiz'
import { LESSONS } from './lessons'

export type Go =
  | { quiz: string }
  | { lesson: string }
  | { tool: 'ear' | 'caged' | 'changes' | 'rhythm' | 'circle' | 'lessons' | 'settings' | 'progress' | 'guide' | 'techniques' | 'bends' }
  | { tab: 'play' | 'progressions' | 'tuner' }
  | { exercise: 'spider' | 'penta1' }
  | { song: string; loop?: { from: number; to: number } }
  | { songbook: { song: string; part: string } }
  | { songs: 'songbook' | 'mine' | 'practice' | 'add' }
  | { settings: 'you' | 'sound' | 'look' | 'backup' }
  | { jam: 'jam' | 'solo' | 'tab' | 'find' }
  | { learn: 'today' | 'course' | 'explore' }
  | { technique: string }
  | { guide: string }

export interface Goal { label: string; done: boolean; go: Go; guitar: boolean }
export interface Stage { id: string; title: string; why: string; goals: Goal[] }

function read<T>(k: string, d: T): T {
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : d } catch { return d }
}

/** Snapshot of everything the path checks. */
export function pathStats() {
  const logs = allLogs()
  const keys = Object.keys(logs)
  const sum = (k: string) => keys.reduce((a, d) => a + (logs[d].counts?.[k] ?? 0), 0)
  const changes = read<Record<string, number>>('kg:changesBest', {})
  return {
    stars: stars(),
    lessons: new Set(read<string[]>('kg:lessonsRead', [])),
    ear: read<number>('kg:earBest', 0),
    tuned: keys.some(k => (logs[k].by.tuner ?? 0) > 0),
    days: keys.filter(k => dayCounts(logs[k])).length,
    best: streak().best,
    hours: keys.reduce((a, k) => a + logs[k].guitar + logs[k].study, 0) / 3600,
    notes: sum('notesHit'),
    exNotes: sum('exerciseNotes'),
    songs: sum('songsFinished'),
    loops: sum('loopsRecorded'),
    loop90: sum('loop90'),
    rhythm: sum('rhythm80'),
    changes: Math.max(0, ...Object.values(changes)),
  }
}

export function masteryPath(inst: Instrument, st = pathStats()): Stage[] {
  // some quizzes don't exist in every tuning (chord-shape quizzes in open tunings): leave those goals out
  const has = new Set(course(inst).flatMap(u => u.quizzes.map(q => q.id)))
  return buildPath(inst, st).map(s => ({ ...s, goals: s.goals.filter(g => !('quiz' in g.go) || has.has(g.go.quiz)) }))
}

function buildPath(inst: Instrument, st: ReturnType<typeof pathStats>): Stage[] {
  const s = (id: string, n = 1) => (st.stars[id] ?? 0) >= n
  const read = (id: string) => st.lessons.has(id)
  const order = learningOrder(inst)
  const g = (label: string, done: boolean, go: Go, guitar = false): Goal => ({ label, done, go, guitar })
  const uke = inst.id !== 'guitar'
  const n = inst.noun
  return [
    {
      id: 'first', title: 'First steps', why: 'Build the habit and get your hands and ears working together.',
      goals: [
        g(`Tune your ${n} with the tuner`, st.tuned, { tab: 'tuner' }, true),
        g('Read "How to practise (so it sticks)"', read('practice-how'), { lesson: 'practice-how' }),
        g('Play the spider-walk warm-up tab along with the mic', st.exNotes >= 30, { exercise: 'spider' }, true),
        g('Natural notes on your first string (1 star)', s(`fb-nat-0`), { quiz: 'fb-nat-0' }),
        g('Practise on 3 different days', st.days >= 3, { tool: 'lessons' }),
      ],
    },
    {
      id: 'chords', title: 'Open chords and rhythm', why: 'Chords and steady time are what let you play real songs.',
      goals: [
        g('Name that chord shape (2 stars)', s('ch-name', 2), { quiz: 'ch-name' }),
        g('30 clean chord changes in one minute', st.changes >= 30, { tool: 'changes' }, true),
        g('Score 80% in the rhythm trainer', st.rhythm >= 1, { tool: 'rhythm' }),
        g('Play a whole tab through in play-along', st.songs >= 1, { tab: 'play' }, true),
        g('Pass ear-training level 2', st.ear >= 2, { tool: 'ear' }),
      ],
    },
    {
      id: 'neck', title: 'Fretboard and pentatonic', why: 'Know where the notes are, and the scale most solos are made from.',
      goals: [
        g(`Natural notes on your first two strings (2 stars each)`, s('fb-nat-0', 2) && (order.length < 2 || s('fb-nat-1', 2)), { quiz: s('fb-nat-0', 2) ? 'fb-nat-1' : 'fb-nat-0' }),
        g('Octave shapes (1 star)', s('fb-octave'), { quiz: 'fb-octave' }),
        g('Play minor pentatonic box 1 along with the mic', st.exNotes >= 150, { exercise: 'penta1' }, true),
        g('Read "Pentatonic and blues scales"', read('pentatonic'), { lesson: 'pentatonic' }),
        g('Record a loop in Jam and solo over it', st.loops >= 1, { tab: 'progressions' }, true),
        g('Pass ear-training level 4', st.ear >= 4, { tool: 'ear' }),
      ],
    },
    {
      id: 'keys', title: uke ? 'Moveable chords and keys' : 'Barre chords and keys', why: 'Play any chord in any key, and know which chords belong together.',
      goals: [
        uke ? g('Pick the right shape (2 stars)', s('ch-shape', 2), { quiz: 'ch-shape' }) : g('Barre chords: where does it go? (2 stars)', s('ch-barre', 2), { quiz: 'ch-barre' }),
        g('Read "The circle of fifths"', read('circle'), { lesson: 'circle' }),
        g('IV and V: the neighbours (2 stars)', s('cof-neighbours', 2), { quiz: 'cof-neighbours' }),
        g('Chords in a key (1 star)', s('cof-chords'), { quiz: 'cof-chords' }),
        g('60 chord changes in one minute', st.changes >= 60, { tool: 'changes' }, true),
        g('Finish 5 tabs in play-along', st.songs >= 5, { tab: 'play' }, true),
      ],
    },
    {
      id: 'caged', title: `Triads and ${inst.shapeSystem.join('')}`, why: 'Small chord shapes all over the neck, linked by the five-shape system.',
      goals: [
        g('Spell the triad (2 stars)', s('tr-spell', 2), { quiz: 'tr-spell' }),
        g('Triads on the top strings (1 star)', s('tr-find-top'), { quiz: 'tr-find-top' }),
        g(`Read "The CAGED system"`, read('caged'), { lesson: 'caged' }),
        g(`All three ${inst.shapeSystem.join('')} quizzes (1 star each)`, s('caged-name') && s('caged-where') && s('caged-order'), { tool: 'caged' }),
        g('Loop a tab section until you score 90%, three times', st.loop90 >= 3, { tab: 'play' }, true),
        g('Pass ear-training level 6', st.ear >= 6, { tool: 'ear' }),
      ],
    },
    {
      id: 'improv', title: 'Whole neck and improvising', why: 'Play by ear, follow the chords and solo anywhere on the neck.',
      goals: [
        g('Every note, every string (2 stars)', s('fb-all', 2), { quiz: 'fb-all' }),
        g('Read "The seven modes" and "Using scales"', read('modes') && read('using-scales'), { lesson: read('modes') ? 'using-scales' : 'modes' }),
        g('Hit 1,000 notes in play-along', st.notes >= 1000, { tab: 'play' }, true),
        g('Pass ear-training level 8', st.ear >= 8, { tool: 'ear' }),
        g('Reach a 30-day streak', st.best >= 30, { tool: 'lessons' }),
      ],
    },
    {
      id: 'master', title: 'Mastery', why: 'The long game: fluency everywhere.',
      goals: [
        g('Every note, every string (3 stars)', s('fb-all', 3), { quiz: 'fb-all' }),
        g('Pass every ear-training level', st.ear >= 10, { tool: 'ear' }),
        g('Finish 10 tabs in play-along', st.songs >= 10, { tab: 'play' }, true),
        g('3 stars on 10 quizzes', Object.values(st.stars).filter(x => x >= 3).length >= 10, { tool: 'lessons' }),
        g('Read every theory lesson', LESSONS.every(l => st.lessons.has(l.id)), { tool: 'lessons' }),
        g('100 hours of practice', st.hours >= 100, { tab: 'play' }, true),
      ],
    },
  ]
}

/** The stage you're on: the first one with goals left. */
export function currentStage(path: Stage[]) {
  const i = path.findIndex(s => s.goals.some(g => !g.done))
  return i < 0 ? path.length - 1 : i
}
