// Package authtest signs tokens shaped like the ones the Keycloak realm issues, so the
// API can be tested without a live provider (BE-24, ADR-0006).
package authtest

import (
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/auth"
)

// Issuer and Audience match the local realm (docs/local-development.md).
const (
	Issuer   = "http://127.0.0.1:8180/realms/slay-drip"
	Audience = "slay-drip-api"
	kid      = "test-key"
)

// Signer holds one RSA key and issues tokens with it.
type Signer struct {
	key *rsa.PrivateKey
}

// NewSigner generates a fresh RSA key for one test.
func NewSigner(t *testing.T) *Signer {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	return &Signer{key: key}
}

// Verifier returns an auth.Verifier that trusts this signer's key.
func (s *Signer) Verifier() *auth.Verifier {
	return auth.NewVerifierWithKeys(func(token *jwt.Token) (any, error) {
		if token.Header["kid"] != kid {
			return nil, jwt.ErrTokenUnverifiable
		}
		return &s.key.PublicKey, nil
	}, Issuer, Audience)
}

// Token returns a valid access token for sub, with the claims a Keycloak access token carries.
func (s *Signer) Token(t *testing.T, sub string) string {
	t.Helper()
	return s.sign(t, s.key, jwt.SigningMethodRS256, claims(sub, time.Now().Add(5*time.Minute)))
}

// TokenWith signs claims with this signer's key, for negative tests.
func (s *Signer) TokenWith(t *testing.T, c jwt.MapClaims) string {
	t.Helper()
	return s.sign(t, s.key, jwt.SigningMethodRS256, c)
}

// ForeignToken signs with a key the API does not trust.
func ForeignToken(t *testing.T, sub string) string {
	t.Helper()
	other := NewSigner(t)
	return other.sign(t, other.key, jwt.SigningMethodRS256, claims(sub, time.Now().Add(5*time.Minute)))
}

// Claims returns the claims of a valid token for sub that expires at exp.
func Claims(sub string, exp time.Time) jwt.MapClaims {
	return claims(sub, exp)
}

func claims(sub string, exp time.Time) jwt.MapClaims {
	return jwt.MapClaims{
		"iss": Issuer,
		"aud": Audience,
		"sub": sub,
		"azp": "slay-drip-pwa",
		"iat": time.Now().Unix(),
		"exp": exp.Unix(),
	}
}

func (s *Signer) sign(t *testing.T, key any, method jwt.SigningMethod, c jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(method, c)
	tok.Header["kid"] = kid
	signed, err := tok.SignedString(key)
	require.NoError(t, err)
	return signed
}
