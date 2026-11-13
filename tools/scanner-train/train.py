"""Train tab_crnn (on a Mac: Apple's GPU through PyTorch "mps"; elsewhere CUDA or the CPU).

python train.py --strips strips/train --holdout strips/holdout --out runs/v1 [--steps 20000] [--batch 32] [--smoke]

Every --eval steps it reads the held-back pages (never trained on) and writes runs/<name>/log.txt; the best model so far
is kept as best.pt, and export.py turns it into tab_crnn.onnx for the app.
"""
import argparse
import json
import math
import os
import time

import torch
import torch.nn.functional as F

from data import IGN, Fixed, Mixed
from model import SLOTS, TabCRNN

p = argparse.ArgumentParser()
p.add_argument('--strips', default='strips/train')
p.add_argument('--holdout', default='strips/holdout')
p.add_argument('--out', default='runs/v1')
p.add_argument('--steps', type=int, default=20000)
p.add_argument('--batch', type=int, default=32)
p.add_argument('--lr', type=float, default=1.5e-3)
p.add_argument('--workers', type=int, default=6)
p.add_argument('--eval', type=int, default=1000)
p.add_argument('--real', type=float, default=0.4)
p.add_argument('--resume', default='')
p.add_argument('--smoke', action='store_true', help='a few steps on the CPU to check everything runs')
a = p.parse_args()

dev = 'mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'
if a.smoke:
    dev, a.steps, a.eval, a.batch, a.workers = 'cpu', 30, 15, 8, 2
os.makedirs(a.out, exist_ok=True)
log = open(os.path.join(a.out, 'log.txt'), 'a')


def say(*x):
    s = ' '.join(str(v) for v in x)
    print(s, flush=True)
    log.write(s + '\n')
    log.flush()


model = TabCRNN().to(dev)
if a.resume:
    model.load_state_dict(torch.load(a.resume, map_location=dev))
opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=0.02)
sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=a.lr, total_steps=a.steps, pct_start=0.08)
ds = Mixed(a.strips, real=a.real)
dl = torch.utils.data.DataLoader(ds, batch_size=a.batch, num_workers=a.workers, persistent_workers=a.workers > 0)


def focal(logit, target, alpha=2, beta=4):
    """CenterNet focal loss on the column heat maps"""
    p_ = torch.sigmoid(logit).clamp(1e-4, 1 - 1e-4)
    pos = (target > 0.99).float()
    neg = 1 - pos
    lp = -((1 - p_) ** alpha) * torch.log(p_) * pos
    ln = -((1 - target) ** beta) * (p_ ** alpha) * torch.log(1 - p_) * neg
    return (lp.sum() + ln.sum()) / pos.sum().clamp(min=1)


def ce(logit, y):
    if (y != IGN).sum() == 0:
        return logit.sum() * 0
    return F.cross_entropy(logit, y, ignore_index=IGN)


def loss_of(out, y):
    # exact peaks: the step holding the column centre gets 1
    heat_t = y['heat']
    pk = (heat_t >= heat_t.amax(-1, keepdim=True) * 0 + 0.88).float()
    heat_t = torch.where(pk > 0, torch.ones_like(heat_t), heat_t * 0.98)
    L = {}
    L['heat'] = focal(out['heat'], heat_t)
    m = y['offm']
    L['off'] = (F.smooth_l1_loss(out['off'], y['off'], reduction='none') * m).sum() / m.sum().clamp(min=1)
    B, S, C, T = out['frets'].shape
    L['frets'] = ce(out['frets'].permute(0, 1, 3, 2).reshape(-1, C), y['frets'].reshape(-1)) * 2
    for k in ('dur', 'dots', 'tup', 'grace', 'stroke'):
        L[k] = ce(out[k], y[k]) * (1.0 if k == 'dur' else 0.5)
    return sum(L.values()), {k: float(v) for k, v in L.items()}


