from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import distance_transform_edt


ROOT = Path(r"D:\Desktop\LOGO")
OUT = ROOT / "应用素材包-图生图重制版"


SCHEMES = {
    "01-穿线元素": {
        "atlas": ROOT / "图生图素材图集" / "01-穿线元素-12宫格.png",
        "mono_source": ROOT / "单色图生图母版" / "01-穿线元素-单色正向源图.png",
        "mono_icon_split": 0.50,
        "mono_text_split": 0.55,
        "dark_icon_cell": (1, 0),
        "display_name": "穿线元素",
    },
    "02-聚焦轨道": {
        "atlas": ROOT / "图生图素材图集" / "02-聚焦轨道-12宫格.png",
        "mono_source": ROOT / "单色图生图母版" / "02-聚焦轨道-单色正向源图.png",
        "mono_icon_split": 0.48,
        "mono_text_split": 0.54,
        "dark_icon_cell": (0, 0),
        "display_name": "聚焦轨道",
    },
    "03-叠合元素": {
        "atlas": ROOT / "图生图素材图集" / "03-叠合元素-12宫格.png",
        "mono_source": ROOT / "单色图生图母版" / "03-叠合元素-单色正向源图.png",
        "mono_icon_split": 0.40,
        "mono_text_split": 0.55,
        "dark_icon_cell": (0, 0),
        "display_name": "叠合元素",
    },
}


PNG_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 192, 256, 512, 1024]
ICO_SIZES = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)]


