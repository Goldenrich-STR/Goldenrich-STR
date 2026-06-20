import redis
import secrets
import os
import time
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class OTPService:
    """Service for managing OTP generation, storage, and verification.

    Uses Redis when reachable; otherwise falls back to a process-local in-memory
    store with the same TTL semantics. Ensures the service never blocks auth
    because Redis is not provisioned in demo/dev environments.
    """

    def __init__(self):
        """Initialize Redis connection — fall back to in-memory on any failure."""
        self.otp_expiry = int(os.getenv("OTP_EXPIRY_MINUTES", "5")) * 60
        self.max_attempts = int(os.getenv("MAX_OTP_ATTEMPTS", "5"))
        self.otp_storage: Dict[str, tuple] = {}  # key -> (value, expires_at_epoch)
        self.redis_client = None

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
            client.ping()  # force a real connection attempt
            self.redis_client = client
            logger.info("OTPService: using Redis at %s", redis_url)
        except Exception as e:
            logger.warning(
                "OTPService: Redis unavailable (%s) — falling back to in-memory storage.",
                e,
            )
            self.redis_client = None

    def _generate_otp(self, length: int = 6) -> str:
        """Generate a secure random OTP."""
        return "".join([str(secrets.randbelow(10)) for _ in range(length)])

    def _get_otp_key(self, identifier: str, purpose: str = "login") -> str:
        return f"otp:{purpose}:{identifier}"

    def _get_attempts_key(self, identifier: str, purpose: str = "login") -> str:
        return f"otp:attempts:{purpose}:{identifier}"

    # -------- in-memory helpers (TTL-aware) --------

    def _mem_set(self, key: str, value: str, ttl_seconds: int) -> None:
        self.otp_storage[key] = (str(value), time.time() + ttl_seconds)

    def _mem_get(self, key: str) -> Optional[str]:
        val = self.otp_storage.get(key)
        if not val:
            return None
        value, expires_at = val
        if time.time() >= expires_at:
            self.otp_storage.pop(key, None)
            return None
        return value

    def _mem_delete(self, key: str) -> None:
        self.otp_storage.pop(key, None)

    # -------- public API --------

    def generate_and_store_otp(self, identifier: str, purpose: str = "login") -> Dict:
        """Generate OTP and store it."""
        try:
            otp = self._generate_otp()
            otp_key = self._get_otp_key(identifier, purpose)
            attempts_key = self._get_attempts_key(identifier, purpose)

            if self.redis_client:
                try:
                    self.redis_client.set(otp_key, otp, ex=self.otp_expiry)
                    self.redis_client.delete(attempts_key)
                except Exception as redis_err:
                    # Redis went away mid-flight — downgrade to in-memory for this call
                    logger.warning("Redis write failed (%s), using in-memory fallback.", redis_err)
                    self.redis_client = None
                    self._mem_set(otp_key, otp, self.otp_expiry)
                    self._mem_delete(attempts_key)
            else:
                self._mem_set(otp_key, otp, self.otp_expiry)
                self._mem_delete(attempts_key)

            logger.info(f"OTP generated for {identifier} (purpose: {purpose}): {otp}")
            return {
                "success": True,
                "otp": otp,
                "message": "OTP generated successfully",
                "expires_in": self.otp_expiry,
            }
        except Exception as e:
            logger.exception("Failed to generate OTP")
            return {
                "success": False,
                "error": f"Failed to generate OTP: {str(e)}",
            }

    def verify_otp(self, identifier: str, submitted_otp: str, purpose: str = "login") -> Dict:
        """Verify submitted OTP against stored value."""
        try:
            otp_key = self._get_otp_key(identifier, purpose)
            attempts_key = self._get_attempts_key(identifier, purpose)

            # Read attempts
            if self.redis_client:
                try:
                    attempts = int(self.redis_client.get(attempts_key) or 0)
                except Exception as e:
                    logger.warning("Redis read failed (%s), switching to in-memory.", e)
                    self.redis_client = None
                    attempts = int(self._mem_get(attempts_key) or 0)
            else:
                attempts = int(self._mem_get(attempts_key) or 0)

            if attempts >= self.max_attempts:
                return {
                    "success": False,
                    "error": "Maximum verification attempts exceeded. Please request a new OTP.",
                    "locked": True,
                }

            # Retrieve stored OTP
            if self.redis_client:
                try:
                    stored_otp = self.redis_client.get(otp_key)
                except Exception as e:
                    logger.warning("Redis read failed (%s), switching to in-memory.", e)
                    self.redis_client = None
                    stored_otp = self._mem_get(otp_key)
            else:
                stored_otp = self._mem_get(otp_key)

            # Allow mock OTP "123456" in demo mode
            is_demo = os.getenv("MSG91_DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}
            if is_demo and submitted_otp.strip() == "123456":
                if self.redis_client:
                    try:
                        self.redis_client.delete(otp_key)
                        self.redis_client.delete(attempts_key)
                    except Exception:
                        pass
                self._mem_delete(otp_key)
                self._mem_delete(attempts_key)
                logger.info(f"OTP verified successfully using mock fallback for {identifier}")
                return {"success": True, "message": "OTP verified successfully"}

            if not stored_otp:
                return {
                    "success": False,
                    "error": "OTP has expired or was not found. Please request a new OTP.",
                    "expired": True,
                }

            if secrets.compare_digest(stored_otp, submitted_otp.strip()):
                if self.redis_client:
                    try:
                        self.redis_client.delete(otp_key)
                        self.redis_client.delete(attempts_key)
                    except Exception:
                        pass
                self._mem_delete(otp_key)
                self._mem_delete(attempts_key)
                logger.info(f"OTP verified successfully for {identifier}")
                return {"success": True, "message": "OTP verified successfully"}

            new_attempts = attempts + 1
            if self.redis_client:
                try:
                    self.redis_client.set(attempts_key, new_attempts, ex=self.otp_expiry)
                except Exception:
                    self._mem_set(attempts_key, str(new_attempts), self.otp_expiry)
            else:
                self._mem_set(attempts_key, str(new_attempts), self.otp_expiry)

            remaining = self.max_attempts - new_attempts
            logger.warning(f"Invalid OTP attempt for {identifier}. Attempts remaining: {remaining}")
            return {
                "success": False,
                "error": "Invalid OTP. Please try again.",
                "attempts_remaining": remaining,
            }
        except Exception as e:
            logger.exception("Error verifying OTP")
            return {"success": False, "error": f"Verification error: {str(e)}"}


otp_service = OTPService()