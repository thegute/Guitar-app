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

## Baseline measured (2026-11-12, `tests/browser/sound-lab.cjs before` → `tools/sound-report.py`)
Owner: "All the sounds seem fake to me." The numbers agree:
- **Mono.** L/R correlation 1.00 on everything except double-tracked metal/rock (0.6–0.7): no stereo image, no room.
- **Squashed.** Strums sit at −0.7 dBTP with a peak-to-loudness ratio of 9–10 dB: the soft-clip ceiling flattens every strum
  attack (a real acoustic strum has PLR 14–18).
- **Dull.** Acoustic strums: presence −26 dB, air −38 dB of the total (a real miked acoustic is roughly −15 / −22): the tonejs MP3
  banks are band-limited and few notes are stretched to cover the rest.
- **Uneven.** Loudness from −9 LUFS (metal notes) to −20 (Hear it, drums): every feature levels itself.
- **No body, no room, one take per note, strums = separate notes, no string behaviour.**

## Research decisions (2026-11-12; owner: "absolute best sounding, highest quality, no corners cut")
1. **Content first.** Realism comes from deeply sampled instruments, which is what his plugins are (Orange Tree Evolution: velocity
   layers with dynamic morphing, release samples, pick noise that depends on the last string, automatic fret/position noises,
   legato hammer/pull/slide samples, monophonic strings with legato, a strum engine with per-strum speed/humanise/string range,
   string + body resonance, mic/room options). The harvest renders these through pedalboard (VST3/AU host; Kontakt instruments
   are loaded once in the plugin's own editor, `show_editor()`, and the state saved with `raw_state` so every later render is
   headless), DawDreamer as the fallback host.
2. **Our engine reproduces what those engines do at play time**, because a pack only holds recordings: per-string voices (one note
   per string, 12 ms finger-lift damping, legato within a string), velocity layers with crossfade ("dynamic morphing"), round
   robins that never repeat back-to-back, release samples on note-off, pick noise and fret/position-change noise as separate
   layers, strum engine (per-string onset spread from strum speed, direction, string range, velocity decay down the strum,
   humanised speed/velocity/strings), string + body resonance (sympathetic open strings driven by what's played).
3. **Sampler in an AudioWorklet** (one per engine, voices in the audio thread): sample-accurate starts/stops/crossfades, voice
   stealing without clicks, no main-thread jitter or garbage. Sample data is decoded once on the main thread and transferred
   (no SharedArrayBuffer needed, so no COOP/COEP headers in the Android web view).
4. **Formats.** Packs: 48 kHz (the phone's native rate; the AudioContext is opened at 48 kHz so nothing is resampled twice),
   FLAC 24-bit for the harvested packs (lossless transients; decodeAudioData handles FLAC in Chrome / the Android web view),
   Opus for big ambience beds only. Built-in free banks re-encoded from their best source.
5. **Stereo and space.** Real stereo (mic pairs from the plugins), double-tracked rhythm parts as two different takes panned, a
   shared room (convolution, true-stereo IR) + plate + tape delay as sends; mono-safe for the pedal rig (corr checked).
6. **Master.** An AudioWorklet chain: 90 Hz side-chain-high-passed glue compressor (2:1, 30 ms attack, programme-dependent
   release) → true-peak look-ahead limiter (4× polyphase oversampled detection, 1.5 ms look-ahead, −1 dBTP ceiling) replacing the
   waveshaper ceiling that squashes strums today. Targets: −16 LUFS for practice playback, TP ≤ −1 dBTP, PLR ≥ 12 on strums.
7. **Measured, not guessed.** Every step re-runs the sound lab: loudness, true peak, PLR, stereo correlation, band balance; then
   a blind A/B with the owner on his phone and on the pedal rig.

## Step 1 done (2026-11-12): the console and the master
- `audio/engine.ts`: source → role stage (`me` / `band` / `any`; the Play/Game slider and the mixer card's parts keep working:
  `bus()`, `busLevel`, `setBusLevel`, mute/solo unchanged) → category bus (`guitar bass drums keys loops click voice fx`, each
  with an input → [processing slot, Step 4] → output trim) → master in → **`kg-master` AudioWorklet**
  (`engine/worklets/master.worklet.js`: 90 Hz 24 dB/oct side-chain HP RMS glue, 2:1, soft knee, 30 ms attack, auto release;
  true-peak look-ahead limiter, 4× 16-tap polyphase detection, L+1 running min + L box, −1 dBTP with 0.25 dB margin) → final
  (live guitar joins here, rig.ts) → mono fold → speakers. A brickwall DynamicsCompressor stands in until the worklet loads.
- Every live sound now goes through it: pluck (guitar), bass, keys banks, drums, metronome/drone/tuner tone (click), Jam
  (guitar, drums, click, loops, bass), beat maker (a finished stem into the master), speech (voice), previews (loops).
- Measured (step1a vs before): strums keep their attack (PLR 9–10 → 11–14 dB, TP −0.7 → −1.7…−4 dBTP), no clipping; stress test
  +9 dB hot: TP held at −1.08 dBTP (16× measured). Loudness still differs by feature: Step 2 normalises each pack to a measured
  reference (pack.json `loudness`), not per-feature fudge factors.

## Step 2 plan: sound packs
`pack.json` (+ audio files beside it; built-ins under `public/packs/<id>/`, private ones imported on the phone like the books):
```
{ format: 'kguitar-pack', version: 1, id, name, kind: 'guitar'|'bass'|'drums'|'keys'|'vocal'|'fx', private: bool, licence, credit,
  sampleRate: 48000, tuning: [midi per string, low→high] (guitars), loudness: { lufs, at: 'mf' },
  articulations: {
    sustain | pm | mute | harmonic | hammer | pull | slideUp | slideDown | strumDown | strumUp | chuck | release | fret | pick: {
      zones: [ { string?, lo, hi, root, chord?: 'maj'|'min'|'7'|…, layers: [ { vel: [lo, hi], rr: [file, …], gainDb? } ],
                 loop?: [start, end], tail?: file } ] } },
  noises: { fret: [...], pick: [...], position: [...] } }
```
Engine side: zone by string + pitch (the nearest recorded root, never stretched more than ±2 semitones), velocity layers
crossfaded, round robin without back-to-back repeats, release / fret / pick layers on their own gain, loudness normalised from
`loudness`. Loader: pack.json first, audio per zone on demand (`ensure(range)` for a song before it plays), decoded at the context
rate, kept in an LRU within a memory budget; a quality setting picks layers/RR depth on small phones.

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