def border_color(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    k = max(3, min(h, w) // 40)
    border = np.concatenate(
        [
            rgb[:k].reshape(-1, 3),
            rgb[-k:].reshape(-1, 3),
            rgb[:, :k].reshape(-1, 3),
            rgb[:, -k:].reshape(-1, 3),
        ],
        axis=0,
    )
    return np.median(border, axis=0)


def remove_light_background(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    bg = border_color(rgb)
    dist = np.linalg.norm(rgb - bg[None, None, :], axis=2)
    alpha = np.clip((dist - 6.0) / 30.0 * 255.0, 0, 255)

    # Keep colored and dark artwork fully opaque while discarding the presentation canvas.
    hsv = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2HSV)
    sat = hsv[:, :, 1].astype(np.float32)
    val = hsv[:, :, 2].astype(np.float32)
    strong = ((sat > 44) & (val < 250)) | (val < 185)
    alpha[strong] = np.maximum(alpha[strong], 245)

    alpha = cv2.GaussianBlur(alpha.astype(np.uint8), (0, 0), 0.45)
    # Recover foreground edge colors from their anti-aliased blend with the light canvas.
    af = alpha.astype(np.float32)[:, :, None] / 255.0
    recovered = np.divide(
        rgb - bg[None, None, :] * (1.0 - af),
        np.maximum(af, 1 / 255.0),
        out=np.zeros_like(rgb),
        where=af > 0,
    )
    recovered = np.clip(recovered, 0, 255)
    rgba = np.dstack([recovered.astype(np.uint8), alpha])
    return Image.fromarray(rgba, "RGBA")


def remove_chroma_background(img: Image.Image) -> Image.Image:
    """Recover alpha from the generated magenta atlas without touching white art."""
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w = rgb.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    x = (xx.reshape(-1) / max(1, w - 1)) * 2.0 - 1.0
    y = (yy.reshape(-1) / max(1, h - 1)) * 2.0 - 1.0
    flat = rgb.reshape(-1, 3)
    chroma = np.minimum(flat[:, 0], flat[:, 2]) - flat[:, 1]
    bg_mask = chroma > 145
    basis = np.column_stack([np.ones_like(x), x, y, x * x, x * y, y * y])
    coeff = np.linalg.lstsq(basis[bg_mask], flat[bg_mask], rcond=None)[0]
    bg = (basis @ coeff).reshape(h, w, 3)

    c = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    bc = np.minimum(bg[:, :, 0], bg[:, :, 2]) - bg[:, :, 1]
    alpha = 1.0 - np.clip((c - 24.0) / np.maximum(1.0, bc - 24.0), 0.0, 1.0)
    alpha = np.clip((alpha - 0.015) / 0.97, 0.0, 1.0)
    alpha_u8 = cv2.GaussianBlur(np.uint8(alpha * 255.0), (0, 0), 0.28)
    alpha_u8[alpha_u8 < 28] = 0
    af = alpha_u8.astype(np.float32)[:, :, None] / 255.0
    recovered = np.divide(
        rgb - bg * (1.0 - af),
        np.maximum(af, 1 / 255.0),
        out=np.zeros_like(rgb),
        where=af > 0,
    )
    recovered = np.clip(recovered, 0, 255)

    # Extend nearby opaque artwork colors into the antialiased edge pixels.
    # This removes magenta spill while keeping the generated edge alpha intact.
    filled = recovered.copy()
    valid = (alpha_u8 >= 210).astype(np.float32)
    kernel = np.ones((3, 3), np.float32)
    for _ in range(10):
        counts = cv2.filter2D(valid, -1, kernel, borderType=cv2.BORDER_CONSTANT)
        sums = np.stack(
            [cv2.filter2D(filled[:, :, c] * valid, -1, kernel, borderType=cv2.BORDER_CONSTANT) for c in range(3)],
            axis=2,
        )
        grow = (valid == 0) & (counts > 0)
        if not np.any(grow):
            break
        averaged = sums / np.maximum(counts[:, :, None], 1.0)
        filled[grow] = averaged[grow]
        valid[grow] = 1.0
    edge = (alpha_u8 > 0) & (alpha_u8 < 235)
    recovered[edge] = filled[edge]
    recovered[alpha_u8 == 0] = 0
    return Image.fromarray(np.dstack([recovered.astype(np.uint8), alpha_u8]), "RGBA")


def atlas_cell(atlas: Image.Image, col: int, row: int) -> Image.Image:
    x0 = round(atlas.width * col / 4)
    x1 = round(atlas.width * (col + 1) / 4)
    y0 = round(atlas.height * row / 3)
    y1 = round(atlas.height * (row + 1) / 3)
    return trim_alpha(remove_chroma_background(atlas.crop((x0, y0, x1, y1))), 0.075)


def recover_dark_monochrome(img: Image.Image, color: tuple[int, int, int] = (7, 20, 38)) -> Image.Image:
    """Turn the generated near-black artwork on a light checkerboard into real RGBA."""
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    luminance = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    alpha = np.clip((226.0 - luminance) / 155.0, 0.0, 1.0)
    alpha[luminance >= 222.0] = 0.0
    alpha[luminance <= 60.0] = 1.0
    alpha_u8 = cv2.GaussianBlur(np.uint8(alpha * 255.0), (0, 0), 0.25)
    alpha_u8[alpha_u8 < 10] = 0
    out = np.zeros((img.height, img.width, 4), dtype=np.uint8)
    out[:, :, 0] = color[0]
    out[:, :, 1] = color[1]
    out[:, :, 2] = color[2]
    out[:, :, 3] = alpha_u8
    return trim_alpha(Image.fromarray(out, "RGBA"), 0.04)


def split_monochrome_lockup(
    lockup: Image.Image,
    icon_split: float,
    text_split: float,
) -> tuple[Image.Image, Image.Image, Image.Image]:
    x = round(lockup.width * icon_split)
    icon = trim_alpha(lockup.crop((0, 0, x, lockup.height)), 0.04)
    right = lockup.crop((x, 0, lockup.width, lockup.height))
    y = round(right.height * text_split)
    zh = trim_alpha(right.crop((0, 0, right.width, y)), 0.04)
    en = trim_alpha(right.crop((0, y, right.width, right.height)), 0.04)
    return icon, zh, en


def trim_alpha(img: Image.Image, pad_ratio: float = 0.05) -> Image.Image:
    a = np.asarray(img.getchannel("A"))
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return img
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    pad = max(2, round(max(x1 - x0, y1 - y0) * pad_ratio))
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(img.width, x1 + pad), min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def resize_rgba(img: Image.Image, size: tuple[int, int], sharpen: bool = False) -> Image.Image:
    arr = np.asarray(img.convert("RGBA"), dtype=np.float32) / 255.0
    alpha = arr[:, :, 3:4]
    premul = arr[:, :, :3] * alpha
    premul_img = Image.fromarray(np.uint8(np.clip(premul * 255, 0, 255)), "RGB")
    alpha_img = Image.fromarray(np.uint8(np.clip(alpha[:, :, 0] * 255, 0, 255)), "L")
    premul_img = premul_img.resize(size, Image.Resampling.LANCZOS)
    alpha_img = alpha_img.resize(size, Image.Resampling.LANCZOS)
    p = np.asarray(premul_img, dtype=np.float32) / 255.0
    a = np.asarray(alpha_img, dtype=np.float32)[:, :, None] / 255.0
    rgb = np.divide(p, np.maximum(a, 1 / 255.0), out=np.zeros_like(p), where=a > 0)
    out = np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)])
    result = Image.fromarray(np.uint8(out * 255), "RGBA")
    if sharpen:
        result = result.filter(ImageFilter.UnsharpMask(radius=0.7, percent=80, threshold=2))
    return result


