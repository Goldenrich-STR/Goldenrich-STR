from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from middleware.auth_middleware import get_current_user
from models.ai_agent import AIAgent, AIAgentCreate
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai-calls", tags=["AI Calling Agent"])

async def get_db():
    from server import db_instance
    return db_instance

@router.get("/my-calls")
async def get_my_calls(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve AI call logs for the logged-in user."""
    try:
        user_id = current_user["user_id"]
        cursor = db.ai_calls.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1)
        calls = await cursor.to_list(length=100)
        return {"success": True, "calls": calls}
    except Exception as e:
        logger.error(f"Error fetching personal AI calls: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch AI call logs"
        )

@router.get("/all-calls")
async def get_all_calls(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve all AI call logs (Admin only)."""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin role required."
            )
        cursor = db.ai_calls.find({}, {"_id": 0}).sort("created_at", -1)
        calls = await cursor.to_list(length=100)
        return {"success": True, "calls": calls}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching all AI calls: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch AI call logs"
        )

@router.get("/agents")
async def list_agents(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all AI voice agents (Admin only)."""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin role required."
            )
        cursor = db.ai_agents.find({}, {"_id": 0}).sort("created_at", -1)
        agents = await cursor.to_list(length=100)
        return {"success": True, "agents": agents}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching AI agents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch AI agents"
        )

@router.post("/agents")
async def create_agent(
    payload: AIAgentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new AI voice calling agent (Admin only)."""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin role required."
            )
        
        # Check if agent with same name exists
        existing = await db.ai_agents.find_one({"agent_name": payload.agent_name})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An AI agent with this name already exists"
            )
        
        agent = AIAgent(
            agent_id=f"agent_{uuid.uuid4().hex[:12].upper()}",
            agent_name=payload.agent_name,
            voice_type=payload.voice_type,
            language=payload.language,
            greeting_message=payload.greeting_message,
            external_voice_name=payload.external_voice_name,
            is_active=False
        )
        
        agent_dict = agent.model_dump()
        # Convert created_at to string if it's datetime
        if isinstance(agent_dict.get("created_at"), datetime):
            agent_dict["created_at"] = agent_dict["created_at"].isoformat()
        else:
            agent_dict["created_at"] = datetime.now(timezone.utc).isoformat()
            
        await db.ai_agents.insert_one(agent_dict)
        
        # If this is the first agent, make it active
        total_agents = await db.ai_agents.count_documents({})
        if total_agents == 1:
            await db.ai_agents.update_one({"agent_id": agent.agent_id}, {"$set": {"is_active": True}})
            agent_dict["is_active"] = True
            
        logger.info(f"AI voice agent created: {agent.agent_id} by admin {current_user['user_id']}")
        return {"success": True, "agent": agent_dict}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating AI agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create AI agent"
        )

@router.patch("/agents/{agent_id}/active")
async def activate_agent(
    agent_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark an AI agent as active and deactivate all others (Admin only)."""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin role required."
            )
        
        # Verify agent exists
        agent = await db.ai_agents.find_one({"agent_id": agent_id})
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI Agent not found"
            )
        
        # Deactivate all agents
        await db.ai_agents.update_many({}, {"$set": {"is_active": False}})
        
        # Activate this agent
        await db.ai_agents.update_one({"agent_id": agent_id}, {"$set": {"is_active": True}})
        
        logger.info(f"AI agent {agent_id} set as active by admin {current_user['user_id']}")
        return {"success": True, "message": f"AI Agent '{agent['agent_name']}' is now active"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating AI agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate AI agent"
        )

@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete an AI agent (Admin only)."""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin role required."
            )
        
        # Verify agent exists
        agent = await db.ai_agents.find_one({"agent_id": agent_id})
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI Agent not found"
            )
        
        # Delete agent
        await db.ai_agents.delete_one({"agent_id": agent_id})
        
        # If the deleted agent was active, set the most recent agent as active
        if agent.get("is_active"):
            new_active = await db.ai_agents.find_one({}, sort=[("created_at", -1)])
            if new_active:
                await db.ai_agents.update_one({"agent_id": new_active["agent_id"]}, {"$set": {"is_active": True}})
        
        logger.info(f"AI agent {agent_id} deleted by admin {current_user['user_id']}")
        return {"success": True, "message": "AI Agent deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting AI agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete AI agent"
        )

from pydantic import BaseModel
from typing import List, Optional
import hashlib
import time

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []

# ── In-memory response cache (question_hash → {response, ts}) ──────────────
_RESPONSE_CACHE: dict = {}
_CACHE_TTL_SECONDS = 3600  # 1 hour

