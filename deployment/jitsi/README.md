# Jitsi/Jibri Recording Deployment

## Purpose

This integration records a Telecaller-led verification call only after the Telecaller confirms host consent. The application creates a recording session, asks the embedded self-hosted Jitsi room to start a `file` recording, and accepts the final Jibri callback to attach the private recording to the verification case.

Do not enable this against `meet.jit.si`. Use a self-hosted Jitsi deployment with Jibri and private S3 storage.

## API environment

Set these on the STR API server:

```env
JITSI_MEET_BASE_URL=https://meet-uat.example.com
JITSI_RECORDING_ENABLED=true
JITSI_RECORDING_CALLBACK_SECRET=<long-random-secret>
S3_UPLOADS_BUCKET=<private-recordings-bucket-or-private-uploads-bucket>
AWS_REGION=ap-south-1
```

The API endpoint for Jibri finalization is:

```text
POST https://<api-domain>/api/verification-cases/recording-callback
X-XSpace-Recording-Secret: <JITSI_RECORDING_CALLBACK_SECRET>
```

Payload:

```json
{
  "session_id": "XSP-REC-...",
  "status": "COMPLETED",
  "recording_url": "https://private-delivery-url-or-signed-url",
  "recording_object_key": "verification-recordings/XSP-REC-.../recording.webm",
  "duration_seconds": 845,
  "started_at": "2026-10-13T10:00:00Z",
  "completed_at": "2026-10-13T10:14:05Z"
}
```

The callback may report `RECORDING`, `COMPLETED`, or `FAILED`. The callback secret must never be exposed to React/browser code.

## Jitsi/Jibri requirements

- Deploy Jitsi Meet and Jibri on dedicated Linux infrastructure. Enable `file` recording and include the Jitsi `recording` toolbar capability.
- One active recording requires one available Jibri worker. Size and scale workers for expected concurrent verification calls.
- Jibri must upload the finalized file to a private S3 prefix such as `verification-recordings/<session-id>/`.
- The Jibri finalizer must receive or look up the `recordingSessionId` passed as Jitsi `extraMetadata`, then call the STR callback after S3 upload.
- Keep recordings private. Return a short-lived signed delivery URL in `recording_url`, or have the STR backend generate one after validating BM/Admin access.
- Restrict the callback endpoint at the network layer to Jibri/VPN addresses where possible, in addition to the shared secret.

## Operational flow

1. Telecaller joins the scheduled room and confirms host consent.
2. STR creates `XSP-REC-*` session in the verification case.
3. Browser calls Jitsi `startRecording` with the session ID in `extraMetadata`.
4. Jibri records the room and uploads the finalized media to private S3.
5. Jibri calls STR callback; STR stores recording status, object key and URL.
6. BM/Admin reads the recording URL from the verification case using role-based UI/API access.

## UAT test

1. Enable Jibri and all three JITSI variables on UAT backend.
2. Schedule a test verification, join as Telecaller and Host.
3. Check consent, click **Start secure recording**, and verify Jitsi recording indicator.
4. Stop/end the call; wait for Jibri finalization.
5. Confirm the verification case has `recording_status=COMPLETED` and the expected S3 object key/URL.
6. Test a failed upload callback and confirm it produces `recording_status=FAILED` without exposing a public recording URL.