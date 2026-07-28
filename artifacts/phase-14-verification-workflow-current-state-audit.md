# Phase 14 - Step 1: Verification Workflow Current-State Audit

## Scope

Audit of the current broker verification execution and RM/Admin handoff flow for the website dashboards only.

Mobile app was not reviewed or changed.

## Current Workflow

1. Host or broker creates a property draft.
2. Property is submitted for verification.
3. Broker receives/opens a verification task.
4. Broker submits site visit checklist, geo-tagged photos, optional video and remarks.
5. RM reviews broker submission and approves or rejects.
6. Admin gives final approval or rejection after RM approval.
7. Approved property becomes live; rejected property returns to correction/rework.

## Existing Backend Surface

Broker:
- `GET /api/broker/properties`
- `POST /api/broker/properties`
- `PATCH /api/broker/properties/{property_id}`
- `POST /api/broker/properties/{property_id}/submit-verification`
- `POST /api/broker/properties/{property_id}/start-rework`
- `GET /api/broker/verifications`
- `POST /api/broker/verifications/{property_id}/submit`

RM / Employee:
- `GET /api/employee/verifications/pending`
- `GET /api/employee/verifications/history`
- `GET /api/employee/verifications/{verification_id}`
- `POST /api/employee/verifications/{verification_id}/approve`
- `POST /api/employee/verifications/{verification_id}/reject`
- `GET /api/employee/verifications/{verification_id}/export-report`

Admin:
- `GET /api/admin/properties/awaiting-final-approval`
- `GET /api/admin/properties/pending-verification`
- `POST /api/admin/properties/{property_id}/approve`
- `POST /api/admin/properties/{property_id}/reject`
- `GET /api/admin/core/properties-operations`
- `PATCH /api/admin/core/properties-operations/{property_id}/checklist`
- `PATCH /api/admin/core/properties-operations/{property_id}/stage`
- `PATCH /api/admin/core/properties-operations/{property_id}/status`

## State Machine Observed

Property status:
- `draft`
- `pending_verification`
- `under_review`
- `live`
- `rejected`

Verification status:
- `pending`
- `in_progress`
- `completed`
- `rejected`
- Admin final approval currently sets `status` to `approved`, although the model enum does not define `approved`.

Expected flow:
- Draft submitted: `property.status = pending_verification`
- Broker visit submitted: `property.status = under_review`, `verification.status = completed`
- RM approved: verification gets `rm_reviewed = true`, `rm_approved = true`
- Admin approved: `property.status = live`, verification gets `admin_reviewed = true`, `admin_approved = true`
- RM/Admin rejected: property is moved to correction/rework path

## Frontend Coverage

Broker dashboard:
- Property creation and draft editing exist.
- Draft submission for verification exists.
- Verification tracker exists.
- Site visit submission modal exists with checklist, reasons, photo upload/geolocation and video remarks.
- Rework flow exists for rejected property.

Employee/RM dashboard:
- Pending reviews tab exists.
- RM approve and reject actions exist.
- Verification report details and export exist.

Admin dashboard:
- Awaiting final approval API exists.
- Admin approve/reject APIs exist.
- Admin property operations module has review checklist, stages and status controls.

## Strengths

- Core state machine exists end to end.
- Broker-created property path now preserves broker/host/RM context.
- RM authorization checks enforce assigned RM approval/rejection.
- Admin approval requires RM approval before property can go live.
- Notifications are triggered through `services.verification_workflow`.
- Broker rework path exists after rejection.

## Gaps / Risks

1. Verification status enum mismatch:
   - `PropertyVerification.status` enum does not include `approved`, but admin final approval writes `status = "approved"`.
   - This can work in Mongo but is a schema consistency risk.

2. Duplicate admin review surfaces:
   - Legacy admin routes and admin-core property operations both manage property review state.
   - This can create conflicting stage/status updates if both are used by different screens.

3. Audit coverage is inconsistent:
   - Broker property create/update/submit/rework writes audit logs.
   - RM approve/reject and legacy admin approve/reject mostly log via logger/notifications, not always audit logs.

4. Broker draft verification submit currently creates a verification task but does not call `on_host_submit`.
   - This is intentional for broker-created drafts, but notification coverage should be checked.

5. Rejection target differs:
   - RM reject currently moves property to `draft`.
   - Admin reject moves property to `rejected`.
   - Broker rework handles both, but UI wording and workflow rules should be standardized.

6. Checklist data shape risk:
   - Broker checklist is boolean-based.
   - Admin-core checklist stores richer objects with status/remarks/reviewed_by.
   - These may coexist in the same `checklist` field.

7. Live integration tests depend on seeded local credentials:
   - `backend/tests/test_phase13_listing.py` requires `host@propnest.com / host123`, which failed locally with 401.

## Phase 14 Implementation Plan

Step 2: Broker site-visit validation and evidence hardening
- Tighten required checklist/photo rules.
- Improve failed checklist reason handling.
- Preserve broker upload UX.

Step 3: RM review queue integration
- Confirm RM pending list includes broker-created properties.
- Add/verify audit logs for RM approve/reject.
- Standardize rejection output for broker rework.

Step 4: Admin final approval integration
- Confirm admin final approval list receives RM-approved broker submissions.
- Add/verify audit logs for admin approve/reject.
- Normalize final verification status.

Step 5: Notifications and audit coverage
- Ensure broker, host, RM and admin notifications are fired at each transition.
- Add route contract tests for verification handoff.

Step 6: End-to-end testing and hardening
- Contract tests for route registration.
- Compile/build verification.
- Note live E2E seed requirements.

## No Code Changes in Step 1

This step is an audit/report only. No production API, model, or UI behavior was changed.
