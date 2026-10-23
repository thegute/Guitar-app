# Tests

**Logic** (tab parsing, Guitar Pro import, chords, voice leading, follow-along matching, Jam engine, practice tabs, and the Learn tab: every quiz question on every instrument and tuning, CAGED shapes, rhythm scoring, streaks/freezes/away mode, plan, path, song banks; and build 6: chord sheets on every
instrument and tuning, the importer, play-in-time timing/scoring/matching, the speed trainer, per-song progress and reviews,
share titles, input sensitivity, pedal bindings, backup files):
```
npm test
```

**Browser** (the Play screen in headless Chromium, with a synthesized guitar melody as the microphone):
```
npm run build && npx vite preview --port 4173 &
node tests/browser/gen-ode.cjs                          # makes tests/browser/out/ode.wav
npx -y esbuild@0.25 tests/make-gp.ts --bundle --platform=node --format=esm --outfile=tests/browser/out/make-gp.mjs
node tests/browser/out/make-gp.mjs tests/browser/out/riff.gp
npm i --no-save playwright && node tests/browser/play-test.cjs cover
```
Screenshots land in `tests/browser/out/`. Sizes: `cover` (Fold cover screen), `small`, `inner-portrait`, `inner-landscape`.

**Learn tab** (every Learn screen at cover and inner sizes in day and night, overflow and page-error checks, away mode,
the ukulele switch with its confirm step, separate guitar/ukulele song banks, the daily-goal celebration):
```
node tests/browser/learn-test.cjs
```
**Jam:** `node tests/browser/jam-test.cjs`. **Theme screenshots:** `node tests/browser/theme-shots.cjs`.

**Build 6** (every main screen on a small phone, the Fold cover and inner screens and a 12" tablet in portrait and
landscape, day and night; the first-launch welcome and guide, recorded sounds, strum-along chord sheet, footswitch,
play in time, split layout, input setup, backup download, old tab names): `node tests/browser/build6-test.cjs`.
Browser tests set `kg:welcomed` so the first-launch welcome doesn't cover the app.
