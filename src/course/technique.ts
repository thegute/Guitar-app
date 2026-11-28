// The technique course (notes/COURSES-PLAN.md): 10 units, 30 lessons, built around the best teachers' videos (Troy Grady,
// Ben Eller, Roy Ziv's Speed Builder, Mancuso, LoG Power Ups, …). This file holds the lessons' own teaching: why, the idea in
// plain words, the common mistakes, practice goals from the exercise library and Gemini's labs (opened as they are), songs to
// use it in, and the check. The videos (with their m:ss parts) come from the Mac's reviews into watch.ts, and each lesson's
// drills from those videos are added as the reviews arrive. Not listed in the app until a whole unit has its videos
// (PATH_READY in LessonReader.tsx).
import type { Go } from '../learn/path'
import type { CourseLesson, Task } from './types'

/** an exercise from the library (Learn → Exercises) by its code */
const x = (label: string, exercise: string, minutes: number, goal?: string): Task => ({ label, exercise, minutes, goal })
const go = (label: string, to: Go, minutes: number, note: string, goal?: string): Task => ({ label, go: to, minutes, note, goal })
const SPEED_LAB = (goal: string) => go('Speed Builder Lab: log your clean tempo', { learn: 'exercises' }, 5, 'on the Exercises page, with the Drill Lab', goal)
const tune = (label: string, song: string, part = 'melody', minutes = 8, goal?: string): Task => ({ label, go: { songbook: { song, part } }, minutes, note: 'songbook tune, opens in Play', goal })

// ---- Unit 1 · Picking ------------------------------------------------------------------------------------------

