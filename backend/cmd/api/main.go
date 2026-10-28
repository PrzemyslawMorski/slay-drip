// Command api runs the Slay Drip HTTP API.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"slaydrip/backend/internal/auth"
	"slaydrip/backend/internal/db"
	"slaydrip/backend/internal/server"
	"slaydrip/backend/internal/storage"
	"slaydrip/backend/internal/wardrobe"
)

func main() {
	if err := run(); err != nil {
		slog.Error("api stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	deps, closeDeps, err := connect(ctx)
	if err != nil {
		return err
	}
	defer closeDeps()

	addr := ":" + getenv("PORT", "8080")
	srv := server.NewHTTPServer(addr, server.NewRouter(deps))

	serveErr := make(chan error, 1)
	go func() { serveErr <- srv.ListenAndServe() }()
	slog.Info("api listening", "addr", addr)

	select {
	case err := <-serveErr:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}

// connect reads the config keys from the environment (docs/local-development.md) and
// opens the database, the object store and the token verifier. Any missing key stops
// the start, so the API never runs half-configured.
func connect(ctx context.Context) (server.Dependencies, func(), error) {
	databaseURL, err := required("DATABASE_URL")
	if err != nil {
		return server.Dependencies{}, nil, err
	}
	issuer, err := required("OIDC_ISSUER_URL")
	if err != nil {
		return server.Dependencies{}, nil, err
	}
	jwksURL, err := required("OIDC_JWKS_URL")
	if err != nil {
		return server.Dependencies{}, nil, err
	}
	audience, err := required("OIDC_AUDIENCE")
	if err != nil {
		return server.Dependencies{}, nil, err
	}
	blobs, err := s3FromEnv()
	if err != nil {
		return server.Dependencies{}, nil, err
	}

	pool, err := db.Open(ctx, databaseURL)
	if err != nil {
		return server.Dependencies{}, nil, fmt.Errorf("open database: %w", err)
	}
	verifier, err := auth.NewVerifier(ctx, jwksURL, issuer, audience)
	if err != nil {
		pool.Close()
		return server.Dependencies{}, nil, fmt.Errorf("token verifier: %w", err)
	}

	deps := server.Dependencies{
		Verifier: verifier,
		Wardrobe: wardrobe.NewService(db.NewWardrobe(pool), blobs, slog.Default()),
	}
	return deps, pool.Close, nil
}

func s3FromEnv() (*storage.S3, error) {
	endpoint, err := required("S3_ENDPOINT")
	if err != nil {
		return nil, err
	}
	bucket, err := required("S3_BUCKET")
	if err != nil {
		return nil, err
	}
	accessKey, err := required("S3_ACCESS_KEY")
	if err != nil {
		return nil, err
	}
	secretKey, err := required("S3_SECRET_KEY")
	if err != nil {
		return nil, err
	}
	forcePathStyle, err := strconv.ParseBool(getenv("S3_FORCE_PATH_STYLE", "false"))
	if err != nil {
		return nil, errors.New("S3_FORCE_PATH_STYLE must be true or false")
	}
	return storage.NewS3(storage.Config{
		Endpoint:       endpoint,
		Region:         getenv("S3_REGION", "fr-par"),
		Bucket:         bucket,
		ForcePathStyle: forcePathStyle,
		AccessKey:      accessKey,
		SecretKey:      secretKey,
	})
}

func required(key string) (string, error) {
	if v := os.Getenv(key); v != "" {
		return v, nil
	}
	return "", fmt.Errorf("%s is not set", key)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
