"""Simple image upload endpoint for property listings.

Stores files under /app/backend/uploads/ and serves them publicly via StaticFiles
mounted at /api/uploads/. Validates type + size, and verifies the file's actual
magic-byte signature matches the claimed extension to reject spoofed uploads
(e.g. an .exe renamed to .png).
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, status
from pydantic import BaseModel, HttpUrl
from middleware.auth_middleware import get_current_user
from pathlib import Path
from uuid import uuid4
import logging
import os
import ssl
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import re
from services.object_storage import store_upload
from services.image_watermark import apply_image_watermark

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["Uploads"])

# Use relative path from the backend root (same as server.py)
ROOT_DIR = Path(__file__).parent.parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp", "gif"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


class ImageUrlPayload(BaseModel):
    url: HttpUrl


def _detect_image_kind(data: bytes) -> str | None:
    """Return the image kind as one of {'png','jpg','webp','gif'} or None.

    Uses magic-byte signatures rather than the filename or the client-supplied
    Content-Type header, which can both be spoofed. Mirrors the lightweight
    detection used by Pillow/imghdr without pulling in a dependency.
    """
    if not data or len(data) < 12:
        return None
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    # JPEG: FF D8 FF
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    # GIF: 'GIF87a' or 'GIF89a'
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    # WebP: 'RIFF' .... 'WEBP'
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _public_url(object_key: str) -> str:
    backend_url = os.environ.get("PUBLIC_BACKEND_URL") or ""
    path = f"/api/uploads/{object_key}"
    return f"{backend_url}{path}" if backend_url else path


def _kind_to_extension(kind: str) -> str:
    return "jpg" if kind == "jpg" else kind


def _extract_image_url_from_html(html: str) -> str | None:
    patterns = [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _normalize_special_image_page_url(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    path = parsed.path.strip("/")

    if "unsplash.com" in host and path.startswith("photos/"):
        segments = [segment for segment in path.split("/") if segment]
        if len(segments) >= 2:
            slug = segments[-1]
            photo_id = slug.rsplit("-", 1)[-1] if "-" in slug else slug
            return f"https://unsplash.com/photos/{photo_id}/download?force=true&w=1600"

    return url


def _download_remote_image(url: str) -> tuple[bytes, str]:
    url = _normalize_special_image_page_url(url)
    req = Request(
        url,
        headers={
            "User-Agent": "X-Space360-ImageFetcher/1.0",
            "Accept": "image/png,image/jpeg,image/webp,image/gif,image/*;q=0.8,*/*;q=0.5",
        },
    )
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    with urlopen(req, timeout=20, context=ssl_context) as response:
        content_type = (response.headers.get("Content-Type") or "").lower()
        contents = response.read()
    if content_type.startswith("text/html"):
        try:
            html = contents.decode("utf-8", errors="ignore")
            extracted_url = _extract_image_url_from_html(html)
            if extracted_url and extracted_url != url:
                return _download_remote_image(extracted_url)
        except Exception as exc:
            logger.warning("Could not extract image URL from HTML page %s: %s", url, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided page URL does not expose a usable image. Please paste a direct image URL.",
        )
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Remote image too large (max {MAX_BYTES // (1024*1024)} MB)",
        )
    detected = _detect_image_kind(contents)
    if detected is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Remote URL does not point to a supported image format (png, jpg, webp, gif)",
        )
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Remote URL did not return an image",
        )
    return contents, detected


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a property image, save original + watermarked copies, and return the public watermarked URL."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type .{ext}. Allowed: {', '.join(sorted(ALLOWED_EXT))}",
        )

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {MAX_BYTES // (1024*1024)} MB)",
        )

    # Magic-byte verification — defends against spoofed extensions
    detected = _detect_image_kind(contents)
    if detected is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match any supported image format (png, jpg, webp, gif)",
        )

    # Allow .jpg/.jpeg to share the same JPEG payload signature
    normalized_claim = "jpg" if ext in ("jpg", "jpeg") else ext
    if detected != normalized_claim:
        logger.warning(
            f"Upload spoof rejected by {current_user['user_id']}: "
            f"claimed=.{ext} detected={detected}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content (.{detected}) does not match the .{ext} extension",
        )

    original_filename = f"{uuid4().hex}_original.{ext}"
    watermarked_filename = original_filename.replace("_original.", "_wm.")

    original_object_key = store_upload(
        contents,
        original_filename,
        "properties-original",
        file.content_type,
    )
    watermarked_contents = apply_image_watermark(contents, detected)
    watermarked_object_key = store_upload(
        watermarked_contents,
        watermarked_filename,
        "properties",
        file.content_type,
    )

    logger.info(
        f"Image uploaded by {current_user['user_id']}: "
        f"original={original_filename} watermarked={watermarked_filename} "
        f"({len(contents)} bytes, kind={detected})"
    )

    return {
        "filename": watermarked_filename,
        "original_filename": original_filename,
        "url": _public_url(watermarked_object_key),
        "watermarked_url": _public_url(watermarked_object_key),
        "original_url": _public_url(original_object_key),
        "size": len(contents),
        "watermarked_size": len(watermarked_contents),
        "content_type": file.content_type,
        "detected_kind": detected,
        "watermark_applied": True,
    }


@router.post("/image-from-url")
async def upload_image_from_url(
    payload: ImageUrlPayload,
    current_user: dict = Depends(get_current_user),
):
    """Fetch a remote image, apply the same watermark, and return the hosted URL."""
    try:
        contents, detected = _download_remote_image(str(payload.url))
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Remote image fetch failed for %s: %s", payload.url, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not fetch the image from the provided URL",
        ) from exc

    ext = _kind_to_extension(detected)
    original_filename = f"{uuid4().hex}_original.{ext}"
    watermarked_filename = original_filename.replace("_original.", "_wm.")
    parsed = urlparse(str(payload.url))
    source_content_type = f"image/{'jpeg' if detected == 'jpg' else detected}"

    original_object_key = store_upload(
        contents,
        original_filename,
        "properties-original",
        source_content_type,
    )
    watermarked_contents = apply_image_watermark(contents, detected)
    watermarked_object_key = store_upload(
        watermarked_contents,
        watermarked_filename,
        "properties",
        source_content_type,
    )

    logger.info(
        "Remote image uploaded by %s: source=%s original=%s watermarked=%s (%s bytes, kind=%s)",
        current_user["user_id"],
        parsed.netloc,
        original_filename,
        watermarked_filename,
        len(contents),
        detected,
    )

    return {
        "filename": watermarked_filename,
        "original_filename": original_filename,
        "source_url": str(payload.url),
        "url": _public_url(watermarked_object_key),
        "watermarked_url": _public_url(watermarked_object_key),
        "original_url": _public_url(original_object_key),
        "size": len(contents),
        "watermarked_size": len(watermarked_contents),
        "content_type": source_content_type,
        "detected_kind": detected,
        "watermark_applied": True,
    }

ALLOWED_DOC_EXT = {"png", "jpg", "jpeg", "webp", "gif", "pdf"}


def _detect_document_kind(data: bytes) -> str | None:
    if not data or len(data) < 4:
        return None
    if data.startswith(b"%PDF"):
        return "pdf"
    return _detect_image_kind(data)


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a host verification document (PDF or image). Auth required."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_DOC_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type .{ext}. Allowed: {', '.join(sorted(ALLOWED_DOC_EXT))}",
        )

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {MAX_BYTES // (1024*1024)} MB)",
        )

    detected = _detect_document_kind(contents)
    if detected is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match any supported document format (pdf, png, jpg, webp, gif)",
        )

    normalized_claim = "jpg" if ext in ("jpg", "jpeg") else ext
    if detected != normalized_claim:
        logger.warning(
            f"Upload spoof rejected by {current_user['user_id']}: "
            f"claimed=.{ext} detected={detected}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content (.{detected}) does not match the .{ext} extension",
        )

    filename = f"{uuid4().hex}.{ext}"
    object_key = store_upload(
        contents,
        filename,
        "documents",
        file.content_type,
    )

    logger.info(
        f"Document uploaded by {current_user['user_id']}: {filename} ({len(contents)} bytes, kind={detected})"
    )

    return {
        "filename": filename,
        "url": _public_url(object_key),
        "size": len(contents),
        "content_type": file.content_type,
        "detected_kind": detected,
    }


# Video uploads configuration
ALLOWED_VIDEO_EXT = {"mp4", "mov", "avi", "webm", "mkv"}
MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB


def _detect_video_kind(data: bytes) -> str | None:
    if not data or len(data) < 12:
        return None
    if b"ftyp" in data[4:12]:
        return "mp4_mov"
    if data[:4] == b"RIFF" and data[8:12] == b"AVI ":
        return "avi"
    if data[:4] == b"\x1a\x45\xdf\xa3":
        return "ebml"
    return None


@router.post("/video")
async def upload_video(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a property video. Auth required. Returns the public URL."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_VIDEO_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type .{ext}. Allowed: {', '.join(sorted(ALLOWED_VIDEO_EXT))}",
        )

    contents = await file.read()
    if len(contents) > MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {MAX_VIDEO_BYTES // (1024*1024)} MB)",
        )

    detected = _detect_video_kind(contents)
    if detected is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match any supported video format (mp4, mov, avi, webm, mkv)",
        )

    # Validate signature against extension claim
    if ext in ("mp4", "mov") and detected != "mp4_mov":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match the claimed .{ext} format",
        )
    elif ext == "avi" and detected != "avi":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match the claimed .{ext} format",
        )
    elif ext in ("webm", "mkv") and detected != "ebml":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match the claimed .{ext} format",
        )

    filename = f"{uuid4().hex}.{ext}"
    object_key = store_upload(
        contents,
        filename,
        "properties",
        file.content_type,
    )

    logger.info(
        f"Video uploaded by {current_user['user_id']}: {filename} ({len(contents)} bytes, kind={detected})"
    )

    return {
        "filename": filename,
        "url": _public_url(object_key),
        "size": len(contents),
        "content_type": file.content_type,
        "detected_kind": detected,
    }

