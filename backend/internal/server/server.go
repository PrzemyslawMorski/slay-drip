// Package server builds the HTTP handler for the API.
package server

import (
	"net/http"
	"time"

	"slaydrip/backend/internal/auth"
	"slaydrip/backend/internal/wardrobe"
)

// Dependencies are the collaborators the routes need. Every user route uses Verifier.
type Dependencies struct {
	Verifier *auth.Verifier
	Wardrobe *wardrobe.Service
}

// NewHTTPServer returns the API's HTTP server for addr. The timeouts bound how long
// a slow client can hold a connection. Long-running routes need their own handling,
// because WriteTimeout applies to the whole response.
func NewHTTPServer(addr string, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

// NewRouter returns the API's HTTP handler. Health is open. Every other route needs a
// verified bearer token, and any path not listed here answers 404 (BE-40).
func NewRouter(deps Dependencies) http.Handler {
	h := handlers{wardrobe: deps.Wardrobe}
	secure := func(next http.HandlerFunc) http.Handler {
		return auth.Require(deps.Verifier, noStore(next))
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", healthz)

	mux.Handle("GET /consents/wardrobe-photos", secure(h.getConsent))
	mux.Handle("PUT /consents/wardrobe-photos", secure(h.putConsent))
	mux.Handle("GET /wardrobe/items", secure(h.listItems))
	mux.Handle("POST /wardrobe/items", secure(h.addItem))
	mux.Handle("GET /wardrobe/items/{id}/photo", secure(h.photo))
	mux.Handle("DELETE /wardrobe/items/{id}", secure(h.deleteItem))
	return mux
}

func healthz(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

// noStore marks a response as personal data that must not be cached (BE-45).
func noStore(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next(w, r)
	}
}
