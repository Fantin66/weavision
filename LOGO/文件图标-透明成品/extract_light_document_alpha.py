from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


SOURCE = Path(
    r"D:\CodexData\.codex\generated_images\01a05cd8-38f1-73f3-9502-6bec6871d997"
    r"\exec-645c6aaf-6823-4a37-b2d5-d35195a3bb5a.png"
)
OUT_DIR = Path(__file__).resolve().parent
MASTER = OUT_DIR / "穿线元素-浅色文件图标-透明母版-1242x1266.png"
ICON_1024 = OUT_DIR / "穿线元素-浅色文件图标-透明-1024.png"
PREVIEW = OUT_DIR / "透明效果检查-白灰深色.png"


def cubic(p0, p1, p2, p3, steps=32):
    points = []
    for t in np.linspace(0.0, 1.0, steps, endpoint=False):
        u = 1.0 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points


def build_document_mask(size: tuple[int, int], scale=4) -> Image.Image:
    width, height = size
    sx, sy = width / 1242.0, height / 1266.0

    def p(x, y):
        return x * sx * scale, y * sy * scale

    outline = []
    outline.append(p(310, 82))
    outline.append(p(744, 82))
    outline += cubic(p(744, 82), p(772, 82), p(790, 91), p(812, 112), 24)
    outline.append(p(1054, 354))
    outline += cubic(p(1054, 354), p(1078, 378), p(1088, 403), p(1088, 440), 24)
    outline.append(p(1088, 1087))
    outline += cubic(p(1088, 1087), p(1088, 1158), p(1043, 1205), p(979, 1205), 36)
    outline.append(p(301, 1205))
    outline += cubic(p(301, 1205), p(236, 1205), p(191, 1157), p(191, 1089), 36)
    outline.append(p(191, 199))
    outline += cubic(p(191, 199), p(191, 134), p(241, 82), p(310, 82), 36)

    mask_large = Image.new("L", (width * scale, height * scale), 0)
    draw = ImageDraw.Draw(mask_large)
    draw.polygon([(round(x), round(y)) for x, y in outline], fill=255)
    return mask_large.resize(size, Image.Resampling.LANCZOS)


def add_clean_shadow(content: Image.Image, mask: Image.Image) -> Image.Image:
    width, height = content.size
    shifted = Image.new("L", content.size, 0)
    shifted.paste(mask, (0, 8))
    blurred = shifted.filter(ImageFilter.GaussianBlur(16))
    outside = ImageChops.subtract(blurred, mask)
    shadow_alpha = outside.point(lambda value: round(value * 0.24))

    shadow = Image.new("RGBA", content.size, (26, 55, 98, 0))
    shadow.putalpha(shadow_alpha)

    foreground = content.convert("RGBA")
    foreground.putalpha(mask)
    return Image.alpha_composite(shadow, foreground)


def make_preview(icon: Image.Image) -> Image.Image:
    panel = 620
    preview = Image.new("RGB", (panel * 3, panel), "white")
    backgrounds = [(255, 255, 255), (155, 161, 172), (7, 18, 38)]
    fitted = icon.copy()
    fitted.thumbnail((520, 520), Image.Resampling.LANCZOS)

    for index, color in enumerate(backgrounds):
        tile = Image.new("RGBA", (panel, panel), color + (255,))
        x = (panel - fitted.width) // 2
        y = (panel - fitted.height) // 2
        tile.alpha_composite(fitted, (x, y))
        preview.paste(tile.convert("RGB"), (index * panel, 0))
    return preview


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    mask = build_document_mask(source.size)
    result = add_clean_shadow(source, mask)
    result.save(MASTER, optimize=True)

    icon = result.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon.save(ICON_1024, optimize=True)
    make_preview(icon).save(PREVIEW, quality=95)

    alpha = result.getchannel("A")
    extrema = alpha.getextrema()
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((result.width - 1, 0)),
               alpha.getpixel((0, result.height - 1)), alpha.getpixel((result.width - 1, result.height - 1))]
    transparent = sum(1 for value in alpha.getdata() if value == 0)
    print(f"mode={result.mode} size={result.size} alpha={extrema} corners={corners} transparent_pixels={transparent}")
    print(MASTER)
    print(ICON_1024)
    print(PREVIEW)


if __name__ == "__main__":
    main()
