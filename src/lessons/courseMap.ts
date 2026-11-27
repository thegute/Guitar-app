// Course Studio map loader & smart fallback matcher.
// Reads `kguitar-course.json` from a course folder when present (100% verified video -> PDF page range + PNG tabs +
// backing tracks + GP tabs), and falls back to automatic filename/number matching for any unmapped course folder.
// Also persists per-lesson pinned PDF pages (`📌 Pin Page`) and per-lesson BPM / practice notes.
import { chapters, kindOf, niceName, readLessonBytes, type Folder, type LFile } from './folders'

export interface CourseClipDef {
  label: string
  startSec: number
  endSec?: number
  topics?: string[]
}

export interface CourseLessonDef {
  id: string
  title: string
  video: string
  pdf?: string
  startPage?: number
  endPage?: number
  extraPdfs?: { path: string; label: string; startPage?: number; endPage?: number }[]
  images?: { path: string; label?: string }[]
  defaultView?: 'pdf' | 'image' | 'video'
  backings?: { path: string; label?: string }[]
  gpTabs?: { path: string; label?: string }[]
  tuning?: string
  hint?: string
  /** Optional topic tags (e.g. ['hexatonic', 'skipping-shapes', 'chord-tones']) for cross-app "From your courses" matching */
  topics?: string[]
  /** Optional key moment timestamps inside this video lesson */
  clips?: CourseClipDef[]
}

export interface CourseChapterDef {
  id: string
  title: string
  lessons: CourseLessonDef[]
}

export interface CourseMap {
  version: number
  title: string
  instructor?: string
  description?: string
  chapters: CourseChapterDef[]
}

export interface PdfRef {
  file: LFile
  label: string
  startPage: number
  endPage: number
}

export interface FileRef {
  file: LFile
  label: string
}

export interface ResolvedLesson {
  id: string
  title: string
  chapterId: string
  chapterTitle: string
  video: LFile
  pdf?: PdfRef
  extraPdfs: PdfRef[]
  images: FileRef[]
  backings: FileRef[]
  gpTabs: FileRef[]
  /** Also keeps chapter-level text/gp/pdf/image tabs for quick access */
  chapterTabs: LFile[]
  defaultView: 'pdf' | 'image' | 'video'
  tuning?: string
  hint?: string
  topics?: string[]
  clips?: CourseClipDef[]
}

export interface ResolvedChapter {
  id: string
  title: string
  lessons: ResolvedLesson[]
  tabs: LFile[]
}

export interface ResolvedCourse {
  title: string
  instructor?: string
  description?: string
  hasMap: boolean
  chapters: ResolvedChapter[]
  lessons: ResolvedLesson[]
}

// ---- Synced Course Map Store (cross-device via Cloud Sync + 1-tap Google Drive JSON import) ----
export interface CourseMapBundle {
  version: number
  kind: 'kguitar-course-bundle'
  updatedAt?: number
  maps: CourseMap[]
}

export interface StoredCourseMap {
  key: string
  updatedAt: number
  map: CourseMap
}

export const COURSE_MAP_STORE_KEY = 'kg:courseMapStore'

export function normalizeCourseKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[—–\-_:.,'’"()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function countTaggedLessons(map: CourseMap | null | undefined): number {
  if (!map || !Array.isArray(map.chapters)) return 0
  let n = 0
  for (const ch of map.chapters) {
    for (const ls of ch.lessons ?? []) {
      if (Array.isArray(ls.topics) && ls.topics.length > 0) n++
    }
  }
  return n
}

export function countMapLessons(map: CourseMap | null | undefined): number {
  if (!map || !Array.isArray(map.chapters)) return 0
  return map.chapters.reduce((a, c) => a + (c.lessons?.length ?? 0), 0)
}

function isCourseMapLike(x: unknown): x is CourseMap {
  return !!x && typeof x === 'object' && typeof (x as CourseMap).title === 'string' && Array.isArray((x as CourseMap).chapters)
}

/** Parses either a single `kguitar-course.json` or a multi-course `kguitar-all-courses.json` bundle. */
export function parseImportedCourseMaps(jsonText: string): CourseMap[] {
  const parsed = JSON.parse(jsonText) as unknown
  if (Array.isArray(parsed)) return parsed.filter(isCourseMapLike)
  if (parsed && typeof parsed === 'object') {
    const b = parsed as Partial<CourseMapBundle>
    if (Array.isArray(b.maps)) return b.maps.filter(isCourseMapLike)
    if (isCourseMapLike(parsed)) return [parsed]
  }
  return []
}

