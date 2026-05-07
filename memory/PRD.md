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

### Phase 12 — Soft-lock Reaper + Reminder Recovery (Complete — May 2026)
- **New** `services/soft_lock_reaper.py`:
  - `reap_expired_soft_locks(db)` — finds soft_lock bookings with past `soft_lock_expires_at`, marks them `cancelled` with `cancellation_reason="soft_lock_expired"`, removes the booking-source blocked-date entries to free the calendar.
  - `start_soft_lock_reaper(db, interval_seconds)` — runs the periodic sweep on the FastAPI event loop (default 30s, env-overridable via `SOFT_LOCK_REAPER_INTERVAL`).
  - `recover_pending_reminders(db)` — at startup, re-schedules reminders for live soft_lock bookings that haven't been notified yet (addresses the "process-local asyncio task dropped on worker restart" concern).
- **Reminder dedup**: `_soft_lock_reminder_task` now atomically claims the booking via `find_one_and_update` setting `soft_lock_reminder_sent=True`, so duplicate restart-recoveries or worker races never produce duplicate sends.
- Hooked into `server.py` startup: indexes ensured + recovery + reaper loop. Added compound index `(booking_status, soft_lock_expires_at)` for fast reaper scans.
- 100% green: 9/9 phase 12 + 86/86 overall (test report iteration_8). Suite `test_phase12_reaper.py`.

