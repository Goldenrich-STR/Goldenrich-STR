# Deylaxy blog integration — local implementation, not deployed

Local test copy: `C:\Users\User\Downloads\Goldenrich-STR\scratch\production-local`

Git release worktree: `C:\Users\User\Downloads\Goldenrich-STR\scratch\deylaxy-release`

Release branch: `feature/deylaxy-prod-20261106`. It starts from the production
commit below and contains no merge from main. See `DEYLAXY_VM_ROLLOUT.md` for the
read-only VM checks required before live deployment.

Base: production VM source commit `74352fbbc6d436932f4a3383479bb8d35aff02bc`.
The original main checkout and its environment files remain unchanged. The
production-local test copy remains ignored; this separate release worktree tracks
only the reviewed integration files. No .env or local test JSON is included.

## What is implemented

- `POST /api/deylaxy/posts` on the existing FastAPI backend. No separate service/port.
- Disabled unless `DEYLAXY_BLOG_ENABLED=true` and a nonempty shared secret is configured.
- HMAC-SHA256 over the exact timestamp + `.` + raw request bytes; constant-time
  signature comparison and a five-minute timestamp tolerance. Keep server time synchronized.
- One MiB request limit, payload validation, HTML sanitization (`nh3==0.3.7`).
- `ping`, `post.create`, `post.update`, `post.revert`. Create publishes immediately;
  there is no approval queue. Leave the feature disabled if automatic publication
  has not been approved by your content team.
- Articles use the existing `cms_content` landing/blog row. Existing team posts
  and section settings are preserved. No new table or SQL migration is needed.
- The newer vendor ZIP has been reviewed and adapted. Its two files concern blog
  publishing, not metadata on every website page. The existing registered route
  remains `backend/routes/deylaxy_routes.py`; do not also register the ZIP's
  `deylaxy_blog_endpoint.py`, which would duplicate the same URL. `server.py` is
  this project's entry point, rather than the ZIP's example `main.py`.
- Vendor-format FAQs, the first Markdown table, reading time, India-local date
  label, configurable byline, and retained covers on updates are supported.
  Articles edited outside the admin route are also checked by content fingerprint.
  Markdown code examples are not parsed as real FAQ sections or tables.
- Real article changes append an audit entry to the existing `audit_logs` table
  inside the same transaction. Receipt-only retries/pings do not append audit
  entries. If audit persistence fails, the article and receipt roll back as well.
- PostgreSQL transaction, advisory lock and row lock protect the complete blog
  change, revision and delivery receipt. Concurrent retries reuse the same response.
- Optional stable `X-Deylaxy-Event-ID`, or top-level `eventId` / `event_id`.
  Without one, exact raw-body hashing deduplicates retries. Identical intentional
  events need different event IDs; changed serialization without an ID cannot be
  recognized as the same delivery. Reusing one ID for different bytes returns 409.
- Up to 50 prior versions per provider article; revisions/receipts live in the
  same CMS document under `deylaxy_state`, outside public `content_data`.
  Receipts are retained to recognize delayed retries. Monitor CMS row size as
  content volume grows; this adapts the current all-posts-in-one-row architecture.
  The ZIP's separate Mongo-style revision collection was not copied: this project
  uses PostgreSQL, and keeping revisions with the locked CMS record preserves
  atomic rollback without creating a new database table.
- Provider updates and reverts cannot change team-owned/team-edited articles.
  Admin changes set `editedByTeam`; stale whole-section saves return 409 instead
  of removing newly delivered articles. Reload Blog Management before retrying.
- Articles appear in the existing Blog listing, detail page and CMS-driven home
  page cards. Existing blog sitemap discovers active posts from the same CMS data.
- SEO title/description and cover image mapping; Markdown display, or sanitized
  HTML display when Markdown is absent. Unknown/offline article slugs no longer
  show a different article. The SPA displays an unavailable page with noindex;
  this is not a server-generated HTTP 404.
- Provider JSON-LD is not injected; Edge ownership must be confirmed with Deylaxy.
  Existing site-level structured data remains. This is a publishing integration,
  not a guarantee of indexing, rankings, SEO/GEO/AEO scores, or crawler rendering.

## Local configuration and testing

Edit **this folder's** `backend/.env`, not the parent's .env or production's .env:

