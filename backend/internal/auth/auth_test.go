package auth_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/auth"
	"slaydrip/backend/internal/auth/authtest"
)

func TestVerifyAcceptsKeycloakShapedToken(t *testing.T) {
	t.Parallel()
	signer := authtest.NewSigner(t)

	sub, err := signer.Verifier().Verify(signer.Token(t, "user-1"))

	require.NoError(t, err)
	assert.Equal(t, "user-1", sub)
}

func TestVerifyRejectsBadTokens(t *testing.T) {
	t.Parallel()
	signer := authtest.NewSigner(t)
	valid := authtest.Claims("user-1", time.Now().Add(time.Minute))

	cases := map[string]string{
		"empty":            "",
		"garbage":          "not-a-jwt",
		"foreign key":      authtest.ForeignToken(t, "user-1"),
		"expired":          signer.TokenWith(t, authtest.Claims("user-1", time.Now().Add(-time.Minute))),
		"wrong issuer":     signer.TokenWith(t, withClaim(valid, "iss", "https://evil.example/realms/x")),
		"wrong audience":   signer.TokenWith(t, withClaim(valid, "aud", "account")),
		"missing subject":  signer.TokenWith(t, withoutClaim(valid, "sub")),
		"alg none":         unsignedToken(t, valid),
		"hs256 with a key": hmacTokenWithPublicKeyBytes(t, valid),
	}
	for name, token := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			_, err := signer.Verifier().Verify(token)
			require.ErrorIs(t, err, auth.ErrUnauthenticated)
		})
	}
}

func TestVerifyNilVerifierFailsClosed(t *testing.T) {
	t.Parallel()
	var v *auth.Verifier

	_, err := v.Verify("anything")

	require.ErrorIs(t, err, auth.ErrUnauthenticated)
}

func TestRequireAdmitsOnlyVerifiedTokens(t *testing.T) {
	t.Parallel()
	signer := authtest.NewSigner(t)
	var gotSub string
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotSub, _ = auth.Subject(r.Context())
		w.WriteHeader(http.StatusNoContent)
	})
	handler := auth.Require(signer.Verifier(), next)

	cases := []struct {
		name   string
		header string
		status int
	}{
		{name: "no header", header: "", status: http.StatusUnauthorized},
		{name: "basic scheme", header: "Basic dXNlcjpwYXNz", status: http.StatusUnauthorized},
		{name: "bearer without token", header: "Bearer ", status: http.StatusUnauthorized},
		{name: "forged token", header: "Bearer " + authtest.ForeignToken(t, "user-1"), status: http.StatusUnauthorized},
		{name: "verified token", header: "Bearer " + signer.Token(t, "user-1"), status: http.StatusNoContent},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			gotSub = ""
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}

			handler.ServeHTTP(rec, req)

			require.Equal(t, tc.status, rec.Code)
			if tc.status == http.StatusNoContent {
				assert.Equal(t, "user-1", gotSub)
				return
			}
			assert.Empty(t, gotSub, "the handler must not run without a verified token")
			assert.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
			assert.Empty(t, rec.Body.String(), "a rejection must not explain why")
		})
	}
}

func withClaim(c jwt.MapClaims, key string, value any) jwt.MapClaims {
	out := jwt.MapClaims{}
	for k, v := range c {
		out[k] = v
	}
	out[key] = value
	return out
}

func withoutClaim(c jwt.MapClaims, key string) jwt.MapClaims {
	out := withClaim(c, key, nil)
	delete(out, key)
	return out
}

// unsignedToken builds a token with alg "none" and no signature.
func unsignedToken(t *testing.T, c jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodNone, c)
	s, err := tok.SignedString(jwt.UnsafeAllowNoneSignatureType)
	require.NoError(t, err)
	return s
}

// hmacTokenWithPublicKeyBytes signs HS256 with an arbitrary secret, the classic
// algorithm-confusion attack. The verifier must refuse it.
func hmacTokenWithPublicKeyBytes(t *testing.T, c jwt.MapClaims) string {
	t.Helper()
	header, err := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	require.NoError(t, err)
	body, err := json.Marshal(c)
	require.NoError(t, err)
	signingInput := base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(body)
	mac := hmac.New(sha256.New, []byte("public-key-bytes"))
	mac.Write([]byte(signingInput))
	return signingInput + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
