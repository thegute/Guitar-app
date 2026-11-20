"""Scanner lab: download the newest Shorts from the tab channels (for the owner's own practice and for checking KGuitar's
Riff Scanner on his Mac; nothing is shared or uploaded). Keeps a list of what it already has.
  python3 fetch.py <lab folder> [max new videos]
Needs yt-dlp (installed by install.sh into the lab's Python)."""
import json, os, subprocess, sys

CHANNELS = {
    'Mr. Tabs': 'UC_cm0YPagB8p2nXd8Z8Y_TA',
    'Level Up Guitar Tabs': 'UCqjPZuezV_ohA6gk-30OSPQ',
}
lab = sys.argv[1]
most = int(sys.argv[2]) if len(sys.argv) > 2 else 12
vids = os.path.join(lab, 'videos')
os.makedirs(vids, exist_ok=True)
seen_f = os.path.join(lab, 'seen.json')
seen = json.load(open(seen_f)) if os.path.exists(seen_f) else {}
try:
    import imageio_ffmpeg
    ff = ['--ffmpeg-location', imageio_ffmpeg.get_ffmpeg_exe()]
except Exception:
    ff = []
ytdlp = [sys.executable, '-m', 'yt_dlp']

per = []
for name, cid in CHANNELS.items():
    try:
        ids = subprocess.run(ytdlp + ['--flat-playlist', '--print', 'id', '--playlist-end', '40', f'https://www.youtube.com/channel/{cid}/shorts'],
                             capture_output=True, text=True, timeout=300).stdout.split()
    except Exception as e:
        print('could not list', name, e); continue
    fresh = [i for i in ids if i not in seen]
    print(f'{name}: {len(ids)} listed, {len(fresh)} new')
    per.append([(name, i) for i in fresh])
# the two channels take turns, so a busy night for one still brings some of the other
new = [p for k in range(max((len(l) for l in per), default=0)) for l in per if k < len(l) for p in [l[k]]]
got = 0
for name, vid in new:
    if got >= most:
        break
    out = os.path.join(vids, f'{vid}.mp4')
    r = subprocess.run(ytdlp + ff + ['-q', '--no-warnings', '-f', 'bv*[height<=1920][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b', '--merge-output-format', 'mp4',
                                     '-o', out, f'https://www.youtube.com/shorts/{vid}'], timeout=600)
    seen[vid] = {'channel': name, 'ok': r.returncode == 0 and os.path.exists(out)}
    if seen[vid]['ok']:
        got += 1
    json.dump(seen, open(seen_f, 'w'), indent=1)
print(f'{got} new videos')
