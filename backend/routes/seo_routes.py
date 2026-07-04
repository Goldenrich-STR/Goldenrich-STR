import re
import logging
from datetime import datetime, timezone
from urllib.parse import quote
from xml.sax.saxutils import escape
from fastapi import APIRouter, Depends, Response
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["SEO"])

async def get_db():
    from server import db_instance
    return db_instance

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')

def get_base_url():
    # Canonical domain is always x-space360.in in production
    return "https://x-space360.in"

def format_lastmod(value=None) -> str:
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, str) and len(value) >= 10:
        return value[:10]
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def url_entry(path: str, lastmod=None, changefreq: str = "weekly", priority: str = "0.6") -> str:
    loc = f"{get_base_url()}{path}"
    return f"""  <url>
    <loc>{escape(loc)}</loc>
    <lastmod>{format_lastmod(lastmod)}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>"""

def urlset(entries) -> Response:
    xml_body = "\n".join(entries)
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{xml_body}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

async def get_live_properties(db: AsyncIOMotorDatabase):
    properties = await db.properties.find(
        {"status": "live"},
        {
            "_id": 0,
            "property_id": 1,
            "updated_at": 1,
            "created_at": 1,
            "subscription_id": 1,
        },
    ).to_list(length=100000)

    sub_ids = [prop.get("subscription_id") for prop in properties if prop.get("subscription_id")]
    if sub_ids:
        today_str = datetime.now(timezone.utc).date().isoformat()
        expired_subs = await db.subscriptions.find(
            {"subscription_id": {"$in": sub_ids}, "end_date": {"$lte": today_str}},
            {"_id": 0, "subscription_id": 1},
        ).to_list(length=len(sub_ids))
        expired_sub_ids = {sub.get("subscription_id") for sub in expired_subs}
        properties = [prop for prop in properties if prop.get("subscription_id") not in expired_sub_ids]

    return properties

async def get_blog_posts(db: AsyncIOMotorDatabase):
    blog_doc = await db.cms_content.find_one({"page": "landing", "section": "blog"}, {"_id": 0})
    posts = []
    for index, post in enumerate((blog_doc or {}).get("content_data", {}).get("posts", []) or []):
        if post and post.get("is_active") is not False:
            title = post.get("title") or f"blog-post-{index + 1}"
            slug = post.get("slug") or slugify(title) or f"blog-post-{index + 1}"
            posts.append({**post, "slug": slug})
    return posts

async def get_legal_docs(db: AsyncIOMotorDatabase):
    legal_doc = await db.cms_content.find_one({"page": "landing", "section": "legal_terms"}, {"_id": 0})
    content = (legal_doc or {}).get("content_data", {}) or {}
    docs = []

    if content.get("terms_text"):
        docs.append({"path": "/terms", "updated_at": legal_doc.get("updated_at") if legal_doc else None})
    if content.get("privacy_text"):
        docs.append({"path": "/privacy", "updated_at": legal_doc.get("updated_at") if legal_doc else None})
    if content.get("refund_text"):
        docs.append({"path": "/refund-policy", "updated_at": legal_doc.get("updated_at") if legal_doc else None})

    for index, policy in enumerate(content.get("custom_policies", []) or []):
        if not policy or policy.get("status") != "Active" or not policy.get("text"):
            continue
        title = policy.get("label") or policy.get("title") or f"legal-policy-{index + 1}"
        slug = slugify(title) or f"legal-policy-{index + 1}"
        docs.append({"path": f"/legal/{slug}", "updated_at": policy.get("updated_at") or legal_doc.get("updated_at")})

    return docs

async def build_sitemap_entries(db: AsyncIOMotorDatabase):
    entries = [
        url_entry("", changefreq="daily", priority="1.0"),
        url_entry("/guest/browse", changefreq="daily", priority="0.9"),
        url_entry("/about-us", changefreq="monthly", priority="0.7"),
        url_entry("/blog", changefreq="weekly", priority="0.8"),
        url_entry("/support", changefreq="monthly", priority="0.6"),
        url_entry("/legal", changefreq="monthly", priority="0.6"),
    ]

    try:
        for prop in await get_live_properties(db):
            prop_id = prop.get("property_id")
            if not prop_id:
                continue
            entries.append(url_entry(
                f"/property/{quote(str(prop_id))}",
                prop.get("updated_at") or prop.get("created_at"),
                "daily",
                "0.9",
            ))
    except Exception as e:
        logger.error(f"Error adding properties to sitemap: {e}")

    try:
        for post in await get_blog_posts(db):
            entries.append(url_entry(
                f"/blog/{quote(str(post['slug']))}",
                post.get("updated_at") or post.get("date"),
                "weekly",
                "0.7",
            ))
    except Exception as e:
        logger.error(f"Error adding blogs to sitemap: {e}")

    try:
        for doc in await get_legal_docs(db):
            entries.append(url_entry(doc["path"], doc.get("updated_at"), "monthly", "0.5"))
    except Exception as e:
        logger.error(f"Error adding legal docs to sitemap: {e}")

    try:
        cities = await db.properties.distinct("city", {"status": "live"})
        for city in cities:
            if city:
                entries.append(url_entry(f"/guest/browse?city={quote(str(city))}", changefreq="daily", priority="0.7"))
    except Exception as e:
        logger.error(f"Error adding city browse URLs to sitemap: {e}")

    try:
        categories = await db.properties.distinct("category", {"status": "live"})
        for category in categories:
            if category:
                entries.append(url_entry(f"/guest/browse?category={quote(str(category))}", changefreq="weekly", priority="0.7"))
    except Exception as e:
        logger.error(f"Error adding category browse URLs to sitemap: {e}")

    return entries

