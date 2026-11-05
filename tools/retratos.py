# Prepara los retratos de la Matrix para el panel: recorta cada imagen de GPT a la
# proporción del hueco (18 columnas x 10 filas ≈ 0,9), la reduce y genera las
# variantes «reposo» (desteñida, para el Constructo) y «caído» (gris).
# Uso: python3 tools/retratos.py origen/matrix-<clase>.png ...   → art/matrix/<clase>[-reposo|-caido].png
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps

OUT = Path(__file__).resolve().parent.parent / 'art' / 'matrix'
W, H = 432, 480  # 0,9 de proporción, 3x del hueco en Ghostty (144 x 160)

for src in sys.argv[1:]:
    cls = Path(src).stem.replace('matrix-', '')
    im = Image.open(src).convert('RGB')
    w, h = im.size
    cw = min(w, int(h * W / H))
    im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h)).resize((W, H), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / f'{cls}.png', optimize=True)
    rest = ImageEnhance.Brightness(ImageEnhance.Color(im).enhance(0.35)).enhance(0.45)
    rest.save(OUT / f'{cls}-reposo.png', optimize=True)
    down = ImageEnhance.Brightness(ImageOps.grayscale(im).convert('RGB')).enhance(0.5)
    down.save(OUT / f'{cls}-caido.png', optimize=True)
    print(cls, im.size)
