#!/usr/bin/env bash
set -Eeuo pipefail

BUCKET="${S3_BUCKET:-xspace-prod-frontend}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-EQPC5S4OUUUUH}"
BUILD_DIR="${BUILD_DIR:-build}"

command -v aws >/dev/null || {
  echo "ERROR: AWS CLI is not installed."
  exit 1
}

[[ -f "$BUILD_DIR/index.html" ]] || {
  echo "ERROR: $BUILD_DIR/index.html is missing. Run this script from frontend/."
  exit 1
}

echo "Uploading versioned static assets..."
aws s3 sync "$BUILD_DIR/static/" "s3://$BUCKET/static/" \
  --cache-control "public,max-age=31536000,immutable"

echo "Uploading public assets..."
aws s3 sync "$BUILD_DIR/" "s3://$BUCKET/" \
  --exclude "index.html" \
  --exclude "static/*" \
  --cache-control "public,max-age=3600"

echo "Verifying every asset referenced by index.html..."
mapfile -t referenced_assets < <(
  grep -oE 'static/(js|css)/[^"]+' "$BUILD_DIR/index.html" | sort -u
)

if [[ ${#referenced_assets[@]} -eq 0 ]]; then
  echo "ERROR: No JavaScript or CSS assets were found in index.html."
  exit 1
fi

for asset in "${referenced_assets[@]}"; do
  aws s3api head-object --bucket "$BUCKET" --key "$asset" >/dev/null || {
    echo "ERROR: Upload verification failed for $asset."
    echo "The current production index.html was left unchanged."
    exit 1
  }
  echo "OK: $asset"
done

echo "Publishing index.html last..."
aws s3 cp "$BUILD_DIR/index.html" "s3://$BUCKET/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache,max-age=0,must-revalidate"

echo "Creating CloudFront invalidation..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/" "/index.html" >/dev/null

echo "Deployment complete. Old hashed assets were retained for cached clients."
