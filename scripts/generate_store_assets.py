from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "play-store" / "assets"
OUT.mkdir(parents=True, exist_ok=True)

SCALE = 2
W, H = 1024 * SCALE, 500 * SCALE


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size * SCALE)


canvas = Image.new("RGB", (W, H), "#FFF8EA")

# Soft brand-color atmosphere, kept away from the exact logo and copy.
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
g = ImageDraw.Draw(glow)
g.ellipse((-260, -520, 920, 780), fill=(255, 177, 18, 92))
g.ellipse((1260, 250, 2380, 1290), fill=(51, 166, 84, 92))
glow = glow.filter(ImageFilter.GaussianBlur(130))
canvas = Image.alpha_composite(canvas.convert("RGBA"), glow)

draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((86, 88, 514, 912), radius=86, fill="#FFFFFF", outline="#EFE3C9", width=4)

icon = Image.open(ROOT / "assets" / "play-store-icon.png").convert("RGBA")
icon = icon.resize((360 * SCALE, 360 * SCALE), Image.Resampling.LANCZOS)
canvas.alpha_composite(icon, (120 * SCALE, 70 * SCALE))

green = "#145A3A"
orange = "#FF5A18"
draw = ImageDraw.Draw(canvas)
draw.text((560 * SCALE, 96 * SCALE), "BEFORE YOU ORDER", font=font(24, True), fill=green)
draw.text((560 * SCALE, 158 * SCALE), "One clear", font=font(68, True), fill="#251F17")
draw.text((560 * SCALE, 232 * SCALE), "meal pick.", font=font(68, True), fill="#251F17")
draw.rounded_rectangle((560 * SCALE, 342 * SCALE, 936 * SCALE, 414 * SCALE), radius=36 * SCALE, fill=green)
draw.text((600 * SCALE, 359 * SCALE), "Choose. Find. Eat.", font=font(25, True), fill="#FFFFFF")
draw.ellipse((924 * SCALE, 76 * SCALE, 970 * SCALE, 122 * SCALE), fill=orange)

final = canvas.convert("RGB").resize((1024, 500), Image.Resampling.LANCZOS)
final.save(OUT / "feature-graphic-1024x500.png", optimize=True)

print(OUT / "feature-graphic-1024x500.png")
