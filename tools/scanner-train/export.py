"""best.pt → tab_crnn.onnx for the app (any strip width; half-size weights).

python export.py runs/v1/best.pt public/models/tab-crnn/tab_crnn.onnx
"""
import sys

import torch

from model import TabCRNN

src, dst = sys.argv[1], sys.argv[2]
m = TabCRNN(arch=sys.argv[3] if len(sys.argv) > 3 else 'dense')
m.load_state_dict(torch.load(src, map_location='cpu'))
m.eval()


class Flat(torch.nn.Module):
    """the outputs as one tuple, in a fixed order"""

    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, x):
        o = self.m(x)
        return o['heat'], o['off'], o['frets'], o['dur'], o['dots'], o['tup'], o['grace'], o['stroke']


names = ['heat', 'off', 'frets', 'dur', 'dots', 'tup', 'grace', 'stroke']
x = torch.ones(1, 1, 160, 512)
torch.onnx.export(Flat(m), x, dst, input_names=['strip'], output_names=names, opset_version=17,
                  dynamic_axes={'strip': {3: 'W'}, **{n: {len(o.shape) - 1: 'T'} for n, o in zip(names, Flat(m)(x))}}, dynamo=False)
try:  # half-size weights when the converter is there (onnxconverter-common)
    import onnx
    from onnxconverter_common import float16
    mm = float16.convert_float_to_float16(onnx.load(dst), keep_io_types=True)
    onnx.save(mm, dst)
except Exception as e:
    print('kept 32-bit weights:', e)
print('wrote', dst)
