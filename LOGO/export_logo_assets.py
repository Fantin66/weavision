from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(r"D:\Desktop\LOGO")
OUT = ROOT / "应用素材包"


SCHEMES = {
    "01-穿线元素": {
        "source": ROOT / "1.png",
        "master": ROOT / "透明母版" / "01-穿线元素.png",
        "crops": {
            "mark": (178, 176, 470, 308),
            "zh": (158, 296, 458, 432),
            "en": (70, 430, 542, 510),
        },
        "dark_icon_navy_to_white": True,
        "display_name": "穿线元素",
    },
    "02-聚焦轨道": {
        "source": ROOT / "2.png",
        "master": ROOT / "透明母版" / "02-聚焦轨道.png",
        "crops": {
            "mark": (145, 208, 490, 412),
            "zh": (150, 400, 462, 548),
            "en": (72, 542, 548, 632),
        },
        "dark_icon_navy_to_white": False,
        "display_name": "聚焦轨道",
    },
    "03-叠合元素": {
        "source": ROOT / "3.png",
        "master": ROOT / "透明母版" / "03-叠合元素.png",
        "crops": {
            "mark": (55, 82, 388, 414),
            "zh": (386, 180, 682, 330),
            "en": (382, 320, 812, 408),
        },
        "dark_icon_navy_to_white": False,
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
    a = arr[:, :, 3]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    # Preserve intentional brand colors; turn all neutral ink and its anti-aliased
    # edge pixels into warm white. This avoids gray/outlined dark-mode wordmarks.
    intentional_color = (sat > 58) & (val > 95)
    neutral = (a > 6) & ~intentional_color
    arr[neutral, 0] = 248
    arr[neutral, 1] = 249
    arr[neutral, 2] = 252
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


def main() -> None:
    if OUT.exists():
        # The package is generated output; replacing it is intentional and scoped.
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    manifest: dict[str, object] = {
        "package": "织见三套候选品牌应用素材",
        "source": str(ROOT),
        "schemes": [],
    }

    for folder_name, cfg in SCHEMES.items():
        source = Image.open(cfg["source"]).convert("RGB")
        scheme_dir = OUT / folder_name
        icon_dir = scheme_dir / "01-应用图标"
        word_dir = scheme_dir / "02-字标与组合"
        pwa_dir = scheme_dir / "03-PWA"
        preview_dir = scheme_dir / "04-预览"
        for d in (icon_dir, word_dir, pwa_dir, preview_dir):
            d.mkdir(parents=True, exist_ok=True)

        shutil.copy2(cfg["source"], scheme_dir / "源展示图.png")

        extracted: dict[str, Image.Image] = {}
        for kind, box in cfg["crops"].items():
            crop = source.crop(box)
            extracted[kind] = trim_alpha(remove_light_background(crop), 0.055)

        generated_master = Image.open(cfg["master"]).convert("RGBA")
        mark_art = trim_alpha(generated_master, 0.055)
        mark = make_master_mark(mark_art, 1024, fill=0.84)
        dark_mark_source = make_dark_variant(mark_art) if cfg["dark_icon_navy_to_white"] else mark_art
        dark_mark = make_master_mark(dark_mark_source, 1024, fill=0.84)

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

        zh_light = normalize_wordmark(extracted["zh"], 1600)
        en_light = normalize_wordmark(extracted["en"], 2000)
        zh_dark = make_dark_variant(zh_light)
        en_dark = make_dark_variant(en_light)
        zh_light.save(word_dir / "中文字标-light.png")
        zh_dark.save(word_dir / "中文字标-dark.png")
        en_light.save(word_dir / "英文字标-light.png")
        en_dark.save(word_dir / "英文字标-dark.png")

        vertical_light = compose_vertical(mark_art, extracted["zh"], extracted["en"])
        horizontal_light = compose_horizontal(mark_art, extracted["zh"], extracted["en"])
        vertical_dark = make_dark_variant(vertical_light)
        horizontal_dark = make_dark_variant(horizontal_light)
        vertical_light.save(word_dir / "竖版组合-light.png")
        vertical_dark.save(word_dir / "竖版组合-dark.png")
        horizontal_light.save(word_dir / "横版组合-light.png")
        horizontal_dark.save(word_dir / "横版组合-dark.png")

        qa = qa_sheet(cfg["display_name"], light_tile, dark_tile, zh_light, en_light)
        qa.save(preview_dir / "素材检查图.png")

        manifest["schemes"].append(
            {
                "name": folder_name,
                "display_name": cfg["display_name"],
                "drop_in_png": str(icon_dir / "织见-应用图标.png"),
                "drop_in_ico": str(icon_dir / "织见-应用图标.ico"),
            }
        )

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    readme = """# 织见三套品牌应用素材包

每套图标均以原始展示图为参考，通过图生图重新生成真实 Alpha 透明母版，再统一导出应用尺寸；字标与组合从已选展示图中拆分。未修改应用代码。

## 可直接使用

- `01-应用图标/织见-应用图标.png`：Electron 窗口与应用内品牌位可直接使用的 1024px PNG。
- `01-应用图标/织见-应用图标.ico`：Windows 安装包、快捷方式和可执行文件图标。
- `01-应用图标/light|dark/app-icon-*.png`：16–1024px 明暗模式图标。
- `03-PWA/icon-192.png`、`icon-512.png`：PWA 标准图标。
- `03-PWA/icon-maskable-*.png`：PWA maskable 图标，已保留安全区。
- `02-字标与组合/`：透明背景的中英文字标、横版与竖版组合，均有明暗版本。
- `04-预览/素材检查图.png`：快速检查大图、小图和明暗模式效果。

## 当前项目对应位置（仅说明，未自动替换）

当前 Electron 窗口图标由 `桌面应用/main.cjs` 指向 `2-新版本及其素材/织见-品牌图标-v2.png`；应用内品牌位也读取同一张 PNG。选定方案后，可把对应的 `织见-应用图标.png` 复制到项目素材目录并更新引用。Windows 打包时优先使用同目录的 `.ico`。

## 注意

这些图标素材来自图生图透明母版，适合直接用于当前应用和常见桌面/PWA场景。若以后需要印刷、超大广告牌或严格商标注册底稿，仍建议再制作一份人工校准的矢量母版（SVG/PDF）。
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")


if __name__ == "__main__":
    main()
