// The endurance check: tired hands make mistakes that practice then bakes in. The coach watches the scores of this
// sitting's runs and loop passes; when the last few are clearly below the best stretch, after a good while of playing,
// it says so (once in a while) and suggests a break or something easier.
export interface Runs { list: { t: number; score: number }[]; told: number }
/** this sitting's runs (kept in memory only; a half-hour gap starts a new sitting) */
export const sessionRuns: Runs = { list: [], told: 0 }

const MIN = 60_000
/** Add a run's score; true when it's time to say "you're tiring": 20+ minutes in, 8+ runs, the last four at least 12
 *  points under the best four in a row, and not said in the last 15 minutes. */
export function endurance(r: Runs, score: number, now: number): boolean {
  if (r.list.length && now - r.list[r.list.length - 1].t > 30 * MIN) { r.list = []; r.told = 0 }
  r.list.push({ t: now, score })
  if (r.list.length > 200) r.list.shift()
  const n = r.list.length
  if (n < 8 || now - r.list[0].t < 20 * MIN || now - r.told < 15 * MIN) return false
  const avg = (a: number) => (r.list[a].score + r.list[a + 1].score + r.list[a + 2].score + r.list[a + 3].score) / 4
  let best = 0
  for (let i = 0; i + 4 <= n - 4; i++) best = Math.max(best, avg(i))
  if (best - avg(n - 4) < 12) return false
  r.told = now
  return true
}
