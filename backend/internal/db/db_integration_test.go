//go:build integration

package db

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestOpenAgainstPostgres needs the compose stack running (docker compose up -d)
// and DATABASE_URL set. See docs/local-development.md.
func TestOpenAgainstPostgres(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Fatal("DATABASE_URL must be set for integration tests (see docs/local-development.md)")
	}

	pool, err := Open(context.Background(), databaseURL)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	var answer int
	require.NoError(t, pool.QueryRow(context.Background(), "SELECT 1").Scan(&answer))
	require.Equal(t, 1, answer)
}
