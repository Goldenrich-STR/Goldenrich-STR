from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from models.subscription import SubscriptionPlan, Subscription, SubscriptionCreate, SubscriptionPlanType, SubscriptionStatus
from models.user import UserRole
from middleware.auth_middleware import get_current_user
from services.razorpay_service import razorpay_service
from datetime import datetime, timedelta, date, timezone
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class ConfirmRegistrationFeeRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class ConfirmSubscriptionUpiRequest(BaseModel):
    subscription_id: str
    upi_transaction_id: str
    razorpay_order_id: Optional[str] = None

async def get_db():
    from server import db_instance
    return db_instance

async def _send_subscription_email(db: AsyncIOMotorDatabase, user_id: str, template: str, subscription: dict, extra: Optional[dict] = None) -> None:
    try:
        from services.email_service import email_service
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "full_name": 1})
        if not user or not user.get("email"):
            return
        plan = await db.subscription_plans.find_one({"plan_id": subscription.get("plan_id")}, {"_id": 0})
        email_service.send_template(
            user["email"],
            template,
            {
                "name": user.get("full_name", "there"),
                "plan_name": (plan or {}).get("plan_name") or subscription.get("plan_id"),
                "total_amount": subscription.get("amount"),
                "payment_id": subscription.get("razorpay_subscription_id"),
                "subscription_id": subscription.get("subscription_id"),
                "activation_date": subscription.get("activated_at") or subscription.get("updated_at"),
                "expiry_date": (
                    subscription.get("end_date")
                    or subscription.get("expires_at")
                    or subscription.get("expiry_date")
                ),
                "action_url": os.getenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in").rstrip("/") + "/host/dashboard",
                **(extra or {}),
            },
        )
    except Exception as email_err:
        logger.warning("Subscription email failed: %s", email_err)

REGISTRATION_FEE_AMOUNT = int(os.getenv("REGISTRATION_FEE_AMOUNT", "50000"))  # ₹500 in paise

COUPON_MIN_TAXABLE_AMOUNT = 10.0

def _subscription_amount_breakdown(plan: dict, billing_cycle: str = "monthly") -> dict:
    plan_fee = float(plan.get("price_monthly") if billing_cycle == "monthly" else plan.get("price_annual") or 0)
    platform_fee = float(plan.get("platform_fee") or 0)
    tax_percent = float(plan.get("tax_percent", 18.0) if plan.get("tax_percent") is not None else 18.0)
    taxable_amount = plan_fee + platform_fee
    tax_amount = round(taxable_amount * (tax_percent / 100), 2)
    total_amount = round(taxable_amount + tax_amount, 2)
    return {
        "plan_fee": plan_fee,
        "platform_fee": platform_fee,
        "tax_percent": tax_percent,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
    }

def _coupon_discount_amount(coupon: dict, amount: float) -> float:
    if not coupon:
        return 0.0
    value = float(coupon.get("discount_value") or 0)
    if coupon.get("discount_type") == "percentage":
        return round(amount * (value / 100), 2)
    return round(min(amount, value), 2)

def _subscription_coupon_breakdown(plan: dict, coupon: Optional[dict], billing_cycle: str = "monthly") -> dict:
    amount_breakdown = _subscription_amount_breakdown(plan, billing_cycle)
    taxable_amount = round(amount_breakdown["plan_fee"] + amount_breakdown["platform_fee"], 2)
    if coupon:
        discounted_taxable_amount = round(min(taxable_amount, COUPON_MIN_TAXABLE_AMOUNT), 2)
        discount_amount = round(max(0.0, taxable_amount - discounted_taxable_amount), 2)
    else:
        discount_amount = 0.0
        discounted_taxable_amount = taxable_amount
    tax_amount = round(discounted_taxable_amount * (amount_breakdown["tax_percent"] / 100), 2)
    total_amount = round(discounted_taxable_amount + tax_amount, 2)
    return {
        **amount_breakdown,
        "taxable_amount": taxable_amount,
        "discount_amount": discount_amount,
        "discounted_taxable_amount": discounted_taxable_amount,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
    }

def _normalize(value: Optional[str]) -> Optional[str]:
    return value.strip().lower() if value else None

