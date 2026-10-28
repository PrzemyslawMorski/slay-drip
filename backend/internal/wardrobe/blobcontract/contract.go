// Package blobcontract is the behaviour every wardrobe.Blobs adapter must pass (BE-22).
// The in-memory fake and the S3 adapter both run it.
package blobcontract

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/wardrobe"
)

// Run checks the round trip, delete and missing-key behaviour.
// newBlobs must return an empty store for each call.
func Run(t *testing.T, newBlobs func(t *testing.T) wardrobe.Blobs) {
	t.Helper()
	ctx := context.Background()
	// Keys are unique per run, so a shared bucket can be reused between runs.
	key := func(name string) string { return "wardrobe/contract-" + name + "-" + uuid.NewString() }

	t.Run("round trips the bytes", func(t *testing.T) {
		t.Parallel()
		blobs := newBlobs(t)
		want := []byte("photo-bytes")

		k := key("round-trip")
		require.NoError(t, blobs.Put(ctx, k, want, "image/jpeg"))
		got, err := blobs.Get(ctx, k)
		require.NoError(t, err)
		assert.Equal(t, want, got)
	})

	t.Run("a missing key is not found", func(t *testing.T) {
		t.Parallel()
		blobs := newBlobs(t)

		_, err := blobs.Get(ctx, key("missing"))
		require.ErrorIs(t, err, wardrobe.ErrNotFound)
	})

	t.Run("delete removes the bytes and is repeatable", func(t *testing.T) {
		t.Parallel()
		blobs := newBlobs(t)
		k := key("delete-me")
		require.NoError(t, blobs.Put(ctx, k, []byte("x"), "image/png"))

		require.NoError(t, blobs.Delete(ctx, k))
		_, err := blobs.Get(ctx, k)
		require.ErrorIs(t, err, wardrobe.ErrNotFound)
		require.NoError(t, blobs.Delete(ctx, k))
	})
}
