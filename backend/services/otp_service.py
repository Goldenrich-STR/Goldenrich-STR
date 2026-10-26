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
        self.otp_expiry = int(os.getenv("OTP_EXPIRY_MINUTES", "2")) * 60
        self.max_attempts = int(os.getenv("MAX_OTP_ATTEMPTS", "5"))
        self.resend_cooldown = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
        self.max_sends = int(os.getenv("MAX_OTP_SENDS_PER_WINDOW", "3"))
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

    def _get_resend_key(self, identifier: str, purpose: str = "login") -> str:
        return f"otp:resend:{purpose}:{identifier}"

    def _get_send_count_key(self, identifier: str, purpose: str = "login") -> str:
        return f"otp:send-count:{purpose}:{identifier}"

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

            logger.info("OTP generated (purpose: %s)", purpose)
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

    def check_and_record_send(self, identifier: str, purpose: str = "login") -> Dict:
        """Apply a per-OTP resend cooldown and bounded send window.

        Redis is used where available. The in-memory fallback keeps the same
        behaviour for development, but production must use Redis so limits are
        shared by every application worker.
        """
        resend_key = self._get_resend_key(identifier, purpose)
        count_key = self._get_send_count_key(identifier, purpose)
        try:
            if self.redis_client:
                try:
                    cooldown_ttl = self.redis_client.ttl(resend_key)
                    if cooldown_ttl > 0:
                        return {"success": False, "retry_after": cooldown_ttl, "rate_limited": True}
                    sends = int(self.redis_client.get(count_key) or 0)
                    if sends >= self.max_sends:
                        window_ttl = max(self.redis_client.ttl(count_key), 1)
                        return {"success": False, "retry_after": window_ttl, "rate_limited": True}
                    pipe = self.redis_client.pipeline()
                    pipe.set(resend_key, "1", ex=self.resend_cooldown)
                    pipe.incr(count_key)
                    pipe.expire(count_key, self.otp_expiry)
                    pipe.execute()
                    return {"success": True, "resend_after": self.resend_cooldown, "sends_remaining": self.max_sends - sends - 1}
                except Exception as redis_err:
                    logger.warning("Redis OTP send-limit check failed (%s), using in-memory fallback.", redis_err)
                    self.redis_client = None

            cooldown = self._mem_get(resend_key)
            if cooldown:
                entry = self.otp_storage.get(resend_key)
                retry_after = max(1, int(entry[1] - time.time())) if entry else self.resend_cooldown
                return {"success": False, "retry_after": retry_after, "rate_limited": True}
            sends = int(self._mem_get(count_key) or 0)
            if sends >= self.max_sends:
                entry = self.otp_storage.get(count_key)
                retry_after = max(1, int(entry[1] - time.time())) if entry else self.otp_expiry
                return {"success": False, "retry_after": retry_after, "rate_limited": True}
            self._mem_set(resend_key, "1", self.resend_cooldown)
            self._mem_set(count_key, str(sends + 1), self.otp_expiry)
            return {"success": True, "resend_after": self.resend_cooldown, "sends_remaining": self.max_sends - sends - 1}
        except Exception:
            logger.exception("OTP send-limit check failed")
            return {"success": False, "error": "Unable to send OTP at this time."}

    def discard_otp(self, identifier: str, purpose: str = "login") -> None:
        """Remove an OTP that could not be handed to the messaging provider."""
        otp_key = self._get_otp_key(identifier, purpose)
        if self.redis_client:
            try:
                self.redis_client.delete(otp_key)
            except Exception:
                logger.warning("Could not remove undelivered OTP from Redis")
        self._mem_delete(otp_key)

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
            logger.warning("Invalid OTP attempt for identifier ending %s. Attempts remaining: %s", identifier[-4:], remaining)
            return {
                "success": False,
                "error": "Invalid OTP. Please try again.",
                "attempts_remaining": remaining,
            }
        except Exception as e:
            logger.exception("Error verifying OTP")
            return {"success": False, "error": f"Verification error: {str(e)}"}


otp_service = OTPService()
