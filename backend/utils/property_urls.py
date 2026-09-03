import re

PROPERTY_ID_RE = re.compile(r"^prop_[a-z0-9]+$", re.IGNORECASE)


def slugify_property_segment(value: str | None) -> str:
    text = str(value or "").lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")


def build_property_slug(property_dict: dict | None) -> str:
    property_dict = property_dict or {}
    explicit_slug = str(property_dict.get("slug") or property_dict.get("property_slug") or "").strip()
    property_id = str(property_dict.get("property_id") or "").strip()

    if explicit_slug and not PROPERTY_ID_RE.match(explicit_slug):
        return explicit_slug

    if not property_id:
        return explicit_slug

    title = slugify_property_segment(property_dict.get("title") or property_dict.get("name"))
    city = slugify_property_segment(property_dict.get("city"))
    readable_prefix = "-".join(part for part in [title, city] if part)

    if not readable_prefix:
        return property_id

    return f"{readable_prefix}--{property_id}"


def build_property_path(property_dict: dict | None) -> str:
    return f"/property/{build_property_slug(property_dict)}"


def extract_property_id(value: str | None) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    if PROPERTY_ID_RE.match(raw):
        return raw

    suffix_match = re.search(r"--(prop_[a-z0-9]+)$", raw, re.IGNORECASE)
    if suffix_match:
        return suffix_match.group(1)

    return ""