def _sqft_matches(range_text: Optional[str], area_sqft: Optional[float]) -> bool:
    if not range_text or area_sqft is None:
        return True

    text = range_text.strip().lower().replace("sqft", "").replace("sq.ft", "").replace(",", "")
    text = text.replace(" ", "")
    aliases = {
        "small": "<500",
        "medium": "500-2000",
        "large": "2000-5000",
        "extra_large": "5000+",
        "extralarge": "5000+",
    }
    text = aliases.get(text, text)
    try:
        if text.startswith("<="):
            return area_sqft <= float(text[2:])
        if text.startswith(">="):
            return area_sqft >= float(text[2:])
        if text.startswith("<"):
            return area_sqft < float(text[1:])
        if text.startswith(">"):
            return area_sqft > float(text[1:])
        if text.endswith("+"):
            return area_sqft >= float(text[:-1])
        if "-" in text:
            start, end = text.split("-", 1)
            return float(start) <= area_sqft <= float(end)
    except ValueError:
        return True

    return True

def _target_matches(
    item: dict,
    *,
    plan_type: Optional[str] = None,
    property_category: Optional[str] = None,
    property_type: Optional[str] = None,
    bhk_type: Optional[str] = None,
    area_sqft: Optional[float] = None,
) -> bool:
    requested_plan_type = _normalize(plan_type)
    requested_category = _normalize(property_category)
    requested_property_type = _normalize(property_type)
    requested_bhk = _normalize(bhk_type)

    item_plan_type = _normalize(item.get("plan_type"))
    item_category = _normalize(item.get("property_category"))
    item_property_type = _normalize(item.get("property_type"))
    item_bhk = _normalize(item.get("bhk_type"))

    if requested_plan_type and item_plan_type and item_plan_type != requested_plan_type:
        return False
    if requested_category and item_category and item_category != requested_category:
        return False
    if requested_property_type and item_property_type and item_property_type != requested_property_type:
        return False
    if requested_bhk and item_bhk and item_bhk != requested_bhk:
        return False
    return _sqft_matches(item.get("sqft_range"), area_sqft)

# ========== SUBSCRIPTION PLANS (PUBLIC) ==========

@router.get("/plans")
async def get_subscription_plans(
    plan_type: Optional[SubscriptionPlanType] = None,
    property_category: Optional[str] = None,
    property_type: Optional[str] = None,
    bhk_type: Optional[str] = None,
    area_sqft: Optional[float] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all active subscription plans."""
    try:
        query = {"is_active": True, "is_deleted": {"$ne": True}}
        
        if plan_type:
            query["plan_type"] = plan_type.value
        
        cursor = db.subscription_plans.find(query, {"_id": 0})
        plans = await cursor.to_list(length=50)
        plans = [
            plan for plan in plans
            if _target_matches(
                plan,
                plan_type=plan_type.value if plan_type else None,
                property_category=property_category,
                property_type=property_type,
                bhk_type=bhk_type,
                area_sqft=area_sqft,
            )
        ]
        
        return {
            "plans": plans,
            "total": len(plans)
        }
    
    except Exception as e:
        logger.error(f"Error fetching subscription plans: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription plans"
        )

@router.get("/plans/{plan_id}")
async def get_plan_details(
    plan_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get subscription plan details."""
    try:
        plan = await db.subscription_plans.find_one({"plan_id": plan_id, "is_deleted": {"$ne": True}}, {"_id": 0})
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan not found"
            )
        
        return plan
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching plan details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch plan details"
        )

class ValidateSubscriptionCouponRequest(BaseModel):
    code: str
    plan_id: str
    billing_cycle: str = "monthly"
    property_category: Optional[str] = None
    property_type: Optional[str] = None
    bhk_type: Optional[str] = None
    area_sqft: Optional[float] = None