# ── FAQ knowledge base — answers common questions without hitting the API ──
_FAQ_ANSWERS = [
    (["list property", "add property", "list my property", "apli property kashi takaychi", "property kashi add karavi", "property kashi list karavi", "onboard host", "host kasa whayche", "host registration", "host kaisa bane", "property kaisa list kare", "list karna", "steps to list", "how to list", "apna ghar kaise", "ghar kaisa", "host banavayche"],
     "To list your property on X-Space360:\n1. Register as a Host\n2. Choose a subscription plan (Standard / Growth / Elite)\n3. Add your property details, photos & amenities\n4. Our Relationship Manager (RM) will visit for a physical verification audit\n5. Once approved, your property goes LIVE with a green trust badge ✅\n\nFor help call +91 8484826247 or email support@x-space360.com"),

    (["subscription", "plan", "price", "cost", "standard plan", "growth plan", "elite plan", "kitni fees", "registration fee", "500 rupee"],
     "X-Space360 Host Plans:\n\n📦 Standard — ₹500 refundable registration fee. Single listing.\n📈 Growth — Multiple properties, priority verification, WhatsApp alerts.\n⭐ Elite — Dedicated RM, 24/7 hotline, featured ranking.\n\nAll plans require a ₹500 refundable registration fee to get started."),

    (["cancel", "cancellation", "refund", "cancel booking", "paise wapas", "refund policy", "cancel karna"],
     "Cancellation & Refund Policy:\n• Cancel 7+ days before check-in → 100% refund\n• Cancel 48 hours to 7 days before → 50% refund\n• Cancel within 48 hours → No refund (strict policy)\n\nPayments are processed via Razorpay. Refunds take 5-7 business days."),

    (["book", "booking", "kaise book", "how to book", "property book", "reserve", "check-in", "checkout"],
     "To book a property:\n1. Search by location, dates & guests\n2. Choose a property and click 'Book Now'\n3. A 5-minute soft lock holds the property while you complete payment\n4. Pay securely via Razorpay (UPI, card, netbanking)\n5. You'll receive a booking confirmation instantly!\n\nNeed help? Call +91 8484826247"),

    (["verification", "rm", "relationship manager", "physical verification", "audit", "verify", "green badge", "trust badge"],
     "Physical Verification Process:\n• After listing your property, an X-Space360 Relationship Manager (RM) will visit in person\n• The RM verifies GPS coordinates, photos, amenities, safety & quality standards\n• Once approved, your property receives a green ✅ Trust Badge and goes LIVE\n• This ensures guests always get exactly what they see online"),

    (["contact", "support", "help", "helpline", "phone", "email", "office", "call", "sampark", "sahayata"],
     "X-Space360 Support:\n📞 Helpline: +91 8484826247\n📧 Email: support@x-space360.com\n🏢 Office: Nashik, Maharashtra\n\nOur team is available to help you with bookings, listings, verifications, and more!"),

    (["hello", "hi", "hey", "namaste", "namaskar", "helo", "good morning", "good evening", "kem cho"],
     "Namaste! Welcome to X-Space360 🏡\n\nI'm MAYUR, your AI assistant. I can help you with:\n• Finding & booking properties\n• Listing your property as a host\n• Subscription plans & pricing\n• Cancellation & refund policies\n• Physical verification process\n\nHow can I assist you today?"),
]

def _find_faq_answer(message: str) -> Optional[str]:
    """Return a cached FAQ answer if the message matches any known topic."""
    msg_lower = message.lower().strip()
    for keywords, answer in _FAQ_ANSWERS:
        for kw in keywords:
            if kw in msg_lower:
                return answer
    return None

def _cache_key(message: str, history: list) -> str:
    """Hash of message + last 2 history turns for cache key."""
    recent = str(history[-2:]) if history else ""
    raw = f"{message.strip().lower()}|{recent}"
    return hashlib.md5(raw.encode()).hexdigest()

def _get_cached(key: str) -> Optional[str]:
    entry = _RESPONSE_CACHE.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL_SECONDS:
        return entry["response"]
    return None

def _set_cached(key: str, response: str):
    _RESPONSE_CACHE[key] = {"response": response, "ts": time.time()}
    # Keep cache small — remove oldest if over 500 entries
    if len(_RESPONSE_CACHE) > 500:
        oldest = min(_RESPONSE_CACHE, key=lambda k: _RESPONSE_CACHE[k]["ts"])
        del _RESPONSE_CACHE[oldest]


