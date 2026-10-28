#!/usr/bin/env python3
"""Smoke check for the local Keycloak identity stand-in (ADR-0010, S1-03).

Needs the stack running: docker compose up -d keycloak. Uses only the Python standard
library, so it runs on Windows, macOS and Linux without Git Bash. Step 3 parses the login
form HTML of the pinned Keycloak (26.8.x, see compose.yaml). If that markup changes,
step 3 fails first.

Every value below is a throwaway local default, valid only for this stack. Never print a
token or a secret from this script.

Run from anywhere: python scripts/dev/keycloak_smoke.py
"""

import base64
import hashlib
import html
import json
import os
import re
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

ISSUER = os.environ.get("OIDC_ISSUER_URL", "http://127.0.0.1:8180/realms/slay-drip")
JWKS_URL = os.environ.get(
    "OIDC_JWKS_URL", "http://127.0.0.1:8180/realms/slay-drip/protocol/openid-connect/certs"
)
CLIENT_ID = os.environ.get("OIDC_CLIENT_ID", "slay-drip-pwa")
AUDIENCE = os.environ.get("OIDC_AUDIENCE", "slay-drip-api")
REDIRECT_URI = os.environ.get("OIDC_REDIRECT_URI", "http://localhost:5173/auth/callback")
KEYCLOAK_BASE_URL = os.environ.get("KEYCLOAK_BASE_URL", "http://127.0.0.1:8180")
KEYCLOAK_REALM = os.environ.get("KEYCLOAK_REALM", "slay-drip")
ADMIN_CLIENT_ID = os.environ.get("KEYCLOAK_ADMIN_CLIENT_ID", "slay-drip-backend-admin")
ADMIN_CLIENT_SECRET = os.environ.get(
    "KEYCLOAK_ADMIN_CLIENT_SECRET", "slaydrip-local-admin-secret"
)
PERSONA_USER = os.environ.get("SMOKE_USERNAME", "smoke.user@example.test")
PERSONA_PASSWORD = os.environ.get("SMOKE_PASSWORD", "slaydrip-local-smoke-1")
REALM_FILE = Path(
    os.environ.get("REALM_FILE", REPO_ROOT / "infra/dev/keycloak/realm/slay-drip-realm.json")
)


class SmokeFailure(Exception):
    pass


def fail(message):
    raise SmokeFailure(message)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Stops at the first redirect so the authorization code can be read from Location."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def send(opener, method, url, form=None, body=None, headers=None):
    """Return (status, response headers, body text) for any HTTP status, without raising."""
    data = None
    request_headers = dict(headers or {})
    if form is not None:
        data = urllib.parse.urlencode(form).encode()
        request_headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif body is not None:
        data = json.dumps(body).encode()
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, method=method, headers=request_headers)
    try:
        with opener.open(request, timeout=30) as response:
            return response.status, response.headers, response.read().decode(errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read().decode(errors="replace")
    except urllib.error.URLError as error:
        fail(f"could not reach {url}: {error.reason}")


def b64url(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def audience_includes(access_token, audience):
    payload = access_token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))
    aud = claims.get("aud", [])
    return audience in ([aud] if isinstance(aud, str) else aud)


def step_one(plain):
    status, _, body = send(plain, "GET", f"{ISSUER}/.well-known/openid-configuration")
    if status != 200:
        fail("step 1: discovery document not reachable at the issuer URL")
    discovery = json.loads(body)
    if discovery.get("issuer") != ISSUER:
        fail("step 1: discovery issuer does not equal OIDC_ISSUER_URL")
    if "S256" not in discovery.get("code_challenge_methods_supported", []):
        fail("step 1: discovery does not list S256 as a code challenge method")
    print("    issuer matches and S256 is listed")
    return discovery


def step_two(plain, discovery):
    if discovery.get("jwks_uri") != JWKS_URL:
        fail("step 2: discovery jwks_uri does not equal OIDC_JWKS_URL")
    status, _, body = send(plain, "GET", JWKS_URL)
    if status != 200 or "keys" not in json.loads(body):
        fail("step 2: JWKS URL did not return keys")
    print("    JWKS URL matches and returns keys")


def remember_cookies(cookies, headers):
    """Keep name=value pairs from Set-Cookie. The cookie jar would drop the Secure cookies over http."""
    for line in headers.get_all("Set-Cookie") or []:
        name, _, rest = line.partition("=")
        cookies[name.strip()] = rest.split(";", 1)[0]


def cookie_header(cookies):
    return {"Cookie": "; ".join(f"{name}={value}" for name, value in cookies.items())} if cookies else {}


