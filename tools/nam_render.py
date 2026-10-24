"""Run a Neural Amp Modeler (.nam) WaveNet capture over audio, offline, with numpy.

Written for KGuitar's tone rendering: the owner's amp captures turn DI guitar notes into amp sounds that are then
put through a cab impulse response and saved as sample banks. Only standard NAM WaveNet models (no gating) are handled.

Model layout (NAM "WaveNet"): layer arrays in sequence. Each array: 1x1 "rechannel" (no bias), then layers of
  z = tanh(dilated causal conv(x) + 1x1 mixin(condition)), head += z, x = x + 1x1(z)
then a 1x1 "head rechannel" whose output is the next array's starting head. Output = head_scale * last head.
Weights are stored flat, array by array: rechannel, per layer [conv (out, in, tap) + bias, mixin, 1x1 + bias], head rechannel (+ bias);
then head_scale.
"""
import json
import sys
import numpy as np


class NamWaveNet:
    def __init__(self, path):
        d = json.load(open(path))
        if d.get('architecture') != 'WaveNet':
            raise ValueError('only WaveNet captures are supported')
        self.cfg = d['config']
        self.sr = float(d.get('sample_rate') or 48000)
        self.meta = d.get('metadata') or {}
        w = np.asarray(d['weights'], dtype=np.float64)
        pos = 0

        def take(n):
            nonlocal pos
            out = w[pos:pos + n]
            pos += n
            return out

        self.arrays = []
        for la in self.cfg['layers']:
            if la.get('gated'):
                raise ValueError('gated WaveNets are not supported')
            C, Cin, Cc, H, K = la['channels'], la['input_size'], la['condition_size'], la['head_size'], la['kernel_size']
            arr = {'K': K, 'C': C, 'H': H}
            arr['rechannel'] = take(C * Cin).reshape(C, Cin)
            layers = []
            for dil in la['dilations']:
                conv = take(C * C * K).reshape(C, C, K)  # [out, in, tap]
                conv_b = take(C)
                mixin = take(C * Cc).reshape(C, Cc)
                one = take(C * C).reshape(C, C)
                one_b = take(C)
                layers.append({'d': dil, 'conv': conv, 'conv_b': conv_b, 'mixin': mixin, 'one': one, 'one_b': one_b})
            arr['layers'] = layers
            arr['head_w'] = take(H * C).reshape(H, C)
            arr['head_b'] = take(H) if la.get('head_bias') else np.zeros(H)
            self.arrays.append(arr)
        self.head_scale = take(1)[0]
        if pos != len(w):
            raise ValueError(f'weight count mismatch: used {pos} of {len(w)}')
        self.rf = sum((a['K'] - 1) * sum(l['d'] for l in a['layers']) for a in self.arrays)

    def process(self, x):
        """x: 1-D float array at the model's sample rate (guitar DI level, peaks around 0.3-0.9). Returns the amp output."""
        x = np.asarray(x, dtype=np.float64)
        pad = self.rf + 8
        cond = np.concatenate([np.zeros(pad), x])[None, :]  # [1, T]
        T = cond.shape[1]
        h = None
        inp = cond
        for arr in self.arrays:
            K = arr['K']
            y = arr['rechannel'] @ inp
            head = np.zeros((arr['C'], T)) if h is None else h.copy()
            for L in arr['layers']:
                d = L['d']
                z = np.tile(L['conv_b'][:, None], (1, T))
                for k in range(K):
                    shift = d * (K - 1 - k)  # tap k sees the input `shift` samples ago
                    if shift == 0:
                        z += L['conv'][:, :, k] @ y
                    else:
                        z[:, shift:] += L['conv'][:, :, k] @ y[:, :-shift]
                z += L['mixin'] @ cond
                z = np.tanh(z)
                head += z
                y = y + L['one'] @ z + L['one_b'][:, None]
            h = arr['head_w'] @ head + arr['head_b'][:, None]
            inp = y
        out = self.head_scale * h[0]
        return out[pad:]


if __name__ == '__main__':
    m = NamWaveNet(sys.argv[1])
    print('ok', m.sr, 'receptive field', m.rf, 'head_scale', m.head_scale)
