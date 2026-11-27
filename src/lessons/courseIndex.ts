// Cross-app index of the user's locally connected guitar courses (Roy Ziv, Paul Davids, Matteo Mancuso, or any folder).
// Never uploads or bundles copyrighted course media — reads only folders already connected on this device and matches
// lessons to any KGuitar screen/drill by explicit `topics[]` tags (from `kguitar-course.json`) + smart keyword inference.
import { useEffect, useState } from 'react'
import { savedFolders, type Folder, type LFile } from './folders'
import {
  getCachedCourseMap,
  loadCourseMapForFolder,
  resolveCourse,
  type CourseClipDef,
  type ResolvedCourse,
  type ResolvedLesson,
} from './courseMap'

export interface IndexedLesson {
  folder: Folder
  courseTitle: string
  instructor: string
  lesson: ResolvedLesson
  topics: string[]
  searchText: string
}

export interface CourseMatch {
  item: IndexedLesson
  score: number
  matchedTopics: string[]
  clip?: CourseClipDef
}

const TOPIC_PATTERNS: [string, RegExp][] = [
  ['hexatonic', /\bhexatonic\b/i],
  ['hexatonic-blues', /\bhexatonic\b.*\bblue|\bblue\s*note/i],
  ['skipping-shapes', /skipping\s*shape|position\s*shift|string\s*skip|connect|mapping\s*the\s*neck|across\s*the\s*neck/i],
  ['2nps', /\b2\s*note|\btwo[\s-]note|\b2nps\b/i],
  ['3nps', /\b3\s*note|\bthree[\s-]note|\b3nps\b/i],
  ['modes', /\bmode(s)?\b|modal/i],
  ['ionian', /\bionian\b|\bmajor\s*scale/i],
  ['dorian', /\bdorian\b/i],
  ['phrygian', /\bphrygian\b/i],
  ['lydian', /\blydian\b/i],
  ['mixolydian', /\bmixolydian\b/i],
  ['aeolian', /\baeolian\b|natural\s*minor|\bminor\s*scale/i],
  ['locrian', /\blocrian\b/i],
  ['drone', /\bdrone\b|hearing\s*the\s*unique/i],
  ['modal-interchange', /modal\s*interchange|borrowed\s*chord/i],
  ['pentatonic', /\bpentatonic\b/i],
  ['bb-king', /b\.?\s*b\.?\s*king/i],
  ['blues', /\bblues\b|delta|texas|muddy|smokey|shuffle/i],
  ['chord-tones', /chord\s*tone|target\s*note|playing\s*the\s*changes|matching\s*modes\s*to\s*chords/i],
  ['target-notes', /chord\s*tone|target\s*note|playing\s*the\s*changes/i],
  ['triads', /\btriad/i],
  ['arpeggios', /\barpeggio/i],
  ['caged', /\bcaged\b|three\s*magical\s*pentatonic|pentatonic\s*box/i],
  ['diatonic', /diatonic|building\s*chord|connecting\s*scales,\s*chords|i\s*-\s*iv\s*-\s*v/i],
  ['chords', /\bchord/i],
  ['improv', /\bimprov|solo|phrasing|lick/i],
  ['phrasing', /phrasing|motif|melod|vocal|expressive|ballad/i],
  ['chromatic', /chromatic/i],
  ['speed', /\bspeed\b|fast|burst|metronome\s*settings/i],
  ['warmup', /warm\s*up|stretch/i],
  ['endurance', /endurance|stamina|pinky|independence|wide\s*fret/i],
  ['sequences', /sequence|ascending\s*thirds|scale\s*in\s*3rds|linear\s*sequence/i],
  ['alternate-picking', /alternate\s*picking|inside\s*outside|double\s*picking|cross\s*string/i],
  ['hybrid-picking', /hybrid\s*picking/i],
  ['hand-sync', /synchroniz|playing\s*clean|wrist\s*arm|picking\s*hand/i],
  ['pick-hold', /holding\s*the\s*pick|pick\s*hold/i],
  ['tremolo', /tremolo/i],
  ['rhythm', /\brhythm\b|backbeat|groove|shuffle|house\s*of\s*rhythm/i],
  ['strumming', /\bstrum/i],
  ['fingerstyle', /fingerpick|fingerstyle|right\s*hand\s*technique|travis/i],
  ['flatpicking', /flatpick|bluegrass/i],
  ['slap', /\bslap\b|percussive|flick/i],
  ['walking-bass', /walking\s*bass/i],
  ['acoustic', /\bacoustic\b|bluegrass|folk/i],
  ['drop-d', /drop\s*d/i],
  ['tone', /\btone\b|clean\s*vs\.?\s*distortion/i],
]

