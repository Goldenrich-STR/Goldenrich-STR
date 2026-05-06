# PropNest STR Platform - Product Requirements Document (PRD)

## Project Overview
PropNest is a comprehensive Short-Term Rental (STR) platform for the Indian market, connecting Property Owners (Hosts), Guests (Renters), Brokers, and Employees (Relationship Managers) under a unified system managed by Super Admin.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Payment**: Razorpay (test/mock mode)
- **OTP/SMS**: MSG91 (DEMO mode — no real send)
- **Email**: SendGrid/SES adapter (mock)
- **Cache**: Redis (with in-memory fallback)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (configured)
- **iCal**: `icalendar` library for export + sync

### Frontend
- **Framework**: React.js (CRA)
- **Routing**: React Router v7
- **Styling**: Tailwind CSS + custom design system
- **HTTP**: Axios
- **State**: Context API

### Design System
- Theme: Light, Organic & Earthy
- Primary: Terracotta (#C05C4F), Secondary: Sage (#788574)
- Background: Warm Sand (#FDFCF8)
- Typography: Manrope

---

## Implemented Features

### Phase 1 — Core (Complete)
- JWT auth, role-based access (guest, host, broker, employee, admin)
- Phone OTP registration, login
- Property CRUD, search, host listings
- Booking system with soft lock (10-min) → hard lock on payment confirm
- Razorpay order creation + signature verification (mock)

### Phase 2 — Admin & CMS (Complete)
- Admin dashboard, user management, KYC approval, property moderation
- Landing page CMS endpoints
- Subscription plan management

### Phase 3 — Subscription System (Complete)
- BHK-wise subscription plans seeded
- Subscription purchase + renewal endpoints

### Phase 4 — Broker Dashboard (Complete)
- Mocked GRP SSO, leads, verification status, commission view (read-only)

### Phase 5 — Employee/RM Dashboard (Complete)
- Verification review queue, approve/reject flow
- Reports UI (PDF/CSV mock export)

### Phase 6 — Notifications + Calendar (Complete — Feb/May 2026)
- **Notifications**: MSG91 SMS/WhatsApp + Email service layer (DEMO), in-app NotificationCenter, NotificationBell badge.
- **Calendar Management** (just shipped):
  - `BlockedDate`, `ExternalCalendar`, `CalendarEvent` models
  - Block/unblock manual dates with conflict checks (active booking, overlap, past-date, range validation)
  - Unified host calendar view (bookings + manual blocks + external feeds), color-coded
  - iCal `.ics` export per property (downloadable)
  - External iCal source CRUD + manual sync trigger
  - Booking creation now respects blocked-dates collection (409 on conflict)
  - Confirmed bookings auto-create a `BOOKING`-source blocked-date entry (so iCal export reflects them)
  - Frontend `/host/calendar` page: month-grid UI, property selector, side panels for manual blocks (all upcoming) + external calendars, auto-jump to month of newly created block, iCal download
- **DI bug fix (regression)**: All routes that used `db: AsyncIOMotorDatabase = Depends()` (booking, property, subscription, cms, admin) were patched to use a local `get_db` helper. Previously these endpoints returned 422 with "missing client/name/kwargs" — now fixed and verified.

---

## Test Status (Iteration 1, May 6 2026)
- Backend: 20/20 pytest cases pass — `/app/backend/tests/test_phase6_calendar.py`
- Frontend: 100% on critical flows tested (host login, calendar load, block/unblock, external CRUD, iCal export)
- Mocked: Razorpay, MSG91, Email, SendGrid

---

## Pending Backlog

### P1 — Next Up
- **Guest Search & Discovery**: unified search bar, location/map search (Google Maps), advanced filters
- **Booking Flow (frontend)**: date picker tied to availability API, soft-lock countdown, Razorpay checkout modal
- **Property Listing Creation Flow (Host)**: subscription select + ₹500 registration fee modal, multi-step form, image upload
- **Property Verification Workflow (real)**: Broker physical visit submission → RM remote review → Admin final approval

### P2 — Future
- Super Admin Account section: real transactions, Razorpay payouts, refunds
- Reviews & Ratings system (5-star + sub-categories, 14-day window)
- Map view in search results
- Real iCal sync as background cron/Celery job (currently sync is inline + best-effort)
- BackgroundTasks for external sync to avoid blocking POST
- Switch `requests` → `httpx.AsyncClient` in calendar sync
- MongoDB indexes on `blocked_dates(property_id, start_date, end_date)` and `external_calendars(property_id, owner_id)`
- Image upload to cloud storage
- AI: smart property descriptions, chatbot

---

## Database Collections

- `users`, `properties`, `bookings`, `subscriptions`, `subscription_plans`
- `notifications`, `blocked_dates`, `external_calendars` (Phase 6)
- `leads`, `commissions`, `verifications` (broker/employee)
- `cms_content`

---

## API Endpoints (Phase 6 additions)

### Calendar
- `GET  /api/calendar/properties/{id}/blocked-dates` — public
- `POST /api/calendar/properties/{id}/block-dates` — host, with validation
- `DELETE /api/calendar/blocked-dates/{id}` — host
- `GET  /api/calendar/properties/{id}/unified-view?month&year` — host
- `GET  /api/calendar/properties/{id}/ical-export` — host (.ics download)
- `GET  /api/calendar/properties/{id}/external-calendars` — host
- `POST /api/calendar/properties/{id}/external-calendars` — host
- `POST /api/calendar/external-calendars/{id}/sync` — host
- `DELETE /api/calendar/external-calendars/{id}` — host

---

## Environment Variables
- Backend `.env`: `MONGO_URL`, `DB_NAME`, `JWT_SECRET_KEY`, `RAZORPAY_KEY_ID/SECRET` (test), `MSG91_AUTHKEY/SENDER_ID`, `EMERGENT_LLM_KEY`, `REDIS_URL`, `REGISTRATION_FEE_AMOUNT`
- Frontend `.env`: `REACT_APP_BACKEND_URL`

## Test Credentials
See `/app/memory/test_credentials.md` (all 5 roles seeded and verified).

## Known Limitations
- Razorpay/MSG91/SendGrid in mock/test mode — wire real keys in env when ready (no code refactor needed).
- iCal external sync is inline (not a background job); slow URLs may delay POST. Acceptable for MVP.
- `GET /api/properties/` (root) returns 307 redirect; canonical listing endpoint is `/api/properties/search`.
