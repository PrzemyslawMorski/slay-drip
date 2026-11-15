// Package testenv resolves config for integration tests from the stack file that
// scripts/dev/up.py writes for this worktree (ADR-0016, docs/local-development.md).
// It never falls back to the dev database or to built-in secrets.
package testenv

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

const (
	// StackFileEnv overrides the stack file path.
	StackFileEnv = "SLAYDRIP_STACK_FILE"

	entryScript  = "python scripts/dev/up.py up"
	devDatabase  = "slaydrip"
	testDatabase = "slaydrip_test"
)

// Stack is the subset of .stack/stack.json that the tests read.
type Stack struct {
	TestDatabaseURL string            `json:"test_database_url"`
	Env             map[string]string `json:"env"`
}

// ReadStack loads and parses a stack file. A missing file names the entry script.
func ReadStack(path string) (Stack, error) {
	var s Stack
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return s, fmt.Errorf("stack file %s not found: start the local stack with `%s` from the worktree root", path, entryScript)
	}
	if err != nil {
		return s, fmt.Errorf("read stack file %s: %w", path, err)
	}
	if err := json.Unmarshal(data, &s); err != nil {
		return s, fmt.Errorf("parse stack file %s: %w", path, err)
	}
	return s, nil
}

// CheckTestDatabaseURL rejects any URL that does not point at the dedicated test database.
func CheckTestDatabaseURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("database URL is not valid: %w", err)
	}
	name := strings.TrimPrefix(u.Path, "/")
	if name == devDatabase {
		return fmt.Errorf("refusing to use the dev database %q in tests; use %q (run `%s`)", devDatabase, testDatabase, entryScript)
	}
	if name != testDatabase {
		return fmt.Errorf("database %q is not the test database %q", name, testDatabase)
	}
	return nil
}

// Resolve returns the value of key. A process env var wins, then the stack file.
// DATABASE_URL always comes from the stack's test database and is checked.
func Resolve(key string, getenv func(string) string, s Stack) (string, error) {
	v := getenv(key)
	if v == "" {
		if key == "DATABASE_URL" {
			v = s.TestDatabaseURL
		} else {
			v = s.Env[key]
		}
	}
	if v == "" {
		return "", fmt.Errorf("%s is not set: it is missing from the stack file (run `%s`)", key, entryScript)
	}
	if key == "DATABASE_URL" {
		if err := CheckTestDatabaseURL(v); err != nil {
			return "", err
		}
	}
	return v, nil
}

// FindStackFile returns SLAYDRIP_STACK_FILE if set, else the nearest .stack/stack.json
// above the current directory. If none exists, it returns the path under the current directory.
func FindStackFile() string {
	if p := os.Getenv(StackFileEnv); p != "" {
		return p
	}
	wd, err := os.Getwd()
	if err != nil {
		return filepath.Join(".stack", "stack.json")
	}
	return findStackFileFrom(wd)
}

func findStackFileFrom(dir string) string {
	for d := dir; ; {
		candidate := filepath.Join(d, ".stack", "stack.json")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
		parent := filepath.Dir(d)
		if parent == d {
			return filepath.Join(dir, ".stack", "stack.json")
		}
		d = parent
	}
}

// Get returns the resolved value of key or fails the test with a clear message.
func Get(t *testing.T, key string) string {
	t.Helper()
	s := load(t)
	v, err := Resolve(key, os.Getenv, s)
	if err != nil {
		t.Fatalf("%v", err)
	}
	return v
}

// Bool returns the boolean value of key.
func Bool(t *testing.T, key string) bool {
	t.Helper()
	v, err := strconv.ParseBool(Get(t, key))
	if err != nil {
		t.Fatalf("%s must be true or false", key)
	}
	return v
}

func load(t *testing.T) Stack {
	t.Helper()
	s, err := ReadStack(FindStackFile())
	if err != nil {
		t.Fatalf("%v", err)
	}
	return s
}