/** Infer clean guitarist topic tags from course/chapter/lesson titles, hints, and explicit JSON topics. */
export function inferTopicsForLesson(
  courseTitle: string,
  chapterTitle: string,
  lessonTitle: string,
  hint?: string,
  explicitTopics?: string[],
): string[] {
  const out = new Set<string>()
  for (const t of explicitTopics ?? []) {
    const clean = t.trim().toLowerCase()
    if (clean) out.add(clean)
  }
  const combined = `${courseTitle} ${chapterTitle} ${lessonTitle} ${hint ?? ''}`
  for (const [tag, re] of TOPIC_PATTERNS) {
    if (re.test(combined)) out.add(tag)
  }
  // Specific course-level boosts so Beginner/Intermediate/Advanced Hexatonic exercises get clean semantic tags
  if (/hexatonic/i.test(courseTitle)) {
    out.add('hexatonic')
    out.add('improv')
    if (/lick|solo/i.test(chapterTitle + ' ' + lessonTitle)) out.add('phrasing')
    if (/intermediate/i.test(chapterTitle)) {
      const m = /exercise\s*(\d+)/i.exec(lessonTitle)
      if (m) {
        const n = Number(m[1])
        if (n >= 1 && n <= 10) out.add('skipping-shapes')
        if (n >= 11 && n <= 17) { out.add('hexatonic-blues'); out.add('blues') }
        if (n >= 18 && n <= 29) { out.add('2nps'); out.add('sequences') }
        if (n >= 30) { out.add('arpeggios'); out.add('chord-tones') }
      }
    }
  }
  return [...out]
}

// ---- Singleton reactive cache of all indexed lessons from connected local folders ----
let cachedItems: IndexedLesson[] = []
let cachedSig = ''
let loadingPromise: Promise<IndexedLesson[]> | null = null
const indexListeners = new Set<() => void>()

export function invalidateCourseIndex() {
  cachedSig = ''
  loadingPromise = null
  indexListeners.forEach(f => f())
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('kg-courses-changed', () => invalidateCourseIndex())
}

export function onCourseIndexChange(f: () => void) {
  indexListeners.add(f)
  return () => { indexListeners.delete(f) }
}

function foldersSignature(folders: Folder[]): string {
  return folders.map(f => `${f.tree}:${f.files.length}:${f.scanned}`).join('|')
}

