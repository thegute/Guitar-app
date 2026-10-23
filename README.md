# KGuitar

A personal guitar practice app for Android (and the web), built with React + Capacitor.

## What's in it
- **Play (play-along):** load a tab, play it on your guitar and the app follows you note by note. Each correct note lights up; wrong notes tell you what you played and what the tab wants. Tab numbers can also show their note names.
  - YouTube mini player next to the tab, with ½ / ¾ speed and an A–B loop
  - **Hear it:** plays the tab back so you know how it should sound
  - **Loop a section:** pick bars to repeat, with a score for every pass
  - Scales & chords for soloing: detected key, scale suggestions, the song's chord progression, and the fretboard in Scale, Arpeggio, Triads and Connect (how to move from one chord to the next) modes
  - Works with the phone mic (acoustic) or a USB amp / audio interface such as the Amphonix 2 (electric)
- **Songs:** find tabs on Songsterr, Ultimate Guitar or Guitar Pro file sites; upload Guitar Pro files (.gp .gp5 .gpx .gp4 .gp3) or text tabs, several at once and straight from Google Drive; paste tabs from the clipboard. Songs are saved on the phone, in separate banks per instrument (guitar, tenor ukulele, baritone ukulele).
- **Practice tabs:** scales, sequences, arpeggios, licks and warm-ups for any key and position, played in Play with the same follow-along.
- **Learn:** the daily hub.
  - Today's goal (a guitar pick that fills up), streak with streak freezes, levels and XP, a week view, and an **"I'm away from my guitar"** switch that makes the plan, quests and reminders guitar-free
  - Today's plan, three daily quests, a practice course (fretboard notes, chords, triads, circle of fifths, CAGED) in tap mode or play mode with spaced repetition and stars
  - A seven-stage path to mastery
  - Drone ear training (levels, melodies, hands-free, optional guitar mode)
  - Theory lessons following Offtonic Theory's chapters, with sounds to tap
  - CAGED explorer, circle of fifths, one-minute chord changes and a rhythm trainer
  - Progress (calendar, this week, badges) and settings (instrument with a confirm step, theme, daily goal, reminders)
- **Ukulele mode:** tenor (high-G or low-G) and baritone (DGBE or high-D). Every screen follows the instrument.
- **Day and night themes** (night is low-glare for practising in bed), and phone reminders that skip days you've practised.
- **Jam:** chord-progression generator (22 styles, chord colours from power chords to jazzy 13ths, 2–16 chords, endings, surprise level) with a chord diagram for every chord, strumming and drum backing, a **looper** that records your playing in time with the beat, scales to solo with, the circle of fifths, and famous progressions
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
python3 art/icon.py && node art/render.cjs   # redraw the app icon, splash screens and web icons
npm run build && npx cap sync android
```
