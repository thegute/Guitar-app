// "Sync automatically" for Play's video: KGuitar listens to the video itself (the sound playing inside the phone, with
// Android's screen-recording permission; in a browser, the shared tab's sound) for a few seconds while it plays the part
// you're learning, finds where that sound sits in the tab (alignAnywhere) and sets bar 1 and the tempo. Tap to sync and
// "Tab is late / early" stay for fine-tuning. Only the sound is used; nothing is kept.
import { startGrab } from '../scan/grab'
import { alignAnywhere, hopSec, onsets } from '../audio/tempo'
import type { VideoSync } from './inTime'

export interface AutoSyncResult { sync: VideoSync; sure: 'yes' | 'two-places' }

/**
 * Listen to the video for `seconds` and line the tab up with it. `noteSecs` = when each tab note sounds at the tab's own
 * tempo (seconds from bar 1); `now` = the video's current time. Throws with a plain message when it can't.
 */
export async function autoSync(o: { noteSecs: number[]; tabBpm: number; now: () => number; seconds?: number; onTick?: (left: number) => void; signal?: AbortSignal; grab?: typeof startGrab; wait?: (ms: number) => Promise<void>; wall?: () => number }): Promise<AutoSyncResult> {
  const secs = o.seconds ?? 15
  if (o.noteSecs.length < 6) throw new Error('This tab has too few notes to line up by ear: use Tap along instead.')
  const grab = await (o.grab ?? startGrab)({ fps: 0.5, seconds: secs + 20 })
  const wait = o.wait ?? (ms => new Promise<void>(r => setTimeout(r, ms)))
  const wall = o.wall ?? (() => performance.now())
  const v0 = o.now(), w0 = wall()
  let stoppedEarly = false
  grab.onStopped(() => { stoppedEarly = true })
  for (let left = secs; left > 0 && !stoppedEarly; left--) {
    if (o.signal?.aborted) break
    o.onTick?.(left)
    await wait(1000)
  }
  const vEnd = o.now(), wEnd = wall()
  const got = await grab.stop()
  if (o.signal?.aborted) throw new Error('Cancelled.')
  if (!got.sound || got.sound.x.length < got.sound.sr * 4) throw new Error("KGuitar couldn't hear the video. On a computer, share this tab and tick \"Share tab audio\".")
  // the video must have played straight through at normal speed while KGuitar listened
  if (Math.abs(vEnd - v0 - (wEnd - w0) / 1000) > 0.6) throw new Error('The video was paused, skipped or slowed down while KGuitar listened. Play it at 1× and try again.')
  const { x, sr } = got.sound
  let peak = 0
  for (let i = 0; i < x.length; i += 64) peak = Math.max(peak, Math.abs(x[i]))
  if (peak < 0.005) throw new Error('The video was silent while KGuitar listened (is the sound turned down?).')
  const clipStart = vEnd - x.length / sr
  const al = alignAnywhere(onsets(x, sr), o.noteSecs, o.tabBpm, { hop: hopSec(sr) })
  if (!al || al.score < 0.3) throw new Error("The video's notes didn't match this tab. Play a part where the guitar plays the tab (not talking), or use Tap along.")
  return { sync: { offset: Math.round((clipStart + al.start) * 1000) / 1000, bpm: al.bpm }, sure: al.sure < 1.03 ? 'two-places' : 'yes' }
}