export async function indexConnectedCourses(): Promise<IndexedLesson[]> {
  const folders = savedFolders()
  const sig = foldersSignature(folders)
  if (sig === cachedSig && cachedItems.length > 0) return cachedItems
  if (!folders.length) {
    cachedItems = []
    cachedSig = sig
    return []
  }
  if (loadingPromise && sig === cachedSig) return loadingPromise
  cachedSig = sig
  loadingPromise = (async () => {
    const out: IndexedLesson[] = []
    for (const f of folders) {
      let map = getCachedCourseMap(f.tree)
      if (map === undefined) {
        map = await loadCourseMapForFolder(f)
      }
      const resolved: ResolvedCourse = resolveCourse(f, map)
      const instructor = resolved.instructor || (/roy\s*ziv/i.test(resolved.title) ? 'Roy Ziv' : /paul\s*davids/i.test(resolved.title) ? 'Paul Davids' : /matteo\s*mancuso/i.test(resolved.title) ? 'Matteo Mancuso' : '')
      for (const ls of resolved.lessons) {
        const topics = inferTopicsForLesson(resolved.title, ls.chapterTitle, ls.title, ls.hint, ls.topics)
        out.push({
          folder: f,
          courseTitle: resolved.title,
          instructor,
          lesson: ls,
          topics,
          searchText: `${resolved.title} ${instructor} ${ls.chapterTitle} ${ls.title} ${ls.hint ?? ''} ${topics.join(' ')}`.toLowerCase(),
        })
      }
    }
    cachedItems = out
    indexListeners.forEach(f => f())
    return out
  })()
  return loadingPromise
}

/** Rank indexed lessons against requested topics (pure function, easy to test!). */
export function rankCourseMatches(
  items: IndexedLesson[],
  topics: string[],
  opts?: { max?: number; preferCourse?: string; requireBacking?: boolean; query?: string },
): CourseMatch[] {
  const want = topics.map(t => t.trim().toLowerCase()).filter(Boolean)
  const q = (opts?.query ?? '').trim().toLowerCase()
  const max = opts?.max ?? 6
  if (!want.length && !q) return []

  const scored: CourseMatch[] = []
  for (const item of items) {
    if (opts?.requireBacking && !item.lesson.backings.length) continue
    const topicSet = new Set(item.topics)
    const matchedTopics: string[] = []
    let score = 0

    for (let i = 0; i < want.length; i++) {
      const t = want[i]
      // Earlier topics in the caller's list are higher priority
      const weight = i === 0 ? 5 : i === 1 ? 3 : 2
      if (topicSet.has(t)) {
        matchedTopics.push(t)
        score += weight
        // Extra bonus if the lesson title or chapter explicitly mentions the topic
        const titleLow = `${item.lesson.chapterTitle} ${item.lesson.title}`.toLowerCase()
        if (titleLow.includes(t.replace(/-/g, ' '))) score += 3
      }
    }

    if (q && item.searchText.includes(q)) score += 4

    // Check timestamped clips for exact topic match
    let bestClip: CourseClipDef | undefined
    if (item.lesson.clips?.length) {
      for (const c of item.lesson.clips) {
        if ((c.topics ?? []).some(ct => want.includes(ct.toLowerCase()))) {
          bestClip = c
          score += 4
          break
        }
      }
    }

    if (score <= 0) continue

    // Prefer explanatory lessons / tricks / solos over generic numbered exercises when scores tie
    const tLow = item.lesson.title.toLowerCase()
    if (/intro|tip|trick|how\s*to|what\s*are|playing\s*the\s*changes|drone|triad|arpeggio|b\.?b\.?\s*king|magical|solo|lick/i.test(tLow)) {
      score += 1.5
    }
    if (item.lesson.gpTabs.length) score += 0.4
    if (item.lesson.backings.length) score += 0.4
    if (opts?.preferCourse && item.courseTitle.toLowerCase().includes(opts.preferCourse.toLowerCase())) {
      score += 2
    }

    scored.push({ item, score, matchedTopics, clip: bestClip })
  }

  scored.sort((a, b) => b.score - a.score)

  // Diversify across courses so one 171-lesson course doesn't crowd out Paul Davids / Modes / Speed Builder!
  const out: CourseMatch[] = []
  const perCourse = new Map<string, number>()
  const perCourseCap = Math.max(2, Math.ceil(max / 2))
  for (const m of scored) {
    const key = m.item.courseTitle
    const used = perCourse.get(key) ?? 0
    if (used >= perCourseCap && scored.length > max) continue
    perCourse.set(key, used + 1)
    out.push(m)
    if (out.length >= max) break
  }
  // Fill any leftover slots if diversity cap left room
  if (out.length < max) {
    for (const m of scored) {
      if (out.includes(m)) continue
      out.push(m)
      if (out.length >= max) break
    }
  }
  return out
}

