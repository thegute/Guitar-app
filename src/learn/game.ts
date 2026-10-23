// The game layer: levels, streak freezes, daily quests and badges.
// Rewards follow real practice (minutes played, right answers, finished lessons), never just opening the app.
import { allLogs, dayCounts, dayKey, isAway, onLogUpdate, saveDay, streak, stars, todayLog, dailyGoalMin, type DayLog } from './progress'

const FREEZES = 'kg:freezes'
const BADGES = 'kg:badges'
const AWARDED = 'kg:awarded'

function read<T>(k: string, d: T): T {
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : d } catch { return d }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ }
}

// ---------- XP and levels ----------
export function totalXp() {
  return Object.values(allLogs()).reduce((a, d) => a + (d.xp ?? 0), 0)
}
/** XP needed to reach level n (level 1 = 0). Grows gently so early levels come quickly. */
export function xpForLevel(n: number) {
  return Math.round(120 * Math.pow(n - 1, 1.55))
}
const TITLES: [number, string][] = [
  [1, 'First strum'], [3, 'Chord seeker'], [5, 'Groove keeper'], [8, 'Fretboard explorer'], [12, 'Riff builder'],
  [16, 'Scale runner'], [20, 'Improviser'], [25, 'Harmony hunter'], [30, 'Session player'], [40, 'Virtuoso'], [50, 'Master'],
]
export function levelInfo(xp = totalXp()) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const title = [...TITLES].reverse().find(([l]) => level >= l)![1]
  const from = xpForLevel(level)
  const to = xpForLevel(level + 1)
  return { level, title, xp, into: xp - from, need: to - from, next: TITLES.find(([l]) => l > level) }
}

// ---------- streak freezes ----------
/** You earn a streak freeze for every 7 days in a row (you can hold 2). A missed day uses one automatically. */
export function freezes(): number {
  return read<number>(FREEZES, 0)
}
export function reconcileStreak(): { usedFreeze: boolean } {
  const logs = allLogs()
  const s = streak()
  // award freezes at 7, 14, 21 ... day milestones
  const awarded = read<number[]>(AWARDED, [])
  for (let m = 7; m <= s.current; m += 7) {
    if (!awarded.includes(m)) {
      awarded.push(m)
      write(FREEZES, Math.min(2, freezes() + 1))
    }
  }
  if (s.current < 7) write(AWARDED, awarded.filter(m => m <= s.current))
  else write(AWARDED, awarded)
  // yesterday missed, the day before practised, and we have a freeze: use it
  const y = new Date(); y.setDate(y.getDate() - 1)
  const yy = new Date(); yy.setDate(yy.getDate() - 2)
  const yk = dayKey(y)
  const yd = logs[yk]
  if (!dayCounts(yd) && !yd?.frozen && (dayCounts(logs[dayKey(yy)]) || logs[dayKey(yy)]?.frozen) && freezes() > 0) {
    saveDay(yk, { ...(yd ?? { guitar: 0, study: 0, by: {}, answers: 0, correct: 0, done: [] }), frozen: true })
    write(FREEZES, freezes() - 1)
    return { usedFreeze: true }
  }
  return { usedFreeze: false }
}

