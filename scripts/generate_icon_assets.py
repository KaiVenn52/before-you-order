from __future__ import annotations

import shutil
import sys
from pathlib import Path

from PIL import Image


CREAM = (255, 248, 234, 255)


def resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.resize(size, Image.Resampling.LANCZOS)


def contain(image: Image.Image, canvas_size: int, mark_size: int) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    mark = resize(image, (mark_size, mark_size))
    offset = (canvas_size - mark_size) // 2
    canvas.alpha_composite(mark, (offset, offset))
    return canvas


def flatten(image: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", image.size, CREAM)
    canvas.alpha_composite(image)
    return resize(canvas.convert("RGB"), (size, size))


def monochrome(image: Image.Image, canvas_size: int, mark_size: int) -> Image.Image:
    mark = resize(image, (mark_size, mark_size)).convert("RGBA")
    pixels = []
    for red, green, blue, alpha in mark.getdata():
        is_dark_green = (
            alpha > 0
            and red < 105
            and green < 145
            and green > red * 1.18
            and green > blue * 1.35
        )
        pixels.append((255, 255, 255, alpha if is_dark_green else 0))
    mark.putdata(pixels)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = (canvas_size - mark_size) // 2
    canvas.alpha_composite(mark, (offset, offset))
    return canvas


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: generate_icon_assets.py FULL_ICON FOREGROUND ASSETS_DIR")

    full_source = Path(sys.argv[1]).resolve()
    foreground_source = Path(sys.argv[2]).resolve()
    assets = Path(sys.argv[3]).resolve()
    assets.mkdir(parents=True, exist_ok=True)

    shutil.copy2(full_source, assets / "before-you-order-logo-v2-source.png")
    shutil.copy2(foreground_source, assets / "before-you-order-logo-v2-foreground-source.png")

    full = Image.open(full_source).convert("RGBA")
    foreground = Image.open(foreground_source).convert("RGBA")

    icon_1024 = flatten(full, 1024)
    icon_1024.save(assets / "before-you-order-icon.png", optimize=True)
    icon_1024.save(assets / "icon.png", optimize=True)
    resize(icon_1024, (512, 512)).save(assets / "play-store-icon.png", optimize=True)
    resize(icon_1024, (128, 128)).save(assets / "before-you-order-favicon.png", optimize=True)
    resize(icon_1024, (48, 48)).save(assets / "favicon.png", optimize=True)

    adaptive = contain(foreground, 1024, 760)
    adaptive.save(assets / "before-you-order-foreground.png", optimize=True)
    contain(foreground, 512, 380).save(assets / "android-icon-foreground.png", optimize=True)
    adaptive.save(assets / "splash-icon.png", optimize=True)

    mono = monochrome(foreground, 1024, 760)
    mono.save(assets / "before-you-order-monochrome.png", optimize=True)
    resize(mono, (432, 432)).save(assets / "android-icon-monochrome.png", optimize=True)

    Image.new("RGBA", (512, 512), CREAM).save(
        assets / "android-icon-background.png", optimize=True
    )


if __name__ == "__main__":
    main()
