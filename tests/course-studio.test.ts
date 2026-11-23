import assert from 'node:assert/strict'
import {
  getLessonNote,
  getPinnedPage,
  resolveCourse,
  setLessonNote,
  setPinnedPage,
  type CourseMap,
} from '../src/lessons/courseMap'
import { detectVideoSignature } from '../src/lessons/mpegtsFallback'
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

// 4. Local video container signature detection (Roy Ziv MPEG-TS disguised as .mp4, M2TS, MP4/MOV, MKV, AVI)
{
  // Standard 188-byte MPEG-TS at offset 0 (Roy Ziv Modes Navigator style)
  const ts = new Uint8Array(600)
  ts[0] = 0x47
  ts[188] = 0x47
  ts[376] = 0x47
  assert.equal(detectVideoSignature(ts).kind, 'mpegts')

  // Offset MPEG-TS (e.g. after 64 bytes of ID3/padding)
  const tsOff = new Uint8Array(600)
  tsOff[64] = 0x47
  tsOff[64 + 188] = 0x47
  tsOff[64 + 376] = 0x47
  assert.equal(detectVideoSignature(tsOff).kind, 'mpegts')

  // 192-byte Blu-ray / camcorder M2TS (4-byte timestamp + 0x47 sync byte)
  const m2ts = new Uint8Array(600)
  m2ts[4] = 0x47
  m2ts[4 + 192] = 0x47
  m2ts[4 + 384] = 0x47
  assert.equal(detectVideoSignature(m2ts).kind, 'm2ts')

  // Standard ISO MP4 (ftypisom)
  const mp4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0])
  assert.deepEqual(detectVideoSignature(mp4), { kind: 'mp4', brand: 'isom' })

  // QuickTime MOV (ftypqt  )
  const mov = new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20, 0, 0, 0, 0])
  assert.deepEqual(detectVideoSignature(mov), { kind: 'mp4', brand: 'qt' })

  // Matroska MKV (EBML header)
  const mkv = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42])
  assert.equal(detectVideoSignature(mkv).kind, 'mkv')

  // RIFF AVI
  const avi = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20])
  assert.equal(detectVideoSignature(avi).kind, 'avi')
}

import { INSTRUMENTS } from '../src/instrument'
import { noteToMidi } from '../src/theory/notes'
import { extractTabFromAiReply } from '../src/scan/aiTabRead'

// 5. AI Vision tab transcription extractor (code fences, double-digit frets, BPM, unicode dashes, garbage rejection)
{
  const def = INSTRUMENTS.guitar
  const guitarInst = { ...def, tuning: def.tunings[0], midis: def.tunings[0].notes.map(noteToMidi), isUke: false }
  const reply = [
    'BPM: 108',
    '```tab',
    'e|---------10-12-14-|',
    'B|----10-12---------|',
    'G|--11--------------|',
    'D|------------------|',
    'A|------------------|',
    'E|------------------|',
    '```',
  ].join('\n')
  const doc = extractTabFromAiReply(reply, guitarInst, 'Exercise 1 (p.4)')
  assert.ok(doc, 'parses fenced AI Vision tab reply')
  assert.equal(doc!.song.tempo, 108)
  const frets = doc!.song.tracks[0].bars.flatMap(b => b.steps.flatMap(st => st.notes.map(n => n.fret)))
  assert.deepEqual(frets, [11, 10, 12, 10, 12, 14])
  assert.equal(extractTabFromAiReply('Sorry, I cannot read this image.', guitarInst, 'Empty'), null)
}

console.log('course studio map, persistence, video signatures & AI tab reader: ok')
