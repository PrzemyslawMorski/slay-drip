package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.yaml.in/yaml/v3"

	"slaydrip/backend/internal/apidocs"
)

func TestAPIDocsRoutesAbsentByDefault(t *testing.T) {
	t.Parallel()
	router := NewRouter(Dependencies{})

	for _, path := range []string{"/docs", "/openapi.yaml"} {
		t.Run(path, func(t *testing.T) {
			t.Parallel()
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))

			assert.Equal(t, http.StatusNotFound, rec.Code)
		})
	}
}

func TestAPIDocsRoutesServeWhenEnabled(t *testing.T) {
	t.Parallel()
	router := NewRouter(Dependencies{APIDocs: true})

	page := httptest.NewRecorder()
	router.ServeHTTP(page, httptest.NewRequest(http.MethodGet, "/docs", nil))
	require.Equal(t, http.StatusOK, page.Code)
	assert.Contains(t, page.Header().Get("Content-Type"), "text/html")
	assert.Contains(t, page.Body.String(), `data-url="/openapi.yaml"`)
	assert.Contains(t, page.Body.String(), "@scalar/api-reference@"+apidocs.ScalarVersion)

	spec := httptest.NewRecorder()
	router.ServeHTTP(spec, httptest.NewRequest(http.MethodGet, "/openapi.yaml", nil))
	require.Equal(t, http.StatusOK, spec.Code)
	assert.Contains(t, spec.Header().Get("Content-Type"), "application/yaml")
	assert.Contains(t, spec.Body.String(), "openapi: 3.1.0")
}

// TestAPIDocsOperationsAreRoutes keeps the OpenAPI document in step with the router. Every
// operation in the document must reach a handler: /healthz answers 200 and every other
// route answers 401 without a token. A 404 or 405 means the spec describes a route that
// does not exist, or the router is missing one.
func TestAPIDocsOperationsAreRoutes(t *testing.T) {
	t.Parallel()
	router := NewRouter(Dependencies{APIDocs: true})

	var doc struct {
		Paths map[string]map[string]yaml.Node `yaml:"paths"`
	}
	require.NoError(t, yaml.Unmarshal(apidocs.Spec(), &doc))
	require.NotEmpty(t, doc.Paths)

	methods := []string{"get", "put", "post", "delete"}
	for path, item := range doc.Paths {
		for _, method := range methods {
			if _, ok := item[method]; !ok {
				continue
			}
			t.Run(strings.ToUpper(method)+" "+path, func(t *testing.T) {
				t.Parallel()
				target := strings.ReplaceAll(path, "{id}", "4f0c8d2e-6b1a-4c7e-9d3f-2a5b8e1c7d90")
				rec := httptest.NewRecorder()
				router.ServeHTTP(rec, httptest.NewRequest(strings.ToUpper(method), target, nil))

				want := http.StatusUnauthorized
				if path == "/healthz" {
					want = http.StatusOK
				}
				assert.Equal(t, want, rec.Code)
			})
		}
	}
}
