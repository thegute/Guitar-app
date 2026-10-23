# KGuitar: project brief

A personal guitar practice app for its owner (one user, sideloaded), built as an Android app (Capacitor) plus web version.
Main phone: **Samsung Galaxy Z Fold 8** (cover screen ~412 dp wide, inner screen ~840 × 757 dp).
Electric guitar goes through a **Sonicake Amphonix 2** headphone amp (USB-C, USB Audio 2.0 class compliant) into the phone;
acoustic guitar uses the phone mic. Keep both working.

## What matters most
The **Play** screen (play-along) is the heart of the app. Everything else supports it:
- Load a tab (Guitar Pro file, pasted/uploaded text tab or chord sheet, shared from another app, examples), saved on the phone with its YouTube link and chord edits.
- YouTube mini player beside the tab (speed, A–B loop, Sync with tab). Error 101/150/152/153 means the owner blocks embedding: offer "Open in YouTube".
- The mic (or USB amp) listens; each correct note lights up green and the cursor moves to the next one. Wrong notes say what was played and what the tab wants.
- Two modes: Wait for me (follow) and In time (tab scrolls at tempo or with the synced video; perfect ≤45 ms, good ≤90 ms, else early/late; speed trainer).
  Chord-sheet steps (3+ pitch classes) are judged by chroma (strum-along).
- Tab numbers can show the note name too (fret / note / both). Tapping a note plays it and names it.
- "Hear it" plays the tab back (recorded samples, Karplus–Strong fallback) while the playhead moves.
- Scales & chords panel: detected key, solo scales, chord progression (from the tab, guessed, or edited),
  and the fretboard in Scale / Arpeggio / Triads / Connect (voice leading + a numbered walk into the next chord) modes.

## Stack and layout
- Vite + React 19 + TypeScript, Capacitor 8 (`app.kguitar`), fonts Barlow Condensed / Semi Condensed.
- Four tabs: Play, Learn, Jam, Tools (`ToolsScreen.tsx` switches Tuner / Tempo / Chords / Scales). `src/nav.ts`: `go(Destination)` takes a tab or a tool page.
- `src/screens/PlayScreen.tsx` (main; follow-along, play in time, section loop with pass scores, Hear it, split/tabletop layout, tab zoom, pedals),
  `SongsSheet.tsx` (find / upload / paste / library, per-song progress), `JamScreen.tsx` (progression generator with chord diagrams, strum + drum backing,
  looper recording, circle of fifths), Chords, Scales, Tempo (metronome), Tuner.
- `src/play/`: `inTime.ts` (timeline, judge, scoreRun, nextSpeed, InternalClock, VideoClock, matchTimed), `useInTime.ts`, `songStats.ts`
  (runs, trouble bars, learned at a 90%+ full run at ≥0.75 speed, reviews after 3/7/14/30/60 days), `fold.ts` (Viewport Segments → tabletop).
- Jam engine: `src/theory/progressions.ts` (22 styles, chord colours, endings, spice incl. secondary dominants / tritone subs / passing dim / chromatic mediants),
  `src/audio/jam.ts` (JamTransport: one clock for chords, drums, click and loop layers), `strums.ts`, `drums.ts` (synth kit + grooves),
  `looper.ts` (AudioWorklet recorder stamped with context frames, latency compensation + timing check). Recordings are exactly one loop long and start on the loop's first beat.
- `src/tabs/`: `model.ts` (Song model: strings 0 = lowest, midi includes capo), `textTab.ts` (ASCII tab parser incl. chord lines, techniques, rhythm from spacing),
  `gpImport.ts` (alphaTab importer only, lazy-loaded), `follow.ts` (NoteListener onset + pitch, matchNote), `harmony.ts` (chord parsing/guessing, timeline, voice leading, triads, walks, chord scales),
  `keyDetect.ts` (Krumhansl–Kessler), `library.ts` (IndexedDB + YouTube link parsing), `examples.ts`, `chordSheet.ts` (chords over lyrics → one chord per bar
  with shape + lyric + section), `importer.ts` (text → tab or chord sheet; files incl. GP).
- `src/audio/`: `engine.ts` (shared AudioContext), `pluck.ts` (sample banks in `public/samples/<id>/` from `tools/make-samples.py`, Karplus–Strong fallback),
  `tabPlayer.ts`, `metronome.ts`, `pitch.ts` (tuner), `input.ts` (input device choice: auto / phone mic / USB), `gear.ts` (per-input profile: gate + latency,
  set by `components/GearSetup.tsx`), `chroma.ts`.
- `src/controls/pedals.ts` (keyboard / Bluetooth page-turner and Web MIDI → actions; the top-most screen gets them), `src/backup.ts` (JSON of `kg:*` storage + songs;
  Filesystem + Share on Android, download on the web), `src/shareIn.ts` + native `ShareInPlugin.java` (Android SEND intents: text, files, YouTube links).
