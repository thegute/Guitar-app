#!/usr/bin/env python3
"""KGuitar harvest agent: runs on the owner's Mac so Claude can drive the plugins without him pasting a command each time.

He starts it once in Terminal:
    ~/KGuitar-harvest/.venv/bin/python ~/KGuitar-harvest/tools/agent.py
and it watches ~/KGuitar-harvest/jobs/inbox for job files (JSON) that Claude writes. Each job runs ONE of the fixed
actions below (nothing else: no shell commands), reads only plug-ins from the system plug-in folders and writes only
inside ~/KGuitar-harvest. Results go to jobs/outbox/<id>.json, a running log to jobs/agent.log. Ctrl+C (or a "stop"
job) ends it.

Actions:
  ping     versions, free disk space
  probe    load a plug-in (optionally with a saved state): its name, whether it's an instrument, its parameters
  capture  open the plug-in's own window so it can be set up (by the owner or by Claude through computer use); the window
           closes when the file jobs/close appears (or the owner closes it), then its full state is saved
  midi     play MIDI events through an instrument (+ optional effect chain) and write a WAV (trials, phrases, strums)
  process  run a WAV through an effect chain (re-amping DI through an amp) and write a WAV
  render   run render.py on a plan (a whole sound pack)
  abpage   the blind listening page from trials/*/<phrase>.wav (loudness-matched, shuffled letters)
  stop     end the agent
"""
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import traceback

HOME = os.path.expanduser('~')
ROOT = os.path.join(HOME, 'KGuitar-harvest')
JOBS = os.path.join(ROOT, 'jobs')
INBOX, OUTBOX, RUNNING = (os.path.join(JOBS, d) for d in ('inbox', 'outbox', 'running'))
PLUGIN_DIRS = ['/Library/Audio/Plug-Ins', os.path.join(HOME, 'Library/Audio/Plug-Ins')]
HERE = os.path.dirname(os.path.abspath(__file__))


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(os.path.join(JOBS, 'agent.log'), 'a') as f:
        f.write(line + '\n')


def inside(path, roots):
    p = os.path.realpath(os.path.expanduser(path))
    return any(p == os.path.realpath(r) or p.startswith(os.path.realpath(r) + os.sep) for r in roots)


def out_path(path):
    p = os.path.expanduser(path)
    if not os.path.isabs(p):
        p = os.path.join(ROOT, p)
    if not inside(p, [ROOT]):
        raise ValueError(f'outputs stay inside {ROOT}: {path}')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def in_path(path):
    p = os.path.expanduser(path)
    if not os.path.isabs(p):
        p = os.path.join(ROOT, p)
    if not inside(p, [ROOT]):
        raise ValueError(f'inputs are read from inside {ROOT}: {path}')
    return p


_plugins = {}


def plugin(spec):
    """Load (and cache) a plug-in from the system plug-in folders, then apply a saved state if given."""
    from pedalboard import load_plugin
    path = os.path.expanduser(spec['plugin'])
    if not inside(path, PLUGIN_DIRS):
        raise ValueError(f'plug-ins are loaded from the plug-in folders only: {path}')
    key = (path, spec.get('pluginName'), spec.get('instance', 0))
    p = _plugins.get(key)
    if p is None:
        p = load_plugin(path, plugin_name=spec['pluginName']) if spec.get('pluginName') else load_plugin(path)
        _plugins[key] = p
    if spec.get('state'):
        with open(in_path(spec['state']), 'rb') as f:
            p.raw_state = f.read()
    for k, v in (spec.get('params') or {}).items():
        setattr(p, k, v)
    if spec.get('warmup'):
        # Kontakt (and other samplers) load their samples on background threads after a state is set: give them time,
        # and keep the plug-in processing meanwhile, or the first notes come out silent
        t_end = time.time() + float(spec['warmup'])
        while time.time() < t_end:
            if getattr(p, 'is_instrument', False):
                p([], duration=0.25, sample_rate=48000, num_channels=2, reset=False)
            time.sleep(0.25)
    return p


def act_ping(job):
    import numpy, pedalboard
    du = shutil.disk_usage(HOME)
    return {'python': sys.version.split()[0], 'pedalboard': pedalboard.__version__, 'numpy': numpy.__version__,
            'freeGB': round(du.free / 1e9, 1)}


def act_probe(job):
    p = plugin(job)
    params = {}
    for name, prm in list(p.parameters.items())[: job.get('maxParams', 400)]:
        try:
            params[name] = {'value': str(getattr(p, name)), 'range': [str(prm.min_value), str(prm.max_value)] if hasattr(prm, 'min_value') else None}
        except Exception as e:  # some parameters can't be read
            params[name] = {'error': str(e)}
    return {'name': getattr(p, 'name', ''), 'instrument': bool(getattr(p, 'is_instrument', False)),
            'effect': bool(getattr(p, 'is_effect', False)), 'parameters': params, 'stateBytes': len(p.raw_state)}


def act_capture(job):
    """Open the plug-in's window in a SEPARATE process (a plug-in window can block the process that opens it), so the
    agent itself never hangs: the window closes when jobs/close appears, the timeout passes, or the owner closes it."""
    flag = os.path.join(JOBS, 'close')
    if os.path.exists(flag):
        os.remove(flag)
    dest = out_path(job['out'])
    path = os.path.expanduser(job['plugin'])
    if not inside(path, PLUGIN_DIRS):
        raise ValueError(f'plug-ins are loaded from the plug-in folders only: {path}')
    args = [sys.executable, os.path.join(HERE, 'capture_state.py'), path, dest[:-6] if dest.endswith('.state') else dest]
    if job.get('pluginName'):
        args += ['--name', job['pluginName']]
    if job.get('start'):
        args += ['--start', in_path(job['start'])]
    if job.get('warm'):
        args += ['--warm', str(job['warm'])]
    proc = subprocess.Popen(args)
    limit = time.time() + job.get('timeout', 1800)
    while proc.poll() is None:
        if os.path.exists(flag) or time.time() > limit:
            if os.path.exists(flag):
                os.remove(flag)
            proc.kill()
            proc.wait()
            raise RuntimeError('the plug-in window was closed from outside before it saved (nothing saved)')
        time.sleep(0.3)
    if proc.returncode != 0:
        raise RuntimeError(f'capture_state.py ended with code {proc.returncode}')
    return {'state': dest, 'bytes': os.path.getsize(dest)}


