# The KGuitar audio engine: plan and rules (owner 2026-11-11 09:51)

The owner: "leave space and future upgrade planning for our highly upgraded, way better audio engine that is used by all features."
Stage 3 builds it (after Stage 4, Riff Scanner). Until then, everything new is written so that the upgrade drops in with no feature
changes. This file is the contract. Keep it current.

## Where we are (2026-11-11)
- `audio/engine.ts`: one shared AudioContext (`audio()`), master bus `out()` → compressor + soft ceiling → `fold` (mono for the pedal
  rig) → `finalOut()`.
- `audio/pluck.ts`: SOUNDS registry (8 guitar tones), sample banks in `public/samples/<id>/` (flat or grouped: notes / pm / power /
  maj / min, takes rotated, `double` L/R), `playNote`, `strum`, Karplus–Strong fallback.
- Others: `drums.ts` (8 kits, velocity layers), `bass.ts`, `audio/band.ts` (GP tracks / songbook backing), `jam.ts` (JamTransport),
  `studio/transport.ts` (beat maker clock), `looper/station.ts`, `metronome.ts`, `drone.ts`, `tabPlayer.ts`.
- 22 source files still build their own Web Audio nodes (createGain / createOscillator / createBufferSource) on top of `audio()`.
  That works, but each one would need touching when the engine changes. Moving them behind the API below is part of Stage 3.

## The target (Stage 3)
One engine for every feature: Play (Hear it, Game guide, Band behind me), Jam (band, Strum Machine), beat maker, looper, metronome,
Learn (lesson examples, ear training), Tuner drones, Riff Scanner preview.

1. **Instruments, not samples.** Features ask for a *part* (`guitar.acoustic`, `guitar.j45`, `guitar.electric.clean`, `bass.upright`,
   `mandolin`, `banjo`, `drums.<kit>`, `keys`, `vocal.chop`…) and play *events*: note / chord strum / mute / slide / bend / hammer /
   pull, with velocity, articulation, string + fret (so the right recorded string sounds), duration. The engine picks the sample, the
   take (round robin) and the layer.
2. **Packs, swappable.** A pack = a folder with `pack.json` (instrument, articulations, zones, velocity layers, round robins, release
   tails, licence, credit) + compressed audio. Sources: built-in (free/CC packs in the repo, small); packs rendered on the owner's Mac
   from his plugins (Orange Tree Evolution acoustic + electric, Ample SJ-200, Nembrini, Neural DSP Archetypes, Humanoid), which live in
   a phone / Google Drive folder and are NEVER committed; his own recordings; licensed packs only with his written confirmation.
   Budget: 2 GB+ on the phone. Loading streams per note/zone on demand, with a "Getting sounds ready" step and a quality setting.
3. **Buses and a mixer.** Named buses: `me` (the part the player plays: guide), `band` (other instruments), `drums`, `bass`, `click`,
   `fx`, `input` (live guitar, only in the opt-in interface rig). Each bus has volume, mute/solo, pan, and send effects. The Game and
   Play "guide" slider (owner 09:45: hear his part AND the band, with a slider) is just `me` vs `band` volume. A Moises-style stem
   mixer (Stage 2 Band behind me) maps stems onto the same buses.
4. **One clock.** A single transport (the beat clock already shared by Jam / beat maker / looper, `studio/shared.ts`) that Play, Game,
   Hear it and the guide also follow: tempo, speed %, loops, count-in, latency compensation per rig (`gear.ts`).
5. **Rig aware.** `rig.ts` (pedal mono / stereo / interface) stays the last stage; the engine never plays the live guitar back unless
   the interface setup is on.
6. **Quality.** Realistic acoustic strums (down/up, chop, boom-chuck, string-by-string timing spread, pick noise, fret squeak, body
   resonance), amp tones from his captures, release tails, humanisation. Offline rendering where it helps (pitch/time with Signalsmith,
   already in `studio/pitchShift.ts`). Measured with the existing capture tools (`tests/browser/sound-capture.cjs`,
   `tools/analyse-capture.py`) and a blind A/B with the owner.

## Rules for code written before Stage 3 (keep the seam clean)
- New sound-making code calls the existing high-level functions (`playNote`, `strum`, drums/bass helpers, JamTransport, `band.ts`),
  never builds sample players of its own. Where a feature needs volumes for parts, route through a named bus (`me`, `band`, …) so the
  mixer can take it over.
- Never hard-code a sample file or bank id inside a feature; ask by sound / part (SoundId today, part id tomorrow).
- Never create a second AudioContext for live playback (offline contexts for rendering are fine).
- Scheduling goes through the shared clock, not setTimeout.
- Each feature that makes sound gets a line in "Who uses it" below, so the Stage 3 migration has a checklist.

## Who uses it (the Stage 3 checklist)
- Play: Hear it (`tabPlayer.ts`), Band (`band.ts`), Game guide (Stage 2: `me` + `band` buses, slider), tap a note, chord peek.
- Jam: JamTransport (chords, drums, bass, click, loops), Strum Machine (Stage 5).
- Beat maker: transport, pads (`studio/padPlay.ts`), keys, FX (`studio/fx.ts`), bounce.
- Looper: `looper/station.ts` (tracks, overdubs, renders).
- Tools: metronome grooves, tuner drone/reference tone, chord library strums, scales.
- Learn: quiz sounds, ear trainer + drone, lesson examples, technique demos, rhythm trainer.
- Riff Scanner / Get a sound: previews, clip player, stems.
