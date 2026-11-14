// What the coach says: one thing that went well, ONE fix (the bar, string, fret and finger), ONE drill. This file is
// the built-in coach: rules over what KGuitar measured (trouble.ts). It always works, with no key and no network; the
// AI coach (listen.ts) starts from the same facts and adds what it hears.
import type { Trouble, TroubleKind } from './trouble'

export interface Advice {
  /** the kind word first */
  good: string
  /** the one fix */
  fix: string
  /** the one drill */
  drill: string
  /** read aloud: one or two plain sentences, no symbols */
  spoken: string
  /** what the AI heard that the numbers can't show (buzz, muting, feel): its opinion, labelled so on the card */
  heard?: string
  kind: TroubleKind
  bar: number
  /** which button comes first on the card */
  primary: 'drill' | 'shift'
  from: 'rules' | 'ai'
}

const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
/** "low E", "A", … "high E": a string by its open note (string 0 = lowest) */
export function stringName(tuning: number[], s: number): string {
  const n = NOTE[((tuning[s] ?? 0) % 12 + 12) % 12]
  const same = tuning.map((m, i) => (NOTE[((m % 12) + 12) % 12] === n ? i : -1)).filter(i => i >= 0)
  if (same.length < 2) return n
  return `${s === same[0] ? 'low' : s === same[same.length - 1] ? 'high' : 'middle'} ${n}`
}
export const FINGER = ['', 'index', 'middle', 'ring', 'pinky']
const fingerOf = (f: number) => (f >= 1 && f <= 4 ? `your ${FINGER[f]} finger` : 'your finger')
const fingerWord = (f: number) => (f >= 1 && f <= 4 ? `${FINGER[f]} finger` : 'finger')
const fretOf = (f: number) => (f === 0 ? 'the open string' : `fret ${f}`)
export const barsText = (l: { from: number; to: number }) => (l.from === l.to ? `bar ${l.from + 1}` : `bars ${l.from + 1} to ${l.to + 1}`)

