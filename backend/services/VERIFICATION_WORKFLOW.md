# Property Verification Workflow (Phase 14)

State machine that takes a host-created property from `draft` → `live` (or
`rejected`). Implemented in `services/verification_workflow.py` and consumed by
`routes/property_routes.py`, `routes/broker_routes.py`,
`routes/employee_routes.py`, and `routes/admin_routes.py`.

## Two collections, two state fields

We track state in **two** documents that move in lock-step:

| Collection                | Field            | Values                                                               |
|---------------------------|------------------|----------------------------------------------------------------------|
| `properties`              | `status`         | `draft`, `pending_verification`, `under_review`, `live`, `rejected`  |
| `property_verifications`  | `status`         | `pending`, `in_progress`, `completed`, `rejected`                    |
| `property_verifications`  | `rm_reviewed`    | bool                                                                 |
| `property_verifications`  | `rm_approved`    | bool                                                                 |
| `property_verifications`  | `admin_reviewed` | bool                                                                 |
| `property_verifications`  | `admin_approved` | bool                                                                 |

## Transitions

```
                              host clicks
                          "Submit for verification"
draft ─────────────────────────────────────────────────▶ pending_verification
                                                           │
                                                  on_host_submit:
                                                  - assign_broker (lowest load)
                                                  - create PENDING verif row
                                                  - notify broker + host
                                                           │
                                  broker fills checklist + photos and posts
                                  POST /api/broker/verifications/{id}/submit
                                                           ▼
                                                       under_review
                                                       (verif.status = completed,
                                                        rm_reviewed = false)
                                                           │
                                                  on_broker_submit:
                                                  - notify all RMs + host
                                                           │
                  ┌────────────────────────────────────────┼────────────────────────────────────────┐
                  │ RM rejects                             │ RM approves                            │
                  │ POST /employee/verifications/{id}/reject  POST /employee/verifications/{id}/approve
                  ▼                                        ▼                                        │
              draft (back to host)                     under_review                                 │
              verif.status = rejected                  rm_reviewed = true                           │
              on_rm_decision(approved=False):           rm_approved = true                          │
              - notify host with reason                 on_rm_decision(approved=True):              │
                                                       - notify admins + host                       │
                                                                                                    │
                                  ┌────────────────────────────────────────────────────────────────┘
                                  │
                  ┌───────────────┴────────────────┐
                  │ Admin rejects                  │ Admin approves
                  │ POST /admin/properties/{id}/reject   POST /admin/properties/{id}/approve
                  │ (server enforces rm_approved=true required)
                  ▼                                ▼
              rejected                            live
              verif.status = rejected             verif.status = approved
              admin_approved = false              admin_approved = true
              on_admin_decision(False):           on_admin_decision(True):
              - notify host with reason           - notify host (your listing is live!)
```

## Endpoint payloads (all JSON bodies — no query strings)

| Role     | Endpoint                                                | Body                                                                                                  |
|----------|---------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| Host     | `POST /api/properties/{id}/submit-verification`         | _(none)_                                                                                              |
| Broker   | `POST /api/broker/verifications/{property_id}/submit`   | `VerificationSubmit { checklist, geo_tagged_photos[], video_url?, broker_remarks? }`                  |
| Employee | `POST /api/employee/verifications/{verif_id}/approve`   | `RMReviewRequest { remarks? }`                                                                        |
| Employee | `POST /api/employee/verifications/{verif_id}/reject`    | `RMRejectRequest { reason }`                                                                          |
| Admin    | `POST /api/admin/properties/{id}/approve`               | _(none)_                                                                                              |
| Admin    | `POST /api/admin/properties/{id}/reject`                | `AdminRejectRequest { reason }`                                                                       |

> **Frontend rule:** every dashboard goes through `verificationAPI` in
> `/app/frontend/src/services/api.js` to guarantee these payloads stay
> JSON-bodied and stay in sync with the Pydantic models.

## Guards enforced server-side

- `admin/properties/{id}/approve` → 400 if no `rm_approved=true` verification row exists.
- `broker/verifications/{property_id}/submit` → 404 if property does not exist.
- `employee/verifications/{verif_id}/(approve|reject)` → 404 if verification not found.
- `properties/{id}/submit-verification` → 403 if `owner_id` mismatch.

## Notifications fired

All notifications are dispatched via `services.notification_service.send_multi_channel_notification`
(in-app + WhatsApp + email; channels customised per recipient class).

| Trigger                       | Recipients              | NotificationType                |
|-------------------------------|-------------------------|---------------------------------|
| `on_host_submit`              | broker, host            | `VERIFICATION_ASSIGNED`         |
| `on_broker_submit`            | all RMs, host           | `VERIFICATION_SUBMITTED`        |
| `on_rm_decision(approved)`    | all admins, host        | `VERIFICATION_REVIEWED`         |
| `on_rm_decision(rejected)`    | host                    | `PROPERTY_REJECTED`             |
| `on_admin_decision(approved)` | host                    | `PROPERTY_APPROVED`             |
| `on_admin_decision(rejected)` | host                    | `PROPERTY_REJECTED`             |

## Resubmission

When RM rejects, the property goes back to `draft`. The host can edit the
listing and call `submit-verification` again; this re-triggers
`on_host_submit`, which **reuses** the existing verification row (idempotent
on `property_id`) and re-notifies the assigned broker.
