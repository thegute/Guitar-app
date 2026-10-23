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
- `src/screens/PlayScreen.tsx` (main), `SongsSheet.tsx` (find / upload / paste / library), plus Jam (progressions), Chords, Scales, Tempo (metronome), Tuner.
- `src/tabs/`: `model.ts` (Song model: strings 0 = lowest, midi includes capo), `textTab.ts` (ASCII tab parser incl. chord lines, techniques, rhythm from spacing),
  `gpImport.ts` (alphaTab importer only, lazy-loaded), `follow.ts` (NoteListener onset + pitch, matchNote), `harmony.ts` (chord parsing/guessing, timeline, voice leading, triads, walks, chord scales),
  `keyDetect.ts` (Krumhansl–Kessler), `library.ts` (IndexedDB + YouTube link parsing), `examples.ts`.
- `src/audio/`: `engine.ts` (shared AudioContext), `pluck.ts` (Karplus–Strong), `tabPlayer.ts`, `metronome.ts`, `pitch.ts` (tuner), `input.ts` (input device choice: auto / phone mic / USB).
- `src/components/`: `TabView.tsx` (SVG tab renderer), `Fretboard.tsx` (roles root/chord/scale/next/common/pass/target/live), `HarmonyPanel.tsx`, `YouTubePlayer.tsx`, `InputPicker.tsx`.
- Design tokens in `src/styles.css` (rosewood / pearl / amber / jewel / strobe). Bottom nav under 760 px, side rail above.

## Build and release
- Every push to `main` runs `.github/workflows/android.yml`: builds a signed release APK and publishes GitHub release `build-N` (`KGuitar-N.apk`).
- The signing keystore is committed on purpose (`android/app/kguitar-personal.keystore`, personal sideloaded app) so updates install over each other. Never commit any other secrets.
- `gh` GraphQL may be blocked in Claude's sandbox: use `gh api` REST calls to check runs and releases.

## Testing
- `npm test`: logic tests (tab parsing, GP import round trip, chords, follow matching).
- Browser test with a synthesized guitar as the fake mic: see `tests/README.md`. Check all four screen sizes, no horizontal overflow, no page errors.

## Ideas not done yet
Drum tracks and a looper synced to drums/metronome; Android share target (share a tab from the browser straight into KGuitar);
tempo sync between YouTube and the tab; loop a range of bars in the tab; polyphonic chord detection.

## Working with the owner
Explain things plainly: a guitarist, not a developer. Ask before deleting anything on their computer.
Tab search opens Songsterr / Ultimate Guitar / Google in the browser (their APIs are private), then the GP file is uploaded or the text pasted.
