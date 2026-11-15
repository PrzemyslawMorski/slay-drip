package testenv

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const syntheticStack = `{
  "project": "slaydrip-test00000",
  "test_database_url": "postgres://slaydrip:synthetic-throwaway@127.0.0.1:20000/slaydrip_test?sslmode=disable",
  "env": {
    "DATABASE_URL": "postgres://slaydrip:synthetic-throwaway@127.0.0.1:20000/slaydrip?sslmode=disable",
    "S3_ENDPOINT": "http://127.0.0.1:20010",
    "S3_REGION": "fr-par",
    "S3_BUCKET": "slay-drip-local",
    "S3_FORCE_PATH_STYLE": "true",
    "S3_ACCESS_KEY": "synthetic-access",
    "S3_SECRET_KEY": "synthetic-throwaway"
  }
}`

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
	require.NoError(t, os.WriteFile(path, []byte(content), 0o600))
}

func noEnv(string) string { return "" }

func TestReadStackMissingFileNamesEntryScript(t *testing.T) {
	_, err := ReadStack(filepath.Join(t.TempDir(), "stack.json"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "python scripts/dev/up.py up")
}

func TestReadStackParsesTestDatabaseAndEnv(t *testing.T) {
	path := filepath.Join(t.TempDir(), "stack.json")
	writeFile(t, path, syntheticStack)

	s, err := ReadStack(path)
	require.NoError(t, err)
	assert.Equal(t, "postgres://slaydrip:synthetic-throwaway@127.0.0.1:20000/slaydrip_test?sslmode=disable", s.TestDatabaseURL)
	assert.Equal(t, "fr-par", s.Env["S3_REGION"])
}

func TestCheckTestDatabaseURLRejectsDevDatabase(t *testing.T) {
	err := CheckTestDatabaseURL("postgres://u:p@127.0.0.1:5432/slaydrip?sslmode=disable")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "dev database")
}

func TestCheckTestDatabaseURLAcceptsTestDatabase(t *testing.T) {
	assert.NoError(t, CheckTestDatabaseURL("postgres://u:p@127.0.0.1:20000/slaydrip_test?sslmode=disable"))
}

func TestCheckTestDatabaseURLRejectsOtherNames(t *testing.T) {
	for _, raw := range []string{
		"postgres://u:p@127.0.0.1:20000/postgres?sslmode=disable",
		"postgres://u:p@127.0.0.1:20000/?sslmode=disable",
		"not a url",
	} {
		assert.Error(t, CheckTestDatabaseURL(raw), raw)
	}
}

func TestResolvePrefersProcessEnvOverStack(t *testing.T) {
	s := Stack{Env: map[string]string{"S3_BUCKET": "from-stack"}}
	got, err := Resolve("S3_BUCKET", func(k string) string {
		if k == "S3_BUCKET" {
			return "from-env"
		}
		return ""
	}, s)
	require.NoError(t, err)
	assert.Equal(t, "from-env", got)
}

func TestResolveDatabaseURLUsesStackTestDatabase(t *testing.T) {
	s := Stack{TestDatabaseURL: "postgres://u:p@127.0.0.1:20000/slaydrip_test?sslmode=disable"}
	got, err := Resolve("DATABASE_URL", noEnv, s)
	require.NoError(t, err)
	assert.True(t, strings.HasSuffix(got, "/slaydrip_test?sslmode=disable"), got)
}

func TestResolveDatabaseURLFromEnvIsStillChecked(t *testing.T) {
	_, err := Resolve("DATABASE_URL", func(string) string {
		return "postgres://u:p@127.0.0.1:5432/slaydrip?sslmode=disable"
	}, Stack{TestDatabaseURL: "postgres://u:p@127.0.0.1:20000/slaydrip_test?sslmode=disable"})
	require.Error(t, err)
}

func TestResolveUnknownKeyFailsWithEntryScript(t *testing.T) {
	_, err := Resolve("S3_NOPE", noEnv, Stack{Env: map[string]string{}})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "python scripts/dev/up.py up")
}

func TestFindStackFileHonoursOverride(t *testing.T) {
	t.Setenv(StackFileEnv, "/custom/stack.json")
	assert.Equal(t, "/custom/stack.json", FindStackFile())
}

func TestFindStackFileWalksUpFromPackageDir(t *testing.T) {
	t.Setenv(StackFileEnv, "")
	root := t.TempDir()
	want := filepath.Join(root, ".stack", "stack.json")
	writeFile(t, want, syntheticStack)
	deep := filepath.Join(root, "backend", "internal", "testenv")
	require.NoError(t, os.MkdirAll(deep, 0o755))

	assert.Equal(t, want, findStackFileFrom(deep))
}
