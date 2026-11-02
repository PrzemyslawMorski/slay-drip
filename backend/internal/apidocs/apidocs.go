// Package apidocs serves the API reference for local development. The OpenAPI document
// is embedded in the binary, and the page renders it with Scalar. Both are served only
// when the API starts with API_DOCS_ENABLED=true, so production does not expose them.
package apidocs

import (
	_ "embed"
	"net/http"
)

// ScalarVersion pins the Scalar bundle. Bump it deliberately, and only to a release at
// least two weeks old.
const ScalarVersion = "1.75.0"

//go:embed openapi.yaml
var spec []byte

// Spec returns the embedded OpenAPI document.
func Spec() []byte {
	return spec
}

// SpecHandler serves the OpenAPI document.
func SpecHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
		_, _ = w.Write(spec)
	})
}

// PageHandler serves the Scalar page, which loads the spec from /openapi.yaml.
func PageHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(page))
	})
}

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Slay Drip API reference</title>
</head>
<body>
  <script id="api-reference" data-url="/openapi.yaml"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@` + ScalarVersion + `"></script>
</body>
</html>
`
