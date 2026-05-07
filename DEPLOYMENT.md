# Golden-X-Host — Production Deployment Guide

**Release Candidate:** MVP v1.0 · **Frozen:** May 2026
**Final regression:** 125/125 backend pytests green across Phase 6–18.

---

## 1 · System architecture

```
                    ┌────────────────────────────┐
                    │     Cloudflare / ALB       │
                    │   TLS · WAF · rate-limit   │
                    └────────────┬───────────────┘
                                 │
       ┌─────────────────────────┴─────────────────────────┐
       │                                                   │
┌──────▼──────┐                                  ┌─────────▼─────────┐
│  Frontend   │   /api/* reverse-proxied to       │  Backend (FastAPI) │
│  React SPA  │   the FastAPI service             │  + 3 background    │
│  CRA build  │ ◀────────────────────────────────▶│  asyncio sweepers  │
│  (S3+CF or  │                                   │  (uvicorn workers) │
│   Amplify)  │                                   └─────────┬──────────┘
└─────────────┘                                             │
                                                            ▼
                                                 ┌──────────────────┐
                                                 │  MongoDB Atlas   │
                                                 │  (M10+ for prod) │
                                                 └──────────────────┘
                                              optional: Redis (OTP storage)
```

**Background asyncio jobs** (run inside the FastAPI worker process — no Celery):

| Job | Interval | Env override |
|---|---|---|
| Soft-lock reaper | 30 s | `SOFT_LOCK_REAPER_INTERVAL` |
| Payout eligibility sweeper | 1 h | `PAYOUT_SWEEP_INTERVAL` |
| iCal external-feed sync | 30 min | `ICAL_SWEEP_INTERVAL`, `ICAL_MIN_FRESHNESS` |
| Review-request reminder | 1 h | `REVIEW_REMINDER_INTERVAL`, `REVIEW_REMINDER_DELAY_DAYS`, `REVIEW_REMINDER_LOOKBACK_DAYS` |

When you scale to multiple FastAPI workers, give each its own jitter (or pin background jobs to a single worker pod) — see §7.

---

## 2 · Environment variables checklist

> Place values in `backend/.env` and `frontend/.env`. **Never** commit either file. Use AWS Secrets Manager / SSM Parameter Store in production; mount via environment variable injection.

### Backend — `/app/backend/.env`

| Variable | Required | Purpose | Example / default |
|---|---|---|---|
| `MONGO_URL` | ✅ | MongoDB connection string | `mongodb+srv://user:pwd@cluster0.mongodb.net` |
| `DB_NAME` | ✅ | Mongo database name | `propnest_db` (kept for backwards compatibility) |
| `JWT_SECRET` | ✅ | Symmetric secret for signing JWTs | random 32+ byte hex |
| `JWT_ALGORITHM` | ⛓️ | JWT alg | `HS256` |
| `JWT_EXPIRE_MINUTES` | ⛓️ | Token lifetime | `1440` (24 h) |
| `RAZORPAY_KEY_ID` | 💳 | Razorpay key (live or test) | `rzp_live_…` |
| `RAZORPAY_KEY_SECRET` | 💳 | Razorpay secret | `…` |
| `RAZORPAYX_ACCOUNT_NUMBER` | 💳 | RazorpayX account for live host payouts | `2323230012345678` |
| `MSG91_AUTH_KEY` | 📱 | MSG91 auth key for SMS+WhatsApp | `…` |
| `MSG91_SENDER_ID` | 📱 | MSG91 sender ID | `GLDXHST` |
| `MSG91_WHATSAPP_TEMPLATE_ID` | 📱 | Approved WhatsApp template | `…` |
| `EMAIL_SMTP_HOST` | ✉️ | SMTP host (e.g. SES) | `email-smtp.ap-south-1.amazonaws.com` |
| `EMAIL_SMTP_PORT` | ✉️ | SMTP port | `587` |
| `EMAIL_SMTP_USER` | ✉️ | SMTP user | `AKIAxxx` |
| `EMAIL_SMTP_PASSWORD` | ✉️ | SMTP password | `…` |
| `EMAIL_FROM_ADDRESS` | ✉️ | From-address | `noreply@golden-x-host.com` |
| `REDIS_URL` | 🔁 | Redis for OTP storage | `redis://elasticache:6379` |
| `OTP_EXPIRY_MINUTES` | ⛓️ | OTP TTL | `5` |
| `MAX_OTP_ATTEMPTS` | ⛓️ | Verification cap | `5` |
| `REGISTRATION_FEE_AMOUNT` | ⛓️ | Host trial fee in **paise** | `50000` (₹500) |
| `PUBLIC_BACKEND_URL` | 🌐 | Used to build asset URLs in upload responses | `https://api.golden-x-host.com` |
| `PUBLIC_FRONTEND_URL` | 🌐 | Used in deep-links inside notifications | `https://golden-x-host.com` |
| `SOFT_LOCK_REAPER_INTERVAL` | ⏱️ | Soft-lock cleanup cadence (s) | `30` |
| `PAYOUT_SWEEP_INTERVAL` | ⏱️ | Payout-eligibility cadence (s) | `3600` |
| `ICAL_SWEEP_INTERVAL` | ⏱️ | iCal pull cadence (s) | `1800` |
| `ICAL_MIN_FRESHNESS` | ⏱️ | Per-feed freshness gate (s) | `900` |
| `REVIEW_REMINDER_INTERVAL` | ⏱️ | Review-request sweep cadence (s) | `3600` |
| `REVIEW_REMINDER_DELAY_DAYS` | ⏱️ | Days after check-out to nudge | `1` |
| `REVIEW_REMINDER_LOOKBACK_DAYS` | ⏱️ | Safety lookback window | `5` |

