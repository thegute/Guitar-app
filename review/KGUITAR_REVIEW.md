# KGuitar: full review guide (for an outside reviewer such as Gemini)

You are reviewing **KGuitar**, a personal guitar-practice app built for one person (the owner, an intermediate guitarist).
This package has everything needed to understand it without running it:

1. **This guide**: what the app is for, every screen, how the main algorithms work, how data is stored, how it's tested, the rules it
   follows, what's known to be weak, and the questions the owner would most like a second opinion on.
2. **Every feature in the owner's words**: the in-app manual ("How to use KGuitar"), appended at the end of this file by the packer.
3. **The project brief and change lists**: `CLAUDE.md` (the developer brief), `notes/next-build.md` (each change waiting for release),
   `notes/HANDOFF.md` (current state and the work queue), all appended.
4. **The complete source code** in `KGuitar-source-1.txt` / `-2.txt` (each file headed with its path).
5. **Screenshots** of the screens (`screens-*.jpg`), taken by the automated browser tests on the Fold phone sizes and in the three looks.

Please review it as a senior engineer, music-technology specialist and guitar teacher would: correctness of the music theory and the
audio maths, accuracy of the listening features, timing, the learning design, the user experience on a phone, code quality and
architecture, performance, and anything missing that a serious practice app should have. Concrete, prioritised suggestions with file
names are the most useful.

---

## 1. Who it's for and where it runs

- One user, sideloaded Android app (Capacitor 8 wrapping a React 19 + TypeScript + Vite web app) plus the same app on the web.
- Main phone: Samsung Galaxy Z Fold 8 (cover screen ~412 dp wide, inner ~840 × 757 dp). Also a Galaxy Tab S10+. Works from 360 px phones
  to 12" tablets; layouts change at 760 px (bottom tabs below, side rail above) and for the Fold's tabletop posture.
- Guitar input: an electric guitar through a Sonicake Pocket Master multi-effects pedal used as a USB audio interface (44.1 kHz/16-bit),
  often with a Spark NEO wireless in its output (mono); an acoustic guitar through the phone mic. Footswitch: M-Vave Chocolate Plus
  (4 buttons, short and long press) as a Bluetooth page turner / MIDI.
