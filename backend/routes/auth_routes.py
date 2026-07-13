from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from models.user import UserCreate, UserLogin, UserResponse, User, UserRole
from utils.auth import hash_password, verify_password, create_access_token
from services.otp_service import otp_service
from services.msg91_service import msg91_service
from middleware.auth_middleware import get_current_user
import phonenumbers
from phonenumbers.phonenumberutil import NumberParseException
import logging
import httpx
import hashlib
import os
import re
import secrets
import time
from datetime import datetime, timezone
from urllib.parse import quote, urlencode, urlparse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class SendOTPRequest(BaseModel):
    phone: str
    purpose: str = "registration"

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    purpose: str = "registration"

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

GOLDENRICH_SSO_COOKIE = "goldenrich_sso_state"
PASSWORD_RESET_TTL_SECONDS = 30 * 60
SSO_STATE_TTL_SECONDS = 10 * 60
_sso_state_store: dict[str, float] = {}


def _password_reset_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _password_validation_error(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if len(password) > 32:
        return "Password must be at most 32 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must include an uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must include a lowercase letter"
    if not re.search(r"\d", password):
        return "Password must include a number"
    if not any(not character.isalnum() and not character.isspace() for character in password):
        return "Password must include a special character"
    if any(character.isspace() for character in password):
        return "Password must not contain spaces"
    return None

def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()

def _frontend_url(path: str, params: dict | None = None) -> str:
    base_url = _env("PUBLIC_FRONTEND_URL", "http://localhost:3000").rstrip("/")
    url = f"{base_url}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"
    return url

def _goldenrich_redirect_uri() -> str:
    configured = _env("GOLDENRICH_OAUTH_REDIRECT_URI")
    if configured:
        return configured
    backend_url = _env("PUBLIC_BACKEND_URL", "http://localhost:8001").rstrip("/")
    return f"{backend_url}/api/auth/sso/goldenrich/callback"

def _is_self_referencing_authorize_url(authorize_url: str) -> bool:
    backend_url = _env("PUBLIC_BACKEND_URL", "http://localhost:8001").rstrip("/")
    authorize_parts = urlparse(authorize_url)
    backend_parts = urlparse(backend_url)
    if not authorize_parts.netloc or not backend_parts.netloc:
        return False
    return authorize_parts.netloc.lower() == backend_parts.netloc.lower()

def _sso_cookie_secure() -> bool:
    configured = _env("SSO_COOKIE_SECURE")
    if configured:
        return configured.lower() == "true"
    return _env("PUBLIC_BACKEND_URL", "http://localhost:8001").startswith("https://")

def _remember_sso_state(state: str) -> None:
    now = time.time()
    for stored_state, expires_at in list(_sso_state_store.items()):
        if expires_at <= now:
            _sso_state_store.pop(stored_state, None)
    _sso_state_store[state] = now + SSO_STATE_TTL_SECONDS

def _consume_sso_state(state: str | None, expected_state: str | None) -> bool:
    if not state:
        return False
    cookie_matches = bool(expected_state and secrets.compare_digest(state, expected_state))
    stored_expires_at = _sso_state_store.pop(state, None)
    stored_matches = bool(stored_expires_at and stored_expires_at > time.time())
    return cookie_matches or stored_matches

async def get_db():
    from server import db_instance
    return db_instance

def _user_token_response(user_dict: dict) -> TokenResponse:
    access_token = create_access_token(data={
        "user_id": user_dict["user_id"],
        "email": user_dict["email"],
        "role": user_dict["role"],
    })

    user_response = UserResponse(
        user_id=user_dict["user_id"],
        email=user_dict["email"],
        phone=user_dict.get("phone", ""),
        full_name=user_dict.get("full_name", ""),
        role=user_dict["role"],
        city=user_dict.get("city"),
        profile_image=user_dict.get("profile_image"),
        kyc_status=user_dict.get("kyc_status"),
        is_active=user_dict.get("is_active", True),
        created_at=user_dict.get("created_at") or datetime.now(timezone.utc),
    )

    return TokenResponse(
        access_token=access_token,
        user=user_response,
    )

async def _get_or_sync_env_admin(db: AsyncIOMotorDatabase, email: str) -> dict:
    now = datetime.now(timezone.utc)
    admin_name = _env("ADMIN_NAME", "X-Space360 Admin") or "X-Space360 Admin"
    admin_phone = _env("ADMIN_PHONE", "+910000000000") or "+910000000000"

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    update_fields = {
        "email": email,
        "full_name": admin_name,
        "role": UserRole.ADMIN.value,
        "is_active": True,
        "is_email_verified": True,
        "updated_at": now,
    }

    if existing:
        await db.users.update_one({"user_id": existing["user_id"]}, {"$set": update_fields})
        existing.update(update_fields)
        return existing

    admin_user = User(
        user_id=f"ADM -{now.strftime('%d%m%Y%H%M')}",
        uid=f"ADM -{now.strftime('%d%m%Y%H%M')}",
        email=email,
        phone=admin_phone,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        full_name=admin_name,
        role=UserRole.ADMIN,
        is_active=True,
        is_email_verified=True,
        is_phone_verified=False,
        terms_accepted=True,
    )
    admin_dict = admin_user.model_dump()
    await db.users.insert_one(admin_dict)
    return admin_dict

def _normalize_sso_role(raw_role: str | None) -> UserRole:
    role = (raw_role or "").strip().lower()
    if role in {"broker", "agent", "channel_partner", "cp", "lg"}:
        return UserRole.BROKER
    if role in {"rm", "relationship_manager", "employee", "regional_manager", "relationship manager"}:
        return UserRole.EMPLOYEE
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="GoldenRich SSO user role is not allowed for STR access",
    )

