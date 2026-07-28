# Phase 15 - Enterprise RM Dashboard Current-State Audit

## Objective
Build the existing Employee/RM area into a production-ready X-Space360 Enterprise RM Operations Control Center without rewriting working Admin, Broker, Host, or mobile app functionality.

## Current Routes and Entry Points
- Frontend route: `/employee/dashboard`
- Frontend page: `frontend/src/pages/EmployeeDashboard.js`
- API service: `frontend/src/services/api.js`
- Backend router: `backend/routes/employee_routes.py`
- Auth guard: `ProtectedRoute` allows role `employee`
- Backend access guard: `require_employee()` only permits `UserRole.EMPLOYEE`

## Existing RM Backend API Surface
- `GET /employee/dashboard/stats`
  - Current coverage: total brokers, pending RM verification reviews, properties under review, expiring subscriptions.
  - Gap: does not yet return the full executive KPI set from the RM spec.
- `GET /employee/verifications/pending`
  - Current coverage: property verifications completed by broker and waiting for RM review.
  - Data scope: `rm_id == current_user.user_id`.
- `GET /employee/verifications/history`
  - Current coverage: all property verification records assigned to the RM.
- `GET /employee/verifications/{verification_id}`
  - Current coverage: verification detail with property, broker and owner/host enrichment.
  - Gap: UI terminology still uses owner in some places, but data contract remains owner_id for compatibility.
- `GET /employee/verifications/{verification_id}/export-report`
  - Current coverage: XLSX export.
- `POST /employee/verifications/{verification_id}/approve`
  - Current coverage: RM approval and audit log.
- `POST /employee/verifications/{verification_id}/reject`
  - Current coverage: RM rejection, property returned to draft, audit log.
- `GET /employee/brokers`
  - Current coverage: brokers assigned to the RM with basic owner/property/live/pending verification stats.
- `GET /employee/brokers/{broker_id}/portfolio`
  - Current coverage: broker profile, properties, owners/hosts.
- `GET /employee/reports/properties-not-booked`
- `GET /employee/reports/properties-not-booked/export-csv`
- `GET /employee/reports/broker-portfolio-summary`

## Current Data Relationships
- RM users are stored as `role = "employee"`.
- Broker assignment uses `users.rm_id`.
- Host assignment uses `users.broker_id` and also often `users.rm_id`.
- Property assignment supports:
  - `owner_id`
  - `broker_id`
  - `broker_lg_code`
  - `rm_id`
  - `employee_id`
  - `created_by_role`
  - `created_by_user_id`
  - `managed_by_broker_id`
- Verification assignment uses `property_verifications.rm_id`.
- Booking ownership can be derived through `property_id`, `host_id/owner_id`, `broker_id`, and property snapshots where present.

## Reusable Components and Patterns
- `EmployeeDashboard.js`
  - Existing RM auth shell.
  - Verification review section.
  - Broker list and portfolio modal.
  - Report generation/export pattern.
- `BrokerDashboard.js`
  - Enterprise navigation style, KPI cards, host details modal, verification tracker patterns.
- `AdminDashboard.js` and `frontend/src/pages/admin/*`
  - Enterprise admin visual language, tabs, module naming, data-dense admin views.
- Backend helpers:
  - `require_employee`
  - `write_audit_log`
  - existing verification workflow service calls.
- Existing model fields already support most hierarchy needs without destructive schema changes.

## Missing Modules
- RM profile API response with employee code, branch, division, department, reporting manager, territory, performance rating, joining date and status.
- Full RM executive KPI dashboard.
- Broker detail drilldown with booking, revenue, commission, escalation, activity and audit summaries.
- RM-wide Host Management and Host Details.
- Host Verification Tracker with SLA remaining and escalation state.
- RM document verification review center.
- RM-wide Property Management and Property Verification Tracker.
- RM booking management and booking detail drilldown.
- RM direct property listing flow with broker/host/territory assignment.
- RM escalation matrix and task management.
- RM analytics with broker/host/property rankings.
- RM notifications inbox/filtering.
- RM scoped audit log view.
- AI copilot command surface.

## Incorrect or Legacy Module Names
- Frontend and backend internal terms still use `owner` for host records.
- UI should display `Host`; API/model fields such as `owner_id` should remain unchanged for backward compatibility.
- Existing title `Employee (RM) Dashboard` should become `RM Operations Control Center`.
- Existing `My Brokers`, `Reports`, and `Pending Reviews` should be moved into enterprise navigation groups rather than simple tabs.

## Migration Assessment
No mandatory destructive migration is required for Step 2.

Potential additive migrations/backfills for later steps:
- Add `business_division`, `reporting_manager_id`, `assigned_territory`, `performance_rating`, `joining_date` to employee/RM user profiles if Admin does not already store them in flexible fields.
- Backfill missing `rm_id` on hosts/properties/bookings from broker/property relationships.
- Add SLA timestamps/escalation state fields if existing escalation records do not cover RM workflows.
- Add booking-level broker/RM snapshot fields if analytics needs immutable historical reporting.

## API Risks and Dependencies
- RM scoping must always use `current_user.user_id`; never trust broker_id/host_id request params alone.
- `owner_id` is a compatibility field and should not be renamed in API contracts during this phase.
- Booking and revenue metrics may need defensive fallback because historical bookings may not contain broker/RM snapshots.
- Avoid deleting existing employee verification endpoints because Admin/Broker handoff tests depend on them.
- Do not touch `mobile/`.

## Phase 15 Step Plan
1. RM Architecture & Current-State Audit - complete in this document.
2. RM Enterprise Layout & Navigation - refactor `EmployeeDashboard.js` shell to match enterprise X-Space360 Admin/Broker style while preserving existing tabs.
3. RM Executive Dashboard - expand `/employee/dashboard/stats` and frontend KPI cards.
4. Broker Management & Broker Details - upgrade broker cards and add drilldown.
5. Host Management & Host Details - add RM-wide host view and details.
6. Host Verification Tracker - add stage-based tracker and document context.
7. Document Verification Review - add preview/download/status/remarks workflow.
8. Property Management & Property Verification Tracker - add RM scoped property operations.
9. Booking Management & Booking Details - add RM scoped booking tracking.
10. Escalations, Tasks & Notifications - add SLA and workflow queues.
11. RM Analytics & Reports - add rankings and performance metrics.
12. RBAC, Audit Logs, Testing & Hardening - final contract tests and build verification.

## Step 2 Proposed Changes
Files to modify:
- `frontend/src/pages/EmployeeDashboard.js`

Files to create:
- None expected.

Database migrations:
- None.

APIs added/changed:
- None in Step 2. Existing APIs continue to be used.

Risks:
- UI refactor should preserve existing verification approve/reject workflows.
- Existing `data-testid` attributes should be kept where possible for test stability.
- Internal `owner` data keys remain, but visible labels should say `Host`.