@router.post("/validate-coupon")
async def validate_subscription_coupon(
    payload: ValidateSubscriptionCouponRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Validate a host subscription coupon against the selected plan/property size."""
    try:
        plan = await db.subscription_plans.find_one(
            {"plan_id": payload.plan_id, "is_active": True, "is_deleted": {"$ne": True}},
            {"_id": 0},
        )
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

        coupon = await db.coupons.find_one(
            {
                "code": payload.code.strip().upper(),
                "is_active": True,
                "coupon_type": "subscription",
            },
            {"_id": 0},
        )
        if not coupon or not _target_matches(
            coupon,
            plan_type=plan.get("plan_type"),
            property_category=payload.property_category,
            property_type=payload.property_type,
            bhk_type=payload.bhk_type,
            area_sqft=payload.area_sqft,
        ):
            return {"valid": False, "discount_amount": 0.0}

        amount_breakdown = _subscription_coupon_breakdown(plan, coupon, payload.billing_cycle)
        discount_amount = amount_breakdown["discount_amount"]
        return {
            "valid": True,
            "coupon": coupon,
            "discount_amount": discount_amount,
            "total_amount": amount_breakdown["total_amount"],
            "tax_amount": amount_breakdown["tax_amount"],
            "payable_amount": amount_breakdown["total_amount"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating subscription coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate subscription coupon"
        )

# ========== SUBSCRIPTION MANAGEMENT ==========

@router.post("/subscribe")
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new subscription for user."""
    try:
        # Get plan details
        plan = await db.subscription_plans.find_one(
            {"plan_id": subscription_data.plan_id, "is_deleted": {"$ne": True}},
            {"_id": 0},
        )
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )
        
        if not plan.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subscription plan is not active"
            )
        
        property_context = {}
        if subscription_data.property_id:
            property_context = await db.properties.find_one(
                {"property_id": subscription_data.property_id},
                {"_id": 0, "category": 1, "property_type": 1, "bhk_type": 1, "area_sqft": 1},
            ) or {}
            if property_context and not _target_matches(
                plan,
                plan_type=plan.get("plan_type"),
                property_category=property_context.get("category"),
                property_type=property_context.get("property_type"),
                bhk_type=property_context.get("bhk_type"),
                area_sqft=property_context.get("area_sqft"),
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This subscription plan is not valid for the selected property type",
                )

        # Calculate amount based on billing cycle, platform fee, coupon, and GST.
        coupon_code = subscription_data.coupon_code.strip().upper() if subscription_data.coupon_code else None
        coupon = None
        if coupon_code:
            coupon = await db.coupons.find_one(
                {"code": coupon_code, "is_active": True, "coupon_type": "subscription"},
                {"_id": 0},
            )
            if not coupon:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid subscription coupon code"
                )
            if not _target_matches(
                coupon,
                plan_type=plan.get("plan_type"),
                property_category=property_context.get("category"),
                property_type=property_context.get("property_type"),
                bhk_type=property_context.get("bhk_type"),
                area_sqft=property_context.get("area_sqft"),
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This coupon is not valid for the selected subscription plan"
                )
        amount_breakdown = _subscription_coupon_breakdown(plan, coupon, subscription_data.billing_cycle)
        discount_amount = amount_breakdown["discount_amount"]
        amount = amount_breakdown["total_amount"]
        
        # Calculate dates
        start_date = date.today()
        validity_days = plan.get("validity_days", 30)
        if not validity_days:
            validity_days = 30 if subscription_data.billing_cycle == "monthly" else 365
        end_date = start_date + timedelta(days=validity_days)
        
        # Create subscription
        subscription = Subscription(
            user_id=current_user["user_id"],
            property_id=subscription_data.property_id,
            plan_id=subscription_data.plan_id,
            plan_type=plan["plan_type"],
            billing_cycle=subscription_data.billing_cycle,
            amount=amount,
            status=SubscriptionStatus.TRIAL,
            start_date=start_date,
            end_date=end_date,
            trial_end_date=start_date + timedelta(days=90),  # 3-month trial
            coupon_code=coupon_code,
            discount_amount=discount_amount,
        )
        
        # Create Razorpay order for subscription
        razorpay_result = razorpay_service.create_order(
            amount=int(round(amount * 100)),  # Convert to paise
            receipt=subscription.subscription_id[:40]
        )
        
        if not razorpay_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create payment order"
            )
        
        # Store subscription
        subscription_dict = subscription.model_dump()
        subscription_dict["start_date"] = subscription_dict["start_date"].isoformat()
        subscription_dict["end_date"] = subscription_dict["end_date"].isoformat()
        if subscription_dict["trial_end_date"]:
            subscription_dict["trial_end_date"] = subscription_dict["trial_end_date"].isoformat()
        
        await db.subscriptions.insert_one(subscription_dict)
        
        logger.info(f"Subscription created: {subscription.subscription_id}")
        
        return {
            "subscription_id": subscription.subscription_id,
            "razorpay_order_id": razorpay_result["order"]["id"],
            "razorpay_key_id": razorpay_service.key_id,
            "is_mock": razorpay_service.is_mock,
            "amount": int(round(amount * 100)),
            "currency": "INR",
            "plan_name": plan["plan_name"],
            "plan_fee": amount_breakdown["plan_fee"],
            "platform_fee": amount_breakdown["platform_fee"],
            "tax_percent": amount_breakdown["tax_percent"],
            "tax_amount": amount_breakdown["tax_amount"],
            "coupon_code": coupon_code,
            "discount_amount": discount_amount,
            "total_amount": amount_breakdown["total_amount"],
            "payable_amount": amount,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription"
        )

