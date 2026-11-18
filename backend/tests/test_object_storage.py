from botocore.exceptions import ClientError
from azure.core.exceptions import ResourceNotFoundError

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

    def get_object(self, Bucket, Key):
        stored = self.objects.get((Bucket, Key))
        if not stored:
            raise ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "Not Found"}},
                "GetObject",
            )
        return {
            "Body": stored["Body"],
            "ContentLength": len(stored["Body"]),
            "ContentType": stored["ContentType"],
        }


class FakeAzureBlob:
    def __init__(self, container, name):
        self.container = container
        self.name = name

    def upload_blob(self, name, data, overwrite, content_settings):
        self.container.objects[name] = {
            "Body": data,
            "ContentType": content_settings.content_type,
            "CacheControl": content_settings.cache_control,
        }

    def get_blob_properties(self):
        stored = self.container.objects.get(self.name)
        if not stored:
            raise ResourceNotFoundError("missing")
        return type(
            "Props",
            (),
            {
                "size": len(stored["Body"]),
                "content_settings": type(
                    "ContentSettings",
                    (),
                    {"content_type": stored["ContentType"]},
                )(),
            },
        )()

    def download_blob(self):
        stored = self.container.objects[self.name]
        return type("Downloader", (), {"readall": lambda self_: stored["Body"]})()

    def delete_blob(self, name):
        self.container.objects.pop(name, None)


class FakeAzureContainer:
    def __init__(self):
        self.objects = {}

    def upload_blob(self, **kwargs):
        FakeAzureBlob(self, kwargs["name"]).upload_blob(**kwargs)

    def get_blob_client(self, name):
        return FakeAzureBlob(self, name)

    def download_blob(self, name):
        return FakeAzureBlob(self, name).download_blob()

    def delete_blob(self, name):
        self.objects.pop(name, None)


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


def test_azure_storage_uses_stable_prefix(monkeypatch, tmp_path):
    fake = FakeAzureContainer()
    monkeypatch.setenv("AZURE_STORAGE_ACCOUNT", "xspaceproduploads")
    monkeypatch.setenv("AZURE_STORAGE_CONTAINER", "uploads")
    monkeypatch.setenv("AZURE_STORAGE_KEY", "secret")
    monkeypatch.delenv("S3_UPLOADS_BUCKET", raising=False)
    monkeypatch.setattr(object_storage, "LOCAL_UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(object_storage, "_azure_container_client", lambda: fake)

    key = object_storage.store_upload(
        b"image",
        "photo.jpg",
        "properties",
        "image/jpeg",
    )

    assert key == "properties/photo.jpg"
    assert fake.objects[key]["ContentType"] == "image/jpeg"
    stored = object_storage.open_s3_object("properties/photo.jpg")
    assert stored["Body"] == b"image"
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

    stored = object_storage.open_s3_object("old.jpg")

    assert stored["Body"] == b"old"
    assert stored["ContentType"] == "image/jpeg"
