// Package server builds the HTTP handler for the API.
package server

import (
	"net/http"
	"time"
)

// NewHTTPServer returns the API's HTTP server for addr. The timeouts bound how long
// a slow client can hold a connection. Long-running routes need their own handling,
// because WriteTimeout applies to the whole response.
func NewHTTPServer(addr string) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           NewRouter(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

// NewRouter returns the API's HTTP handler. Routes are added here as features land.
func NewRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", healthz)
	return mux
}

func healthz(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
