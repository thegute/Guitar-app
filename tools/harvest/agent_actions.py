"""The KGuitar harvest agent's actions (reloaded for every job, so new or fixed actions work without a restart).

See agent.py for what the agent is."""

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


import builtins  # noqa: E402
# loaded plug-ins survive the reload before every job (a sampler takes seconds to load its samples)
_plugins = builtins.__dict__.setdefault('_kg_plugins', {})


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
                p([], duration=0.25, sample_rate=44100, num_channels=2, reset=False)
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
    sr = job.get('sampleRate', 44100)
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


def act_export(job):
    src = in_path(job['pack'])
    dst = os.path.dirname(out_path(os.path.join(job['out'], '.keep')))
    r = subprocess.run([sys.executable, os.path.join(HERE, 'export_pack.py'), src, dst, '--kbps', str(job.get('kbps', 192))], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-2000:])
    return {'out': dst, 'stdout': r.stdout[-1000:]}


ACTIONS = {'export': act_export, 'abpage': act_abpage, 'ping': act_ping, 'probe': act_probe, 'capture': act_capture, 'midi': act_midi, 'process': act_process, 'render': act_render}


