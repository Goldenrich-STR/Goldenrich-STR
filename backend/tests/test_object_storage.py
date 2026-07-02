from botocore.exceptions import ClientError

from services import object_storage


class FakeS3:
    def __init__(self):
        self.objects = {}

    def put_object(self, **kwargs):
        self.objects[(kwargs["Bucket"], kwargs["Key"])] = kwargs
        return {"ETag": '"test"'}

    def head_object(self, Bucket, Key):
        stored = self.objects.get((Bucket, Key))
        if not stored:
            raise ClientError(
                {"Error": {"Code": "404", "Message": "Not Found"}},
                "HeadObject",
            )
        return {
            "ContentLength": len(stored["Body"]),
            "ContentType": stored["ContentType"],
        }

    def generate_presigned_url(self, operation, Params, ExpiresIn):
        return (
            f"https://signed.example/{Params['Key']}"
            f"?operation={operation}&expires={ExpiresIn}"
        )


def test_local_storage_remains_default(monkeypatch, tmp_path):
    monkeypatch.delenv("S3_UPLOADS_BUCKET", raising=False)
    monkeypatch.setattr(object_storage, "LOCAL_UPLOAD_DIR", tmp_path)

    key = object_storage.store_upload(
        b"image",
        "photo.jpg",
        "properties",
        "image/jpeg",
    )

    assert key == "photo.jpg"
    assert (tmp_path / "photo.jpg").read_bytes() == b"image"


def test_s3_storage_uses_stable_prefix_and_dual_writes(monkeypatch, tmp_path):
    fake = FakeS3()
    monkeypatch.setenv("S3_UPLOADS_BUCKET", "xspace-prod-uploads")
    monkeypatch.setenv("S3_UPLOADS_DUAL_WRITE_LOCAL", "true")
    monkeypatch.setattr(object_storage, "LOCAL_UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(object_storage, "_client", lambda: fake)

    key = object_storage.store_upload(
        b"image",
        "photo.jpg",
        "properties",
        "image/jpeg",
    )

    assert key == "properties/photo.jpg"
    stored = fake.objects[("xspace-prod-uploads", key)]
    assert stored["ServerSideEncryption"] == "AES256"
    assert stored["ContentType"] == "image/jpeg"
    assert (tmp_path / "photo.jpg").read_bytes() == b"image"


def test_bare_legacy_url_resolves_from_legacy_prefix(monkeypatch):
    fake = FakeS3()
    fake.put_object(
        Bucket="xspace-prod-uploads",
        Key="legacy/old.jpg",
        Body=b"old",
        ContentType="image/jpeg",
    )
    monkeypatch.setenv("S3_UPLOADS_BUCKET", "xspace-prod-uploads")
    monkeypatch.setattr(object_storage, "_client", lambda: fake)

    signed_url = object_storage.presigned_upload_url("old.jpg")

    assert signed_url.startswith("https://signed.example/legacy/old.jpg")
