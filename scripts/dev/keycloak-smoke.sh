#!/usr/bin/env bash
# Smoke check for the local Keycloak identity stand-in (ADR-0010, S1-03).
#
# Needs the stack running: docker compose up -d keycloak. Uses only curl, openssl, base64,
# sed, grep and date, which ship with Git Bash. Step 3 parses the login form HTML of the
# pinned Keycloak (26.8.x, see compose.yaml). If that markup changes, step 3 fails first.
#
# Every value below is a throwaway local default, valid only for this stack. Never print
# a token or a secret from this script.
set -euo pipefail

ISSUER="${OIDC_ISSUER_URL:-http://127.0.0.1:8180/realms/slay-drip}"
JWKS_URL="${OIDC_JWKS_URL:-http://127.0.0.1:8180/realms/slay-drip/protocol/openid-connect/certs}"
CLIENT_ID="${OIDC_CLIENT_ID:-slay-drip-pwa}"
AUDIENCE="${OIDC_AUDIENCE:-slay-drip-api}"
REDIRECT_URI="${OIDC_REDIRECT_URI:-http://localhost:5173/auth/callback}"
KEYCLOAK_BASE_URL="${KEYCLOAK_BASE_URL:-http://127.0.0.1:8180}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-slay-drip}"
ADMIN_CLIENT_ID="${KEYCLOAK_ADMIN_CLIENT_ID:-slay-drip-backend-admin}"
ADMIN_CLIENT_SECRET="${KEYCLOAK_ADMIN_CLIENT_SECRET:-slaydrip-local-admin-secret}"
PERSONA_USER="${SMOKE_USERNAME:-smoke.user@example.test}"
PERSONA_PASSWORD="${SMOKE_PASSWORD:-slaydrip-local-smoke-1}"
REALM_FILE="${REALM_FILE:-infra/dev/keycloak/realm/slay-drip-realm.json}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

jar="$(mktemp)"
throwaway_id=""
cleanup() {
  rm -f "$jar"
  if [ -n "$throwaway_id" ]; then
    curl -sS -o /dev/null -X DELETE -H "Authorization: Bearer $admin_token" \
      "$KEYCLOAK_BASE_URL/admin/realms/$KEYCLOAK_REALM/users/$throwaway_id" || true
  fi
}
trap cleanup EXIT

b64url() {
  base64 | tr '+/' '-_' | tr -d '=\n'
}

echo "1/4 discovery document and issuer"
discovery="$(curl -sS -f "$ISSUER/.well-known/openid-configuration")" \
  || fail "step 1: discovery document not reachable at the issuer URL"
printf '%s' "$discovery" | grep -qF "\"issuer\":\"$ISSUER\"" \
  || fail "step 1: discovery issuer does not equal OIDC_ISSUER_URL"
printf '%s' "$discovery" | grep -q '"S256"' \
  || fail "step 1: discovery does not list S256 as a code challenge method"
echo "    issuer matches and S256 is listed"

echo "2/4 JWKS URL matches discovery and returns keys"
printf '%s' "$discovery" | grep -qF "\"jwks_uri\":\"$JWKS_URL\"" \
  || fail "step 2: discovery jwks_uri does not equal OIDC_JWKS_URL"
curl -sS -f "$JWKS_URL" | grep -q '"keys"' \
  || fail "step 2: JWKS URL did not return keys"
echo "    JWKS URL matches and returns keys"

echo "3/4 persona signs in with authorization code and PKCE S256"
verifier="$(openssl rand 48 | b64url)"
challenge="$(printf '%s' "$verifier" | openssl dgst -sha256 -binary | b64url)"
state="$(openssl rand -hex 8)"
nonce="$(openssl rand -hex 8)"

login_html="$(curl -sS -f -G -c "$jar" -b "$jar" "$ISSUER/protocol/openid-connect/auth" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "redirect_uri=$REDIRECT_URI" \
  --data-urlencode "response_type=code" \
  --data-urlencode "scope=openid" \
  --data-urlencode "state=$state" \
  --data-urlencode "nonce=$nonce" \
  --data-urlencode "code_challenge=$challenge" \
  --data-urlencode "code_challenge_method=S256")" \
  || fail "step 3: authorization request failed"

