# Phase 13 - Step 1: Broker Property Creation Current-State Audit

Date: 2026-07-27

## Scope

Phase 13 focuses on broker-side property onboarding and listing workflow. This audit reviews the existing host property creation flow, backend property APIs, data model, media upload support, verification trigger, reusable frontend pieces, gaps, risks and the recommended implementation sequence.

No runtime code changes were made in this step.

## Current Architecture

### Existing Routes

- `POST /api/properties/`
  - File: `backend/routes/property_routes.py`
  - Current access: host only.
  - Creates property as draft.
  - Sets `owner_id` from current host user.
  - Copies `broker_id` from the host profile.

- `GET /api/properties/host/my-properties`
  - Current access: host only.
  - Returns host-owned property list.

- `PATCH /api/properties/{property_id}`
  - Current access: property owner host or admin.
  - Host full edit allowed before review/live.
  - Submitted/live host edit is restricted to pricing, rules, amenities and media.

- `POST /api/properties/{property_id}/submit-verification`
  - Current access: property owner host only.
  - Moves property to `pending_verification`.
  - Calls verification workflow `on_host_submit`.

- `GET /api/broker/properties`
  - Current access: broker only.
  - Returns properties assigned to broker.
  - Phase 12 added `owner_summary` and `verification_summary`.

### Existing Models

Property model supports:

- Basic listing fields: title, description, category, property type, BHK/size.
- Location: address, city, state, pin code, lat/lng, Google Maps URL, nearby places.
- Pricing: price per night/day, pricing cycle, weekly/monthly/person/extra guest pricing.
- Amenities and rules.
- Images and videos.
- Residential/commercial/event venue flags.
- Status workflow: `draft`, `pending_verification`, `under_review`, `live`, `rejected`, `blocked`.
- Subscription linkage.
- Broker assignment through `broker_id`.

Booking model now supports broker ownership snapshot fields from Phase 12:

- `broker_id`
- `broker_lg_code`
- `rm_id`
- `employee_id`

## Reusable Frontend Assets

### Main Reusable Page

- `frontend/src/pages/HostListProperty.js`
  - Full multi-step property onboarding wizard.
  - Supports edit mode through `/host/list-property?edit={property_id}`.
  - Uses localStorage draft state per edit property.
  - Handles image/video upload.
  - Handles subscription/payment before verification submission.
  - Calls `propertyAPI.createProperty`, `propertyAPI.updateProperty`, `propertyAPI.submitForVerification`.

### Existing API Client

- `frontend/src/services/api.js`
  - `propertyAPI.createProperty`
  - `propertyAPI.updateProperty`
  - `propertyAPI.submitForVerification`
  - `propertyAPI.getProperty`
  - `uploadAPI.uploadImage`
  - `uploadAPI.uploadVideo`

### Broker Dashboard Reusable UI

- `frontend/src/pages/BrokerDashboard.js`
  - Already has Property Listing CRM, PropertyDetailsModal, broker navigation and host selection context from Phase 12.

## Missing Broker-Side Capabilities

1. Broker cannot create a property for an assigned host.
2. Broker cannot select host before creating property.
3. Existing `POST /properties/` is host-only, so broker cannot reuse it directly.
4. Existing `PATCH /properties/{id}` only allows owner host/admin, not assigned broker.
5. Existing submit-verification endpoint is host-owner only, not assigned broker.
6. Property model has only `broker_id`; it does not yet store property-level `broker_lg_code`, `rm_id`, or `employee_id`.
7. Broker dashboard has no `Create New Property` button yet.
8. Broker dashboard does not route to a broker-specific create/edit property workflow.
9. Property timeline/history is not persisted yet as a dedicated event stream.
10. Audit log coverage for broker-created property lifecycle needs to be added.

## Incorrect / Legacy Naming

- `Owner Network` and `owners` still appear internally in some broker code. UI is now `Host Management`, but backend route is still `/broker/my-owners`.
- For backward compatibility, keep `/broker/my-owners` for now and add new broker property APIs separately.

## Data/Migration Requirements

No mandatory migration is required for Step 2 if fields are optional.

Recommended additive fields for new/updated property records:

- `broker_lg_code`
- `rm_id`
- `employee_id`
- `created_by_role`
- `created_by_user_id`
- `managed_by_broker_id`

Recommended future migration/backfill:

- Backfill `broker_lg_code`, `rm_id`, `employee_id` on existing properties where owner host has those values.
- Backfill property lifecycle history from `created_at`, `submitted_at`, `approved_at`, `status`, and existing verification records.

## APIs To Add Or Change

### Add

- `POST /api/broker/properties`
  - Broker creates property for assigned host.
  - Required payload should include `owner_id`.
  - Must verify host belongs to broker.

- `PATCH /api/broker/properties/{property_id}`
  - Broker edits assigned broker property.
  - Must verify property belongs to broker.

- `POST /api/broker/properties/{property_id}/submit-verification`
  - Broker submits assigned property for verification.
  - Must verify property belongs to broker.

### Preserve

- Keep existing host APIs unchanged.
- Keep existing admin APIs unchanged.
- Do not remove any property fields.

## Files Likely To Be Modified In Step 2

- `backend/models/property.py`
  - Add optional property ownership snapshot fields.

- `backend/routes/broker_routes.py`
  - Add broker create/edit/submit property APIs.

- `frontend/src/pages/BrokerDashboard.js`
  - Add `Create New Property` action and host selector entry point.

- `frontend/src/pages/HostListProperty.js`
  - Either adapt to support broker mode or extract reusable form logic.

- `frontend/src/services/api.js`
  - Add broker property API helpers if needed.

## Files Likely To Be Created In Step 2

Preferred incremental option:

- No new page initially. Reuse `HostListProperty.js` with broker mode if feasible.

Alternative cleaner option:

- `frontend/src/pages/BrokerListProperty.js`
  - Wrapper around the existing host form behavior with broker host selection.

## Risks

- Reusing `HostListProperty.js` directly may be risky because it assumes current user is a host in several places.
- Subscription/payment logic is host-oriented; broker-created properties may need a clear rule: whether broker can choose/pay subscription or only create draft.
- Broker edit permissions must not allow editing properties outside their assigned hosts/properties.
- Submit verification must not create duplicate verification tasks.
- Property lifecycle history is currently not structured, so timeline should be additive and not replace existing status fields.

## Step 2 Recommendation

Implement broker property creation incrementally:

1. Add broker backend endpoints first.
2. Broker can create draft property for an assigned host.
3. Persist broker snapshot fields on property.
4. Add `Create New Property` button in Broker Property CRM.
5. Start with draft create only.
6. Test backend compile and frontend build.

Then in later Phase 13 steps, add edit, media/rules improvements, submit verification, and timeline/history.