@router.post("/chat")
async def chat_with_ai(payload: ChatRequest):
    """Chat with MAYUR AI Assistant powered by Google Gemini (public endpoint)."""
    import os
    import json
    import urllib.request
    import urllib.error
    import asyncio
    from dotenv import load_dotenv
    from pathlib import Path

    user_msg = payload.message.strip()

    # ── 1. Check FAQ offline answers first (no API needed) ──────────────────
    faq_answer = _find_faq_answer(user_msg)
    if faq_answer:
        return {"response": faq_answer}

    # ── 2. Check in-memory cache ─────────────────────────────────────────────
    ck = _cache_key(user_msg, payload.history or [])
    cached = _get_cached(ck)
    if cached:
        return {"response": cached}

    # ── 3. Load ALL available Gemini keys from .env (rotate on 429) ─────────
    env_path = Path(__file__).resolve().parent.parent / '.env'
    load_dotenv(env_path, override=True)

    # Support multiple keys: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3
    all_keys = []
    primary = os.environ.get("GEMINI_API_KEY", "").strip()
    if primary:
        all_keys.append(primary)
    for i in range(2, 6):
        extra = os.environ.get(f"GEMINI_API_KEY_{i}", "").strip()
        if extra:
            all_keys.append(extra)

    if not all_keys:
        return {"response": "Namaste! I am currently in offline mode. For support, please contact us at +91 8484826247 or email support@x-space360.com."}

    # ── 4. Build Gemini request payload ──────────────────────────────────────
    system_instruction = (
        "You are MAYUR, the friendly, professional, and knowledgeable AI assistant for X-Space360, "
        "a premium short-term rental (STR) platform in India. "
        "Your goal is to help users find luxury properties, explain booking/cancellation/refund policies, "
        "assist hosts in listing properties, and answer questions about physical verification, relationship managers, "
        "and host subscription plans.\n\n"
        "Here is the platform knowledge you must use:\n"
        "- Onboarding: Register Host account -> Select subscription -> List property -> Physical verification audit by Relationship Manager (RM) -> Go Live with verified green trust badge.\n"
        "- Plans: Standard (single listing, ₹500 refundable registration fee), Growth (multiple properties, priority verification, WhatsApp alerts), Elite (dedicated RM, 24/7 hotline, featured home ranking).\n"
        "- Booking & Refund: 5-minute soft lock during checkout. Payments handled via Razorpay. Refund: 100% refund up to 7 days before check-in, 50% up to 48 hours, strict/no-refund thereafter.\n"
        "- Physical Verification: RM physically audits every property's coordinates, amenities, safety, and quality checks.\n"
        "- Contact: Support helpline +91 8484826247, email support@x-space360.com, office in Nashik, Maharashtra.\n\n"
        "Be polite, helpful, and concise. Respond in the same language the user uses to chat (English, Hindi, Marathi, etc.)."
    )

    contents = []
    if payload.history:
        for turn in payload.history:
            role = turn.get("role")
            text = turn.get("text") or turn.get("message")
            if role in ["user", "model"] and text:
                contents.append({"role": role, "parts": [{"text": text}]})

    contents.append({"role": "user", "parts": [{"text": user_msg}]})

    request_body = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024}
    }

    # ── 5. Try each API key until one works ─────────────────────────────────
    last_error = None
    for api_key in all_keys:
        url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={api_key}"

        def perform_request(u=url):
            req = urllib.request.Request(
                u,
                data=json.dumps(request_body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=15.0) as response:
                    return json.loads(response.read().decode("utf-8")), None
            except urllib.error.HTTPError as http_err:
                err_body = http_err.read().decode("utf-8")
                logger.error(f"Gemini key attempt HTTP {http_err.code}: {err_body[:200]}")
                return None, http_err.code
            except Exception as ex:
                logger.error(f"Gemini request error: {ex}")
                return None, str(ex)

        result, err_code = await asyncio.to_thread(perform_request)

        if result is not None:
            # Success! Parse and cache the response.
            try:
                bot_response = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                _set_cached(ck, bot_response)
                return {"response": bot_response}
            except (KeyError, IndexError) as parse_err:
                logger.error(f"Failed to parse Gemini response: {result}. Error: {parse_err}")
                return {"response": "Sorry, I had trouble processing that. Please try again."}

        if err_code == 429:
            # This key is rate-limited — try the next key
            last_error = 429
            continue
        else:
            # Non-quota error (e.g., invalid key, network) — stop trying
            last_error = err_code
            break

    # ── 6. All keys exhausted / failed — return helpful fallback ────────────
    if last_error == 429:
        logger.warning("All Gemini API keys are quota-exhausted (429).")
        return {
            "response": (
                "I'm experiencing high demand right now and cannot process your request. "
                "For immediate help, please call our support helpline at +91 8484826247 "
                "or email support@x-space360.com. We'll respond within a few hours!"
            )
        }

    logger.error(f"All Gemini API keys failed. Last error: {last_error}")
    return {"response": "I'm experiencing connectivity issues. Please contact our support helpline +91 8484826247."}