def fit_inside(img: Image.Image, box: tuple[int, int], fill: float = 1.0) -> Image.Image:
    max_w = max(1, round(box[0] * fill))
    max_h = max(1, round(box[1] * fill))
    scale = min(max_w / img.width, max_h / img.height)
    return resize_rgba(img, (max(1, round(img.width * scale)), max(1, round(img.height * scale))), sharpen=False)


def make_dark_variant(img: Image.Image) -> Image.Image:
    arr = np.asarray(img.convert("RGBA"), dtype=np.uint8).copy()
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    visible = alpha > 0
    core = alpha >= 190
    if not np.any(core):
        return Image.fromarray(arr, "RGBA")

    # Classify every antialiased edge pixel by the nearest opaque artwork pixel.
    # This preserves brand accents while preventing dark/magenta edge remnants.
    _, nearest = distance_transform_edt(~core, return_indices=True)
    nearest_rgb = rgb[nearest[0], nearest[1]]
    nearest_hsv = cv2.cvtColor(nearest_rgb, cv2.COLOR_RGB2HSV)
    intentional_color = (nearest_hsv[:, :, 1] > 72) & (nearest_hsv[:, :, 2] > 105)
    neutral = visible & ~intentional_color
    colored_edge = visible & intentional_color & ~core

    arr[neutral, 0] = 248
    arr[neutral, 1] = 249
    arr[neutral, 2] = 252
    arr[colored_edge, :3] = nearest_rgb[colored_edge]
    return Image.fromarray(arr, "RGBA")


