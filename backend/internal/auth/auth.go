// Package auth verifies the bearer tokens that the identity provider issues to the PWA.
// The user identity comes only from a token that passed every check here (BE-40, BE-41).
package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

// ErrUnauthenticated means the request has no valid bearer token.
var ErrUnauthenticated = errors.New("unauthenticated")

// Verifier checks access tokens against one issuer and one audience.
type Verifier struct {
	keys     jwt.Keyfunc
	issuer   string
	audience string
	now      func() time.Time
}

// NewVerifier fetches and caches the realm's signing keys from jwksURL. Keys are
// refreshed in the background, so a key rotation needs no restart.
func NewVerifier(ctx context.Context, jwksURL, issuer, audience string) (*Verifier, error) {
	kf, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("load JWKS: %w", err)
	}
	return NewVerifierWithKeys(kf.Keyfunc, issuer, audience), nil
}

// NewVerifierWithKeys builds a Verifier around an existing key lookup. Tests use it
// with a locally generated key instead of a live provider.
func NewVerifierWithKeys(keys jwt.Keyfunc, issuer, audience string) *Verifier {
	return &Verifier{keys: keys, issuer: issuer, audience: audience, now: time.Now}
}

// Verify returns the subject of a token that is signed with RS256 by a known key,
// issued by the configured issuer, names the configured audience and has not expired.
func (v *Verifier) Verify(token string) (string, error) {
	if v == nil {
		return "", ErrUnauthenticated
	}
	claims := jwt.MapClaims{}
	_, err := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}),
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(v.audience),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(v.now),
	).ParseWithClaims(token, claims, v.keys)
	if err != nil {
		return "", ErrUnauthenticated
	}
	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", ErrUnauthenticated
	}
	return sub, nil
}

type subjectKey struct{}

// Subject returns the verified subject that Require stored on the request context.
func Subject(ctx context.Context) (string, bool) {
	sub, ok := ctx.Value(subjectKey{}).(string)
	return sub, ok && sub != ""
}

// Require admits a request only with a verified bearer token. Anything else gets 401
// with no body detail, so the response does not reveal why the token failed.
func Require(v *Verifier, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := bearerToken(r.Header.Get("Authorization"))
		if !ok {
			unauthorized(w)
			return
		}
		sub, err := v.Verify(token)
		if err != nil {
			unauthorized(w)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), subjectKey{}, sub)))
	})
}

func bearerToken(header string) (string, bool) {
	scheme, token, ok := strings.Cut(header, " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return "", false
	}
	return token, true
}

func unauthorized(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", `Bearer realm="slay-drip"`)
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusUnauthorized)
}
