#!/usr/bin/env python3
"""Smoke test for the local S3 stand-in (see docs/local-development.md).

Creates the dev bucket if missing, then round-trips one object: PUT, GET, compare, DELETE.
Signs requests with SigV4 using only the Python standard library, so no cloud CLI or SDK
is needed. The signing service name is the S3 protocol's own value.

Run from anywhere after `docker compose up -d`. Override the defaults with env vars to point
the same check at another S3-compatible endpoint.
"""

import datetime
import hashlib
import hmac
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

ENDPOINT = os.environ.get("S3_ENDPOINT", "http://127.0.0.1:8333")
REGION = os.environ.get("S3_REGION", "fr-par")
ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "slaydrip-local")
SECRET_KEY = os.environ.get("S3_SECRET_KEY", "slaydrip-local-secret")
BUCKET = os.environ.get("S3_BUCKET", "slay-drip-local")
SERVICE = "s3"


def sha256_hex(data):
    return hashlib.sha256(data).hexdigest()


def sign_key(date_stamp):
    key = ("AWS4" + SECRET_KEY).encode()
    for part in (date_stamp, REGION, SERVICE, "aws4_request"):
        key = hmac.new(key, part.encode(), hashlib.sha256).digest()
    return key


def signed_request(method, path, body=b""):
    """Return a urllib request for path on the endpoint, signed with SigV4 (path-style)."""
    parsed = urllib.parse.urlsplit(ENDPOINT)
    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    payload_hash = sha256_hex(body)

    canonical_uri = urllib.parse.quote(path, safe="/-_.~")
    headers = {
        "host": parsed.netloc,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    signed_names = ";".join(sorted(headers))
    canonical_headers = "".join(f"{name}:{headers[name]}\n" for name in sorted(headers))
    canonical_request = "\n".join(
        [method, canonical_uri, "", canonical_headers, signed_names, payload_hash]
    )
    scope = f"{date_stamp}/{REGION}/{SERVICE}/aws4_request"
    string_to_sign = "\n".join(
        ["AWS4-HMAC-SHA256", amz_date, scope, sha256_hex(canonical_request.encode())]
    )
    signature = hmac.new(
        sign_key(date_stamp), string_to_sign.encode(), hashlib.sha256
    ).hexdigest()

    request_headers = {
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
        "Authorization": (
            f"AWS4-HMAC-SHA256 Credential={ACCESS_KEY}/{scope}, "
            f"SignedHeaders={signed_names}, Signature={signature}"
        ),
    }
    url = f"{ENDPOINT}{canonical_uri}"
    return urllib.request.Request(url, data=body or None, method=method, headers=request_headers)


def send(request):
    """Return (status, body bytes) for any HTTP status, without raising."""
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def fail(message):
    print(message, file=sys.stderr)
    return 1


def main():
    key = f"smoke/{int(datetime.datetime.now().timestamp())}-{os.getpid()}.txt"
    object_path = f"/{BUCKET}/{key}"
    payload = f"slay-drip local smoke {datetime.datetime.now(datetime.timezone.utc):%Y-%m-%dT%H:%M:%SZ}\n".encode()

    print(f"1/4 ensure bucket {BUCKET}")
    status, body = send(signed_request("PUT", f"/{BUCKET}"))
    if status not in (200, 409):  # 409 = already exists, fine for a dev bucket
        return fail(f"Bucket create failed with HTTP {status}:\n{body.decode(errors='replace')}")

    print(f"2/4 put object {key}")
    status, body = send(signed_request("PUT", object_path, payload))
    if status != 200:
        return fail(f"Put failed with HTTP {status}:\n{body.decode(errors='replace')}")

    print("3/4 get object and compare")
    status, downloaded = send(signed_request("GET", object_path))
    if status != 200:
        return fail(f"Get failed with HTTP {status}")
    if downloaded != payload:
        return fail(f"Round-trip mismatch for {key}")

    print("4/4 delete object")
    status, body = send(signed_request("DELETE", object_path))
    if status not in (200, 204):
        return fail(f"Delete failed with HTTP {status}")

    print(f"OK: S3 round-trip passed against {ENDPOINT} (bucket {BUCKET}, region {REGION})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
