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

# ========== PUBLIC CMS ENDPOINTS ==========

@router.get("/landing-page")
async def get_landing_page_content(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all active landing page content (public)."""
    try:
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
