import re
import logging
from datetime import datetime, timezone
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

@router.get("/sitemap.xml")
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
    base_url = get_base_url()
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # List of static URLs as requested
    static_urls = [
        {"path": "", "priority": "1.0", "changefreq": "daily"},
        {"path": "/about", "priority": "0.7", "changefreq": "monthly"},
        {"path": "/contact", "priority": "0.7", "changefreq": "monthly"},
        {"path": "/privacy-policy", "priority": "0.5", "changefreq": "monthly"},
        {"path": "/terms-and-conditions", "priority": "0.5", "changefreq": "monthly"},
        {"path": "/help", "priority": "0.6", "changefreq": "monthly"},
        {"path": "/faqs", "priority": "0.7", "changefreq": "weekly"},
        {"path": "/host", "priority": "0.8", "changefreq": "weekly"},
        {"path": "/become-host", "priority": "0.8", "changefreq": "weekly"},
        {"path": "/login", "priority": "0.5", "changefreq": "monthly"},
        {"path": "/register", "priority": "0.5", "changefreq": "monthly"}
    ]
    
    xml_entries = []
    for item in static_urls:
        loc = f"{base_url}{item['path']}"
        xml_entries.append(f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{now_str}</lastmod>
    <changefreq>{item['changefreq']}</changefreq>
    <priority>{item['priority']}</priority>
  </url>""")
        
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"\n".join(xml_entries)}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

@router.get("/sitemap-properties.xml")
async def get_properties_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    base_url = get_base_url()
    xml_entries = []
    
    try:
        # Fetch active (live) properties
        properties = await db.properties.find({"status": "live"}).to_list(length=100000)
        
        for prop in properties:
            prop_id = prop.get("property_id")
            title = prop.get("title", "")
            slug = slugify(title)
            
            # Since React router routes to /property/:id, the canonical URL must map correctly
            # We provide /property/{property_id} as the primary route, but support slug format
            loc = f"{base_url}/property/{prop_id}"
            
            # Extract updated_at timestamp or fallback to today
            updated_at = prop.get("updated_at")
            if hasattr(updated_at, "strftime"):
                lastmod = updated_at.strftime("%Y-%m-%d")
            elif isinstance(updated_at, str):
                lastmod = updated_at[:10]
            else:
                lastmod = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                
            xml_entries.append(f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>""")
    except Exception as e:
        logger.error(f"Error generating properties sitemap: {e}")
        
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"\n".join(xml_entries)}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

@router.get("/sitemap-blogs.xml")
async def get_blogs_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    base_url = get_base_url()
    xml_entries = []
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    try:
        # Fetch blog content from cms_content table
        blog_doc = await db.cms_content.find_one({"page": "landing", "section": "blog"})
        if blog_doc:
            posts = blog_doc.get("content_data", {}).get("posts", [])
            for post in posts:
                post_id = post.get("id")
                # Construct blog dynamic path
                loc = f"{base_url}/blog/{post_id}"
                xml_entries.append(f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{now_str}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")
    except Exception as e:
        logger.error(f"Error generating blogs sitemap: {e}")
        
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"\n".join(xml_entries)}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

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
                loc = f"{base_url}/city/{slugify(city)}"
                xml_entries.append(f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{now_str}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>""")
    except Exception as e:
        logger.error(f"Error generating cities sitemap: {e}")
        
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"\n".join(xml_entries)}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

@router.get("/sitemap-categories.xml")
async def get_categories_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    base_url = get_base_url()
    xml_entries = []
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    try:
        # Fetch distinct categories from properties
        categories = await db.properties.distinct("category", {"status": "live"})
        # We can also add default category terms if empty
        if not categories:
            categories = ["residential", "commercial", "event_venue"]
            
        for category in categories:
            if category:
                loc = f"{base_url}/{slugify(category)}"
                xml_entries.append(f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{now_str}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""")
    except Exception as e:
        logger.error(f"Error generating categories sitemap: {e}")
        
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"\n".join(xml_entries)}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

@router.get("/sitemap-hosts.xml")
async def get_hosts_sitemap(db: AsyncIOMotorDatabase = Depends(get_db)):
    base_url = get_base_url()
    xml_entries = []
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    try:
        # Fetch hosts
        hosts = await db.users.find({"role": "host"}).to_list(length=10000)
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
        
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"\n".join(xml_entries)}
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