export const T1_GRIP: CourseLesson = {
  id: 't1-grip', course: 'technique', level: 1, n: 1, title: 'Pick grip and picking motion', minutes: 40,
  goal: 'Hold the pick so it stays put without squeezing, pick from the wrist and forearm with small motions, and know how to check your own grip and motion on video.',
  topics: ['pick-hold', 'alternate-picking', 'speed', 'tremolo', 'picking', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Everything you play with a pick goes through two things: **how you hold it** and **what moves it**. A grip that squeezes, or a motion that comes from the whole arm, sets a ceiling on speed and makes your tone uneven, and no amount of practice on top of it will lift that ceiling.' },
        { p: 'The good news: there is no single "correct" grip. Great pickers hold the pick in several ways. What they share is a grip that is **firm at the tip and loose everywhere else**, and a motion that is **small, fast and repeatable**.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['hold the pick with just enough pressure, and a small amount of tip showing;', 'tell a wrist motion from a forearm motion from an elbow motion, and use the right one;', 'keep the pick close to the strings, picking through just one string;', 'film yourself and spot tension.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · The grip', blocks: [
        { p: 'The usual starting point: lay the pick on the **side of your index finger\'s first joint**, and press the **pad of your thumb** down on top of it. The thumb and the index finger point roughly at right angles; the other fingers curl loosely or fan out lightly.' },
        { list: [
          '**How much tip**: about 2–3 mm. More than that and the pick flaps and catches; less and you miss strings.',
          '**How hard**: just enough that the pick doesn\'t turn or slip when it hits a string. Test it: someone (or your other hand) should be able to wiggle the pick a little.',
          '**Edge**: most fast pickers tilt the pick slightly so its edge slices across the string instead of slapping it flat. It sounds smoother and catches less.',
          '**Thickness**: a medium or heavy pick (0.7–1.5 mm) with a pointed tip is easier for single notes; thin picks flex and blur the attack.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · What moves the pick', blocks: [
        { p: 'There are three main places a picking motion can come from. Most players mix them; knowing which is which lets you choose.' },
        { list: [
          '**The wrist**, moving side to side (like flicking water off your hand). Fast, precise, the main engine for most single-note playing.',
          '**The forearm**, rotating (like turning a doorknob). Strong and tireless; many tremolo pickers and metal players use it.',
          '**The elbow**, the whole forearm swinging. Big and loud: right for strumming and some tremolo, too big for fast single notes.',
        ] },
        { p: 'The fingers holding the pick mostly stay still. Some players add a little finger motion, but if your thumb and index finger bend and straighten on every note, the motion will be uneven and tiring.' },
        { p: '**Keep it small.** The pick only needs to travel just past the string. Watch great pickers in slow motion: the tip moves a few millimetres.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Where the hand sits', blocks: [
        { p: 'Your picking hand needs a reference point so it knows where the strings are without looking.' },
        { list: [
          '**Palm on the bridge**: the edge of the palm rests lightly on or just in front of the bridge. It steadies the hand and mutes the low strings when you want (palm muting, Unit 9).',
          '**Fingers on the body**: some players let the curled fingers brush the pickguard. Fine, as long as they brush, not press.',
          '**Floating**: no contact at all. Harder to learn, but many fast players do it.',
        ] },
        { p: 'Whatever you choose, it should be **light**. If you lift the guitar\'s weight off your arm and your hand sits in the same place, you\'re anchoring, not pressing.' },
      ],
    },
    {
      kind: 'learn', title: '4 · The pick has to escape', blocks: [
        { p: 'Here is the idea that changed how picking is taught (from Troy Grady\'s research on fast players): the pick doesn\'t just go down and up. Its path is a slight **arc**, and at the end of a stroke the pick has to **escape** the strings, clearing them so it can move to another string without hitting anything.' },
        { p: 'On one string this doesn\'t matter much. It matters as soon as you change strings (next lessons), and it explains why some patterns feel easy and others feel stuck. For now, notice which way your pick naturally leaves the string after a downstroke: does it come up and away from the guitar, or stay buried between the strings?' },
      ],
    },
    {
      kind: 'learn', title: '5 · How to practise motion', blocks: [
        { list: [
          '**Film yourself** with the phone close to the picking hand, at the slow-motion setting if you have it. Your eyes lie; the video doesn\'t.',
          '**Short bursts**: play four or eight fast notes, then stop and relax. Speed comes from short, relaxed bursts, not from long tense runs.',
          '**Check tension every minute**: shoulder down, jaw loose, breathe. Tension creeps in without you noticing.',
          '**Slow is for accuracy, fast is for motion**: some motions only appear at speed. Practise both: slow and perfect, then short bursts at your edge.',
        ] },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Squeezing the pick so hard your thumb goes white.', right: 'Firm at the tip, loose everywhere else: just enough pressure to stop it turning.' },
        { wrong: 'A lot of pick showing, so it flaps and catches on the string.', right: 'About 2–3 mm of tip. Choke up if the pick keeps getting stuck.' },
        { wrong: 'Swinging from the elbow for single notes.', right: 'Wrist and forearm for single notes; keep the elbow for strumming.' },
        { wrong: 'Big strokes that travel far past the string.', right: 'Small motions: the pick goes just past the string and comes back.' },
        { wrong: 'Pressing the palm or fingers hard into the guitar to feel secure.', right: 'Anchor lightly, if at all: brushing, not pushing.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Film a minute of each before and after: the change in the video is your progress.',
      challenge: { ...x('Sixteenth-note bursts', 'PK-11', 6, 'clean bursts of 4 at 90 BPM, relaxed'), why: 'Short fast bursts show you the motion your hand chooses at speed: then you can keep it.' },
      goals: [
        { focus: 'A relaxed grip on open strings', tasks: [x('Open strings, down-up', 'PK-1', 5, 'one minute without tension, then the same on each string')] },
        { focus: 'One note, many speeds', tasks: [x('Speed ladder: 8ths, triplets, 16ths', 'PK-2', 6, 'all three speeds clean at 70 BPM')] },
        { focus: 'Keep it going', tasks: [x('Tremolo picking a melody', 'PK-4', 6, 'a whole run without the pick slipping')] },
        { focus: 'Know your number', tasks: [SPEED_LAB('log the fastest clean tempo for open-string 16ths')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Play a first fiddle tune with the grip and motion from this lesson: steady down-up eighth notes on a simple melody. Pick it slowly with the metronome; watch that the grip stays loose when the tune gets busy.' },
      ],
      tasks: [tune('Eighth of January (melody)', 'eighthjan', 'melody', 8, 'the low part, down-up, clean at 80 BPM')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic, then film one and look for tension.',
      tasks: [
        { skill: 'Play', ...x('Open strings, down-up', 'PK-1', 3) },
        { skill: 'Play', ...x('Speed ladder', 'PK-2', 4) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Pick grip and picking motion". Quiz me as my teacher, one question at a time: (1) how to hold the pick and how much tip to show, (2) the three places a picking motion comes from and what each is good for, (3) anchoring, (4) what "escaping the strings" means, (5) how to practise motion. Keep it short.',
        points: ['side of the index finger, thumb pad on top, 2–3 mm of tip, firm at the tip and loose elsewhere', 'wrist (side to side), forearm (rotation), elbow (big, strumming)', 'anchor lightly or float; never press', 'the pick moves in an arc and must clear the strings to change string', 'film yourself, short bursts, check tension, slow for accuracy and fast for motion'],
      },
    },
  ],
}

export const T1_ALT: CourseLesson = {
  id: 't1-alt1', course: 'technique', level: 1, n: 2, title: 'Alternate picking on one string', minutes: 40,
  goal: 'Alternate pick evenly on one string at eighths, triplets and sixteenths, with accents where you want them and both hands landing together.',
  builds: ['t1-grip'],
  topics: ['alternate-picking', 'tremolo', 'speed', 'hand-sync', 'burst-speed', 'picking'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Alternate picking (down, up, down, up) is the backbone of fiddle tunes, rock riffs, metal and fast melodies. On one string you can take string changes out of the picture and work on the two things that make it sound good: **evenness** and **timing**.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['keep strict down-up picking without ever playing two downstrokes in a row;', 'switch between eighths, triplets and sixteenths without losing the beat;', 'put accents where you choose;', 'move along one string while picking, so both hands land together.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Down on the beat, up in between', blocks: [
        { p: 'In eighth notes, every **downstroke falls on the beat** (1, 2, 3, 4) and every **upstroke on the "and"**. Keep the hand moving down-up like a pendulum, even through a rest: the pick just misses the string on the beat it doesn\'t play.' },
        { p: 'That pendulum is what keeps you in time. Players who stop and start their hand on every note drift; players whose hand never stops lock to the beat.' },
        { p: 'With **sixteenths**, the down still lands on the beat and on the "and"; the ups fill the "e" and "a" (1 e & a). With **triplets** the stroke on the beat changes each time (down-up-down, up-down-up): count "1-trip-let" and accent the first.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Accents: control, not volume', blocks: [
        { p: 'An accent is one note a little louder than the rest. Accenting the first of every group of 4 sixteenths keeps you locked to the beat. Accenting every 3rd note (in sixteenths) makes the accent wander across the beat, which is a great test: if the accent drifts or your timing slips, your hand isn\'t as even as it feels.' },
        { p: 'Accents come from a slightly bigger, faster stroke, not from squeezing harder.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Moving along the string', blocks: [
        { p: 'Now play a scale **up one string** (for example A minor pentatonic on the G string: frets 2, 5, 7, 9, 12, 14). Each new note means the fretting hand **shifts**, and the shift has to finish before the pick hits.' },
        { list: ['Lead with your eyes: look at the next fret before you move.', 'Move the whole hand from the elbow; don\'t stretch toward the next fret and drag the hand after.', 'If notes sound late or buzz, the fretting hand is arriving after the pick: slow down until they land together.'] },
      ],
    },
    {
      kind: 'learn', title: '4 · Building speed the right way', blocks: [
        { list: [
          '**Clean first**: find the tempo where every note is even and on the beat. That is your working tempo.',
          '**Steps of 4–5 BPM**: when it\'s clean three times in a row, go up a step. When it gets messy, go back two steps.',
          '**Bursts above it**: short bursts (4 or 8 notes) 10–20 BPM faster than your working tempo teach the hand the faster motion.',
          '**Log it**: the Speed Builder Lab keeps your clean tempo, so you see the line go up over weeks, not days.',
        ] },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Two downstrokes in a row after a rest or a long note.', right: 'Keep the pendulum going: the pick swings through the rest without touching the string.' },
        { wrong: 'Upstrokes quieter and thinner than downstrokes.', right: 'Practise upstroke-only bursts, then aim for the same volume both ways.' },
        { wrong: 'Speeding up and slowing down with the difficulty.', right: 'Lock to the metronome; play the hard part at the same tempo as the easy part.' },
        { wrong: 'Pushing tempo every day until it\'s messy.', right: 'Clean tempo up in small steps; bursts above it; messy practice teaches mess.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Use the metronome for everything here. Say the count out loud for the triplets.',
      challenge: { ...x('Sextuplet bursts', 'PK-12', 6, 'bursts of 6 at your clean 16th tempo'), why: 'Sextuplets (6 per beat) force the stroke on the beat to alternate: the best test that your hand never stops.' },
      goals: [
        { focus: 'Strict down-up', tasks: [x('Open strings, down-up', 'PK-1', 4, 'even volume both ways at 90 BPM')] },
        { focus: 'Three subdivisions', tasks: [x('Speed ladder: 8ths, triplets, 16ths', 'PK-2', 6, 'clean at 80 BPM, changing without a gap')] },
        { focus: 'Accents and time', tasks: [x('Subdivision pyramid', 'RH-28', 6, 'quarters to sextuplets, the beat steady')] },
        { focus: 'Along the string', tasks: [x('Position shifts on one string', 'PK-3', 6, 'both hands landing together')] },
        { focus: 'Track your speed', tasks: [SPEED_LAB('a new clean tempo for 16ths on one string')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Tremolo picking turns long notes into a shimmering line (surf, metal, mandolin-style melodies). Then take strict alternate picking into a fiddle tune.' },
      ],
      tasks: [x('Tremolo picking a melody', 'PK-4', 6, 'the whole melody without a stop'), tune('Sail Away Ladies (melody)', 'sailaway', 'melody', 8, 'strict down-up, clean at 84 BPM')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play with the mic and keep the beat with the click.',
      tasks: [
        { skill: 'Play', ...x('Speed ladder', 'PK-2', 4) },
        { skill: 'Play', ...x('Position shifts on one string', 'PK-3', 4) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Alternate picking on one string". Quiz me as my teacher, one question at a time: (1) which strokes fall on the beat in eighths, sixteenths and triplets, (2) why the hand keeps moving through rests, (3) how accents help, (4) how to move along one string cleanly, (5) how to build speed. Keep it short.',
        points: ['downs on the beat and the "and" (16ths: ups on "e" and "a"); triplets alternate which stroke is on the beat', 'a pendulum that never stops keeps time; no two downstrokes in a row', 'accents lock the beat (every 4) or test evenness (every 3)', 'look ahead, shift the whole hand from the elbow, both hands land together', 'clean tempo, steps of 4–5 BPM, bursts above, log it'],
      },
    },
  ],
}

export const T1_CROSS: CourseLesson = {
  id: 't1-cross', course: 'technique', level: 1, n: 3, title: 'String changes: inside and outside picking', minutes: 45,
  goal: 'Cross between strings with alternate picking, tell inside from outside picking, and know which escape your hand uses so you can plan patterns that flow.',
  builds: ['t1-alt1'],
  topics: ['alternate-picking', 'hand-sync', 'speed', 'sequences', 'picking'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'On one string alternate picking feels easy. The trouble starts when you change strings: some changes flow, others trip you up at the same tempo. That isn\'t a lack of talent; it\'s **geometry**. Once you understand it, you can practise the hard changes on purpose and choose fingerings that suit your hand.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['tell an inside string change from an outside one;', 'loop both kinds on two strings;', 'name your natural escape (after the downstroke or after the upstroke);', 'pick across strings in fiddle tunes without stumbling.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · Inside and outside', blocks: [
        { p: 'Take two strings, say the B and the high E. You play a note on the B, then a note on the E.' },
        { list: [
          '**Outside picking**: the pick changes string by going **around the outside** of the two strings, never sitting between them.',
          '**Inside picking**: the pick changes string while **between** the two strings, so it has to hop the next string from the inside.',
        ] },
        { p: 'Here is the simple test. Play the last note on the lower string and the first note on the higher string. If the stroke on the **lower string is an upstroke** and the first stroke on the **higher string is a downstroke**, the pick has to hop over both strings from the outside: that is **outside** picking. If the lower string ends on a **downstroke** and the higher one starts with an **upstroke**, the pick works between the strings: **inside** picking.' },
        { p: 'Most players find one of the two much easier. That\'s normal and it tells you something about your motion.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Escaping: why one feels easier', blocks: [
        { p: 'Remember the arc from lesson 1. If your pick naturally **leaves the strings on the downstroke** (the stroke ends up and away from the guitar), you are a **downstroke escape** player: string changes after a downstroke are free, changes after an upstroke get stuck between the strings. **Upstroke escape** is the mirror image. Some players do both (a **two-way** motion, often from the elbow or by mixing wrist and forearm).' },
        { list: [
          'A pattern with an **even** number of notes per string (2 or 4) starts every string with the same stroke, so every change is the same kind.',
          'A pattern with an **odd** number per string (3) flips the stroke on each string, so changes alternate between your easy and hard ones.',
          'That is why three-notes-per-string scales feel harder with strict alternate picking, and why many players use economy picking or legato on them (Units 3 and 6).',
        ] },
      ],
    },
    {
      kind: 'learn', title: '3 · Practising string changes', blocks: [
        { list: [
          '**Two-string loops**: a short figure that crosses back and forth, repeated. Loop the outside version, then the inside one; notice which flows.',
          '**One note per string**: picking across every string, down-up, is the hardest test of string tracking. Start slowly.',
          '**Watch the pick**: film it from the side. Do you see it hop over the string on your easy change? That is your escape.',
          '**Use both**: you don\'t need to fix your hand. Choose fingerings (and later economy picking) that put the easy change where you need it.',
        ] },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Blaming your hands when one string change keeps tripping you.', right: 'Work out if it\'s inside or outside: the hard one needs its own slow practice or a different fingering.' },
        { wrong: 'Big arm motions to get over the strings.', right: 'Small wrist motion with an escape: the pick only needs to clear one string.' },
        { wrong: 'Hitting the next string by accident.', right: 'Mute with both hands (palm on the low strings, fretting fingers lightly on the ones below) and keep the motion small.' },
        { wrong: 'Practising only scales up and down.', right: 'Loops on two strings isolate the change; then put it back into lines and tunes.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Do each loop for a minute without stopping. If one breaks down, halve the tempo, not the time.',
      challenge: { ...x('Three-note crossing trigger', 'PK-16', 6, 'clean at 70 BPM'), why: 'Odd groupings flip your easy and hard changes on every string: if this is clean, string changes are solved.' },
      goals: [
        { focus: 'Outside picking', tasks: [x('Outside picking: two-string loop', 'PK-5', 5, 'one minute clean at 70 BPM')] },
        { focus: 'Inside picking', tasks: [x('Inside picking: two-string loop', 'PK-6', 5, 'one minute clean at 70 BPM')] },
        { focus: 'Switching', tasks: [x('Inside/outside switch', 'PK-13', 6, 'clean at 70 BPM')] },
        { focus: 'Six notes over two strings', tasks: [x('Six-note loop across two strings', 'PK-7', 6, 'bursts at 90 BPM')] },
        { focus: 'One note per string', tasks: [x('One-note-per-string alternate pedal', 'PK-14', 6, 'clean at 60 BPM')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Devil\'s Dream crosses strings on almost every beat: down on the beat, up off it, the pick bouncing between strings. A perfect workout once the loops are clean.' },
      ],
      tasks: [tune('Devil\'s Dream (melody)', 'devilsdream', 'melody', 10, 'the first part clean at 80 BPM')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic; then tell your teacher which change is your easy one.',
      tasks: [
        { skill: 'Play', ...x('Outside picking loop', 'PK-5', 3) },
        { skill: 'Play', ...x('Inside picking loop', 'PK-6', 3) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "String changes: inside and outside picking". Quiz me as my teacher, one question at a time: (1) the difference between inside and outside picking, (2) what downstroke and upstroke escape mean, (3) why odd and even notes per string feel different, (4) how to practise string changes. Keep it short.',
        points: ['outside = around both strings (upstroke on the lower string, downstroke on the higher); inside = between them', 'the pick clears the strings at the end of one stroke: after the downstroke or after the upstroke', 'even counts per string repeat the same change; odd counts alternate easy and hard', 'two-string loops, one note per string, film it, choose fingerings that suit your escape'],
      },
    },
  ],
}

export const T1_SEQ: CourseLesson = {
  id: 't1-seq', course: 'technique', level: 1, n: 4, title: 'Picking scales and sequences', minutes: 45,
  goal: 'Pick scales in groups of 3 and 4 and in 3rds, keep the accents on the beat, and turn a scale from a straight line into a melody-like pattern.',
  builds: ['t1-cross'],
  topics: ['sequences', 'alternate-picking', 'speed', '3nps', 'burst-speed', 'picking'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Playing a scale straight up and down is one exercise; real lines skip, turn back and repeat. **Sequences** (a scale played in small repeating groups) train exactly that: string changes in every combination, accents across the beat, and a fretting hand that knows the scale in any order.' },
        { p: 'They are also the raw material of many solos: a run in 4s is the sound of a hundred rock and fusion players.' },
      ],
    },
    {
      kind: 'learn', title: '1 · Groups of 3 and 4', blocks: [
        { p: 'Take any scale and number its notes 1, 2, 3, 4, 5… **In 3s**: 1-2-3, 2-3-4, 3-4-5, and so on. **In 4s**: 1-2-3-4, 2-3-4-5, 3-4-5-6. Coming back down, do the same from the top.' },
        { list: [
          'Groups of **4 in sixteenths** line up with the beat: the first note of every group is on the beat.',
          'Groups of **3 in sixteenths** don\'t: the group start moves across the beat (a nice rhythmic tension). Play them as **triplets** first, where every group starts on the beat, then as sixteenths.',
          'Say the numbers out loud the first few times. Your fingers will follow your mouth.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · Thirds', blocks: [
        { p: '**In 3rds**: 1-3, 2-4, 3-5, 4-6… Every pair skips one note of the scale. It sounds more like a melody than any other sequence, and it tests string changes because many pairs sit on two strings.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Three notes per string', blocks: [
        { p: 'Many lead players finger the major scale and its modes with **three notes on every string** (3nps). The shape is even and reaches across the neck, but with strict alternate picking the strokes flip on every string (lesson 3), so it\'s a perfect sequence workout. Later units add economy picking and legato as other ways to play it.' },
      ],
    },
    {
      kind: 'learn', title: '4 · How to practise sequences', blocks: [
        { list: [
          'Learn a sequence **in one position** first (pentatonic box 1, then the major scale in position 1).',
          'Accent the **first note of each group**, so you always know where you are.',
          'Go up and down, and **turn around** at the top without a gap.',
          'When it\'s clean, play it in other positions and keys: the shape changes, the idea doesn\'t.',
        ] },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Losing your place in the middle of a sequence.', right: 'Accent the first note of each group and say the numbers.' },
        { wrong: 'Going too fast before the turnaround at the top is clean.', right: 'Practise just the turnaround as a loop.' },
        { wrong: 'Playing sequences only as exercises.', right: 'Take two or three groups into a solo: a short run in 3s sounds musical, not like a drill.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Accent the first note of each group, with the metronome on.',
      challenge: { ...x('Petrucci-style 3nps sixteenth run', 'PK-17', 8, 'clean at 70 BPM'), why: 'A six-note shape on each string pair: the classic test of three-notes-per-string alternate picking.' },
      goals: [
        { focus: 'In 3s', tasks: [x('Minor pentatonic in 3s, position 1', 'SQ-1', 6, 'clean at 80 BPM as triplets'), x('Major scale in 3s, position 1', 'SQ-13', 6, 'clean at 80 BPM')] },
        { focus: 'In 3rds', tasks: [x('Minor pentatonic in 3rds, position 1', 'SQ-49', 6, 'clean at 80 BPM')] },
        { focus: 'Three notes per string', tasks: [x('Three notes per string, up and down', 'PK-9', 6, 'clean at 70 BPM')] },
        { focus: 'A six-note cell', tasks: [x('Six-note alternate cell', 'PK-15', 6, 'bursts at 90 BPM')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Fiddle tunes are full of scale runs in small groups. Red Haired Boy\'s A part walks down the scale in little turns; hear the sequences inside the melody.' },
      ],
      tasks: [tune('Red Haired Boy (melody)', 'redhaired', 'melody', 10, 'the A part clean at 80 BPM')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic and keep the accents on the beat.',
      tasks: [
        { skill: 'Play', ...x('Pentatonic in 3s', 'SQ-1', 3) },
        { skill: 'Play', ...x('Three notes per string', 'PK-9', 4) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Picking scales and sequences". Quiz me as my teacher, one question at a time: (1) what a sequence in 3s, in 4s and in 3rds is, (2) why groups of 3 in sixteenths cross the beat, (3) why three-notes-per-string scales are harder with strict alternate picking, (4) how to practise a sequence. Keep it short.',
        points: ['3s: 1-2-3, 2-3-4…; 4s: 1-2-3-4, 2-3-4-5…; 3rds: 1-3, 2-4…', '3 notes don\'t divide 4 sixteenths, so the group start moves across the beat', 'the stroke flips on every string (odd count), alternating easy and hard changes', 'one position, accent the group start, turn around cleanly, then other positions and keys'],
      },
    },
  ],
}

// ---- Unit 2 · Fretting hand ------------------------------------------------------------------------------------

export const T2_INDEP: CourseLesson = {
  id: 't2-indep', course: 'technique', level: 2, n: 1, title: 'Finger independence and the spider', minutes: 40,
  goal: 'Use one finger per fret with light pressure, keep unused fingers close to the strings, and move each finger without the others following.',
  topics: ['warmup', 'chromatic', 'hand-sync', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Your fretting hand does most of the work you hear: the clarity of each note, the speed of a run, the reach of a chord. Most players have a strong 1st and 2nd finger and a lazy 3rd and 4th that fly away from the neck or drag the others along. Fixing that makes everything else easier, from barre chords to fast legato.' },
      ],
    },
    {
      kind: 'learn', title: '1 · One finger per fret', blocks: [
        { list: [
          'In one position, each finger looks after one fret: 1st finger fret 5, 2nd fret 6, 3rd fret 7, 4th fret 8 (position 5).',
          'Press with the **fingertip**, just **behind the fret** (not on top of it, not in the middle of the gap).',
          'Thumb behind the neck, roughly behind the 2nd finger, so the fingers can arch.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · Just enough pressure', blocks: [
        { p: 'Try this: fret a note and slowly let go until it buzzes, then press just past that point. That is all the pressure you need. Most players press two or three times harder than that, which tires the hand and slows every move.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Fingers stay home', blocks: [
        { p: 'When a finger isn\'t playing, it should **hover just above its string**, not fly up into the air. The less distance a finger travels, the faster and more accurately it lands.' },
        { list: ['Watch your pinky: it\'s usually the one that flies away.', 'Leave fingers down when you can (going up the frets, the lower fingers can stay on the string until you move on).', 'Slow practice with attention beats fast practice without it.'] },
      ],
    },
    {
      kind: 'learn', title: '4 · Permutations and the spider', blocks: [
        { p: 'The chromatic warm-up (1-2-3-4 on each string) is a start. **Permutations** change the order (1-3-2-4, 2-4-1-3…), and each new order trains a different finger combination. There are 24 orders; the awkward ones are the ones that help most.' },
        { p: 'The **spider** moves two fingers at a time on two strings, so one pair stays down while the other moves: the purest independence drill there is.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Pressing as hard as you can.', right: 'Just past the buzz point: light hands move faster.' },
        { wrong: 'The pinky flying an inch off the neck.', right: 'Keep it hovering over its string, ready to land.' },
        { wrong: 'Doing warm-ups fast and on autopilot.', right: 'Slow, with attention on the finger that misbehaves.' },
        { wrong: 'Playing on the flat pads of the fingers.', right: 'Fingertips, with the knuckles arched, so a finger doesn\'t touch the string below.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Five minutes a day beats an hour once a week: these are warm-ups, keep them short and focused.',
      challenge: { ...x('Anchored spider: independent pairs', 'WU-39', 6, 'clean at 66 BPM, no finger lifting more than a centimetre'), why: 'Holding two fingers down while the other two move is the hardest independence test.' },
      goals: [
        { focus: 'The basic warm-up', tasks: [x('Chromatic 1-2-3-4', 'WU-1', 4, 'clean at 70 BPM with light pressure')] },
        { focus: 'Finger pairs', tasks: [x('Finger pairs: 1-2 then 3-4', 'WU-29', 4, 'clean at 70 BPM')] },
        { focus: 'New orders', tasks: [x('Chromatic 1-3-2-4', 'WU-3', 4, 'clean at 60 BPM'), x('Chromatic 1-4-2-3', 'WU-5', 4, 'clean at 60 BPM')] },
        { focus: 'The spider', tasks: [x('Spider walk', 'WU-25', 5, 'clean at 60 BPM')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Trills (two fingers hammering and pulling fast) and fiddle-tune melodies use exactly the finger pairs you trained. Billy in the Lowground runs up the scale with all four fingers.' },
      ],
      tasks: [x('Trills with fingers 1 and 2', 'LG-13', 4, 'even and clear'), tune('Billy in the Lowground (melody)', 'lowground', 'melody', 10, 'the A part at 80 BPM, one finger per fret')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic; then do one slowly while watching your pinky.',
      tasks: [
        { skill: 'Play', ...x('Chromatic 1-2-3-4', 'WU-1', 3) },
        { skill: 'Play', ...x('Spider walk', 'WU-25', 4) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Finger independence and the spider". Quiz me as my teacher, one question at a time: (1) one finger per fret and where to press, (2) how much pressure, (3) why fingers should hover close, (4) what permutations and the spider train. Keep it short.',
        points: ['one finger per fret, fingertip just behind the fret, thumb behind the neck', 'just past the point where it buzzes', 'less travel = faster and more accurate landing', 'new finger orders train different combinations; the spider moves pairs independently'],
      },
    },
  ],
}

export const T2_STRETCH: CourseLesson = {
  id: 't2-stretch', course: 'technique', level: 2, n: 2, title: 'Stretches, shifts and position changes', minutes: 40,
  goal: 'Reach wider spans safely, shift positions smoothly along the neck, and use guide fingers and slides so position changes don\'t break a line.',
  builds: ['t2-indep'],
  topics: ['warmup', 'chromatic', 'hand-sync', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Music doesn\'t stay in one position. Melodies climb the neck, chords stretch across five frets, and every position change is a chance to stumble. A smooth shift is one of the clearest signs of a good player.' },
      ],
    },
    {
      kind: 'learn', title: '1 · Stretching safely', blocks: [
        { list: [
          'Drop the **thumb lower** behind the neck: the fingers can spread wider.',
          'Bring the **elbow in** a little, so the fingers angle across the frets.',
          'Stretches are easier **higher up** the neck where frets are closer: start around fret 7, then work down.',
          'Never force it. A stretch should feel like a stretch, not like pain. Warm up first and stop if anything aches.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · Shifting', blocks: [
        { p: 'A shift moves the whole hand to a new position. Do it from the **elbow**, with the hand relaxed; the fingers arrive together already in shape.' },
        { list: [
          '**Guide finger**: when the same finger plays the last note before the shift and the first note after it, slide it lightly along the string to the new fret. It acts as a rail and you never lose your place.',
          '**Slide shift**: shift on a slide you can hear (a slide into the new note) as part of the music.',
          '**Look ahead**: your eyes go to the new fret before your hand does.',
          '**Release the pressure** during the shift; press again when you land.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '3 · Where to shift', blocks: [
        { p: 'Shift on a note you can afford to be a little late on: an open string, a slide, the end of a phrase. Shifting in the middle of a fast run is harder than shifting on the beat before it.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Reaching with one finger and dragging the hand after it.', right: 'Move the whole hand from the elbow.' },
        { wrong: 'Pressing hard during the shift.', right: 'Let up, glide, press when you land.' },
        { wrong: 'Forcing a stretch low on the neck when the hand is cold.', right: 'Warm up and start higher up the neck.' },
        { wrong: 'Looking at the old position until the last moment.', right: 'Eyes first, hand second.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Short and relaxed: stretch work in five-minute pieces, with a break between.',
      challenge: { ...x('Stretch rack: progressive neck descent', 'WU-34', 6, 'clean at 60 BPM, no strain'), why: 'The stretch gets wider as you move down the neck: a measured way to grow your reach.' },
      goals: [
        { focus: 'A first stretch', tasks: [x('Whole-step stretch (frets 5-7-9)', 'WU-32', 4, 'clean at 60 BPM')] },
        { focus: 'Climbing the neck', tasks: [x('Chromatic climbing the neck', 'WU-28', 5, 'clean at 70 BPM, smooth shifts')] },
        { focus: 'Shifts on one string', tasks: [x('Position shifts on one string', 'PK-3', 5, 'clean at 70 BPM')] },
        { focus: 'Slide shifts', tasks: [x('Slides between boxes 1 and 2', 'LG-22', 5, 'clean at 80 BPM')] },
        { focus: 'The stretch rack', tasks: [go('Drill Lab: stretch rack', { learn: 'exercises' }, 5, 'on the Exercises page', 'one rack at your comfortable width')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Salt Creek\'s B part climbs an octave: shift on a guide finger and the line never breaks. The pentatonic boxes join up through slides (Level 4 of the theory course shows the map).' },
      ],
      tasks: [tune('Salt Creek (melody)', 'saltcreek', 'melody', 10, 'the B part with a smooth shift at 80 BPM'), x('Legato through all five pentatonic boxes', 'LG-33', 6)],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic.',
      tasks: [
        { skill: 'Play', ...x('Chromatic climbing the neck', 'WU-28', 3) },
        { skill: 'Play', ...x('Position shifts on one string', 'PK-3', 3) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Stretches, shifts and position changes". Quiz me as my teacher, one question at a time: (1) how to stretch safely, (2) how to shift, (3) what a guide finger is, (4) where to shift in a line. Keep it short.',
        points: ['thumb lower, elbow in, start higher on the neck, warm up, never force it', 'move the whole hand from the elbow, release the pressure, look ahead', 'the same finger slides along the string to the new position', 'on an open string, a slide or the end of a phrase rather than mid-run'],
      },
    },
  ],
}

export const T2_SYNC: CourseLesson = {
  id: 't2-sync', course: 'technique', level: 2, n: 3, title: 'Hand synchronisation and clean tone', minutes: 40,
  goal: 'Make both hands land together, stop notes cleanly, mute the strings you aren\'t playing, and hear the difference on a recording.',
  builds: ['t2-stretch'],
  topics: ['hand-sync', 'speed', 'endurance', 'alternate-picking', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Fast and sloppy is easy. Clean is what makes playing sound professional: every note starts on time, rings for its full length and stops when the next one starts, with no buzz, no open strings humming underneath. Almost all of that comes from the two hands working **together**.' },
      ],
    },
    {
      kind: 'learn', title: '1 · The fretting finger lands first', blocks: [
        { p: 'For a clean note, the fretting finger has to be down **just before** the pick hits. If the pick arrives first, you hear a split second of the old note or a buzz. At slow tempos this is easy; at speed the fretting hand tends to lag.' },
        { p: 'Practise slowly and listen to the **start** of each note: it should be one clean "tick", not a smear.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Stopping notes', blocks: [
        { p: 'A note ends when the next one starts, or when you lift the fretting finger just enough (not off the string) to stop it. Lifting a finger right off the string lets the open string ring. Ease off, don\'t let go.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Muting', blocks: [
        { list: [
          '**Picking hand**: the side of the palm rests on the strings **below** the one you\'re playing (the lower-pitched ones) and moves with you across the strings.',
          '**Fretting hand**: the underside of the fretting finger touches the string **above** it, and spare fingers lie lightly across the higher strings.',
          'Together they cover every string you\'re not playing. Unit 9 goes deeper.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '4 · Record and listen', blocks: [
        { p: 'You can\'t hear sync problems while you play: your brain fills in what you meant. Record 30 seconds at your working tempo, listen back, and mark where a note was late, buzzed or rang over the next one. Fix that spot slowly, then record again.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Practising fast so the mess is hidden by speed.', right: 'Slow enough that you can hear each note start and stop.' },
        { wrong: 'Lifting fingers right off the string between notes.', right: 'Ease off so the note stops but the open string doesn\'t ring.' },
        { wrong: 'Muting only with the picking hand.', right: 'Both hands share the muting.' },
        { wrong: 'Judging your playing only while you play.', right: 'Record and listen back: the recording tells the truth.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Listen to the start and the end of every note. Record yourself once at the start and once at the end.',
      challenge: { ...x('Pedal-tone run', 'PK-10', 6, 'clean at 70 BPM, no notes ringing over each other'), why: 'Fast shifts against a repeated note: sync and muting at once.' },
      goals: [
        { focus: 'Slow and clean', tasks: [x('Chromatic 1-2-3-4', 'WU-1', 4, 'at 60 BPM in sixteenths with no buzz')] },
        { focus: 'Even notes', tasks: [x('Sixteenth notes', 'RH-10', 4, 'every note the same length')] },
        { focus: 'Across strings', tasks: [x('Three notes per string, up and down', 'PK-9', 6, 'clean at 70 BPM')] },
        { focus: 'Listen back', tasks: [go('Record yourself and listen', { tool: 'recordings' }, 5, 'My recordings', 'one recording where every note starts and stops cleanly')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Take a fiddle tune you already know at a slower tempo than usual and play it as cleanly as you can: no notes ringing over each other, no buzz. Then record it.' },
      ],
      tasks: [tune('Eighth of January (melody)', 'eighthjan', 'melody', 8, 'the whole tune clean at 80 BPM')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play with the mic; the mic hears late and missing notes.',
      tasks: [
        { skill: 'Play', ...x('Three notes per string', 'PK-9', 4) },
        { skill: 'Play', ...x('Pedal-tone run', 'PK-10', 4) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Hand synchronisation and clean tone". Quiz me as my teacher, one question at a time: (1) which hand should land first and why, (2) how to stop notes cleanly, (3) how both hands mute, (4) why recording yourself matters. Keep it short.',
        points: ['the fretting finger lands just before the pick', 'ease off the string, don\'t lift away', 'picking palm on the lower strings, fretting fingers on the higher ones', 'you can\'t hear sync problems while playing; the recording does'],
      },
    },
  ],
}

// ---- Unit 3 · Legato -------------------------------------------------------------------------------------------
const licks = (label: string, style: string, minutes: number, goal?: string): Task => ({ label, go: { licks: style }, minutes, note: 'the must-know licks', goal })

export const T3_HOPO: CourseLesson = {
  id: 't3-hopo', course: 'technique', level: 3, n: 1, title: 'Hammer-ons and pull-offs', minutes: 40,
  goal: 'Hammer on and pull off with notes as loud and as even as picked ones, in time, with the other strings quiet.',
  builds: ['t2-sync'],
  topics: ['legato', 'hammer-ons', 'pull-offs', 'hand-sync', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: '**Legato** means smooth and connected. On the guitar it means sounding notes with the fretting hand alone: a **hammer-on** (a finger comes down hard enough to sound the note) and a **pull-off** (a finger leaves the string with a little sideways flick that plucks it). They make lines flow, let you play fast with half the picking, and they are in every style, from bluegrass G runs to Satriani.' },
        { p: 'By the end you\'ll be able to:' },
        { list: ['hammer on from any finger to any finger with a clear, loud note;', 'pull off with a flick, not a lift;', 'keep hammered and pulled notes in time with picked ones;', 'mute the strings you aren\'t playing.'] },
      ],
    },
    {
      kind: 'learn', title: '1 · The hammer-on', blocks: [
        { list: [
          'Pick the first note, then bring the next finger down **fast**, on its **fingertip**, right behind the fret. Speed makes the sound, not force.',
          'Hammer from a short distance: a finger hovering just above the string is quicker and more accurate than one swinging down from high up.',
          'A **hammer-on from nowhere** sounds a note on a string you haven\'t picked: just hammer hard enough. Common in modern legato.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · The pull-off', blocks: [
        { list: [
          'The lower note must already be fretted (or be the open string) **before** you pull.',
          'Pull the finger **down and slightly sideways** (towards the floor), so it plucks the string as it leaves. Lifting straight up makes a weak note.',
          'Don\'t pull so far that you catch the next string; a small flick is enough.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '3 · Even and in time', blocks: [
        { p: 'Legato notes tend to come out quieter and rushed. Two fixes: pick a slow, steady rhythm and make the hammered note land **exactly** on its subdivision; and compare by ear, alternating a picked bar and a legato bar until they sound alike.' },
        { p: '**Trills** (fast hammer-pull-hammer-pull between two fingers) build strength and endurance: short bursts, relaxed.' },
      ],
    },
    {
      kind: 'learn', title: '4 · Keep the other strings quiet', blocks: [
        { p: 'Legato is loud on the fretting hand, so open strings start to ring. Lay the underside of the first finger lightly across the higher strings, and the picking-hand palm across the lower ones. With distortion this matters twice as much.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Hammering with the pad of the finger, or slowly.', right: 'Fingertip, fast, from close to the string.' },
        { wrong: 'Lifting the finger straight up for a pull-off.', right: 'Pull down and slightly sideways: a little flick plucks the string.' },
        { wrong: 'Legato notes quieter and earlier than picked ones.', right: 'Compare a picked bar and a legato bar by ear until they match.' },
        { wrong: 'Open strings ringing under every pull-off.', right: 'Fretting-hand finger across the higher strings, palm on the lower ones.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Strength comes in short sessions: five minutes, a break, five more. Stop if the hand aches.',
      challenge: { ...x('Blue-note trill', 'LG-25', 5, 'even trill for 2 bars'), why: 'A trill on the blue note is a sound you\'ll use in solos, and a strength test for the weak fingers.' },
      goals: [
        { focus: 'Hammer-ons with every finger pair', tasks: [x('Hammer-ons with fingers 1 and 3', 'LG-2', 4, 'clean at 70 BPM'), x('Hammer-ons with fingers 1 and 4', 'LG-3', 4, 'the pinky as loud as the rest')] },
        { focus: 'Pull-offs', tasks: [x('Pull-offs with fingers 1 and 3', 'LG-8', 4, 'clean at 70 BPM'), x('Pull-offs to the open string', 'LG-26', 4, 'no other strings ringing')] },
        { focus: 'Trills', tasks: [x('Trills with fingers 1 and 2', 'LG-13', 4, 'even for one bar'), x('Trills with fingers 2 and 3', 'LG-16', 4, 'even for one bar')] },
        { focus: 'In a scale', tasks: [x('Hammer-ons up pentatonic box 1', 'LG-19', 5, 'clean at 80 BPM'), x('Pull-offs down pentatonic box 1', 'LG-20', 5, 'clean at 80 BPM')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Hammer-ons and pull-offs are in nearly every lick: a blues lick that pulls off to the root, a bluegrass G run that hammers from the open string. Find them in the must-know licks and play them with the same evenness as the drills.' },
      ],
      tasks: [x('Hammer-pull triplets in box 1', 'LG-21', 5, 'clean at 80 BPM'), licks('Blues licks: find the hammer-ons', 'blues', 8, 'two licks with clean legato')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic: it hears the quiet notes too.',
      tasks: [
        { skill: 'Play', ...x('Hammer-ons up pentatonic box 1', 'LG-19', 3) },
        { skill: 'Play', ...x('Pull-offs down pentatonic box 1', 'LG-20', 3) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Hammer-ons and pull-offs". Quiz me as my teacher, one question at a time: (1) how to hammer on so the note is loud, (2) how to pull off, (3) how to keep legato notes even and in time, (4) how to stop other strings ringing. Keep it short.',
        points: ['fingertip, fast, from close to the string, right behind the fret', 'lower note fretted first; pull down and sideways, a flick', 'compare picked and legato bars by ear; land exactly on the subdivision', 'fretting finger across the higher strings, palm on the lower ones'],
      },
    },
  ],
}

export const T3_RUNS: CourseLesson = {
  id: 't3-runs', course: 'technique', level: 3, n: 2, title: 'Legato scale runs: three notes per string', minutes: 45,
  goal: 'Play three-notes-per-string scale runs with one pick per string, keeping the rhythm even and the notes at the same volume.',
  builds: ['t3-hopo', 't1-seq'],
  topics: ['legato', '3nps', 'speed', 'sequences', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'The smooth, flowing runs of players like Joe Satriani, Allan Holdsworth, Plini and Mancuso are mostly legato: pick the first note on a string, hammer the next two, move on. With three notes on every string the pattern repeats on each string, which makes it a natural way to play scales fast and smooth.' },
      ],
    },
    {
      kind: 'learn', title: '1 · One pick per string', blocks: [
        { list: [
          '**Going up**: pick the first note on each string, hammer the other two.',
          '**Coming down**: pick the first (highest) note on each string, then pull off twice.',
          'Some players don\'t pick at all and hammer from nowhere on each new string (fully legato). Try both; the picked version is easier to keep in time at first.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · Groups of three in time', blocks: [
        { p: 'Three notes per string fall naturally into **triplets**: one string per beat. Play the run as triplets first, saying "1-trip-let, 2-trip-let". Then play it as **sixteenths**, where the string change moves across the beat (like the sequences in 3s in Unit 1). Both are useful; the sixteenth version sounds more "fusion".' },
      ],
    },
    {
      kind: 'learn', title: '3 · Stretch and position', blocks: [
        { p: 'Three-note-per-string shapes often need a whole-step stretch between fingers 1 and 2 and between 3 and 4 (Unit 2). Start them higher on the neck (around fret 7), and use fingers 1-2-4 or 1-3-4 for the wide shapes so the hand stays relaxed.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'The picked note much louder than the two legato notes.', right: 'Pick lightly and hammer firmly, until the three notes match.' },
        { wrong: 'Rushing the legato notes, so the run speeds up.', right: 'Triplets with the metronome; each note on its subdivision.' },
        { wrong: 'Strain from forcing wide stretches low on the neck.', right: 'Start around fret 7 and move down as the hand opens.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Triplets first, then sixteenths. Same volume on every note.',
      challenge: { ...x('3NPS rolling legato (1-2-3-2-3-4)', 'LG-35', 8, 'clean at 70 BPM'), why: 'A rolling six-note shape that the great legato players use to cover the neck.' },
      goals: [
        { focus: 'Natural minor', tasks: [x('Legato run: natural minor', 'LG-27', 6, 'clean at 70 BPM as triplets')] },
        { focus: 'Major scale', tasks: [x('Legato run: major scale', 'LG-28', 6, 'clean at 70 BPM as triplets')] },
        { focus: 'A six-note cell', tasks: [x('Legato 6-note sextuplet cell', 'LG-34', 6, 'bursts at 80 BPM')] },
        { focus: 'Coming down', tasks: [x('Descending pull-off cascade', 'LG-36', 6, 'clean at 70 BPM')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Take a legato run into a melodic prog or rock solo: one run in the middle of a phrase, then land on a chord tone with vibrato.' },
      ],
      tasks: [x('Legato run: dorian', 'LG-29', 6), licks('Melodic prog licks', 'progclean', 8, 'one lick with a legato run, clean')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic.',
      tasks: [
        { skill: 'Play', ...x('Legato run: natural minor', 'LG-27', 4) },
        { skill: 'Play', ...x('Legato run: major scale', 'LG-28', 4) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Legato scale runs: three notes per string". Quiz me as my teacher, one question at a time: (1) how to pick a 3nps legato run up and down, (2) playing it as triplets versus sixteenths, (3) fingerings and where to start on the neck, (4) how to keep the notes even. Keep it short.',
        points: ['pick the first note on each string, hammer up / pull off down', 'triplets put each string on a beat; sixteenths move the string change across the beat', 'fingers 1-2-4 or 1-3-4 for wide shapes, start around fret 7', 'light pick, firm hammer, metronome triplets'],
      },
    },
  ],
}

export const T3_FLOW: CourseLesson = {
  id: 't3-flow', course: 'technique', level: 3, n: 3, title: 'Legato across strings and slides', minutes: 45,
  goal: 'Join legato across strings and along the neck with slides, so long lines flow without a break and change position on the way.',
  builds: ['t3-runs', 't2-stretch'],
  topics: ['legato', 'slides', 'speed', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Legato in one position is a shape. Real legato lines travel: up one string on a slide, across a few strings with hammer-ons from nowhere, into a new position. This is the sound of fluid lead players.' },
      ],
    },
    {
      kind: 'learn', title: '1 · Slides', blocks: [
        { list: [
          '**Slide up** to a note: pick, then keep the pressure on as the finger glides to the new fret. Ease off a little during the glide, press as you arrive.',
          '**Slide into** a note from a fret or two below (no picked start note): a quick vocal swoop.',
          'Slides are also **position shifts**: use them to move the whole hand into a new box (Unit 2).',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · Hammer-ons from nowhere', blocks: [
        { p: 'To change string without picking, hammer the first note on the new string hard enough to sound it. It\'s quieter at first; the trick is speed of the finger, and muting so the old string stops.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Horizontal lines', blocks: [
        { p: 'Play a scale up **one string** with hammer-ons and slides (two notes, slide, two notes, slide). Lines along one string sound vocal and connect the positions of the neck.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Letting the pressure go during a slide, so the note dies.', right: 'Keep enough pressure to keep it ringing; ease, don\'t lift.' },
        { wrong: 'Hammers from nowhere so quiet they disappear.', right: 'Fast fingers, and mute the string you left so the new note stands out.' },
        { wrong: 'Sliding past the target fret.', right: 'Eyes on the target; slow slides first, then faster.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Listen for one long connected line: no gaps where the hand moves.',
      challenge: { ...x('Symmetrical diminished legato climb', 'LG-40', 8, 'clean at 60 BPM'), why: 'A long climbing shape with stretches and slides: a test of everything in this unit.' },
      goals: [
        { focus: 'Slides', tasks: [x('Slides up and down one string', 'LG-23', 5, 'clean at 80 BPM')] },
        { focus: 'From nowhere', tasks: [x('Hammer-ons from nowhere', 'LG-24', 5, 'each note clear')] },
        { focus: 'Along one string', tasks: [x('Horizontal one-string legato + slide loop', 'LG-39', 6, 'clean at 70 BPM')] },
        { focus: 'Through the boxes', tasks: [x('Legato through all five pentatonic boxes', 'LG-33', 6, 'clean at 70 BPM')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Classic rock and blues licks slide between boxes all the time. Play two licks that use a slide to change position.' },
      ],
      tasks: [licks('Classic rock licks', 'rock', 8, 'two licks with a position slide')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic.',
      tasks: [
        { skill: 'Play', ...x('Slides up and down one string', 'LG-23', 3) },
        { skill: 'Play', ...x('Legato through the pentatonic boxes', 'LG-33', 4) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Legato across strings and slides". Quiz me as my teacher, one question at a time: (1) how to slide so the note keeps ringing, (2) what a hammer-on from nowhere is and how to make it loud, (3) why horizontal lines help. Keep it short.',
        points: ['keep some pressure, ease during the glide, press on arrival', 'hammer the first note on a new string without picking; fast finger, mute the old string', 'one-string lines sound vocal and connect positions'],
      },
    },
  ],
}

// ---- Unit 4 · Bends and vibrato --------------------------------------------------------------------------------
const BEND_TRAINER = (goal: string) => go('Bends & vibrato trainer: see your pitch', { tool: 'bends' }, 6, 'shows how close each bend gets to the target', goal)

export const T4_BEND: CourseLesson = {
  id: 't4-bend', course: 'technique', level: 4, n: 1, title: 'Bending in tune', minutes: 40,
  goal: 'Bend a half step, a whole step and a step and a half to the right pitch, pre-bend and release in tune, and hear the target before you bend.',
  builds: ['t3-hopo'],
  topics: ['bends', 'blues', 'phrasing', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'A bend is the guitar\'s voice: it slides the pitch up like a singer. A bend **in tune** sounds expressive; a bend a little flat sounds like a mistake. Most players never check, and their bends are flat. This lesson trains the ear and the hand together.' },
      ],
    },
    {
      kind: 'learn', title: '1 · How to bend', blocks: [
        { list: [
          '**Use more than one finger**: bending with the 3rd finger? Put the 2nd (and 1st) on the same string behind it and push together.',
          '**Push from the wrist**: the hand rotates, like turning a key; the fingers mostly stay firm. The thumb hooks over the top of the neck for leverage.',
          '**Which way**: push the G, B and high E strings **up** (towards the ceiling); pull the low E and A strings **down**.',
          '**Mute**: the bending fingers touch the string above, the picking palm the ones below, so nothing rings as the string moves.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · Hear the target first', blocks: [
        { p: 'Before every bend, **play the target note** (2 frets up for a whole step, 1 for a half), listen, then bend up to match it. Do this for weeks: the ear learns the target and the hand learns how far to push.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Pre-bends and releases', blocks: [
        { p: 'A **pre-bend** is bent before you pick it, then released down to the fretted note: the reverse of a bend, a "crying" sound. A **bend and release** goes up and back down in rhythm. Both need the bend in tune at the top, which you can\'t hear first, so the feel you built in step 2 does the work.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Bending with one finger and the fingers alone.', right: 'Fingers together, rotate from the wrist, thumb over the neck.' },
        { wrong: 'Bends that stop short of the target (flat).', right: 'Play the target first, then bend to match it.' },
        { wrong: 'Other strings ringing as the bend moves.', right: 'Mute with both hands.' },
        { wrong: 'Releasing so the note slides back out of time.', right: 'Release in rhythm, like any other note.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Every bend: target first, then bend. Use the trainer to see how close you get.',
      challenge: { ...x('Step-and-a-half bends', 'BV-5', 6, 'in tune, 4 in a row'), why: 'The big blues bend: you need the ear and the strength.' },
      goals: [
        { focus: 'Whole steps', tasks: [x('Whole-step bend: hear the target first', 'BV-1', 5, 'in tune 4 times in a row'), x('Whole-step bends on the B string', 'BV-2', 4)] },
        { focus: 'Half steps', tasks: [x('Half-step bends to the blue notes', 'BV-4', 5, 'in tune')] },
        { focus: 'Pre-bend and release', tasks: [x('Pre-bend and release', 'BV-6', 5, 'in tune at the top'), x('Bend and release in rhythm', 'BV-7', 4)] },
        { focus: 'See it', tasks: [BEND_TRAINER('your bends within a few cents of the target')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Blues is built on bends. Play the bending licks and check each one: does it reach the note?' },
      ],
      tasks: [x('Bend to every note of box 1', 'BV-13', 6), licks('Blues licks with bends', 'blues', 8, 'two licks, every bend in tune')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic.',
      tasks: [
        { skill: 'Play', ...x('Whole-step bends on the high E', 'BV-3', 3) },
        { skill: 'Play', ...x('Pre-bend and release', 'BV-6', 3) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Bending in tune". Quiz me as my teacher, one question at a time: (1) how to bend (fingers, wrist, thumb, direction), (2) how to keep bends in tune, (3) what pre-bends and releases are, (4) how to mute while bending. Keep it short.',
        points: ['fingers together, rotate from the wrist, thumb over the neck; G B E up, low E and A down', 'play the target note first, then bend to match', 'pre-bend: bent before picking then released; release in rhythm', 'bending fingers touch the string above, picking palm the ones below'],
      },
    },
  ],
}

export const T4_VIB: CourseLesson = {
  id: 't4-vib', course: 'technique', level: 4, n: 2, title: 'Vibrato: width and speed', minutes: 35,
  goal: 'Play an even vibrato from the wrist, choose its width and speed on purpose, and add vibrato on top of a bend.',
  builds: ['t4-bend'],
  topics: ['vibrato', 'bends', 'phrasing', 'tone', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Vibrato is the fingerprint of a guitarist: B.B. King\'s quick shimmer, Gilmour\'s wide slow sway, Mayer\'s blend of both. A note with good vibrato sings; without it, even a great note sounds plain. It\'s also the thing most players never practise on its own.' },
      ],
    },
    {
      kind: 'learn', title: '1 · Where it comes from', blocks: [
        { list: [
          '**Wrist vibrato** (the classic rock and blues one): small repeated bends, rotating from the wrist with the thumb over the neck, just like a bend.',
          '**Finger vibrato**: the finger rocks along the string (classical style), a subtler, narrower sound.',
          'The pitch goes **up and back** to the note; it shouldn\'t dip below it.',
        ] },
      ],
    },
    {
      kind: 'learn', title: '2 · Width and speed', blocks: [
        { p: '**Width** is how far the pitch moves (a quarter step to a whole step); **speed** is how fast it moves. Practise them separately: slow and narrow, slow and wide, fast and narrow, fast and wide. Then lock the vibrato to the beat (2 or 4 movements per beat) so it sounds controlled, not nervous.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Vibrato on a bend', blocks: [
        { p: 'At the top of a bend, let the bend go down a little and push it back up, again and again. The hard part is keeping the **top** of each movement in tune.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'A fast, nervous wobble on every note.', right: 'Choose the width and speed; lock it to the beat.' },
        { wrong: 'Vibrato that goes below the note.', right: 'Up from the note and back, like small bends.' },
        { wrong: 'Starting vibrato the moment the note starts, every time.', right: 'Let some notes ring straight first, then add vibrato: a delayed vibrato sounds vocal.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Use a long note on the G or B string, around fret 7. Try one setting at a time.',
      challenge: { ...x('Vibrato on a bend', 'BV-12', 6, 'the top of each movement in tune'), why: 'The sound of a blues climax: a bent note held and shaken in tune.' },
      goals: [
        { focus: 'Slow and even', tasks: [x('Vibrato: slow and even', 'BV-10', 4, '2 movements a beat at 70 BPM')] },
        { focus: 'Fast and wide', tasks: [x('Vibrato: fast and wide', 'BV-11', 4, '4 movements a beat, even')] },
        { focus: 'See it', tasks: [BEND_TRAINER('an even vibrato line on the trainer')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'End every phrase in a solo with a long note and your best vibrato. Try a blues-pop lick with a slow, wide vibrato at the end.' },
      ],
      tasks: [licks('Blues-pop licks', 'mayer', 8, 'every lick ends with a controlled vibrato')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic.',
      tasks: [
        { skill: 'Play', ...x('Vibrato: slow and even', 'BV-10', 3) },
        { skill: 'Play', ...x('Vibrato on a bend', 'BV-12', 3) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Vibrato: width and speed". Quiz me as my teacher, one question at a time: (1) wrist versus finger vibrato, (2) width and speed and how to control them, (3) vibrato on a bend. Keep it short.',
        points: ['wrist: small repeated bends with the thumb over the neck; finger: rocking along the string', 'width = how far, speed = how fast; practise separately; lock it to the beat', 'let the bend down a little and back up, keeping the top in tune'],
      },
    },
  ],
}

export const T4_EXPR: CourseLesson = {
  id: 't4-expr', course: 'technique', level: 4, n: 3, title: 'Expressive bends: unison, oblique and double-stop bends', minutes: 40,
  goal: 'Play unison bends, oblique bends (one string bent under a held note) and double-stop bends in tune, and use them in licks.',
  builds: ['t4-vib'],
  topics: ['bends', 'double-stops', 'phrasing', 'blues', 'technique'],
  steps: [
    {
      kind: 'why', title: 'Why this matters', blocks: [
        { p: 'Bending one string while another rings is where bends get their big sounds: the rock unison bend that "beats" until it locks in tune, the country oblique bend that sounds like a pedal steel, the Chuck Berry double-stop bend.' },
      ],
    },
    {
      kind: 'learn', title: '1 · Unison bends', blocks: [
        { p: 'Fret a note on the B string with the 1st finger (say fret 5, an E). On the G string, two frets further up the neck (fret 7, a D), bend with the 3rd finger up a whole step, so the two strings play the **same note**. You hear a fast wobble while they are out of tune; it stops when they match. That wobble is your tuner.' },
      ],
    },
    {
      kind: 'learn', title: '2 · Oblique bends', blocks: [
        { p: 'Hold a note on one string and bend a different string **under** it, so one note stays and the other moves. Country players use it to copy the pedal steel guitar. Keep the held note firm: it tends to get pulled out of tune.' },
      ],
    },
    {
      kind: 'learn', title: '3 · Double-stop bends', blocks: [
        { p: 'Two notes on neighbouring strings, both bent together with one finger (often the G and B strings, barred with the 3rd finger). The two strings bend by different amounts, which is part of the gritty sound.' },
      ],
    },
    {
      kind: 'mistakes', title: 'Common mistakes', items: [
        { wrong: 'Stopping a unison bend while it still wobbles.', right: 'Push until the wobble stops: that\'s in tune.' },
        { wrong: 'The held note in an oblique bend going sharp or dead.', right: 'Keep its finger firm and arched so it doesn\'t touch the bending string.' },
      ],
    },
    {
      kind: 'practice', title: 'Practice goals', intro: 'Listen for the beating in unison bends: it\'s the best bending teacher there is.',
      challenge: { ...x('Bends in a minor melody', 'BV-14', 6, 'every bend in tune'), why: 'Bends inside a melody, where they have to land in time and in tune.' },
      goals: [
        { focus: 'Unison', tasks: [x('Unison bends', 'BV-8', 5, 'no wobble at the top, 4 in a row')] },
        { focus: 'Oblique', tasks: [x('Oblique bends', 'BV-9', 5, 'the held note steady')] },
        { focus: 'Double stops first', tasks: [x('Double stops: 3rds on the top two strings', 'IV-6', 5, 'clean at 70 BPM')] },
      ],
    },
    {
      kind: 'use', title: 'Use it in music', blocks: [
        { p: 'Country and classic rock licks are full of these bends. Play two of each.' },
      ],
      tasks: [licks('Country licks', 'country', 8, 'two licks with an oblique bend'), licks('Classic rock licks', 'rock', 6, 'one unison bend lick')],
    },
    {
      kind: 'check', title: 'Check', intro: 'Play these with the mic.',
      tasks: [
        { skill: 'Play', ...x('Unison bends', 'BV-8', 3) },
        { skill: 'Play', ...x('Oblique bends', 'BV-9', 3) },
      ],
      explain: {
        prompt: 'I just finished the KGuitar lesson "Expressive bends: unison, oblique and double-stop bends". Quiz me as my teacher, one question at a time: (1) how a unison bend works and how to hear it\'s in tune, (2) what an oblique bend is and where it comes from, (3) how a double-stop bend is played. Keep it short.',
        points: ['bend the lower string up to the pitch of the higher fretted note; the wobble stops when in tune', 'one note held while another string bends under it; copies the pedal steel', 'two neighbouring strings barred with one finger and bent together'],
      },
    },
  ],
}

export const TECHNIQUE: CourseLesson[] = [T1_GRIP, T1_ALT, T1_CROSS, T1_SEQ, T2_INDEP, T2_STRETCH, T2_SYNC, T3_HOPO, T3_RUNS, T3_FLOW, T4_BEND, T4_VIB, T4_EXPR]
