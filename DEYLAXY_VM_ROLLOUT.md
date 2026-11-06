# Deylaxy release: production VM preparation

Branch: `feature/deylaxy-prod-20261106`

Required base: `74352fbbc6d436932f4a3383479bb8d35aff02bc`

This release contains only Deylaxy integration and its blog renderer/editor
compatibility changes. It does not merge main or replace AdminLayout,
ExecutiveDashboard, or adminNavigation. Pushing the branch is not a VM deployment;
external automation, if configured separately, must be considered by the operator.
No GitHub Actions workflow is included in this production base/release.

## First: inspect, without changing running code or the database

Run on the production VM:

```bash
cd /var/www/Goldenrich-STR
git rev-parse HEAD
git status --short
systemctl list-units --type=service --all | grep -Ei 'xspace|golden|uvicorn|gunicorn|backend'
sudo nginx -T 2>/dev/null | grep -E 'server_name|root |alias |proxy_pass'
```

The known untracked backup files should be left alone. If tracked source changes
exist, or the deployed HEAD is no longer the base above, stop and reconcile the
actual release before updating. Do not run git clean, reset --hard, pull main,
database cleanup/seed scripts, or the generic deploy-production.sh.

After the branch is pushed, fetch and inspect only:

```bash
git fetch origin feature/deylaxy-prod-20261106
git log --oneline 74352fb..FETCH_HEAD
git diff --stat 74352fb FETCH_HEAD
git diff 74352fb FETCH_HEAD -- frontend/src/pages/admin/AdminLayout.js frontend/src/pages/admin/ExecutiveDashboard.js frontend/src/pages/admin/adminNavigation.js
```

The last diff must be empty. Fetch does not change checked-out application files.
These commands do not restart a service or open a database connection.

## Deployment plan after paths and services are confirmed

Exact code-switch, frontend-publication and restart commands depend on the
service manager configuration and Nginx paths above. Do not guess them or
publish to the repository's unrelated S3 defaults. Check whether the API process
uses --reload: updating its source in place could activate changes immediately.

Prepare a separate release from the reviewed branch and keep the currently
served frontend/backend release for rollback. Preserve all production .env,
uploads and existing database credentials. Arrange a scoped backup of the CMS
blog record using the normal backup process before enabling external publishing.
No production backup or database operation has been performed by this work.

Install `backend/requirements.txt` into the verified backend environment before
activation; it adds `nh3==0.3.7`. Build the frontend with existing production
configuration. Never copy the localhost frontend .env or a localhost build into
production. Node dependency/lock files are unchanged by this release.

Publish backend and frontend as one reviewed release, keeping the integration
disabled initially. Verify home/blog, admin login/editor and existing booking,
host/employee/telecaller paths before enabling Deylaxy.

## Production-only settings

Add to the existing production backend .env; retain every unrelated setting:

```dotenv
DEYLAXY_BLOG_ENABLED=false
DEYLAXY_BLOG_SECRET=THE_SHARED_SECRET_FROM_DEYLAXY
DEYLAXY_SITE_URL=https://www.x-space360.in
DEYLAXY_BLOG_AUTHOR=X-Space360 Editorial
```

Use the actual securely supplied secret, not the placeholder or local test secret.
The canonical host must match the site's confirmed production configuration.
After release verification, set ENABLED=true and restart/reload the verified API
service. The endpoint does not create articles until a valid signed content event
arrives. Normal API startup still performs this application's existing schema/
default initialization and starts background jobs; this release does not add a
new table or migration.

Confirm HTTPS routing before entering these in Deylaxy:

- Proposed webhook: `https://api.x-space360.in/api/deylaxy/posts`
- Post-address pattern: `https://www.x-space360.in/blog/{slug}`

Have Deylaxy send a signed ping, then one approved article. Verify returned URL,
image, body/FAQ/table rendering, meta tags, sitemap, retries, update/revert and
team-edit protection. Their servers cannot reach your localhost directly.
Confirm their Edge installation/JSON-LD ownership separately.

## Stop publishing or roll back

Disable the flag and restart/reload the verified API service, and pause provider
deliveries. Existing articles remain visible until deactivated. Restoring an old
release/build is separate from undoing published content; review or restore only
the affected CMS blog record when appropriate. Do not restore the entire database
to undo this feature, and do not discard newer editorial changes accidentally.
