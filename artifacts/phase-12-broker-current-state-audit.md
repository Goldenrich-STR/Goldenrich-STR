# Phase 12 Broker Dashboard Current-State Audit

Date: 2026-07-27

## Scope

Website broker dashboard only. Mobile app files are out of scope. No code behavior was changed in this audit step.

## Existing Frontend

Primary file:

- `frontend/src/pages/BrokerDashboard.js`

Current visible broker modules:

- Overview
- My Owners
- Properties
- Verifications
- Leads
- Commissions
- Owner KYC modal
- Property detail modal
- Broker verification submission modal

Current API usage:

- `GET /api/broker/dashboard/stats`
- `GET /api/broker/my-owners`
- `GET /api/broker/properties`
- `GET /api/broker/verifications`
- `POST /api/broker/verifications/{property_id}/submit`
- `GET /api/broker/leads`
- `POST /api/broker/leads`
- `GET /api/broker/commissions`
- Owner KYC draft/submit APIs through `accountAPI`
- Upload APIs for image/document/video flows

## Existing Backend

Primary files:

- `backend/routes/broker_routes.py`
- `backend/services/verification_workflow.py`
- `backend/routes/booking_routes.py`
- `backend/routes/property_routes.py`
- `backend/models/user.py`
- `backend/models/property.py`
- `backend/models/verification.py`
- `backend/models/commission.py`

Registered broker APIs:

- `GET /api/broker/dashboard/stats`
- `GET /api/broker/my-owners`
- `GET /api/broker/properties`
- `GET /api/broker/leads`
- `POST /api/broker/leads`
- `PATCH /api/broker/leads/{lead_id}`
- `GET /api/broker/verifications`
- `POST /api/broker/verifications/{property_id}/submit`
- `GET /api/broker/commissions`
- `GET /api/broker/subscription-alerts`
- `GET /api/broker/owner/{owner_id}/kyc`
- `PATCH /api/broker/owner/{owner_id}/kyc/documents/draft`
- `DELETE /api/broker/owner/{owner_id}/kyc/documents/draft/{document_type}`
- `PATCH /api/broker/owner/{owner_id}/kyc/agreement/draft`
- `POST /api/broker/owner/{owner_id}/submit-verification`

Security currently present:

- `require_broker` checks `current_user.role == broker`.
- Broker routes filter by `broker_id == current_user.user_id`.
- Owner KYC helper verifies owner is assigned to the current broker.
- Verification submit checks the property verification belongs to the broker.

## Existing Data Relationships

Current strong relationships:

- Host/user can store `broker_id`, `lg_code`, `rm_id`.
- Property can store `broker_id`.
- Property verification stores `broker_id`, `owner_id`, `rm_id`.
- Commission stores `broker_id`, `booking_id`, `property_id`, commission amount and payment status.
- Support tickets snapshot `user_lg_code`, `user_broker_id`, `user_rm_id`.

Current partial relationship:

- Booking is created from property and host data, but the create flow does not visibly store a permanent broker/LG/RM/employee snapshot at booking creation time.

## Reusable Components And Patterns

Reusable frontend:

- Existing broker dashboard tab structure.
- Owner cards and KYC modal.
- Property card and property detail modal.
- Verification task cards and site visit submission modal.
- Commission table.
- Existing Super Admin visual language can guide a new Broker CRM shell.

Reusable backend:

- `require_broker`.
- Broker owner/property/verification filtering by current broker.
- Verification workflow broker assignment.
- Existing notification hooks in verification workflow.
- Existing commission model.
- Admin audit service pattern can be reused for broker activity logs.

## Missing Enterprise Modules

High priority:

- Enterprise broker profile API with LG code, organization, tenant, branch, franchise, RM, territories, rating and revenue.
- Host detail page with property list, booking history, payment history, document timeline, audit history and activity timeline.
- Broker bookings API filtered by assigned hosts/properties/bookings.
- Permanent LG code snapshot on booking creation.
- Broker commission analytics by booking, month, pending, paid and future commission.
- Broker tasks API combining verification tasks, document tasks, RM comments and admin comments.
- Broker audit/activity API.

Medium priority:

- Reporting tree: Broker -> Hosts -> Properties -> Bookings -> Revenue -> Commission -> Verification.
- Analytics API: top property, revenue, lowest rating, occupancy, approval time, booking value and growth.
- Document verification matrix with versions, expiry, uploaded-by, verified-by, remarks, preview and download.
- Search/filter API across host, property, booking, LG code, status, date and verification stage.
- Escalation matrix integration for overdue broker work.

Future-ready:

- AI copilot placeholders.
- Voice command hooks.
- Workflow/business-rule engine integration.
- WebSocket activity feed.
- Multi-tenant tenant/organization enforcement.

## Incorrect Or Inconsistent Names

- UI uses "My Owners"; requested module language is "Hosts" and "Host Management".
- Broker dashboard title says "Operational Command"; requested enterprise module should read like "Broker CRM" or "Broker Command Center".
- Existing frontend tab labels are uppercase marketing-style; Super Admin panel uses clearer enterprise module labels.
- `owners` API naming is backward compatible but should be aliased to `hosts` for enterprise clarity.

## Database Gaps

Required forward-compatible additions for booking snapshot:

- `broker_id`
- `broker_name`
- `broker_lg_code`
- `rm_id`
- `employee_id`
- `branch`
- `franchise`
- `tenant`
- `broker_snapshot`
- `hierarchy_snapshot_created_at`

Do not mutate old bookings manually. Use a migration/backfill that preserves existing values and fills only missing snapshot fields where source data is available.

## API Gaps

Recommended additive APIs:

- `GET /api/broker/enterprise/overview`
- `GET /api/broker/enterprise/hosts`
- `GET /api/broker/enterprise/hosts/{host_id}`
- `GET /api/broker/enterprise/properties`
- `GET /api/broker/enterprise/bookings`
- `GET /api/broker/enterprise/commissions`
- `GET /api/broker/enterprise/tasks`
- `GET /api/broker/enterprise/analytics`
- `GET /api/broker/enterprise/audit`

Keep existing `/api/broker/*` APIs working for backward compatibility.

## Risks

- `BrokerDashboard.js` is a large single file; broad rewrites can break working verification/KYC/leads/commission flows.
- Booking LG snapshot is mandatory and must be implemented carefully so future broker changes do not rewrite old bookings.
- Broker RBAC must be tested with two brokers to prevent cross-broker data leakage.
- Some financial commission data may currently be generated separately from bookings; commission reports need reconciliation before UI claims final totals.

## Phase 12 Recommended Implementation Plan

1. Create Broker CRM shell and navigation while keeping existing sections available.
2. Add enterprise overview API and profile card.
3. Add Host Management and Host Detail APIs/pages.
4. Add Property CRM and verification timeline.
5. Add Bookings API and LG snapshot migration.
6. Add Commission dashboard and analytics.
7. Add tasks, notifications and escalations.
8. Add audit/activity log.
9. Add RBAC tests for broker data isolation.
10. Run production readiness checks.

## Step 1 Decision

Step 1 is complete as an audit/reporting step. No runtime behavior was changed.
