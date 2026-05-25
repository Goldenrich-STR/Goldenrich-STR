import asyncio
import os
import uuid
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend root on path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))

load_dotenv(Path(__file__).resolve().parent / ".env")

from utils.pg_adapter import PGAdapter
from models.transaction import TransactionType, TransactionStatus

async def seed_transactions():
    dsn = os.environ.get('POSTGRES_URL')
    db = PGAdapter(dsn)
    await db.connect()
    
    # We'll create transactions for the last 6 months to see the MRR chart
    now = datetime.now(timezone.utc)
    
    types = [
        TransactionType.BOOKING_PAYMENT,
        TransactionType.REGISTRATION_FEE,
        TransactionType.SUBSCRIPTION
    ]
    
    count = 0
    for i in range(100):
        # Random date in last 180 days
        days_ago = random.randint(0, 180)
        txn_date = now - timedelta(days=days_ago)
        
        txn_type = random.choice(types)
        amount = random.randint(10000, 500000) # 100 to 5000 INR
        
        txn_data = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:8]}",
            "type": txn_type.value,
            "amount": amount,
            "status": TransactionStatus.SUCCESS.value,
            "currency": "INR",
            "created_at": txn_date.isoformat(),
            "user_id": f"user_{random.randint(1, 10)}",
            "host_id": f"user_{random.randint(1, 5)}", # Added host_id
            "is_mock": True,
            "razorpay_payment_id": f"pay_{uuid.uuid4().hex[:12]}"
        }
        
        await db.transactions.insert_one(txn_data)
        count += 1

    # Create some payouts too
    for i in range(20):
        days_ago = random.randint(0, 30)
        txn_date = now - timedelta(days=days_ago)
        
        amount = random.randint(50000, 200000)
        
        payout_data = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:8]}",
            "type": TransactionType.PAYOUT.value,
            "amount": amount,
            "status": TransactionStatus.SUCCESS.value,
            "currency": "INR",
            "created_at": txn_date.isoformat(),
            "host_id": f"user_{random.randint(1, 10)}",
            "is_mock": True,
            "razorpay_payout_id": f"pout_{uuid.uuid4().hex[:12]}"
        }
        await db.transactions.insert_one(payout_data)
        count += 1
        
    print(f"Successfully seeded {count} transactions into PostgreSQL")
    await db.close()

if __name__ == "__main__":
    asyncio.run(seed_transactions())
