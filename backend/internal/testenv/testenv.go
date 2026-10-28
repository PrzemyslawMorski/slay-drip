// Package testenv reads the config keys for integration tests (docs/local-development.md).
package testenv

import (
	"os"
	"strconv"
	"testing"
)

// localDefaults are the throwaway values of the local stack. They apply only when a key
// is unset, the same way scripts/dev/s3-smoke.sh does. Never use them outside local development.

//nolint:gosec // G101: throwaway local-stack values (docs/local-development.md), never used outside local development.
var localDefaults = map[string]string{
	"DATABASE_URL":        "postgres://slaydrip:slaydrip-local-secret@127.0.0.1:5432/slaydrip?sslmode=disable",
	"S3_ENDPOINT":         "http://127.0.0.1:8333",
	"S3_REGION":           "fr-par",
	"S3_BUCKET":           "slay-drip-local",
	"S3_FORCE_PATH_STYLE": "true",
	"S3_ACCESS_KEY":       "slaydrip-local",
	"S3_SECRET_KEY":       "slaydrip-local-secret",
}

// Get returns the value of key, falling back to the local default.
func Get(t *testing.T, key string) string {
	t.Helper()
	v := os.Getenv(key)
	if v == "" {
		v = localDefaults[key]
	}
	if v == "" {
		t.Fatalf("%s must be set for integration tests (see docs/local-development.md)", key)
	}
	return v
}

// Bool returns the boolean value of key.
func Bool(t *testing.T, key string) bool {
	t.Helper()
	v, err := strconv.ParseBool(Get(t, key))
	if err != nil {
		t.Fatalf("%s must be true or false", key)
	}
	return v
}
