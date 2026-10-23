# KGuitar: project brief

A personal guitar practice app for its owner (one user, sideloaded), built as an Android app (Capacitor) plus web version.
Main phone: **Samsung Galaxy Z Fold 8** (cover screen ~412 dp wide, inner screen ~840 × 757 dp).
Electric guitar goes through a **Sonicake Amphonix 2** headphone amp (USB-C, USB Audio 2.0 class compliant) into the phone;
acoustic guitar uses the phone mic. Keep both working.

## What matters most
The **Play** screen (play-along) is the heart of the app. Everything else supports it:
- Load a tab (Guitar Pro file, pasted/uploaded text tab, examples), saved on the phone with its YouTube link and chord edits.
- YouTube mini player beside the tab (speed, A–B loop). Error 101/150/152/153 means the owner blocks embedding: offer "Open in YouTube".
- The mic (or USB amp) listens; each correct note lights up green and the cursor moves to the next one. Wrong notes say what was played and what the tab wants.
- Tab numbers can show the note name too (fret / note / both). Tapping a note plays it and names it.
- "Hear it" plays the tab back with the synth while the playhead moves.
- Scales & chords panel: detected key, solo scales, chord progression (from the tab, guessed, or edited),
  and the fretboard in Scale / Arpeggio / Triads / Connect (voice leading + a numbered walk into the next chord) modes.

## Stack and layout
- Vite + React 19 + TypeScript, Capacitor 8 (`app.kguitar`), fonts Barlow Condensed / Semi Condensed.
- `src/screens/PlayScreen.tsx` (main; follow-along, section loop with pass scores, Hear it), `SongsSheet.tsx` (find / upload / paste / library),
  `JamScreen.tsx` (progression generator with chord diagrams, strum + drum backing, looper recording, circle of fifths), Chords, Scales, Tempo (metronome), Tuner.
- Jam engine: `src/theory/progressions.ts` (22 styles, chord colours, endings, spice incl. secondary dominants / tritone subs / passing dim / chromatic mediants),
  `src/audio/jam.ts` (JamTransport: one clock for chords, drums, click and loop layers), `strums.ts`, `drums.ts` (synth kit + grooves),
  `looper.ts` (AudioWorklet recorder stamped with context frames, latency compensation + timing check). Recordings are exactly one loop long and start on the loop's first beat.
- `src/tabs/`: `model.ts` (Song model: strings 0 = lowest, midi includes capo), `textTab.ts` (ASCII tab parser incl. chord lines, techniques, rhythm from spacing),
  `gpImport.ts` (alphaTab importer only, lazy-loaded), `follow.ts` (NoteListener onset + pitch, matchNote), `harmony.ts` (chord parsing/guessing, timeline, voice leading, triads, walks, chord scales),
  `keyDetect.ts` (Krumhansl–Kessler), `library.ts` (IndexedDB + YouTube link parsing), `examples.ts`.
- `src/audio/`: `engine.ts` (shared AudioContext), `pluck.ts` (Karplus–Strong), `tabPlayer.ts`, `metronome.ts`, `pitch.ts` (tuner), `input.ts` (input device choice: auto / phone mic / USB).
- `src/components/`: `TabView.tsx` (SVG tab renderer), `Fretboard.tsx` (roles root/chord/scale/next/common/pass/target/live), `HarmonyPanel.tsx`, `YouTubePlayer.tsx`, `InputPicker.tsx`.
- Design tokens in `src/styles.css`: theme roles `--bg --surface --ink --accent --gold --mint --coral --hero` for day / night / auto (`src/theme.ts`);
  old names (rosewood / pearl / amber / jewel / strobe) are aliases. Fretboard colours are fixed `--fb-*`. Bottom nav (7 tabs) under 760 px, side rail above.

## Build and release
- Every push to `main` runs `.github/workflows/android.yml`: builds a signed release APK and publishes GitHub release `build-N` (`KGuitar-N.apk`).
- The signing keystore is committed on purpose (`android/app/kguitar-personal.keystore`, personal sideloaded app) so updates install over each other. Never commit any other secrets.
- `gh` GraphQL may be blocked in Claude's sandbox: use `gh api` REST calls to check runs and releases.

## Testing
- `npm test`: logic tests (tab parsing, GP import round trip, chords, follow matching, Jam engine, practice tabs, Learn).
- Browser tests (play, jam, learn) with a synthesized guitar as the fake mic: see `tests/README.md`. Check cover and inner sizes, day and night, no horizontal overflow, no page errors.
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
- Songs are kept in per-instrument banks (`SongDoc.inst`, `docInstrument()` sorts older songs by tuning); Play remembers the last song per instrument.
- App icon: original art drawn in code (`art/icon.py` → `art/render.cjs`): psychedelic chocolate lab + guitar on a sunburst. Inspired by, never copied from, any band's artwork.

## Ideas not done yet
Android share target (share a tab from the browser straight into KGuitar), YouTube/tab tempo sync, polyphonic chord detection in Play, left-handed mode,
progress backup/export.

## Working with the owner
Explain things plainly: a guitarist, not a developer. Ask before deleting anything on their computer.
Tab search opens Songsterr / Ultimate Guitar / Google in the browser (their APIs are private), then the GP file is uploaded or the text pasted.