### Phase 15 — Super Admin Account: Ledger, Payouts & Refunds (Complete — May 2026)
- **Backend** new models (`models/transaction.py`): `Transaction` (ledger row — any money movement), `Payout` (host payout), `Refund`, `HostPayoutPreference`. All amounts in PAISE per Razorpay convention. New service `services/account_service.py` owns: `record_transaction` (idempotent on booking_id+payment_id), `compute_refund_tier` (100% ≥7d · 50% 2–7d · 0% <48h), `initiate_refund` (policy-driven or admin-override, calls Razorpay refund API), `mark_booking_payout_eligible` (10% platform fee, 90% net), `process_payout` (RazorpayX Payouts with mock fallback), `sweep_payout_eligibility` (background sweep every hour + manual trigger).
- **Razorpay service** extended: `create_refund()` + `create_payout()` with deterministic mock IDs (`rfnd_mock_<hex>`, `pout_mock_<hex>`).
- **Admin routes** `/api/admin/account/*`: `overview`, `mrr-chart?months=N`, `top-hosts?limit=N`, `transactions` (filter by type/status/date/search + pagination), `transactions/export-csv`, `payouts` (eligible/processing/paid/failed), `payouts/{id}/process`, `payouts/process-eligible` (batch), `payouts/sweep-eligibility`, `refunds`, `refunds/{booking_id}` (tier auto or override_percent/amount), `refunds/policy-preview`. All admin-guarded.
- **Host routes** `/api/host/*`: `payout-preference` GET/PUT (UPI or bank; strict validation; masked echo), `payouts` (host's own payouts only).
- **Ledger hooks**: `confirm-payment`, `mock-pay`, `confirm-registration-fee`, `registration-fee/mock-pay`, `confirm-subscription` all write Transaction rows. Guest cancel on a confirmed booking auto-refunds per policy tier and also writes a Refund + Transaction row.
- **Backfill**: `backend/backfill_transactions.py` — idempotent script that re-creates Transaction rows for pre-existing paid bookings / registration fees / active subscriptions. Already ran: 45 booking payments (₹14,01,984 gross) + 6 registration fees (₹3,000) recorded.
- **Indexes**: `transactions.transaction_id` (unique), `(type, created_at desc)`, `booking_id`, `host_id`; `payouts.payout_id` (unique), `payouts.booking_id` (unique), `(status, eligible_at desc)`; `refunds.refund_id` (unique), `refunds.booking_id`.
- **Background job**: payout eligibility sweeper on 1-hour interval (env: `PAYOUT_SWEEP_INTERVAL`).
- **Frontend** new `/admin/account` page (`AdminAccount.js`) with 5 tabs (Overview / Transactions / Payouts / Refunds / Top Hosts). Overview: 8 stat tiles (Total Gross, Platform Take, MRR, Pending Payouts, Booking Payments, Registration Fees, Subscriptions, Refunds) + 6-month revenue line chart (recharts: inflow / refunds / net). Transactions: type+status+date+search filters, CSV export, paginated table. Payouts: status filter, "Auto-process all" batch, "Pay out" per row, failure reason surfaced. Refunds: initiate modal (auto-tier or override_percent), history table. Top Hosts: ranked bar list with gross + platform-take. New `/host/payouts` page (`HostPayouts.js`) with UPI/bank radio form + masked account display + payouts history.
- **Nav**: `nav-account-btn` in Admin header; `nav-payouts-btn` in Host header.
- **API**: new `accountAPI` namespace in `services/api.js` — all admin + host endpoints.
- **Tests**: 20/20 backend pytest (`test_phase15_account.py`) + 27/27 regression (Phase 12–14) + Admin Account frontend smoke 100%. Critical bug found by testing agent (enum-coercion in `process_payout`) fixed + re-verified. Test report `iteration_11.json`.

### Phase 14 — Property Verification Workflow Real Wiring (Complete — May 2026)
- **Backend** `services/verification_workflow.py` finalized: `assign_broker` (lowest-load, city-preferred) + `on_host_submit` / `on_broker_submit` / `on_rm_decision` / `on_admin_decision` notification fan-outs (in-app + WhatsApp + email via existing services). Admin approve enforces `rm_approved=true`. Admin approve is now idempotent on `status=live` (no double-fire). Employee/Admin approve & reject endpoints accept Pydantic JSON bodies (`RMReviewRequest`, `RMRejectRequest`, `AdminRejectRequest`). `verification_id` factory switched from `int(timestamp())` to `uuid4().hex[:14].upper()` (same fix family as booking_id and notification_id). New unique index `property_verifications.verification_id` + secondary index on `property_id` added in `startup_db_indexes`.
- **Frontend** new centralized `verificationAPI` namespace in `services/api.js` so every dashboard sends JSON bodies (no more query-string drift). `AdminDashboard` `PropertyModeration` rewritten — defaults to **Awaiting Final Approval** queue (calls `/api/admin/properties/awaiting-final-approval`), shows RM-APPROVED chip, surfaces approve/reject for both `under_review` and `pending_verification` (broker queue) lists. `EmployeeDashboard` `VerificationReviewSection` migrated to `verificationAPI.rmApprove/rmReject`. `BrokerDashboard` `VerificationsSection` was a static placeholder — now a full queue with a `SubmitVerificationModal` (checklist toggles, geo-tagged photo URL+lat+lng add-list, video URL, remarks, validation: at least one geo-tagged photo required).
- **Docs** new `services/VERIFICATION_WORKFLOW.md` documenting every state transition, payload, server-side guard, and notification trigger.
- 100% green: 8/8 phase 14 backend tests + frontend smoke (status-filter default, broker submit-modal validation, verificationAPI consumption check). Test report `iteration_10.json`. Suite `test_phase14_verification.py`.

### Phase 13 — Host Property Listing Creation Flow (Complete — May 2026)
- **Backend**:
  - `POST /api/upload/image` (auth required) — saves file to `/app/backend/uploads/<uuid>.<ext>`, validates ext + 8MB cap, returns `{filename, url, size, content_type}`.
  - `GET /api/uploads/<filename>` — StaticFiles serving (mounted at `/api/uploads` after the upload router).
  - `GET /api/auth/me` — returns latest user profile minus `password_hash` and `registration_fee_payment_id`. Used by AuthContext to keep `registration_fee_paid` in sync.
  - `POST /api/subscriptions/confirm-registration-fee` refactored to Pydantic `ConfirmRegistrationFeeRequest` body; new `POST /api/subscriptions/registration-fee/mock-pay` for demo mode.
  - `Property.property_id` factory switched from timestamp to uuid4.
- **Frontend** new `/host/list-property` (`HostListProperty.js`):
  - 7-step form: Basics → Location → Pricing & Rules → Amenities → Photos → Subscription → Review & Pay.
  - Step indicator with check-marked completion, terracotta active step, sage-dark done steps.
  - Per-step validation (title length, area min, pin format, price min, amenities required, photos required, plan required).
  - Photos: device upload via `/api/upload/image` AND URL paste fallback; cover badge on first; trash-icon delete; preview grid.
  - Subscription: BHK-matching plans surface first.
  - Review: full data summary, fee card with demo-mode banner, adaptive submit label ("Pay ₹500 & submit" vs "Submit listing" based on `registration_fee_paid`).
  - On submit: creates property as DRAFT → pays ₹500 fee (mock-pay if `is_mock`, real Razorpay SDK otherwise) → submit-for-verification → success page.
- **AuthContext** now exposes `refreshUser()` that calls `/api/auth/me`. Listing form invokes it on mount so registration-fee state is always fresh.
- 100% green: 10/10 phase 13 backend + 100% frontend E2E (test report iteration_9). Suite `test_phase13_listing.py`.

---

## Test Status (Iteration 9, May 6 2026)
- Phase 6: 20/20 — `test_phase6_calendar.py`
- Phase 7: 20/20 — `test_phase7_search.py`
- Phase 8: 15/19 (4 pre-existing fixture date warnings — non-blocking)
- Phase 9: 12/12 — `test_phase9_payment.py`
- Phase 10: 12/12 — `test_phase10_my_bookings.py`
- booking_id uniqueness: 3/3
- Phase 11: 7/7 — `test_phase11_notifications.py`
- Phase 12: 9/9 — `test_phase12_reaper.py`
- Phase 13: 10/10 — `test_phase13_listing.py`
- Frontend: 100% on critical flows (host calendar, guest browse + detail + booking + payment, my bookings, host listing creation 7-step)
- DB: unique + compound indexes on hot collections
- Background jobs: soft-lock reaper (30s) + reminder recovery on startup
- Mocked: Razorpay (deterministic HMAC + 2 mock-pay endpoints), MSG91 SMS+WhatsApp DEMO, EmailService MOCK

---

## Pending Backlog

### P1 — Next Up
- **Idempotent registration-fee guard**: `confirm-registration-fee` currently silently overwrites payment_id when already paid; return 200 'already paid' instead.
- **Magic-byte file validation** in upload_routes (currently only filename ext check).

### P2 — Future
- **Reviews & ratings** system (5-star + sub-categories, 14-day window).
- Real iCal background sync (cron/Celery) instead of inline best-effort.
- Real RazorpayX live-mode payouts — production requires creating Razorpay Contact + FundAccount for each host before `create_payout` (stub is in `razorpay_service.create_payout`, only activates when `RAZORPAYX_ACCOUNT_NUMBER` env var is set).
- AI features (smart property descriptions, chatbot).
- Refactor Phase 8 test fixture date-window; extract `_finalize_confirmed_booking` helper.
- Broker re-assignment on host resubmit; `random.choice` tie-break for broker fairness.
- Image upload to cloud storage.
- Compound ledger index `(host_id, type, status)` for top-hosts aggregation once transactions table exceeds ~100k rows.

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
