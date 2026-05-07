# Golden-X-Host

A multi-role short-term rental platform for the Indian market.
**Frozen MVP release candidate · 125/125 backend tests green.**

| Area | Tech |
|---|---|
| Frontend | React 19 (CRA), Tailwind, Leaflet, recharts, Razorpay JS SDK |
| Backend  | FastAPI, Motor (async MongoDB), JWT, asyncio background workers |
| Database | MongoDB |
| Payments | Razorpay (orders/payments/refunds + RazorpayX payouts) |
| Messaging | MSG91 (SMS + WhatsApp), SMTP email |
| Auth     | JWT with phone-OTP for registration |

## Quick start (local)

```bash
# 1. Copy env templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
#    → fill in MONGO_URL + JWT_SECRET at minimum
#    → leave Razorpay / MSG91 / SMTP empty to run in mock mode

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 3. Bootstrap demo data (one-time)
python create_admin_user.py
python create_employee_user.py
python create_broker_user.py
python seed_demo_properties.py

# 4. Frontend
cd ../frontend
yarn install
yarn start
```

App: http://localhost:3000 · API: http://localhost:8001/api · Docs: http://localhost:8001/docs

## Production deployment

See **[`DEPLOYMENT.md`](./DEPLOYMENT.md)** for the full guide:
* AWS ECS Fargate task definition
* CloudFront / S3 frontend hosting
* Environment-variable checklist
* Cut-over checklist
* Known limitations & accepted MVP trade-offs

## Testing

```bash
cd backend
export REACT_APP_BACKEND_URL=http://localhost:8001
pytest tests/ -q
```

## Documentation

* [`memory/PRD.md`](./memory/PRD.md) — phase-by-phase product history
* [`memory/test_credentials.md`](./memory/test_credentials.md) — seed account logins
* [`DEPLOYMENT.md`](./DEPLOYMENT.md) — production deployment guide
* [`backend/services/VERIFICATION_WORKFLOW.md`](./backend/services/VERIFICATION_WORKFLOW.md) — property-verification state machine