Legend — ✅ required · 💳 unlocks live payments · 📱 unlocks live SMS/WhatsApp · ✉️ unlocks live email · 🔁 unlocks Redis (OTP falls back to in-memory if absent) · 🌐 affects user-facing URLs · ⛓️/⏱️ tunable defaults.

> **Mock-mode behaviour.** When `RAZORPAY_KEY_ID` looks like a demo key (`rzp_demo_*`), the service falls back to deterministic mock orders / payments / refunds / payouts. Likewise MSG91 and Email log instead of dispatching when their auth keys are absent. Redis falls back to a process-local TTL store when unreachable. **All three mock layers should be turned off in production by setting the real keys.**

### Frontend — `/app/frontend/.env`

| Variable | Required | Purpose |
|---|---|---|
| `REACT_APP_BACKEND_URL` | ✅ | Public base URL of the API (e.g. `https://api.golden-x-host.com`) |

---

## 3 · Build & start commands

### Backend

```bash
# Install
cd /app/backend
pip install -r requirements.txt

# Run (production)
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 \
  --proxy-headers --forwarded-allow-ips='*'
```

> Use `--workers 1` until you split the background sweepers into a dedicated worker (see §7). With `1`, all 4 asyncio sweepers run inside that single uvicorn process — perfect for the MVP.

### Frontend

```bash
cd /app/frontend
yarn install --frozen-lockfile
REACT_APP_BACKEND_URL=https://api.golden-x-host.com yarn build
# `build/` contains a static SPA — upload to S3 / Amplify / CloudFront / nginx.
```

### Database — one-time post-deploy bootstrap

```bash
cd /app/backend
# Seeds: admin, host, guest, broker, employee accounts and demo properties
python create_admin_user.py    # admin@propnest.com / admin123
python create_employee_user.py # employee@propnest.com / employee123
python create_broker_user.py   # broker@propnest.com / broker123
python seed_demo_properties.py # 6+ demo properties

# Backfill ledger from any pre-existing paid bookings (idempotent)
python backfill_transactions.py
```

> Change all seed passwords immediately in production via the user-management UI or directly in Mongo.

---

## 4 · AWS deployment guidance (recommended layout)

