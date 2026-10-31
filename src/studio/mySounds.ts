// Your own pad sounds (Android app only): pick a folder of drum samples on the phone and play them on the pads.
// The files are read where they are, never copied into the app, the web version or a backup. Uses the same folder
// access as Your video lessons (LessonFoldersPlugin), but keeps its own list so the folder isn't shown as a course.
import { audio } from '../audio/engine'
import type { Voice } from '../audio/drums'
import { LessonFolders, kindOf as fileKind, lessonsAvailable, type LFile } from '../lessons/folders'

export const mySoundsAvailable = lessonsAvailable
export interface PadSample { uri: string; name: string }
export interface MySounds { folder?: { tree: string; name: string }; files: PadSample[]; map: Partial<Record<Voice, PadSample>> }
const KEY = 'kg:padSounds'
export function mySounds(): MySounds {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as MySounds | null; if (v && v.map) return { ...v, files: v.files ?? [] } } catch { /* fall through */ }
  return { files: [], map: {} }
}
export function saveMySounds(v: MySounds) { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage full */ } }

/** A file name → the pad it most likely is (kick_01.wav → kick). */
const GUESS: [Voice, RegExp][] = [
  ['open', /open.?h|ohh|o\.?hat|hat.?open|\boh\b/], ['pedal', /pedal|foot.?h|phh/], ['hat', /hi.?hat|hh|hat|chh/],
  ['kick', /kick|bd\b|bass.?drum|\bkik/], ['rim', /rim|side.?stick|xstick|cross/], ['clap', /clap|\bclp/], ['snap', /snap/],
  ['snare', /snare|\bsd\b|\bsnr/], ['crash', /crash/], ['ride', /ride/], ['china', /china/], ['splash', /splash/],
  ['tom1', /hi.?tom|tom.?(hi|1|high)|rack.?1/], ['tom2', /mid.?tom|tom.?(mid|2)|rack.?2/], ['tom3', /floor|lo.?tom|tom.?(lo|3|low)/],
  ['cowbell', /cowbell|bell/], ['shaker', /shak/], ['tamb', /tamb/], ['conga', /conga/], ['bongo', /bongo/], ['clave', /clave/],
  ['impact', /impact|boom|hit/], ['riser', /riser|sweep|rise/],
]
export function guessPads(files: { name: string }[], pads: Voice[]): Partial<Record<Voice, number>> {
  const out: Partial<Record<Voice, number>> = {}
  files.forEach((f, i) => {
    const n = f.name.toLowerCase().replace(/[_\-.]+/g, ' ')
    const v = GUESS.find(([voice, re]) => pads.includes(voice) && re.test(n))?.[0]
    if (v && out[v] === undefined) out[v] = i
  })
  return out
}

/** Pick a folder on the phone and list the audio files in it (up to 2 MB each: drum one-shots). */
export async function pickSoundFolder(): Promise<{ folder: { tree: string; name: string }; files: PadSample[] } | null> {
  const r = await LessonFolders.pick()
  if (!r.tree || r.cancelled) return null
  const { files } = await LessonFolders.list({ tree: r.tree })
  const audioFiles = files.filter((f: LFile) => fileKind(f) === 'audio' && f.size <= 2 * 1024 * 1024)
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
    .slice(0, 400)
  return { folder: { tree: r.tree, name: r.name ?? 'My sounds' }, files: audioFiles.map(f => ({ uri: f.uri, name: f.name })) }
}

const cache = new Map<string, AudioBuffer>()
export async function loadSample(s: PadSample): Promise<AudioBuffer | null> {
  const hit = cache.get(s.uri)
  if (hit) return hit
  try {
    const { data } = await LessonFolders.read({ uri: s.uri })
    const bin = atob(data)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const buf = await audio().decodeAudioData(bytes.buffer)
    // one-shots: trim the silence at the start, keep at most 4 seconds
    const ch = buf.getChannelData(0)
    let start = 0
    const peak = ch.reduce((m, x) => Math.max(m, Math.abs(x)), 0)
    while (start < ch.length && Math.abs(ch[start]) < peak * 0.02) start++
    start = Math.max(0, start - 32)
    const len = Math.min(buf.length - start, Math.round(buf.sampleRate * 4))
    const out = audio().createBuffer(buf.numberOfChannels, Math.max(1, len), buf.sampleRate)
    for (let c = 0; c < buf.numberOfChannels; c++) out.getChannelData(c).set(buf.getChannelData(c).subarray(start, start + len))
    cache.set(s.uri, out)
    return out
  } catch { return null }
}

/** Every pad that has one of your sounds, decoded and ready. */
export async function loadMyPads(v: MySounds = mySounds()): Promise<Map<Voice, AudioBuffer>> {
  const out = new Map<Voice, AudioBuffer>()
  if (!mySoundsAvailable()) return out
  await Promise.all(Object.entries(v.map).map(async ([voice, s]) => { if (s) { const b = await loadSample(s); if (b) out.set(voice as Voice, b) } }))
  return out
}
