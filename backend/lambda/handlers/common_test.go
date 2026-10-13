package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"pmorski-slay/main/models"
)

func TestWithCORSAnswersPreflightWithoutCallingNext(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/items", nil)
	rec := httptest.NewRecorder()

	WithCORS(next).ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	if called {
		t.Fatal("next handler should not run for a preflight request")
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, "*")
	}
}

func TestWithCORSAddsHeadersToNormalRequests(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/items", nil)
	rec := httptest.NewRecorder()

	WithCORS(next).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); got != "GET,POST,PUT,DELETE,OPTIONS" {
		t.Fatalf("Access-Control-Allow-Methods = %q", got)
	}
}

func TestWriteErrorReturnsStandardErrorBody(t *testing.T) {
	rec := httptest.NewRecorder()

	writeError(rec, http.StatusNotFound, "Item not found", "NOT_FOUND", "missing")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Fatalf("Content-Type = %q", got)
	}

	var body models.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body is not JSON: %v", err)
	}
	if body.Error != "Item not found" || body.Code != "NOT_FOUND" || body.Details != "missing" {
		t.Fatalf("unexpected error body: %+v", body)
	}
}
