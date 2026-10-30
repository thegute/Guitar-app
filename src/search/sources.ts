// Search entries made from the app's own lists: your saved songs, the songbook, example tabs, lessons, techniques
// and quizzes. Built when search opens, for the instrument you are using.
import type { Instrument } from '../instrument'
import type { SongDoc } from '../tabs/library'
import { SONGBOOK, GENRES } from '../tabs/songbook'
import { EXAMPLES } from '../tabs/examples'
import { LESSONS } from '../learn/lessons'
import { TECHNIQUES } from '../learn/techniques'
import { course } from '../learn/quiz'
import { exerciseCatalog, EX_TYPES, LEVELS, TECHS } from '../exercises/catalog'
import { LICKS } from '../licks/library'
import { lickStyle } from '../licks/styles'
import type { Entry } from './types'

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t)
/** Saved songs that are yours (not examples, lessons or songbook parts), as in Songs → My songs. */
export const isMine = (s: SongDoc) => s.source !== 'example' && s.source !== 'lesson' && s.source !== 'songbook'

export function libraryEntries(inst: Instrument, songs: SongDoc[] = []): Entry[] {
  const out: Entry[] = []
  for (const s of songs.filter(isMine)) {
    const kind = s.source === 'gp' ? 'Guitar Pro tab' : s.source === 'chords' ? 'chord sheet' : s.source === 'jam' ? 'tab made in KGuitar' : 'text tab'
    out.push({ id: `my:${s.id}`, kind: 'mysong', title: s.title, where: 'Songs → My songs', text: `${s.artist ? s.artist + ', ' : ''}your ${kind}. Opens in Play where you left off.`,
      keys: `${s.artist ?? ''} my song saved`, target: { go: { song: s.id } }, boost: 0.1 })
  }
  for (const s of SONGBOOK) {
    const genre = GENRES.find(g => g.id === s.genre)?.label ?? s.genre
    out.push({ id: `sb:${s.id}`, kind: 'songbook', title: s.title, where: `Songs → Songbook (${genre})`,
      text: `${s.credit}, key of ${s.key}${s.minor ? ' minor' : ''}. Parts: ${s.parts.map(p => p.label).join(', ')}.`,
      keys: `${s.genre} songbook ${s.parts.map(p => p.label).join(' ')}`, target: { go: { songbook: { song: s.id, part: s.parts[0].id } } } })
  }
  for (const e of EXAMPLES.filter(e => e.for === 'any' || e.for === inst.id)) {
    out.push({ id: `ex:${e.id}`, kind: 'practice', title: e.title, where: 'Songs → Exercises → Example songs', text: 'An example tab to try every feature on.', keys: 'example', target: { example: e.id } })
  }
  // the exercise library: findable by name, code, type and technique
  for (const e of exerciseCatalog(inst)) {
    const type = EX_TYPES.find(t => t.id === e.type)?.label ?? ''
    const tech = e.tech.map(t => TECHS.find(x => x.id === t)?.label ?? '').join(' ')
    out.push({ id: `xc:${e.code}`, kind: 'exercise', title: e.name, where: `Songs → Exercises (${e.code})`, text: clip(`${LEVELS[e.level]}. ${e.about}`, 140),
      keys: `${e.code} ${e.code.replace('-', '')} ${type} ${tech} ${LEVELS[e.level]} exercise drill`, target: { exercise: e.code }, boost: -0.18 })
  }
  // must-know licks, with their breakdowns searchable
  for (const l of LICKS.filter(x => x.must)) {
    const st = lickStyle(l.style)
    out.push({ id: `lk:${l.id}`, kind: 'lick', title: l.name, where: `Learn → Must-know licks (${st.label})`, text: clip(l.must!.about, 140),
      keys: `${st.label} lick licks must know ${l.kind}`, body: [...l.must!.steps, l.must!.tip, l.must!.use].join(' '), target: { go: { licks: l.id } }, boost: -0.05 })
  }
  for (const l of LESSONS) {
    const paras = l.blocks.flatMap(b => ('p' in b ? [b.p] : 'tip' in b ? [b.tip] : 'list' in b ? b.list : []))
    out.push({ id: `ls:${l.id}`, kind: 'lesson', title: l.title, where: 'Learn → Lessons', text: clip(paras[0] ?? '', 140), keys: 'lesson theory', boost: -0.1,
      body: clip(paras.join(' '), 1500), target: { go: { lesson: l.id } } })
  }
  for (const t of TECHNIQUES) {
    out.push({ id: `tq:${t.id}`, kind: 'technique', title: t.title, where: 'Learn → Technique', text: t.why, keys: 'technique how to',
      body: t.steps.join(' '), target: { go: { technique: t.id } } })
  }
  for (const u of course(inst)) {
    for (const q of u.quizzes) {
      out.push({ id: `qz:${q.id}`, kind: 'quiz', title: q.title, where: `Learn → Course → ${u.unit}`, text: q.desc, keys: `quiz ${u.unit}`, target: { go: { quiz: q.id } }, boost: -0.12 })
    }
  }
  return out
}
