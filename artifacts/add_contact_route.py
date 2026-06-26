import os
import sys

fn = r'd:\FinalSTR\Goldenrich-STR\backend\routes\cms_routes.py'
if not os.path.exists(fn):
    print("Error: cms_routes.py not found")
    sys.exit(1)

content = open(fn, 'r', encoding='utf-8').read()

# 1. Imports check
import_block = """from pydantic import BaseModel, EmailStr, Field"""
if "from pydantic import BaseModel" not in content:
    content = "from pydantic import BaseModel, EmailStr, Field\n" + content

# 2. Support message route
support_message_route = """

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
    \"\"\"Submit a support/contact message (public).\"\"\"
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

"""

# Append right before the admin endpoints
content = content.replace("# ========== ADMIN CMS ENDPOINTS ==========", support_message_route + "# ========== ADMIN CMS ENDPOINTS ==========")

open(fn, 'w', encoding='utf-8').write(content)
print("Successfully added /contact route to cms_routes.py backend file.")
