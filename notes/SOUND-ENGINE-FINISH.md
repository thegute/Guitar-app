# Finish the sound engine (owner 2026-11-15: "give instructions to Gemini to finish up the sound engine")

Engine week Parts 1–4 are in (shared clock, shared listener, timing calibration, per-string sampler). What's left is
the rest of **notes/AUDIO-ENGINE.md**: one engine that EVERY feature plays through, sounding like a real guitar
instead of separate notes. Read AUDIO-ENGINE.md (the contract) and the "Who uses it" checklist at its end first.

The owner's goal, in his words: "absolute best sounding, highest quality, no corners cut", and earlier: "All the sounds
seem fake to me." Success = he hears the difference on his phone and through the Pocket Master, and every feature still
works exactly as before (same buttons, same results).

## Ground rules for this work
- Branch `gemini-week` only, small commits, one step per commit or a few, each one tested and logged in
  `notes/GEMINI-LOG.md`. Stop at a working, tested point rather than leaving something half-wired.
- **Measure every step.** Before you start: `npm run build && npx vite preview --port 4173`, then
  `node tests/browser/sound-lab.cjs before` and `python3 tools/sound-report.py tests/browser/out/lab/before`. After each step
  run it again with a new tag and put the numbers (loudness LUFS, true peak, PLR, L/R correlation, band balance) in the log.
  A step that makes the numbers worse doesn't go in.
- **Don't break note detection.** Anything touching listening, the clock or the listener: `npm run test:skip` (false moves
  ahead must stay ≤ 41) and `npm run test:detect` (≥ 2235/2240, false "wrong note" ≤ 70). Play audio must never be heard
  by the follower as the player (bleed suppression on the phone mic stays).
- **Phone speed.** The Fold and the Tab S10+ run this while the mic listens. Voices live in the AudioWorklet; no per-note
  work on the main thread, no garbage per note, no setTimeout scheduling. Check Play listening + Hear it + Band together
  doesn't stutter (play-test, game-test, build13 play/intime must still pass).
- **Rig.** `audio/rig.ts` stays the last stage: pedal route = mono (check L/R fold), never play the live guitar back unless
  the opt-in interface setup is on.
- **Private packs stay private** (rendered from his paid plugins; never in the repo, never in a backup). Built-in free packs
  only with their licence + credit in Settings.
- Keep how screens look. New controls go into existing places (Options sheet, Settings → Sound, the mixer card `PlayMix`).

## The steps, in order

### 1. The sampler worklet becomes the real playback path
Today notes still play through one AudioBufferSourceNode each (`pluck.ts`, `engine/packs.ts`); `kg-sampler` is loaded but
only used for offline rendering. Make `playNote` / `strum` / pack notes send events to the worklet:
- Sample data decoded once on the main thread and transferred to the worklet (no SharedArrayBuffer).
- One voice per string (12 ms finger-lift), voice stealing without clicks, legato h/p/slides as you built them.
- Round robins never repeat back-to-back; velocity layers crossfaded ("dynamic morphing"); release samples on note-off.
- Keep the old node path as the fallback when AudioWorklet isn't available, and a hidden switch to compare the two.
- Done when: every sound in the sound lab plays through the worklet with the same or better numbers, and Hear it, Band,
  Jam, beat maker, looper, metronome and Learn sound at least as good as before.

### 2. Parts instead of samples
Features ask for a part (`guitar.acoustic`, `guitar.j45`, `guitar.electric.clean`, `guitar.crunch`, `guitar.metal`, `bass.*`,
`drums.<kit>`, `keys`) and send events: note / strum (down/up, speed) / mute / palm mute / slide / bend / hammer / pull,
with velocity, string + fret, duration. Map today's SoundIds and `pack:<id>` sounds onto parts so every existing picker
keeps working. The engine picks the zone (nearest recorded root, never stretched more than ±2 semitones), layer and take.

### 3. Every feature through the engine (the "Who uses it" checklist)
About 20 files still build their own Web Audio nodes (`grep -rln "createBufferSource\|createOscillator" src`). Move each
behind the engine API, one feature per commit, ticking it off in AUDIO-ENGINE.md: Play (Hear it, Band, Game guide, tap a
note, chord peek), Jam (JamTransport, bass, drums), beat maker (pads, keys, FX, bounce), looper (`looper/station.ts`),
Tools (metronome grooves, tuner drone, chord library, scales), Learn (quizzes, ear trainer + drone, lesson examples,
technique demos, rhythm trainer), Riff Scanner / Get a sound previews. Behaviour and look unchanged.

### 4. Loudness evened out
Every pack has a measured `loudness` in pack.json; the engine normalises from it. Remove per-feature volume fudges.
Targets: −16 LUFS for practice playback, true peak ≤ −1 dBTP, PLR ≥ 12 dB on strums. Features should no longer differ by
10 dB from each other.

### 5. Real guitar behaviour
- Pick noise and fret/position-change noise as separate quiet layers (when a pack has them; a gentle synthetic one otherwise).
- String + body resonance: open strings ring sympathetically with what's played (subtle), a short body resonance on acoustics.
- Strums use the strum engine (`engine/strumLogic.ts`) everywhere a chord is strummed, down and up strokes different.
- Double-tracked rhythm parts as two different takes panned L/R (mono-safe on the pedal).

### 6. One mixer
Named buses (`me`, `band`, `drums`, `bass`, `click`, `fx`, `voice`) each with volume, mute/solo and pan, in one mixer card
used by Play (the "your part ↔ band" slider stays), Jam and the beat maker, plus Settings → Sound for the defaults.
The room / plate / delay sends from `engine/console.ts` stay as they are.

### 7. Loading and small phones
"Getting sounds ready" before a song plays (`ensure(range)` loads only the zones the song needs), an LRU memory budget, and a
quality setting (layers / round-robin depth) for smaller phones. AudioContext at 48 kHz where the phone allows it.

### 8. Wrap-up for the owner
- Sound lab before vs after table in the log; a short blind A/B (old vs new, same phrase) he can try on his phone: add it to
  Settings → Sound as "Compare old and new sound" until he decides, then remove the old path only if he says so.
- Update `src/learn/guide.ts` (and the search catalog) for any new setting, re-run `node tools/make-manual.cjs`.
- Tell him in plain words what changed and what to listen for. Make a test APK only when he asks.

If the week runs out, stop after a finished step and write in the log exactly where you got to and what's next.