```
┌──────────────────────────── Route 53 ────────────────────────────┐
│  golden-x-host.com         →  CloudFront (frontend)              │
│  api.golden-x-host.com     →  ALB → ECS Fargate (backend)        │
└──────────────────────────────────────────────────────────────────┘

Frontend  : CloudFront + S3 (or AWS Amplify Hosting). CRA `build/` artifact.
Backend   : ECS Fargate task (1 task, 0.5 vCPU / 1 GB RAM is enough for MVP).
Database  : MongoDB Atlas M10 (in the same AWS region as ECS — peer via VPC).
OTP cache : ElastiCache Redis (cache.t4g.micro). Optional — code falls back to in-process.
Email     : Amazon SES (verify your sending domain + DKIM).
Storage   : Local /app/backend/uploads on the Fargate task (MVP only — see §7
            "future" notes for S3 migration).
Secrets   : AWS Secrets Manager → injected as ECS task env vars.
Logs      : CloudWatch Logs (uvicorn writes to stdout).
```

### ECS Fargate task definition (key bits)

```jsonc
{
  "family": "golden-x-host-backend",
  "containerDefinitions": [{
    "name": "backend",
    "image": "<ecr-uri>/golden-x-host:<tag>",
    "essential": true,
    "portMappings": [{ "containerPort": 8001, "protocol": "tcp" }],
    "command": [
      "uvicorn", "server:app",
      "--host", "0.0.0.0", "--port", "8001",
      "--workers", "1",
      "--proxy-headers", "--forwarded-allow-ips=*"
    ],
    "secrets": [
      { "name": "MONGO_URL",          "valueFrom": "arn:aws:secretsmanager:…:MONGO_URL"          },
      { "name": "JWT_SECRET",         "valueFrom": "arn:aws:secretsmanager:…:JWT_SECRET"         },
      { "name": "RAZORPAY_KEY_ID",    "valueFrom": "arn:aws:secretsmanager:…:RAZORPAY_KEY_ID"    },
      { "name": "RAZORPAY_KEY_SECRET","valueFrom": "arn:aws:secretsmanager:…:RAZORPAY_KEY_SECRET"},
      { "name": "MSG91_AUTH_KEY",     "valueFrom": "arn:aws:secretsmanager:…:MSG91_AUTH_KEY"     },
      { "name": "EMAIL_SMTP_PASSWORD","valueFrom": "arn:aws:secretsmanager:…:EMAIL_SMTP_PASSWORD"}
    ],
    "environment": [
      { "name": "DB_NAME",             "value": "propnest_db" },
      { "name": "PUBLIC_BACKEND_URL",  "value": "https://api.golden-x-host.com" },
      { "name": "PUBLIC_FRONTEND_URL", "value": "https://golden-x-host.com" }
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8001/api/health || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 30
    },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/golden-x-host-backend",
        "awslogs-region": "ap-south-1",
        "awslogs-stream-prefix": "uvicorn"
      }
    }
  }],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512", "memory": "1024",
  "executionRoleArn": "arn:aws:iam::…:role/ecsTaskExecutionRole",
  "taskRoleArn":      "arn:aws:iam::…:role/golden-x-host-task"
}
```

### ALB

* Listener 443 → target group `backend-tg` on port 8001.
* Path-based rule **isn't needed**: every backend endpoint is prefixed with `/api/*`. Send everything to ECS.
* Health check path: `/api/health` (returns 200 once Mongo is reachable).

### CloudFront for frontend

```
Default behaviour → S3 origin (the CRA `build/` directory).
Behaviour /api/*   → ALB origin (HTTPS), forward all viewer headers + cookies.
Error pages       → 404 / 403 → /index.html 200 (SPA routing).
```

### IAM roles

* `ecsTaskExecutionRole` — pull image from ECR + read secrets.
* `golden-x-host-task` — `secretsmanager:GetSecretValue`, `ses:SendRawEmail` (if using SES SDK), `cloudwatch:Put*`, no S3 (MVP stores uploads locally on the task disk — see §7).

---

## 5 · Production cut-over checklist

* [ ] Build `frontend/` against the production API URL and upload to S3 + invalidate CloudFront.
* [ ] Push backend image to ECR and roll the ECS service.
* [ ] Set every variable from §2 in Secrets Manager / task env.
* [ ] **Replace seed account passwords** (admin / host / guest / broker / employee).
* [ ] Run `backfill_transactions.py` once if you migrated booking data from another env.
* [ ] Verify in browser:
  * Signup / login / OTP resend
  * Property search → detail → soft-lock booking → Razorpay test payment
  * Host dashboard, Admin Account dashboard, Broker / Employee dashboards
  * `/api/health` returns 200
