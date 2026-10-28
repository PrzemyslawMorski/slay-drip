//go:build integration

package db

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/testenv"
)

// TestOpenAgainstPostgres needs the compose stack running (docker compose up -d).
// See docs/local-development.md.
func TestOpenAgainstPostgres(t *testing.T) {
	pool, err := Open(context.Background(), testenv.Get(t, "DATABASE_URL"))
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	var answer int
	require.NoError(t, pool.QueryRow(context.Background(), "SELECT 1").Scan(&answer))
	require.Equal(t, 1, answer)
}
