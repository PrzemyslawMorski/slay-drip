package server

import (
	"bytes"
	"encoding/json"
	"image"
	"image/color"
	"image/jpeg"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"slaydrip/backend/internal/auth/authtest"
	"slaydrip/backend/internal/wardrobe"
	"slaydrip/backend/internal/wardrobe/wardrobetest"
)

type fixture struct {
	router http.Handler
	signer *authtest.Signer
	blobs  *wardrobetest.Blobs
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	signer := authtest.NewSigner(t)
	blobs := wardrobetest.NewBlobs()
	svc := wardrobe.NewService(wardrobetest.NewRepository(), blobs, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return fixture{
		router: NewRouter(Dependencies{Verifier: signer.Verifier(), Wardrobe: svc}),
		signer: signer,
		blobs:  blobs,
	}
}

// do sends one request as sub. An empty sub sends no token.
func (f fixture) do(t *testing.T, method, path, sub string, body io.Reader, contentType string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, body)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if sub != "" {
		req.Header.Set("Authorization", "Bearer "+f.signer.Token(t, sub))
	}
	rec := httptest.NewRecorder()
	f.router.ServeHTTP(rec, req)
	return rec
}

func (f fixture) grant(t *testing.T, sub string) {
	t.Helper()
	rec := f.do(t, http.MethodPut, "/consents/wardrobe-photos", sub, strings.NewReader(`{"granted":true}`), "application/json")
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
}

func (f fixture) upload(t *testing.T, sub string, photo []byte) *httptest.ResponseRecorder {
	t.Helper()
	body, contentType := multipartPhoto(t, photo)
	return f.do(t, http.MethodPost, "/wardrobe/items", sub, body, contentType)
}

func multipartPhoto(t *testing.T, photo []byte) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("photo", "receipt.jpg")
	require.NoError(t, err)
	_, err = part.Write(photo)
	require.NoError(t, err)
	require.NoError(t, w.Close())
	return &buf, w.FormDataContentType()
}

func jpegBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	img.Set(1, 1, color.RGBA{R: 255, A: 255})
	var buf bytes.Buffer
	require.NoError(t, jpeg.Encode(&buf, img, nil))
	return buf.Bytes()
}

func itemIDOf(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var out struct {
		ID string `json:"id"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
	require.NotEmpty(t, out.ID)
	return out.ID
}

type route struct {
	method string
	path   string
	body   string
}

var userRoutes = []route{
	{http.MethodGet, "/consents/wardrobe-photos", ""},
	{http.MethodPut, "/consents/wardrobe-photos", `{"granted":true}`},
	{http.MethodGet, "/wardrobe/items", ""},
	{http.MethodPost, "/wardrobe/items", ""},
	{http.MethodGet, "/wardrobe/items/6f1d4c2e-8a1b-4c3d-9e2f-0a1b2c3d4e5f/photo", ""},
	{http.MethodDelete, "/wardrobe/items/6f1d4c2e-8a1b-4c3d-9e2f-0a1b2c3d4e5f", ""},
}

func TestEveryWardrobeRouteNeedsAVerifiedToken(t *testing.T) {
	t.Parallel()
	f := newFixture(t)

	for _, rt := range userRoutes {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			t.Parallel()
			cases := map[string]string{
				"no token": "",
				"forged":   "Bearer " + authtest.ForeignToken(t, "user-a"),
			}
			for name, header := range cases {
				req := httptest.NewRequest(rt.method, rt.path, strings.NewReader(rt.body))
				if header != "" {
					req.Header.Set("Authorization", header)
				}
				rec := httptest.NewRecorder()
				f.router.ServeHTTP(rec, req)

				require.Equal(t, http.StatusUnauthorized, rec.Code, name)
				assert.Equal(t, "no-store", rec.Header().Get("Cache-Control"), name)
			}
		})
	}
}

func TestConsentDefaultsToNotGranted(t *testing.T) {
	t.Parallel()
	f := newFixture(t)

	rec := f.do(t, http.MethodGet, "/consents/wardrobe-photos", "user-a", nil, "")

	require.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"granted":false,"grantedAt":null}`, rec.Body.String())
	assert.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
}

func TestConsentGrantAndRevoke(t *testing.T) {
	t.Parallel()
	f := newFixture(t)

	granted := f.do(t, http.MethodPut, "/consents/wardrobe-photos", "user-a", strings.NewReader(`{"granted":true}`), "application/json")
	require.Equal(t, http.StatusOK, granted.Code)
	var got struct {
		Granted   bool    `json:"granted"`
		GrantedAt *string `json:"grantedAt"`
	}
	require.NoError(t, json.Unmarshal(granted.Body.Bytes(), &got))
	assert.True(t, got.Granted)
	require.NotNil(t, got.GrantedAt)
	assert.Regexp(t, `Z$|[+-]\d\d:\d\d$`, *got.GrantedAt, "grantedAt is RFC 3339")

	revoked := f.do(t, http.MethodPut, "/consents/wardrobe-photos", "user-a", strings.NewReader(`{"granted":false}`), "application/json")
	require.Equal(t, http.StatusOK, revoked.Code)
	assert.JSONEq(t, `{"granted":false,"grantedAt":null}`, revoked.Body.String())
}

func TestConsentRejectsBadBodies(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	bodies := map[string]string{
		"unknown field": `{"granted":true,"extra":1}`,
		"missing":       `{}`,
		"wrong type":    `{"granted":"yes"}`,
		"trailing data": `{"granted":true}{"granted":false}`,
		"not json":      `granted=true`,
	}
	for name, body := range bodies {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			rec := f.do(t, http.MethodPut, "/consents/wardrobe-photos", "user-a", strings.NewReader(body), "application/json")
			require.Equal(t, http.StatusBadRequest, rec.Code)
		})
	}
}

