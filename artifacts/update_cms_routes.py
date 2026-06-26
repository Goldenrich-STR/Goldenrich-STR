import os
import sys

fn = r'd:\FinalSTR\Goldenrich-STR\backend\routes\cms_routes.py'
if not os.path.exists(fn):
    print("Error: cms_routes.py not found")
    sys.exit(1)

content = open(fn, 'r', encoding='utf-8').read()

# 1. Seeding function for Support Page
seeded_support_func = """async def _ensure_seeded_support_content(db: AsyncIOMotorDatabase):
    cursor = db.cms_content.find({"page": "support"})
    content = await cursor.to_list(length=100)
    if not content:
        now = datetime.now(timezone.utc)
        default_content = [
            {
                "content_id": "cms_support_content_default",
                "page": "support",
                "section": "content",
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

"""

# Insert seeded_support_func before PUBLIC CMS ENDPOINTS
content = content.replace("# ========== PUBLIC CMS ENDPOINTS ==========", seeded_support_func + "# ========== PUBLIC CMS ENDPOINTS ==========")

# 2. Public route to get support page content
public_support_route = """@router.get("/support-page")
async def get_support_page_content(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    \"\"\"Get support page content (public).\"\"\"
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

"""

# Insert public_support_route before ADMIN CMS ENDPOINTS
content = content.replace("# ========== ADMIN CMS ENDPOINTS ==========", public_support_route + "# ========== ADMIN CMS ENDPOINTS ==========")

# 3. Add to admin get content route
target_admin_get = """        if page == "landing":
            await _ensure_seeded_landing_content(db)"""

replacement_admin_get = """        if page == "landing":
            await _ensure_seeded_landing_content(db)
        elif page == "support":
            await _ensure_seeded_support_content(db)"""

content = content.replace(target_admin_get, replacement_admin_get)

open(fn, 'w', encoding='utf-8').write(content)
print("Successfully updated cms_routes.py backend file.")