- `src/components/`: `TabView.tsx` (SVG tab renderer), `Fretboard.tsx` (roles root/chord/scale/next/common/pass/target/live), `HarmonyPanel.tsx`, `YouTubePlayer.tsx`, `InputPicker.tsx`.
- Design tokens in `src/styles.css`: theme roles `--bg --surface --ink --accent --gold --mint --coral --hero` for day / night / auto (`src/theme.ts`);
  old names (rosewood / pearl / amber / jewel / strobe) are aliases. Fretboard colours are fixed `--fb-*`. Bottom nav (4 tabs) under 760 px, side rail above.
- Works on any Android 7+ phone or tablet; check small phone 360 px, Fold cover/inner and 12" tablet portrait/landscape.

## Build and release
- Every push to `main` runs `.github/workflows/android.yml`: builds a signed release APK and publishes GitHub release `build-N` (`KGuitar-N.apk`).
- The signing keystore is committed on purpose (`android/app/kguitar-personal.keystore`, personal sideloaded app) so updates install over each other. Never commit any other secrets.
- `gh` GraphQL may be blocked in Claude's sandbox: use `gh api` REST calls to check runs and releases.

## Testing
- `npm test`: logic tests (tab parsing, GP import round trip, chords, follow matching, Jam engine, practice tabs, Learn, build 6: chord sheets, in time,
  song stats, gear, pedals, backup). `tests/test-env.ts` stubs browser globals for tests that import app modules.
- Browser tests (play, jam, learn, build6) with a synthesized guitar as the fake mic: see `tests/README.md`. Check cover and inner sizes, day and night, no horizontal overflow, no page errors.
- Never give two files names that differ only by case (breaks macOS and esbuild).

## Learn tab (src/learn/)
- `LearnScreen.tsx` hub: Today card (pick-shaped goal ring, streak + freezes, week strip, level/XP, "I'm away from my guitar" switch),
  today's plan (`plan.ts`, guitar vs away), daily quests, practice course, path to mastery (`path.ts`, 7 stages of self-checking goals), tools.
- `progress.ts` (day logs, streak: any 5 minutes counts, with or without the guitar; away mode auto-off after 30 h; Leitner spaced repetition; stars;
  `usePracticeTimer`, `bump`/`bumpCounts`), `game.ts` (XP/levels, freezes every 7 days, quests, badges, celebrations), `reminders.ts` (local notifications,
  14 days ahead + optional streak saver, skipped once today counts; icon `drawable/ic_stat_kguitar.xml`).
- `quiz.ts` + `QuizRunner.tsx` (tap or play mode), `EarTrainer.tsx` + `audio/drone.ts` (Sonofield-style drone degrees), `caged.ts` + `CagedExplorer.tsx`
  (shapes adjusted per string for non-standard tunings), `lessons.ts` + `LessonReader.tsx` (original text following Offtonic Theory's chapters, with links;
  never copy Offtonic's text), `Tools.tsx` (chord changes with optional chroma counting, rhythm trainer, circle of fifths), `ProgressView.tsx`, `Settings.tsx`
  (instrument switch always asks "Are you sure…"), `Celebration.tsx`.
- Counters other screens feed: notesHit, songNotes, exerciseNotes, songsFinished, loop90 (Play), loopsRecorded (Jam), plus timers in Play/Jam/Tuner.
- `src/nav.ts`: `go(tab)` and `openInPlay(doc)` for cross-screen links.
- `guide.ts` + `GuideScreen.tsx` ("How to use KGuitar", every feature with Show me links) and `components/Welcome.tsx` (first launch: instrument, input setup,
  goal, reminders; skipped for existing users; `kg:welcomed`). Keep the guide up to date when features change: the owner's brother learns the app from it.
- Songs are kept in per-instrument banks (`SongDoc.inst`, `docInstrument()` sorts older songs by tuning); Play remembers the last song per instrument.
- App art: the owner's own illustration `art/kguitar-art.jpg` (ukiyo-e psychedelic chocolate-lab samurai with a neon Strat and katana).
  `node art/from-image.cjs art/kguitar-art.jpg 0.483 0.27 1.85` makes the launcher icons (picture as the adaptive background), Android 12+ `splash_icon`,
  WebP splash screens, web icons and `public/art.jpg` (welcome screen, guide). Previews in `art/preview/`.

## Ideas not done yet
Left-handed mode, automatic tempo detection from the video, per-note polyphonic transcription (chords are judged by chroma only), cloud sync between devices.

## Working with the owner
Explain things plainly: a guitarist, not a developer. Ask before deleting anything on their computer.
Tab search opens Songsterr / Ultimate Guitar / Google in the browser (their APIs are private), then the GP file is uploaded or the text pasted.