// ---------- daily quests ----------
export interface Quest {
  id: string
  label: string
  /** counter or measure it watches */
  measure: (d: DayLog) => number
  target: number
  xp: number
  guitar: boolean
}
const mins = (d: DayLog, k: keyof DayLog['by']) => Math.floor((d.by[k] ?? 0) / 60)
const cnt = (d: DayLog, k: string) => d.counts?.[k] ?? 0
const GUITAR_QUESTS: Quest[] = [
  { id: 'play10', label: 'Play along with a tab for 10 minutes', measure: d => mins(d, 'play'), target: 10, xp: 40, guitar: true },
  { id: 'notes60', label: 'Hit 60 notes in play-along', measure: d => cnt(d, 'notesHit'), target: 60, xp: 40, guitar: true },
  { id: 'loop', label: 'Record a loop in Jam and solo over it', measure: d => cnt(d, 'loopsRecorded'), target: 1, xp: 35, guitar: true },
  { id: 'jam8', label: 'Jam over a progression for 8 minutes', measure: d => mins(d, 'jam'), target: 8, xp: 35, guitar: true },
  { id: 'changes', label: 'Do two rounds of one-minute chord changes', measure: d => cnt(d, 'changesRounds'), target: 2, xp: 30, guitar: true },
  { id: 'micquiz', label: 'Finish a quiz in mic mode (play the answers)', measure: d => cnt(d, 'micQuizzes'), target: 1, xp: 35, guitar: true },
  { id: 'section', label: 'Loop a tab section until you score 90%', measure: d => cnt(d, 'loop90'), target: 1, xp: 45, guitar: true },
]
const STUDY_QUESTS: Quest[] = [
  { id: 'answers25', label: 'Answer 25 quiz questions', measure: d => d.answers, target: 25, xp: 30, guitar: false },
  { id: 'correct20', label: 'Get 20 quiz answers right in a row (any quiz)', measure: d => cnt(d, 'bestCombo'), target: 20, xp: 40, guitar: false },
  { id: 'ear', label: 'Finish an ear-training round', measure: d => cnt(d, 'earRounds'), target: 1, xp: 30, guitar: false },
  { id: 'lesson', label: 'Read a theory lesson', measure: d => cnt(d, 'lessonsRead'), target: 1, xp: 25, guitar: false },
  { id: 'rhythm', label: 'Score 80%+ in the rhythm trainer', measure: d => cnt(d, 'rhythm80'), target: 1, xp: 30, guitar: false },
  { id: 'stars', label: 'Earn 3 stars on any quiz', measure: d => cnt(d, 'threeStars'), target: 1, xp: 35, guitar: false },
  { id: 'study10', label: 'Study for 10 minutes without the guitar', measure: d => Math.floor(d.study / 60), target: 10, xp: 30, guitar: false },
]

function seeded(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000 }
}
/** Today's three quests: all guitar-free when you're away, otherwise two with the guitar and one study quest. */
export function todaysQuests(away = isAway()): Quest[] {
  const r = seeded(dayKey() + (away ? 'away' : 'home'))
  const pickN = (list: Quest[], n: number) => [...list].sort(() => r() - 0.5).slice(0, n)
  return away ? pickN(STUDY_QUESTS, 3) : [...pickN(GUITAR_QUESTS, 2), ...pickN(STUDY_QUESTS, 1)]
}
export function questProgress(q: Quest, d = todayLog()) {
  const v = q.measure(d)
  return { value: Math.min(v, q.target), done: v >= q.target }
}

