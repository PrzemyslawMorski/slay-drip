package server

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	"slaydrip/backend/internal/auth"
	"slaydrip/backend/internal/wardrobe"
)

// multipartOverhead allows for the multipart framing around the photo itself.
const multipartOverhead = 64 << 10

// consentBodyLimit bounds the consent request. It only carries one boolean.
const consentBodyLimit = 1 << 10

type handlers struct {
	wardrobe *wardrobe.Service
}

type consentJSON struct {
	Granted   bool    `json:"granted"`
	GrantedAt *string `json:"grantedAt"`
}

type itemJSON struct {
	ID        string `json:"id"`
	CreatedAt string `json:"createdAt"`
}

func (h handlers) getConsent(w http.ResponseWriter, r *http.Request) {
	sub, ok := auth.Subject(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	c, err := h.wardrobe.Consent(r.Context(), sub)
	if err != nil {
		serverError(r, w, err)
		return
	}
	writeJSON(w, http.StatusOK, consentToJSON(c))
}

func (h handlers) putConsent(w http.ResponseWriter, r *http.Request) {
	sub, ok := auth.Subject(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	var in struct {
		Granted *bool `json:"granted"`
	}
	if !decodeStrict(w, r, consentBodyLimit, &in) || in.Granted == nil {
		writeError(w, http.StatusBadRequest, "invalid_body")
		return
	}
	c, err := h.wardrobe.SetConsent(r.Context(), sub, *in.Granted)
	if err != nil {
		serverError(r, w, err)
		return
	}
	writeJSON(w, http.StatusOK, consentToJSON(c))
}

func (h handlers) listItems(w http.ResponseWriter, r *http.Request) {
	sub, ok := auth.Subject(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	items, err := h.wardrobe.List(r.Context(), sub)
	if err != nil {
		serverError(r, w, err)
		return
	}
	out := make([]itemJSON, 0, len(items))
	for _, item := range items {
		out = append(out, itemToJSON(item))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h handlers) addItem(w http.ResponseWriter, r *http.Request) {
	sub, ok := auth.Subject(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	// Consent is checked before the upload is read, so a refused request costs nothing (BE-48).
	c, err := h.wardrobe.Consent(r.Context(), sub)
	if err != nil {
		serverError(r, w, err)
		return
	}
	if !c.Granted {
		writeError(w, http.StatusConflict, "consent_required")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, wardrobe.MaxPhotoBytes+multipartOverhead)
	if err := r.ParseMultipartForm(wardrobe.MaxPhotoBytes); err != nil {
		if isTooLarge(err) {
			writeError(w, http.StatusRequestEntityTooLarge, "photo_too_large")
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_upload")
		return
	}
	defer func() { _ = r.MultipartForm.RemoveAll() }()

	file, _, err := r.FormFile("photo")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing_photo")
		return
	}
	defer func() { _ = file.Close() }()

	data, tooBig, err := wardrobe.ReadAll(file, wardrobe.MaxPhotoBytes)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_upload")
		return
	}
	if tooBig {
		writeError(w, http.StatusRequestEntityTooLarge, "photo_too_large")
		return
	}

	item, err := h.wardrobe.Add(r.Context(), sub, data)
	switch {
	case errors.Is(err, wardrobe.ErrConsentRequired):
		writeError(w, http.StatusConflict, "consent_required")
	case errors.Is(err, wardrobe.ErrPhotoTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, "photo_too_large")
	case errors.Is(err, wardrobe.ErrUnsupportedPhoto):
		writeError(w, http.StatusUnsupportedMediaType, "unsupported_photo")
	case err != nil:
		serverError(r, w, err)
	default:
		writeJSON(w, http.StatusCreated, itemToJSON(item))
	}
}

func (h handlers) photo(w http.ResponseWriter, r *http.Request) {
	sub, ok := auth.Subject(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found")
		return
	}
	item, data, err := h.wardrobe.Photo(r.Context(), sub, id)
	if errors.Is(err, wardrobe.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		serverError(r, w, err)
		return
	}
	w.Header().Set("Content-Type", item.ContentType)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (h handlers) deleteItem(w http.ResponseWriter, r *http.Request) {
	sub, ok := auth.Subject(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	id, ok := pathID(r)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found")
		return
	}
	err := h.wardrobe.Delete(r.Context(), sub, id)
	switch {
	case errors.Is(err, wardrobe.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found")
	case err != nil:
		serverError(r, w, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func pathID(r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(r.PathValue("id"))
	return id, err == nil
}

func consentToJSON(c wardrobe.Consent) consentJSON {
	out := consentJSON{Granted: c.Granted}
	if c.GrantedAt != nil {
		s := c.GrantedAt.UTC().Format(time.RFC3339)
		out.GrantedAt = &s
	}
	return out
}

func itemToJSON(item wardrobe.Item) itemJSON {
	return itemJSON{ID: item.ID.String(), CreatedAt: item.CreatedAt.UTC().Format(time.RFC3339)}
}

// decodeStrict reads one JSON object with unknown fields refused (BE-43).
func decodeStrict(w http.ResponseWriter, r *http.Request, limit int64, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return false
	}
	_, err := dec.Token()
	return errors.Is(err, io.EOF)
}

func isTooLarge(err error) bool {
	var maxErr *http.MaxBytesError
	return errors.As(err, &maxErr)
}

// serverError logs the failure without any identifier or personal data, and answers
// with a generic body.
func serverError(r *http.Request, w http.ResponseWriter, err error) {
	slog.ErrorContext(r.Context(), "request failed", "route", r.Method+" "+r.URL.Path, "error", err)
	writeError(w, http.StatusInternalServerError, "internal_error")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}
