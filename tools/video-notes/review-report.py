#!/usr/bin/env python3
"""Turns a review run (video-notes/review-<list>.json from run-mac.js --review) into a pick sheet per lesson, for Claude to
choose each lesson's 2-3 videos and its drills: candidates ranked by fit, teaching and practice, with the best part, the
drills (times, tempo, tab when Gemini could read it and how sure it was) and the verdict.

  python3 tools/video-notes/review-report.py <review-<list>.json> [lesson-id …] > sheet.md
"""
import json, sys, collections

state = json.load(open(sys.argv[1]))
only = set(sys.argv[2:])
by = collections.defaultdict(list)
for k, v in state.get('notes', {}).items():
    n = v.get('note') or {}
    if not isinstance(n, dict) or (only and v.get('lessonId') not in only): continue
    by[v.get('lessonId')].append((v, n))
for lid in sorted(by):
    print(f'\n## {lid}\n')
    rows = sorted(by[lid], key=lambda x: -((x[1].get('fit') or 0) * 2 + (x[1].get('teaching') or 0) + (x[1].get('practice') or 0)))
    for v, n in rows:
        s = (n.get('fit') or 0) * 2 + (n.get('teaching') or 0) + (n.get('practice') or 0)
        print(f"### {v['id']} · {n.get('teacher') or ''} · {v.get('title', '')}  (fit {n.get('fit')}, teaching {n.get('teaching')}, practice {n.get('practice')} = {s}; {n.get('level')}; tab on screen: {n.get('tabOnScreen')})")
        print(f"{n.get('summary', '')}\n")
        b = n.get('bestPart') or {}
        if b: print(f"- best part {b.get('from')}–{b.get('to')}: {b.get('why', '')}")
        if n.get('skip'): print(f"- skip: {n.get('skip')}")
        for p in n.get('keyPoints') or []: print(f'- point: {p}')
        for p in n.get('mistakes') or []: print(f'- mistake: {p}')
        for d in n.get('drills') or []:
            print(f"- DRILL {d.get('from')}–{d.get('to')} {d.get('name', '')}: {d.get('what', '')} (tempo: {d.get('tempo')})")
            if d.get('tab'): print(f"  tab (sure {d.get('tabSure')}/5):\n```\n{d['tab']}\n```")
        print(f"- verdict: {n.get('verdict', '')}\n")
    failed = [k for k in state.get('failed', {}) if k.split('|')[1:2] == [lid]]
    if failed: print(f'(failed: {len(failed)})')