export function loadSyncedCourseMaps(): Record<string, StoredCourseMap> {
  try {
    const raw = localStorage.getItem(COURSE_MAP_STORE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, StoredCourseMap>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveSyncedCourseMaps(store: Record<string, StoredCourseMap>) {
  try {
    localStorage.setItem(COURSE_MAP_STORE_KEY, JSON.stringify(store))
  } catch { /* storage full */ }
}

/** Score how strongly a CourseMap matches a connected local Folder (video path overlap + title match). */
export function scoreMapMatchForFolder(map: CourseMap, folder: Folder): number {
  const find = buildFileFinder(folder.files)
  let videoHits = 0
  let totalVideos = 0
  for (const ch of map.chapters) {
    for (const ls of ch.lessons ?? []) {
      if (!ls.video) continue
      totalVideos++
      if (find(ls.video)) videoHits++
    }
  }
  let score = 0
  if (videoHits > 0) {
    const ratio = totalVideos > 0 ? videoHits / totalVideos : 0
    score += videoHits * 10 + Math.round(ratio * 100)
  }
  const fk = normalizeCourseKey(folder.name)
  const mk = normalizeCourseKey(map.title)
  if (fk && mk) {
    if (fk === mk) score += 200
    else if (fk.includes(mk) || mk.includes(fk)) score += 90
    else {
      const fWords = new Set(fk.split(' ').filter(w => w.length > 2))
      const mWords = mk.split(' ').filter(w => w.length > 2)
      const shared = mWords.filter(w => fWords.has(w)).length
      if (shared >= 2) score += shared * 25
    }
  }
  return score
}

export function findSyncedMapForFolder(folder: Folder): CourseMap | null {
  const store = loadSyncedCourseMaps()
  let best: CourseMap | null = null
  let bestScore = 0
  for (const entry of Object.values(store)) {
    if (!isCourseMapLike(entry?.map)) continue
    const s = scoreMapMatchForFolder(entry.map, folder)
    if (s > bestScore) {
      bestScore = s
      best = entry.map
    }
  }
  return bestScore >= 40 ? best : null
}

/** Pick the richer/better map between an on-disk `kguitar-course.json` and a synced map from Drive/Cloud Sync. */
export function chooseBestCourseMap(diskMap: CourseMap | null, syncedMap: CourseMap | null): CourseMap | null {
  if (!diskMap) return syncedMap
  if (!syncedMap) return diskMap
  const diskTagged = countTaggedLessons(diskMap)
  const syncTagged = countTaggedLessons(syncedMap)
  if (syncTagged > diskTagged) return syncedMap
  if (diskTagged > syncTagged) return diskMap
  return countMapLessons(syncedMap) >= countMapLessons(diskMap) ? syncedMap : diskMap
}

export interface CourseMapImportResult {
  imported: number
  matched: number
  taggedLessons: number
  courseTitles: string[]
}

/** Import one or more JSON files (single `kguitar-course.json` or multi-course `kguitar-all-courses.json`), save to synced store, and refresh matched folders. */
export function importCourseMapJsonTexts(texts: string[], folders: Folder[]): CourseMapImportResult {
  const maps: CourseMap[] = []
  for (const t of texts) {
    try {
      maps.push(...parseImportedCourseMaps(t))
    } catch { /* skip malformed file */ }
  }
  if (!maps.length) return { imported: 0, matched: 0, taggedLessons: 0, courseTitles: [] }

  const store = loadSyncedCourseMaps()
  const now = Date.now()
  let taggedLessons = 0
  const courseTitles: string[] = []
  for (const m of maps) {
    const key = normalizeCourseKey(m.title)
    if (!key) continue
    store[key] = { key, updatedAt: now, map: m }
    taggedLessons += countTaggedLessons(m)
    courseTitles.push(m.title)
  }
  saveSyncedCourseMaps(store)

  // Clear stale cache entries and apply immediately to every matching connected folder
  let matched = 0
  for (const f of folders) {
    const best = findSyncedMapForFolder(f)
    if (best) {
      matched++
      memMaps.set(f.tree, best)
      try { localStorage.setItem(MAP_KEY(f.tree), JSON.stringify(best)) } catch { /* ignore */ }
    }
  }
  try { window.dispatchEvent(new Event('kg-courses-changed')) } catch { /* node test */ }
  return { imported: courseTitles.length, matched, taggedLessons, courseTitles }
}

// ---- In-memory + localStorage cache for loaded kguitar-course.json maps ----
const memMaps = new Map<string, CourseMap | null>()
const MAP_KEY = (tree: string) => `kg:courseMap:${tree}`

export function getCachedCourseMap(tree: string): CourseMap | null | undefined {
  if (memMaps.has(tree)) return memMaps.get(tree)
  try {
    const raw = localStorage.getItem(MAP_KEY(tree))
    if (raw) {
      const parsed = JSON.parse(raw) as CourseMap
      if (parsed && Array.isArray(parsed.chapters)) {
        memMaps.set(tree, parsed)
        return parsed
      }
    }
  } catch { /* ignore */ }
  return undefined
}

export async function loadCourseMapForFolder(f: Folder): Promise<CourseMap | null> {
  const synced = findSyncedMapForFolder(f)
  const mapFile = f.files.find(x => x.name.toLowerCase() === 'kguitar-course.json')
  let disk: CourseMap | null = null
  if (mapFile) {
    try {
      const bytes = await readLessonBytes(mapFile.uri)
      const text = new TextDecoder().decode(bytes)
      const parsed = JSON.parse(text) as CourseMap
      if (parsed && Array.isArray(parsed.chapters)) disk = parsed
    } catch {
      const cached = getCachedCourseMap(f.tree)
      if (cached) disk = cached
    }
  }
  const chosen = chooseBestCourseMap(disk, synced)
  memMaps.set(f.tree, chosen)
  if (chosen) {
    try { localStorage.setItem(MAP_KEY(f.tree), JSON.stringify(chosen)) } catch { /* ignore */ }
  }
  return chosen
}

const normPath = (p: string) =>
  p
    .replace(/\\/g, '/')
    .replace(/\.(mp4|wav|mp3|pdf|png|webp|gp|gp3|gp4|gp5|gpx)\.\1$/i, '.$1')
    .split('/')
    .map(seg => seg.replace(/\s+/g, ' ').trim().toLowerCase())
    .filter(Boolean)
    .join('/')

function buildFileFinder(files: LFile[]) {
  const exact = new Map<string, LFile>()
  const byName = new Map<string, LFile[]>()
  for (const f of files) {
    const np = normPath(f.path)
    exact.set(np, f)
    const bn = normPath(f.name)
    byName.set(bn, [...(byName.get(bn) ?? []), f])
  }
  return (relPath?: string): LFile | undefined => {
    if (!relPath) return undefined
    const target = normPath(relPath)
    const hit = exact.get(target)
    if (hit) return hit
    // Suffix match in case user picked a parent or child folder
    for (const [k, f] of exact.entries()) {
      if (k === target || k.endsWith('/' + target) || target.endsWith('/' + k)) return f
    }
    const base = target.split('/').pop() ?? target
    const candidates = byName.get(base)
    return candidates?.length === 1 ? candidates[0] : undefined
  }
}

/** Resolve a Folder + optional CourseMap into a ready-to-play ResolvedCourse. */
export function resolveCourse(f: Folder, map?: CourseMap | null): ResolvedCourse {
  const find = buildFileFinder(f.files)

  if (map && map.chapters.length > 0) {
    const outChapters: ResolvedChapter[] = []
    const allLessons: ResolvedLesson[] = []

    for (const ch of map.chapters) {
      const resolvedLessons: ResolvedLesson[] = []
      const chTabs: LFile[] = []
      const seenTabUris = new Set<string>()
      const addTab = (lf: LFile) => {
        if (!seenTabUris.has(lf.uri)) {
          seenTabUris.add(lf.uri)
          chTabs.push(lf)
        }
      }

      for (const ls of ch.lessons) {
        const video = find(ls.video)
        if (!video) continue

        let pdf: PdfRef | undefined
        if (ls.pdf) {
          const pf = find(ls.pdf)
          if (pf) {
            const sp = Math.max(1, ls.startPage ?? 1)
            const ep = Math.max(sp, ls.endPage ?? sp)
            pdf = { file: pf, label: niceName(pf.name), startPage: sp, endPage: ep }
            addTab(pf)
          }
        }

        const extraPdfs: PdfRef[] = []
        for (const epDef of ls.extraPdfs ?? []) {
          const pf = find(epDef.path)
          if (pf) {
            const sp = Math.max(1, epDef.startPage ?? 1)
            const ep = Math.max(sp, epDef.endPage ?? sp)
            extraPdfs.push({ file: pf, label: epDef.label || niceName(pf.name), startPage: sp, endPage: ep })
            addTab(pf)
          }
        }

        const images: FileRef[] = []
        for (const imDef of ls.images ?? []) {
          const imf = find(imDef.path)
          if (imf) {
            images.push({ file: imf, label: imDef.label || niceName(imf.name) })
            addTab(imf)
          }
        }

        const backings: FileRef[] = []
        for (const bkDef of ls.backings ?? []) {
          const bkf = find(bkDef.path)
          if (bkf) backings.push({ file: bkf, label: bkDef.label || niceName(bkf.name) })
        }

        const gpTabs: FileRef[] = []
        for (const gpDef of ls.gpTabs ?? []) {
          const gpf = find(gpDef.path)
          if (gpf) {
            gpTabs.push({ file: gpf, label: gpDef.label || niceName(gpf.name) })
            addTab(gpf)
          }
        }

        const defaultView: 'pdf' | 'image' | 'video' =
          ls.defaultView === 'image' && images.length > 0
            ? 'image'
            : ls.defaultView === 'pdf' && pdf
              ? 'pdf'
              : images.length > 0 && !pdf
                ? 'image'
                : pdf
                  ? 'pdf'
                  : 'video'

        const resolved: ResolvedLesson = {
          id: ls.id,
          title: ls.title || niceName(video.name),
          chapterId: ch.id,
          chapterTitle: ch.title,
          video,
          pdf,
          extraPdfs,
          images,
          backings,
          gpTabs,
          chapterTabs: chTabs,
          defaultView,
          tuning: ls.tuning,
          hint: ls.hint,
          topics: ls.topics,
          clips: ls.clips,
        }
        resolvedLessons.push(resolved)
        allLessons.push(resolved)
      }

      if (resolvedLessons.length > 0) {
        outChapters.push({
          id: ch.id,
          title: ch.title,
          lessons: resolvedLessons,
          tabs: chTabs,
        })
      }
    }

    if (allLessons.length > 0) {
      return {
        title: map.title || f.name,
        instructor: map.instructor,
        description: map.description,
        hasMap: true,
        chapters: outChapters,
        lessons: allLessons,
      }
    }
  }

  // ---- Automatic smart fallback for any unmapped course folder ----
  const rawChapters = chapters(f.files)
  // Check for a root-level master PDF book (e.g. "book.pdf" or "songbook.pdf" sitting at the top of the folder)
  const rootPdfs = f.files.filter(x => kindOf(x) === 'pdf' && !x.path.includes('/'))
  const masterPdf = rootPdfs.length === 1 ? rootPdfs[0] : rootPdfs.find(x => /book|guide|master|complete/i.test(x.name))

  const outChapters: ResolvedChapter[] = []
  const allLessons: ResolvedLesson[] = []

  for (const rc of rawChapters) {
    const chPdfs = rc.tabs.filter(t => kindOf(t) === 'pdf')
    const chImgs = rc.tabs.filter(t => kindOf(t) === 'image')
    const chGps = rc.tabs.filter(t => kindOf(t) === 'gp' || kindOf(t) === 'text')
    const chAudios = rc.other

    const lessons: ResolvedLesson[] = rc.videos.map((v, idx) => {
      const vNum = leadingNum(v.name)
      const vWords = sigWords(v.name)

      // Match sibling images by leading number or keywords (or if only 1 video and images exist)
      const matchedImgs = chImgs.filter(im =>
        (rc.videos.length === 1) ||
        (vNum !== null && leadingNum(im.name) === vNum) ||
        wordOverlap(vWords, sigWords(im.name)) >= 2
      )

      // Match sibling PDFs in the chapter
      const matchedPdfs = chPdfs.filter(pf =>
        (chPdfs.length === 1 && rc.videos.length <= 3) ||
        (vNum !== null && leadingNum(pf.name) === vNum) ||
        wordOverlap(vWords, sigWords(pf.name)) >= 2
      )
      const primaryPdfFile = matchedPdfs[0] ?? (chPdfs.length === 1 ? chPdfs[0] : masterPdf)
      const pdf: PdfRef | undefined = primaryPdfFile
        ? { file: primaryPdfFile, label: niceName(primaryPdfFile.name), startPage: 1, endPage: 1 }
        : undefined

      // Match sibling backing tracks
      const matchedAudios = chAudios.filter(au =>
        (chAudios.length <= 2) ||
        (vNum !== null && leadingNum(au.name) === vNum) ||
        wordOverlap(vWords, sigWords(au.name)) >= 1
      )

      // Match sibling GP/text tabs
      const matchedGps = chGps.filter(gp =>
        (chGps.length === 1) ||
        (vNum !== null && leadingNum(gp.name) === vNum) ||
        wordOverlap(vWords, sigWords(gp.name)) >= 1
      )

      const defaultView: 'pdf' | 'image' | 'video' =
        matchedImgs.length > 0 ? 'image' : pdf ? 'pdf' : 'video'

      return {
        id: `${rc.id}:${idx}`,
        title: niceName(v.name),
        chapterId: rc.id,
        chapterTitle: rc.title,
        video: v,
        pdf,
        extraPdfs: matchedPdfs.slice(1).map(pf => ({ file: pf, label: niceName(pf.name), startPage: 1, endPage: 1 })),
        images: matchedImgs.map(im => ({ file: im, label: niceName(im.name) })),
        backings: matchedAudios.map(au => ({ file: au, label: niceName(au.name) })),
        gpTabs: matchedGps.map(gp => ({ file: gp, label: niceName(gp.name) })),
        chapterTabs: rc.tabs,
        defaultView,
      }
    })

    if (lessons.length > 0) {
      outChapters.push({ id: rc.id, title: rc.title, lessons, tabs: rc.tabs })
      allLessons.push(...lessons)
    }
  }

  return {
    title: f.name,
    hasMap: false,
    chapters: outChapters,
    lessons: allLessons,
  }
}

function leadingNum(name: string): number | null {
  const m = name.match(/(?:^|lesson\s+|exercise\s+|exercices?\s+|lick\s+)0*(\d+)/i)
  return m ? Number(m[1]) : null
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'roy', 'ziv', 'paul', 'davids', 'music', 'lesson', 'tab', 'tabs', 'mp4', 'pdf'])
function sigWords(name: string): string[] {
  return niceName(name)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
}

function wordOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setB = new Set(b)
  return a.filter(w => setB.has(w)).length
}

// ---- Per-lesson Pinned PDF Page override (`📌 Pin Page`) ----
export interface PinnedPage {
  pdfUri?: string
  startPage: number
  endPage: number
  at: number
}
const PIN_KEY = 'kg:coursePins'

function allPins(): Record<string, PinnedPage> {
  try { return JSON.parse(localStorage.getItem(PIN_KEY) ?? '{}') as Record<string, PinnedPage> } catch { return {} }
}

export function getPinnedPage(videoUri: string): PinnedPage | null {
  return allPins()[videoUri] ?? null
}

export function setPinnedPage(videoUri: string, pin: Omit<PinnedPage, 'at'> | null) {
  const all = allPins()
  if (!pin) delete all[videoUri]
  else all[videoUri] = { ...pin, at: Date.now() }
  try { localStorage.setItem(PIN_KEY, JSON.stringify(all)) } catch { /* ignore */ }
}

// ---- Per-lesson BPM & Quick Practice Note memory ----
export interface LessonNote {
  bpm?: number
  targetBpm?: number
  note?: string
  updated: number
}
const NOTE_KEY = 'kg:courseNotes'

function allNotes(): Record<string, LessonNote> {
  try { return JSON.parse(localStorage.getItem(NOTE_KEY) ?? '{}') as Record<string, LessonNote> } catch { return {} }
}

export function getLessonNote(videoUri: string): LessonNote {
  return allNotes()[videoUri] ?? { updated: 0 }
}

export function setLessonNote(videoUri: string, patch: Partial<Omit<LessonNote, 'updated'>>): LessonNote {
  const all = allNotes()
  const next: LessonNote = { ...(all[videoUri] ?? {}), ...patch, updated: Date.now() }
  all[videoUri] = next
  try { localStorage.setItem(NOTE_KEY, JSON.stringify(all)) } catch { /* ignore */ }
  return next
}