export function useCourseMatches(
  topics: string[],
  opts?: { max?: number; preferCourse?: string; requireBacking?: boolean; query?: string },
): { matches: CourseMatch[]; totalIndexed: number; hasFolders: boolean } {
  const [items, setItems] = useState<IndexedLesson[]>(cachedItems)
  const [hasFolders, setHasFolders] = useState(() => savedFolders().length > 0)
  const topicKey = topics.join(',')
  useEffect(() => {
    let alive = true
    const load = () => {
      setHasFolders(savedFolders().length > 0)
      void indexConnectedCourses().then(res => { if (alive) setItems(res) })
    }
    load()
    const off = onCourseIndexChange(load)
    return () => { alive = false; off() }
  }, [topicKey])

  const matches = rankCourseMatches(items, topics, opts)
  return { matches, totalIndexed: items.length, hasFolders }
}

/** Map a scale ID from ScalesScreen / ImprovGym to course search topics. */
export function topicsForScale(scaleId: string): string[] {
  const s = scaleId.toLowerCase()
  if (s === 'minor hexatonic') return ['hexatonic', 'skipping-shapes', 'arpeggios', 'improv']
  if (s === 'hexatonic blues') return ['hexatonic-blues', 'hexatonic', 'blues', 'improv']
  if (s === 'major hexatonic') return ['hexatonic', 'modes', 'improv']
  if (s.includes('dorian')) return ['dorian', 'modes', 'drone', 'chord-tones']
  if (s.includes('phrygian')) return ['phrygian', 'modes', 'drone']
  if (s.includes('lydian')) return ['lydian', 'modes', 'drone']
  if (s.includes('mixolydian')) return ['mixolydian', 'modes', 'drone']
  if (s.includes('aeolian')) return ['aeolian', 'modes', 'arpeggios', 'triads']
  if (s.includes('locrian')) return ['locrian', 'modes']
  if (s === 'major') return ['ionian', 'diatonic', 'modes', 'triads']
  if (s.includes('blues')) return ['blues', 'bb-king', 'pentatonic', 'hexatonic-blues']
  if (s.includes('pentatonic')) return ['pentatonic', 'caged', 'bb-king', 'sequences']
  return ['modes', 'improv', 'sequences']
}

// ---- Active Floating Course Video + Course Backing Track Buses ----
export interface ActiveCourseVideo {
  folder: Folder
  courseTitle: string
  instructor: string
  lesson: ResolvedLesson
  startSec?: number
  clipLabel?: string
}

export interface CourseBackingTrack {
  file: LFile
  title: string
  courseTitle: string
  hint?: string
}

let activeVideo: ActiveCourseVideo | null = null
const videoSubs = new Set<() => void>()
export function setActiveCourseVideo(v: ActiveCourseVideo | null) {
  activeVideo = v
  videoSubs.forEach(f => f())
}
export function getActiveCourseVideo() { return activeVideo }
export function useActiveCourseVideo(): ActiveCourseVideo | null {
  const [, bump] = useState(0)
  useEffect(() => { const f = () => bump(n => n + 1); videoSubs.add(f); return () => { videoSubs.delete(f) } }, [])
  return activeVideo
}

let activeBacking: CourseBackingTrack | null = null
const backingSubs = new Set<() => void>()
export function setCourseBackingForImprov(b: CourseBackingTrack | null) {
  activeBacking = b
  backingSubs.forEach(f => f())
}
export function getCourseBackingForImprov() { return activeBacking }
export function useCourseBackingForImprov(): CourseBackingTrack | null {
  const [, bump] = useState(0)
  useEffect(() => { const f = () => bump(n => n + 1); backingSubs.add(f); return () => { backingSubs.delete(f) } }, [])
  return activeBacking
}
