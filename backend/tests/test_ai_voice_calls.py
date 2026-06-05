import os
import pytest
import requests
from dotenv import load_dotenv

if os.path.exists("/app/frontend/.env"):
    load_dotenv("/app/frontend/.env")
    load_dotenv("/app/backend/.env")
else:
    import pathlib
    _base_dir = pathlib.Path(__file__).parent.parent.parent
    load_dotenv(_base_dir / "frontend" / ".env")
    load_dotenv(_base_dir / "backend" / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@propnest.com", "password": "admin123"}

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

@pytest.fixture(scope="module")
def db():
    from pymongo import MongoClient
    client = MongoClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]

def _auth(t):
    return {"Authorization": f"Bearer {t}"}

def test_ai_agent_lifecycle(admin_token, db):
    # 1. List agents
    r = requests.get(f"{API}/ai-calls/agents", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200
    
    # 2. Create a new AI Calling Agent in Marathi
    new_agent = {
        "agent_name": "Mayur Marathi AI",
        "voice_type": "Neural",
        "language": "Marathi",
        "greeting_message": "Namaskar"
    }
    r = requests.post(f"{API}/ai-calls/agents", json=new_agent, headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200
    created = r.json().get("agent")
    assert created["agent_name"] == "Mayur Marathi AI"
    assert created["language"] == "Marathi"
    assert created["greeting_message"] == "Namaskar"
    agent_id = created["agent_id"]
    
    try:
        # 3. Activate the new agent
        r = requests.patch(f"{API}/ai-calls/agents/{agent_id}/active", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        
        # Check that it is active and others are inactive
        r = requests.get(f"{API}/ai-calls/agents", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        agents_list = r.json().get("agents", [])
        active_agents = [a for a in agents_list if a["is_active"]]
        assert len(active_agents) == 1
        assert active_agents[0]["agent_id"] == agent_id
        
        # 4. Trigger simulated AI call (verify script is generated in Marathi with greeting)
        mock_booking = {
            "booking_id": "BK_TEST_AI_123",
            "host_id": "HST_TEST",
            "guest_id": "GST_TEST",
            "property_id": "PROP_TEST",
            "check_in_date": "2026-06-01",
            "check_out_date": "2026-06-05",
            "base_amount": 10000,
            "service_fee": 1000,
            "booking_status": "confirmed"
        }
        
        # Seed test users and property in the DB to let trigger_ai_booking_call succeed
        db.users.insert_one({"user_id": "GST_TEST", "full_name": "Rohan Patil", "phone": "9876543210"})
        db.users.insert_one({"user_id": "HST_TEST", "full_name": "Mayur More", "phone": "9999988888"})
        db.properties.insert_one({"property_id": "PROP_TEST", "title": "Golden Beach Villa"})
        
        try:
            from services.ai_agent_service import AIAgentService
            import asyncio
            
            # Run trigger_ai_booking_call coroutine
            loop = asyncio.get_event_loop()
            res = loop.run_until_complete(AIAgentService.trigger_ai_booking_call(db, mock_booking))
            assert res["success"] is True
            
            # Check the call logs in the DB
            guest_call = db.ai_calls.find_one({"booking_id": "BK_TEST_AI_123", "role": "guest"})
            host_call = db.ai_calls.find_one({"booking_id": "BK_TEST_AI_123", "role": "host"})
            
            assert guest_call is not None
            assert host_call is not None
            
            # Check agent name is used
            assert guest_call["agent_name"] == "Mayur Marathi AI"
            assert host_call["agent_name"] == "Mayur Marathi AI"
            
            # Check script contains Marathi words and greeting
            assert "Namaskar, Rohan Patil!" in guest_call["script"]
            assert "Me X-Space360 AI Concierge bolat aahe." in guest_call["script"]
            assert "Namaskar, Mayur More!" in host_call["script"]
            assert "Me X-Space360 AI Agent bolat aahe." in host_call["script"]
            
            # Test listing all calls
            r = requests.get(f"{API}/ai-calls/all-calls", headers=_auth(admin_token), timeout=15)
            assert r.status_code == 200
            all_calls = r.json().get("calls", [])
            assert len(all_calls) >= 2
            
        finally:
            # Clean up seeded mock records
            db.users.delete_one({"user_id": "GST_TEST"})
            db.users.delete_one({"user_id": "HST_TEST"})
            db.properties.delete_one({"property_id": "PROP_TEST"})
            db.ai_calls.delete_many({"booking_id": "BK_TEST_AI_123"})
            
    finally:
        # Clean up agent
        r = requests.delete(f"{API}/ai-calls/agents/{agent_id}", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
