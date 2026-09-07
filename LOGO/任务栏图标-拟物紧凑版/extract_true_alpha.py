from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


SOURCE = Path(r"D:\CodexData\.codex\generated_images\01a05cd8-38f1-73f3-9502-6bec6871d997\exec-1ffb67db-7633-4d49-a4fe-1147c4bcc786.png")
OUT_DIR = Path(__file__).resolve().parent
MASTER = OUT_DIR / "穿线元素-拟物紧凑版-透明母版-1254.png"
PNG_1024 = OUT_DIR / "穿线元素-拟物紧凑版-透明-1024.png"
PREVIEW = OUT_DIR / "透明效果检查.png"


def largest_component(mask: np.ndarray) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    if count <= 1:
        return mask
    index = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    return labels == index


def extract() -> Image.Image:
    rgb = np.asarray(Image.open(SOURCE).convert("RGB"), dtype=np.float32)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    saturation = mx - mn
    luminance = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]

    # The generated matte consists only of nearly neutral 246-255 checker tiles.
    # Saturation isolates colored antialiasing; luminance isolates the navy mark and soft shadows.
    color_signal = np.clip((saturation - 1.5) / 24.0, 0.0, 1.0)
    dark_signal = np.clip((246.0 - luminance) / 34.0, 0.0, 1.0)
    confidence = np.maximum(color_signal, dark_signal)

    support = confidence > 0.045
    support = cv2.morphologyEx(support.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)) > 0
    support = largest_component(support)

    core = ((saturation > 18.0) | (luminance < 226.0)) & support
    core = cv2.morphologyEx(core.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)) > 0

    alpha = np.zeros_like(luminance, dtype=np.float32)
    alpha[support] = np.clip(confidence[support] ** 0.72, 0.0, 1.0)
    alpha[core] = 1.0
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.42)
    alpha[core] = 1.0
    alpha[~support] = 0.0

    # Remove the pale checker contamination from translucent colored edges.
    solid = alpha > 0.96
    _, nearest = cv2.distanceTransformWithLabels((~solid).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    solid_pixels = np.argwhere(solid)
    cleaned = rgb.copy()
    if len(solid_pixels):
        label_to_color = np.zeros((nearest.max() + 1, 3), dtype=np.float32)
        # DIST_LABEL_PIXEL labels zero pixels (the solid set) in raster order.
        solid_colors = rgb[solid]
        upto = min(len(solid_colors), len(label_to_color) - 1)
        label_to_color[1 : upto + 1] = solid_colors[:upto]
        edge = (alpha > 0) & (alpha < 0.96) & (saturation > 5)
        labels = nearest[edge]
        valid = (labels > 0) & (labels < len(label_to_color))
        edge_colors = cleaned[edge]
        edge_colors[valid] = label_to_color[labels[valid]]
        cleaned[edge] = edge_colors

    # Neutral soft-shadow pixels should remain dark rather than inherit a colored edge.
    neutral_shadow = (alpha > 0) & (alpha < 0.92) & (saturation <= 5)
    cleaned[neutral_shadow] = np.array([26, 35, 52], dtype=np.float32)

    rgba = np.dstack([np.clip(cleaned, 0, 255).astype(np.uint8), np.clip(alpha * 255, 0, 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def make_preview(mark: Image.Image) -> None:
    w, h = 1800, 700
    backgrounds = [(248, 250, 253, 255), (128, 136, 150, 255), (6, 13, 28, 255)]
    canvas = Image.new("RGBA", (w, h), backgrounds[0])
    panel_w = w // 3
    fitted = mark.copy()
    fitted.thumbnail((500, 500), Image.Resampling.LANCZOS)
    for i, bg in enumerate(backgrounds):
        panel = Image.new("RGBA", (panel_w, h), bg)
        panel.alpha_composite(fitted, ((panel_w - fitted.width) // 2, (h - fitted.height) // 2))
        canvas.alpha_composite(panel, (i * panel_w, 0))
    canvas.convert("RGB").save(PREVIEW, quality=95)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    mark = extract()
    mark.save(MASTER, optimize=True)
    mark.resize((1024, 1024), Image.Resampling.LANCZOS).save(PNG_1024, optimize=True)
    make_preview(mark)
    print(MASTER)
    print(PNG_1024)
    print(PREVIEW)


if __name__ == "__main__":
    main()
