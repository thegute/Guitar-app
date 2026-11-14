# pdf pages → .gray files (uint32 w, uint32 h, then bytes), clean at `dpi`, or damaged like a phone photo
import io, random, struct, subprocess, sys, os
from PIL import Image, ImageFilter
pdf, a, b, out, dpi = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], int(sys.argv[5])
damage = len(sys.argv) > 6 and sys.argv[6] == 'damage'
os.makedirs(out, exist_ok=True)
for p in range(a, b + 1):
    subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', str(dpi), '-gray', '-png', '-singlefile', pdf, '/tmp/_pg'], check=True)
    im = Image.open('/tmp/_pg.png').convert('L')
    if damage:
        r = random.Random(p)
        im = im.rotate(r.uniform(-0.8, 0.8), resample=Image.BILINEAR, fillcolor=255, expand=False)
        im = im.filter(ImageFilter.GaussianBlur(0.7))
        buf = io.BytesIO(); im.save(buf, 'JPEG', quality=45); im = Image.open(io.BytesIO(buf.getvalue())).convert('L')
    with open(f'{out}/p{p:03d}.gray', 'wb') as f:
        f.write(struct.pack('<II', im.width, im.height)); f.write(im.tobytes())
