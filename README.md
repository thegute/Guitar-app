# KGuitar

A personal guitar practice app for Android (and the web), built with React + Capacitor.

## What's in it
- **Play (play-along):** load a tab, play it on your guitar and the app follows you note by note. Each correct note lights up; wrong notes tell you what you played and what the tab wants. Tab numbers can also show their note names.
  - YouTube mini player next to the tab, with ½ / ¾ speed and an A–B loop
  - **Hear it:** plays the tab back so you know how it should sound
  - Scales & chords for soloing: detected key, scale suggestions, the song's chord progression, and the fretboard in Scale, Arpeggio, Triads and Connect (how to move from one chord to the next) modes
  - Works with the phone mic (acoustic) or a USB amp / audio interface such as the Amphonix 2 (electric)
- **Songs:** find tabs on Songsterr, Ultimate Guitar or Guitar Pro file sites; upload Guitar Pro files (.gp .gp5 .gpx .gp4 .gp3) or text tabs; paste tabs from the clipboard. Songs are saved on the phone.
- **Jam:** chord-progression randomizer and famous progressions in any key and mode, with loop playback and matching scales
- **Chords:** every common chord type in all 12 keys, multiple shapes
- **Scales:** 22 scales and modes on the full neck or by position
- **Tempo:** metronome with accents, subdivisions, odd time signatures, tap tempo, speed trainer
- **Tuner:** with alternate tunings and reference tones

## Installing on your phone
Every push to `main` builds a new APK automatically (Actions tab). When it finishes:
1. On your phone, open this repository's **Releases** page and tap the newest `KGuitar-N.apk`.
2. If Android asks, allow your browser to install unknown apps.
3. Tap **Install**. New builds install over the old one and keep your settings and songs.

## Developing
```
npm install
npm run dev        # web version at http://localhost:5173
npm test           # logic tests
npm run build && npx cap sync android
```
