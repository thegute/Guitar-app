#!/usr/bin/env python3
"""Builds src/course/watch.ts: the best LoG Sounds / Signals Music Studio (and other) videos for each theory lesson, each part
placed in the lesson step it teaches, from the Mac's creator-match notes (video-notes/match-*.json).

  python3 tools/video-notes/make-watch.py <folder with match-*.json>

Rules (owner 2026-11-21 / 11-28: several videos per lesson, each in its section with timestamped parts; LoG first, Signals
second): fit 4-5 only; parts of 45 s or more; a video whose title isn't about the lesson needs a part of 2+ minutes; up to 3
videos per lesson, up to 3 parts each; DROP = picks Claude ruled out by hand (wrong topic or level for the lesson).
"""
import json, re, sys, collections, glob, os

folder = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
# lesson ids Gemini used that were renamed / moved
MAP = {'c5-extensions': 'c5-ext', 'c4-arps': 'c6-arps', 'c4-arp7': 'c6-arps', 'c4-mixpent': 'c6-mixpent',
       'c5-borrowed': 'c7-borrowed', 'c5-secdom': 'c7-secdom', 'c3-borrowed': 'c7-borrowed'}
DROP = {
  'c1-landmarks': ['SfveCQGn86w'], 'c1-octaves': ['RQoLvh11oAs', 'SfveCQGn86w'], 'c1-reading': ['MqyrPzvN3Zc', 'hiQmf7wX3IQ'],
  'c1-rhythm': ['wqNFvXhB5U0', '-6Vvm91kTIM'], 'c2-intervals': ['u9up7Rd-A8A', 'Wy7rkqeRqwo'], 'c2-keys': ['Ou_Z9ol8r0I', 'Vxac3hHrxg8'],
  'c2-major': ['i7ByTjkRJFY', 'Ou_Z9ol8r0I'], 'c2-rhythm': ['T8AaalPfxYk', 'GhlLtd19szw'], 'c2-triads': ['dbhF2wnnT7M', 'Zr5hjIECFlk'],
  'c3-blues': ['uy6P4gXccnA'], 'c3-natminor': ['hyZPcYf1Pe4', 'gbNLhx2eCXs'], 'c3-pull': ['N7eT-S4Gw3I'],
  'c3-rhythm': ['c1pejTgLuhA', 'HhODahQ-U4U'], 'c4-caged': ['VD86WfCAxoE', 'xG3rd1dvTJI', 'TbbtxQQgi8w', 'hiQmf7wX3IQ'],
  'c4-intervals': ['yPUr5kXBwj0'], 'c4-majorpos': ['zGfo4zzrth8', 'uy6P4gXccnA'], 'c4-pentboxes': ['b6qd5HiomtE'],
  'c4-3nps': ['AaPC1mxBOhA'], 'c5-key7': ['HQ2pg7D1aks'], 'c7-reharm': ['AvCr6buykz0'],
}
CREATOR = {'match-logsounds.json': 'LoG Sounds', 'match-signals.json': 'Signals Music Studio'}

def ts(t):
    p = [int(x) for x in re.findall(r'\d+', str(t or ''))]
    s = 0
    for x in p: s = s * 60 + x
    return s if p else None

# lesson titles and step titles (the "sections" the matches name are step titles without their "N · " number)
lessons = {}
for f in glob.glob(os.path.join(ROOT, 'src/course/level*.ts')):
    src = open(f).read()
    cur = None
    for line in src.split('\n'):
        m = re.search(r"\bid: '(c\d-[a-z0-9-]+)'", line)
        if m and 'kind:' not in line:
            cur = m.group(1); lessons.setdefault(cur, {'title': '', 'steps': []})
            t = re.search(r"\btitle: '((?:[^'\\]|\\.)*)'", line)
            if t and not lessons[cur]['title']: lessons[cur]['title'] = t.group(1)
            continue
        if cur and not lessons[cur]['title']:
            t = re.match(r"\s*title: '((?:[^'\\]|\\.)*)'", line)
            if t: lessons[cur]['title'] = t.group(1)
        m = re.search(r"kind: '(\w+)', title: '((?:[^'\\]|\\.)*)'", line)
        if m and cur: lessons[cur]['steps'].append(m.group(2).replace("\\'", "'"))
