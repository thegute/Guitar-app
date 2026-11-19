import assert from 'node:assert/strict'
import {
  getLessonNote,
  getPinnedPage,
  resolveCourse,
  setLessonNote,
  setPinnedPage,
  type CourseMap,
} from '../src/lessons/courseMap'
import type { Folder, LFile } from '../src/lessons/folders'

// Mock localStorage in Node test env
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size },
}

const mkFile = (path: string, mime = 'application/octet-stream'): LFile => ({
  path,
  name: path.split('/').pop()!,
  mime,
  size: 1024,
  modified: 0,
  uri: `content://test/course/${encodeURIComponent(path)}`,
})

// 1. Mapped course resolution (Acoustic Adventure + Hexatonic style)
{
  const folder: Folder = {
    tree: 'content://test/aa',
    name: 'Paul Davids - Acoustic Adventure',
    scanned: 0,
    files: [
      mkFile('paul davids acoustic adventure book.pdf', 'application/pdf'),
      mkFile('01 Flatpicker Saloon/01. Walk in the park blues.mp4', 'video/mp4'),
      mkFile('01 Flatpicker Saloon/Flatpicking - 7 - String Skippin.mp4', 'video/mp4'),
      mkFile('04 Fingerpicking Lounge/Fingerpicking - Lesson 3 - Drop D fingerpicking - Lvl. 1.mp4', 'video/mp4'),
      mkFile('04 Fingerpicking Lounge/ex1.png', 'image/png'),
      mkFile('04 Fingerpicking Lounge/track1.mp3', 'audio/mpeg'),
      mkFile('04 Fingerpicking Lounge/ex1.gp', 'application/octet-stream'),
    ],
  }

  const map: CourseMap = {
    version: 1,
    title: 'Paul Davids — Acoustic Adventure',
    instructor: 'Paul Davids',
    chapters: [
      {
        id: '01',
        title: '01 · Flatpickers Saloon',
        lessons: [
          {
            id: 'aa-01-01',
            title: '1. Walk in the Park Blues',
            video: '01 Flatpicker Saloon/01. Walk in the park blues.mp4',
            pdf: 'paul davids acoustic adventure book.pdf',
            startPage: 3,
            endPage: 3,
            defaultView: 'pdf',
          },
          {
            id: 'aa-01-07',
            title: '7. String Skippin',
            video: '01 Flatpicker Saloon/Flatpicking - 7 - String Skippin.mp4',
            pdf: 'paul davids acoustic adventure book.pdf',
            startPage: 9,
            endPage: 10,
            defaultView: 'pdf',
          },
        ],
      },
      {
        id: '04',
        title: '04 · Fingerpicking Lounge',
        lessons: [
          {
            id: 'aa-04-03',
            title: '3. Drop D Fingerpicking Level 1',
            video: '04 Fingerpicking Lounge/Fingerpicking - Lesson 3 - Drop D fingerpicking - Lvl. 1.mp4',
            pdf: 'paul davids acoustic adventure book.pdf',
            startPage: 23,
            endPage: 24,
            images: [{ path: '04 Fingerpicking Lounge/ex1.png', label: 'Tab 1' }],
            backings: [{ path: '04 Fingerpicking Lounge/track1.mp3', label: 'Drop D Backing' }],
            gpTabs: [{ path: '04 Fingerpicking Lounge/ex1.gp', label: 'Drop D GP' }],
            defaultView: 'image',
            tuning: 'Drop D',
          },
        ],
      },
    ],
  }

  const resolved = resolveCourse(folder, map)
  assert.equal(resolved.hasMap, true)
  assert.equal(resolved.lessons.length, 3)
  assert.equal(resolved.lessons[0].pdf?.startPage, 3)
  assert.equal(resolved.lessons[0].pdf?.endPage, 3)
  assert.equal(resolved.lessons[1].pdf?.startPage, 9)
  assert.equal(resolved.lessons[1].pdf?.endPage, 10)
  assert.equal(resolved.lessons[2].tuning, 'Drop D')
  assert.equal(resolved.lessons[2].defaultView, 'image')
  assert.equal(resolved.lessons[2].images.length, 1)
  assert.equal(resolved.lessons[2].backings.length, 1)
  assert.equal(resolved.lessons[2].gpTabs.length, 1)
}

// 2. Automatic smart fallback for unmapped courses
{
  const folder: Folder = {
    tree: 'content://test/unmapped',
    name: 'Unmapped Course',
    scanned: 0,
    files: [
      mkFile('Master_Book.pdf', 'application/pdf'),
      mkFile('1. Chapter One/1. Exercise 1.mp4', 'video/mp4'),
      mkFile('1. Chapter One/1. Exercise 1.png', 'image/png'),
      mkFile('1. Chapter One/1. Backing.wav', 'audio/wav'),
      mkFile('1. Chapter One/2. Exercise 2.mp4', 'video/mp4'),
    ],
  }
  const resolved = resolveCourse(folder, null)
  assert.equal(resolved.hasMap, false)
  assert.equal(resolved.lessons.length, 2)
  assert.equal(resolved.lessons[0].images.length, 1)
  assert.equal(resolved.lessons[0].defaultView, 'image')
  assert.equal(resolved.lessons[0].pdf?.file.name, 'Master_Book.pdf')
  assert.equal(resolved.lessons[1].defaultView, 'pdf')
}

// 3. Pinned page override & lesson BPM/Note memory
{
  const uri = 'content://test/video/1'
  assert.equal(getPinnedPage(uri), null)
  setPinnedPage(uri, { startPage: 15, endPage: 16 })
  assert.equal(getPinnedPage(uri)?.startPage, 15)
  assert.equal(getPinnedPage(uri)?.endPage, 16)
  setPinnedPage(uri, null)
  assert.equal(getPinnedPage(uri), null)

  setLessonNote(uri, { bpm: 95, note: 'Clean on bar 4' })
  assert.equal(getLessonNote(uri).bpm, 95)
  assert.equal(getLessonNote(uri).note, 'Clean on bar 4')
}

console.log('course studio map & persistence: ok')
