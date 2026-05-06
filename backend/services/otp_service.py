import redis
import secrets
import os
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class OTPService:
    """Service for managing OTP generation, storage, and verification."""
    
    def __init__(self):
        """Initialize Redis connection."""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using in-memory storage for OTP.")
            self.redis_client = None
            self.otp_storage = {}  # Fallback in-memory storage
        
        self.otp_expiry = int(os.getenv("OTP_EXPIRY_MINUTES", "5")) * 60
        self.max_attempts = int(os.getenv("MAX_OTP_ATTEMPTS", "5"))
    
    def _generate_otp(self, length: int = 6) -> str:
        """Generate a secure random OTP."""
        return "".join([str(secrets.randbelow(10)) for _ in range(length)])
    
    def _get_otp_key(self, identifier: str, purpose: str = "login") -> str:
        """Generate Redis key for OTP storage."""
        return f"otp:{purpose}:{identifier}"
    
    def _get_attempts_key(self, identifier: str, purpose: str = "login") -> str:
        """Generate Redis key for tracking verification attempts."""
        return f"otp:attempts:{purpose}:{identifier}"
    
    def generate_and_store_otp(self, identifier: str, purpose: str = "login") -> Dict:
        """Generate OTP and store it."""
        try:
            otp = self._generate_otp()
            otp_key = self._get_otp_key(identifier, purpose)
            attempts_key = self._get_attempts_key(identifier, purpose)
            
            if self.redis_client:
                self.redis_client.set(otp_key, otp, ex=self.otp_expiry)
                self.redis_client.delete(attempts_key)
            else:
                # In-memory fallback
                self.otp_storage[otp_key] = otp
                if attempts_key in self.otp_storage:
                    del self.otp_storage[attempts_key]
            
            logger.info(f"OTP generated for {identifier} (purpose: {purpose}): {otp}")
            return {
                "success": True,
                "otp": otp,
                "message": "OTP generated successfully",
                "expires_in": self.otp_expiry
            }
        except Exception as e:
            logger.error(f"Failed to generate OTP: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to generate OTP: {str(e)}"
            }
    
    def verify_otp(self, identifier: str, submitted_otp: str, purpose: str = "login") -> Dict:
        """Verify submitted OTP against stored value."""
        try:
            otp_key = self._get_otp_key(identifier, purpose)
            attempts_key = self._get_attempts_key(identifier, purpose)
            
            # Check attempt limit
            if self.redis_client:
                attempts = int(self.redis_client.get(attempts_key) or 0)
            else:
                attempts = int(self.otp_storage.get(attempts_key, 0))
            
            if attempts >= self.max_attempts:
                return {
                    "success": False,
                    "error": "Maximum verification attempts exceeded. Please request a new OTP.",
                    "locked": True
                }
            
            # Retrieve stored OTP
            if self.redis_client:
                stored_otp = self.redis_client.get(otp_key)
            else:
                stored_otp = self.otp_storage.get(otp_key)
            
            if not stored_otp:
                return {
                    "success": False,
                    "error": "OTP has expired or was not found. Please request a new OTP.",
                    "expired": True
                }
            
            # Compare OTPs
            if secrets.compare_digest(stored_otp, submitted_otp.strip()):
                # OTP verified successfully - delete it
                if self.redis_client:
                    self.redis_client.delete(otp_key)
                    self.redis_client.delete(attempts_key)
                else:
                    if otp_key in self.otp_storage:
                        del self.otp_storage[otp_key]
                    if attempts_key in self.otp_storage:
                        del self.otp_storage[attempts_key]
                
                logger.info(f"OTP verified successfully for {identifier}")
                return {
                    "success": True,
                    "message": "OTP verified successfully"
                }
            
            # Invalid OTP - increment attempt counter
            new_attempts = attempts + 1
            if self.redis_client:
                self.redis_client.set(attempts_key, new_attempts, ex=self.otp_expiry)
            else:
                self.otp_storage[attempts_key] = new_attempts
            
            remaining_attempts = self.max_attempts - new_attempts
            logger.warning(f"Invalid OTP attempt for {identifier}. Attempts remaining: {remaining_attempts}")
            
            return {
                "success": False,
                "error": "Invalid OTP. Please try again.",
                "attempts_remaining": remaining_attempts
            }
        
        except Exception as e:
            logger.error(f"Error verifying OTP: {str(e)}")
            return {
                "success": False,
                "error": f"Verification error: {str(e)}"
            }

otp_service = OTPService()