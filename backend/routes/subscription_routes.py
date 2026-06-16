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

async def get_db():
    from server import db_instance
    return db_instance

REGISTRATION_FEE_AMOUNT = int(os.getenv("REGISTRATION_FEE_AMOUNT", "50000"))  # ₹500 in paise

# ========== SUBSCRIPTION PLANS (PUBLIC) ==========

@router.get("/plans")
async def get_subscription_plans(
    plan_type: Optional[SubscriptionPlanType] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all active subscription plans."""
    try:
        query = {"is_active": True}
        
        if plan_type:
            query["plan_type"] = plan_type.value
        
        cursor = db.subscription_plans.find(query, {"_id": 0})
        plans = await cursor.to_list(length=50)
        
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
        plan = await db.subscription_plans.find_one({"plan_id": plan_id}, {"_id": 0})
        
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

# ========== SUBSCRIPTION MANAGEMENT ==========

class ValidateCouponRequest(BaseModel):
    code: str
    plan_id: str
    billing_cycle: str

@router.post("/validate-coupon")
async def validate_subscription_coupon(
    payload: ValidateCouponRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Validate a subscription coupon code and return discount details."""
    try:
        plan = await db.subscription_plans.find_one({"plan_id": payload.plan_id}, {"_id": 0})
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )
        
        amount = plan["price_monthly"] if payload.billing_cycle == "monthly" else plan["price_annual"]
        
        code = payload.code.strip().upper()
        db_coupon = await db.coupons.find_one({"code": code, "is_active": True, "coupon_type": "subscription"})
        
        if not db_coupon:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid coupon code"
            )
        
        discount_amount = 0.0
        if db_coupon.get("discount_type") == "percentage":
            discount_amount = round(amount * (db_coupon.get("discount_value", 0) / 100), 2)
        else:
            discount_amount = float(db_coupon.get("discount_value", 0))
            
        discounted_amount = max(0.0, amount - discount_amount)
        
        return {
            "valid": True,
            "code": code,
            "discount_type": db_coupon.get("discount_type"),
            "discount_value": db_coupon.get("discount_value"),
            "discount_amount": discount_amount,
            "original_amount": amount,
            "discounted_amount": discounted_amount
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating subscription coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate coupon"
        )