```dotenv
DEYLAXY_BLOG_ENABLED=true
DEYLAXY_BLOG_SECRET=YOUR_LOCAL_TEST_SHARED_SECRET
DEYLAXY_SITE_URL=http://127.0.0.1:3000
DEYLAXY_BLOG_AUTHOR=X-Space360 Editorial
```

Choose a random secret, not the literal placeholder. For local tests it need not
be the production secret. Keep PostgreSQL on localhost and payment/SMS/email
demo flags enabled. Do not paste secrets in chat, source, patches or Git.
The ZIP's `SITE_URL` is accepted as an alias; `DEYLAXY_SITE_URL` takes precedence.
Keep the explicit `DEYLAXY_BLOG_ENABLED=true` opt-in; merely setting a secret does
not activate this implementation. This differs intentionally from the ZIP default.

From this production-local folder, use two terminals:

```powershell
# Terminal 1 — backend (starting it performs normal local DB startup writes)
cd backend
..\..\..\backend\.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

```powershell
# Terminal 2 — frontend
cd frontend
npm.cmd start
```

Stop older local servers on the same ports first. In a third terminal, from
`production-local/backend`, test the signed connection without creating a post:

```powershell
..\..\..\backend\.venv\Scripts\python.exe tools/deylaxy_send_test.py
```

Expected: HTTP 200 and `{"ok":true}`. The tool refuses remote URLs and redirects.
For local content testing, save this JSON outside Git as `sample-create.json`:

```json
{
  "event": "post.create",
  "eventId": "local-demo-create-001",
  "post": {
    "slug": "deylaxy-local-demo",
    "title": "Local Deylaxy Demo",
    "excerpt": "A local test article.",
    "markdown": "## Welcome\n\nThis article is for local testing only.",
    "html": "<h2>Welcome</h2><p>This article is for local testing only.</p>",
    "seoTitle": "Local Deylaxy Demo | X-Space360",
    "seoDescription": "A local integration test.",
    "author": "Editorial"
  }
}
```

Then:

```powershell
..\..\..\backend\.venv\Scripts\python.exe tools/deylaxy_send_test.py --payload sample-create.json
```

This deliberately writes a local CMS article. Open the returned URL, `/blog`, and
`/admin/blogs`. Send the same file again: it must return the same ref/URL without
another post. For update/revert, use the returned `post.ref`, a new eventId, and
`event: post.update` with full article fields, or `event: post.revert` with
`post.mode: UPDATE` / `CREATE`. Updates are complete field replacements, not patches.
CREATE revert hides the article. UPDATE revert restores the most recent saved version.
For ZIP compatibility, omitted revert mode means UPDATE; missing/removed or
team-owned/team-edited posts are acknowledged without changing them. Updates to
team-owned/team-edited posts still return 409. No available older revision is a
successful no-op. Team protection applies to content fingerprints as well as flags.

Test admin editing and stale saves using two browser tabs. Provider updates after
a team edit must return 409. Existing CMS records on page `blog` rather than
`landing` were already outside the website's public blog feed; they are not
silently migrated. Review any such legacy records before activation.

Turn `DEYLAXY_BLOG_ENABLED=false` to stop accepting deliveries. This does not
delete articles or undo already published content. Existing provider articles
still retain their team-edit/version protections. Articles/sections may be
deactivated in the CMS. Whole-section deletion is blocked when delivery history
exists, so receipts/revisions are not silently lost.

## Ask Deylaxy for these items

1. **Production webhook shared secret and how it is provisioned/rotated.** Both
   ends must use the same secret to authenticate deliveries. Share it securely.
2. **A real sample delivery from your Deylaxy account for all four events.** The ZIP
   confirms one POST endpoint, not separate GET/PATCH/DELETE APIs. Confirm
   exact event names, author/cover formats, that update supplies the full article,
   revert mode is CREATE or UPDATE, and returned ref/url are retained by them.
3. **Stable delivery/event IDs, retry/backoff rules and ordering guarantees.** This
   allows reliable duplicate recognition and avoids an older update arriving
   after a newer one. We do not assume undocumented sequence/version fields.
4. **Typical/max article size and whether Markdown is always supplied.** The
   endpoint caps deliveries at one MiB and supports sanitized HTML fallback.
5. **Deylaxy Edge installation/configuration and JSON-LD ownership.** Their file
   says Edge injects structured data; the source alone does not prove Edge is
   active in your CDN/proxy. Confirm canonical host, indexing/crawler rendering,
   and which system owns article structured data. No Edge/CDN change was made.
6. **Their 'Send a test' facility and staging support.** An external provider cannot
   reach localhost directly. A staging URL or deliberately configured temporary
   tunnel is needed for vendor-to-local testing; none has been opened here.
7. **Publishing controls/content approval and image licensing/hosting.** This
   integration automatically publishes create messages, and references supplied
   image URLs; it does not copy images into your cloud bucket.

## Production rollout — prepare/review first, do not merge main

No production operation has been executed. Do not deploy from the parent main
branch; it contains the unwanted admin UI changes. The companion
`DEYLAXY_CHANGESET.patch` contains only this integration against `74352fb` and
excludes every .env, credential, upload and generated build.

In a separate developer checkout based on `74352fb`, create a dedicated integration
branch and run `git apply --check /path/to/DEYLAXY_CHANGESET.patch` before applying.
Review the diff there. The production-based release branch has now been prepared in a separate
worktree; the original main checkout remains unchanged. If production moves forward, rebase/review the patch
against the actual deployed code; do not overwrite newer fixes.

Before deployment, keep the currently served frontend build and backend release
available for rollback, and take a controlled backup of the affected CMS blog
document using your normal backup process. No database backup was taken here.
Do not copy a local DB or local .env to production. Preserve all production
database/auth/payment/storage settings.

1. Install the reviewed requirements in production's existing virtual environment
   (`python -m pip install -r requirements.txt`, from backend) **before** restarting.
2. Deploy the reviewed backend and built frontend using your existing VM release
   process. Do not run the repository's generic deployment script blindly; it
   contains cloud targets and may not match this VM's actual hosting.
3. Keep `DEYLAXY_BLOG_ENABLED=false` initially. Check existing home/blog, admin
   login/editor, booking flow, host/employee/telecaller screens, health and API.
4. Set `DEYLAXY_BLOG_SECRET` securely and `DEYLAXY_SITE_URL` to the confirmed
   canonical public website host (likely `https://www.x-space360.in`; confirm).