def _first_present(data: dict, keys: tuple[str, ...]) -> str:
    for key in keys:
        value = data.get(key)   
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""

def _extract_sso_profile(userinfo: dict) -> dict:
    email = _first_present(userinfo, ("email", "mail", "email_id")).lower()
    full_name = (
        _first_present(userinfo, ("name", "full_name", "fullName"))
        or " ".join(part for part in [userinfo.get("first_name"), userinfo.get("last_name")] if part)
        or email
    )
    role = _normalize_sso_role(
        _first_present(userinfo, ("role", "grp_role", "user_type", "designation", "type"))
    )
    phone = _first_present(userinfo, ("phone", "phone_number", "mobile", "mobile_number", "contact_number"))
    lg_code = _first_present(userinfo, ("lg_code", "serial_no", "broker_code", "lgCode")).upper()
    employee_code = _first_present(
        userinfo,
        ("employee_code", "employee_id", "emp_code", "rm_code", "uid"),
    )
    provider_subject = _first_present(userinfo, ("sub", "id", "user_id"))
    external_id = provider_subject or (lg_code if role == UserRole.BROKER else employee_code) or email

    if not email:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GoldenRich SSO profile is missing email",
        )
    if role == UserRole.BROKER and not lg_code:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GoldenRich broker profile is missing lg_code",
        )
    if role == UserRole.EMPLOYEE and not employee_code:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GoldenRich employee profile is missing employee_code",
        )

    return {
        "external_id": str(external_id),
        "email": email,
        "full_name": full_name,
        "phone": phone,
        "role": role,
        "lg_code": lg_code or None,
        "employee_code": employee_code or None,
    }

async def _upsert_goldenrich_user(db: AsyncIOMotorDatabase, profile: dict) -> dict:
    now = datetime.now(timezone.utc)
    provider_key = f"goldenrich:{profile['external_id']}"
    role = profile["role"]
    existing = await db.users.find_one(
        {
            "$or": [
                {"sso_provider": "goldenrich", "sso_subject": profile["external_id"]},
                {"external_auth_id": provider_key},
                {"email": profile["email"]},
            ]
        },
        {"_id": 0},
    )

    update_fields = {
        "email": profile["email"],
        "phone": profile["phone"],
        "full_name": profile["full_name"],
        "role": role.value,
        "uid": profile["lg_code"] or profile["employee_code"],
        "lg_code": profile["lg_code"],
        "employee_code": profile["employee_code"],
        "is_active": True,
        "is_email_verified": True,
        "sso_provider": "goldenrich",
        "sso_subject": profile["external_id"],
        "external_auth_id": provider_key,
        "last_sso_login_at": now,
        "updated_at": now,
    }

    if existing:
        await db.users.update_one({"user_id": existing["user_id"]}, {"$set": update_fields})
        existing.update(update_fields)
        return existing

    user = User(
        email=profile["email"],
        phone=profile["phone"],
        password_hash=hash_password(secrets.token_urlsafe(32)),
        full_name=profile["full_name"],
        role=role,
        uid=profile["lg_code"] or profile["employee_code"],
        lg_code=profile["lg_code"],
        is_email_verified=True,
        is_phone_verified=bool(profile["phone"]),
    )
    user_dict = user.model_dump()
    user_dict.update(update_fields)
    await db.users.insert_one(user_dict)
    return user_dict

