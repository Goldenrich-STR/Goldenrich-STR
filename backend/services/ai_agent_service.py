import logging
from datetime import datetime, timezone
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class AIAgentService:
    """Service to handle AI voice calling agent simulations."""

    @staticmethod
    async def trigger_ai_booking_call(db: AsyncIOMotorDatabase, booking: dict) -> dict:
        """Trigger an AI voice agent call to the guest and host for confirmation.
        
        Args:
            db: Database instance.
            booking: The booking dictionary.
        """
        try:
            booking_id = booking.get("booking_id")
            host_id = booking.get("host_id")
            guest_id = booking.get("guest_id")
            property_id = booking.get("property_id")

            # Fetch users and property details
            guest = await db.users.find_one({"user_id": guest_id}, {"_id": 0})
            host = await db.users.find_one({"user_id": host_id}, {"_id": 0})
            prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})

            guest_name = guest.get("full_name", "Valued Guest") if guest else "Valued Guest"
            guest_phone = guest.get("phone", "") if guest else ""
            host_name = host.get("full_name", "Host") if host else "Host"
            host_phone = host.get("phone", "") if host else ""
            property_title = prop.get("title", "your reserved property") if prop else "your reserved property"

            check_in = booking.get("check_in_date")
            check_out = booking.get("check_out_date")
            payout = (booking.get("base_amount", 0) or 0) - (booking.get("service_fee", 0) or 0)

            # Fetch active AI agent configuration
            active_agent = await db.ai_agents.find_one({"is_active": True})
            agent_name = "Mayur Voice AI"
            language = "English"
            greeting = "Namaste"
            voice_type = "Male"
            external_voice_name = None
            
            if active_agent:
                agent_name = active_agent.get("agent_name", "Mayur Voice AI")
                language = active_agent.get("language", "English")
                greeting = active_agent.get("greeting_message", "Namaste")
                voice_type = active_agent.get("voice_type", "Male")
                external_voice_name = active_agent.get("external_voice_name")

            call_logs = []
 
            # 1. Guest Call Script
            if guest_phone:
                if language == "Hindi":
                    guest_script = (
                        f"{greeting}, {guest_name}! Main X-Space360 AI Concierge bol raha hoon. "
                        f"Aapki reservation {property_title} ke liye confirm ho gayi hai. "
                        f"Aapka booking ID {booking_id} hai. Check-in {check_in} ko hai aur check-out {check_out} ko hai. "
                        f"Aapke host, {host_name}, property taiyar kar rahe hain. Aap unse {host_phone} par sampark kar sakte hain. "
                        f"Aapka stay comfortable aur luxury ho, hum yahi kamna karte hain. Dhanyawad!"
                    )
                elif language == "Marathi":
                    guest_script = (
                        f"{greeting}, {guest_name}! Me X-Space360 AI Concierge bolat aahe. "
                        f"Tumche reservation {property_title} sathi confirm jhali aahe. "
                        f"Tumcha booking ID {booking_id} aahe. Tumche check-in {check_in} la aahe ani check-out {check_out} la aahe. "
                        f"Host {host_name} tumchyasathi property tayar karat aahet. Tumhi tyancyashi {host_phone} var sampark karu shakata. "
                        f"Tumcha stay anandदायी ani luxury aso. Dhanyawad!"
                    )
                else:  # Default to English
                    guest_script = (
                        f"{greeting}, {guest_name}! This is the X-Space360 AI Concierge calling to confirm "
                        f"your reservation for {property_title}. Your booking ID is {booking_id}. "
                        f"Your check-in is scheduled for {check_in} and check-out is on {check_out}. "
                        f"Your host, {host_name}, is preparing the property for you. You can contact them at {host_phone}. "
                        f"We hope you have a comfortable and luxury stay. Thank you for choosing us!"
                    )
                
                guest_call = {
                    "call_id": f"call_g_{uuid4().hex[:12].upper()}",
                    "booking_id": booking_id,
                    "user_id": guest_id,
                    "phone": guest_phone,
                    "recipient_name": guest_name,
                    "role": "guest",
                    "agent_name": agent_name,
                    "voice_type": voice_type,
                    "external_voice_name": external_voice_name,
                    "status": "completed",
                    "duration_seconds": 42,
                    "script": guest_script,
                    "created_at": datetime.now(timezone.utc)
                }
                await db.ai_calls.insert_one(guest_call)
                call_logs.append(guest_call)
                logger.info(f"AI voice call logged for guest {guest_id} (Booking {booking_id})")
 
            # 2. Host Call Script
            if host_phone:
                if language == "Hindi":
                    host_script = (
                        f"{greeting}, {host_name}! Main X-Space360 AI Agent bol raha hoon. "
                        f"Aapko {guest_name} se {property_title} ke liye naya confirmed booking mila hai. "
                        f"Stay {check_in} se {check_out} tak hai. Platform fee ke baad aapka estimated payout "
                        f"₹{payout:,.2f} hoga. Kripya apna dashboard check karein aur property taiyar rakhein. Dhanyawad!"
                    )
                elif language == "Marathi":
                    host_script = (
                        f"{greeting}, {host_name}! Me X-Space360 AI Agent bolat aahe. "
                        f"Tumhala {guest_name} kadun {property_title} sathi navin confirmed booking milaali aahe. "
                        f"Stay {check_in} te {check_out} paryant aahe. Platform fee nantar tumcha estimated payout "
                        f"₹{payout:,.2f} asel. Kripya tumche dashboard check kara ani property tayar theva. Dhanyawad!"
                    )
                else:  # Default to English
                    host_script = (
                        f"{greeting}, {host_name}! This is the X-Space360 AI Agent calling to inform you "
                        f"that you have received a new confirmed booking from {guest_name} for {property_title}. "
                        f"The stay is booked from {check_in} to {check_out}. Your estimated payout after platform fees "
                        f"will be ₹{payout:,.2f}. Please review the booking in your dashboard and ensure that "
                        f"the property is ready to receive your guests. Thank you for listing with us!"
                    )
                
                host_call = {
                    "call_id": f"call_h_{uuid4().hex[:12].upper()}",
                    "booking_id": booking_id,
                    "user_id": host_id,
                    "phone": host_phone,
                    "recipient_name": host_name,
                    "role": "host",
                    "agent_name": agent_name,
                    "voice_type": voice_type,
                    "external_voice_name": external_voice_name,
                    "status": "completed",
                    "duration_seconds": 48,
                    "script": host_script,
                    "created_at": datetime.now(timezone.utc)
                }
                await db.ai_calls.insert_one(host_call)
                call_logs.append(host_call)
                logger.info(f"AI voice call logged for host {host_id} (Booking {booking_id})")

            return {"success": True, "calls": call_logs}
        except Exception as e:
            logger.error(f"Error triggering AI booking call: {e}")
            return {"success": False, "error": str(e)}
