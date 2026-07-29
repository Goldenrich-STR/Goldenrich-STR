from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageEnhance, ImageSequence


ROOT_DIR = Path(__file__).resolve().parents[2]
WATERMARK_LOGO_CANDIDATES = [
    ROOT_DIR / "frontend" / "public" / "logo-cropped.png",
    ROOT_DIR / "frontend" / "public" / "logo.png",
]
WATERMARK_MARGIN_PX = 24
WATERMARK_WIDTH_RATIO = 0.20
WATERMARK_OPACITY = 0.32
WATERMARK_BACKPLATE_OPACITY = 72
WATERMARK_BACKPLATE_PADDING_X = 14
WATERMARK_BACKPLATE_PADDING_Y = 10


def _load_logo() -> Image.Image:
    logo_path = next((path for path in WATERMARK_LOGO_CANDIDATES if path.is_file()), None)
    if logo_path is None:
        candidates = ", ".join(str(path) for path in WATERMARK_LOGO_CANDIDATES)
        raise FileNotFoundError(f"Watermark logo not found. Checked: {candidates}")

    logo = Image.open(logo_path).convert("RGBA")
    bbox = logo.getbbox()
    return logo.crop(bbox) if bbox else logo


def _make_logo_white(logo: Image.Image) -> Image.Image:
    white_logo = Image.new("RGBA", logo.size, (255, 255, 255, 0))
    white_logo.putalpha(logo.getchannel("A"))
    return white_logo


def _build_overlay(base_size: tuple[int, int], logo: Image.Image) -> Image.Image:
    base_width, base_height = base_size
    target_width = max(1, int(base_width * WATERMARK_WIDTH_RATIO))
    scale = target_width / max(1, logo.width)
    target_height = max(1, int(logo.height * scale))

    resized_logo = _make_logo_white(logo).resize((target_width, target_height), Image.Resampling.LANCZOS)
    alpha = resized_logo.getchannel("A")
    alpha = ImageEnhance.Brightness(alpha).enhance(WATERMARK_OPACITY)
    resized_logo.putalpha(alpha)

    overlay = Image.new("RGBA", (base_width, base_height), (255, 255, 255, 0))
    plate_width = target_width + (WATERMARK_BACKPLATE_PADDING_X * 2)
    plate_height = target_height + (WATERMARK_BACKPLATE_PADDING_Y * 2)
    x = max(WATERMARK_MARGIN_PX, base_width - plate_width - WATERMARK_MARGIN_PX)
    y = max(WATERMARK_MARGIN_PX, base_height - plate_height - WATERMARK_MARGIN_PX)

    backplate = Image.new("RGBA", (plate_width, plate_height), (0, 0, 0, WATERMARK_BACKPLATE_OPACITY))
    overlay.alpha_composite(backplate, (x, y))
    overlay.alpha_composite(resized_logo, (x + WATERMARK_BACKPLATE_PADDING_X, y + WATERMARK_BACKPLATE_PADDING_Y))
    return overlay


def _watermark_frame(frame: Image.Image, logo: Image.Image) -> Image.Image:
    rgba_frame = frame.convert("RGBA")
    overlay = _build_overlay(rgba_frame.size, logo)
    return Image.alpha_composite(rgba_frame, overlay)


def apply_image_watermark(contents: bytes, detected_kind: str) -> bytes:
    image = Image.open(io.BytesIO(contents))
    logo = _load_logo()

    if detected_kind == "gif":
        frames: list[Image.Image] = []
        durations: list[int] = []
        disposals: list[int] = []

        for frame in ImageSequence.Iterator(image):
            frames.append(_watermark_frame(frame, logo).convert("P", palette=Image.Palette.ADAPTIVE))
            durations.append(frame.info.get("duration", image.info.get("duration", 100)))
            disposals.append(frame.info.get("disposal", image.info.get("disposal", 2)))

        output = io.BytesIO()
        frames[0].save(
            output,
            format="GIF",
            save_all=True,
            append_images=frames[1:],
            loop=image.info.get("loop", 0),
            duration=durations,
            disposal=disposals,
        )
        return output.getvalue()

    watermarked = _watermark_frame(image, logo)
    output = io.BytesIO()

    if detected_kind == "png":
        watermarked.save(output, format="PNG", optimize=True)
    elif detected_kind == "webp":
        watermarked.save(output, format="WEBP", quality=95, method=6)
    else:
        watermarked.convert("RGB").save(output, format="JPEG", quality=95, optimize=True)

    return output.getvalue()
