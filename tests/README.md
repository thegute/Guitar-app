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

**Quizzes by tapping** (every quiz in the practice course on guitar in away mode, tenor and baritone ukulele and DADGAD guitar:
the first question of each gets a wrong answer, the rest the right one, tapped on the neck, note buttons, choices or chord
diagrams the way a finger would): `node tests/browser/quiz-test.cjs [guitar|tenor|baritone|guitar-dadgad]`.

**Build 13** (every theory lesson's Read / Watch / Play and each exercise, every technique drill, every songbook part on guitar
and tenor ukulele with Hear it + band, today's plan and the path in and out of away mode, song check, retune warning, counts,
strum arrows, rest blocks, record yourself, chord help and pinch zoom in Play, In time with the band, Find the chords in Jam
with strummed chords as the mic and Notes mode with a plucked melody, bends, trends, About you, the wrong-string quiz hint,
and the new screens on every size in day and night):
```
node tests/browser/gen-chords.cjs
node tests/browser/out/make-gp.mjs tests/browser/out/late.gp late
node tests/browser/build13-test.cjs [lessons technique songbook plan play intime finder melody learnmisc sizes]
```

**Build 6** (every main screen on a small phone, the Fold cover and inner screens and a 12" tablet in portrait and
landscape, day and night; the first-launch welcome and guide, recorded sounds, strum-along chord sheet, footswitch,
play in time, split layout, input setup, backup download, old tab names): `node tests/browser/build6-test.cjs`.
Browser tests set `kg:welcomed` so the first-launch welcome doesn't cover the app.

**Build 14** (the five-tab menu, tabs across the top of screens, Play's Options panel and the three looks: every screen and
sub-tab in Day, Night and Psychedelic on the Fold cover and inner screens, plus Psychedelic on a small phone and a 12" tablet;
no sideways overflow, no page errors, a contrast check of every visible word against the pixels really behind it; the Options
panel; the Songs tab; Psychedelic art, motion switch and Jam beat pulse): `node tests/browser/build14-test.cjs [tour play songs psy]`
(`TOUR=psy:cover,day:inner` limits the tour). Build 15/16 add to `psy`: Psychedelic is the default, 13 samurai choices (Mix + 12 dogs from the owner's
artwork), the chosen dog greets you on the empty My songs page, every picture loads, and the art gallery opens and steps through.
