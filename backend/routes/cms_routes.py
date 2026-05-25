from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.cms import CMSContent, CMSUpdate, HeroSection
from middleware.auth_middleware import get_current_user
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cms", tags=["CMS"])

async def get_db():
    from server import db_instance
    return db_instance

async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user is admin."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Helper to seed landing page CMS content if it doesn't exist
async def _ensure_seeded_landing_content(db: AsyncIOMotorDatabase):
    cursor = db.cms_content.find({"page": "landing"})
    content = await cursor.to_list(length=100)
    if not content:
        now = datetime.now(timezone.utc)
        default_content = [
            {
                "content_id": "cms_hero_default",
                "page": "landing",
                "section": "hero",
                "content_type": "text",
                "content_data": {
                    "sub_tag": "Short-Term Rentals · India",
                    "title": "Elevated <br /> <span class=\"text-terracotta italic font-serif\">Living</span> & <span class=\"text-sage font-serif italic\">Working</span> Spaces.",
                    "subtitle": "Curated residential, commercial, and event venues designed for those who value aesthetics and seamless experiences.",
                    "image_url": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
                    "rating": "4.9/5 Average",
                    "trusted_text": "Trusted by 10k+ guests across Maharashtra & Bangalore."
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_how_it_works_default",
                "page": "landing",
                "section": "how_it_works",
                "content_type": "list",
                "content_data": {
                    "steps": [
                        {
                            "id": 1,
                            "icon_name": "User",
                            "shortTitle": "Registration",
                            "heading": "Host Registration & ID Verification",
                            "subtitle": "Establish absolute safety and trust",
                            "paragraph": "Every host profile is verified through secured credentials to maintain guest safety. The verification process is completely automated and takes less than 5 minutes.",
                            "bullets": [
                                "Government KYC & Aadhaar ID verification support.",
                                "Real-time SMS & WhatsApp onboarding confirmations.",
                                "Seamless account switching between Guest and Host mode in one click."
                            ]
                        },
                        {
                            "id": 2,
                            "icon_name": "CreditCard",
                            "shortTitle": "Subscription",
                            "heading": "Flexible Subscription Tiers",
                            "subtitle": "Designed to scale with your renting portfolio",
                            "paragraph": "Select a subscription plan that fits your business model. Each plan starts with an extensive 3-Month Free Trial. Host registration fee is ₹500 (fully refundable during trial evaluation).",
                            "bullets": [
                                "Standard Plan: Perfect for single property hosts (basic statistics and ticketer support).",
                                "Growth Plan: Best for multiple properties (adds priorities and WhatsApp notifications).",
                                "Elite Plan: Dedicated Relationship Manager (RM), featured ranking, and custom contracts."
                            ]
                        },
                        {
                            "id": 3,
                            "icon_name": "Building2",
                            "shortTitle": "Listing Builder",
                            "heading": "Dynamic Property Creator",
                            "subtitle": "Showcase every rich highlight of your space",
                            "paragraph": "Input comprehensive amenities, check-in instructions, custom rules, daily or hourly renting cycles, and upload high-resolution images of your listing.",
                            "bullets": [
                                "Raw Image Uploads with instant drag-and-drop thumbnail previews.",
                                "Dynamic Daily / Hourly pricing configurations based on regional demand.",
                                "Precise Leaflet map geo-location parameter pinning."
                            ]
                        },
                        {
                            "id": 4,
                            "icon_name": "MapPin",
                            "shortTitle": "Audit Visit",
                            "heading": "On-Site Verification Audit",
                            "subtitle": "Mandatory geographical and quality mapping",
                            "paragraph": "To maintain absolute physical validation and trust in the STR market, a Relationship Manager (RM) physically visits the site to audit exact coordinates and quality checks.",
                            "bullets": [
                                "Real-time GPS coordinate logging and leaf mapping to prevent ghost listings.",
                                "Official physical standards audit checklist validation.",
                                "Secure green trust badge activation on successful audit."
                            ]
                        },
                        {
                            "id": 5,
                            "icon_name": "Sparkles",
                            "shortTitle": "Live Earnings",
                            "heading": "Live Operations & Secured Payouts",
                            "subtitle": "Accept guest stays and withdraw seamlessly",
                            "paragraph": "Your property enters our verified discover index instantly. Take advantage of dynamic checkouts with Razorpay secure signature double locks.",
                            "bullets": [
                                "Secure UPI / Card checkouts with instant calendar blocking.",
                                "10-minute calendar lock protects against concurrent bookings.",
                                "Automated bank payouts with professional tax-compliant invoice logs."
                            ]
                        }
                    ]
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_testimonials_default",
                "page": "landing",
                "section": "testimonials",
                "content_type": "list",
                "content_data": {
                    "items": [
                        {
                            "id": "t1",
                            "name": "Ananya Sen",
                            "role": "Consultant & Remote Worker",
                            "rating": 5,
                            "comment": "Golden-X-Host spaces are absolutely stunning. The Wi-Fi is blazing fast and the locations are perfect for work-cations.",
                            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                        },
                        {
                            "id": "t2",
                            "name": "Rohan Deshmukh",
                            "role": "Property Host",
                            "rating": 5,
                            "comment": "Listing my commercial space was incredibly smooth. The automated payout verification is rock solid.",
                            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                        },
                        {
                            "id": "t3",
                            "name": "Priya Nair",
                            "role": "Event Organizer",
                            "rating": 5,
                            "comment": "Booked an event venue for our product launch. The geo-coordinates and Leaflet mapping made it easy for everyone to find.",
                            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                        }
                    ]
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_blog_default",
                "page": "landing",
                "section": "blog",
                "content_type": "list",
                "content_data": {
                    "posts": [
                        {
                            "id": "p1",
                            "title": "Unlocking Passive Income: Why Short-Term Rentals Are Booming",
                            "excerpt": "With the rise of remote work and hybrid business models, hosts are earning 3x more through flexible renting cycles compared to long-term leases.",
                            "image_url": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600",
                            "author": "STR Insights Desk",
                            "date": "May 15, 2026",
                            "read_time": "5 min read"
                        },
                        {
                            "id": "p2",
                            "title": "Designing a Five-Star Workspace in Your Rental Property",
                            "excerpt": "Aesthetics matter. Learn how incorporating warm sand colors, ergonomic setups, and premium lighting can justify a higher daily price point.",
                            "image_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600",
                            "author": "Design & Curation Team",
                            "date": "May 18, 2026",
                            "read_time": "7 min read"
                        }
                    ]
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }
        ]
        for item in default_content:
            await db.cms_content.insert_one(item)
    return content

# ========== PUBLIC CMS ENDPOINTS ==========

@router.get("/landing-page")
async def get_landing_page_content(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all active landing page content (public)."""
    try:
        await _ensure_seeded_landing_content(db)
        
        cursor = db.cms_content.find(
            {"page": "landing", "is_active": True},
            {"_id": 0}
        )
        content = await cursor.to_list(length=100)
        
        # Organize by section
        organized_content = {}
        for item in content:
            section = item["section"]
            organized_content[section] = item["content_data"]
        
        return organized_content
    
    except Exception as e:
        logger.error(f"Error fetching landing page content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch landing page content"
        )

# ========== ADMIN CMS ENDPOINTS ==========

@router.get("/admin/content")
async def get_all_cms_content(
    page: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all CMS content (admin)."""
    try:
        if page == "landing":
            await _ensure_seeded_landing_content(db)
            
        query = {}
        if page:
            query["page"] = page
        
        cursor = db.cms_content.find(query, {"_id": 0})
        content = await cursor.to_list(length=200)
        
        return {
            "content": content,
            "total": len(content)
        }
    
    except Exception as e:
        logger.error(f"Error fetching CMS content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch CMS content"
        )

@router.post("/admin/content")
async def create_cms_content(
    page: str,
    section: str,
    content_type: str,
    content_data: dict,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new CMS content."""
    try:
        content_id = f"cms_{int(datetime.now(timezone.utc).timestamp())}"
        
        cms_content = {
            "content_id": content_id,
            "page": page,
            "section": section,
            "content_type": content_type,
            "content_data": content_data,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.cms_content.insert_one(cms_content)
        
        logger.info(f"CMS content created: {content_id}")
        return {"message": "CMS content created successfully", "content_id": content_id}
    
    except Exception as e:
        logger.error(f"Error creating CMS content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create CMS content"
        )

@router.patch("/admin/content/{content_id}")
async def update_cms_content(
    content_id: str,
    update_data: CMSUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update CMS content."""
    try:
        update_fields = {"updated_at": datetime.now(timezone.utc)}
        
        if update_data.content_data:
            update_fields["content_data"] = update_data.content_data
        
        if update_data.is_active is not None:
            update_fields["is_active"] = update_data.is_active
        
        result = await db.cms_content.update_one(
            {"content_id": content_id},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CMS content not found"
            )
        
        logger.info(f"CMS content updated: {content_id}")
        return {"message": "CMS content updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating CMS content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update CMS content"
        )

@router.delete("/admin/content/{content_id}")
async def delete_cms_content(
    content_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete CMS content."""
    try:
        result = await db.cms_content.delete_one({"content_id": content_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CMS content not found"
            )
        
        logger.info(f"CMS content deleted: {content_id}")
        return {"message": "CMS content deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting CMS content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete CMS content"
        )

# ========== FEATURED PROPERTIES MANAGEMENT ==========

@router.get("/admin/featured-properties")
async def get_featured_properties(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get featured properties list."""
    try:
        cms_doc = await db.cms_content.find_one(
            {"page": "landing", "section": "featured_properties"},
            {"_id": 0}
        )
        
        if not cms_doc:
            return {"property_ids": []}
        
        return cms_doc.get("content_data", {"property_ids": []})
    
    except Exception as e:
        logger.error(f"Error fetching featured properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch featured properties"
        )

@router.post("/admin/featured-properties")
async def set_featured_properties(
    property_ids: List[str],
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Set featured properties for landing page."""
    try:
        # Check if exists
        existing = await db.cms_content.find_one(
            {"page": "landing", "section": "featured_properties"}
        )
        
        if existing:
            # Update
            await db.cms_content.update_one(
                {"page": "landing", "section": "featured_properties"},
                {"$set": {
                    "content_data": {"property_ids": property_ids},
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        else:
            # Create
            await db.cms_content.insert_one({
                "content_id": f"cms_{int(datetime.now(timezone.utc).timestamp())}",
                "page": "landing",
                "section": "featured_properties",
                "content_type": "list",
                "content_data": {"property_ids": property_ids},
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
        
        logger.info(f"Featured properties updated: {len(property_ids)} properties")
        return {"message": "Featured properties updated successfully"}
    
    except Exception as e:
        logger.error(f"Error setting featured properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set featured properties"
        )