// ---------- badges ----------
export interface Badge { id: string; icon: string; name: string; how: string }
interface BadgeRule extends Badge { test: (s: Stats) => boolean }
interface Stats {
  streak: number; best: number; days: number; hours: number; notes: number; songs: number; loops: number
  correct: number; earLevel: number; lessons: number; awayDays: number; perfectWeek: boolean; combo: number; uke: boolean
  stars3: number; cagedDone: boolean
}
const RULES: BadgeRule[] = [
  { id: 'first', icon: '🎸', name: 'First practice', how: 'Practise for 5 minutes', test: s => s.days >= 1 },
  { id: 'streak3', icon: '🔥', name: 'On a roll', how: '3-day streak', test: s => s.best >= 3 },
  { id: 'streak7', icon: '🔥', name: 'One week strong', how: '7-day streak', test: s => s.best >= 7 },
  { id: 'streak30', icon: '🏆', name: 'Habit formed', how: '30-day streak', test: s => s.best >= 30 },
  { id: 'streak100', icon: '👑', name: 'Unstoppable', how: '100-day streak', test: s => s.best >= 100 },
  { id: 'hour1', icon: '⏱️', name: 'First hour', how: '1 hour of total practice', test: s => s.hours >= 1 },
  { id: 'hour10', icon: '⏱️', name: 'Ten hours in', how: '10 hours of total practice', test: s => s.hours >= 10 },
  { id: 'hour50', icon: '💎', name: 'Dedicated', how: '50 hours of total practice', test: s => s.hours >= 50 },
  { id: 'hour100', icon: '🌟', name: 'Century', how: '100 hours of total practice', test: s => s.hours >= 100 },
  { id: 'notes100', icon: '🎯', name: 'Sharp shooter', how: 'Hit 100 notes in play-along', test: s => s.notes >= 100 },
  { id: 'notes1000', icon: '🎯', name: 'Thousand notes', how: 'Hit 1,000 notes in play-along', test: s => s.notes >= 1000 },
  { id: 'song', icon: '🎵', name: 'Song finished', how: 'Play a whole tab through', test: s => s.songs >= 1 },
  { id: 'song10', icon: '📀', name: 'Repertoire', how: 'Finish 10 songs in play-along', test: s => s.songs >= 10 },
  { id: 'loop', icon: '🔁', name: 'Loop artist', how: 'Record your first loop', test: s => s.loops >= 1 },
  { id: 'quiz100', icon: '🧠', name: 'Quiz whiz', how: '100 right answers', test: s => s.correct >= 100 },
  { id: 'quiz1000', icon: '🧠', name: 'Know-it-all', how: '1,000 right answers', test: s => s.correct >= 1000 },
  { id: 'combo25', icon: '⚡', name: 'In the zone', how: '25 right in a row', test: s => s.combo >= 25 },
  { id: 'ear5', icon: '👂', name: 'Good ears', how: 'Pass ear-training level 5', test: s => s.earLevel >= 5 },
  { id: 'ear10', icon: '👂', name: 'Golden ears', how: 'Pass every ear-training level', test: s => s.earLevel >= 10 },
  { id: 'lesson10', icon: '📖', name: 'Theory buff', how: 'Read 10 theory lessons', test: s => s.lessons >= 10 },
  { id: 'stars10', icon: '⭐', name: 'Perfectionist', how: '3 stars on 10 quizzes', test: s => s.stars3 >= 10 },
  { id: 'caged', icon: '🧩', name: 'Shape shifter', how: 'Finish the CAGED course', test: s => s.cagedDone },
  { id: 'away10', icon: '🚒', name: 'Practice anywhere', how: 'Practise on 10 days away from your guitar', test: s => s.awayDays >= 10 },
  { id: 'week', icon: '📅', name: 'Perfect week', how: 'Practise all 7 days of a week', test: s => s.perfectWeek },
  { id: 'uke', icon: '🌺', name: 'Island time', how: 'Practise in ukulele mode', test: s => s.uke },
]
export const ALL_BADGES: Badge[] = RULES.map(({ test: _t, ...b }) => b)

function stats(): Stats {
  const logs = allLogs()
  const keys = Object.keys(logs).sort()
  const sum = (k: string) => keys.reduce((a, d) => a + (logs[d].counts?.[k] ?? 0), 0)
  const st = streak()
  let perfectWeek = false
  // any Monday–Sunday with all 7 days practised
  for (const k of keys) {
    const d = new Date(k + 'T12:00:00')
    if (d.getDay() !== 1) continue
    let all = true
    for (let i = 0; i < 7; i++) { const x = new Date(d); x.setDate(d.getDate() + i); if (!dayCounts(logs[dayKey(x)])) { all = false; break } }
    if (all) { perfectWeek = true; break }
  }
  const s = stars()
  return {
    streak: st.current, best: st.best, days: st.total,
    hours: keys.reduce((a, k) => a + logs[k].guitar + logs[k].study, 0) / 3600,
    notes: sum('notesHit'), songs: sum('songsFinished'), loops: sum('loopsRecorded'),
    correct: keys.reduce((a, k) => a + logs[k].correct, 0),
    earLevel: read<number>('kg:earBest', 0), lessons: read<string[]>('kg:lessonsRead', []).length,
    awayDays: keys.filter(k => logs[k].away && dayCounts(logs[k])).length, perfectWeek,
    combo: Math.max(0, ...keys.map(k => logs[k].counts?.bestCombo ?? 0)),
    uke: keys.some(k => logs[k].uke && dayCounts(logs[k])),
    stars3: Object.values(s).filter(n => n >= 3).length,
    cagedDone: ['caged-name', 'caged-where', 'caged-order'].every(id => (s[id] ?? 0) >= 1),
  }
}
export function earnedBadges(): Record<string, number> {
  return read<Record<string, number>>(BADGES, {})
}

