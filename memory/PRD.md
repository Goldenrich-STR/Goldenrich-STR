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
- **Calendar Management**: BlockedDate/ExternalCalendar models, block/unblock with conflict checks, unified host calendar view (bookings + manual + external, color-coded), .ics export per property, external iCal CRUD + sync, booking creation respects blocked-dates collection, confirmed bookings auto-create BOOKING-source blocks. Frontend `/host/calendar` with month-grid UI, property selector, side panels, auto-jump on new block, iCal download.
- **DI bug fix (regression)**: All routes that used `db: AsyncIOMotorDatabase = Depends()` were patched to use a local `get_db` helper.

### Phase 7 — Guest Search & Discovery (Complete — May 2026)
- **Backend** `/api/properties/search` extended with: `property_type`, `pet_friendly`, `check_in/check_out` (auto-excludes properties with overlapping bookings or blocked dates), `bbox` (map-viewport filter), `sort` (`recommended`/`price_asc`/`price_desc`/`newest`). Returns `filters_applied` echo for client state restore.
- **Seed**: 8 demo LIVE properties across India with lat/lng (`/app/backend/seed_demo_properties.py`).
- **Frontend** `GuestBrowse.js` rewrite: top sticky search bar (city/dates/category), advanced filters drawer (property type, BHK, price min/max, amenities pills, instant + pet toggles), sort dropdown, view toggle (Grid / Split / Map), Leaflet+OSM map with custom price-pin divIcons, popup-to-detail navigation, hover-to-highlight pin sync, fit-bounds, empty/error states.
- All filter combinations + 4 sort orders + bbox + date-availability tested (20/20 pytest pass).

### Phase 8 — Property Detail + Booking Soft-Lock (Complete — May 2026)
- **Backend**: `GET /api/properties/{id}` now joins safe public host info (full_name, city, profile_image, kyc_status, created_at, role) — no PII leaks. `services/razorpay_service.py` rewritten with `is_mock` fallback when keys are demo/missing — produces deterministic HMAC signatures, exposes `mock_complete_payment(order_id)` helper. Booking `create_order` flow now succeeds in demo without external Razorpay calls; `confirm-payment` flips to `confirmed` and inserts a `booking`-source blocked-date entry (Phase 6 integration), reflected in iCal export.
- **Frontend** `/property/:id` (public route): hero gallery with prev/next, title + location + instant-booking badge, host strip with KYC verified pill, description, icon-amenities grid, in-page availability calendar (past + blocked dates disabled, click-to-select range), sticky booking card with date pickers + guests + price breakdown (base × nights, 10% service, 18% GST, total), Book Now button.
- **Frontend** `/guest/booking-confirmation`: reservation held card, soft-lock countdown timer (mm:ss), trip details, full price summary, mock-mode disclaimer, back-to-search.
- 19/19 backend pytest pass + 100% frontend flows (test report iteration_3).

### Phase 9 — Razorpay Checkout Integration (Complete — May 2026)
- **Backend**: `POST /api/bookings/confirm-payment` refactored to accept a Pydantic `ConfirmPaymentRequest` body (was query params). New `GET /api/bookings/payment/config` (public) exposes `{provider, key_id, is_mock, currency}` so frontend can pick mock vs live flow. New `POST /api/bookings/{id}/mock-pay` (demo-only, gated on `is_mock=True`) confirms a soft-locked booking with deterministic HMAC and upserts the booking-source blocked-date entry — symmetric side-effects with the real confirm-payment path.
- **Frontend** `BookingConfirmation.js` rewrite: loads payment config on mount; in mock mode shows demo banner + "Complete demo payment" button → calls `/mock-pay`; in live mode opens `window.Razorpay({...}).open()` with order_id, prefill, theme, success-handler that calls `/confirm-payment` with the SDK signature. Adds confirmed-card (Sparkles + payment ID), expired-card on soft-lock timeout, "View my bookings" CTA after success.
- Razorpay SDK script added to `index.html`. End-to-end mock flow verified: Book Now → soft-lock → Complete demo payment → "Booking confirmed!" with payment ID, blocked-date entry created, re-attempt 409.
- 12/12 backend pytest pass + 100% frontend flows (test report iteration_4).

---

## Test Status (Iteration 4, May 6 2026)
- Phase 6 backend: 20/20 pass — `/app/backend/tests/test_phase6_calendar.py`
- Phase 7 backend: 20/20 pass — `/app/backend/tests/test_phase7_search.py`
- Phase 8 backend: 19/19 pass — `/app/backend/tests/test_phase8_property_detail.py` (4 fixture date warnings; non-blocking)
- Phase 9 backend: 12/12 pass — `/app/backend/tests/test_phase9_payment.py`
- Frontend: 100% on critical flows (host calendar, guest browse, property detail, full booking + payment cycle)
- Mocked: Razorpay (with deterministic HMAC fallback + mock-pay endpoint), MSG91, Email, SendGrid

---

## Pending Backlog

### P1 — Next Up
- **Guest "My Bookings" page** `/guest/bookings` — list past + upcoming reservations (currently 404). Backend `/api/bookings/guest/my-bookings` already returns the data. The "View my bookings" button on confirmation already routes here.
- **Property Listing Creation Flow (Host)**: subscription select + ₹500 registration fee modal, multi-step form, image upload
- **Property Verification Workflow (real)**: Broker physical visit submission → RM remote review → Admin final approval
- **Notification triggers**: send WhatsApp/Email to host on confirmed booking; soft-lock-expiring nudge to guest at minute 8 (MSG91/SendGrid layer already exists, mocked)

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
