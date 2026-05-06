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
- Razorpay SDK script added to `index.html`. End-to-end mock flow verified.
- 12/12 backend pytest pass + 100% frontend flows (test report iteration_4).

### Phase 10 — Guest "My Bookings" + Critical Booking-ID Bug Fix (Complete — May 2026)
- **Backend**: Enhanced `GET /api/bookings/{guest|host}/my-bookings` to embed minimal property summary (title, city, state, images, property_type, category) for nicer cards. Added `POST /api/bookings/{id}/cancel` — cancels guest's soft_lock or confirmed booking, idempotent on already-cancelled, blocks past-check-in cancellations, and removes the booking-source blocked-date entry to free up the calendar.
- **Frontend** new `/guest/bookings` page: 3 tabs (Upcoming/Past/Cancelled) with live counts, status-coloured badges, property thumbnail, dates + guests + booking_id + total, action buttons (Complete payment / View details / Cancel / Book again), empty states, error toast.
- **Critical bug fix surfaced + resolved**: booking_id was generated as `BK{int(timestamp())}` (second-resolution) → collisions when multiple bookings created in same second → `find_one(booking_id)` returned arbitrary docs, breaking cancel/confirm-payment, and triggered React duplicate-key warnings. Fixed by switching to `BK{uuid4().hex[:14].upper()}`. Also added MongoDB unique indexes on `bookings.booking_id`, `properties.property_id`, `users.user_id|email`, `blocked_dates.blocked_date_id`, `external_calendars.calendar_id` + compound indexes for availability queries (`bookings(property_id,check_in,check_out)`, `blocked_dates(property_id,start,end)`). Existing duplicate booking_ids and blocked_dates de-duped in place.
- 100% green: 12/12 phase 10, 3/3 uniqueness, 12/12 phase 9 regression, phases 6/7 also pass (test reports iteration_5 + iteration_6).

### Phase 11 — Booking Notification Triggers (Complete — May 2026)
- **New** `services/booking_notifications.py`: `notify_host_booking_confirmed(db, booking)` fans out to host (in-app + WhatsApp + SMS via MSG91 DEMO + bespoke HTML email via EmailService MOCK) and sends a confirmation receipt to the guest (in-app + email). `_soft_lock_reminder_task(db, booking_id, delay_seconds)` is scheduled at booking creation via `asyncio.create_task` — fires 2 min before the 10-min soft-lock expires (i.e. minute 8) only when the booking is still in `soft_lock` state and the lock hasn't expired; sends a "hold expiring" reminder to the guest with a deep-link to `/guest/booking-confirmation?booking_id=…`.
- Wired into `booking_routes.py` at three points: `create-booking` schedules the reminder; `confirm-payment` and `mock-pay` both fire `notify_host_booking_confirmed` via background task (non-blocking).
- Added new `NotificationType.NEW_BOOKING_RECEIVED` and `BOOKING_PENDING_PAYMENT`. Switched `notification_id` factory to uuid4 (fixed same second-collision class bug as booking_id had).
- All sends are mocked but inspectable: log lines `[DEMO] WhatsApp to … / [DEMO] SMS to … / [MOCK EMAIL] To: … Subject: …` + DB rows in `notifications` collection.
- 100% green: 7/7 phase 11 + 64/64 regression. Test report iteration_7. Suite `test_phase11_notifications.py`.

---

## Test Status (Iteration 7, May 6 2026)
- Phase 6 backend: 20/20 — `test_phase6_calendar.py`
- Phase 7 backend: 20/20 — `test_phase7_search.py`
- Phase 8 backend: 15/19 (4 pre-existing fixture date warnings — non-blocking)
- Phase 9 backend: 12/12 — `test_phase9_payment.py`
- Phase 10 backend: 12/12 — `test_phase10_my_bookings.py`
- booking_id uniqueness: 3/3 — `test_booking_id_uniqueness.py`
- Phase 11 backend: 7/7 — `test_phase11_notifications.py`
- Frontend: 100% on critical flows; zero React duplicate-key warnings
- DB: unique + compound indexes on hot collections
- Mocked: Razorpay (deterministic HMAC), MSG91 SMS+WhatsApp DEMO, EmailService MOCK

---

## Pending Backlog

### P1 — Next Up
- **Soft-lock reaper**: TTL index or scheduled cleanup for stale soft_lock bookings past `soft_lock_expires_at` (testing agent flagged: process-local asyncio task is dropped on worker restart).
- **Property Listing Creation Flow (Host)**: subscription select + ₹500 registration fee modal, multi-step form, image upload.
- **Property Verification Workflow (real)**: Broker physical visit submission → RM remote review → Admin final approval.
- **In-app notification email read receipts** + retry/DLQ on real-channel failures (when MSG91/SendGrid keys go live).

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
