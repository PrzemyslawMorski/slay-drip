package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthz(t *testing.T) {
	t.Parallel()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)

	NewRouter(Dependencies{}).ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"status":"ok"}`, rec.Body.String())
}

func TestNewHTTPServerSetsTimeouts(t *testing.T) {
	t.Parallel()

	srv := NewHTTPServer(":8080", http.NotFoundHandler())

	assert.Equal(t, ":8080", srv.Addr)
	assert.Equal(t, 5*time.Second, srv.ReadHeaderTimeout)
	assert.Equal(t, 15*time.Second, srv.ReadTimeout)
	assert.Equal(t, 30*time.Second, srv.WriteTimeout)
	assert.Equal(t, 60*time.Second, srv.IdleTimeout)
}

// TestAccountRoutesStayAbsent is the hard-rule probe for S1-03.12. The identity stand-in
// adds no account or profile route. The wardrobe and consent routes are covered in
// wardrobe_routes_test.go, and each of them answers 401 without a token.
func TestAccountRoutesStayAbsent(t *testing.T) {
	t.Parallel()
	router := NewRouter(Dependencies{})

	probes := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/me"},
		{http.MethodGet, "/users/me"},
		{http.MethodDelete, "/users/me"},
		{http.MethodGet, "/account"},
		{http.MethodDelete, "/account"},
		{http.MethodPost, "/users"},
	}
	for _, p := range probes {
		t.Run(p.method+" "+p.path, func(t *testing.T) {
			t.Parallel()
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, httptest.NewRequest(p.method, p.path, nil))

			require.Contains(t, []int{http.StatusNotFound, http.StatusMethodNotAllowed}, rec.Code)
		})
	}
}