def decode(out, i, nstr):
    """peaks → columns for strip i of the batch"""
    h = torch.sigmoid(out['heat'][i]).float().cpu()
    off = out['off'][i].float().cpu()
    cols = []
    for k in range(3):
        v = h[k]
        for t in range(v.shape[0]):
            if v[t] < 0.45 or (t > 0 and v[t - 1] > v[t]) or (t + 1 < v.shape[0] and v[t + 1] >= v[t]):
                continue
            cols.append({'x': 4 * (t + 0.5 + float(off[t])), 't': t, 'kind': ['note', 'bar', 'rest'][k], 'p': float(v[t])})
    fr = out['frets'][i].argmax(1).cpu()
    du = out['dur'][i].argmax(0).cpu()
    for c in cols:
        if c['kind'] == 'note':
            c['frets'] = {s: int(fr[s, c['t']]) for s in range(nstr) if int(fr[s, c['t']]) > 0}
        c['dur'] = int(du[c['t']])
    return cols


@torch.no_grad()
def evaluate(limit=None):
    """notes found / read right on the held-back pages, and note lengths"""
    model.eval()
    fx = Fixed(a.holdout)
    idx = range(len(fx)) if not limit else range(0, len(fx), max(1, len(fx) // limit))
    tp = fp = fn = 0
    dur_ok = dur_n = 0
    bars_ok = bars_n = 0
    for j in idx:
        x, e = fx[j]
        out = model(x[None].to(dev))
        pred = [c for c in decode(out, 0, e['nstr']) if c['kind'] == 'note']
        gold = [c for c in e['cols'] if c['kind'] == 'note']
        used = set()
        for g in gold:
            gf = {int(s): (26 if v == 'x' else 1 + int(v)) for s, v in g['frets'].items()}
            best = min(((abs(p['x'] - g['x']), n) for n, p in enumerate(pred) if n not in used), default=(99, -1))
            if best[0] > 6:
                fn += len(gf)
                continue
            used.add(best[1])
            pf = pred[best[1]]['frets']
            ok = sum(1 for s, v in gf.items() if pf.get(s) == v)
            tp += ok
            fn += len(gf) - ok
            fp += len(pf) - ok
            if g['dur'] is not None and not g.get('grace') and e['rhythm']:
                dur_n += 1
                dur_ok += pred[best[1]]['dur'] == g['dur']
        for n, p_ in enumerate(pred):
            if n not in used:
                fp += len(p_['frets'])
        # a strip with every note right
        bars_n += 1
        bars_ok += (fn == 0 and fp == 0)
    model.train()
    P = tp / max(1, tp + fp)
    R = tp / max(1, tp + fn)
    return {'precision': round(100 * P, 2), 'recall': round(100 * R, 2), 'dur': round(100 * dur_ok / max(1, dur_n), 2)}


say(f'device {dev}, {sum(p.numel() for p in model.parameters()) / 1e6:.2f} M parameters, {len(ds.items)} real strips')
use_amp = dev in ('mps', 'cuda')
amp_dtype = torch.float16 if dev == 'mps' else torch.bfloat16
best = -1
t0 = time.time()
step = 0
model.train()
for x, y in dl:
    x = x.to(dev, non_blocking=True)
    y = {k: v.to(dev, non_blocking=True) for k, v in y.items()}
    with torch.autocast(device_type=dev if dev != 'cpu' else 'cpu', dtype=amp_dtype, enabled=use_amp):
        out = model(x)
    out = {k: v.float() for k, v in out.items()}
    loss, parts = loss_of(out, y)
    opt.zero_grad(set_to_none=True)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 2.0)
    opt.step()
    sched.step()
    step += 1
    if step % 100 == 0 or a.smoke:
        rate = step / (time.time() - t0)
        say(f'step {step}/{a.steps} loss {float(loss):.3f} ' + ' '.join(f'{k} {v:.3f}' for k, v in parts.items()) + f' | {rate:.2f} steps/s, ~{(a.steps - step) / max(rate, 1e-6) / 60:.0f} min left')
    if step % a.eval == 0 or step == a.steps:
        m = evaluate(limit=8 if a.smoke else None)
        score = m['precision'] + m['recall'] + 0.5 * m['dur']
        say(f'HELD-BACK PAGES at step {step}: notes precision {m["precision"]}% recall {m["recall"]}% | note lengths {m["dur"]}%')
        torch.save(model.state_dict(), os.path.join(a.out, 'last.pt'))
        if score > best:
            best = score
            torch.save(model.state_dict(), os.path.join(a.out, 'best.pt'))
            json.dump({'step': step, **m}, open(os.path.join(a.out, 'best.json'), 'w'))
    if step >= a.steps:
        break
say('done. best:', open(os.path.join(a.out, 'best.json')).read())