@router.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    """Send OTP to phone number for verification."""
    try:
        raw_phone = request.phone.strip()
        if not raw_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required"
            )

        # Validate phone number. Accept both 10-digit Indian numbers and +91 format.
        try:
            parsed = phonenumbers.parse(raw_phone, "IN")
        except NumberParseException:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone number"
            )

        if not phonenumbers.is_valid_number(parsed):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone number"
            )

        normalized_phone = phonenumbers.format_number(
            parsed,
            phonenumbers.PhoneNumberFormat.E164
        )
        
        # Generate and store OTP
        result = otp_service.generate_and_store_otp(raw_phone, request.purpose)
        
        if result["success"]:
            delivery = msg91_service.send_otp_sms(normalized_phone, result["otp"])
            if not delivery.get("success"):
                logger.error("OTP SMS delivery failed for %s: %s", normalized_phone, delivery.get("error"))
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="OTP delivery failed. Please check SMS gateway configuration."
                )

            return {
                "message": "OTP sent successfully",
                "otp": result["otp"] if delivery.get("demo_mode") else None,
                "expires_in": result["expires_in"],
                "phone": normalized_phone,
                "demo_mode": bool(delivery.get("demo_mode"))
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["error"]
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error sending OTP")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP submitted by user."""
    try:
        result = otp_service.verify_otp(request.phone, request.otp, request.purpose)
        
        if result["success"]:
            return {
                "message": result["message"],
                "verified": True
            }
        else:
            if result.get("locked"):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=result["error"]
                )
            elif result.get("expired"):
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail=result["error"]
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result["error"]
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification error"
        )

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Send password reset email for host/customer/admin users."""
    try:
        email = request.email.strip().lower()
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user:
            token = secrets.token_urlsafe(32)
            now = datetime.now(timezone.utc)
            expires_at = now.timestamp() + PASSWORD_RESET_TTL_SECONDS
            await db.password_reset_tokens.update_many(
                {"user_id": user["user_id"], "used": False},
                {"$set": {
                    "used": True,
                    "invalidated_at": now,
                    "invalidation_reason": "superseded",
                }},
            )
            await db.password_reset_tokens.insert_one({
                "token_hash": _password_reset_token_hash(token),
                "user_id": user["user_id"],
                "email": email,
                "expires_at": expires_at,
                "used": False,
                "created_at": now,
            })
            try:
                from services.email_service import email_service
                login_path = "/admin/login" if user.get("role") == UserRole.ADMIN.value else "/login"
                reset_url = _frontend_url(
                    "/reset-password",
                    {"token": token, "login": login_path},
                )
                email_result = email_service.send_template(
                    email,
                    "password_reset",
                    {
                        "name": user.get("full_name", "there"),
                        "email": email,
                        "action_url": reset_url,
                        "reset_password_url": reset_url,
                        "request_date": now,
                        "reset_request_time": now,
                    },
                )
                if not email_result.get("success"):
                    logger.error(
                        "Password reset email provider rejected request for %s: %s",
                        email,
                        email_result.get("error", "unknown error"),
                    )
            except Exception as email_err:
                logger.warning("Password reset email failed for %s: %s", email, email_err)
        return {"message": "If this email is registered, a reset link has been sent."}
    except Exception:
        logger.exception("Forgot password failed")
        raise HTTPException(status_code=500, detail="Failed to process password reset request")

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Reset password using a valid password reset token."""
    token = request.token.strip()
    token_doc = await db.password_reset_tokens.find_one({
        "token_hash": _password_reset_token_hash(token),
        "used": False,
    })
    if not token_doc or token_doc.get("expires_at", 0) < datetime.now(timezone.utc).timestamp():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    password_error = _password_validation_error(request.password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)
    user = await db.users.find_one({"user_id": token_doc["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    await db.users.update_one(
        {"user_id": token_doc["user_id"]},
        {"$set": {"password_hash": hash_password(request.password), "updated_at": datetime.now(timezone.utc)}},
    )
    await db.password_reset_tokens.update_one(
        {"token_hash": _password_reset_token_hash(token)},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}},
    )
    login_path = "/admin/login" if user.get("role") == UserRole.ADMIN.value else "/login"
    return {"message": "Password reset successfully", "login_path": login_path}

