#!/usr/bin/env python3
"""Make paid-jobs.json for run-mac.js --paid: one job per lesson video of the owner's own video courses.

  python3 make-paid-jobs.py <kguitar-all-courses.json> <jobs.json> <out paid-jobs.json> [creators/review-*.tsv ...]

The course maps (Gemini's kguitar-all-courses.json, in his Google Drive) and the output are HIS: they live only on his Mac and are
never committed. The prompt lists our theory course (from jobs.json's matchPrompt) plus the pathway lessons from the review lists
(technique / bluegrass / acoustic), so every course video is matched to the lessons it fits, with times and drills.
"""
import json
import sys

# watch order (owner 2026-11-28): Speed Builder first, Hexatonic last. folderKey = part of the course's folder name in KGuitar-Courses.
COURSES = [
    ('Speed Builder', 'Speed Builder'),
    ('Mancuso', 'Mancuso'),
    ('Acoustic Adventure', 'Acoustic Adventure'),
    ('Electric Elevation', 'Electric Elevation'),
    ('Modes Navigator', 'Modes Navigator'),
    ('Hexatonic', 'Hexatonic'),
]

PROMPT = """You are helping a guitar teacher plan lessons for one student: a late-beginner / early-intermediate guitarist who wants to get really good. The student owns the paid video course "{COURSE}" by {INSTRUCTOR}. This video is its lesson "{TITLE}" (chapter "{CHAPTER}"). The teacher wants to send the student to exactly the right minutes of this video from inside the teacher's own lessons, and to build practice around its drills.

The teacher's lessons (lesson id · title — sections):
%s

Watch the whole video, listen to what is said and played, and answer with ONE JSON object only, no other text:
{
 "summary": "2-3 plain sentences: what this video teaches and how",
 "level": "beginner" | "intermediate" | "advanced",
 "topics": ["short topic words: e.g. alternate picking, legato, modes, Dorian, strumming, fingerstyle"],
 "keyPoints": ["the points it stresses (hand position, motion, timing, theory ideas)"],
 "mistakes": ["common mistakes it warns about"],
 "matches": [ { "lessonId": "an id from the list", "section": "the section it fits best, or \\"whole lesson\\"", "from": "m:ss", "to": "m:ss", "what": "what is taught in this part, concretely", "fit": 1 to 5 } ],
 "drills": [ { "name": "short name", "from": "m:ss", "to": "m:ss", "what": "what to play and how to practise it (steps, repeats)", "tempo": "start/target BPM or speed advice if given, else null", "onTab": true if the course's tab or the screen shows it } ],
 "bestPart": { "from": "m:ss", "to": "m:ss", "why": "the part to watch if the student watches only one part" },
 "notCourse": "what the video teaches that the teacher's lessons don't cover (or empty)"
}
Rules: only real matches (fit 3 or more), best first, at most 8; times must be real times in this video; never invent content. Don't write out tabs or long quotes (the student owns the course's own tab sheets). Plain English."""


def main():
    maps_path, jobs_path, out_path, *tsvs = sys.argv[1:]
    maps = json.load(open(maps_path))['maps']
    mp = json.load(open(jobs_path))['matchPrompt']
    a = mp.index('\n', mp.index('The course (lesson id')) + 1
    b = mp.index('\n\nAnswer with JSON')
    theory = mp[a:b].strip()
    paths, seen = [], set()
    for t in tsvs:
        for line in open(t, encoding='utf-8'):
            f = line.rstrip('\n').split('\t')
            if len(f) >= 5 and f[3] and f[3] not in seen:
                seen.add(f[3])
                paths.append(f'{f[3]} · {f[4]} ({f[5] if len(f) > 5 else "pathway"}) — sections: whole lesson')
    outline = theory + ('\n' + '\n'.join(paths) if paths else '')
    jobs = []
    for key, folder in COURSES:
        m = next((m for m in maps if key.lower() in m['title'].lower()), None)
        if not m:
            print('no map for', key)
            continue
        n = 0
        for ch in m['chapters']:
            for ls in ch['lessons']:
                if not ls.get('video'):
                    continue
                jobs.append({
                    'key': f"paid|{ls['id']}", 'id': ls['id'], 'lessonId': ls['id'], 'title': ls['title'],
                    'chapter': ch.get('title', ''), 'course': m['title'], 'instructor': m.get('instructor', ''),
                    'folderKey': folder, 'video': ls['video'], 'topics': ls.get('topics', []), 'secs': 0,
                })
                n += 1
        print(f'{m["title"]}: {n} videos')
    json.dump({'prompt': PROMPT % outline, 'jobs': jobs}, open(out_path, 'w'), ensure_ascii=False, indent=1)
    print(len(jobs), 'jobs ->', out_path, f'({len(paths)} pathway lessons in the outline)')


if __name__ == '__main__':
    main()