- Three looks: Day, Night and Psychedelic (the default; built from the owner's own artwork of his chocolate lab, Brandy, as a samurai).

## 2. The five tabs and what each does

**Play (the heart of the app).** Load a tab (Guitar Pro file, pasted text tab or chord sheet, a PDF, a screenshot, shared from another app,
Songsterr / Ultimate Guitar on the phone, the songbook, generated tabs). The tab is drawn as SVG (fret / note name / both). The mic or
USB input listens: in **Wait for me** the cursor waits for each correct note (wrong notes say what was played vs what the tab wants); in
**In time** the tab scrolls at tempo or with a synced YouTube video and each note is judged perfect (≤45 ms) / good (≤90 ms) / early /
late; chord sheets are judged by chroma (strum-along). **Game** turns the tab into a Yousician-style highway with finger colours, a ball,
score with a 3×→5× multiplier, stars per part, best-of-parts, "Perfect it" and Auto speed. Also: section loop with pass scores, Hear it
(recorded guitar samples), speed trainer, music-stand view, report card after a run with trouble bars, "I played it right" (teaches the
detector), Then vs now recordings, the floating "Where your fingers go" hand box, Scales & chords panel (key, solo scales, chord
progression, 5-layer fretboard: shape / triads / pentatonic / mode notes / free fingers, voice leading), YouTube mini player with speed,
A–B loop, tap-to-sync and automatic sync.

**Songs.** My songs (per instrument), Songbook (~50 folk / bluegrass / reggae / classical / originals at 4 levels, public-domain or
original only), Practice (exercises ~800, licks, picking patterns, Tab maker), Add a song (files, paste, PDF, pictures, site search).

**Learn.** Today (goal ring, streak, plan, quests, Practice button that plans 10/20/30 minutes), Course (Zero to Hero phases with gates
and teacher videos, style paths, theory lessons with Read / Watch / Play), Explore (quizzes in tap or play mode, ear trainer with drones,
CAGED explorer, technique lessons, bend trainer, rhythm trainer, chord changes, circle of fifths, My recordings, progress, settings).

**Jam.** Progression generator (22+ styles, chord colours, spice: secondary dominants, tritone subs, passing diminished, chromatic
mediants) with strum + drums + bass backing; Solo over it (scales on the neck, voice leading, circle); Make a tab (the composer: licks &
solos, riffs, chord melody, fingerpicking in 21 artist-based styles); Riff Scanner (scan a video / screenshots / Shorts feed / listen);
Beat maker (Koala-style: pads, banks, sample anything incl. YouTube with stem separation, pitch dial, chop, effects pad, parts A–D, song
chain, step grid, piano roll, bounce/resample, WAV export); **Looper** (4 tracks on the beat clock, parts A/B, overdub, footswitch).

**Tools.** Tuner (octave guard, alternate tunings with plain-words explanations), Tempo (metronome with recorded clicks and drum
grooves), Chords (library, voicings, voice leading, 5-layer neck, double-stops, licks over a chord), Scales.

Everywhere: Ask (search + an AI helper that only picks from the app's own building blocks; Gemini / Groq / OpenRouter free tiers or
paid Claude/ChatGPT; keys stay on the phone; a built-in planner works offline; voice in and out; it knows what's on screen and takes
quick commands), movable/resizable/foldable windows on every screen, backups, reminders, usage counting.

## 3. How the main algorithms work (where to look)

**Note detection while you play** (`src/audio/noteDetect.ts`, `src/tabs/follow.ts`). An AudioWorklet feeds frames to a pure detector:
spectral-flux onsets; harmonic salience with spectral whitening and a true-peak check; an "expected note" check that diffs the
spectrum against the previous frame to hear "what the pick added"; a re-pick rule; an overtone guard; a double-listen before declaring
a wrong note. Per-input gear profiles (noise gate, latency) in `audio/gear.ts`. Chords are judged by chroma templates (`audio/chroma.ts`).
Bench: `npm run test:detect` (recorded samples × noise / phone / distortion).

**Timing** (`src/play/inTime.ts`, `useInTime.ts`). A timeline of expected notes, an internal clock or a video clock, `matchTimed`
pairing heard onsets with due notes, `scoreRun`, `nextSpeed` for the speed trainer.

**Fingering / hand brain** (`src/tabs/fingering.ts`, `play/handShape.ts`). Viterbi over string/fret choices with costs for stretch,
movement, open strings, position; hand positions grouped for the "Where your fingers go" box and finger numbers.

**Tab parsing** (`tabs/textTab.ts` ASCII tabs incl. chord lines, techniques and rhythm from spacing; `tabs/chordSheet.ts` chords over
lyrics; `tabs/gpImport.ts` Guitar Pro via alphaTab; `tabs/pdfTab.ts` pdf.js text layout and drawn staves; `scan/read.ts` AI reading of
pictures).

**Harmony** (`tabs/harmony.ts`, `tabs/keyDetect.ts` Krumhansl–Kessler, `theory/progressions.ts`, `theory/layers.ts`, `learn/caged.ts`).

**The composer** (`src/compose/`): style definitions from the owner's artists, a motif → repeat → develop → cadence line builder with
chord tones on strong beats and approach notes, Viterbi placement with techniques, arrangements (chord melody, fingerstyle with thumb
bass), riffs; best of 24 tries scored by `scoreLine`.

**Riff Scanner** (`src/scan/`). Pictures: tab staves found in screenshots / video frames, cropped, enhanced, read by an AI (Gemini and
Groq race; only a real tab counts). Sound (`scan/soundScan.ts`): beat grid + a quick draft with Basic Pitch (ONNX Runtime), an optional
guitar-note model, an AI second opinion; optional voice removal first. **Known weakness (owner, 2026-11-07): misses many notes from
videos and never detects slides or hammer-ons / pull-offs; the diagnosis and plan are in `notes/HANDOFF.md` item 2: please critique it.**

**Tempo and sync** (`audio/tempo.ts`): onset envelope with exact frame timing, tempo analysis, `alignAnywhere` (windowed search of the
tab against the video's onsets over tempo ±4 % and offsets, coverage-weighted, then a line fit), `play/autoSync.ts`.

**Stem separation** (`src/ml/demucs.ts`, `ml/voice.ts`, Android `MlPlugin.java`). HT-Demucs v4 (4 stems, MIT) as ONNX with our own
STFT / iSTFT (n_fft 4096, hop 1024, reflect padding), 7.8 s segments with 25 % overlap and triangle weights, verified against PyTorch and
by a known-voice SDR test (+12.4 dB). The phone runs it natively and returns half floats (RNE, verified against Java). Next: the 6-stem
model (with a guitar stem) to make backing tracks and clean scans.

**Pitch and time** (`studio/pitchShift.ts`): Signalsmith Stretch (MIT) in an OfflineAudioContext for keep-the-speed pitch shifting and
time-stretching; WSOLA fallback (`studio/loops.ts`).

**The 4-track looper** (`src/looper/`). One shared beat clock (`studio/transport.ts`, look-ahead scheduling on the AudioContext clock).
Every command is armed to the next bar line (with a 120 ms grace that still starts a take on the bar because the input keeps 3 minutes
of history); recording captures from the bar time plus measured latency; loops are scheduled per cycle at exact times; overdubs fold
around the loop; the lead track's loudness curve is pre-computed and drives a gain on the other tracks (ducking); the first free loop
sets the tempo so that a whole number of bars fits exactly; tempo changes stretch every take. Maths in `looper/logic.ts` (tested).

**Game scoring** (`play/game.ts`): perfect 100 / good 60 / early-late 25 / miss 0 points × multiplier (3 + streak/8, max 5);
stars at 50 / 75 / 90 %, gold when every note is on time; best of each part kept per song.

**Audio output** (`audio/engine.ts`, `audio/rig.ts`): one AudioContext; master compressor and soft ceiling; a mono fold at the very end
when the pedal + wireless setup is detected (its 1/4" output only carries the left channel); live guitar input is never processed.

## 4. Data and storage

All on the device: localStorage keys `kg:*` (settings, progress, sessions), IndexedDB for songs (`tabs/library.ts`), pad samples, loops
(`kg-looper`), recordings, models (Cache Storage `kg-models-v1`). Keys for AI / YouTube under `kgx:*`, never in backups. Backup = one JSON of
`kg:*` + songs (`src/backup.ts`). No server, no accounts.

## 5. Testing and release

`npm test` runs ~40 logic suites (parsing, GP round trip, detection matching, Jam engine, game, looper, search, etc.). Browser suites
(Playwright + Chromium with a synthesized guitar as the fake mic) cover every screen at Fold cover/inner and tablet sizes in all three
looks, check for sideways overflow, page errors and real text contrast against what's behind it. CI builds a signed APK on every push to
`main` (release `build-N`) and test pre-releases from the work branch.

## 6. Rules the app follows

No copyrighted songs, tabs or lyrics are shipped (public domain or original only; lyrics only pre-1929). Models trained on
non-commercial data are downloaded from their source on request, never bundled. The owner's own course files are never copied or indexed.
Only "Brandy" is named on screen. The UI uses plain words (the owner is a guitarist, not a developer).

## 7. Questions the owner would like a second opinion on

1. **Riff Scanner accuracy** from YouTube lessons and songs: is the plan in `notes/HANDOFF.md` §2 (guitar stem first, guitar-note model
   with tuned thresholds, beat-grid rhythm with per-beat subdivision, technique detection from pitch contours and onset strength,
   picture-first fusion, a rendered benchmark) the best path? What would you change or add (models, thresholds, post-processing)?
2. **Game Mode** (Yousician-style): what makes the ball, highway and feedback feel right? What's missing for learning real songs?
3. **Backing tracks from YouTube** with the guitar removed (6-stem HT-Demucs on the phone, the video's sound recorded once): any
   better approach on Android?
4. **The note detector** (`noteDetect.ts`): weaknesses with distortion, bends, fast legato, low strings on a phone mic?
5. **Learning design**: are Zero to Hero, the courses and the theory lessons deep enough for an intermediate player aiming for advanced
   (CAGED, modes, intervals, ear training, voicings, soloing, improvising, voice leading)?
6. **UX on a folding phone**: what feels cluttered or confusing? What would make it more intuitive?
7. **Code**: the biggest risks (very large files such as `PlayScreen.tsx`, global state, timing on the audio thread, memory with big
   models), and what to refactor first.