@router.get("/sso/goldenrich/login")
async def goldenrich_sso_login(request: Request, force: bool = False):
    """Start GoldenRich OAuth2 SSO login."""
    client_id = _env("GOLDENRICH_OAUTH_CLIENT_ID")
    authorize_url = _env("GOLDENRICH_OAUTH_AUTHORIZE_URL")
    if not client_id or not authorize_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GoldenRich SSO is not configured",
        )
    if _is_self_referencing_authorize_url(authorize_url):
        logger.error("GoldenRich SSO authorize URL points back to STR: %s", authorize_url)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GoldenRich SSO authorize URL is misconfigured",
        )

    existing_state = request.cookies.get(GOLDENRICH_SSO_COOKIE)
    if existing_state and not force:
        logger.warning("GoldenRich SSO loop stopped: authorize endpoint returned to start URL")
        response = RedirectResponse(_frontend_url("/login", {"sso_error": "grp_authorize_loop"}))
        response.delete_cookie(GOLDENRICH_SSO_COOKIE)
        return response

    state = secrets.token_urlsafe(32)
    _remember_sso_state(state)
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": _goldenrich_redirect_uri(),
        "scope": _env("GOLDENRICH_OAUTH_SCOPE", "openid profile email"),
        "state": state,
    }
    separator = "&" if "?" in authorize_url else "?"
    redirect_url = f"{authorize_url}{separator}{urlencode(params, quote_via=quote)}"
    logger.info("GoldenRich SSO authorize redirect URL: %s", redirect_url)
    response = RedirectResponse(redirect_url)
    response.set_cookie(
        GOLDENRICH_SSO_COOKIE,
        state,
        max_age=600,
        httponly=True,
        secure=_sso_cookie_secure(),
        samesite="lax",
    )
    return response

