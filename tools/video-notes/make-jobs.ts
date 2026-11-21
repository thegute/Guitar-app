// Writes tools/video-notes/jobs.json: every course video with the prompt Gemini gets for it (from src/course/videoNotesCore.ts).
// npx -y esbuild@0.25 tools/video-notes/make-jobs.ts --bundle --platform=node --format=esm --outfile=node_modules/.tmp/vn-jobs.mjs && node node_modules/.tmp/vn-jobs.mjs
import '../../tests/test-env'
import { writeFileSync } from 'node:fs'
import { courseVideos, notePrompt } from '../../src/course/videoNotesCore'

const jobs = courseVideos().map(v => ({ ...v, prompt: notePrompt(v) }))
writeFileSync('tools/video-notes/jobs.json', JSON.stringify({ made: new Date().toISOString(), jobs }, null, 1))
console.log(`${jobs.length} video jobs (${new Set(jobs.map(j => j.id)).size} different videos)`)
