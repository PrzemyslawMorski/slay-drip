package wardrobe_test

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/wardrobe"
	"slaydrip/backend/internal/wardrobe/wardrobetest"
)

type rig struct {
	svc   *wardrobe.Service
	blobs *wardrobetest.Blobs
}

func newRig(t *testing.T) rig {
	t.Helper()
	blobs := wardrobetest.NewBlobs()
	return rig{
		svc:   wardrobe.NewService(wardrobetest.NewRepository(), blobs, slog.New(slog.NewTextHandler(io.Discard, nil))),
		blobs: blobs,
	}
}

func consenting(t *testing.T, r rig, owner string) {
	t.Helper()
	_, err := r.svc.SetConsent(context.Background(), owner, true)
	require.NoError(t, err)
}

func TestAddRequiresConsentAndStoresNothingWithout(t *testing.T) {
	t.Parallel()
	r := newRig(t)

	_, err := r.svc.Add(context.Background(), "user-a", encodeJPEG(t))

	require.ErrorIs(t, err, wardrobe.ErrConsentRequired)
	assert.Zero(t, r.blobs.Len())
}

func TestAddStoresSanitisedPhotoForConsentingOwner(t *testing.T) {
	t.Parallel()
	r := newRig(t)
	consenting(t, r, "user-a")

	item, err := r.svc.Add(context.Background(), "user-a", encodeJPEG(t))

	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, item.ID)
	assert.Equal(t, "wardrobe/"+item.ID.String(), item.Key)
	assert.Equal(t, "image/jpeg", item.ContentType)
	assert.Equal(t, 1, r.blobs.Len())
}

func TestCrossUserAccessLooksLikeNotFound(t *testing.T) {
	t.Parallel()
	r := newRig(t)
	ctx := context.Background()
	consenting(t, r, "user-a")
	item, err := r.svc.Add(ctx, "user-a", encodeJPEG(t))
	require.NoError(t, err)

	items, err := r.svc.List(ctx, "user-b")
	require.NoError(t, err)
	assert.Empty(t, items, "B must not list A's items")

	_, _, err = r.svc.Photo(ctx, "user-b", item.ID)
	require.ErrorIs(t, err, wardrobe.ErrNotFound, "B must not read A's photo")

	err = r.svc.Delete(ctx, "user-b", item.ID)
	require.ErrorIs(t, err, wardrobe.ErrNotFound, "B must not delete A's item")

	_, _, err = r.svc.Photo(ctx, "user-a", item.ID)
	require.NoError(t, err, "A's item must survive B's attempts")
}

func TestOwnerCanReadAndDeleteOwnItem(t *testing.T) {
	t.Parallel()
	r := newRig(t)
	ctx := context.Background()
	consenting(t, r, "user-a")
	item, err := r.svc.Add(ctx, "user-a", encodeJPEG(t))
	require.NoError(t, err)

	got, data, err := r.svc.Photo(ctx, "user-a", item.ID)
	require.NoError(t, err)
	assert.Equal(t, item.ID, got.ID)
	assert.NotEmpty(t, data)

	require.NoError(t, r.svc.Delete(ctx, "user-a", item.ID))
	assert.Zero(t, r.blobs.Len())
}

func TestRevokingConsentDeletesOnlyThatOwnersPhotos(t *testing.T) {
	t.Parallel()
	r := newRig(t)
	ctx := context.Background()
	consenting(t, r, "user-a")
	_, err := r.svc.Add(ctx, "user-a", encodeJPEG(t))
	require.NoError(t, err)
	_, err = r.svc.Add(ctx, "user-a", encodeJPEG(t))
	require.NoError(t, err)
	consenting(t, r, "user-b")
	_, err = r.svc.Add(ctx, "user-b", encodeJPEG(t))
	require.NoError(t, err)

	consent, err := r.svc.SetConsent(ctx, "user-a", false)

	require.NoError(t, err)
	assert.False(t, consent.Granted)
	items, err := r.svc.List(ctx, "user-a")
	require.NoError(t, err)
	assert.Empty(t, items)
	assert.Equal(t, 1, r.blobs.Len(), "only A's two photos go; B's photo stays")
}

func TestRevokingConsentSucceedsWhenPhotoCleanupFails(t *testing.T) {
	t.Parallel()
	r := newRig(t)
	ctx := context.Background()
	consenting(t, r, "user-a")
	_, err := r.svc.Add(ctx, "user-a", encodeJPEG(t))
	require.NoError(t, err)
	r.blobs.FailDelete = true

	consent, err := r.svc.SetConsent(ctx, "user-a", false)

	require.NoError(t, err, "the rows are gone, so the revoke itself must succeed")
	assert.False(t, consent.Granted)
}

func TestConsentReportsGrantTime(t *testing.T) {
	t.Parallel()
	r := newRig(t)
	ctx := context.Background()

	before, err := r.svc.Consent(ctx, "user-a")
	require.NoError(t, err)
	assert.False(t, before.Granted)
	assert.Nil(t, before.GrantedAt)

	after, err := r.svc.SetConsent(ctx, "user-a", true)
	require.NoError(t, err)
	require.NotNil(t, after.GrantedAt)
	assert.WithinDuration(t, time.Now(), *after.GrantedAt, time.Minute)
}

func TestAddRejectsNonImageEvenWhenNamedAsPhoto(t *testing.T) {
	t.Parallel()
	r := newRig(t)
	consenting(t, r, "user-a")

	_, err := r.svc.Add(context.Background(), "user-a", bytes.Repeat([]byte("receipt "), 20))

	require.ErrorIs(t, err, wardrobe.ErrUnsupportedPhoto)
	assert.Zero(t, r.blobs.Len())
}
