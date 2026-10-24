# OTP production verification runbook

No production change should be deployed from this repository without release
approval. Run these checks against the current production deployment before
submitting a new TestFlight build.

## Current implementation facts

- The existing SMS provider is MSG91; no secondary provider is configured.
- Registration uses `POST /api/auth/send-otp`, then `POST /api/auth/verify-otp`.
- The provider response is only an acceptance response. It is **not** proof of
  handset delivery. Use MSG91 delivery reports for the final status.
- Production mobile builds are pinned to `https://api.x-space360.in`; iOS ATS
  disallows arbitrary HTTP loads.

## Required production checks

1. Confirm the deployed environment has `MSG91_DEMO_MODE=false`, a non-demo
   `MSG91_AUTHKEY`, `MSG91_SENDER_ID`, and `MSG91_TEMPLATE_ID`. Do not paste
   credentials into source control or tickets.
2. In MSG91, verify the sender ID is active for the transactional route and
   that the Flow template ID is active, approved, and uses variables matching
   `MSG91_OTP_NAME_VARIABLE` and `MSG91_OTP_CODE_VARIABLE`.
3. For Indian recipients, verify the exact message text and sender/template
   mapping are DLT-approved and entity/template IDs are correctly linked in
   MSG91. Check the registered header and route, not merely template approval.
4. Search backend logs by a masked phone suffix and timestamp. Record the HTTP
   status, provider response/request ID, configured template ID (never authkey
   or OTP), and application instance. Then look up that ID in MSG91 delivery
   reports for submitted, delivered, failed, or rejected status and reason.
5. Inspect MSG91 account credit, account/route restrictions, per-number and
   per-template rate limits, DND/carrier failures, and regional support. Test
   with authorized Indian and non-Indian numbers only where the account/route
   supports them.
6. Confirm Redis is healthy and shared by all backend workers. The OTP expiry,
   attempt counter, resend cooldown, and send-window limit depend on it for
   multi-worker consistency.

## Device test matrix

Use authorized test numbers only. For each row, retain the app build number,
request timestamp, masked recipient, API response status, MSG91 request ID,
and final delivery-report status.

| Device | OS | Carrier/region | First OTP | Resend after 30s | Expiry | Invalid attempts |
| --- | --- | --- | --- | --- | --- | --- |
| iPhone (physical) | current supported iOS | India |  |  |  |  |
| iPad (physical) | current supported iPadOS | India |  |  |  |  |
| iPhone (physical) | current supported iOS | supported international route, if enabled |  |  |  |  |

## Fallback decision

Do not add RCS as the only OTP channel. A voice fallback or secondary SMS route
may be enabled only if MSG91 supports it for the recipient country/carrier,
the business approves the cost and user experience, and its delivery/reporting
semantics are tested. It must retain the same OTP expiry, attempt limits, and
audit trail.

## TestFlight/App Review release checklist

- [ ] Production MSG91 and DLT checks above are evidenced with delivery reports.
- [ ] Authorized real-iPhone and real-iPad tests pass, including resend/expiry.
- [ ] Production app build uses `APP_ENV=production`, `PAYMENT_MODE=live`, and
  `API_BASE_URL=https://api.x-space360.in`.
- [ ] Build guard and production-artifact scan pass.
- [ ] No demo mode, mock OTP, OTP logging, or displayed OTP exists.
- [ ] App Review notes give a working authorized test number/account path and
  a contact who can investigate a timestamped delivery failure.
- [ ] Release approval is recorded before deployment/TestFlight upload.
