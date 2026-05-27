# Golden Rich Stay

A multi-role short-term rental platform for the Indian market.

| Area | Tech |
|---|---|
| Frontend | React 19 (CRA), Tailwind, Leaflet, recharts, Razorpay JS SDK |
| Backend | FastAPI, JWT, asyncio background workers |
| Database | PostgreSQL via asyncpg adapter |
| Payments | Razorpay orders/payments/refunds and RazorpayX payouts |
| Messaging | MSG91 SMS/WhatsApp, SMTP email |
| Auth | JWT with phone OTP for registration |

## Quick Start

```bash
# 1. Copy env templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Fill POSTGRES_URL and JWT_SECRET_KEY at minimum.
# Leave Razorpay / MSG91 / SMTP empty to run in mock mode.

# 2. Backend
cd backend
pip install -r requirements.txt
python setup_pg.py
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 3. Bootstrap demo data, one time
python create_employee_user.py
python create_broker_user.py
python seed_demo_properties.py

# 4. Frontend
cd ../frontend
npm install
npm start
```

App: http://localhost:3000
API: http://localhost:8001/api
Docs: http://localhost:8001/docs

## Environment

The app is PostgreSQL-first now:

```env
DATABASE_TYPE=postgres
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/str_project
```

`MONGO_URL` and `DB_NAME` remain in the template only because some legacy scripts/tests still have Mongo fallback paths. For normal local, GitHub, and EC2 deployment use PostgreSQL.

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the deployment checklist. Keep real values only on the server or in a secret manager. Do not commit `.env` files.

## Testing

```bash
cd backend
set DATABASE_TYPE=postgres
set POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/str_project
pytest tests/ -q
```

## Documentation

* [memory/PRD.md](./memory/PRD.md) - phase-by-phase product history
* [DEPLOYMENT.md](./DEPLOYMENT.md) - production deployment guide
* [backend/services/VERIFICATION_WORKFLOW.md](./backend/services/VERIFICATION_WORKFLOW.md) - property-verification state machine