def solid_recolor(img: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    arr = np.asarray(img.convert("RGBA"), dtype=np.uint8).copy()
    visible = arr[:, :, 3] > 0
    arr[visible, 0] = color[0]
    arr[visible, 1] = color[1]
    arr[visible, 2] = color[2]
    return Image.fromarray(arr, "RGBA")


def make_master_mark(mark: Image.Image, size: int = 1024, fill: float = 0.82) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fitted = fit_inside(mark, (size, size), fill=fill)
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def rounded_tile(mark: Image.Image, background: str, size: int = 1024, mark_fill: float = 0.70) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    tile_box = (round(size * 0.035), round(size * 0.035), round(size * 0.965), round(size * 0.965))
    radius = round(size * 0.22)

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    off = round(size * 0.018)
    sd.rounded_rectangle((tile_box[0], tile_box[1] + off, tile_box[2], tile_box[3] + off), radius=radius, fill=(10, 25, 55, 48))
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(size * 0.022)))
    canvas.alpha_composite(shadow)

    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle(tile_box, radius=radius, fill=background)
    fitted = fit_inside(mark, (size, size), fill=mark_fill)
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def maskable_tile(mark: Image.Image, background: str, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    fitted = fit_inside(mark, (size, size), fill=0.58)
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def normalize_wordmark(img: Image.Image, max_width: int = 2048) -> Image.Image:
    scale = max_width / img.width
    return resize_rgba(img, (max_width, max(1, round(img.height * scale))), sharpen=True)


def compose_vertical(mark: Image.Image, zh: Image.Image, en: Image.Image, width: int = 1600) -> Image.Image:
    mark_f = fit_inside(mark, (width, 760), fill=0.72)
    zh_f = fit_inside(zh, (width, 390), fill=0.70)
    en_f = fit_inside(en, (width, 270), fill=0.82)
    gap1, gap2 = 70, 40
    height = mark_f.height + zh_f.height + en_f.height + gap1 + gap2 + 120
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    y = 50
    for item, gap in ((mark_f, gap1), (zh_f, gap2), (en_f, 0)):
        canvas.alpha_composite(item, ((width - item.width) // 2, y))
        y += item.height + gap
    return trim_alpha(canvas, 0.03)


def compose_horizontal(mark: Image.Image, zh: Image.Image, en: Image.Image, width: int = 2400) -> Image.Image:
    mark_f = fit_inside(mark, (800, 760), fill=0.88)
    zh_f = fit_inside(zh, (1200, 390), fill=0.90)
    en_f = fit_inside(en, (1200, 260), fill=0.92)
    right_w = max(zh_f.width, en_f.width)
    right_h = zh_f.height + 54 + en_f.height
    total_w = mark_f.width + 120 + right_w
    total_h = max(mark_f.height, right_h)
    canvas = Image.new("RGBA", (max(width, total_w + 80), total_h + 80), (0, 0, 0, 0))
    x0 = (canvas.width - total_w) // 2
    canvas.alpha_composite(mark_f, (x0, (canvas.height - mark_f.height) // 2))
    rx = x0 + mark_f.width + 120
    ry = (canvas.height - right_h) // 2
    canvas.alpha_composite(zh_f, (rx + (right_w - zh_f.width) // 2, ry))
    canvas.alpha_composite(en_f, (rx + (right_w - en_f.width) // 2, ry + zh_f.height + 54))
    return trim_alpha(canvas, 0.03)


def save_icon_family(tile: Image.Image, mark: Image.Image, folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    tile.save(folder / "app-icon-1024.png")
    mark.save(folder / "mark-transparent-1024.png")
    for s in PNG_SIZES:
        resized = tile.resize((s, s), Image.Resampling.LANCZOS)
        if s <= 48:
            resized = resized.filter(ImageFilter.UnsharpMask(radius=0.45, percent=115, threshold=1))
        resized.save(folder / f"app-icon-{s}.png")
    tile.save(folder / "app-icon.ico", format="ICO", sizes=ICO_SIZES)
    shutil.copy2(folder / "app-icon.ico", folder / "favicon.ico")


def qa_sheet(name: str, light_tile: Image.Image, dark_tile: Image.Image, zh: Image.Image, en: Image.Image) -> Image.Image:
    w, h = 1600, 900
    sheet = Image.new("RGB", (w, h), "#F5F7FB")
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((800, 0, 1600, 900), fill="#0B1324")
    draw.text((60, 40), name, fill="#12213F")
    draw.text((860, 40), name, fill="#F8F9FC")
    for x, tile in ((70, light_tile), (870, dark_tile)):
        t = tile.resize((420, 420), Image.Resampling.LANCZOS)
        sheet.paste(t, (x, 110), t)
    zh_l = fit_inside(zh, (650, 140), 0.90)
    en_l = fit_inside(en, (650, 120), 0.90)
    zh_d = make_dark_variant(zh_l)
    en_d = make_dark_variant(en_l)
    sheet.paste(zh_l, (70, 575), zh_l)
    sheet.paste(en_l, (70, 725), en_l)
    sheet.paste(zh_d, (870, 575), zh_d)
    sheet.paste(en_d, (870, 725), en_d)
    sizes = [16, 24, 32, 48]
    x = 520
    for s in sizes:
        mini = light_tile.resize((s, s), Image.Resampling.LANCZOS)
        sheet.paste(mini, (x, 470 - s), mini)
        draw.text((x, 485), f"{s}px", fill="#52627A")
        x += 72
    return sheet


def monochrome_sheet(positive: Image.Image, reversed_img: Image.Image) -> Image.Image:
    sheet = Image.new("RGB", (1600, 520), "#F7F8FB")
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((800, 0, 1600, 520), fill="#0B1324")
    p = fit_inside(positive, (700, 360), 0.90)
    r = fit_inside(reversed_img, (700, 360), 0.90)
    sheet.paste(p, ((800 - p.width) // 2, 90), p)
    sheet.paste(r, (800 + (800 - r.width) // 2, 90), r)
    draw.text((60, 34), "MONOCHROME POSITIVE", fill="#0B1324")
    draw.text((860, 34), "MONOCHROME REVERSED", fill="#F8F9FC")
    return sheet


def main() -> None:
    if OUT.exists():
        # The package is generated output; replacing it is intentional and scoped.
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    manifest: dict[str, object] = {
        "package": "织见三套品牌应用素材-图生图重制版",
        "source": str(ROOT),
        "schemes": [],
    }

    for folder_name, cfg in SCHEMES.items():
        atlas = Image.open(cfg["atlas"]).convert("RGB")
        scheme_dir = OUT / folder_name
        icon_dir = scheme_dir / "01-应用图标"
        word_dir = scheme_dir / "02-字标与组合"
        pwa_dir = scheme_dir / "03-PWA"
        preview_dir = scheme_dir / "04-预览"
        mono_dir = scheme_dir / "05-单色版本"
        for d in (icon_dir, word_dir, pwa_dir, preview_dir, mono_dir):
            d.mkdir(parents=True, exist_ok=True)

        shutil.copy2(cfg["atlas"], scheme_dir / "源图生图素材图集.png")

        mark_art = atlas_cell(atlas, 0, 0)
        dark_mark_art = make_dark_variant(mark_art) if folder_name == "01-穿线元素" else mark_art.copy()
        zh_art = atlas_cell(atlas, 2, 0)
        en_art = atlas_cell(atlas, 0, 1)

        mark = make_master_mark(mark_art, 1024, fill=0.84)
        dark_mark = make_master_mark(dark_mark_art, 1024, fill=0.84)

        light_tile = rounded_tile(mark, "#FBFCFF", 1024, 0.70)
        dark_tile = rounded_tile(dark_mark, "#0B1324", 1024, 0.70)
        save_icon_family(light_tile, mark, icon_dir / "light")
        save_icon_family(dark_tile, dark_mark, icon_dir / "dark")

        # Direct drop-in files for the current Electron/PWA project.
        light_tile.save(icon_dir / "织见-应用图标.png")
        light_tile.save(icon_dir / "织见-应用图标.ico", format="ICO", sizes=ICO_SIZES)

        for s in (192, 512):
            maskable_tile(mark, "#FBFCFF", s).save(pwa_dir / f"icon-{s}.png")
            maskable_tile(mark, "#315BFF", s).save(pwa_dir / f"icon-maskable-{s}.png")

        zh_light = normalize_wordmark(zh_art, 1600)
        en_light = normalize_wordmark(en_art, 2000)
        zh_dark = make_dark_variant(zh_light)
        en_dark = make_dark_variant(en_light)
        zh_light.save(word_dir / "中文字标-light.png")
        zh_dark.save(word_dir / "中文字标-dark.png")
        en_light.save(word_dir / "英文字标-light.png")
        en_dark.save(word_dir / "英文字标-dark.png")

        vertical_light = compose_vertical(mark_art, zh_art, en_art)
        horizontal_light = compose_horizontal(mark_art, zh_art, en_art)
        vertical_dark = compose_vertical(dark_mark_art, make_dark_variant(zh_art), make_dark_variant(en_art))
        horizontal_dark = compose_horizontal(dark_mark_art, make_dark_variant(zh_art), make_dark_variant(en_art))
        vertical_light.save(word_dir / "竖版组合-light.png")
        vertical_dark.save(word_dir / "竖版组合-dark.png")
        horizontal_light.save(word_dir / "横版组合-light.png")
        horizontal_dark.save(word_dir / "横版组合-dark.png")

        qa = qa_sheet(cfg["display_name"], light_tile, dark_tile, zh_light, en_light)
        qa.save(preview_dir / "素材检查图.png")

        mono_positive = (7, 20, 38)
        mono_reversed = (255, 255, 255)
        mono_horizontal_positive = recover_dark_monochrome(Image.open(cfg["mono_source"]), mono_positive)
        mono_mark_art, mono_zh_art, mono_en_art = split_monochrome_lockup(
            mono_horizontal_positive,
            cfg["mono_icon_split"],
            cfg["mono_text_split"],
        )
        mono_mark_positive = make_master_mark(mono_mark_art, 1024, fill=0.84)
        mono_mark_reversed = solid_recolor(mono_mark_positive, mono_reversed)
        mono_zh_positive = normalize_wordmark(mono_zh_art, 1600)
        mono_zh_reversed = solid_recolor(mono_zh_positive, mono_reversed)
        mono_en_positive = normalize_wordmark(mono_en_art, 2000)
        mono_en_reversed = solid_recolor(mono_en_positive, mono_reversed)
        mono_vertical_positive = compose_vertical(mono_mark_art, mono_zh_art, mono_en_art)
        mono_vertical_reversed = solid_recolor(mono_vertical_positive, mono_reversed)
        mono_horizontal_reversed = solid_recolor(mono_horizontal_positive, mono_reversed)

        mono_mark_positive.save(mono_dir / "图标-单色正向.png")
        mono_mark_reversed.save(mono_dir / "图标-单色反白.png")
        mono_zh_positive.save(mono_dir / "中文字标-单色正向.png")
        mono_zh_reversed.save(mono_dir / "中文字标-单色反白.png")
        mono_en_positive.save(mono_dir / "英文字标-单色正向.png")
        mono_en_reversed.save(mono_dir / "英文字标-单色反白.png")
        mono_vertical_positive.save(mono_dir / "竖版组合-单色正向.png")
        mono_vertical_reversed.save(mono_dir / "竖版组合-单色反白.png")
        mono_horizontal_positive.save(mono_dir / "横版组合-单色正向.png")
        mono_horizontal_reversed.save(mono_dir / "横版组合-单色反白.png")
        monochrome_sheet(mono_horizontal_positive, mono_horizontal_reversed).save(mono_dir / "单色版本检查图.png")

        manifest["schemes"].append(
            {
                "name": folder_name,
                "display_name": cfg["display_name"],
                "drop_in_png": str(icon_dir / "织见-应用图标.png"),
                "drop_in_ico": str(icon_dir / "织见-应用图标.ico"),
            }
        )

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    readme = """# 织见三套品牌应用素材包（图生图重制版）

三套图标、中文字标和英文字标均以已选展示图为参考，通过图生图一次生成 12 宫格素材图集，再从新生成图集中恢复透明通道与导出应用尺寸。没有从原始展示图硬抠字标，也未修改应用代码。

第三套图标中红色上层与蓝色左下层之间的白色斜线是实体不透明高光，在明暗背景上都保留，不是透明镂空。

## 可直接使用

- `01-应用图标/织见-应用图标.png`：Electron 窗口与应用内品牌位可直接使用的 1024px PNG。
- `01-应用图标/织见-应用图标.ico`：Windows 安装包、快捷方式和可执行文件图标。
- `01-应用图标/light|dark/app-icon-*.png`：16–1024px 明暗模式图标。
- `03-PWA/icon-192.png`、`icon-512.png`：PWA 标准图标。
- `03-PWA/icon-maskable-*.png`：PWA maskable 图标，已保留安全区。
- `02-字标与组合/`：透明背景的中英文字标、横版与竖版组合，均有明暗版本。
- `04-预览/素材检查图.png`：快速检查大图、小图和明暗模式效果。
- `05-单色版本/`：纯深色与纯白色的图标、中文字标、英文字标、横版组合和竖版组合，全部保留真实 Alpha。

## 当前项目对应位置（仅说明，未自动替换）

当前 Electron 窗口图标由 `桌面应用/main.cjs` 指向 `2-新版本及其素材/织见-品牌图标-v2.png`；应用内品牌位也读取同一张 PNG。选定方案后，可把对应的 `织见-应用图标.png` 复制到项目素材目录并更新引用。Windows 打包时优先使用同目录的 `.ico`。

## 注意

暗黑模式白色资产不再从白底或色板抠取，而是保留彩色透明母件的原始 Alpha，仅映射不透明内容颜色；单色正向与反白版本同样共享该真实透明轮廓。若以后需要印刷、超大广告牌或严格商标注册底稿，仍建议再制作一份人工校准的矢量母版（SVG/PDF）。
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")
    prompt_notes = """# 图生图提示词与透明处理说明

生成方式：Codex 内置 `image_gen` 图生图。

## 彩色素材图集

- 以三套已选品牌展示图为权威参考，每套生成包含图标、中文、英文、横竖组合和明暗版本的素材图集。
- 中文固定为“织见”；英文按方案固定为 `WEAVISION` 或 `Weavision`。
- 保持既定 Fluent 质感、颜色、字形和间距，不增加标签、边框或额外元素。

## 暗黑与单色版本

- 生成器对白色文字直接请求透明背景时会返回画进像素的 RGB 棋盘格，该失败结果已弃用，没有放入交付目录。
- 暗黑模式白色字标保留彩色透明母件已经验证的 Alpha 通道，只对不透明内容做颜色映射，因此不会重新抠白字，也不会产生假透明。
- 单色正向稿通过图生图确定穿线、层叠缝和节点的负形结构，再编码成真实 RGBA 轮廓；反白版本复用完全相同的 Alpha，仅将颜色切换为纯白。
"""
    (OUT / "图生图提示词说明.md").write_text(prompt_notes, encoding="utf-8")


if __name__ == "__main__":
    main()
