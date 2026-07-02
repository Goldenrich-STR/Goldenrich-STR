"""Simple image upload endpoint for property listings.

Stores files under /app/backend/uploads/ and serves them publicly via StaticFiles
mounted at /api/uploads/. Validates type + size, and verifies the file's actual
magic-byte signature matches the claimed extension to reject spoofed uploads
(e.g. an .exe renamed to .png).
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, status
from middleware.auth_middleware import get_current_user
from pathlib import Path
from uuid import uuid4
import logging
import os
from services.object_storage import store_upload

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["Uploads"])

# Use relative path from the backend root (same as server.py)
ROOT_DIR = Path(__file__).parent.parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp", "gif"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


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


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a property image. Auth required. Returns the public URL."""
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

    filename = f"{uuid4().hex}.{ext}"
    object_key = store_upload(
        contents,
        filename,
        "properties",
        file.content_type,
    )

    logger.info(
        f"Image uploaded by {current_user['user_id']}: {filename} ({len(contents)} bytes, kind={detected})"
    )

    return {
        "filename": filename,
        "url": _public_url(object_key),
        "size": len(contents),
        "content_type": file.content_type,
        "detected_kind": detected,
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