def chain_of(specs):
    from pedalboard import Pedalboard
    return Pedalboard([plugin(s) for s in specs]) if specs else None


def write_wav(path, y, sr):
    import numpy as np
    import soundfile as sf
    y = np.asarray(y, dtype=np.float32)
    if y.ndim == 2 and y.shape[0] < y.shape[1]:
        y = y.T
    sf.write(out_path(path), y, sr, subtype='FLOAT')
    peak = float(np.abs(y).max()) if y.size else 0.0
    return {'wav': out_path(path), 'seconds': round(len(y) / sr, 2), 'peakDb': round(20 * np.log10(peak), 2) if peak > 0 else None}


def act_midi(job):
    """events: [{t, note, vel, ch?, dur} | {t, cc, value, ch?}] in seconds; rendered in one pass so legato, strums and
    round robins behave as they do in a song."""
    from mido import Message
    inst = plugin(job)
    sr = job.get('sampleRate', 48000)
    msgs = []
    for e in job['events']:
        ch = e.get('ch', 0)
        if 'cc' in e:
            msgs.append(Message('control_change', control=e['cc'], value=e['value'], channel=ch, time=e['t']))
            continue
        msgs.append(Message('note_on', note=e['note'], velocity=e.get('vel', 90), channel=ch, time=e['t']))
        msgs.append(Message('note_off', note=e['note'], velocity=0, channel=ch, time=e['t'] + e.get('dur', 0.5)))
    msgs.sort(key=lambda m: m.time)
    dur = job.get('duration') or (max(m.time for m in msgs) + job.get('tail', 2.5))
    y = inst(msgs, duration=dur, sample_rate=sr, num_channels=2, buffer_size=512, reset=job.get('reset', True))
    ch = chain_of(job.get('effects'))
    if ch is not None:
        y = ch(y, sr, reset=True)
    return write_wav(job['out'], y, sr)


def act_process(job):
    import soundfile as sf
    x, sr = sf.read(in_path(job['in']), dtype='float32', always_2d=True)
    gain = 10 ** (job.get('gainDb', 0) / 20)
    ch = chain_of(job['effects'])
    y = ch((x.T * gain), sr, reset=True)
    return write_wav(job['out'], y, sr)


def act_render(job):
    plan = in_path(job['plan'])
    out_dir = os.path.dirname(out_path(os.path.join(job.get('out', 'packs'), '.keep')))
    args = [sys.executable, os.path.join(HERE, 'render.py'), plan, out_dir]
    if job.get('test'):
        args.append('--test')
    log('render: ' + ' '.join(os.path.basename(a) for a in args[1:]))
    r = subprocess.run(args, capture_output=True, text=True)
    return {'code': r.returncode, 'stdout': r.stdout[-4000:], 'stderr': r.stderr[-4000:]}


def act_abpage(job):
    src = in_path(job.get('trials', 'trials'))
    out = os.path.dirname(out_path(os.path.join(job.get('out', 'trials/ab'), '.keep')))
    r = subprocess.run([sys.executable, os.path.join(HERE, 'ab_page.py'), src, out], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-2000:])
    return {'page': os.path.join(out, 'index.html'), 'stdout': r.stdout[-1000:]}


ACTIONS = {'abpage': act_abpage, 'ping': act_ping, 'probe': act_probe, 'capture': act_capture, 'midi': act_midi, 'process': act_process, 'render': act_render}


def main():
    for d in (INBOX, OUTBOX, RUNNING):
        os.makedirs(d, exist_ok=True)
    log(f'KGuitar harvest agent ready: watching {INBOX} (Ctrl+C to stop)')
    while True:
        jobs = sorted(f for f in os.listdir(INBOX) if f.endswith('.json'))
        if not jobs:
            time.sleep(0.5)
            continue
        name = jobs[0]
        src, run = os.path.join(INBOX, name), os.path.join(RUNNING, name)
        try:
            os.replace(src, run)
            job = json.load(open(run))
        except Exception as e:
            log(f'{name}: unreadable ({e})')
            continue
        kind = job.get('action')
        t0 = time.time()
        res = {'id': name[:-5], 'action': kind}
        if kind == 'stop':
            res['ok'] = True
            json.dump(res, open(os.path.join(OUTBOX, name), 'w'), indent=1)
            os.remove(run)
            log('stop: bye')
            return
        try:
            if kind not in ACTIONS:
                raise ValueError(f'unknown action {kind}')
            log(f'{name}: {kind} …')
            res['result'] = ACTIONS[kind](job)
            res['ok'] = True
        except Exception as e:
            res['ok'] = False
            res['error'] = f'{type(e).__name__}: {e}'
            res['trace'] = traceback.format_exc()[-3000:]
        res['seconds'] = round(time.time() - t0, 2)
        json.dump(res, open(os.path.join(OUTBOX, name), 'w'), indent=1)
        os.remove(run)
        log(f'{name}: {"done" if res["ok"] else "FAILED " + res["error"]} in {res["seconds"]} s')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log('stopped')
