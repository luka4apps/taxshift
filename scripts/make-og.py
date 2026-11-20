"""Generate public/og.png (1200x630 social share image). Run: python scripts/make-og.py
Uses Impact as a stand-in for Big Shoulders Display (Pillow can't read the woff2 web font)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
INK, PAPER, SHIFT = (10, 10, 10), (255, 255, 255), (229, 0, 125)
FONTS = Path("C:/Windows/Fonts")
display = lambda size: ImageFont.truetype(str(FONTS / "impact.ttf"), size)
mono = lambda size: ImageFont.truetype(str(FONTS / "consolab.ttf" if (FONTS / "consolab.ttf").exists() else FONTS / "arialbd.ttf"), size)

img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

d.rectangle([0, 0, W, 56], fill=INK)
d.text((48, 16), "AUSTRALIAN INVESTOR TAX TRACKER", font=mono(24), fill=PAPER)
d.text((W - 48, 16), "CHECKED DAILY", font=mono(24), fill=PAPER, anchor="ra")

big = display(250)
d.text((44, 70), "TAX", font=big, fill=INK)
tax_w = d.textlength("TAX", font=big)
d.text((44 + tax_w, 70), "SHIFT", font=big, fill=SHIFT)

d.rectangle([48, 392, W - 48, 404], fill=INK)
tag = display(64)
d.text((48, 424), "WHAT CHANGED. WHEN IT BITES.", font=tag, fill=INK)
d.text((48, 500), "WHO WANTS TO CHANGE IT BACK.", font=tag, fill=SHIFT)

out = Path(__file__).resolve().parent.parent / "public" / "og.png"
img.save(out, optimize=True)
print(f"wrote {out}")
