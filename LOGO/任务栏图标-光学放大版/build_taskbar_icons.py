from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = ROOT / "LOGO" / "应用素材包-图生图重制版"
OUTPUT_ROOT = ROOT / "LOGO" / "任务栏图标-光学放大版"
OLD_ROOT = ROOT / "2-新版本及其素材" / "g9" / "assets" / "logos"

CANVAS = 1024
SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 192, 256, 512, 1024]
ICO_SIZES = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (96, 96), (128, 128), (256, 256)]

SETS = {
    "01-穿线元素": {
        "source": "01-穿线元素",
        "target_width": 838,
        "y_shift": 12,
    },
    "02-聚焦轨道": {
        "source": "02-聚焦轨道",
        "target_width": 830,
        "y_shift": 2,
    },
    "03-叠合元素": {
        "source": "03-叠合元素",
        "target_height": 820,
        "y_shift": 15,
    },
}


def gradient_tile(mode: str) -> Image.Image:
    tile_box = (38, 30, 986, 978)
    radius = 220

    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))

    shadow = Image.new("L", (CANVAS, CANVAS), 0)
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((42, 42, 982, 990), radius=radius, fill=150 if mode == "light" else 205)
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    shadow_color = (15, 36, 72, 74) if mode == "light" else (0, 0, 0, 138)
    shadow_layer = Image.new("RGBA", out.size, shadow_color)
    shadow_layer.putalpha(shadow)
    out.alpha_composite(shadow_layer)

    if mode == "light":
        top = (255, 255, 255)
        bottom = (237, 244, 255)
        border = (205, 219, 239, 235)
        highlight = (255, 255, 255, 185)
    else:
        top = (19, 31, 54)
        bottom = (6, 13, 28)
        border = (36, 62, 101, 235)
        highlight = (76, 127, 214, 70)

    grad = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    y0, y1 = tile_box[1], tile_box[3]
    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, y1 - y0)
        rgb = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        gd.line((tile_box[0], y, tile_box[2], y), fill=(*rgb, 255))

    mask = Image.new("L", (CANVAS, CANVAS), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle(tile_box, radius=radius, fill=255)
    grad.putalpha(mask)
    out.alpha_composite(grad)

    draw = ImageDraw.Draw(out)
    draw.rounded_rectangle(tile_box, radius=radius, outline=border, width=5)
    draw.arc((55, 46, 969, 448), 198, 342, fill=highlight, width=5)
    return out


def trimmed_mark(path: Path) -> Image.Image:
    mark = Image.open(path).convert("RGBA")
    bbox = mark.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"No visible pixels in {path}")
    return mark.crop(bbox)


def fit_mark(mark: Image.Image, spec: dict[str, object]) -> Image.Image:
    if "target_width" in spec:
        width = int(spec["target_width"])
        height = round(mark.height * width / mark.width)
    else:
        height = int(spec["target_height"])
        width = round(mark.width * height / mark.height)
    return mark.resize((width, height), Image.Resampling.LANCZOS)


def build_master(set_name: str, mode: str, spec: dict[str, object]) -> Image.Image:
    source = SOURCE_ROOT / str(spec["source"]) / "01-应用图标" / mode / "mark-transparent-1024.png"
    mark = fit_mark(trimmed_mark(source), spec)
    icon = gradient_tile(mode)
    x = (CANVAS - mark.width) // 2
    y = (CANVAS - mark.height) // 2 + int(spec.get("y_shift", 0))
    icon.alpha_composite(mark, (x, y))
    return icon


def resize_icon(master: Image.Image, size: int) -> Image.Image:
    icon = master.resize((size, size), Image.Resampling.LANCZOS)
    if size <= 48:
        rgb = icon.convert("RGB").filter(ImageFilter.UnsharpMask(radius=0.65, percent=38, threshold=2))
        rgb.putalpha(icon.getchannel("A"))
        icon = rgb
    return icon


def export_set(set_name: str, mode: str, master: Image.Image) -> None:
    out_dir = OUTPUT_ROOT / set_name / mode
    out_dir.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        resize_icon(master, size).save(out_dir / f"taskbar-icon-{size}.png", optimize=True)
    master.save(out_dir / "taskbar-icon-master-1024.png", optimize=True)
    master.save(out_dir / "taskbar-icon.ico", sizes=ICO_SIZES)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "msyhbd.ttc" if bold else "msyh.ttc"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size=size)


def paste_center(canvas: Image.Image, icon: Image.Image, center: tuple[int, int]) -> None:
    canvas.alpha_composite(icon, (center[0] - icon.width // 2, center[1] - icon.height // 2))


def preview(masters: dict[tuple[str, str], Image.Image]) -> None:
    w, h = 1800, 1040
    sheet = Image.new("RGBA", (w, h), (245, 248, 253, 255))
    draw = ImageDraw.Draw(sheet)
    draw.text((80, 50), "织见任务栏图标 · 光学放大版", font=font(42, True), fill=(12, 28, 52))
    draw.text((80, 108), "裁掉母版二次留白，并针对三种轮廓分别放大", font=font(24), fill=(72, 91, 120))

    labels = ["01 穿线元素", "02 聚焦轨道", "03 叠合元素"]
    keys = list(SETS.keys())
    xs = [410, 900, 1390]

    for mode_index, mode in enumerate(["light", "dark"]):
        top = 185 + mode_index * 390
        taskbar_fill = (238, 243, 250, 255) if mode == "light" else (4, 13, 30, 255)
        text_fill = (22, 39, 66) if mode == "light" else (236, 243, 255)
        draw.rounded_rectangle((70, top, 1730, top + 320), radius=38, fill=taskbar_fill)
        draw.text((105, top + 26), "白天模式" if mode == "light" else "黑夜模式", font=font(28, True), fill=text_fill)

        for i, key in enumerate(keys):
            x = xs[i]
            old_name = f"logo{i+1}-{mode}.png"
            old = Image.open(OLD_ROOT / old_name).convert("RGBA").resize((72, 72), Image.Resampling.LANCZOS)
            new = resize_icon(masters[(key, mode)], 72)
            paste_center(sheet, old, (x - 76, top + 160))
            paste_center(sheet, new, (x + 76, top + 160))
            draw.text((x - 128, top + 215), "旧", font=font(20), fill=text_fill)
            draw.text((x + 52, top + 215), "新", font=font(20, True), fill=text_fill)
            tw = draw.textbbox((0, 0), labels[i], font=font(22))[2]
            draw.text((x - tw // 2, top + 265), labels[i], font=font(22), fill=text_fill)

    draw.text((80, 975), "交付尺寸：16 / 20 / 24 / 32 / 40 / 48 / 64 / 96 / 128 / 192 / 256 / 512 / 1024 px + ICO", font=font(21), fill=(70, 89, 118))
    sheet.convert("RGB").save(OUTPUT_ROOT / "任务栏效果-新旧对照.png", quality=95)


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    masters: dict[tuple[str, str], Image.Image] = {}
    for set_name, spec in SETS.items():
        for mode in ["light", "dark"]:
            master = build_master(set_name, mode, spec)
            masters[(set_name, mode)] = master
            export_set(set_name, mode, master)
    preview(masters)
    print(OUTPUT_ROOT)


if __name__ == "__main__":
    main()
