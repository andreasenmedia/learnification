"""
Laver PNG- og ICO-udgaver af assets/favicon.svg til søgemaskiner og telefoner:

  favicon.ico            16/32/48 px - hentes af crawlere og gamle browsere på /favicon.ico
  apple-touch-icon.png   180 px, mørk baggrund - iPhone "Føj til hjemmeskærm"
  assets/ikon-192.png    Googles favicon i søgeresultaterne (skal være et multiplum af 48)
  assets/logo-512.png    logoet i Organization-data på forsiden

Ikonet er pixelgrafik på et 32x32-gitter, så det tegnes her med de samme
rektangler som i SVG'en og skaleres op uden udglatning. Rettes favicon.svg,
skal FIRKANTER herunder rettes med, og scriptet køres igen:

    python tools/ikoner.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROD = Path(__file__).resolve().parent.parent
MOERK = "#140f1c"

# (x, y, bredde, højde, farve) - samme som assets/favicon.svg
FIRKANTER = [
    (2, 2, 28, 28, "#ffcc4d"),
    (2, 26, 28, 4, "#b8862a"),
    (26, 2, 4, 28, "#b8862a"),
    (8, 9, 16, 3, MOERK),
    (8, 15, 16, 3, MOERK),
    (8, 21, 9, 3, MOERK),
]


def tegn(gange, baggrund=None):
    """Ikonet i 32*gange px, skarpt."""
    side = 32 * gange
    billede = Image.new("RGBA", (side, side), baggrund or (0, 0, 0, 0))
    d = ImageDraw.Draw(billede)
    for x, y, b, h, farve in FIRKANTER:
        d.rectangle([x * gange, y * gange, (x + b) * gange - 1, (y + h) * gange - 1], fill=farve)
    return billede


def main():
    tegn(6).save(ROD / "assets" / "ikon-192.png")
    tegn(16, MOERK).save(ROD / "assets" / "logo-512.png")
    # 180 er ikke et helt antal gange 32 - tegn stort og skalér ned
    tegn(18, MOERK).resize((180, 180), Image.NEAREST).save(ROD / "apple-touch-icon.png")
    tegn(3).save(ROD / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("favicon.ico, apple-touch-icon.png, assets/ikon-192.png, assets/logo-512.png skrevet")


if __name__ == "__main__":
    main()