// ---------- celebrations ----------
export interface Celebration { kind: 'goal' | 'badge' | 'level' | 'quest' | 'freeze'; title: string; detail: string; icon: string }
const celebrationListeners = new Set<(c: Celebration) => void>()
export function onCelebrate(f: (c: Celebration) => void) {
  celebrationListeners.add(f)
  return () => { celebrationListeners.delete(f) }
}
function celebrate(c: Celebration) {
  celebrationListeners.forEach(f => f(c))
}

let lastLevel = 0
let checking = false
/** After every logged change: award goal/quest XP once, unlock badges, announce level-ups. */
function check(before: number, d: DayLog) {
  if (checking) return
  checking = true
  try {
    const goal = dailyGoalMin() * 60
    const now = d.guitar + d.study
    const day = dayKey()
    const flags = read<Record<string, string[]>>('kg:dayFlags', {})
    const mine = flags[day] ?? []
    const award = (flag: string, xp: number, c: Celebration) => {
      if (mine.includes(flag)) return
      mine.push(flag)
      flags[day] = mine
      write('kg:dayFlags', Object.fromEntries(Object.entries(flags).slice(-14)))
      const logs = allLogs()
      const t = logs[day]
      if (t) { t.xp = (t.xp ?? 0) + xp; saveDay(day, t) }
      celebrate(c)
    }
    if (before < goal && now >= goal) award('goal', 50, { kind: 'goal', icon: '✅', title: 'Daily goal done!', detail: `${dailyGoalMin()} minutes today. +50 XP` })
    for (const q of todaysQuests(!!d.away)) {
      if (questProgress(q, d).done) award('q:' + q.id, q.xp, { kind: 'quest', icon: '🎯', title: 'Quest complete', detail: `${q.label}. +${q.xp} XP` })
    }
    const got = earnedBadges()
    const st = stats()
    for (const r of RULES) {
      if (!got[r.id] && r.test(st)) {
        got[r.id] = Date.now()
        write(BADGES, got)
        celebrate({ kind: 'badge', icon: r.icon, title: `Badge: ${r.name}`, detail: r.how })
      }
    }
    const lv = levelInfo().level
    if (lastLevel && lv > lastLevel) celebrate({ kind: 'level', icon: '⬆️', title: `Level ${lv}!`, detail: levelInfo().title })
    lastLevel = lv
  } finally {
    checking = false
  }
}
export function startGame() {
  lastLevel = levelInfo().level
  onLogUpdate(check)
  const r = reconcileStreak()
  if (r.usedFreeze) setTimeout(() => celebrate({ kind: 'freeze', icon: '🧊', title: 'Streak saved', detail: 'You missed yesterday, so a streak freeze kept your streak alive.' }), 800)
}
export function bumpCombo(combo: number) {
  const d = todayLog()
  if (combo > (d.counts?.bestCombo ?? 0)) {
    const logs = allLogs()
    const k = dayKey()
    const t = logs[k] ?? d
    t.counts = { ...(t.counts ?? {}), bestCombo: combo }
    saveDay(k, t)
  }
}
