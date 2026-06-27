from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException, status, Depends, Response
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
                    "items": []
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
                    "posts": []
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_footer_default",
                "page": "landing",
                "section": "footer",
                "content_type": "object",
                "content_data": {
                    "brand_description": "Redefining short-term rentals in India through curation, technology, and superior service.",
                    "location": "Nashik, Maharashtra",
                    "email": "support@x-space360.com",
                    "phone": "+91 8484826247",
                    "guests_title": "For Guests",
                    "guest_link_1_label": "Browse Collections",
                    "guest_link_1_url": "/guest/browse",
                    "guest_link_2_label": "FAQs",
                    "faq_title": "Frequently Asked Questions",
                    "faq_items": [
                        {"question": "How do I book a property?", "answer": "Browse collections, choose your dates, and submit a booking request from the property page."},
                        {"question": "How do hosts list a space?", "answer": "Hosts can sign in and use List Your Space to submit property details and documents for verification."},
                        {"question": "Who do I contact for support?", "answer": "Use the contact and grievance details in the footer for support or escalation."}
                    ],
                    "footer_sections": [
                        {"heading": "For Guests", "items": [
                            {"label": "Browse Collections", "action_type": "link", "link": "/guest/browse", "text": ""},
                            {"label": "FAQs", "action_type": "text", "link": "", "text": "Browse collections, choose your dates, and submit a booking request from the property page.\n\nHosts can sign in and use List Your Space to submit property details and documents for verification.\n\nFor support or escalation, use the contact details in the footer."}
                        ]},
                        {"heading": "For Hosts", "items": [
                            {"label": "List Your Space", "action_type": "link", "link": "/host/list-property", "text": ""},
                            {"label": "Hosting Standards", "action_type": "link", "link": "#how-it-works", "text": ""}
                        ]},
                        {"heading": "Contact", "items": [
                            {"label": "Nashik, Maharashtra", "action_type": "text", "link": "", "text": "X-Space360 support is available for guest and host assistance.\n\nEmail: support@x-space360.com\nPhone: +91 8484826247"},
                            {"label": "support@x-space360.com", "action_type": "text", "link": "", "text": "Email support@x-space360.com for help with bookings, listings, or account support."}
                        ]},
                        {"heading": "Grievance & Escalation", "resolution_text": "Resolution: 7 working days", "items": [
                            {"label": "Officer: Rahul Mundra", "action_type": "text", "link": "", "text": "Grievance Officer: Rahul Mundra\nEmail: nodal.officer@rupiyaloan.com\nPhone: +91 76206 66949\nResolution: 7 working days"},
                            {"label": "nodal.officer@rupiyaloan.com", "action_type": "text", "link": "", "text": "Email nodal.officer@rupiyaloan.com for grievance escalation.\nResolution: 7 working days."}
                        ]}
                    ],
                    "hosts_title": "For Hosts",
                    "host_link_1_label": "List Your Space",
                    "host_link_1_url": "/host/list-property",
                    "host_link_2_label": "Hosting Standards",
                    "host_link_2_url": "#how-it-works",
                    "contact_title": "Contact",
                    "grievance_title": "Grievance & Escalations",
                    "grievance_officer": "Rahul Mundra",
                    "grievance_email": "nodal.officer@rupiyaloan.com",
                    "grievance_phone": "+91 76206 66949",
                    "resolution_text": "Resolution: 7 working days",
                    "privacy_label": "Privacy Policy",
                    "privacy_text": "X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.",
                    "terms_label": "Terms & Conditions",
                    "terms_text": "By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.",
                    "checkin_label": "Check-in Instructions",
                    "checkin_text": "Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM."
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_offer_default",
                "page": "landing",
                "section": "offer",
                "content_type": "object",
                "content_data": {
                    "is_enabled": True,
                    "title": "Save 10% on a summertime trip",
                    "description": "Book within 7 days and save up to $100 on your next stay. Terms apply.",
                    "button_text": "Log in to claim offer",
                    "image_url": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600"
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }
        ]
        for item in default_content:
            await db.cms_content.insert_one(item)
    else:
        footer_doc = await db.cms_content.find_one(
            {"page": "landing", "section": "footer"}, {"_id": 0}
        )
        if not footer_doc:
            now = datetime.now(timezone.utc)
            await db.cms_content.insert_one({
                "content_id": "cms_footer_default",
                "page": "landing",
                "section": "footer",
                "content_type": "object",
                "content_data": {
                    "brand_description": "Redefining short-term rentals in India through curation, technology, and superior service.",
                    "location": "Nashik, Maharashtra",
                    "email": "support@x-space360.com",
                    "phone": "+91 8484826247",
                    "guests_title": "For Guests",
                    "guest_link_1_label": "Browse Collections",
                    "guest_link_1_url": "/guest/browse",
                    "guest_link_2_label": "FAQs",
                    "faq_title": "Frequently Asked Questions",
                    "faq_items": [
                        {"question": "How do I book a property?", "answer": "Browse collections, choose your dates, and submit a booking request from the property page."},
                        {"question": "How do hosts list a space?", "answer": "Hosts can sign in and use List Your Space to submit property details and documents for verification."},
                        {"question": "Who do I contact for support?", "answer": "Use the contact and grievance details in the footer for support or escalation."}
                    ],
                    "footer_sections": [
                        {"heading": "For Guests", "items": [
                            {"label": "Browse Collections", "action_type": "link", "link": "/guest/browse", "text": ""},
                            {"label": "FAQs", "action_type": "text", "link": "", "text": "Browse collections, choose your dates, and submit a booking request from the property page.\n\nHosts can sign in and use List Your Space to submit property details and documents for verification.\n\nFor support or escalation, use the contact details in the footer."}
                        ]},
                        {"heading": "For Hosts", "items": [
                            {"label": "List Your Space", "action_type": "link", "link": "/host/list-property", "text": ""},
                            {"label": "Hosting Standards", "action_type": "link", "link": "#how-it-works", "text": ""}
                        ]},
                        {"heading": "Contact", "items": [
                            {"label": "Nashik, Maharashtra", "action_type": "text", "link": "", "text": "X-Space360 support is available for guest and host assistance.\n\nEmail: support@x-space360.com\nPhone: +91 8484826247"},
                            {"label": "support@x-space360.com", "action_type": "text", "link": "", "text": "Email support@x-space360.com for help with bookings, listings, or account support."}
                        ]},
                        {"heading": "Grievance & Escalation", "resolution_text": "Resolution: 7 working days", "items": [
                            {"label": "Officer: Rahul Mundra", "action_type": "text", "link": "", "text": "Grievance Officer: Rahul Mundra\nEmail: nodal.officer@rupiyaloan.com\nPhone: +91 76206 66949\nResolution: 7 working days"},
                            {"label": "nodal.officer@rupiyaloan.com", "action_type": "text", "link": "", "text": "Email nodal.officer@rupiyaloan.com for grievance escalation.\nResolution: 7 working days."}
                        ]}
                    ],
                    "hosts_title": "For Hosts",
                    "host_link_1_label": "List Your Space",
                    "host_link_1_url": "/host/list-property",
                    "host_link_2_label": "Hosting Standards",
                    "host_link_2_url": "#how-it-works",
                    "contact_title": "Contact",
                    "grievance_title": "Grievance & Escalations",
                    "grievance_officer": "Rahul Mundra",
                    "grievance_email": "nodal.officer@rupiyaloan.com",
                    "grievance_phone": "+91 76206 66949",
                    "resolution_text": "Resolution: 7 working days",
                    "privacy_label": "Privacy Policy",
                    "privacy_text": "X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.",
                    "terms_label": "Terms & Conditions",
                    "terms_text": "By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.",
                    "checkin_label": "Check-in Instructions",
                    "checkin_text": "Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM."
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })
        
        offer_doc = await db.cms_content.find_one(
            {"page": "landing", "section": "offer"}, {"_id": 0}
        )
        if not offer_doc:
            now = datetime.now(timezone.utc)
            await db.cms_content.insert_one({
                "content_id": "cms_offer_default",
                "page": "landing",
                "section": "offer",
                "content_type": "object",
                "content_data": {
                    "is_enabled": True,
                    "title": "Save 10% on a summertime trip",
                    "description": "Book within 7 days and save up to $100 on your next stay. Terms apply.",
                    "button_text": "Log in to claim offer",
                    "image_url": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600"
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })
    return content

async def _ensure_seeded_support_content(db: AsyncIOMotorDatabase):
    cursor = db.cms_content.find({"page": "support"})
    content = await cursor.to_list(length=100)
    if not content:
        now = datetime.now(timezone.utc)
        default_content = [
            {
                "content_id": "cms_support_content_default",
                "page": "support",
                "section": "support_content",
                "content_type": "object",
                "content_data": {
                    "title": "How can we help you?",
                    "subtitle": "We're here to help and answer any question you might have.",
                    "search_placeholder": "Search for help articles...",
                    "assist_heading": "How can we assist you today?",
                    "cards": [
                        {
                            "id": "help_center",
                            "title": "Browse Help Center",
                            "description": "Find answers to common questions and guides.",
                            "button_text": "Explore Articles",
                            "action_value": "/faq"
                        },
                        {
                            "id": "live_chat",
                            "title": "Live Chat",
                            "description": "Chat with our support team in real time.",
                            "button_text": "Start Chat",
                            "action_value": "#"
                        },
                        {
                            "id": "email_support",
                            "title": "Email Support",
                            "description": "Send us an email and we'll get back to you.",
                            "button_text": "Send Email",
                            "action_value": "support@x-space360.com"
                        },
                        {
                            "id": "call_support",
                            "title": "Call Support",
                            "description": "Speak directly with our support team.",
                            "button_text": "+91 98765 43210",
                            "action_value": "+91 98765 43210"
                        }
                    ],
                    "popular_topics": [
                        {"label": "How to add a new property?", "link": "/faq#add-property"},
                        {"label": "How to manage leads?", "link": "/faq#manage-leads"},
                        {"label": "How to update documents?", "link": "/faq#update-docs"},
                        {"label": "Subscription & Billing", "link": "/faq#billing"},
                        {"label": "Account & Profile Settings", "link": "/faq#profile"}
                    ],
                    "support_hours": [
                        {"days": "Monday - Saturday", "hours": "9:00 AM - 7:00 PM"},
                        {"days": "Sunday", "hours": "10:00 AM - 4:00 PM"}
                    ],
                    "response_time": "We usually respond within 24 hours.",
                    "footer_title": "Still need help?",
                    "footer_subtitle": "Our support team is ready to assist you.",
                    "footer_button_text": "Start Live Chat"
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
    response: Response,
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
        
        # Set cache-control header for public landing page CMS content (5 minutes)
        response.headers["Cache-Control"] = "public, max-age=300"
        
        # Organize SEO metadata
        organized_content["seo"] = {
            "title": "X-Space360 | Premium Short-term Rentals & Event Venues in India",
            "description": "Discover and book premium villas, corporate offices, co-working spaces, and stunning event venues across India on X-Space360.",
            "keywords": "short term rentals, luxury villas, event venues, banquet halls, co-working spaces, offices",
            "canonical": "https://x-space360.in/",
            "image": "https://x-space360.in/favicon_rich.jpg",
            "robots": "index,follow"
        }

        return organized_content
    
    except Exception as e:
        logger.error(f"Error fetching landing page content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch landing page content"
        )

@router.get("/support-page")
async def get_support_page_content(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get support page content (public)."""
    try:
        await _ensure_seeded_support_content(db)
        
        cursor = db.cms_content.find(
            {"page": "support", "is_active": True},
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
        logger.error(f"Error fetching support page content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch support page content"
        )



class ContactMessage(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str = Field(..., min_length=10)
    subject: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)

@router.post("/contact")
async def submit_contact_message(
    payload: ContactMessage,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit a support/contact message (public)."""
    try:
        now = datetime.now(timezone.utc)
        message_doc = {
            "name": payload.name,
            "email": payload.email,
            "phone": payload.phone,
            "subject": payload.subject,
            "message": payload.message,
            "status": "pending",
            "created_at": now,
            "updated_at": now
        }
        await db.contact_messages.insert_one(message_doc)
        return {"success": True, "message": "Your message has been submitted successfully."}
    except Exception as e:
        logger.error(f"Error submitting contact message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit your message. Please try again."
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
        elif page == "support":
            await _ensure_seeded_support_content(db)
            
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
