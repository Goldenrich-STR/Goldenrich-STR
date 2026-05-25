import asyncio
import os
import json
import asyncpg
from dotenv import load_dotenv
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    load_dotenv(r"D:\STR_Project\STR_Project\backend\.env")
    conn = await asyncpg.connect(os.environ['POSTGRES_URL'])
    
    print("Connected to database. Checking/creating missing propnest users...")
    
    # 1. Create broker user
    existing_broker = await conn.fetchrow("SELECT id, data FROM users WHERE data->>'email' = $1", "broker@propnest.com")
    broker_id = "user_broker_propnest"
    if existing_broker:
        print("Broker broker@propnest.com already exists.")
        broker_data = json.loads(existing_broker['data'])
        broker_id = broker_data.get("user_id", broker_id)
    else:
        broker_data = {
            "user_id": broker_id,
            "email": "broker@propnest.com",
            "phone": "+919876543212",
            "password_hash": pwd_context.hash("broker123"),
            "full_name": "Vikram Joshi",
            "role": "broker",
            "city": "Pune",
            "region": "Maharashtra",
            "profile_image": "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb",
            "lg_code": "LG001",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "registration_fee_paid": True,
            "terms_accepted": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        await conn.execute("INSERT INTO users (data) VALUES ($1)", json.dumps(broker_data))
        print("Created broker broker@propnest.com.")
        
    # 2. Create employee user
    existing_employee = await conn.fetchrow("SELECT id, data FROM users WHERE data->>'email' = $1", "employee@propnest.com")
    if existing_employee:
        print("Employee employee@propnest.com already exists.")
    else:
        employee_data = {
            "user_id": "user_employee_propnest",
            "email": "employee@propnest.com",
            "phone": "+919876543213",
            "password_hash": pwd_context.hash("employee123"),
            "full_name": "Sneha Kulkarni",
            "role": "employee",
            "city": "Mumbai",
            "employee_region": "Maharashtra",
            "profile_image": "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "registration_fee_paid": True,
            "terms_accepted": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        await conn.execute("INSERT INTO users (data) VALUES ($1)", json.dumps(employee_data))
        print("Created employee employee@propnest.com.")

    # 3. Assign host@propnest.com to the broker
    existing_host = await conn.fetchrow("SELECT id, data FROM users WHERE data->>'email' = $1", "host@propnest.com")
    if existing_host:
        host_data = json.loads(existing_host['data'])
        host_data["broker_id"] = broker_id
        host_data["lg_code"] = "LG001"
        await conn.execute("UPDATE users SET data = $1 WHERE id = $2", json.dumps(host_data), existing_host['id'])
        print("Assigned host@propnest.com to the broker.")
        
    # 4. Make sure all properties have the broker_id
    properties = await conn.fetch("SELECT id, data FROM properties")
    for prop in properties:
        prop_data = json.loads(prop['data'])
        if prop_data.get("owner_id") == host_data.get("user_id"):
            prop_data["broker_id"] = broker_id
            await conn.execute("UPDATE properties SET data = $1 WHERE id = $2", json.dumps(prop_data), prop['id'])
            print(f"Assigned property {prop_data.get('property_id')} to broker {broker_id}.")
            
    await conn.close()
    print("Done seeding missing propnest users and mappings!")

if __name__ == '__main__':
    asyncio.run(main())