@router.post("/confirm-subscription")
async def confirm_subscription_payment(
    subscription_id: str,
    razorpay_payment_id: str,
    razorpay_order_id: str,
    razorpay_signature: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Confirm subscription payment."""
    try:
        # Get subscription
        subscription = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0})
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        
        if subscription["user_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Verify payment signature
        is_valid = razorpay_service.verify_payment_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Update subscription status to active
        await db.subscriptions.update_one(
            {"subscription_id": subscription_id},
            {"$set": {
                "status": SubscriptionStatus.ACTIVE.value,
                "razorpay_subscription_id": razorpay_payment_id,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # Update property subscription status if property_id exists
        if subscription.get("property_id"):
            await db.properties.update_one(
                {"property_id": subscription["property_id"]},
                {"$set": {
                    "subscription_id": subscription_id,
                    "subscription_status": "active"
                }}
            )
        
        logger.info(f"Subscription confirmed: {subscription_id}")

        # Phase 15 — subscription revenue ledger
        try:
            from models.transaction import TransactionType
            from services.account_service import record_transaction
            sub_plan = await db.subscription_plans.find_one(
                {"plan_id": subscription.get("plan_id")}, {"_id": 0, "price_monthly": 1}
            )
            # amount was stored in subscription object
            sub_amount = int(round(subscription.get("amount", 0) * 100))
            await record_transaction(
                db,
                type=TransactionType.SUBSCRIPTION,
                amount=sub_amount,
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                user_id=subscription["user_id"],
                subscription_id=subscription_id,
                is_mock=razorpay_service.is_mock,
            )
        except Exception as txn_err:
            logger.warning(f"Failed to record subscription transaction: {txn_err}")

        await _send_subscription_email(
            db,
            subscription["user_id"],
            "subscription_activated",
            {**subscription, "razorpay_subscription_id": razorpay_payment_id},
        )

        return {
            "message": "Subscription activated successfully",
            "subscription_id": subscription_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm subscription"
        )

@router.post("/confirm-subscription-upi")
async def confirm_subscription_upi_payment(
    payload: ConfirmSubscriptionUpiRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Confirm a host subscription paid through the platform UPI QR."""
    upi_transaction_id = payload.upi_transaction_id.strip()
    if len(upi_transaction_id) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid UTR / transaction ID."
        )

    subscription = await db.subscriptions.find_one({"subscription_id": payload.subscription_id}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    if subscription["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    existing = await db.transactions.find_one(
        {"type": "subscription", "upi_transaction_id": upi_transaction_id},
        {"_id": 0}
    )
    if existing and existing.get("subscription_id") != payload.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This UTR / transaction ID is already linked to another subscription."
        )

    await db.subscriptions.update_one(
        {"subscription_id": payload.subscription_id},
        {"$set": {
            "status": SubscriptionStatus.ACTIVE.value,
            "upi_transaction_id": upi_transaction_id,
            "razorpay_subscription_id": upi_transaction_id,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    if subscription.get("property_id"):
        await db.properties.update_one(
            {"property_id": subscription["property_id"]},
            {"$set": {
                "subscription_id": payload.subscription_id,
                "subscription_status": "active"
            }}
        )

    try:
        from models.transaction import TransactionType
        from services.account_service import record_transaction
        sub_amount = int(round(subscription.get("amount", 0) * 100))
        await record_transaction(
            db,
            type=TransactionType.SUBSCRIPTION,
            amount=sub_amount,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=upi_transaction_id,
            upi_transaction_id=upi_transaction_id,
            user_id=subscription["user_id"],
            subscription_id=payload.subscription_id,
            notes="Host subscription paid by UPI QR",
            is_mock=razorpay_service.is_mock,
        )
    except Exception as txn_err:
        logger.warning(f"Failed to record UPI subscription transaction: {txn_err}")

    await _send_subscription_email(
        db,
        subscription["user_id"],
        "subscription_activated",
        {**subscription, "razorpay_subscription_id": upi_transaction_id},
        {"payment_id": upi_transaction_id},
    )

    return {
        "message": "Subscription activated successfully",
        "subscription_id": payload.subscription_id,
        "upi_transaction_id": upi_transaction_id
    }

@router.post("/subscribe/mock-pay")
async def mock_pay_subscription(
    subscription_id: str,
    razorpay_order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Demo-only: simulate subscription payment in mock mode."""
    if not razorpay_service.is_mock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mock payment is only available in demo mode.",
        )
    
    subscription = await db.subscriptions.find_one({"subscription_id": subscription_id})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    if subscription["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    mock = razorpay_service.mock_complete_payment(razorpay_order_id)
    if not mock.get("success"):
        raise HTTPException(status_code=500, detail="Mock payment failed")

    # Reuse confirmation logic via manual update (DRY)
    await db.subscriptions.update_one(
        {"subscription_id": subscription_id},
        {"$set": {
            "status": SubscriptionStatus.ACTIVE.value,
            "razorpay_subscription_id": mock["razorpay_payment_id"],
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    if subscription.get("property_id"):
        await db.properties.update_one(
            {"property_id": subscription["property_id"]},
            {"$set": {
                "subscription_id": subscription_id,
                "subscription_status": "active"
            }}
        )

    # Ledger
    try:
        from models.transaction import TransactionType
        from services.account_service import record_transaction
        sub_amount = int(round(subscription.get("amount", 0) * 100))
        await record_transaction(
            db,
            type=TransactionType.SUBSCRIPTION,
            amount=sub_amount,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=mock["razorpay_payment_id"],
            user_id=subscription["user_id"],
            subscription_id=subscription_id,
            is_mock=True,
        )
    except Exception as txn_err:
        logger.warning(f"Failed to record mock subscription transaction: {txn_err}")

    await _send_subscription_email(
        db,
        subscription["user_id"],
        "subscription_activated",
        {**subscription, "razorpay_subscription_id": mock["razorpay_payment_id"]},
    )

    return {
        "message": "Subscription activated (mock)",
        "subscription_id": subscription_id,
        "razorpay_payment_id": mock["razorpay_payment_id"],
        "razorpay_order_id": razorpay_order_id,
        "razorpay_signature": mock["razorpay_signature"],
    }

@router.get("/my-subscriptions")
async def get_user_subscriptions(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all subscriptions for current user."""
    try:
        cursor = db.subscriptions.find({"user_id": current_user["user_id"]}, {"_id": 0})
        subscriptions = await cursor.to_list(length=50)
        
        return {
            "subscriptions": subscriptions,
            "total": len(subscriptions)
        }
    
    except Exception as e:
        logger.error(f"Error fetching user subscriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscriptions"
        )

# ========== REGISTRATION FEE ==========

@router.post("/registration-fee")
async def create_registration_fee_order(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create Razorpay order for host registration fee.

    Idempotent on already-paid hosts — returns 200 with `already_paid: true`
    instead of erroring so the frontend can short-circuit cleanly without
    spurious "Failed to create order" messages on repeat clicks.
    """
    try:
        user = await db.users.find_one({"user_id": current_user["user_id"]})

        if user and user.get("registration_fee_paid", False):
            return {
                "already_paid": True,
                "message": "Registration fee already paid",
                "trial_activated": True,
                "registration_fee_payment_id": user.get("registration_fee_payment_id"),
            }

        razorpay_result = razorpay_service.create_order(
            amount=REGISTRATION_FEE_AMOUNT,
            receipt=f"reg_fee_{current_user['user_id']}"
        )
        
        if not razorpay_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create payment order"
            )
        
        return {
            "razorpay_order_id": razorpay_result["order"]["id"],
            "razorpay_key_id": razorpay_service.key_id,
            "is_mock": razorpay_service.is_mock,
            "amount": REGISTRATION_FEE_AMOUNT,
            "currency": "INR",
            "description": "X-Space360 Host Registration Fee"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating registration fee order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create registration fee order"
        )

@router.post("/confirm-registration-fee")
async def confirm_registration_fee_payment(
    payload: ConfirmRegistrationFeeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Confirm registration fee payment.

    Idempotent: if the user has already paid, returns 200 'already paid' without
    overwriting their existing payment_id or duplicating the ledger row.
    """
    try:
        # Idempotency guard — short-circuit if already paid
        user = await db.users.find_one(
            {"user_id": current_user["user_id"]},
            {"_id": 0, "registration_fee_paid": 1, "registration_fee_payment_id": 1},
        )
        if user and user.get("registration_fee_paid", False):
            return {
                "already_paid": True,
                "message": "Registration fee already paid",
                "trial_activated": True,
                "trial_period_days": 90,
                "registration_fee_payment_id": user.get("registration_fee_payment_id"),
            }

        # Verify payment signature
        is_valid = razorpay_service.verify_payment_signature(
            payload.razorpay_order_id,
            payload.razorpay_payment_id,
            payload.razorpay_signature,
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Update user registration fee status
        await db.users.update_one(
            {"user_id": current_user["user_id"]},
            {"$set": {
                "registration_fee_paid": True,
                "registration_fee_payment_id": payload.razorpay_payment_id,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        logger.info(f"Registration fee paid: {current_user['user_id']}")

        # Phase 15 — registration fee ledger
        try:
            from models.transaction import TransactionType
            from services.account_service import record_transaction
            await record_transaction(
                db,
                type=TransactionType.REGISTRATION_FEE,
                amount=int(REGISTRATION_FEE_AMOUNT),
                razorpay_order_id=payload.razorpay_order_id,
                razorpay_payment_id=payload.razorpay_payment_id,
                user_id=current_user["user_id"],
                is_mock=razorpay_service.is_mock,
            )
        except Exception as txn_err:
            logger.warning(f"Failed to record registration-fee transaction: {txn_err}")

        return {
            "message": "Registration fee paid successfully",
            "trial_activated": True,
            "trial_period_days": 90
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming registration fee: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm registration fee payment"
        )


@router.post("/registration-fee/mock-pay")
async def mock_pay_registration_fee(
    razorpay_order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Demo-only: simulate the registration fee payment when running in mock mode."""
    if not razorpay_service.is_mock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mock payment is only available in demo mode.",
        )

    user = await db.users.find_one({"user_id": current_user["user_id"]})
    if user.get("registration_fee_paid", False):
        return {"message": "Registration fee already paid", "trial_activated": True}

    mock = razorpay_service.mock_complete_payment(razorpay_order_id)
    if not mock.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=mock.get("error", "Mock payment failed"),
        )

    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {
            "registration_fee_paid": True,
            "registration_fee_payment_id": mock["razorpay_payment_id"],
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    logger.info(f"[MOCK] Registration fee paid: {current_user['user_id']}")

    # Phase 15 — registration fee ledger
    try:
        from models.transaction import TransactionType
        from services.account_service import record_transaction
        await record_transaction(
            db,
            type=TransactionType.REGISTRATION_FEE,
            amount=int(REGISTRATION_FEE_AMOUNT),
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=mock["razorpay_payment_id"],
            user_id=current_user["user_id"],
            is_mock=True,
        )
    except Exception as txn_err:
        logger.warning(f"Failed to record mock registration-fee transaction: {txn_err}")

    return {
        "message": "Registration fee paid (mock)",
        "trial_activated": True,
        "trial_period_days": 90,
        "razorpay_payment_id": mock["razorpay_payment_id"],
        "razorpay_order_id": razorpay_order_id,
        "razorpay_signature": mock["razorpay_signature"],
        "mock": True,
    }

# ========== ADMIN: SUBSCRIPTION PLAN MANAGEMENT ==========

@router.post("/admin/plans")
async def create_subscription_plan(
    plan_name: str,
    plan_type: SubscriptionPlanType,
    price_monthly: float,
    price_annual: float,
    description: str,
    validity_days: int = 30,
    platform_fee: float = 0.0,
    tax_percent: float = 18.0,
    sqft_range: Optional[str] = None,
    property_category: Optional[str] = None,
    property_type: Optional[str] = None,
    bhk_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new subscription plan (Admin only)."""
    try:
        if current_user["role"] != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        plan = SubscriptionPlan(
            plan_type=plan_type,
            plan_name=plan_name,
            price_monthly=price_monthly,
            price_annual=price_annual,
            platform_fee=platform_fee,
            tax_percent=tax_percent,
            description=description,
            validity_days=validity_days,
            sqft_range=sqft_range,
            property_category=property_category,
            property_type=property_type,
            bhk_type=bhk_type,
        )
        
        plan_dict = plan.model_dump()
        await db.subscription_plans.insert_one(plan_dict)
        
        logger.info(f"Subscription plan created: {plan.plan_id}")
        return {"message": "Subscription plan created successfully", "plan_id": plan.plan_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription plan"
        )

@router.get("/admin/plans")
async def get_admin_subscription_plans(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all subscription plans, including inactive ones (Admin only)."""
    try:
        if current_user["role"] != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        cursor = db.subscription_plans.find({"is_deleted": {"$ne": True}}, {"_id": 0})
        plans = await cursor.to_list(length=100)
        return {
            "plans": plans,
            "total": len(plans)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin plans: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch plans"
        )

@router.patch("/admin/plans/{plan_id}/toggle")
async def toggle_subscription_plan_status(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Toggle subscription plan active status (Admin only)."""
    try:
        if current_user["role"] != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        plan = await db.subscription_plans.find_one({"plan_id": plan_id, "is_deleted": {"$ne": True}})
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )
            
        new_status = not plan.get("is_active", True)
        await db.subscription_plans.update_one(
            {"plan_id": plan_id, "is_deleted": {"$ne": True}},
            {"$set": {"is_active": new_status}}
        )
        
        logger.info(f"Subscription plan toggled to {new_status} for: {plan_id}")
        return {
            "message": f"Subscription plan status updated to {'active' if new_status else 'inactive'}",
            "is_active": new_status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling subscription plan status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle subscription plan status"
        )

@router.delete("/admin/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Soft-delete a subscription plan (Admin only)."""
    try:
        if current_user["role"] != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        result = await db.subscription_plans.update_one(
            {"plan_id": plan_id, "is_deleted": {"$ne": True}},
            {"$set": {
                "is_active": False,
                "is_deleted": True,
                "deleted_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan not found"
            )
        
        logger.info(f"Subscription plan deleted: {plan_id}")
        return {"message": "Subscription plan deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting subscription plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete subscription plan"
        )

@router.put("/admin/plans/{plan_id}")
async def update_subscription_plan(
    plan_id: str,
    plan_name: Optional[str] = None,
    plan_type: Optional[SubscriptionPlanType] = None,
    price_monthly: Optional[float] = None,
    price_annual: Optional[float] = None,
    platform_fee: Optional[float] = None,
    tax_percent: Optional[float] = None,
    description: Optional[str] = None,
    validity_days: Optional[int] = None,
    is_active: Optional[bool] = None,
    sqft_range: Optional[str] = None,
    property_category: Optional[str] = None,
    property_type: Optional[str] = None,
    bhk_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update an existing subscription plan (Admin only)."""
    try:
        if current_user["role"] != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        update_data = {}
        if plan_name: update_data["plan_name"] = plan_name
        if plan_type: update_data["plan_type"] = plan_type.value
        if price_monthly is not None: update_data["price_monthly"] = price_monthly
        if price_annual is not None: update_data["price_annual"] = price_annual
        if platform_fee is not None: update_data["platform_fee"] = platform_fee
        if tax_percent is not None: update_data["tax_percent"] = tax_percent
        if description: update_data["description"] = description
        if validity_days is not None: update_data["validity_days"] = validity_days
        if is_active is not None: update_data["is_active"] = is_active
        if sqft_range is not None: update_data["sqft_range"] = sqft_range
        if property_category is not None: update_data["property_category"] = property_category
        if property_type is not None: update_data["property_type"] = property_type
        if bhk_type is not None: update_data["bhk_type"] = bhk_type
        
        if not update_data:
            return {"message": "No changes provided"}
            
        result = await db.subscription_plans.update_one(
            {"plan_id": plan_id, "is_deleted": {"$ne": True}},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan not found"
            )
        
        logger.info(f"Subscription plan updated: {plan_id}")
        return {"message": "Subscription plan updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subscription plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update subscription plan"
        )

@router.post("/admin/sweep")
async def trigger_subscription_sweep(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Manually trigger the subscription expiration and warning sweep (Admin only)."""
    try:
        if current_user["role"] != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        from services.subscription_sweep import sweep_subscriptions
        await sweep_subscriptions(db)
        return {"message": "Subscription status sweep executed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering subscription sweep: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute subscription status sweep"
        )
