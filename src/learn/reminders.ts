// Daily practice reminders (phone notifications). One reminder a day at your chosen time, plus an optional
// late "streak saver". Both are skipped for today once you've practised, and the text works whether or not
// you have your guitar with you.
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { dayCounts, dayKey, streak, todayLog } from './progress'

export interface ReminderSettings { on: boolean; time: string; saver: boolean; saverTime: string }
const KEY = 'kg:reminders'
const DAYS = 14
const MAIN_ID = 1000
const SAVER_ID = 2000

export function reminderSettings(): ReminderSettings {
  const d: ReminderSettings = { on: false, time: '18:00', saver: true, saverTime: '21:30' }
  try { return { ...d, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<ReminderSettings>) } } catch { return d }
}
function saveSettings(s: ReminderSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage unavailable */ }
}

export const remindersAvailable = () => Capacitor.isNativePlatform()

/** Ask for permission (Android 13+ shows a prompt). */
export async function enableReminders(s: ReminderSettings): Promise<'ok' | 'denied' | 'unsupported'> {
  if (!remindersAvailable()) { saveSettings(s); return 'unsupported' }
  let p = await LocalNotifications.checkPermissions()
  if (p.display !== 'granted') p = await LocalNotifications.requestPermissions()
  if (p.display !== 'granted') { saveSettings({ ...s, on: false }); return 'denied' }
  saveSettings(s)
  await scheduleReminders()
  return 'ok'
}
export async function updateReminderSettings(s: ReminderSettings) {
  saveSettings(s)
  if (remindersAvailable()) await scheduleReminders()
}

// Rotating messages. {n} = current streak. Written for both cases: guitar in hand, or away on shift.
const MAIN_WITH_STREAK = [
  ['Keep the {n}-day streak going 🔥', 'Grab the guitar for 10 minutes of play-along. Away from it? A quick quiz counts too.'],
  ['Day {n} is waiting', 'One song, one loop or one lesson. Five minutes keeps the streak alive.'],
  ['Your fingers miss the frets', '{n} days in a row so far. Play a tab, or train your ear with headphones if you\'re away.'],
  ['Practice time 🎸', 'A short session now beats a long one someday. {n}-day streak on the line.'],
  ['Quick one?', 'Fretboard quiz in tap mode, ear training, or a play-along: whatever fits where you are. ({n}-day streak)'],
  ['Little and often', 'That\'s how players get good. Keep your {n}-day run going today.'],
]
const MAIN_NO_STREAK = [
  ['Start a streak today 🔥', 'Five minutes is all it takes: play along with a tab, or do a quiz if you\'re away from your guitar.'],
  ['Pick up where you left off', 'A short session today: one lesson, one quiz or one song.'],
  ['Practice time 🎸', 'Your guitar (or ukulele) is calling. No guitar handy? Train your ear with headphones.'],
]
const SAVER = [
  ['Your {n}-day streak ends at midnight', 'Five minutes saves it. A tap-mode quiz works in bed, no guitar needed.'],
  ['Don\'t lose {n} days!', 'Quick ear-training round or a theory lesson before sleep keeps the flame lit.'],
  ['Streak at risk 🔥', '{n} days in a row. A 5-minute quiz is enough to keep it.'],
]
const fill = (t: string, n: number) => t.replace(/\{n\}/g, String(n))

function at(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

let busy: Promise<void> | null = null
/** Rebuild the next two weeks of reminders. Call on start-up, when settings change and after practice. */
export function scheduleReminders(): Promise<void> {
  if (!remindersAvailable()) return Promise.resolve()
  const run = async () => {
    const s = reminderSettings()
    const pending = await LocalNotifications.getPending()
    const ours = pending.notifications.filter(n => n.id >= MAIN_ID && n.id < SAVER_ID + 100)
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) })
    if (!s.on) return
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    const now = new Date()
    const doneToday = dayCounts(todayLog())
    const cur = streak().current
    const list = []
    for (let i = 0; i < DAYS; i++) {
      const day = new Date(now)
      day.setDate(now.getDate() + i)
      if (i === 0 && doneToday) continue
      // streak count you'd be protecting on that day (assumes you keep it up until then)
      const n = i === 0 ? cur : cur + i
      const seed = Number(dayKey(day).replace(/-/g, '')) % 97
      const main = at(day, s.time)
      if (main > now) {
        const pool = n > 0 ? MAIN_WITH_STREAK : MAIN_NO_STREAK
        const [title, body] = pool[seed % pool.length]
        list.push({ id: MAIN_ID + i, title: fill(title, n), body: fill(body, n), schedule: { at: main, allowWhileIdle: true }, smallIcon: 'ic_stat_kguitar', iconColor: '#6b3fe0', extra: { kind: 'main' } })
      }
      const saver = at(day, s.saverTime)
      if (s.saver && n >= 2 && saver > now && saver > main) {
        const [title, body] = SAVER[seed % SAVER.length]
        list.push({ id: SAVER_ID + i, title: fill(title, n), body: fill(body, n), schedule: { at: saver, allowWhileIdle: true }, smallIcon: 'ic_stat_kguitar', iconColor: '#6b3fe0', extra: { kind: 'saver' } })
      }
    }
    if (list.length) await LocalNotifications.schedule({ notifications: list })
  }
  busy = (busy ?? Promise.resolve()).then(run).catch(() => { /* notifications unavailable */ })
  return busy
}

/** Once today counts, take today's reminders off (called after practice is logged). */
let lastCounted = ''
export function onPracticeLogged() {
  const k = dayKey()
  if (lastCounted === k || !dayCounts(todayLog())) return
  lastCounted = k
  void scheduleReminders()
}