def step_three(plain):
    cookies = {}
    verifier = b64url(secrets.token_bytes(48))
    challenge = b64url(hashlib.sha256(verifier.encode()).digest())
    state = secrets.token_hex(8)
    nonce = secrets.token_hex(8)

    query = urllib.parse.urlencode(
        {
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": "openid",
            "state": state,
            "nonce": nonce,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
    )
    status, headers, login_html = send(
        plain, "GET", f"{ISSUER}/protocol/openid-connect/auth?{query}"
    )
    if status != 200:
        fail("step 3: authorization request failed")
    remember_cookies(cookies, headers)

    form_tag = re.search(r'<form\b[^>]*\bid="kc-form-login"[^>]*>', login_html)
    action = re.search(r'action="([^"]*)"', form_tag.group(0)) if form_tag else None
    if not action:
        fail("step 3: login form not found; the Keycloak markup may have changed")
    form_action = html.unescape(action.group(1))

    status, headers, _ = send(
        plain,
        "POST",
        form_action,
        form={"username": PERSONA_USER, "password": PERSONA_PASSWORD, "credentialId": ""},
        headers=cookie_header(cookies),
    )
    remember_cookies(cookies, headers)
    location = headers.get("Location", "")
    code = urllib.parse.parse_qs(urllib.parse.urlsplit(location).query).get("code", [""])[0]
    if not code:
        fail(
            "step 3: sign-in did not return an authorization code "
            "(wrong persona password or not imported)"
        )

    status, _, body = send(
        plain,
        "POST",
        f"{ISSUER}/protocol/openid-connect/token",
        form={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "code_verifier": verifier,
        },
    )
    if status != 200:
        fail("step 3: token request failed")
    tokens = json.loads(body)
    if "id_token" not in tokens:
        fail("step 3: no ID token returned")
    access_token = tokens.get("access_token", "")
    if not access_token:
        fail("step 3: no access token returned")
    if not audience_includes(access_token, AUDIENCE):
        fail(f"step 3: access token audience does not include {AUDIENCE}")
    print(f"    sign-in succeeded and the audience includes {AUDIENCE}")


def step_four(plain):
    status, _, body = send(
        plain,
        "POST",
        f"{KEYCLOAK_BASE_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token",
        form={
            "grant_type": "client_credentials",
            "client_id": ADMIN_CLIENT_ID,
            "client_secret": ADMIN_CLIENT_SECRET,
        },
    )
    if status != 200:
        fail("step 4: admin client could not get a token")
    admin_auth = {"Authorization": f"Bearer {json.loads(body).get('access_token', '')}"}

    users_url = f"{KEYCLOAK_BASE_URL}/admin/realms/{KEYCLOAK_REALM}/users"
    throwaway = f"smoke-{int(time.time())}-{os.getpid()}@example.test"
    throwaway_id = None
    try:
        status, headers, _ = send(
            plain,
            "POST",
            users_url,
            body={"username": throwaway, "email": throwaway, "enabled": True, "emailVerified": True},
            headers=admin_auth,
        )
        if status != 201:
            fail(f"step 4: create user returned {status}, expected 201")
        throwaway_id = headers.get("Location", "").rstrip("/").rsplit("/", 1)[-1]
        if not throwaway_id:
            fail("step 4: created user id not returned")

        status, _, _ = send(plain, "POST", f"{users_url}/{throwaway_id}/logout", headers=admin_auth)
        if status != 204:
            fail(f"step 4: logout returned {status}, expected 204")

        status, _, _ = send(plain, "DELETE", f"{users_url}/{throwaway_id}", headers=admin_auth)
        if status != 204:
            fail(f"step 4: delete returned {status}, expected 204")
        throwaway_id = None

        query = urllib.parse.urlencode({"username": throwaway})
        status, _, body = send(plain, "GET", f"{users_url}?{query}", headers=admin_auth)
        if status != 200:
            fail(f"step 4: user lookup after delete returned {status}")
        if json.loads(body) != []:
            fail("step 4: throwaway user still found after delete")
        print("    create 201, logout 204, delete 204, not found afterwards")
    finally:
        if throwaway_id:
            send(plain, "DELETE", f"{users_url}/{throwaway_id}", headers=admin_auth)

    # Static check of the committed realm file. The admin client holds no view-realm, so the
    # registration setting cannot be read live. Local self-service registration is on (ADR-0010 amendment).
    realm = json.loads(REALM_FILE.read_text(encoding="utf-8"))
    if realm.get("registrationAllowed") is not True:
        fail(f"step 4: {REALM_FILE.name} does not set registrationAllowed to true (static check)")
    print("    static check: registrationAllowed is true in the committed realm file")


def main():
    plain = urllib.request.build_opener(NoRedirect)
    try:
        print("1/4 discovery document and issuer")
        discovery = step_one(plain)

        print("2/4 JWKS URL matches discovery and returns keys")
        step_two(plain, discovery)

        print("3/4 persona signs in with authorization code and PKCE S256")
        step_three(plain)

        print("4/4 admin client lifecycle on a throwaway user, and registration setting")
        step_four(plain)
    except SmokeFailure as failure:
        print(f"FAIL: {failure}", file=sys.stderr)
        return 1

    print("OK: Keycloak smoke passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
