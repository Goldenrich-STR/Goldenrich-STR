import logging
import mimetypes
import os
from pathlib import Path, PurePosixPath

import boto3
from azure.core.exceptions import ResourceNotFoundError
from azure.storage.blob import BlobServiceClient, ContentSettings
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.parent
LOCAL_UPLOAD_DIR = ROOT_DIR / "uploads"
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def uploads_bucket() -> str:
    return os.getenv("S3_UPLOADS_BUCKET", "").strip()


def azure_uploads_account() -> str:
    return os.getenv("AZURE_STORAGE_ACCOUNT", "").strip()


def azure_uploads_container() -> str:
    return os.getenv("AZURE_STORAGE_CONTAINER", "").strip()


def azure_uploads_key() -> str:
    return os.getenv("AZURE_STORAGE_KEY", "").strip()


def azure_enabled() -> bool:
    return bool(azure_uploads_account() and azure_uploads_container() and azure_uploads_key())


def s3_enabled() -> bool:
    return bool(uploads_bucket())


def _client():
    region = os.getenv("AWS_REGION", "ap-south-1").strip()
    return boto3.client("s3", region_name=region)


def _azure_container_client():
    account = azure_uploads_account()
    service = BlobServiceClient(
        account_url=f"https://{account}.blob.core.windows.net",
        credential=azure_uploads_key(),
    )
    return service.get_container_client(azure_uploads_container())


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
    use_azure = azure_enabled()
    resolved_content_type = (
        content_type
        or mimetypes.guess_type(filename)[0]
        or "application/octet-stream"
    )

    if use_azure:
        _azure_container_client().upload_blob(
            name=object_key,
            data=contents,
            overwrite=True,
            content_settings=ContentSettings(
                content_type=resolved_content_type,
                cache_control="public,max-age=31536000,immutable",
            ),
        )
    elif bucket:
        _client().put_object(
            Bucket=bucket,
            Key=object_key,
            Body=contents,
            ContentType=resolved_content_type,
            CacheControl="public,max-age=31536000,immutable",
            ServerSideEncryption="AES256",
        )

    dual_write = os.getenv("S3_UPLOADS_DUAL_WRITE_LOCAL", "true").strip().lower()
    if (not bucket and not use_azure) or dual_write in {"1", "true", "yes", "on"}:
        (LOCAL_UPLOAD_DIR / filename).write_bytes(contents)

    return object_key if bucket or use_azure else filename


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


def find_azure_object(object_path: str) -> tuple[str, dict] | None:
    """Find a current or legacy Azure Blob upload and return its key and metadata."""
    if not azure_enabled():
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

    container = _azure_container_client()
    for key in dict.fromkeys(candidates):
        blob = container.get_blob_client(key)
        try:
            props = blob.get_blob_properties()
            return key, {
                "ContentLength": props.size,
                "ContentType": props.content_settings.content_type,
            }
        except ResourceNotFoundError:
            continue
        except Exception:
            logger.exception("Unable to read Azure upload metadata for %s", key)
            raise
    return None


def open_s3_object(object_path: str) -> dict | None:
    if azure_enabled():
        found = find_azure_object(object_path)
        if not found:
            return None
        key, metadata = found
        downloader = _azure_container_client().download_blob(key)
        return {
            "Body": downloader.readall(),
            "ContentLength": metadata.get("ContentLength"),
            "ContentType": metadata.get("ContentType"),
        }

    found = find_s3_object(object_path)
    if not found:
        return None
    key, _ = found
    return _client().get_object(Bucket=uploads_bucket(), Key=key)


def delete_upload(object_path: str) -> bool:
    """Delete a current or legacy uploaded object from S3/local storage."""
    if not object_path:
        return False
    deleted = False
    safe_path = _safe_object_key(object_path)
    bucket = uploads_bucket()
    use_azure = azure_enabled()

    if use_azure:
        found = find_azure_object(safe_path)
        if found:
            key, _ = found
            _azure_container_client().delete_blob(key)
            deleted = True
    elif bucket:
        found = find_s3_object(safe_path)
        if found:
            key, _ = found
            _client().delete_object(Bucket=bucket, Key=key)
            deleted = True

    candidates = [
        LOCAL_UPLOAD_DIR / safe_path,
        LOCAL_UPLOAD_DIR / Path(safe_path).name,
    ]
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
            if LOCAL_UPLOAD_DIR.resolve() in resolved.parents and resolved.is_file():
                resolved.unlink()
                deleted = True
        except Exception as exc:
            logger.warning("Unable to delete local upload %s: %s", candidate, exc)

    return deleted
