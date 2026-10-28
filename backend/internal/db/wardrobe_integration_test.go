//go:build integration

package db

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/testenv"
	"slaydrip/backend/internal/wardrobe"
)

// TestWardrobeRepositoryAgainstPostgres needs the migrations applied (see
// docs/local-development.md). Each run uses fresh owners, so runs do not collide.
func TestWardrobeRepositoryAgainstPostgres(t *testing.T) {
	ctx := context.Background()
	pool, err := Open(ctx, testenv.Get(t, "DATABASE_URL"))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	repo := NewWardrobe(pool)

	ownerA := "it-" + uuid.NewString()
	ownerB := "it-" + uuid.NewString()
	now := time.Now().UTC().Truncate(time.Microsecond)

	c, err := repo.Consent(ctx, ownerA)
	require.NoError(t, err)
	assert.False(t, c.Granted)

	_, err = repo.SetConsent(ctx, ownerA, true, now)
	require.NoError(t, err)
	_, err = repo.SetConsent(ctx, ownerB, true, now)
	require.NoError(t, err)

	itemA := wardrobe.Item{ID: uuid.New(), Owner: ownerA, Key: "wardrobe/" + uuid.NewString(), ContentType: "image/jpeg", SizeBytes: 10, CreatedAt: now}
	itemB := wardrobe.Item{ID: uuid.New(), Owner: ownerB, Key: "wardrobe/" + uuid.NewString(), ContentType: "image/png", SizeBytes: 20, CreatedAt: now}
	require.NoError(t, repo.InsertItem(ctx, itemA))
	require.NoError(t, repo.InsertItem(ctx, itemB))

	listA, err := repo.ListItems(ctx, ownerA)
	require.NoError(t, err)
	assert.Equal(t, []uuid.UUID{itemA.ID}, ids(listA), "A lists only A's items")

	_, err = repo.Item(ctx, ownerB, itemA.ID)
	require.ErrorIs(t, err, wardrobe.ErrNotFound, "B cannot read A's item")
	_, err = repo.DeleteItem(ctx, ownerB, itemA.ID)
	require.ErrorIs(t, err, wardrobe.ErrNotFound, "B cannot delete A's item")

	removed, err := repo.SetConsent(ctx, ownerA, false, now)
	require.NoError(t, err)
	assert.Equal(t, []uuid.UUID{itemA.ID}, ids(removed), "revoking returns A's items for photo cleanup")

	listA, err = repo.ListItems(ctx, ownerA)
	require.NoError(t, err)
	assert.Empty(t, listA)
	listB, err := repo.ListItems(ctx, ownerB)
	require.NoError(t, err)
	assert.Equal(t, []uuid.UUID{itemB.ID}, ids(listB), "B's item is untouched")

	revoked, err := repo.Consent(ctx, ownerA)
	require.NoError(t, err)
	assert.False(t, revoked.Granted)
	assert.Nil(t, revoked.GrantedAt)
}

func ids(items []wardrobe.Item) []uuid.UUID {
	out := make([]uuid.UUID, 0, len(items))
	for _, item := range items {
		out = append(out, item.ID)
	}
	return out
}
