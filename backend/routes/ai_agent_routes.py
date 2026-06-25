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

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []

@router.post("/chat")
async def chat_with_ai(payload: ChatRequest):
    """Chat with MAYUR AI Assistant powered by Google Gemini (public endpoint)."""
    try:
        import os
        import json
        import urllib.request
        import asyncio
        from dotenv import load_dotenv
        from pathlib import Path

        # Explicitly reload .env to ensure the latest key is read
        env_path = Path(__file__).resolve().parent.parent / '.env'
        load_dotenv(env_path, override=True)

        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            # Fallback if no key is configured
            return {
                "response": "Namaste! I am currently running in offline mode. For support, please contact us at +91 8484826247 or email support@x-space360.com."
            }

        # Build contents with system instruction + history + current message
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
                    contents.append({
                        "role": role,
                        "parts": [{"text": text}]
                    })
        
        # Append current user message
        contents.append({
            "role": "user",
            "parts": [{"text": payload.message}]
        })

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={gemini_key}"
        
        # We pass the systemInstruction as part of the config in the Gemini 1.5 API
        request_body = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048
            }
        }

        headers = {"Content-Type": "application/json"}

        def perform_request():
            req = urllib.request.Request(
                url,
                data=json.dumps(request_body).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12.0) as response:
                return json.loads(response.read().decode("utf-8"))

        result = await asyncio.to_thread(perform_request)
        
        try:
            bot_response = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            return {"response": bot_response}
        except (KeyError, IndexError) as parse_err:
            logger.error(f"Failed to parse Gemini response: {result}. Error: {parse_err}")
            return {"response": "Sorry, I am having trouble processing that right now. Please try again."}

    except Exception as e:
        logger.error(f"Error in chat_with_ai: {e}")
        return {"response": "I'm experiencing connectivity issues. Please contact our support helpline +91 8484826247."}