@router.post("/subscribe")
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new subscription for user."""
    try:
        # Get plan details
        plan = await db.subscription_plans.find_one({"plan_id": subscription_data.plan_id}, {"_id": 0})
        
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
        
        # Calculate amount based on billing cycle
        amount = plan["price_monthly"] if subscription_data.billing_cycle == "monthly" else plan["price_annual"]
        
        # Apply coupon code if provided
        discount_amount = 0.0
        applied_coupon_code = None
        if subscription_data.coupon_code:
            code = subscription_data.coupon_code.strip().upper()
            db_coupon = await db.coupons.find_one({"code": code, "is_active": True, "coupon_type": "subscription"})
            if not db_coupon:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid coupon code"
                )
            
            applied_coupon_code = code
            if db_coupon.get("discount_type") == "percentage":
                discount_amount = round(amount * (db_coupon.get("discount_value", 0) / 100), 2)
            else:
                discount_amount = float(db_coupon.get("discount_value", 0))
        
        discounted_amount = max(0.0, amount - discount_amount)
        
        # Calculate dates
        start_date = date.today()
        if subscription_data.billing_cycle == "monthly":
            end_date = start_date + timedelta(days=30)
        else:
            end_date = start_date + timedelta(days=365)
        
        # Create subscription
        subscription = Subscription(
            user_id=current_user["user_id"],
            property_id=subscription_data.property_id,
            plan_id=subscription_data.plan_id,
            plan_type=plan["plan_type"],
            billing_cycle=subscription_data.billing_cycle,
            amount=discounted_amount,
            coupon_code=applied_coupon_code,
            discount_amount=discount_amount,
            status=SubscriptionStatus.TRIAL,
            start_date=start_date,
            end_date=end_date,
            trial_end_date=start_date + timedelta(days=90)  # 3-month trial
        )
        
        # Create Razorpay order for subscription (if discounted amount > 0)
        razorpay_order_id = None
        if discounted_amount > 0.0:
            razorpay_result = razorpay_service.create_order(
                amount=int(discounted_amount * 100),  # Convert to paise
                receipt=subscription.subscription_id[:40]
            )
            
            if not razorpay_result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create payment order"
                )
            razorpay_order_id = razorpay_result["order"]["id"]
        else:
            razorpay_order_id = f"free_{subscription.subscription_id}"
        
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
            "razorpay_order_id": razorpay_order_id,
            "razorpay_key_id": razorpay_service.key_id,
            "amount": int(discounted_amount * 100),
            "currency": "INR",
            "plan_name": plan["plan_name"],
            "discount_amount": discount_amount,
            "coupon_code": applied_coupon_code
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
        
        # Verify payment signature (unless it's a free subscription)
        if subscription.get("amount", 0.0) > 0.0:
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
                "razorpay_subscription_id": razorpay_payment_id if subscription.get("amount", 0.0) > 0.0 else "free_promo",
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

        # Send notifications (In-app, SMS, Email Invoice)
        try:
            from services.notification_service import send_multi_channel_notification
            from models.notification import NotificationType, NotificationChannel
            
            sub_plan_name = "Goldenrich STR Subscription"
            plan_details = await db.subscription_plans.find_one({"plan_id": subscription.get("plan_id")}, {"_id": 0})
            if plan_details:
                sub_plan_name = plan_details.get("plan_name", sub_plan_name)

            title = "Subscription Payment Successful!"
            message = f"Your payment of ₹{subscription.get('amount', 0)} for {sub_plan_name} has been processed successfully. Your subscription ID is {subscription_id}."
            
            await send_multi_channel_notification(
                db=db,
                user_id=subscription["user_id"],
                notification_type=NotificationType.PROPERTY_APPROVED,
                title=title,
                message=message,
                channels=[NotificationChannel.IN_APP, NotificationChannel.SMS, NotificationChannel.EMAIL],
                data={
                    "subscription_id": subscription_id,
                    "property_id": subscription.get("property_id"),
                    "plan_name": sub_plan_name,
                    "billing_cycle": subscription.get("billing_cycle", "monthly"),
                    "amount": subscription.get("amount", 0)
                }
            )
        except Exception as notif_err:
            logger.warning(f"Failed to send subscription confirmation notification: {notif_err}")

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

    if subscription.get("amount", 0.0) == 0.0 or razorpay_order_id.startswith("free_"):
        mock = {
            "success": True,
            "razorpay_payment_id": "free_promo",
            "razorpay_signature": "free_promo_sig"
        }
    else:
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

    # Send notifications (In-app, SMS, Email Invoice)
    try:
        from services.notification_service import send_multi_channel_notification
        from models.notification import NotificationType, NotificationChannel
        
        sub_plan_name = "Goldenrich STR Subscription"
        plan_details = await db.subscription_plans.find_one({"plan_id": subscription.get("plan_id")}, {"_id": 0})
        if plan_details:
            sub_plan_name = plan_details.get("plan_name", sub_plan_name)

        title = "Subscription Payment Successful!"
        message = f"Your payment of ₹{subscription.get('amount', 0)} for {sub_plan_name} has been processed successfully. Your subscription ID is {subscription_id}."
        
        await send_multi_channel_notification(
            db=db,
            user_id=subscription["user_id"],
            notification_type=NotificationType.PROPERTY_APPROVED,
            title=title,
            message=message,
            channels=[NotificationChannel.IN_APP, NotificationChannel.SMS, NotificationChannel.EMAIL],
            data={
                "subscription_id": subscription_id,
                "property_id": subscription.get("property_id"),
                "plan_name": sub_plan_name,
                "billing_cycle": subscription.get("billing_cycle", "monthly"),
                "amount": subscription.get("amount", 0)
            }
        )
    except Exception as notif_err:
        logger.warning(f"Failed to send subscription confirmation notification: {notif_err}")

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
            description=description
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
@router.delete("/admin/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Deactivate a subscription plan (Admin only)."""
    try:
        if current_user["role"] != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        result = await db.subscription_plans.update_one(
            {"plan_id": plan_id},
            {"$set": {"is_active": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan not found"
            )
        
        logger.info(f"Subscription plan deactivated: {plan_id}")
        return {"message": "Subscription plan deactivated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating subscription plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate subscription plan"
        )

@router.put("/admin/plans/{plan_id}")
async def update_subscription_plan(
    plan_id: str,
    plan_name: Optional[str] = None,
    plan_type: Optional[SubscriptionPlanType] = None,
    price_monthly: Optional[float] = None,
    price_annual: Optional[float] = None,
    description: Optional[str] = None,
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
        if description: update_data["description"] = description
        
        if not update_data:
            return {"message": "No changes provided"}
            
        result = await db.subscription_plans.update_one(
            {"plan_id": plan_id},
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
