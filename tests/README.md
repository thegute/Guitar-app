# Tests

**Logic** (tab parsing, Guitar Pro import, chords, voice leading, follow-along matching):
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
