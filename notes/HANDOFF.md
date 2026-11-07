# KGuitar handoff: START HERE in a new chat

Last updated 2026-11-07 (end of the "big update" chat). Read this whole file, then `CLAUDE.md` (the project brief, loaded
automatically), then `notes/next-build.md` (every change waiting for "ship it", with checkpoints), then
`notes/blueprint-decisions.md` and `notes/blueprint-part1.txt` / `part2.txt` (the owner's master blueprint, full text).
Nothing important lives only in the old chat: if a detail isn't in these files or the code, it doesn't exist yet.

## Where things stand
- Repo github.com/thegute/Guitar-app, local clone /home/claude/guitar-app. Work branch **`big-update`** (everything since build-31).
  `main` = build-31 (what's installed as the normal release). **Never push to `main` until the owner says "ship it".**
- Test builds for the owner come from `big-update` as GitHub **pre-releases** `test-N` (the workflow step "Publish a test build page"):
  dispatch with `gh api -X POST repos/thegute/Guitar-app/actions/workflows/android.yml/dispatches -f ref=big-update`, then send him
  `https://github.com/thegute/Guitar-app/releases/tag/test-N`. test-38 and test-39 are out (test-39 = everything up to the looper).
- Web app: `.github/workflows/web.yml` deploys GitHub Pages on `main` pushes. The owner still has to switch Pages on (Settings → Pages →
  Source: GitHub Actions); `gh api repos/thegute/Guitar-app/pages` said 404 on 2026-11-07. Update the web app together with the next
  release ("ship it"); he asked for the web app to get all the new features too.

## The owner (keenang, GitHub thegute): how to work with him
- A guitarist, not a developer: plain words, no jargon. Fold 8 phone (cover ~412 dp, inner ~840 × 757), Galaxy Tab S10+.
- Permanent rule (his words): "maintain the highest quality and cut no corners anywhere. Audit yourself mid-build, use the best available
  resources, and ask me clarifying questions whenever you need to instead of guessing." Best methods and technologies, no shortcuts,
  double-check work, intuitive design.
- He tests every build before "ship it"; ask him about each checkpoint item in notes/next-build.md after he tries it.
- He's often low on usage credits: send him a test APK before long stretches, and keep these notes current at every checkpoint.
- Rules that never change: keystore committed on purpose, never any other secret; AI and YouTube keys stay on the phone (`kgx:` storage,
  never in backups, the repo, memory or notes); no copyrighted songs/tabs/lyrics (lyrics only pre-1929); never copy Offtonic's text;
  never copy/convert/index his course files; only "Brandy" is named on screen, never invent names/titles for the art or dogs; live guitar
  input is never processed (played back only in the opt-in interface setup); models whose training data is non-commercial are never
  bundled or re-hosted (download from the source on request); ask before deleting anything on his computer.

## Work queue, in order (agreed 2026-11-07)
1. ~~Handoff + Gemini review package~~ (done: this file, CLAUDE.md, `review/`). Keep them current.
2. **Part 1 #1: Riff Scanner accuracy from video, slides, hammer-ons, pull-offs.**
   **STATUS 2026-11-07 (commit 784aaba, test-40 sent to him):** done (a) technique pass `ml/legato.ts` (pick click + contours) wired via
   `transcribe.ts scanNotes` + soundScan (better notes marked too), `hand/legato.ts` one-string chains, toTab marks + 32nds. Bench
   `npm run bench:scan` (render `python3 tools/ml-bench/make_legato.py /tmp/claude-0/bench/legato`; ORT_NODE=/tmp/claude-0/ort with
   onnxruntime-node@1.22.0): dry F1 83→92, p 51/51, h 98/134 (11 h read as "/": tune glide vs jump), b 6/7, ~ 3/3, 0 false marks.
   Video-style mixes: no pick click → nothing marked (by design). NEXT: wire `ml/stems.ts` (6-stem guitar stem, written, untested;
   model at /tmp/claude-0/models/demucs6, `KG_STEMS=… npm run bench:scan video`) before scanning video sound, then re-bench; then (e)
   picture-led merge and his video 7YKecUwEzZU (Staged Right, bends/slides/h/p). Ask him how test-40 did on his own playing.
   Web app: web.yml dispatch on big-update builds but deploy is blocked by the github-pages environment rule (main only); he was told how
   to allow big-update (Settings → Environments → github-pages → Deployment branches) and re-run it himself.
   His report: scanning a video misses a lot of notes;
   slides and pull-offs/hammer-ons are never detected. Diagnosis (from the code, 2026-11-07):
   - `src/audio/transcribe.ts` Basic Pitch draft uses `outputToNotesPoly(frames, onsets, 0.5, 0.3, 11, …)`: minimum note 11 frames
     (≈128 ms) drops fast notes (16ths at 120 BPM are 125 ms); onset 0.5 / frame 0.3 miss soft legato notes; then `amp ≥ 0.18`.
   - `notesToTab` keeps ONE note per 16th slot (the loudest) on a grid from a guessed tempo: triplets, 32nds, fast runs and any two
     notes landing in one slot are thrown away.
   - Video sound is a full mix (backing, vocals, reverb, compression) through screen capture; the general model hears everything.
   - Techniques: nothing in the sound path marks h / p / slides / bends. Basic Pitch's pitch contours (3 bins per semitone, the
     `contours` output, `addPitchBendsToNoteEvents`) are computed and then ignored; the AI's "techniques heard" is text only.
   Plan to do (ask him before big downloads): (a) take the guitar out of the mix first with the **6-stem HT-Demucs** (guitar stem; the
   same model as #3 below; `StemSplitio/htdemucs-6s-onnx`, MIT, `htdemucs_6s_fp16weights.onnx` 136 MB, input `mix` [1,2,343980] 44.1 kHz
   stereo, output `stems` [1,6,2,343980], order drums, bass, other, vocals, guitar, piano: the STFT is inside the graph, unlike our
   4-stem `htdemucs_fwd` which needs our own STFT in `src/ml/demucs.ts`); (b) guitar-note model as the main pass with tuned thresholds
   (min note ~3–4 frames, onset ~0.3–0.35, adaptive per file); (c) rhythm on the beat grid (Beat This / `analyse`) with per-beat
   subdivision choice (16ths / triplets / 32nds), keeping every note, monophonic vs chord decided per segment; (d) technique detection
   from the pitch contour + onset strength (`noteDetect.ts` spectral flux): pitch change with no new pick attack = hammer-on (up) /
   pull-off (down) on the same string; a continuous glide of ≥2 semitones = slide (/ \); a rise and return inside one note = bend / release;
   4–8 Hz wobble = vibrato; the fingering Viterbi (`tabs/fingering.ts` / hand brain) must keep legato pairs on one string; (e) if a tab is
   visible in the video, the picture read leads and the sound fixes timing; (f) a benchmark: GP files rendered with our banks + backing +
   reverb + compression (tools/ render scripts), measuring note F1 and technique accuracy before/after, plus his real videos.
3. **Part 1 #2: Game Mode, Yousician-style.** Owner 2026-11-07 on test-40: "on Play it for me it just has a line that doesn't move… I want a bouncing
   ball EXACTLY like Yousician". Now: a 7 px gold dot pinned to the hit line (GameHighway.tsx ~163) that moves only while a run plays;
   "Play for me" only sounds the next note, so nothing scrolls. Build the real Yousician ball FIRST in this item. (a) A bouncing ball that arcs from note to note and lands on each note exactly on its time
   (a ball exists in `components/GameHighway.tsx` since 1d4f07d: check how it moves and make it a true parabolic hop per note, landing
   on the hit line at the note's time, size/colour per finger); (b) a floating, movable, resizable, hidable tiny finger diagram (see #4);
   (c) **YouTube backing with the guitar removed**: he chose the 6-stem model and "record it once, then play": the video plays through
   once while KGuitar records its sound (Android screen-audio capture as in Get a sound, `scan/grab.ts`), the guitar stem is removed, the
   backing is saved (IndexedDB, per song + video id), then every run plays the backing in sync with the muted video and the game (Video
   sync offset/tempo from `play/autoSync.ts` / SyncPanel); uploaded audio/video files work the same without the listen-through;
   (d) a **customizable full-screen game** that starts completely clean (only the highway) where he adds just the pieces he wants
   (finger box, score, video, chord names, speed …), remembered.
4. **Part 1 #3: floating finger diagrams everywhere**, each movable, resizable, hidable, with toggleable overlays: finger placement,
   pentatonic box, chord tones, triads, voice leading / leading notes (next chord's 3rd/7th, the note that resolves). Put it where it
   helps: Play (tab reader), Game, Must-know licks / lick chainer / Tab maker, Learn lessons + theory + techniques, Riff Scanner result
   + scan player, Jam (Solo over it, looper, beat maker keyboard), Exercises. Build ONE component (the existing finger box from Step 1b
   "Where your fingers go", `components/HandShape.tsx` / FingerBox, plus `theory/layers.ts`), then mount it everywhere.
5. **Looper "Start when I play"** (he asked 2026-11-07): one tap readies a track, it listens and starts the take on the first guitar
   note (onset from `noteDetect.ts`, noise gate from `gear.ts`), snapped to the nearest beat (the input keeps 3 min of history, so the take
   can start exactly on that beat even though the note was heard a moment later). Also as the default for the footswitch.
6. **The two courses** (Step 3 §2, still to build). Build on a 3-step loop per lesson: Concept (original text, a live 5-layer neck,
   one verified video) → Exercise (tabs in the lick notation `licks/notation.ts`, opened in Play with Wait / In time / Game, target
   tempos) → Challenge (the looper opened on the lesson's chords via `beatFromJam`, or a Game Mode star goal for odd meters).
   - **Melodic prog metal** (Plini, Intervals, Ichika Nito, Tim Henson, Syncatto style; no djent/chug): sound & touch; lyrical vocal-like
     phrasing (motif, space, slides into notes, landing on 9ths/3rds); Lydian #11 over maj7#11; Dorian natural 6 over m9; modal mixture
     (Emaj7#11 E Lydian ↔ Em9 E Dorian: only G#/G, A#/A, D#/D move); extended voicings with open strings (maj7#11, m9, add9, sus2);
     wide-interval hybrid picking; legato cascades; two-hand tapping (ambient tapping); odd meters 7/8 (2+2+3) and 5/4 (3+2); rudiment
     picking (paradiddle picking, muted arpeggios); putting it together (a 4-track looper piece: rhythm, embellishment, bass, lead).
   - **Acoustic singer-songwriter** (Dylan Gossett / Zach Bryan / Noah Kahan style, generic course name): open-chord palette + anchor
     fingers (G, C, D, Em7, Am7, Fmaj7, Cadd9, Dsus2/Dsus4) and the capo; strumming drive + accents; boom-chuck; mid-strum embellishments
     (3rd, sus2, sus4, add9, 6th hammer-ons/pull-offs); bass walk-ups/downs (G→F#→Em7, C→B→Am7); alternating thumb / Travis; open-string
     drones; song form + dynamics (verse = part A, chorus = part B in the looper).
   - **Embellished Rhythm generator** in Jam → Make a tab (`components/TabMaker.tsx`, new part): open/capoed chords with continuous
     mid-strum embellishments, stepping bass walks between chords, boom-chuck or alternating thumb, drones.
   - Genre shift still to finish: the words djent / math rock still show in lick style labels ("Math rock"), the drum groove "Prog / djent",
     the lick "Djent octave riff", a songbook description; decisions: new styles Melodic prog, Prog-pop (tapping + hybrid), Ambient tapping,
     Rudiment picking; heavy low chug goes.
   - Video candidates found 2026-11-07 (NOT yet verified: check each with YouTube oEmbed through WebFetch; the URL has to appear in the chat
     first, e.g. from a WebSearch with allowed_domains youtube.com): Lydian U2F6QNKbiAs, 11PFEV1PHKI; Dorian XZ1ebHPTmNQ; hybrid picking
     Ma6yYttz7lE; legato eIVVdevUSdM; Ichika-style tapping gC8qtzZYpRw, 0NLfCkgehdo; odd meter LA8Ucl_oDbI, -OGyvzznmrw; paradiddle
     picking QJApA3qodjQ; Plini writing 7L6a7dpQ3F8; prog chords ToqDrVMRpcs; anchor fingers MO6HLU06L4c; capo ikFZ1Ywdjak;
     embellishments A6Iw4dK-3-o; walks Ksy2QKDZFpg, DtE_FHRJgn8; drones pQ71rLu8WZU, kSiSqwZUiYU; song form qXvot5xEgP8;
     Travis K2Z3RZc5t-A; already verified earlier: ipAEa0RcKCg (American Trail strumming), CCy7o76cv60 (Coal hammer-ons),
     O9_HLJ7NYBI (bass walks), 1mKGX-XiEjA (Plini tapping), FvKiOyY-zOA (Plini pentatonic).
7. **Brainstorm the next build with him, back and forth** (he wants this before the credits reset, ~2026-11-13). His three topics (sent 2026-11-07 12:09):
   (1) **Deep overhaul of Zero to Hero + guitar theory, modeled on Pickup Music**: real depth, not primers, each idea with a concrete
   step-by-step practice plan; research pickupmusic.com (app, site, reviews: graded Learning Pathways, daily bite-sized exercises,
   CAGED/triad neck connection, jamming, graduation pieces) and why players praise it; make Learn / Zero to Hero resemble that depth.
   Original text only, never copy their material. (2) **Quick Start Guide + in-depth illustrated manual with real Day Mode screenshots**
   (how / why / when for every feature): propose how to design and generate it (screenshots via the browser tests' `shot` tooling).
   (3) **Strum Machine analysis + integration** (strummachine.com): a copy of its features deeply wired into the app (chord changes drive the
   floating finger diagrams, triad / pentatonic / chord-tone overlays, lessons), lots of built-in songs with real acoustic guitar sound;
   and give an opinion on an even better way: load a YouTube backing track and auto-sense key, timing and chords (Riff Scanner beat
   grid + chord finder + stems) so he can jam over it with the overlays; or combine both. Brainstorm these WITH him, back and forth.
   Saved ideas: the Deep Dive course
   (notes/next-build.md "Saved for the next work cycle": real depth in CAGED, modes, intervals, ear training, voicings, soloing,
   improvising, voice leading); extra FX, note repeat/arp; weekly challenge + ghost; left-handed mode; Google Drive backup (needs his
   Google Cloud setup); app upgrades from the audit (lazy-load screens, tests in CI, lint, split PlayScreen, web offline cache);
   native MIDI for the Chocolate Plus (Step 1g); his artist profile through the app.
8. Final full check (Fold cover/inner, tablet, day/night/psy: `tests/browser/build14-test.cjs tour` + every suite), CLAUDE.md + guide +
   brother's Docs guide (https://claude.ai/artifact/7Cuc18hXrt23FDQ1PniqV5) up to date, test APK, then "ship it" → main + web app.

## How to check work (quick reference; details in CLAUDE.md and tests/README.md)
- `npx tsc --noEmit -p .`, `npm test` (logic chain), `npx vite build`, `npx vite preview --port 4173`, then browser suites with
  `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome NODE_PATH=/opt/npm-tools/node_modules node tests/browser/<suite>.cjs [parts]`.
  Newest suites: looper-test, game-test, getsound-test, step1-test (gaps), step2-test, build33-test (voiceout), build14-test (tour + contrast).
- Big model files can't go through Playwright route.fulfill: seed Cache Storage `kg-models-v1` from `dist/__testmodels` symlinks
  (see getsound-test / build33 voiceout). Demucs files live in /tmp/claude-0/models/demucs (re-download from the pinned HF revision).
- The manual the helper reads (guide.ts → `systemPrompt`) must stay under 20000 characters (build25 logic test).
