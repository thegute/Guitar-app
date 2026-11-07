# Free professional acoustic guitar sets (searched 2026-11-07; NOT yet downloaded or listened to)
Rule: only CC0 / CC-BY / MIT may be bundled (credited in Settings); never non-commercial.

## Best candidate: Meta Open Sound (github.com/facebookincubator/Meta-open-sound), licence CC0 1.0 (public domain)
- **Meta Steel Guitar**: 375 samples, steel-string acoustic, E2-C6, all six strings sampled chromatic (so a note can be played on its real
  string), 3 velocity layers. 24-bit / 48 kHz WAV in the Releases, plus SFZ maps and small OGG previews.
- **Meta Nylon Guitar**: 348 samples, classical guitar, E2-B5, six string zones, 3 dynamic layers (2 picked, 1 fingerstyle).
- No strums in the pack: strums are built from single notes (we already do, with spread/timing), so humanise: tiny timing/level/pitch
  variation, alternate velocity layers, pick/string noise, release noise.
## Others (CC0, Karoryfer Samples via sfzinstruments.github.io/guitars): Emilyguitar (general-purpose guitar), Shinyguitar (archtop, 352 MB).
  Type/quality unknown: audition only. Blue Jeans And Moonbeams (MIT; electric + acoustic).
## Next session
1. Download Meta Steel + Nylon Release ZIPs (GitHub is reachable), check the licence file in the repo itself.
2. Build a new bank with tools/make-samples.py style (public/samples/<id>/), keep file size phone-friendly (OGG/MP3, trimmed, loudness-matched).
3. Compare with the current `acoustic` / `j45` / `nylon` banks by ear with the owner (render A/B clips); if better, make them the defaults
   for Songbook, Jam strums, Band mode, Hear it. Credit Meta in Settings (CC0 needs none, but credit anyway).
4. Real strums/picking: layer string noise, vary takes, release noise; consider a recorded-strum source later if still not lifelike.
