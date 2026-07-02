import logging
import mimetypes
import os
from pathlib import Path, PurePosixPath

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.parent
LOCAL_UPLOAD_DIR = ROOT_DIR / "uploads"
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def uploads_bucket() -> str:
    return os.getenv("S3_UPLOADS_BUCKET", "").strip()


def s3_enabled() -> bool:
    return bool(uploads_bucket())


def _client():
    region = os.getenv("AWS_REGION", "ap-south-1").strip()
    return boto3.client("s3", region_name=region)


def _safe_object_key(object_key: str) -> str:
    normalized = str(PurePosixPath(object_key.lstrip("/")))
    if not normalized or normalized == "." or ".." in PurePosixPath(normalized).parts:
        raise ValueError("Invalid upload object path")
    return normalized


def store_upload(
    contents: bytes,
    filename: str,
    folder: str,
    content_type: str | None = None,
) -> str:
    """Persist an upload and return its stable object key.

    When S3 is configured, S3 is written first so a successful API response
    always means the durable copy exists. Local dual-write remains enabled by
    default during migration and can be disabled after S3 restore tests pass.
    """
    object_key = _safe_object_key(f"{folder}/{filename}")
    bucket = uploads_bucket()

    if bucket:
        resolved_content_type = (
            content_type
            or mimetypes.guess_type(filename)[0]
            or "application/octet-stream"
        )
        _client().put_object(
            Bucket=bucket,
            Key=object_key,
            Body=contents,
            ContentType=resolved_content_type,
            CacheControl="public,max-age=31536000,immutable",
            ServerSideEncryption="AES256",
        )

    dual_write = os.getenv("S3_UPLOADS_DUAL_WRITE_LOCAL", "true").strip().lower()
    if not bucket or dual_write in {"1", "true", "yes", "on"}:
        (LOCAL_UPLOAD_DIR / filename).write_bytes(contents)

    return object_key if bucket else filename


def find_s3_object(object_path: str) -> tuple[str, dict] | None:
    """Find a current or legacy upload and return its key and metadata."""
    bucket = uploads_bucket()
    if not bucket:
        return None

    safe_path = _safe_object_key(object_path)
    candidates = [safe_path]
    if "/" not in safe_path:
        candidates.extend(
            [
                f"legacy/{safe_path}",
                f"properties/{safe_path}",
                f"documents/{safe_path}",
                f"cms/{safe_path}",
            ]
        )

    client = _client()
    for key in dict.fromkeys(candidates):
        try:
            metadata = client.head_object(Bucket=bucket, Key=key)
            return key, metadata
        except ClientError as exc:
            code = str(exc.response.get("Error", {}).get("Code", ""))
            if code not in {"404", "NoSuchKey", "NotFound"}:
                logger.exception("Unable to read S3 upload metadata for %s", key)
                raise
    return None


def presigned_upload_url(object_path: str, expires_in: int = 300) -> str | None:
    found = find_s3_object(object_path)
    if not found:
        return None
    key, _ = found
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": uploads_bucket(), "Key": key},
        ExpiresIn=expires_in,
    )