/** The built-in coach's advice for a trouble spot. */
export function ruleAdvice(t: Trouble, o: { tuning: number[]; mode: 'wait' | 'time'; speed: number }): Advice {
  const s = t.spot, str = `the ${stringName(o.tuning, s.string)} string`
  const where = s.fret === 0 ? `the open ${stringName(o.tuning, s.string)} string` : `${fretOf(s.fret)} on ${str}`
  const bar = `Bar ${t.bar + 1}`
  const good = t.good ? `${t.good.from === t.good.to ? `Bar ${t.good.from + 1} was` : `Bars ${t.good.from + 1} to ${t.good.to + 1} were`} clean.` : t.pct >= 50 ? 'Most of it is there.' : 'Good start.'
  // (Wait for me has no speed: you set the pace)
  const at = o.mode === 'time' ? ` at ${Math.round(Math.min(o.speed, 0.7) * 100)}%` : ', slowly'
  const loop = barsText(t.loop)
  let fix: string, drill: string, say: string
  switch (t.kind) {
    case 'shift': {
      const to = t.shift!.to, dir = to > t.shift!.from ? 'up' : 'down'
      fix = `${bar}: the move ${dir} to fret ${to}. Start moving as soon as you leave the note before, and land ${fingerOf(s.finger)} on ${where}.`
      drill = `Loop ${loop}${at}: just the move, until your hand gets there early.`
      say = `${good} In bar ${t.bar + 1}, your hand gets to fret ${to} late. Start the move sooner and land your ${fingerWord(s.finger)} first. Try looping just that move, slowly.`
      break
    }
    case 'jump': {
      const b = t.before!
      fix = `${bar}: the jump from the ${stringName(o.tuning, b.string)} string to ${str}. Have ${fingerOf(s.finger)} waiting over ${where} before you pick it.`
      drill = `Play only those two notes back and forth, slowly, then loop ${loop}${at}.`
      say = `${good} In bar ${t.bar + 1}, the jump to the ${stringName(o.tuning, s.string)} string is catching you. Get your ${fingerWord(s.finger)} over it early. Try just those two notes, back and forth.`
      break
    }
    case 'rush': {
      const ms = Math.abs(t.facts.meanErr ?? 0)
      fix = `${bar}: you're ahead of the beat (about ${ms} ms early). Let each note ring its full length before the next.`
      drill = `Loop ${loop}${at} with the click on, and count it out loud.`
      say = `${good} In bar ${t.bar + 1} you're rushing, a little ahead of the beat. Let each note ring out. Try it slower with the click.`
      break
    }
    case 'drag': {
      const ms = Math.abs(t.facts.meanErr ?? 0)
      fix = `${bar}: you're behind the beat (about ${ms} ms late). Keep your fingers close to the strings so the next note is ready.`
      drill = `Loop ${loop}${at}, then bring the speed back up a little at a time.`
      say = `${good} In bar ${t.bar + 1} you're falling behind the beat. Keep your fingers close to the strings. Loop it slower, then speed it up bit by bit.`
      break
    }
    case 'stretch':
      fix = `${bar}: the reach to ${where} with your pinky. Drop your thumb behind the neck and let your hand open up; don't pull the other fingers along.`
      drill = `Hold the note before it, then reach and play it, ten slow times. Then loop ${loop}${at}.`
      say = `${good} In bar ${t.bar + 1}, the reach to fret ${s.fret} with your pinky isn't landing. Drop your thumb behind the neck to open your hand. Practise just that reach, slowly.`
      break
    case 'legato':
      fix = `${bar}: the hammer-on or pull-off at ${where}. Come down hard with the tip of ${fingerOf(s.finger)}, right behind the fret; pulling off, flick the string sideways a little.`
      drill = `Pick once, then hammer and pull four times without picking. Then loop ${loop}${at}.`
      say = `${good} In bar ${t.bar + 1}, the hammer-on at fret ${s.fret} isn't sounding. Come down hard with your fingertip, right behind the fret. Try it a few times without picking.`
      break
    case 'bend':
      fix = `${bar}: the bend at ${where}. Push with ${fingerOf(s.finger)} and the fingers behind it together, and listen for the note you're bending to.`
      drill = `Play the target note first, then bend up to match it, five times. Then loop ${loop}${at}.`
      say = `${good} In bar ${t.bar + 1}, the bend at fret ${s.fret} isn't getting there. Push with the fingers behind it too. Play the note you're aiming for first, then bend up to it.`
      break
    case 'chord':
      fix = `${bar}: the chord change. Put ${fingerOf(s.finger)} down first, on ${where}, and let the others follow.`
      drill = `Change into this chord from the one before it, slowly, without strumming, ten times. Then loop ${loop}${at}.`
      say = `${good} In bar ${t.bar + 1}, the chord change is late. Put your ${fingerWord(s.finger)} down first and let the others follow. Practise just the change, slowly.`
      break
    default:
      fix = `${bar}: ${where}, with ${fingerOf(s.finger)}, is the note that keeps slipping.`
      drill = `Play that note and the one before it, slowly, five times. Then loop ${loop}${at}.`
      say = `${good} In bar ${t.bar + 1}, the note at ${s.fret === 0 ? 'the open string' : `fret ${s.fret}`} keeps slipping. Play just that note and the one before it, slowly, then loop the bar.`
  }
  return { good, fix, drill, spoken: say, kind: t.kind, bar: t.bar, primary: t.kind === 'shift' ? 'shift' : 'drill', from: 'rules' }
}

/** Plain words only for the voice: no symbols, bar lines, slashes or percent signs. */
export function forVoice(text: string): string {
  return text.replace(/(\d+)\s*%/g, '$1 percent').replace(/[*_#`>|\[\]{}]/g, '').replace(/\s*[–—]\s*/g, ' to ').replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
}

// ── settings
export type CoachWhen = 'auto' | 'tap'
const KEY = 'kg:coach'
export interface CoachPrefs { /** when the AI listens: after passes too, or only when you tap Coach */ ai: CoachWhen; /** say it out loud */ voice: boolean; /** the coach comes up by itself after a pass / three misses */ auto: boolean }
export function coachPrefs(): CoachPrefs {
  try { return { ai: 'auto', voice: true, auto: true, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<CoachPrefs>) } } catch { return { ai: 'auto', voice: true, auto: true } }
}
export function saveCoachPrefs(p: Partial<CoachPrefs>) { try { localStorage.setItem(KEY, JSON.stringify({ ...coachPrefs(), ...p })) } catch { /* storage full */ } }