@router.get("/sso/goldenrich/callback")
async def goldenrich_sso_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Handle GoldenRich OAuth2 callback, provision user, and redirect into STR."""
    if error:
        return RedirectResponse(_frontend_url("/sso/goldenrich/callback", {"error": error}))

    expected_state = request.cookies.get(GOLDENRICH_SSO_COOKIE)
    if not _consume_sso_state(state, expected_state):
        logger.warning(
            "GoldenRich SSO invalid state: has_state=%s has_cookie=%s",
            bool(state),
            bool(expected_state),
        )
        return RedirectResponse(_frontend_url("/sso/goldenrich/callback", {"error": "invalid_state"}))

    if not code:
        return RedirectResponse(_frontend_url("/sso/goldenrich/callback", {"error": "missing_code"}))

    token_url = _env("GOLDENRICH_OAUTH_TOKEN_URL")
    userinfo_url = _env("GOLDENRICH_OAUTH_USERINFO_URL")
    client_id = _env("GOLDENRICH_OAUTH_CLIENT_ID")
    client_secret = _env("GOLDENRICH_OAUTH_CLIENT_SECRET")
    if not all([token_url, userinfo_url, client_id, client_secret]):
        return RedirectResponse(_frontend_url("/sso/goldenrich/callback", {"error": "sso_not_configured"}))

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            token_response = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": _goldenrich_redirect_uri(),
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Accept": "application/json"},
            )
            token_response.raise_for_status()
            token_payload = token_response.json()
            provider_access_token = token_payload.get("access_token")
            if not provider_access_token:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="GoldenRich token response missing access_token",
                )

            userinfo_response = await client.get(
                userinfo_url,
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {provider_access_token}",
                },
            )
            userinfo_response.raise_for_status()
            profile = _extract_sso_profile(userinfo_response.json())
            user = await _upsert_goldenrich_user(db, profile)
    except HTTPException as exc:
        logger.warning("GoldenRich SSO rejected: %s", exc.detail)
        return RedirectResponse(_frontend_url("/sso/goldenrich/callback", {"error": str(exc.detail)}))
    except Exception as exc:
        logger.exception("GoldenRich SSO callback failed")
        return RedirectResponse(_frontend_url("/sso/goldenrich/callback", {"error": "sso_callback_failed"}))

    access_token = create_access_token(
        data={
            "user_id": user["user_id"],
            "email": user["email"],
            "role": user["role"].value if hasattr(user["role"], "value") else user["role"],
        }
    )
    response = RedirectResponse(
        _frontend_url(
            "/sso/goldenrich/callback",
            {
                "token": access_token,
                "redirect": "/dashboard",
            },
        )
    )
    response.delete_cookie(GOLDENRICH_SSO_COOKIE)
    return response

@router.get("/public/brokers-and-employees")
async def get_public_brokers_and_employees(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Fetch all active brokers and employees for public registration dropdowns."""
    brokers = await db.users.find(
        {"role": "broker", "is_active": True},
        {"user_id": 1, "full_name": 1, "lg_code": 1, "uid": 1}
    ).to_list(length=1000)
    
    employees = await db.users.find(
        {"role": "employee", "is_active": True},
        {"user_id": 1, "full_name": 1, "employee_code": 1, "uid": 1}
    ).to_list(length=1000)
    
    return {
        "brokers": [
            {
                "user_id": b["user_id"],
                "full_name": b["full_name"],
                "lg_code": b.get("lg_code") or b.get("uid") or b["user_id"],
            }
            for b in brokers
            if b.get("lg_code") or b.get("uid") or b.get("user_id")
        ],
        "employees": [
            {
                "user_id": emp["user_id"],
                "full_name": emp["full_name"],
                "employee_code": emp.get("employee_code") or emp.get("uid") or emp["user_id"],
            }
            for emp in employees
            if emp.get("employee_code") or emp.get("uid") or emp.get("user_id")
        ]
    }

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Register a new user."""
    try:
        role_str = user_data.role.value if hasattr(user_data.role, "value") else str(user_data.role)
        if role_str.lower() == UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin accounts can only be managed from the admin environment",
            )

        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if phone already exists
        existing_phone = await db.users.find_one({"phone": user_data.phone})
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )

        password_error = _password_validation_error(user_data.password)
        if password_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=password_error,
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Resolve broker if lg_code is provided for a host
        broker_id = None
        if role_str.lower() == "host" and user_data.lg_code and user_data.lg_code.strip():
            lg_code_clean = user_data.lg_code.strip()
            broker = await db.users.find_one({
                "role": "broker",
                "$or": [
                    {"lg_code": {"$regex": f"^{lg_code_clean}$", "$options": "i"}},
                    {"uid": {"$regex": f"^{lg_code_clean}$", "$options": "i"}},
                    {"user_id": {"$regex": f"^{lg_code_clean}$", "$options": "i"}},
                ],
            })
            if not broker:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid LG Code. No broker found with this code."
                )
            broker_id = broker["user_id"]
            
        # Resolve employee if employee_code is provided for a host
        rm_id = None
        if role_str.lower() == "host" and user_data.employee_code and user_data.employee_code.strip():
            employee_code_clean = user_data.employee_code.strip()
            employee = await db.users.find_one({
                "role": "employee",
                "$or": [
                    {"employee_code": {"$regex": f"^{employee_code_clean}$", "$options": "i"}},
                    {"uid": {"$regex": f"^{employee_code_clean}$", "$options": "i"}},
                    {"user_id": {"$regex": f"^{employee_code_clean}$", "$options": "i"}},
                ],
            })
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Employee Code. No employee found with this code."
                )
            rm_id = employee["user_id"]
            
        # Link broker to the employee if both are provided during Host registration
        if broker_id and rm_id:
            await db.users.update_one(
                {"user_id": broker_id},
                {"$set": {"rm_id": rm_id}}
            )
        
        # Generate the deterministic role-based UID
        role_prefix = "GST"
        role_str_lower = role_str.lower()
        if role_str_lower == "admin":
            role_prefix = "ADM"
        elif role_str_lower == "host":
            role_prefix = "HST"
        elif role_str_lower == "broker":
            role_prefix = "BRK"
        elif role_str_lower == "employee":
            role_prefix = "EMP"
            
        now = datetime.now()
        dd = now.strftime("%d")
        mm = now.strftime("%m")
        yyyy = now.strftime("%Y")
        hh = now.strftime("%H")
        min_str = now.strftime("%M")
        generated_uid = f"{role_prefix} -{dd}{mm}{yyyy}{hh}{min_str}"

        # Create user object
        user = User(
            user_id=generated_uid,
            uid=generated_uid,
            email=user_data.email,
            phone=user_data.phone,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role,
            city=user_data.city,
            lg_code=user_data.lg_code.strip().upper() if user_data.lg_code else None,
            broker_id=broker_id,
            rm_id=rm_id,
            employee_code=user_data.employee_code.strip() if user_data.employee_code else None,
            terms_accepted=user_data.terms_accepted,
            is_phone_verified=True  # Assuming OTP was verified before registration
        )
        
        # Insert into database
        user_dict = user.model_dump()
        await db.users.insert_one(user_dict)

        try:
            from services.email_service import email_service
            template = "host_registration" if role_str.lower() == "host" else "customer_registration"
            email_service.send_template(
                user.email,
                template,
                {
                    "name": user.full_name,
                    "host_name": user.full_name,
                    "customer_name": user.full_name,
                    "email": user.email,
                    "mobile": user.phone,
                    "phone": user.phone,
                    "role": role_str,
                    "city": user.city or "",
                    "action_url": _frontend_url("/host/dashboard" if role_str.lower() == "host" else "/dashboard"),
                },
            )
        except Exception as email_err:
            logger.warning("Registration email failed for %s: %s", user.email, email_err)
        
        # Create access token
        access_token = create_access_token(data={
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role.value
        })
        
        # Return response
        user_response = UserResponse(
            user_id=user.user_id,
            email=user.email,
            phone=user.phone,
            full_name=user.full_name,
            role=user.role,
            city=user.city,
            profile_image=user.profile_image,
            kyc_status=user.kyc_status,
            is_active=user.is_active,
            created_at=user.created_at
        )
        
        return TokenResponse(
            access_token=access_token,
            user=user_response
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Login non-admin users and return JWT token."""
    try:
        # Find user by email
        email = credentials.email.strip().lower()
        user_dict = await db.users.find_one({"email": email}, {"_id": 0})
        
        if not user_dict:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if user_dict.get("role") == UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins must sign in from the admin login page"
            )
        
        # Verify password
        if not verify_password(credentials.password, user_dict["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user_dict.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )

        return _user_token_response(user_dict)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Login admin using ADMIN_EMAIL and ADMIN_PASSWORD from environment."""
    try:
        admin_email = _env("ADMIN_EMAIL").lower()
        admin_password = _env("ADMIN_PASSWORD")
        email = credentials.email.strip().lower()

        if not admin_email or not admin_password:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Admin login is not configured",
            )

        if email != admin_email or not secrets.compare_digest(credentials.password, admin_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin email or password",
            )

        user_dict = await _get_or_sync_env_admin(db, admin_email)
        return _user_token_response(user_dict)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin login failed"
        )


@router.get("/me")
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return the latest profile of the authenticated user (sans secrets)."""
    user = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "password_hash": 0, "registration_fee_payment_id": 0},
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    # Convert datetimes to ISO
    for key in ("created_at", "updated_at"):
        if user.get(key):
            user[key] = user[key].isoformat() if hasattr(user[key], "isoformat") else user[key]
    return user

@router.post("/claim-promo")
async def claim_promo(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Claim the summer promo 10% discount."""
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"is_promo_claimed": True, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Promo claimed successfully", "is_promo_claimed": True}

