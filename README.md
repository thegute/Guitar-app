# KGuitar

A personal guitar practice app for Android (and the web), built with React + Capacitor.

## What's in it (stage 1)
- **Jam:** chord-progression randomizer and famous progressions in any key and mode, with loop playback, matching scales for the whole progression and for each chord
- **Chords:** every common chord type in all 12 keys, multiple shapes, shown on the fretboard
- **Scales:** 22 scales and modes on the full neck or by position, with intervals or note names
- **Metronome:** accents, subdivisions, odd time signatures, tap tempo, speed trainer
- **Tuner:** microphone tuner with alternate tunings and reference tones

## Installing on your phone
Every push to `main` builds a new APK automatically (Actions tab). When it finishes:
1. On your phone, open this repository's **Releases** page and tap the newest `KGuitar-N.apk`.
2. If Android asks, allow your browser to install unknown apps.
3. Tap **Install**. New builds install over the old one and keep your settings.

## Developing
```
npm install
npm run dev        # web version at http://localhost:5173
npm run build && npx cap sync android
```