5. After review, set `DEYLAXY_BLOG_ENABLED=true` and restart/reload the API using
   the existing service manager. Supply Deylaxy with the HTTPS endpoint. Proposed
   URL: `https://api.x-space360.in/api/deylaxy/posts`, **subject to confirming the
   actual production API host and proxy route**. This URL was not probed here.
6. Have them send a signed ping, then one approved article. Check its returned
   URL, admin record, meta tags, sitemap, retry, update and revert.

Rollback: disable the integration first and pause Deylaxy deliveries. Keep this
release's CMS edit protection while reviewing delivered content. For full rollback,
restore the prior release/build and the controlled blog-document backup only if
appropriate; doing so may discard editorial changes since backup. Do not restore
the whole application database just to undo this feature. Disabling alone leaves
already published articles visible until they are deactivated.

## Verification and limits

Offline tests block asyncpg connection creation and bypass the repository's
database-backed conftest. They cover request authentication/limits, signed API
round trips, retries, transactions using an in-memory transaction fake, team
ownership, stale admin saves, sanitization, and existing OTP/payment/telecaller
regressions. This is not a live PostgreSQL concurrency test or a Deylaxy end-to-end
test. Those require a permitted local/staging database and provider test delivery.
No real database, production VM, hosting configuration or cloud service was changed.

## Quick next steps for your account

1. Open Deylaxy **Connections → Deylaxy Edge → Where Deylaxy's articles go**, as
   described by their ZIP. Obtain the shared secret there; do not post it in chat.
2. For local testing, set the four environment variables above in this copy's
   `backend/.env`, restart the backend/frontend, and use the localhost test tool.
   These operations write only to your deliberately configured local database.
3. Run the approved content/create/retry/update/revert checks before rollout.
4. Use the reviewed patch on a production-based branch, not main. Deploy backend
   dependencies and frontend together through the existing release process.
5. Only after deployment/proxy verification, enter the confirmed public endpoint
   and `https://www.x-space360.in/blog/{slug}` as the post-address pattern in Deylaxy.
   Set production's own secret, canonical URL, author and explicit enabled flag.
6. Ask Deylaxy to send a test ping and then one approved article. A localhost
   result alone does not establish that their servers can reach the production API.