func TestUploadNeedsConsentAndStoresNothingWithout(t *testing.T) {
	t.Parallel()
	f := newFixture(t)

	rec := f.upload(t, "user-a", jpegBytes(t))

	require.Equal(t, http.StatusConflict, rec.Code)
	assert.JSONEq(t, `{"error":"consent_required"}`, rec.Body.String())
	assert.Zero(t, f.blobs.Len())
}

func TestUploadStoresPhotoAndServesItBack(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.grant(t, "user-a")

	rec := f.upload(t, "user-a", jpegBytes(t))

	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	assert.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
	var created struct {
		ID        string `json:"id"`
		CreatedAt string `json:"createdAt"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &created))
	assert.NotEmpty(t, created.CreatedAt)

	list := f.do(t, http.MethodGet, "/wardrobe/items", "user-a", nil, "")
	require.Equal(t, http.StatusOK, list.Code)
	assert.Contains(t, list.Body.String(), created.ID)

	photo := f.do(t, http.MethodGet, "/wardrobe/items/"+created.ID+"/photo", "user-a", nil, "")
	require.Equal(t, http.StatusOK, photo.Code)
	assert.Equal(t, "image/jpeg", photo.Header().Get("Content-Type"))
	assert.Equal(t, "no-store", photo.Header().Get("Cache-Control"))
	assert.Equal(t, "nosniff", photo.Header().Get("X-Content-Type-Options"))
	_, err := jpeg.Decode(photo.Body)
	require.NoError(t, err)
}

func TestUploadRejectsNonImageByContent(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.grant(t, "user-a")

	rec := f.upload(t, "user-a", []byte("this is a receipt named receipt.jpg"))

	require.Equal(t, http.StatusUnsupportedMediaType, rec.Code)
	assert.JSONEq(t, `{"error":"unsupported_photo"}`, rec.Body.String())
	assert.Zero(t, f.blobs.Len())
}

func TestUploadRejectsPhotoOver10MB(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.grant(t, "user-a")

	rec := f.upload(t, "user-a", make([]byte, wardrobe.MaxPhotoBytes+1))

	require.Equal(t, http.StatusRequestEntityTooLarge, rec.Code)
	assert.JSONEq(t, `{"error":"photo_too_large"}`, rec.Body.String())
}

func TestUploadNeedsThePhotoField(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.grant(t, "user-a")
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	require.NoError(t, w.WriteField("other", "x"))
	require.NoError(t, w.Close())

	rec := f.do(t, http.MethodPost, "/wardrobe/items", "user-a", &buf, w.FormDataContentType())

	require.Equal(t, http.StatusBadRequest, rec.Code)
	assert.JSONEq(t, `{"error":"missing_photo"}`, rec.Body.String())
}

func TestOtherUsersCannotSeeOrChangeItems(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.grant(t, "user-a")
	f.grant(t, "user-b")
	created := f.upload(t, "user-a", jpegBytes(t))
	require.Equal(t, http.StatusCreated, created.Code)
	id := itemIDOf(t, created)
	photoPath := "/wardrobe/items/" + id + "/photo"
	itemPath := "/wardrobe/items/" + id

	list := f.do(t, http.MethodGet, "/wardrobe/items", "user-b", nil, "")
	require.Equal(t, http.StatusOK, list.Code)
	assert.JSONEq(t, `{"items":[]}`, list.Body.String())

	photo := f.do(t, http.MethodGet, photoPath, "user-b", nil, "")
	assert.Equal(t, http.StatusNotFound, photo.Code, "a foreign item looks like a missing one")

	del := f.do(t, http.MethodDelete, itemPath, "user-b", nil, "")
	assert.Equal(t, http.StatusNotFound, del.Code)

	owner := f.do(t, http.MethodGet, photoPath, "user-a", nil, "")
	assert.Equal(t, http.StatusOK, owner.Code, "A's photo survives B's attempts")
}

func TestOwnerDeletesItemOnce(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.grant(t, "user-a")
	id := itemIDOf(t, f.upload(t, "user-a", jpegBytes(t)))
	itemPath := "/wardrobe/items/" + id

	first := f.do(t, http.MethodDelete, itemPath, "user-a", nil, "")
	second := f.do(t, http.MethodDelete, itemPath, "user-a", nil, "")

	assert.Equal(t, http.StatusNoContent, first.Code)
	assert.Equal(t, http.StatusNotFound, second.Code)
	assert.Zero(t, f.blobs.Len())
}

func TestMalformedItemIDIsNotFound(t *testing.T) {
	t.Parallel()
	f := newFixture(t)

	rec := f.do(t, http.MethodGet, "/wardrobe/items/not-a-uuid/photo", "user-a", nil, "")

	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestRevokingConsentOverTheApiRemovesPhotos(t *testing.T) {
	t.Parallel()
	f := newFixture(t)
	f.grant(t, "user-a")
	require.Equal(t, http.StatusCreated, f.upload(t, "user-a", jpegBytes(t)).Code)

	rec := f.do(t, http.MethodPut, "/consents/wardrobe-photos", "user-a", strings.NewReader(`{"granted":false}`), "application/json")

	require.Equal(t, http.StatusOK, rec.Code)
	assert.Zero(t, f.blobs.Len())
	list := f.do(t, http.MethodGet, "/wardrobe/items", "user-a", nil, "")
	assert.JSONEq(t, `{"items":[]}`, list.Body.String())
}
