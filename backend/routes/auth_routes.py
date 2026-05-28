from fastapi import APIRouter, HTTPException, status, Depends
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