* [ ] Enable Route 53 + ACM TLS for both `golden-x-host.com` and `api.golden-x-host.com`.
* [ ] Configure CloudWatch alarms on:
  * 5xx rate on the ALB
  * ECS task CPU > 80% for 5 min
  * Mongo Atlas connection count
  * SES bounce / complaint rate
* [ ] Snapshot Mongo daily (Atlas continuous backup).

---

## 6 · Known issues / accepted limitations

| Item | Status | Mitigation |
|---|---|---|
| iCal external-feed pull is HTTP-blocking via `requests` | ⚠️ accepted | Per-feed timeouts cap impact; sweeper runs every 30 min |
| Background sweepers live inside the API worker process | ⚠️ accepted (MVP) | Pin to a single ECS task. If you scale to >1 task, run the workers task with the sweepers and mark all other tasks with `RUN_BACKGROUND_JOBS=0` (small change in `server.py` §7) |
| Image uploads live on the Fargate task's local disk | ⚠️ accepted (MVP) | Persistent EFS mount or S3 migration recommended once cumulative storage > 10 GB |
| OTP fallback is in-memory when Redis is missing | ✅ by design | OTPs survive only the lifetime of the worker process — fine for single-task MVP, attach Redis (ElastiCache) the moment you scale to >1 task |
| RazorpayX live payouts require a Contact + FundAccount per host on first payout | ✅ implemented | The first call to `process_payout` for each host creates both records idempotently via `reference_id=host_id` |
| MSG91 templates must be approved before WhatsApp delivery | ⛓️ external blocker | Submit + approve template via MSG91 panel before flipping to live keys |

No P0 bugs outstanding.

---

## 7 · Future scaling notes (post-MVP, not implemented)

* **Split background workers** — when you need >1 API task, put `start_*` calls behind `if os.environ.get("RUN_BACKGROUND_JOBS") == "1"` and run a dedicated 1-task service for the sweepers.
* **S3 / GCS image storage** — replace `routes/upload_routes.py` writes to `/app/backend/uploads/` with a boto3 `put_object` call; serve via CloudFront.
* **Celery beat** — `services/ical_sync.sync_one()` and `services/review_reminder._send_review_request()` are already shaped as one-task units. Wrap each with `@celery_app.task` and run `celery -A app worker -B`.
* **Compound ledger index** `(host_id, type, status)` once `transactions` row count > 100k.

---

## 8 · Repository entry points

```
/app
├── backend/
│   ├── server.py                       # FastAPI app, startup hooks, CORS, indexes
│   ├── routes/                         # /api/* HTTP layer
│   ├── services/                       # business logic (account, verification, reaper, ical_sync, review_reminder, …)
│   ├── models/                         # Pydantic models
│   ├── middleware/auth_middleware.py   # JWT bearer
│   ├── tests/                          # pytest suite (125 tests, all green)
│   ├── seed_demo_properties.py         # Bootstrap 6+ demo listings
│   ├── create_*.py                     # Bootstrap admin / broker / employee accounts
│   ├── backfill_transactions.py        # Idempotent ledger backfill
│   └── requirements.txt
├── frontend/
│   ├── src/                            # React 19 SPA
│   ├── public/index.html               # Title + meta = "Golden-X-Host"
│   └── package.json
├── memory/
│   ├── PRD.md                          # Full product history (Phase 1 → 20)
│   └── test_credentials.md             # Seed account credentials
└── DEPLOYMENT.md                       # ← you are here
```

---

## 9 · Final regression confirmation

```
$ pytest tests/ -q   (run May 2026)
Suite A (Phase 6 + 7 + 8 + 9) — 71 passed
Suite B (Phase 12 + 13 + 14)  — 27 passed
Suite C (Phase 15 + 18)        — 27 passed
                                 ──────────
                                 125 passed · 0 failed
```

Linters: `ruff` clean across all backend modules; ESLint clean across all frontend pages.
Health: `GET /api/health` → 200 OK · all 4 background sweepers boot cleanly.

**Status: MVP release-candidate ready for production cut-over.**
