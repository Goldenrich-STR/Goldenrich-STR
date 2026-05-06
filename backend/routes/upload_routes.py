"""Simple image upload endpoint for property listings.

Stores files under /app/backend/uploads/ and serves them publicly via StaticFiles
mounted at /api/uploads/. Validates type + size, generates uuid filenames.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, status
from middleware.auth_middleware import get_current_user
from pathlib import Path
from uuid import uuid4
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["Uploads"])

UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp", "gif"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


def _public_url(filename: str) -> str:
    backend_url = os.environ.get("PUBLIC_BACKEND_URL") or ""
    return f"{backend_url}/api/uploads/{filename}" if backend_url else f"/api/uploads/{filename}"


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

    filename = f"{uuid4().hex}.{ext}"
    target = UPLOAD_DIR / filename
    target.write_bytes(contents)

    logger.info(f"Image uploaded by {current_user['user_id']}: {filename} ({len(contents)} bytes)")

    return {
        "filename": filename,
        "url": _public_url(filename),
        "size": len(contents),
        "content_type": file.content_type,
    }
