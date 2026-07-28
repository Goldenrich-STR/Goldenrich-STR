# Phase 11 Production Launch Checklist

Date: 2026-07-27

## Scope

This checklist covers the X-Space360 website/admin panel production readiness baseline. Mobile app files are out of scope for this launch pass.

## Pre-Launch Required Checks

Run these before deployment:

```powershell
cd frontend
npm run admin:routes:check
npm run admin:smoke
npm run build
cd ..
python -m pytest backend\tests\test_admin_audit_coverage.py backend\tests\test_phase1_admin_core_contract.py backend\tests\test_admin_api_route_registration.py -q
python -m py_compile backend\server.py backend\routes\admin_core_routes.py backend\routes\admin_account_routes.py backend\routes\booking_routes.py backend\routes\cms_routes.py backend\routes\support_ticket_routes.py backend\services\audit_service.py backend\services\permission_service.py
```

## Backend Deployment

- Restart the FastAPI backend after deploying source changes.
- Confirm `admin_core_router` is included through `backend/server.py` with `/api` prefix.
- Confirm protected admin endpoints return `403` without a valid admin token.
- Confirm OpenAPI contains these key paths:
  - `/api/admin/core/dashboard`
  - `/api/admin/core/settings/overview`
  - `/api/admin/core/analytics/overview`
  - `/api/admin/account/overview`
  - `/api/bookings/payment/config`

## Database And Migrations

- Required admin-core migration file: `backend/migrations/phase1_admin_core.py`.
- Run migration/bootstrap in a controlled environment before go-live.
- Do not manually edit production collections/tables.
- Keep audit logs immutable.

## Frontend Deployment

- Use the normal production build flow.
- Verify the deployed frontend serves React history fallback for routes such as `/admin/dashboard`, `/admin/settings`, and `/admin/reports`.
- Confirm `REACT_APP_BACKEND_URL` points to the production API or is empty when same-origin `/api` proxy is used.

## Admin Smoke Routes

At minimum, manually open these after deployment:

- `/admin/dashboard`
- `/admin/users`
- `/admin/roles-permissions`
- `/admin/departments`
- `/admin/reporting-hierarchy`
- `/admin/escalation-matrix`
- `/admin/hosts`
- `/admin/properties`
- `/admin/subscriptions`
- `/admin/bookings`
- `/admin/finance`
- `/admin/crm`
- `/admin/cms`
- `/admin/communication`
- `/admin/support`
- `/admin/approvals`
- `/admin/reports`
- `/admin/settings`
- `/admin/audit-logs`

## Known Warnings

- Frontend build currently passes with pre-existing React hook dependency warnings in older pages:
  - `AdminDashboard.js`
  - `BrokerDashboard.js`
  - `HostCalendar.js`
  - `SupportPage.js`
- Local `http://localhost:3000/admin/dashboard` returned `404` during direct probe. Restart the frontend dev server or confirm the deployed web server has SPA history fallback configured.
- Finance payout/refund/export/share-invoice audit coverage should receive a deeper manual review in the next hardening pass.

## Rollback Notes

- Do not delete existing APIs or database fields during rollback.
- Roll back frontend and backend source together when possible.
- Preserve audit logs and migration history.
- If a new backend route is missing after deploy, restart backend first and re-check `/openapi.json`.

## Launch Decision

Launch is acceptable when all required checks pass and manual admin-route smoke testing confirms no blank pages or red API errors in the production environment.
