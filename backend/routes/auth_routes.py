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
import os
import secrets
from datetime import datetime, timezone
from urllib.parse import urlencode

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

GOLDENRICH_SSO_COOKIE = "goldenrich_sso_state"

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

def _sso_cookie_secure() -> bool:
    configured = _env("SSO_COOKIE_SECURE")
    if configured:
        return configured.lower() == "true"
    return _env("PUBLIC_BACKEND_URL", "http://localhost:8001").startswith("https://")

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
        _first_present(userinfo, ("role", "user_type", "designation", "type"))
    )
    phone = _first_present(userinfo, ("phone", "mobile", "mobile_number", "contact_number"))
    lg_code = _first_present(userinfo, ("lg_code", "broker_code", "lgCode")).upper()
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

async def get_db():
    from server import db_instance
    return db_instance

@router.get("/sso/goldenrich/login")
async def goldenrich_sso_login():
    """Start GoldenRich OAuth2 SSO login."""
    client_id = _env("GOLDENRICH_OAUTH_CLIENT_ID")
    authorize_url = _env("GOLDENRICH_OAUTH_AUTHORIZE_URL")
    if not client_id or not authorize_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GoldenRich SSO is not configured",
        )

    state = secrets.token_urlsafe(32)
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": _goldenrich_redirect_uri(),
        "scope": _env("GOLDENRICH_OAUTH_SCOPE", "openid profile email"),
        "state": state,
    }
    response = RedirectResponse(f"{authorize_url}?{urlencode(params)}")
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
    if not state or not expected_state or not secrets.compare_digest(state, expected_state):
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

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Register a new user."""
    try:
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
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Resolve broker if lg_code is provided for a host
        broker_id = None
        role_str = user_data.role.value if hasattr(user_data.role, "value") else str(user_data.role)
        if role_str.lower() == "host" and user_data.lg_code and user_data.lg_code.strip():
            lg_code_clean = user_data.lg_code.strip()
            broker = await db.users.find_one({
                "role": "broker",
                "lg_code": {"$regex": f"^{lg_code_clean}$", "$options": "i"}
            })
            if not broker:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid LG Code. No broker found with this code."
                )
            broker_id = broker["user_id"]
        
        # Create user object
        user = User(
            email=user_data.email,
            phone=user_data.phone,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role,
            city=user_data.city,
            lg_code=user_data.lg_code.strip().upper() if user_data.lg_code else None,
            broker_id=broker_id,
            terms_accepted=user_data.terms_accepted,
            is_phone_verified=True  # Assuming OTP was verified before registration
        )
        
        # Insert into database
        user_dict = user.model_dump()
        await db.users.insert_one(user_dict)
        
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
    """Login user and return JWT token."""
    try:
        # Find user by email
        user_dict = await db.users.find_one({"email": credentials.email}, {"_id": 0})
        
        if not user_dict:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
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
        
        # Create access token
        access_token = create_access_token(data={
            "user_id": user_dict["user_id"],
            "email": user_dict["email"],
            "role": user_dict["role"]
        })
        
        # Return response
        user_response = UserResponse(
            user_id=user_dict["user_id"],
            email=user_dict["email"],
            phone=user_dict["phone"],
            full_name=user_dict["full_name"],
            role=user_dict["role"],
            city=user_dict.get("city"),
            profile_image=user_dict.get("profile_image"),
            kyc_status=user_dict.get("kyc_status"),
            is_active=user_dict["is_active"],
            created_at=user_dict["created_at"]
        )
        
        return TokenResponse(
            access_token=access_token,
            user=user_response
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
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