# The form action sits on the same line as id="kc-form-login"; &amp; decodes to &.
form_action="$(printf '%s' "$login_html" | grep 'kc-form-login' \
  | sed -n 's/.*action="\([^"]*\)".*/\1/p' | sed 's/&amp;/\&/g' | head -n 1)"
[ -n "$form_action" ] || fail "step 3: login form not found; the Keycloak markup may have changed"

headers="$(curl -sS -o /dev/null -D - -c "$jar" -b "$jar" -X POST "$form_action" \
  --data-urlencode "username=$PERSONA_USER" \
  --data-urlencode "password=$PERSONA_PASSWORD" \
  --data-urlencode "credentialId=")"
location="$(printf '%s' "$headers" | tr -d '\r' | sed -n 's/^[Ll]ocation: //p' | head -n 1)"
code="$(printf '%s' "$location" | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')"
[ -n "$code" ] || fail "step 3: sign-in did not return an authorization code (wrong persona password or not imported)"

tokens="$(curl -sS -f -X POST "$ISSUER/protocol/openid-connect/token" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=$code" \
  --data-urlencode "redirect_uri=$REDIRECT_URI" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "code_verifier=$verifier")" \
  || fail "step 3: token request failed"
printf '%s' "$tokens" | grep -q '"id_token"' || fail "step 3: no ID token returned"
access_token="$(printf '%s' "$tokens" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
[ -n "$access_token" ] || fail "step 3: no access token returned"

# Decode the access token payload (second segment). Restore base64 padding first.
payload="$(printf '%s' "$access_token" | cut -d. -f2 | tr '_-' '/+')"
pad=$(( (4 - ${#payload} % 4) % 4 ))
[ "$pad" -eq 0 ] || payload="$payload$(printf '%*s' "$pad" '' | tr ' ' '=')"
printf '%s' "$payload" | base64 -d 2>/dev/null | grep -q "\"$AUDIENCE\"" \
  || fail "step 3: access token audience does not include $AUDIENCE"
echo "    sign-in succeeded and the audience includes $AUDIENCE"

echo "4/4 admin client lifecycle on a throwaway user, and registration setting"
admin_tokens="$(curl -sS -f -X POST "$KEYCLOAK_BASE_URL/realms/$KEYCLOAK_REALM/protocol/openid-connect/token" \
  --data-urlencode "grant_type=client_credentials" \
  --data-urlencode "client_id=$ADMIN_CLIENT_ID" \
  --data-urlencode "client_secret=$ADMIN_CLIENT_SECRET")" \
  || fail "step 4: admin client could not get a token"
admin_token="$(printf '%s' "$admin_tokens" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
[ -n "$admin_token" ] || fail "step 4: admin token missing"

throwaway="smoke-$(date +%s)-$$@example.test"
admin_users="$KEYCLOAK_BASE_URL/admin/realms/$KEYCLOAK_REALM/users"

create_status="$(curl -sS -o /dev/null -w '%{http_code}' -D "$jar.h" -X POST "$admin_users" \
  -H "Authorization: Bearer $admin_token" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$throwaway\",\"email\":\"$throwaway\",\"enabled\":true,\"emailVerified\":true}")"
[ "$create_status" = "201" ] || fail "step 4: create user returned $create_status, expected 201"
throwaway_id="$(tr -d '\r' < "$jar.h" | sed -n 's/^[Ll]ocation: .*\///p' | head -n 1)"
rm -f "$jar.h"
[ -n "$throwaway_id" ] || fail "step 4: created user id not returned"

logout_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$admin_users/$throwaway_id/logout" \
  -H "Authorization: Bearer $admin_token")"
[ "$logout_status" = "204" ] || fail "step 4: logout returned $logout_status, expected 204"

delete_status="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE "$admin_users/$throwaway_id" \
  -H "Authorization: Bearer $admin_token")"
[ "$delete_status" = "204" ] || fail "step 4: delete returned $delete_status, expected 204"
throwaway_id=""

after_status="$(curl -sS -o /dev/null -w '%{http_code}' "$admin_users?username=$throwaway" \
  -H "Authorization: Bearer $admin_token")"
[ "$after_status" = "200" ] || fail "step 4: user lookup after delete returned $after_status"
curl -sS "$admin_users?username=$throwaway" -H "Authorization: Bearer $admin_token" | grep -q '^\[\]$' \
  || fail "step 4: throwaway user still found after delete"
echo "    create 201, logout 204, delete 204, not found afterwards"

# Static check of the committed realm file. The admin client holds no view-realm, so the
# registration setting cannot be read live. Local self-service registration is on (ADR-0010 amendment).
grep -q '"registrationAllowed": true' "$REALM_FILE" \
  || fail "step 4: $REALM_FILE does not set registrationAllowed to true (static check)"
echo "    static check: registrationAllowed is true in the committed realm file"

echo "OK: Keycloak smoke passed"