strip = lambda s: re.sub(r'^\d+\s*·\s*', '', s).strip().lower()

vids, cands = {}, collections.defaultdict(list)
for f in sorted(glob.glob(os.path.join(folder, 'match-*.json'))):
    creator = CREATOR.get(os.path.basename(f), '')
    for k, v in json.load(open(f))['notes'].items():
        n = v.get('note') or {}
        e = vids.setdefault(v['id'], {'title': v['title'], 'teacher': creator or n.get('teacher') or '', 'len': 0})
        e['len'] = max(e['len'], v.get('to') or v.get('secs') or 0)
        for m in n.get('matches') or []:
            lid = MAP.get(m.get('lessonId'), m.get('lessonId'))
            fr, to = ts(m.get('from')), ts(m.get('to'))
            if lid not in lessons or fr is None or m.get('fit', 0) < 4: continue
            if to is None or to <= fr or (e['len'] and fr > e['len'] + 5) or to - fr < 45 or len((m.get('what') or '').strip()) <= 10: continue
            cands[lid].append({'id': v['id'], 'sec': m.get('section') or '', 'from': fr, 'to': to, 'what': (m.get('what') or '').strip(), 'fit': m['fit']})

stop = set('the a an and of in on to for with your how what is are you it its from one two three by at as be this that all every guitar lesson theory music'.split())
words = lambda s: {w.rstrip('s') for w in re.findall(r'[a-z0-9♭#]+', s.lower()) if w not in stop and len(w) > 2}
out = {}
for lid, l in sorted(cands.items()):
    steps = {strip(s): s for s in lessons[lid]['steps']}
    lw = words(lessons[lid]['title']) | {w for c in l for w in words(c['sec'])}
    byv = collections.defaultdict(list)
    for c in l:
        if c['id'] in DROP.get(lid, []): continue
        c['step'] = steps.get(strip(c['sec']), '')   # '' = the lesson as a whole (shown on the first Learn step)
        byv[c['id']].append(c)
    keep = []
    for v, cs in byv.items():
        rel = len(words(vids[v]['title']) & lw)
        if rel == 0 and max(c['to'] - c['from'] for c in cs) < 120: continue
        if re.search(r'song analysis', vids[v]['title'], re.I) and rel < 2: continue
        t = vids[v]['teacher']
        keep.append((max(c['fit'] for c in cs) * 2 + rel * 1.2 + min(len(cs), 3) * 0.4 + (0.6 if t == 'LoG Sounds' else 0.4 if t.startswith('Signals') else 0), v))
    keep.sort(reverse=True)
    picks = []
    for _, v in keep[:3]:
        parts, seen = [], set()
        for c in sorted(byv[v], key=lambda c: (-c['fit'], c['from'])):
            if (c['from'], c['step']) in seen: continue
            seen.add((c['from'], c['step'])); parts.append({'step': c['step'], 'from': c['from'], 'to': c['to'], 'what': c['what']})
            if len(parts) == 3: break
        picks.append({'id': v, 'title': vids[v]['title'], 'teacher': vids[v]['teacher'], 'parts': sorted(parts, key=lambda p: p['from'])})
    if picks: out[lid] = picks

js = json.dumps(out, ensure_ascii=False, indent=1)
ts_src = f"""// GENERATED by tools/video-notes/make-watch.py from the Mac's video notes: do not edit by hand (re-run the script).
// The best LoG Sounds / Signals Music Studio videos for each theory lesson, each part placed in the step it teaches
// (step = the step's title; '' = the lesson as a whole). Times are seconds in the whole video.
export interface WatchPart {{ step: string; from: number; to: number; what: string }}
export interface WatchVideo {{ id: string; title: string; teacher: string; parts: WatchPart[] }}
export const WATCH: Record<string, WatchVideo[]> = {js}
"""
open(os.path.join(ROOT, 'src/course/watch.ts'), 'w').write(ts_src)
n = sum(len(v) for v in out.values())
print(f'{len(out)} lessons, {n} videos, {sum(len(p["parts"]) for v in out.values() for p in v)} parts; ids:')
print(' '.join(sorted({p['id'] for v in out.values() for p in v})))
