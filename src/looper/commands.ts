// What you can say or type to the helper while the looper is open (no AI needed): "record", "record track 2",
// "overdub", "stop", "stop now", "play", "undo", "redo", "clear track 3", "chorus" / "part B" / "verse",
// "mute track 1", "unmute", "solo the bass", "track 4 louder" / "quieter".
import { ROLES } from './roles'
import type { LoopStation } from './station'

const ORD: Record<string, number> = { one: 1, first: 1, two: 2, second: 2, three: 3, third: 3, four: 4, fourth: 4 }

export function looperCommand(st: LoopStation, raw: string): string | null {
  const q = raw.toLowerCase().replace(/[.!?]/g, ' ').trim()
  if (q.split(/\s+/).length > 9) return null
  // which track: "track 2", "the second track", or a role name ("the bass")
  const num = /\btrack\s*(\d|one|two|three|four)\b/.exec(q) ?? /\b(first|second|third|fourth)\s+track\b/.exec(q)
  let track: number | null = num ? (Number(num[1]) || ORD[num[1]]) - 1 : null
  if (track === null) { const r = ROLES.findIndex(x => new RegExp(`\\b${x.label.toLowerCase().replace(/s$/, '')}s?\\b`).test(q) || new RegExp(`\\b${x.role}\\b`).test(q)); if (r >= 0) track = st.s.tracks.findIndex(t => t.role === ROLES[r].role) }
  if (track !== null && (track < 0 || track > 3)) return null
  const t = track ?? st.s.sel
  const name = `track ${t + 1}`
  if (/\b(part b|chorus|switch( parts?)?|other part)\b/.test(q)) { st.switchPart(/verse|part a/.test(q) ? 'A' : /chorus|part b/.test(q) ? 'B' : undefined); return 'Switching on the next bar.' }
  if (/\b(part a|verse)\b/.test(q)) { st.switchPart('A'); return 'Back to part A on the next bar.' }
  if (/\bstop now\b/.test(q)) { st.stopNow(); return 'Stopped.' }
  if (/^(stop|stop it|stop the looper|stop playing)$/.test(q)) { st.stop(); return 'Stopping at the end of the bar.' }
  if (/^(play|start|play it|start the looper|go)$/.test(q)) { st.start(0); return 'Playing.' }
  if (/\b(undo)\b/.test(q)) { st.undo(t); return `Undone on ${name}.` }
  if (/\b(redo)\b/.test(q)) { st.redo(t); return `Back on ${name}.` }
  if (/\b(clear|erase|delete)\b/.test(q) && /\b(all|everything)\b/.test(q)) return 'To clear everything, use Clear everything under Resample and save (it asks first).'
  if (/\b(clear|erase|delete)\b/.test(q)) { st.clear(t); return `${name[0].toUpperCase()}${name.slice(1)} cleared. Say "redo" to bring it back.` }
  if (/\bunmute\b/.test(q)) { st.setTrack(t, { mute: false }); return `${name} is back on.` }
  if (/\bmute\b/.test(q)) { st.setTrack(t, { mute: true }); return `${name} muted.` }
  if (/\b(unsolo|no solo)\b/.test(q)) { st.s.tracks.forEach((_, i) => st.setTrack(i, { solo: false })); return 'Solo off.' }
  if (/\bsolo\b/.test(q)) { st.setTrack(t, { solo: true }); return `Only ${name} now. Say "unsolo" to hear them all.` }
  if (/\b(louder|turn (it )?up)\b/.test(q)) { st.setTrack(t, { vol: Math.min(1.6, st.s.tracks[t].vol + 0.2) }); return `${name} louder.` }
  if (/\b(quieter|softer|turn (it )?down)\b/.test(q)) { st.setTrack(t, { vol: Math.max(0, st.s.tracks[t].vol - 0.2) }); return `${name} quieter.` }
  if (/\b(record|overdub|loop it|rec)\b/.test(q)) { void st.press(t); return st.loopOf(t) ? `Overdub on ${name}: it comes in on the next bar.` : `Recording ${name} from the next bar.` }
  return null
}