@router.get("/sitemap.xml")
async def get_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    entries = await build_sitemap_entries(db)
    return urlset(entries)

@router.get("/sitemap-index.xml")
async def get_sitemap_index():
    base_url = get_base_url()
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>{base_url}/sitemap-static.xml</loc>
    <lastmod>{now_str}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{base_url}/sitemap-properties.xml</loc>
    <lastmod>{now_str}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{base_url}/sitemap-blogs.xml</loc>
    <lastmod>{now_str}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{base_url}/sitemap-cities.xml</loc>
    <lastmod>{now_str}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{base_url}/sitemap-categories.xml</loc>
    <lastmod>{now_str}</lastmod>
  </sitemap>
  <sitemap>
    <loc>{base_url}/sitemap-hosts.xml</loc>
    <lastmod>{now_str}</lastmod>
  </sitemap>
</sitemapindex>"""
    return Response(content=xml, media_type="application/xml")

@router.get("/sitemap-static.xml")
async def get_static_sitemap():
    return urlset([
        url_entry("", changefreq="daily", priority="1.0"),
        url_entry("/guest/browse", changefreq="daily", priority="0.9"),
        url_entry("/about-us", changefreq="monthly", priority="0.7"),
        url_entry("/blog", changefreq="weekly", priority="0.8"),
        url_entry("/support", changefreq="monthly", priority="0.6"),
        url_entry("/legal", changefreq="monthly", priority="0.6"),
    ])

@router.get("/sitemap-properties.xml")
async def get_properties_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    xml_entries = []
    
    try:
        for prop in await get_live_properties(db):
            prop_id = prop.get("property_id")
            if prop_id:
                xml_entries.append(url_entry(
                    f"/property/{quote(str(prop_id))}",
                    prop.get("updated_at") or prop.get("created_at"),
                    "daily",
                    "0.9",
                ))
    except Exception as e:
        logger.error(f"Error generating properties sitemap: {e}")
        
    return urlset(xml_entries)

@router.get("/sitemap-blogs.xml")
async def get_blogs_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    xml_entries = []
    
    try:
        for post in await get_blog_posts(db):
            xml_entries.append(url_entry(
                f"/blog/{quote(str(post['slug']))}",
                post.get("updated_at") or post.get("date"),
                "weekly",
                "0.7",
            ))
    except Exception as e:
        logger.error(f"Error generating blogs sitemap: {e}")
        
    return urlset(xml_entries)

@router.get("/sitemap-cities.xml")
async def get_cities_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    base_url = get_base_url()
    xml_entries = []
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    try:
        # Fetch distinct cities from active properties
        cities = await db.properties.distinct("city", {"status": "live"})
        for city in cities:
            if city:
                xml_entries.append(url_entry(f"/guest/browse?city={quote(str(city))}", changefreq="daily", priority="0.7"))
    except Exception as e:
        logger.error(f"Error generating cities sitemap: {e}")
        
    return urlset(xml_entries)

@router.get("/sitemap-categories.xml")
async def get_categories_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    base_url = get_base_url()
    xml_entries = []
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    try:
        # Fetch distinct categories from properties
        categories = await db.properties.distinct("category", {"status": "live"})
        for category in categories:
            if category:
                xml_entries.append(url_entry(f"/guest/browse?category={quote(str(category))}", changefreq="weekly", priority="0.7"))
    except Exception as e:
        logger.error(f"Error generating categories sitemap: {e}")
        
    return urlset(xml_entries)

@router.get("/sitemap-hosts.xml")
async def get_hosts_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    base_url = get_base_url()
    xml_entries = []
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    try:
        # Fetch hosts with projection to optimize memory
        hosts = await db.users.find(
            {"role": "host"},
            {"user_id": 1, "full_name": 1}
        ).to_list(length=10000)
        for host in hosts:
            host_id = host.get("user_id")
            full_name = host.get("full_name", "")
            slug = slugify(full_name) or "host"
            loc = f"{base_url}/host/{host_id}-{slug}"
            xml_entries.append(f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{now_str}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>""")
    except Exception as e:
        logger.error(f"Error generating hosts sitemap: {e}")
        
    xml_body = "\n".join(xml_entries)
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{xml_body}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

@router.get("/robots.txt")
async def get_robots_txt():
    base_url = get_base_url()
    robots_content = f"""User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /api/
Disallow: /auth/
Disallow: /internal/
Disallow: /private/
Disallow: /temp/

Sitemap: {base_url}/sitemap.xml
"""
    return Response(content=robots_content, media_type="text/plain")

@router.get("/llms.txt")
async def get_llms_txt():
    import os
    from pathlib import Path
    
    current_dir = Path(__file__).parent.parent
    llms_path = current_dir / "static" / "llms.txt"
    
    if llms_path.exists():
        with open(llms_path, "r", encoding="utf-8") as f:
            content = f.read()
        return Response(content=content, media_type="text/plain")
        
    return Response(content="llms.txt file not found.", status_code=404, media_type="text/plain")
