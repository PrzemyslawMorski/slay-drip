//go:build integration

package server

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/auth/authtest"
	"slaydrip/backend/internal/db"
	"slaydrip/backend/internal/storage"
	"slaydrip/backend/internal/testenv"
	"slaydrip/backend/internal/wardrobe"
)

// TestWardrobeEndToEnd runs the real router against PostgreSQL and the S3 stand-in, with
// tokens from a local key in place of the realm's JWKS. It needs the compose stack, the
// migrations and the S3_* and DATABASE_URL keys (docs/local-development.md).
func TestWardrobeEndToEnd(t *testing.T) {
	ctx := context.Background()
	pool, err := db.Open(ctx, testenv.Get(t, "DATABASE_URL"))
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	blobs, err := storage.NewS3(storage.Config{
		Endpoint:       testenv.Get(t, "S3_ENDPOINT"),
		Region:         testenv.Get(t, "S3_REGION"),
		Bucket:         testenv.Get(t, "S3_BUCKET"),
		ForcePathStyle: testenv.Bool(t, "S3_FORCE_PATH_STYLE"),
		AccessKey:      testenv.Get(t, "S3_ACCESS_KEY"),
		SecretKey:      testenv.Get(t, "S3_SECRET_KEY"),
	})
	require.NoError(t, err)

	signer := authtest.NewSigner(t)
	svc := wardrobe.NewService(db.NewWardrobe(pool), blobs, slog.New(slog.NewTextHandler(io.Discard, nil)))
	router := NewRouter(Dependencies{Verifier: signer.Verifier(), Wardrobe: svc})
	owner := "e2e-" + strings.ReplaceAll(t.Name(), "/", "-")
	token := "Bearer " + signer.Token(t, owner)

	do := func(method, path string, body io.Reader, contentType string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, body)
		req.Header.Set("Authorization", token)
		if contentType != "" {
			req.Header.Set("Content-Type", contentType)
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		return rec
	}

	require.Equal(t, http.StatusOK, do(http.MethodPut, "/consents/wardrobe-photos", strings.NewReader(`{"granted":true}`), "application/json").Code)

	var buf bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	img.Set(0, 0, color.RGBA{G: 255, A: 255})
	require.NoError(t, jpeg.Encode(&buf, img, nil))
	uploaded := upload(t, router, token, buf.Bytes())
	require.Equal(t, http.StatusCreated, uploaded.Code, uploaded.Body.String())
	id := itemIDOf(t, uploaded)

	photo := do(http.MethodGet, "/wardrobe/items/"+id+"/photo", nil, "")
	require.Equal(t, http.StatusOK, photo.Code)
	assert.Equal(t, "image/jpeg", photo.Header().Get("Content-Type"))
	_, err = jpeg.Decode(photo.Body)
	require.NoError(t, err, "the stored photo round-trips through object storage")

	require.Equal(t, http.StatusNoContent, do(http.MethodDelete, "/wardrobe/items/"+id, nil, "").Code)
	require.Equal(t, http.StatusNotFound, do(http.MethodGet, "/wardrobe/items/"+id+"/photo", nil, "").Code)
}

func upload(t *testing.T, router http.Handler, token string, photo []byte) *httptest.ResponseRecorder {
	t.Helper()
	body, contentType := multipartPhoto(t, photo)
	req := httptest.NewRequest(http.MethodPost, "/wardrobe/items", body)
	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", contentType)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}
