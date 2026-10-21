#!/usr/bin/env bash
# Smoke test for the local S3 stand-in (see docs/local-development.md).
# Creates the dev bucket if missing, then round-trips one object: PUT, GET, compare, DELETE.
# Uses curl's built-in SigV4 signing, so no AWS CLI or SDK is needed.
#
# Run from the repo root after `docker compose up -d`. Override the defaults with env vars
# to point the same check at another S3-compatible endpoint.
set -euo pipefail

ENDPOINT="${S3_ENDPOINT:-http://127.0.0.1:8333}"
REGION="${S3_REGION:-fr-par}"
ACCESS_KEY="${S3_ACCESS_KEY:-slaydrip-local}"
SECRET_KEY="${S3_SECRET_KEY:-slaydrip-local-secret}"
BUCKET="${S3_BUCKET:-slay-drip-local}"
KEY="smoke/$(date +%s)-$$.txt"

AUTH=(--aws-sigv4 "aws:amz:${REGION}:s3" --user "${ACCESS_KEY}:${SECRET_KEY}")
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Path-style URLs (endpoint/bucket/key), which the local server requires.
# Scaleway accepts both styles, so the app must make path style a config flag.
url() { printf '%s/%s/%s' "$ENDPOINT" "$BUCKET" "$1"; }

echo "1/4 ensure bucket ${BUCKET}"
status=$(curl -sS -o "$WORK/bucket.out" -w '%{http_code}' "${AUTH[@]}" -X PUT "$ENDPOINT/$BUCKET")
case "$status" in
  200|409) ;; # 409 = already exists, fine for a dev bucket
  *) echo "Bucket create failed with HTTP ${status}:"; cat "$WORK/bucket.out"; exit 1 ;;
esac

echo "2/4 put object ${KEY}"
printf 'slay-drip local smoke %s\n' "$(date -u +%FT%TZ)" > "$WORK/upload.txt"
curl -sS -f "${AUTH[@]}" -X PUT --data-binary "@$WORK/upload.txt" "$(url "$KEY")"

echo "3/4 get object and compare"
curl -sS -f "${AUTH[@]}" "$(url "$KEY")" -o "$WORK/download.txt"
if ! cmp -s "$WORK/upload.txt" "$WORK/download.txt"; then
  echo "Round-trip mismatch for ${KEY}"
  exit 1
fi

echo "4/4 delete object"
curl -sS -f "${AUTH[@]}" -X DELETE "$(url "$KEY")"

echo "OK: S3 round-trip passed against ${ENDPOINT} (bucket ${BUCKET}, region ${REGION})"
